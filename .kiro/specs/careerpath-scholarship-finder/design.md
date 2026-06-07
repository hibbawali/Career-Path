# Design Document — CareerPath Scholarship Finder

## Overview

CareerPath is a client-side single-page application (SPA) delivered as a single `index.html` file. It has zero build-time dependencies and zero runtime JavaScript libraries. All HTML markup, CSS rules, and JavaScript logic live inside the one file. Data is loaded at runtime from `./scholarships.json` via the browser's Fetch API.

**Key design constraints:**

- No framework, bundler, transpiler, or package manager.
- All styles are in a `<style>` block; all scripts are in a `<script>` block.
- The application must work when served from a local HTTP server (CORS restriction prevents `fetch` from working over `file://`).
- Target browsers: Chrome, Firefox, Safari (latest stable).

---

## Architecture

### Single-File SPA Pattern

```
index.html
├── <head>
│   ├── <meta charset> / <meta viewport>
│   ├── <title>
│   └── <style>   ← all CSS, design tokens, responsive rules
├── <body>        ← all HTML structure
└── <script>      ← all JavaScript (IIFE, strict mode)
```

The JavaScript is wrapped in an IIFE (`(function(){ 'use strict'; ... })()`) to avoid polluting the global scope while still operating in a plain browser environment.

### Runtime Data Flow

```
Page load
  │
  ▼
fetch('./scholarships.json')
  │
  ├── success ──► parse JSON
  │                  │
  │                  ▼
  │             allScholarships[]   ← module-level array (source of truth)
  │                  │
  │                  ▼
  │             populateFilters()   ← build <select> options from unique values
  │                  │
  │                  ▼
  │             applyFiltersAndSearch()  ← compute filtered[]
  │                  │
  │                  ▼
  │             renderGrid(filtered[])  ← build card HTML, inject into DOM
  │
  └── failure ──► show #errorState
```

### State Mutation Flow

Any user interaction (typing in Search_Bar, changing a Filter_Panel control, clicking "Reset All", submitting Eligibility_Analyzer) follows the same unidirectional pipeline:

```
User event
  │
  ▼
Update plain-JS state variable(s)
  │
  ▼
applyFiltersAndSearch()  ← pure derivation, writes to filtered[]
  │
  ▼
renderGrid(filtered[])   ← re-renders scholarship grid
```

There is no two-way data binding and no virtual DOM. Re-rendering the grid replaces `innerHTML` of `#scholarshipGrid`.

---

## Components and Interfaces

### 1. Header

**DOM element:** `<header>` / `.header-inner`

**Responsibilities:**
- Displays brand name "CareerPath" and tagline.
- Shows three live stat pills: total scholarships loaded, count currently marked "Open", count with `isClosingSoon() === true`.
- Stats are updated once after data loads and again after every filter/search cycle.

**Interface:** `updateHeaderStats(scholarships)` — accepts the full `allScholarships` array and writes text into `#statTotal`, `#statOpen`, `#statUrgent`.

---

### 2. Search Bar

**DOM elements:** `#searchInput`, `#clearSearch` button, `.search-wrap`

**Responsibilities:**
- Accepts free-text queries.
- Dispatches `input` events that trigger `applyFiltersAndSearch()`.
- Shows/hides the clear (×) button based on whether the field is empty.

**Interface:** Read `searchInput.value` inside `applyFiltersAndSearch()`. No dedicated function needed.

---

### 3. Filter Panel

**DOM elements:** `.filters-section`, `#filterDegree`, `#filterCountry`, `#filterType`, `#filterCGPA`, `#resetFilters`

**Responsibilities:**
- Provides four filter controls: degree dropdown, country dropdown, type dropdown, CGPA threshold input.
- Degree and country options are populated dynamically from `allScholarships` after data loads.
- Reset button clears all controls back to default values.

**Interfaces:**
- `populateFilterDropdowns(scholarships)` — derives unique sorted values for degree and country selects.
- `resetFilters()` — sets all controls to empty/default, calls `applyFiltersAndSearch()`.

---

### 4. Results Bar

