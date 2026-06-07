// Feature: careerpath-scholarship-finder, Property 8: Dropdown options reflect unique data values
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fc = require('fast-check');
const { getUniqueSortedValues, applyFilters } = require('../lib.js');

/* ── Shared arbitraries ─────────────────────────────────────────── */

const scholarshipArb = fc.record({
  name:         fc.string({ minLength: 1, maxLength: 40 }),
  country:      fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
  provider:     fc.string({ minLength: 1, maxLength: 40 }),
  degree:       fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
  minCGPA:      fc.float({ min: 0, max: 4, noNaN: true }),
  deadline:     fc.constant('01-Apr-2027'),
  funding:      fc.constant('Full'),
  link:         fc.constant('https://example.com'),
  status:       fc.constant('Open'),
  type:         fc.constantFrom('international', 'local'),
  province:     fc.constant('All Pakistan'),
  requirements: fc.constant(''),
});

const scholarshipsArb = fc.array(scholarshipArb, { minLength: 1, maxLength: 30 });

/* ── Property 8 ─────────────────────────────────────────────────── */

/**
 * Validates: Requirements 4.1, 4.2
 *
 * Property 8: Dropdown options reflect unique data values
 *
 * For any dataset, the degree dropdown SHALL contain exactly one option per
 * unique `degree` value present in the dataset, sorted alphabetically.
 * Likewise for the country dropdown and `country` field.
 */
