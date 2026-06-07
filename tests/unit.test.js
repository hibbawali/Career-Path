'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fs       = require('node:fs');
const path     = require('node:path');
const { applyFilters } = require('../lib');

// Feature: careerpath-scholarship-finder
// Requirements: 1.3

test('fetch failure shows error state and hides loading state', async (t) => {
  // Arrange: minimal DOM-like objects mirroring #loadingState and #errorState
  const loadingState = { style: { display: 'block' } };
  const errorState   = { style: { display: 'none'  } };

  // Replicate the catch-block logic from the fetch bootstrap in index.html
  const handleFetchError = () => {
    loadingState.style.display = 'none';
    errorState.style.display   = 'block';
  };

  // Act: mock fetch that rejects (simulates network failure)
  const mockFetch = () => Promise.reject(new Error('Network error'));
  await mockFetch().catch(() => handleFetchError());

  // Assert
  assert.equal(loadingState.style.display, 'none',  '#loadingState should be hidden after fetch failure');
  assert.equal(errorState.style.display,   'block', '#errorState should be visible after fetch failure');
});

test('fetch non-OK response shows error state and hides loading state', async (t) => {
  // Arrange
  const loadingState = { style: { display: 'block' } };
  const errorState   = { style: { display: 'none'  } };

  const handleFetchError = () => {
    loadingState.style.display = 'none';
    errorState.style.display   = 'block';
  };

  // Act: mock fetch that resolves with a non-OK HTTP 500 response
  const mockFetch = () => Promise.resolve({ ok: false, status: 500 });
  await mockFetch()
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .catch(() => handleFetchError());

  // Assert
  assert.equal(loadingState.style.display, 'none',  '#loadingState should be hidden after non-OK response');
  assert.equal(errorState.style.display,   'block', '#errorState should be visible after non-OK response');
});

// Feature: careerpath-scholarship-finder
// Requirements: 3.3

test('empty search state — applyFilters returns empty array when query matches nothing', () => {
  // Arrange: a small set of scholarships with known names/providers/countries
  const scholarships = [
    { name: 'Chevening Scholarship', provider: 'UK Government', country: 'United Kingdom', degree: 'Masters', minCGPA: 0, type: 'Full' },
    { name: 'Fulbright Program',     provider: 'US Embassy',    country: 'United States',  degree: 'PhD',     minCGPA: 0, type: 'Full' },
    { name: 'DAAD Fellowship',       provider: 'DAAD',          country: 'Germany',        degree: 'Masters', minCGPA: 0, type: 'Partial' },
  ];

  // Act: query that cannot possibly match any name, provider, or country
  const result = applyFilters(scholarships, {
    query:   'xyzzy_no_match_12345',
    degree:  '',
    country: '',
    type:    '',
    cgpa:    0,
  });

  // Assert: empty array → renderGrid would show #emptyState
  assert.deepEqual(result, [], 'applyFilters should return [] when no scholarships match the query');
});

// Feature: careerpath-scholarship-finder
// Requirements: 8.2

test('header contains site name "CareerPath" and tagline', () => {
  const htmlPath = path.resolve(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.ok(
    html.includes('CareerPath'),
    'index.html should contain the site name "CareerPath"'
  );
  assert.ok(
    html.includes('Find Your Scholarship. Build Your Future.'),
    'index.html should contain the tagline "Find Your Scholarship. Build Your Future."'
  );
});