**DOM elements:** `.results-bar`, `#resultsCount`, `#sortSelect`

**Responsibilities:**
- Displays count of visible scholarships (e.g. "Showing **12** of 20 scholarships").
- Sort dropdown (deadline, name, CGPA, country) triggers `applyFiltersAndSearch()`.

---

### 5. Scholarship Grid

**DOM element:** `#scholarshipGrid`

**Responsibilities:**
- Container for Scholarship Cards.
- CSS Grid layout (3 columns ≥1024 px, 2 columns 640–1023 px, 1 column <640 px).
- Shows `#emptyState` when `filtered` is empty after a search/filter.
- Shows `#loadingState` while fetch is in progress.

**Interface:** `renderGrid(scholarships)` — clears the grid, iterates the array, calls `renderCard()` for each, injects all cards as a HTML string via `innerHTML`.

---

### 6. Scholarship Card

**DOM element:** `.card` (one per scholarship)

**Responsibilities:**
- Displays: name, provider, country badge, degree badge, status badge, deadline (with urgency colouring), funding, minimum CGPA, requirements (truncated to 3 lines).
- Shows Deadline_Badge (`badge-closing`) when `isClosingSoon(deadline) === true`.
- "Apply Now" anchor opens `link` in `target="_blank"`.

**Interface:** `renderCard(scholarship) → string` — pure function returning an HTML string for one card.

---

### 7. Eligibility Analyzer

**DOM elements:** `.analyzer-section`, `#analyzerForm`, `#aCGPA`, `#aDegree`, `#aProvince`, `#aCountry`, `#aField`, `#aFinancial`, `#btnAnalyze`

**Responsibilities:**
- Collects Student_Profile: CGPA (number 0–4), degree level, province, country preference, field of study, financial need (boolean).
- On button click: validates CGPA input is a number in [0, 4]; renders `#gapReport`.

**Interface:** `analyzeEligibility(profile, scholarships) → GapResult` where `GapResult = { qualified: [], close: [], notEligible: [] }`.

---

### 8. Gap Report

**DOM element:** `#gapReport`

**Responsibilities:**
- Renders three labelled sections from a `GapResult` object.
- Each item shows scholarship name, provider, country, degree, and — for non-qualified items — a descriptive gap note.
- Shows instructional prompt before first submission.

**Interface:** `renderGapReport(gapResult, profile)` — replaces `#gapReport.innerHTML`.

---

## Data Models

### Scholarship Record (from JSON)

```js
{
  name:         string,   // Display name
  country:      string,   // Destination country
  provider:     string,   // Awarding institution / agency
  degree:       string,   // e.g. "Masters / PhD", "Undergraduate"
  minCGPA:      number,   // Minimum required CGPA (0–4 scale)
  deadline:     string,   // Free-form date string (see Deadline Badge Logic)
  funding:      string,   // Human-readable funding description
  link:         string,   // URL to official scholarship page
  status:       string,   // e.g. "Open", "Opens Sep 2026", "Check HEC Portal"
  type:         string,   // "international" | "local"
  province:     string,   // "All Pakistan" or specific province(s)
  requirements: string    // Free-text eligibility notes
}
```

### Student Profile (in-memory only)

```js
{
  cgpa:            number,   // 0.00–4.00
  degree:          string,   // "Undergraduate" | "Masters" | "PhD"
  province:        string,   // Free text
  countryPref:     string,   // Empty string = any country
  fieldOfStudy:    string,   // Free text
  financialNeed:   boolean
}
```

### Gap Result (in-memory only)

```js
{
  qualified:   ScholarshipResult[],
  close:       ScholarshipResult[],
  notEligible: ScholarshipResult[]
}

ScholarshipResult = {
  scholarship: Scholarship,
  cgpaGap:     number,       // scholarship.minCGPA - profile.cgpa  (≥ 0 if gap exists)
  degreeMatch: boolean,
  gapNote:     string        // Human-readable gap description or ""
}
```

### Application State (plain JS variables)

