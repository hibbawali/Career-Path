# Implementation Plan: CareerPath Scholarship Finder

## Overview

Implement a zero-dependency single-page scholarship finder as a single `index.html` file. Pure JavaScript logic is extracted into `lib.js` for testability. Property-based tests use fast-check in Node.js; unit tests use the Node built-in `node:test` runner. The index.html already has HTML structure and CSS in place — implementation tasks focus on wiring JavaScript logic, extracting pure functions into lib.js, and writing the test suite.

## Tasks

- [x] 1. Extract pure functions into `lib.js`
  - [x] 1.1 Create `lib.js` and export `parseDeadline`, `isClosingSoon`, and `daysUntil`
    - Copy the three date-utility functions from the `<script>` block in `index.html` into `lib.js` as named exports (CommonJS `module.exports` so they can be required by the Node test runner)
    - Keep the same implementations verbatim; do not change logic
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 1.2 Export `matchesSearch` from `lib.js`
    - Add and export `matchesSearch(scholarship, query)` — returns `true` when `query` is a case-insensitive substring of `scholarship.name`, `scholarship.provider`, or `scholarship.country`
    - _Requirements: 3.1, 3.2_

  - [x] 1.3 Export `applyFilters` from `lib.js`
    - Add and export `applyFilters(scholarships, { query, degree, country, type, cgpa })` — a pure function that returns the filtered subset; internally calls `matchesSearch`
    - _Requirements: 3.1, 4.1, 4.2, 4.3, 4.4_

  - [x] 1.4 Export `analyzeEligibility` from `lib.js`
    - Add and export `analyzeEligibility(profile, scholarships)` — returns `{ qualified: [], close: [], notEligible: [] }` as specified in the design
    - Include the `degreeMatch` helper and the `cgpaGap` computation inside this function
    - _Requirements: 5.2, 5.3, 5.4, 5.5_

  - [x] 1.5 Export `renderCard` from `lib.js`
    - Add and export `renderCard(scholarship)` — pure function returning the HTML string for a single card
    - Include `escHtml`, `statusClass`, and `isClosingSoon` calls inside the function
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 1.6 Export `populateFilterDropdowns` helper data from `lib.js`
    - Add and export `getUniqueSortedValues(scholarships, field)` — returns a sorted array of unique non-empty values for a given field key
    - _Requirements: 4.1, 4.2_

- [x] 2. Wire `lib.js` into `index.html`
  - [x] 2.1 Replace inline pure-function definitions in `index.html` with imports from `lib.js`
    - Add `<script src="lib.js"></script>` before the main `<script>` block
    - Remove the duplicate definitions of `parseDeadline`, `daysUntil`, `isClosingSoon`, `matchesSearch`, `escHtml`, `statusClass`, `renderCard`, and `analyzeEligibility` from the inline script; call the versions exported by `lib.js` via the global object or adjust the IIFE to accept them as parameters
    - Confirm the page still loads and renders cards correctly by reviewing the wiring
    - _Requirements: 8.4_

- [x] 3. Implement `renderCard` and grid rendering
  - [x] 3.1 Implement `renderGrid(scholarships)` in `index.html`
    - Clear `#scholarshipGrid` innerHTML, iterate `scholarships`, call `renderCard()` for each, inject the concatenated HTML string
    - Show `#emptyState` when the array is empty; hide it otherwise
    - _Requirements: 1.2, 2.1, 3.3_

  - [x] 3.2 Implement `updateHeaderStats(scholarships)` in `index.html`
    - Write total count to `#statTotal`, count of scholarships with `status.toLowerCase() === 'open'` to `#statOpen`, count where `isClosingSoon(deadline) === true` to `#statUrgent`
    - _Requirements: 8.2_