describe('Property 8: Dropdown options reflect unique data values', () => {
  it('getUniqueSortedValues("degree") returns exactly one entry per unique degree, sorted', () => {
    // Feature: careerpath-scholarship-finder, Property 8: Dropdown options reflect unique data values
    fc.assert(
      fc.property(scholarshipsArb, (scholarships) => {
        const result = getUniqueSortedValues(scholarships, 'degree');

        const expectedSet = new Set(
          scholarships
            .map(s => (s.degree ?? '').trim())
            .filter(v => v.length > 0)
        );

        // Exactly one entry per unique value — no duplicates, no extras
        assert.strictEqual(result.length, expectedSet.size,
          `Expected ${expectedSet.size} unique degree values but got ${result.length}`);

        for (const val of result) {
          assert.ok(expectedSet.has(val), `Unexpected value in result: "${val}"`);
        }
        for (const val of expectedSet) {
          assert.ok(result.includes(val), `Missing expected value in result: "${val}"`);
        }

        // Must be sorted
        for (let i = 0; i < result.length - 1; i++) {
          assert.ok(result[i].localeCompare(result[i + 1]) <= 0,
            `Result is not sorted at index ${i}: "${result[i]}" before "${result[i + 1]}"`);
        }

        return true;
      }),
      { numRuns: 500 }
    );
  });

  it('getUniqueSortedValues("country") returns exactly one entry per unique country, sorted', () => {
    // Feature: careerpath-scholarship-finder, Property 8: Dropdown options reflect unique data values
    fc.assert(
      fc.property(scholarshipsArb, (scholarships) => {
        const result = getUniqueSortedValues(scholarships, 'country');

        const expectedSet = new Set(
          scholarships
            .map(s => (s.country ?? '').trim())
            .filter(v => v.length > 0)
        );

        assert.strictEqual(result.length, expectedSet.size,
          `Expected ${expectedSet.size} unique country values but got ${result.length}`);

        for (const val of result) {
          assert.ok(expectedSet.has(val), `Unexpected value in result: "${val}"`);
        }
        for (const val of expectedSet) {
          assert.ok(result.includes(val), `Missing expected value in result: "${val}"`);
        }

        for (let i = 0; i < result.length - 1; i++) {
          assert.ok(result[i].localeCompare(result[i + 1]) <= 0,
            `Result is not sorted at index ${i}: "${result[i]}" before "${result[i + 1]}"`);
        }

        return true;
      }),
      { numRuns: 500 }
    );
  });

  it('getUniqueSortedValues returns empty array when all field values are empty/missing', () => {
    // Feature: careerpath-scholarship-finder, Property 8: Dropdown options reflect unique data values
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.constant('Test'), country: fc.constant(''), provider: fc.constant(''),
            degree: fc.constant(''), minCGPA: fc.constant(0), deadline: fc.constant(''),
            funding: fc.constant(''), link: fc.constant(''), status: fc.constant(''),
            type: fc.constant(''), province: fc.constant(''), requirements: fc.constant(''),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (scholarships) => {
          assert.deepStrictEqual(getUniqueSortedValues(scholarships, 'degree'),  []);
          assert.deepStrictEqual(getUniqueSortedValues(scholarships, 'country'), []);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/* ── Property 9 ─────────────────────────────────────────────────── */

/**
 * Validates: Requirements 4.3
 *
 * Property 9: CGPA filter hides only exceeding scholarships
 *
 * For any threshold T > 0, every scholarship in the result set must have
 * minCGPA ≤ T, and every scholarship with minCGPA > T must be absent.
 */
describe('Property 9: CGPA filter hides only exceeding scholarships', () => {
  it('every returned scholarship has minCGPA ≤ threshold, and no exceeding scholarship appears', () => {
    // Feature: careerpath-scholarship-finder, Property 9: CGPA filter hides only exceeding scholarships
    fc.assert(
      fc.property(
        scholarshipsArb,
        fc.float({ min: Math.fround(0.1), max: Math.fround(4.0), noNaN: true }),
        (scholarships, threshold) => {
          const results = applyFilters(scholarships, {
            query: '', degree: '', country: '', type: '', cgpa: threshold,
          });

          // Every returned scholarship must satisfy minCGPA ≤ threshold
          for (const s of results) {
            assert.ok(s.minCGPA <= threshold,
              `Scholarship "${s.name}" has minCGPA=${s.minCGPA} which exceeds threshold=${threshold}`);
          }

          // Every scholarship with minCGPA > threshold must be absent
          const resultSet = new Set(results);
          for (const s of scholarships) {
            if (s.minCGPA > threshold) {
              assert.ok(!resultSet.has(s),
                `Scholarship "${s.name}" with minCGPA=${s.minCGPA} should be hidden for threshold=${threshold}`);
            }
          }

          return true;
        }
      ),
      { numRuns: 500 }
    );
  });

  it('when threshold is 0 (no filter), all scholarships are returned regardless of minCGPA', () => {
    // Feature: careerpath-scholarship-finder, Property 9: CGPA filter hides only exceeding scholarships
    fc.assert(
      fc.property(scholarshipsArb, (scholarships) => {
        const results = applyFilters(scholarships, {
          query: '', degree: '', country: '', type: '', cgpa: 0,
        });
        assert.strictEqual(results.length, scholarships.length,
          'With cgpa=0 (no filter), all scholarships should be returned');
        return true;
      }),
      { numRuns: 200 }
    );
  });
});

/* ── Property 10 ────────────────────────────────────────────────── */

/**
 * Validates: Requirements 4.4
 *
 * Property 10: Combined filters are ANDed
 *
 * For any combination of active filter values (degree, country, type, CGPA
 * threshold), every scholarship visible in the grid SHALL simultaneously
 * satisfy every active filter condition. No card violating any single active
 * filter SHALL appear.
 */
describe('Property 10: Combined filters are ANDed', () => {
  // Constrained scholarship arbitrary: fields drawn from a small fixed pool so
  // that generated filter values have a realistic chance of matching records.
  const DEGREES   = ['Masters', 'PhD', 'Undergraduate', 'Masters / PhD'];
  const COUNTRIES = ['USA', 'UK', 'Canada', 'Australia', 'Germany'];
  const TYPES     = ['international', 'local'];

  const constrainedScholarshipArb = fc.record({
    name:         fc.string({ minLength: 1, maxLength: 40 }),
    country:      fc.constantFrom(...COUNTRIES),
    provider:     fc.string({ minLength: 1, maxLength: 40 }),
    degree:       fc.constantFrom(...DEGREES),
    minCGPA:      fc.float({ min: 0, max: 4, noNaN: true }),
    deadline:     fc.constant('01-Apr-2027'),
    funding:      fc.constant('Full'),
    link:         fc.constant('https://example.com'),
    status:       fc.constant('Open'),
    type:         fc.constantFrom(...TYPES),
    province:     fc.constant('All Pakistan'),
    requirements: fc.constant(''),
  });

  const constrainedScholarshipsArb = fc.array(constrainedScholarshipArb, { minLength: 1, maxLength: 30 });

  // Filter value arbitraries: empty string means "no filter active"
  const degreeFilterArb  = fc.oneof(fc.constant(''), fc.constantFrom(...DEGREES));
  const countryFilterArb = fc.oneof(fc.constant(''), fc.constantFrom(...COUNTRIES));
  const typeFilterArb    = fc.oneof(fc.constant(''), fc.constantFrom(...TYPES));
  const cgpaFilterArb    = fc.oneof(
    fc.constant(0),
    fc.float({ min: 0.5, max: 4.0, noNaN: true })
  );

  it('every returned scholarship satisfies all active filter conditions simultaneously', () => {
    // Feature: careerpath-scholarship-finder, Property 10: Combined filters are ANDed
    fc.assert(
      fc.property(
        constrainedScholarshipsArb,
        degreeFilterArb,
        countryFilterArb,
        typeFilterArb,
        cgpaFilterArb,
        (scholarships, degree, country, type, cgpa) => {
          const results = applyFilters(scholarships, {
            query: '', degree, country, type, cgpa,
          });

          for (const s of results) {
            // degree filter: active when non-empty → scholarship.degree must include the value
            if (degree) {
              assert.ok(s.degree.includes(degree),
                `degree filter "${degree}" not satisfied: scholarship.degree="${s.degree}"`);
            }

            // country filter: active when non-empty → exact match
            if (country) {
              assert.strictEqual(s.country, country,
                `country filter "${country}" not satisfied: scholarship.country="${s.country}"`);
            }

            // type filter: active when non-empty → exact match
            if (type) {
              assert.strictEqual(s.type, type,
                `type filter "${type}" not satisfied: scholarship.type="${s.type}"`);
            }

            // cgpa filter: active when > 0 → scholarship.minCGPA must not exceed threshold
            if (cgpa > 0) {
              assert.ok(s.minCGPA <= cgpa,
                `cgpa filter ${cgpa} not satisfied: scholarship.minCGPA=${s.minCGPA}`);
            }
          }

          return true;
        }
      ),
      { numRuns: 500 }
    );
  });

  it('no scholarship that violates any single active filter appears in results', () => {
    // Feature: careerpath-scholarship-finder, Property 10: Combined filters are ANDed
    fc.assert(
      fc.property(
        constrainedScholarshipsArb,
        degreeFilterArb,
        countryFilterArb,
        typeFilterArb,
        cgpaFilterArb,
        (scholarships, degree, country, type, cgpa) => {
          const results = applyFilters(scholarships, {
            query: '', degree, country, type, cgpa,
          });

          const resultSet = new Set(results);

          for (const s of scholarships) {
            const failsDegree  = degree  && !s.degree.includes(degree);
            const failsCountry = country && s.country !== country;
            const failsType    = type    && s.type    !== type;
            const failsCgpa    = cgpa > 0 && s.minCGPA > cgpa;

            if (failsDegree || failsCountry || failsType || failsCgpa) {
              assert.ok(!resultSet.has(s),
                `Scholarship "${s.name}" violates at least one active filter but appeared in results ` +
                `(degree=${degree}, country=${country}, type=${type}, cgpa=${cgpa})`);
            }
          }

          return true;
        }
      ),
      { numRuns: 500 }
    );
  });

  it('with no active filters, all scholarships are returned', () => {
    // Feature: careerpath-scholarship-finder, Property 10: Combined filters are ANDed
    fc.assert(
      fc.property(constrainedScholarshipsArb, (scholarships) => {
        const results = applyFilters(scholarships, {
          query: '', degree: '', country: '', type: '', cgpa: 0,
        });
        assert.strictEqual(results.length, scholarships.length,
          'With no active filters, every scholarship must be returned');
        return true;
      }),
      { numRuns: 200 }
    );
  });
});