```js
let allScholarships = [];   // Full dataset loaded from JSON
let filtered        = [];   // Derived after applying filters + search
```

No additional state objects. Filter values are read directly from DOM input elements when needed.

---

## Eligibility Logic

### Degree Matching

The scholarship `degree` field is a slash-delimited string such as `"Masters / PhD"` or `"Undergraduate / Masters / PhD"`. A degree match is determined by case-insensitive substring search:

```
degreeMatch(scholarshipDegree, studentDegree) =
  scholarshipDegree.toLowerCase().includes(studentDegree.toLowerCase())
```

Special case: if the student has not selected a degree level (empty string), every scholarship is treated as a potential degree match for the purposes of the Eligibility Analyzer (the filter panel still applies separately).

### CGPA Gap Calculation

```
cgpaGap = scholarship.minCGPA - profile.cgpa
```

- `cgpaGap ≤ 0` → no CGPA gap (student meets or exceeds requirement)
- `0 < cgpaGap ≤ 0.5` → Close Match
- `cgpaGap > 0.5` → Not Eligible (CGPA reason)

### Categorisation Rules

```
IF degreeMatch AND cgpaGap <= 0  →  "You Qualify"
IF degreeMatch AND 0 < cgpaGap <= 0.5  →  "Close Match"
ELSE  →  "Not Eligible"
```

Degree mismatch always overrides close-match classification: a scholarship where the student's degree level is not listed in `scholarship.degree` is always "Not Eligible", regardless of CGPA.

### Gap Note Format

```
CGPA gap:    "Your CGPA is {profile.cgpa}, this scholarship requires {scholarship.minCGPA} — gap of {cgpaGap.toFixed(1)}"
Degree gap:  "Degree mismatch: you are applying for {profile.degree}, this scholarship is for {scholarship.degree}"
Both:        Both notes concatenated, separated by a line break
```

---

## Deadline Badge Logic

### Parsing Strategy

The `parseDeadline(str)` function converts a free-form deadline string to a `Date` object or `null`. The following formats are handled:

| Format | Example | Behaviour |
|---|---|---|
| `DD-Mon-YYYY` | `01-Apr-2027` | Parse as specific date |
| `Mon-YYYY` | `Apr-2027` | Parse as 1st of the month |
| `Mon YYYY` | `Apr 2027` | Parse as 1st of the month |
| `Mon YYYY` (native) | `Jun 2026` | Attempt native Date parse |
| Month range | `Oct-Nov 2026` | Return `null` |
| Verb range | `Feb-Mar 2027` | Return `null` |
| Rolling | `Rolling 2026` | Return `null` |
| Keyword phrases | `Check HEC Portal` | Return `null` |
| Plain year | `2027` | Return `null` |
| Empty / null | — | Return `null` |

**Rejection heuristics (applied before any parsing attempt):**
1. Contains `rolling`, `range`, `tbd`, `see`, `check` (case-insensitive) → `null`
2. Matches `/[a-z]{3,}-[a-z]{3,}/i` (two word-sequences separated by a hyphen, e.g. month ranges) → `null`

### Urgency Decision

```
isClosingSoon(deadline):
  d = parseDeadline(deadline)
  if d === null → false
  days = ceil((d - today) / 86_400_000)
  return days >= 0 && days <= 60
```

A deadline in the past (`days < 0`) does **not** show the Deadline_Badge (the scholarship is already closed). A deadline exactly 60 days away shows the badge; 61 days away does not.

---

## Responsive Layout Strategy

### CSS Custom Properties (Design Tokens)

```css
:root {
  --blue:      #1B3A4B;   /* Header, buttons, brand */
  --blue-mid:  #24526A;   /* Hover states */
  --blue-lite: #2D6A8A;   /* Focus rings, icons */
  --red:       #E74C3C;   /* Deadline badge, error state */
  --red-dark:  #C0392B;   /* Gap notes, error text */
  --green:     #27AE60;   /* Qualified badge */
  --amber:     #E67E22;   /* Close match badge */
  --grey-bg:   #F0F4F8;   /* Page background */
  --card-bg:   #FFFFFF;   /* Card background */
  --text:      #1A1A2E;   /* Body text */
  --muted:     #6B7280;   /* Labels, secondary text */
  --border:    #D1D9E0;   /* Borders, dividers */
  --shadow:    0 2px 12px rgba(0,0,0,.10);  /* Card shadow */
  --radius:    10px;       /* Card border radius */
}
```