- [x] 4. Implement Fetch API data loading
  - [x] 4.1 Implement the fetch bootstrap in `index.html`
    - On `DOMContentLoaded`, call `fetch('./scholarships.json')`; on success parse JSON and assign to `allScholarships`, then call `populateFilterDropdowns`, `updateHeaderStats`, and `applyFiltersAndSearch`; on failure hide `#loadingState` and show `#errorState`
    - Handle non-OK HTTP responses by throwing before `.json()`
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 4.2 Write unit test for fetch failure → error state
    - Use Node `node:test` + a mocked `fetch` that rejects
    - Assert that `#errorState` becomes visible and `#loadingState` is hidden
    - _Requirements: 1.3_

- [x] 5. Implement Search Bar
  - [x] 5.1 Wire `searchInput` to `applyFiltersAndSearch` in `index.html`
    - Listen for `input` events on `#searchInput`; show/hide `#clearSearch` button based on whether value is non-empty
    - `#clearSearch` click clears the input value and calls `applyFiltersAndSearch`
    - _Requirements: 3.1, 3.4_

  - [x] 5.2 Write unit test for empty search state
    - After all scholarships are loaded and the search query produces zero results, assert `#emptyState` is visible
    - _Requirements: 3.3_

- [x] 6. Implement Filter Panel
  - [x] 6.1 Implement `populateFilterDropdowns(scholarships)` in `index.html`
    - Call `getUniqueSortedValues` for `degree` and `country` fields; append `<option>` elements to `#filterDegree` and `#filterCountry`
    - Also populate `#aCountry` in the Analyzer form with unique country options
    - _Requirements: 4.1, 4.2_

  - [x] 6.2 Implement `applyFiltersAndSearch()` in `index.html`
    - Read current values from `#filterDegree`, `#filterCountry`, `#filterType`, `#filterCGPA`, and `#searchInput`; call `applyFilters` from lib.js with those values; assign to `filtered`; call `sortFiltered`, `renderGrid`, `updateResultsCount`
    - Wire `change` events on all four filter controls and `#sortSelect` to call `applyFiltersAndSearch`
    - _Requirements: 4.3, 4.4, 4.5_

  - [x] 6.3 Implement `resetFilters()` in `index.html`
    - Reset `#filterDegree`, `#filterCountry`, `#filterType`, `#filterCGPA`, and `#searchInput` to default empty values; call `applyFiltersAndSearch`
    - Wire `#resetFilters` click to `resetFilters()`
    - _Requirements: 4.5_

- [ ] 7. Implement Eligibility Gap Analyzer
  - [x] 7.1 Implement `#btnAnalyze` click handler in `index.html`
    - Read the Student_Profile from `#aCGPA`, `#aDegree`, `#aProvince`, `#aCountry`, `#aField`, `#aFinancial`
    - Validate that CGPA is a number in [0, 4]; treat empty/invalid as 0
    - Call `analyzeEligibility(profile, allScholarships)` and pass result to `renderGapReport`
    - _Requirements: 5.1, 5.2_

  - [x] 7.2 Implement `renderGapReport(gapResult, profile)` in `index.html`
    - Replace `#gapReport.innerHTML` with three labelled sections: "You Qualify" (green), "Close Match" (amber), "Not Eligible" (red)
    - Each entry shows scholarship name, provider, country, degree, and gap note for non-qualified items
    - Show `#gapReport` (set `display` from `none` to `block`)
    - _Requirements: 5.3, 5.4, 5.5_

  - [x] 7.3 Show analyzer prompt before first submission
    - On page load, ensure `#gapReport` contains the `.analyzer-prompt` message and is hidden; only reveal the report div on first "Analyze" click
    - _Requirements: 5.6_

  - [~] 7.4 Write unit test for analyzer prompt state
    - Assert that before `#btnAnalyze` is clicked, `#gapReport` is either hidden or displays the instructional prompt
    - _Requirements: 5.6_

- [x] 8. Implement Deadline Badge Logic in `lib.js`
  - (Already exported in Task 1.1; this task validates the badge renders correctly in cards)
  - [x] 8.1 Verify `renderCard` uses `isClosingSoon` to conditionally include `.badge-closing`
    - Inspect the `renderCard` implementation: confirm it emits the `<span class="badge badge-closing">Closing Soon</span>` element only when `isClosingSoon(scholarship.deadline)` returns `true`
    - Confirm it omits the badge when `isClosingSoon` returns `false`
    - _Requirements: 2.3, 6.1, 6.2, 6.3_

