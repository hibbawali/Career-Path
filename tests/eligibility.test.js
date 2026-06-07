'use strict';

// Feature: careerpath-scholarship-finder, Property 11: Eligibility analysis covers every scholarship exactly once
// Feature: careerpath-scholarship-finder, Property 12: CGPA gap message is arithmetically correct

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fc = require('fast-check');
const { analyzeEligibility } = require('../lib.js');

/* ── Arbitraries ──────────────────────────────────────────────── */

const scholarshipArb = fc.record({
  name:         fc.string({ minLength: 1, maxLength: 50 }),
  country:      fc.string({ minLength: 1, maxLength: 30 }),
  provider:     fc.string({ minLength: 1, maxLength: 50 }),
  degree:       fc.constantFrom('Undergraduate', 'Masters', 'PhD', 'Masters / PhD', 'Undergraduate / Masters / PhD'),
  minCGPA:      fc.float({ min: 0, max: 4, noNaN: true }),
  deadline:     fc.constantFrom('01-Apr-2027', 'Rolling 2026', 'Oct-Nov 2026', 'Dec 2027'),
  funding:      fc.string(),
  link:         fc.webUrl(),
  status:       fc.constantFrom('Open', 'Opens Sep 2026', 'Check HEC Portal'),
  type:         fc.constantFrom('international', 'local'),
  province:     fc.string(),
  requirements: fc.string(),
});

const profileArb = fc.record({
  cgpa:         fc.float({ min: 0, max: 4, noNaN: true }),
  degree:       fc.constantFrom('', 'Undergraduate', 'Masters', 'PhD'),
  province:     fc.string(),
  countryPref:  fc.string(),
  fieldOfStudy: fc.string(),
  financialNeed: fc.boolean(),
});

/* ── Property 11 ─────────────────────────────────────────────── */

describe('Property 11: Eligibility analysis covers every scholarship exactly once', () => {
  it('total count equals input length and no scholarship appears in multiple sections', () => {
    fc.assert(
      fc.property(
        profileArb,
        fc.array(scholarshipArb, { minLength: 1, maxLength: 20 }),
        (profile, scholarships) => {
          const { qualified, close, notEligible } = analyzeEligibility(profile, scholarships);

          // Every scholarship must be accounted for exactly once
          const totalCount = qualified.length + close.length + notEligible.length;
          assert.strictEqual(
            totalCount,
            scholarships.length,
            `Expected total ${scholarships.length} but got ${totalCount}`
          );

          // No scholarship object should appear in more than one section (by reference)
          const qualifiedRefs   = new Set(qualified.map(r => r.scholarship));
          const closeRefs       = new Set(close.map(r => r.scholarship));
          const notEligibleRefs = new Set(notEligible.map(r => r.scholarship));

          for (const ref of qualifiedRefs) {
            assert.ok(
              !closeRefs.has(ref),
              'A scholarship appeared in both qualified and close sections'
            );
            assert.ok(
              !notEligibleRefs.has(ref),
              'A scholarship appeared in both qualified and notEligible sections'
            );
          }

          for (const ref of closeRefs) {
            assert.ok(
              !notEligibleRefs.has(ref),
              'A scholarship appeared in both close and notEligible sections'
            );
          }
        }
      ),
      { numRuns: 500 }
    );
  });
});

/* ── Property 12 ─────────────────────────────────────────────── */

// Feature: careerpath-scholarship-finder, Property 12: CGPA gap message is arithmetically correct
describe('Property 12: CGPA gap message is arithmetically correct', () => {
  it('gap note contains (minCGPA - studentCGPA).toFixed(1) when minCGPA > studentCGPA', () => {
    // Generate studentCGPA in [0, 3.99] and minCGPA in (studentCGPA, 4]
    // so that minCGPA > studentCGPA is always satisfied
    const pairArb = fc.float({ min: 0, max: 3.99, noNaN: true }).chain(studentCGPA => {
      // minCGPA must be strictly greater than studentCGPA and at most 4
      const lo = Math.min(studentCGPA + 0.01, 4);
      return fc.float({ min: lo, max: 4, noNaN: true }).map(minCGPA => ({
        studentCGPA,
        minCGPA,
      }));
    });

    const scholarshipArb = fc.record({
      name:         fc.string({ minLength: 1, maxLength: 50 }),
      country:      fc.string({ minLength: 1, maxLength: 30 }),
      provider:     fc.string({ minLength: 1, maxLength: 50 }),
      degree:       fc.constantFrom('Undergraduate', 'Masters', 'PhD', 'Masters / PhD', 'Undergraduate / Masters / PhD'),
      deadline:     fc.constantFrom('01-Apr-2027', 'Rolling 2026', 'Oct-Nov 2026', 'Dec 2027'),
      funding:      fc.string(),
      link:         fc.webUrl(),
      status:       fc.constantFrom('Open', 'Opens Sep 2026', 'Check HEC Portal'),
      type:         fc.constantFrom('international', 'local'),
      province:     fc.string(),
      requirements: fc.string(),
    });

    fc.assert(
      fc.property(
        pairArb,
        scholarshipArb,
        ({ studentCGPA, minCGPA }, baseScholarship) => {
          // Build scholarship with the generated minCGPA
          const scholarship = { ...baseScholarship, minCGPA };

          // Profile with matching degree so categorisation is driven purely by CGPA
          const profile = {
            cgpa: studentCGPA,
            degree: '',          // empty → matches any degree
            province: '',
            countryPref: '',
            fieldOfStudy: '',
            financialNeed: false,
          };

          const { close, notEligible } = analyzeEligibility(profile, [scholarship]);

          // With minCGPA > studentCGPA, the scholarship must be in close or notEligible
          const allResults = [...close, ...notEligible];
          assert.strictEqual(
            allResults.length,
            1,
            `Expected scholarship to be in close or notEligible (minCGPA=${minCGPA}, studentCGPA=${studentCGPA})`
          );

          const result = allResults[0];
          const expectedGap = (minCGPA - studentCGPA).toFixed(1);

          assert.ok(
            result.gapNote.includes(expectedGap),
            `Expected gapNote to contain "${expectedGap}" but got: "${result.gapNote}"`
          );
        }
      ),
      { numRuns: 1000 }
    );
  });
});