### Grid Breakpoints

| Viewport width | Scholarship Grid columns | Filter Panel layout |
|---|---|---|
| ≥ 1024 px | 3 columns | Horizontal row (4 controls inline) |
| 640 – 1023 px | 2 columns | 2×2 grid |
| < 640 px | 1 column | 1×4 stack |
| < 400 px | 1 column | 1×4 stack (tighter) |

```css
/* Desktop */
#scholarshipGrid { grid-template-columns: repeat(3, 1fr); }

@media (max-width: 1023px) {
  #scholarshipGrid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 639px) {
  #scholarshipGrid { grid-template-columns: 1fr; }
  .filters-grid    { grid-template-columns: 1fr 1fr; }
  .analyzer-form   { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 400px) {
  .filters-grid  { grid-template-columns: 1fr; }
  .analyzer-form { grid-template-columns: 1fr; }
}
```

### Analyzer Form Usability at 360 px

The analyzer form uses `grid-template-columns: repeat(auto-fit, minmax(160px, 1fr))`. At 360 px viewport (minus padding), available width is ≈ 327 px, which forces a single column. No horizontal scrolling occurs because all inputs are `width: 100%` and the container has no fixed width wider than the viewport.

---

## Visual Design

### Header

```
background: #1B3A4B
text: white
tagline: "Find Your Scholarship. Build Your Future."
stat pills: semi-transparent white (rgba(255,255,255,.1))
```

### Card

```
background:    #FFFFFF
border-radius: 10px
box-shadow:    0 2px 12px rgba(0,0,0,.10)
hover:         translateY(-3px), shadow deepens to 0 8px 28px rgba(0,0,0,.15)
border:        1px solid rgba(0,0,0,.05)
```

### Deadline Badge

```
class:       .badge-closing
background:  #E74C3C
color:       white
animation:   pulse (opacity 1 ↔ 0.75, 1.8s infinite)
```

### Status Badge Colour Map

| Status keyword | Class | Background |
|---|---|---|
| "open" | badge-status-open | #EAFAF1 (green tint) |
| "opens" | badge-status-opens | #F5EEF8 (purple tint) |
| "check" | badge-status-check | #FEF9E7 (amber tint) |
| "expected" | badge-status-expected | #EBF5FB (blue tint) |
| fallback | badge-status-default | #F0F0F0 |

---

## State Management

Application state is held in two module-level variables inside the IIFE:

```js
let allScholarships = [];   // Written once after successful fetch
let filtered        = [];   // Re-derived on every user interaction
```

Filter state is **not** mirrored in JS variables; it is read directly from DOM form elements when `applyFiltersAndSearch()` is called. This eliminates the possibility of stale state diverging between the JS object and the DOM.

### Filter/Search Pipeline

```js
function applyFiltersAndSearch() {
  const query   = searchInput.value.trim().toLowerCase();
  const degree  = filterDegree.value;
  const country = filterCountry.value;
  const type    = filterType.value;
  const cgpa    = parseFloat(filterCGPA.value) || 0;

  filtered = allScholarships.filter(s => {
    // Search
    if (query && !matchesSearch(s, query)) return false;
    // Filters
    if (degree  && !s.degree.includes(degree))        return false;
    if (country && s.country !== country)             return false;
    if (type    && s.type    !== type)                return false;
    if (cgpa > 0 && s.minCGPA > cgpa)                return false;
    return true;
  });

  sortFiltered();
  renderGrid(filtered);
  updateResultsCount();
}
```

`matchesSearch(scholarship, query)` checks `name`, `provider`, and `country` case-insensitively.

### Sort Pipeline

