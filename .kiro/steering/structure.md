# Project Structure

```
CareerPath/
├── index.html          # Entire frontend: HTML, CSS (<style>), and app logic (<script>)
├── lib.js              # Pure utility functions shared between browser and tests (UMD export)
├── scholarships.json   # Scholarship data — the only data source, fetched at runtime
├── package.json        # npm metadata; only devDependency is fast-check
│
├── tests/              # All test files — Node.js node:test + fast-check
│   ├── deadline.test.js    # parseDeadline, isClosingSoon (Properties 4 & 5)
│   ├── eligibility.test.js # analyzeEligibility (Eligibility Gap Analyzer)
│   ├── filter.test.js      # applyFilters, getUniqueSortedValues (Properties 8–10)
│   ├── render.test.js      # renderCard HTML output
│   ├── search.test.js      # matchesSearch / applyFilters search (Properties 6 & 7)
│   └── unit.test.js        # Miscellaneous unit tests (fetch error states, branding)
│
└── .kiro/
    ├── specs/          # Kiro spec files (requirements, design, tasks)
    └── steering/       # This directory — AI steering rules
```

## Key Conventions

### lib.js
- Contains **only pure functions** — no DOM access, no side effects, no globals
- Every exported function has a JSDoc comment describing params and return type
- UMD wrapper at the bottom handles both `require()` (Node/tests) and browser globals
- New utility functions go here if they need to be unit-tested

### index.html
- All UI rendering, event listeners, and app bootstrap live in the `<script>` block at the bottom
- Calls functions from `lib.js` (available as globals in-browser)
- CSS lives in a single `<style>` block in `<head>` — uses CSS custom properties from `:root`
- No external scripts or stylesheets are loaded

### scholarships.json
- Flat array of scholarship objects
- Each record has: `name`, `provider`, `country`, `degree`, `minCGPA`, `deadline`, `funding`, `link`, `status`, `type`, `province`, `requirements`
- `deadline` format varies: `"DD-Mon-YYYY"`, `"Mon-YYYY"`, `"Mon YYYY"`, `"Rolling"`, etc. — `parseDeadline()` handles normalisation
- `degree` may be a slash-separated multi-value string (e.g. `"Masters / PhD"`)

### Tests
- Each test file maps to a feature area; property tests use `fc.assert(fc.property(...))`
- Property tests include a comment linking back to the requirement they validate
- Test arbitraries use `fc.record(...)` to mirror the scholarship object shape
- `numRuns` is set per test: typically 100–500 depending on complexity
