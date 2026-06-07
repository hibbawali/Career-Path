// Feature: careerpath-scholarship-finder, Property 6: Search is case-insensitive and substring-based
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fc = require('fast-check');
const { applyFilters } = require('../lib.js');

/**
 * Validates: Requirements 3.1, 3.2
 *
 * Property 6: Search is case-insensitive and substring-based
 *
 * For any scholarship with non-empty name, provider, or country:
 * picking a non-empty substring of any one of those fields and using it
 * as the query (lowercased, as the API contract requires) must cause the
 * scholarship to appear in the applyFilters result.
 */

// Arbitrary: scholarship with guaranteed non-empty, non-whitespace searchable fields
const searchableScholarshipArb = fc.record({
  name:         fc.string({ minLength: 2, maxLength: 40 }).filter(s => s.trim().length > 0),
  provider:     fc.string({ minLength: 2, maxLength: 40 }).filter(s => s.trim().length > 0),
  country:      fc.string({ minLength: 2, maxLength: 30 }).filter(s => s.trim().length > 0),
  degree:       fc.constantFrom('Masters', 'PhD', 'Undergraduate'),
  minCGPA:      fc.float({ min: 0, max: 4, noNaN: true }),
  deadline:     fc.constant('01-Apr-2027'),
  funding:      fc.constant('Full'),
  link:         fc.constant('https://example.com'),
  status:       fc.constant('Open'),
  type:         fc.constant('international'),
  province:     fc.constant('All Pakistan'),
  requirements: fc.constant(''),
});

describe('Property 6: Search is case-insensitive and substring-based', () => {
  it('should always include a scholarship when queried by a substring of name, provider, or country', () => {
    fc.assert(
      fc.property(
        searchableScholarshipArb,
        // Pick a field index: 0 = name, 1 = provider, 2 = country
        fc.integer({ min: 0, max: 2 }),
        // Pick a position within that field to start the substring (resolved at runtime)
        fc.integer({ min: 0, max: 38 }),
        // Pick a length for the substring (at least 1)
        fc.integer({ min: 1, max: 20 }),
        (scholarship, fieldIdx, startRaw, lengthRaw) => {
          const fields = ['name', 'provider', 'country'];
          const field  = fields[fieldIdx];
          const value  = scholarship[field]; // guaranteed non-empty by filter above

          // Clamp start and length to the actual string length
          const start  = startRaw  % value.length;
          const maxLen = value.length - start;
          const length = (lengthRaw % maxLen) + 1; // at least 1 char

          // The substring — converted to lowercase to satisfy applyFilters API contract
          const query = value.substring(start, start + length).toLowerCase();

          // applyFilters expects query to already be lowercased and trimmed
          const results = applyFilters([scholarship], { query, degree: '', country: '', type: '', cgpa: 0 });

          return results.includes(scholarship);
        }
      ),
      { numRuns: 500 }
    );
  });
});

// Feature: careerpath-scholarship-finder, Property 7: Clearing search restores the filter-only result set

/**
 * Validates: Requirements 3.4
 *
 * Property 7: Clearing search restores the filter-only result set
 *
 * For any filter state (degree, country, type, cgpa) and any active search query,
 * clearing the search (setting query to '') must produce exactly the same result
 * as calling applyFilters with only the filters active (no search query).
 */

// Arbitrary: a single scholarship with controllable fields for filter matching
const scholarshipArb = fc.record({
  name:         fc.string({ minLength: 1, maxLength: 40 }),
  provider:     fc.string({ minLength: 1, maxLength: 40 }),
  country:      fc.constantFrom('USA', 'UK', 'Canada', 'Australia', 'Germany'),
  degree:       fc.constantFrom('Masters', 'PhD', 'Undergraduate'),
  minCGPA:      fc.float({ min: 0, max: 4, noNaN: true }),
  deadline:     fc.constant('01-Apr-2027'),
  funding:      fc.constant('Full'),
  link:         fc.constant('https://example.com'),
  status:       fc.constant('Open'),
  type:         fc.constantFrom('international', 'local'),
  province:     fc.constant('All Pakistan'),
  requirements: fc.constant(''),
});

// Arbitrary: a filter state (no query — query is handled separately)
const filterStateArb = fc.record({
  degree:  fc.constantFrom('', 'Masters', 'PhD', 'Undergraduate'),
  country: fc.constantFrom('', 'USA', 'UK', 'Canada', 'Australia', 'Germany'),
  type:    fc.constantFrom('', 'international', 'local'),
  cgpa:    fc.float({ min: 0, max: 4, noNaN: true }),
});

// Arbitrary: a non-empty search query (guaranteed to be a real string, may or may not match)
const queryArb = fc.string({ minLength: 1, maxLength: 20 });

describe('Property 7: Clearing search restores the filter-only result set', () => {
  it('should produce the same result with empty query as with filters-only call', () => {
    fc.assert(
      fc.property(
        fc.array(scholarshipArb, { minLength: 0, maxLength: 20 }),
        filterStateArb,
        queryArb,
        (scholarships, filters, query) => {
          const { degree, country, type, cgpa } = filters;

          // Step 1: Apply both filters and a non-empty search query
          const withSearch = applyFilters(scholarships, { query, degree, country, type, cgpa });

          // Step 2: Clear the search (empty string) — simulates the user clicking ×
          const afterClear = applyFilters(scholarships, { query: '', degree, country, type, cgpa });

          // Step 3: Apply filters alone (no query at all)
          const filtersOnly = applyFilters(scholarships, { query: '', degree, country, type, cgpa });

          // afterClear and filtersOnly must be identical (same references in same order)
          assert.deepStrictEqual(afterClear, filtersOnly);

          // withSearch must be a subset of filtersOnly (search can only narrow, never widen)
          const filtersOnlySet = new Set(filtersOnly);
          for (const s of withSearch) {
            assert.ok(filtersOnlySet.has(s), 'withSearch result contains item not in filtersOnly');
          }

          return true;
        }
      ),
      { numRuns: 500 }
    );
  });
});