```js
function sortFiltered() {
  const key = sortSelect.value;
  filtered.sort((a, b) => {
    if (key === 'deadline') {
      const da = parseDeadline(a.deadline), db = parseDeadline(b.deadline);
      if (!da && !db) return 0;
      if (!da) return 1;   // unparseable → send to end
      if (!db) return -1;
      return da - db;
    }
    if (key === 'name')    return a.name.localeCompare(b.name);
    if (key === 'cgpa')    return a.minCGPA - b.minCGPA;
    if (key === 'country') return a.country.localeCompare(b.country);
    return 0;
  });
}
```

---

## Error Handling

| Failure scenario | Behaviour |
|---|---|
| `fetch` network error or non-OK HTTP status | Hide `#loadingState`, show `#errorState` with explanatory message |
| `JSON.parse` error (malformed file) | Caught in `.catch()`, same error state shown |
| Scholarship record missing a field | Property accessed returns `undefined`; rendered as empty string via `escHtml(val ?? '')` |
| `parseDeadline` given unexpected input | Returns `null`; badge is silently suppressed |
| CGPA input non-numeric | `parseFloat()` returns `NaN`; treated as 0 (no CGPA filter applied) |
| Analyzer form submitted with empty CGPA | Treat as CGPA = 0 (worst case for gap calculation; all scholarships with minCGPA > 0 will show a gap) |
| Invalid link URL in scholarship record | Anchor `href` is set as-is; browser handles invalid URLs natively |

### Fetch Error Handler

