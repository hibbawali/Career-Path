// Feature: careerpath-scholarship-finder, Property 2: Card displays all required fields
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fc = require('fast-check');
const { renderCard, escHtml } = require('../lib.js');

/**
 * Arbitrary generator for scholarship objects.
 * Produces records whose required display fields are non-empty strings/numbers
 * so the test can meaningfully verify they appear in the rendered HTML.
 */
const arbitraryScholarship = fc.record({
  name:         fc.string({ minLength: 1, maxLength: 80 }),
  provider:     fc.string({ minLength: 1, maxLength: 80 }),
  country:      fc.string({ minLength: 1, maxLength: 40 }),
  degree:       fc.string({ minLength: 1, maxLength: 40 }),
  minCGPA:      fc.float({ min: 0, max: 4, noNaN: true }),
  deadline:     fc.string({ minLength: 1, maxLength: 40 }),
  funding:      fc.string({ minLength: 1, maxLength: 120 }),
  status:       fc.string({ minLength: 1, maxLength: 40 }),
  requirements: fc.string({ minLength: 1, maxLength: 200 }),
  // Additional fields present in real records but not under test here
  link:         fc.webUrl(),
  type:         fc.oneof(fc.constant('international'), fc.constant('local')),
  province:     fc.constant('All Pakistan'),
});

// **Validates: Requirements 2.1**
describe('Property 2: Card displays all required fields', () => {

  it('Property 2: renderCard HTML contains all required scholarship field values (escaped)', () => {
    fc.assert(
      fc.property(
        arbitraryScholarship,
        (scholarship) => {
          const html = renderCard(scholarship);

          // Each field value must appear in the HTML after applying the same
          // escHtml transformation that renderCard uses internally.
          const fields = [
            'name',
            'provider',
            'country',
            'degree',
            'minCGPA',
            'deadline',
            'funding',
            'status',
            'requirements',
          ];

          for (const field of fields) {
            const escaped = escHtml(scholarship[field]);
            assert.ok(
              html.includes(escaped),
              `renderCard HTML is missing field "${field}" value: "${escaped}"`
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

});

// Feature: careerpath-scholarship-finder, Property 3: Apply Now link is correct

/**
 * Arbitrary generator for scholarship objects with a guaranteed non-empty link.
 * fc.webUrl() always produces valid non-empty URLs, so this re-uses the same
 * base shape but makes the link constraint explicit.
 */
const arbitraryScholarshipWithLink = fc.record({
  name:         fc.string({ minLength: 1, maxLength: 80 }),
  provider:     fc.string({ minLength: 1, maxLength: 80 }),
  country:      fc.string({ minLength: 1, maxLength: 40 }),
  degree:       fc.string({ minLength: 1, maxLength: 40 }),
  minCGPA:      fc.float({ min: 0, max: 4, noNaN: true }),
  deadline:     fc.string({ minLength: 1, maxLength: 40 }),
  funding:      fc.string({ minLength: 1, maxLength: 120 }),
  status:       fc.string({ minLength: 1, maxLength: 40 }),
  requirements: fc.string({ minLength: 1, maxLength: 200 }),
  // Non-empty link — webUrl() always produces a non-empty URL string
  link:         fc.webUrl(),
  type:         fc.oneof(fc.constant('international'), fc.constant('local')),
  province:     fc.constant('All Pakistan'),
});

// **Validates: Requirements 2.2**
describe('Property 3: Apply Now link is correct', () => {

  it('Property 3: renderCard HTML contains href with escaped link and target="_blank"', () => {
    fc.assert(
      fc.property(
        arbitraryScholarshipWithLink,
        (scholarship) => {
          const html = renderCard(scholarship);

          // The href attribute must contain the HTML-escaped version of the link,
          // matching the escHtml transformation applied by renderCard internally.
          const escapedLink = escHtml(scholarship.link);
          assert.ok(
            html.includes(`href="${escapedLink}"`),
            `renderCard HTML is missing href="${escapedLink}" for link: "${scholarship.link}"`
          );

          // The anchor must open in a new tab
          assert.ok(
            html.includes('target="_blank"'),
            'renderCard HTML is missing target="_blank" on the Apply Now anchor'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

});