- [~] 9. Checkpoint — Verify core application behaviour
  - Ensure all tests pass, ask the user if questions arise.
  - Load the page on a local HTTP server; confirm the grid populates with 20 cards, header stats update, search/filter/sort all work, and the Eligibility Analyzer produces a gap report.

- [x] 10. Write property-based tests — Deadline (fast-check)
  - [x] 10.1 Create `tests/deadline.test.js` and write property test for Property 4: `isClosingSoon` within window
    - Use fast-check `fc.integer({ min: 0, max: 60 })` to generate days-from-today; construct a date string; assert `isClosingSoon` returns `true`
    - **Property 4: Deadline badge appears within window, not outside**
    - **Validates: Requirements 2.3, 6.2**

  - [x] 10.2 Write property test for Property 5: unparseable deadlines never trigger badge
    - Use fast-check to generate strings from the unparseable pool (ranges, rolling, plain years, keyword phrases); assert `parseDeadline` returns `null` and `isClosingSoon` returns `false`
    - **Property 5: Unparseable deadlines never trigger the badge**
    - **Validates: Requirements 6.3**

- [x] 11. Write property-based tests — Search (fast-check)
  - [x] 11.1 Create `tests/search.test.js` and write property test for Property 6: case-insensitive substring search
    - Generate arbitrary scholarship objects and arbitrary non-empty substrings from `name`, `provider`, or `country`; assert the scholarship is included in `applyFilters` result
    - **Property 6: Search is case-insensitive and substring-based**
    - **Validates: Requirements 3.1, 3.2**

  - [x] 11.2 Write property test for Property 7: clearing search restores filter-only results
    - Generate a filter state and a search query; apply both; clear search (empty query); assert the result equals applying filters alone
    - **Property 7: Clearing search restores the filter-only result set**
    - **Validates: Requirements 3.4**

- [x] 12. Write property-based tests — Filter (fast-check)
  - [x] 12.1 Create `tests/filter.test.js` and write property test for Property 8: dropdown options reflect unique data values
    - Generate a random array of scholarship objects; call `getUniqueSortedValues` for `degree` and `country`; assert exactly one entry per unique value, sorted
    - **Property 8: Dropdown options reflect unique data values**
    - **Validates: Requirements 4.1, 4.2**

  - [x] 12.2 Write property test for Property 9: CGPA filter hides only exceeding scholarships
    - Generate a CGPA threshold T and an array of scholarships; call `applyFilters` with that threshold; assert every result has `minCGPA ≤ T`
    - **Property 9: CGPA filter hides only exceeding scholarships**
    - **Validates: Requirements 4.3**

  - [x] 12.3 Write property test for Property 10: combined filters are ANDed
    - Generate arbitrary combinations of degree/country/type/cgpa filters and a scholarship array; assert every returned scholarship satisfies all active conditions simultaneously
    - **Property 10: Combined filters are ANDed**
    - **Validates: Requirements 4.4**

- [ ] 13. Write property-based tests — Eligibility (fast-check)
  - [x] 13.1 Create `tests/eligibility.test.js` and write property test for Property 11: analysis covers every scholarship exactly once
    - Generate a Student_Profile and a non-empty scholarship array; call `analyzeEligibility`; assert `qualified.length + close.length + notEligible.length === scholarships.length` and no scholarship appears in two sections
    - **Property 11: Eligibility analysis covers every scholarship exactly once**
    - **Validates: Requirements 5.2**

  - [-] 13.2 Write property test for Property 12: CGPA gap message is arithmetically correct (1000 iterations)
    - Generate pairs `(studentCGPA, minCGPA)` where `minCGPA > studentCGPA`; call `analyzeEligibility`; assert gap note contains `(minCGPA - studentCGPA).toFixed(1)`
    - **Property 12: CGPA gap message is arithmetically correct**
    - **Validates: Requirements 5.3**

  - [-] 13.3 Write property test for Property 13: categorisation rule is total and deterministic
    - Generate arbitrary profiles and scholarships; assert each scholarship is classified as Qualified iff `degreeMatch && cgpaGap <= 0`, Close iff `degreeMatch && 0 < cgpaGap <= 0.5`, NotEligible otherwise
    - **Property 13: Categorisation rule is total and deterministic**
    - **Validates: Requirements 5.5**