```js
fetch('./scholarships.json')
  .then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  })
  .then(data => {
    loadingState.style.display = 'none';
    allScholarships = data;
    // ... bootstrap UI
  })
  .catch(err => {
    loadingState.style.display = 'none';
    errorState.style.display   = 'block';
    console.error('Failed to load scholarships:', err);
  });
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

---

### Property 1: Full dataset is rendered

*For any* array of N scholarship records loaded from JSON, the Scholarship Grid SHALL render exactly N cards (before any filtering or search is applied).

**Validates: Requirements 1.2**

---

### Property 2: Card displays all required fields

*For any* scholarship record, the HTML string produced by `renderCard()` SHALL contain the scholarship's `name`, `provider`, `country`, `degree`, `minCGPA`, `deadline`, `funding`, `status`, and `requirements` values.

**Validates: Requirements 2.1**

---

### Property 3: Apply Now link is correct

*For any* scholarship record with a non-empty `link` field, the rendered card SHALL contain an `<a>` element whose `href` attribute equals `link` and whose `target` attribute equals `"_blank"`.

**Validates: Requirements 2.2**

---

### Property 4: Deadline badge appears within window, not outside

*For any* date that is between 0 and 60 calendar days from today (inclusive), `isClosingSoon()` SHALL return `true`. *For any* date more than 60 days away or in the past, `isClosingSoon()` SHALL return `false`.

**Validates: Requirements 2.3, 6.2**

---

### Property 5: Unparseable deadlines never trigger the badge

*For any* deadline string that is a date range (e.g. "Oct-Nov 2026"), a rolling entry (e.g. "Rolling 2026"), a plain year, or contains keywords such as "Check" or "Opens", `parseDeadline()` SHALL return `null` and `isClosingSoon()` SHALL return `false`.

**Validates: Requirements 6.3**

---

### Property 6: Search is case-insensitive and substring-based

*For any* scholarship and *any* non-empty substring of its `name`, `provider`, or `country` field (regardless of character case), passing that substring as the search query SHALL include that scholarship in the filtered results.

**Validates: Requirements 3.1, 3.2**

---

### Property 7: Clearing search restores the filter-only result set

*For any* filter state and *any* active search query, clearing the search input SHALL produce exactly the same set of visible scholarships as if the search had never been applied (only the active filter conditions apply).

**Validates: Requirements 3.4**

---

### Property 8: Dropdown options reflect unique data values

*For any* dataset, the degree dropdown SHALL contain exactly one option per unique `degree` value present in the dataset (plus the "All Degrees" default), and the country dropdown SHALL contain exactly one option per unique `country` value (plus the "All Countries" default).

**Validates: Requirements 4.1, 4.2**

---

### Property 9: CGPA filter hides only exceeding scholarships

*For any* threshold value T entered into the CGPA filter, every scholarship visible in the grid SHALL have `minCGPA ≤ T`, and every scholarship with `minCGPA > T` SHALL be hidden.

**Validates: Requirements 4.3**

---

### Property 10: Combined filters are ANDed

*For any* combination of active filter values (degree, country, type, CGPA threshold), every scholarship card visible in the grid SHALL simultaneously satisfy every active filter condition. No card violating any single active filter SHALL appear.

**Validates: Requirements 4.4**

---

### Property 11: Eligibility analysis covers every scholarship exactly once

*For any* Student Profile and *any* non-empty set of loaded scholarships, the union of the "You Qualify", "Close Match", and "Not Eligible" sections in the Gap Report SHALL contain every scholarship exactly once.

**Validates: Requirements 5.2**

---

### Property 12: CGPA gap message is arithmetically correct

*For any* pair (studentCGPA, scholarshipMinCGPA) where `scholarshipMinCGPA > studentCGPA`, the gap note displayed SHALL contain the value `(scholarshipMinCGPA - studentCGPA)` rounded to exactly one decimal place.

**Validates: Requirements 5.3**

---

### Property 13: Categorisation rule is total and deterministic

*For any* Student Profile and *any* scholarship record, the category assigned by `analyzeEligibility()` SHALL be:
- "You Qualify" if and only if `degreeMatch === true` AND `cgpaGap ≤ 0`
- "Close Match" if and only if `degreeMatch === true` AND `0 < cgpaGap ≤ 0.5`
- "Not Eligible" in all other cases

**Validates: Requirements 5.5**

---

## Testing Strategy

### PBT Applicability Assessment

This feature contains significant pure-function logic — the filter pipeline, `parseDeadline`, `isClosingSoon`, `matchesSearch`, `analyzeEligibility`, `renderCard`, and the categorisation rules — all of which have well-defined input/output behaviour and benefit from varied inputs. Property-based testing is appropriate.

The layout and visual design requirements (CSS breakpoints, colour tokens, cross-browser rendering) are **not** testable with PBT; those require manual visual inspection or screenshot diffing.

### Property-Based Testing Library

Use **fast-check** (JavaScript) for property-based tests. Since there is no build system, tests are run in a Node.js environment with a lightweight test runner (e.g. `node:test` built-in or `vitest` with `--run`). The pure functions under test (`parseDeadline`, `isClosingSoon`, `matchesSearch`, `analyzeEligibility`, `renderCard`, filter pipeline) are extracted into a separate `lib.js` module for testability, or tested directly in the script bundle via a test harness that imports them.

Minimum 100 iterations per property test (fast-check default is 100; increase to 1000 for CGPA gap arithmetic).

### Dual Testing Approach

**Property tests** (fast-check):

| Test file | Properties covered |
|---|---|
| `deadline.test.js` | Properties 4, 5 |
| `search.test.js` | Properties 6, 7 |
| `filter.test.js` | Properties 8, 9, 10 |
| `eligibility.test.js` | Properties 11, 12, 13 |
| `render.test.js` | Properties 2, 3 |

**Unit / example tests** (node:test or vitest):

| Test | Requirement |
|---|---|
| Fetch failure shows error state | 1.3 |
| Empty search shows "No scholarships found" | 3.3 |
| Prompt shown before analyzer submission | 5.6 |
| Header contains "CareerPath" and tagline | 8.2 |

**Smoke tests (manual):**

- Page loads and grid populates on local server
- Header background is #1B3A4B
- Deadline badge background is #E74C3C
- Grid shows 3 columns at 1280 px, 2 at 768 px, 1 at 375 px
- Filter panel stacks correctly on mobile
- Analyzer form fits 360 px viewport without scroll
- Renders correctly in Chrome, Firefox, Safari

### Tag Format

Each property-based test MUST include a comment tag:

```js
// Feature: careerpath-scholarship-finder, Property N: <property text>
```