- [ ] 14. Write property-based tests — Render (fast-check)
  - [x] 14.1 Create `tests/render.test.js` and write property test for Property 2: card displays all required fields
    - Generate arbitrary scholarship objects; call `renderCard`; assert the returned HTML string contains the scholarship's `name`, `provider`, `country`, `degree`, `minCGPA`, `deadline`, `funding`, `status`, and `requirements` values (escaped)
    - **Property 2: Card displays all required fields**
    - **Validates: Requirements 2.1**

  - [ ] 14.2 Write property test for Property 3: Apply Now link is correct
    - Generate scholarships with non-empty `link` values; call `renderCard`; assert the HTML contains `href="<escaped-link>"` and `target="_blank"`
    - **Property 3: Apply Now link is correct**
    - **Validates: Requirements 2.2**

- [ ] 15. Write unit tests for edge cases
  - [x] 15.1 Create `tests/unit.test.js` with unit test: header contains "CareerPath" and tagline
    - Parse the HTML of `index.html` (using Node's `fs.readFileSync`) and assert it contains the text "CareerPath" and "Find Your Scholarship. Build Your Future."
    - _Requirements: 8.2_

  - [~] 15.2 Write unit test: fetch failure shows error state
    - Mock `fetch` to reject; exercise the fetch bootstrap; assert `#errorState` is visible
    - _Requirements: 1.3_

  - [~] 15.3 Write unit test: empty search shows "No scholarships found" message
    - Load a small scholarship array; call `applyFilters` with a query that matches nothing; confirm `renderGrid` would render `#emptyState` (or assert the empty array result)
    - _Requirements: 3.3_

  - [~] 15.4 Write unit test: analyzer prompt shown before first submission
    - Assert `#gapReport` is hidden or shows the `.analyzer-prompt` text before any `#btnAnalyze` click
    - _Requirements: 5.6_

- [x] 16. Set up test runner and `package.json`
  - [x] 16.1 Create `tests/package.json` (or root-level `package.json`) with `fast-check` and `vitest` (or `node:test`) as dev dependencies
    - Add a `test` script: `vitest --run` (or `node --test tests/*.test.js`)
    - Ensure `lib.js` exports are compatible with the chosen module system (CommonJS for `node:test`, or ESM for vitest)
    - _Requirements: 8.4_

- [~] 17. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Run `npm test` and confirm zero failures. Verify all 13 properties are covered across the five test files.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- `lib.js` must use CommonJS `module.exports` if using `node:test`, or ES module `export` if using vitest — pick one consistently in Task 16.1
- `index.html` already has complete HTML structure and CSS; tasks focus on JavaScript logic, not markup or styles
- Visual/CSS requirements (breakpoints, colour tokens, cross-browser rendering) require manual smoke-testing and are not covered by automated tasks
- Each property test MUST include the comment tag: `// Feature: careerpath-scholarship-finder, Property N: <property text>`
- Checkpoints (Tasks 9, 17) are integration pauses and are not included in the dependency graph

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "16.1"] },
    { "id": 1, "tasks": ["1.3", "1.4", "1.5", "1.6"] },
    { "id": 2, "tasks": ["2.1", "3.2"] },
    { "id": 3, "tasks": ["3.1", "4.1", "6.1", "7.3", "8.1"] },
    { "id": 4, "tasks": ["4.2", "5.1", "6.2", "7.1", "10.1", "11.1", "12.1", "13.1", "14.1"] },
    { "id": 5, "tasks": ["5.2", "6.3", "7.2", "10.2", "11.2", "12.2", "12.3", "13.2", "13.3", "14.2", "15.1"] },
    { "id": 6, "tasks": ["7.4", "15.2", "15.3", "15.4"] }
  ]
}
```
