// Feature: careerpath-scholarship-finder, Property 4: Deadline badge appears within window, not outside
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fc = require('fast-check');
const { parseDeadline, isClosingSoon, deadlineCountdownBadge } = require('../lib.js');

/**
 * Constructs a "DD-Mon-YYYY" date string offset by `daysOffset` days from today.
 * @param {number} daysOffset - Positive = future, negative = past, 0 = today
 * @returns {string} e.g. "01-Apr-2027"
 */
function dateStrFromToday(daysOffset) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + daysOffset);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  return `${day}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

// **Validates: Requirements 2.3, 6.2**
// Updated: window is 30 days (not 60), and status must be "Open"
describe('Property 4: isClosingSoon deadline window', () => {

  it('Property 4a: status=Open, days in [0, 30] → isClosingSoon returns true', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 30 }),
        (daysOffset) => {
          const dateStr = dateStrFromToday(daysOffset);
          const result = isClosingSoon(dateStr, 'Open');
          assert.equal(result, true,
            `Expected isClosingSoon("${dateStr}", "Open") (${daysOffset} days from today) to be true`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 4b: status=Open, days in [31, 365] → isClosingSoon returns false', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 31, max: 365 }),
        (daysOffset) => {
          const dateStr = dateStrFromToday(daysOffset);
          const result = isClosingSoon(dateStr, 'Open');
          assert.equal(result, false,
            `Expected isClosingSoon("${dateStr}", "Open") (${daysOffset} days from today) to be false`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 4c: days in [-365, -1] → isClosingSoon returns false (past deadlines)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -365, max: -1 }),
        (daysOffset) => {
          const dateStr = dateStrFromToday(daysOffset);
          const result = isClosingSoon(dateStr, 'Open');
          assert.equal(result, false,
            `Expected isClosingSoon("${dateStr}", "Open") (${daysOffset} days from today, past) to be false`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 4d: any non-Open status, days in [0, 30] → isClosingSoon returns false', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 30 }),
        fc.constantFrom(
          'Opens Sep 2026', 'Opens Jan 2027', 'Opens Jul 2026', 'Opens Aug 2026',
          'Opens Nov 2026', 'Check HEC Portal', 'Expected', 'Coming Soon',
          'Closed', 'Opens Soon', 'Expected 2027'
        ),
        (daysOffset, status) => {
          const dateStr = dateStrFromToday(daysOffset);
          const result = isClosingSoon(dateStr, status);
          assert.equal(result, false,
            `Expected isClosingSoon("${dateStr}", "${status}") to be false for non-Open status`);
        }
      ),
      { numRuns: 100 }
    );
  });

});

// Feature: careerpath-scholarship-finder, Property 5: Unparseable deadlines never trigger the badge

// **Validates: Requirements 6.3**
describe('Property 5: unparseable deadlines never trigger the badge', () => {

  it('Property 5: parseDeadline returns null and isClosingSoon returns false for all unparseable strings', () => {
    // Pool of unparseable deadline strings:
    //   - Month ranges (e.g. "Oct-Nov 2026")
    //   - Rolling entries (e.g. "Rolling 2026", "Rolling Admissions")
    //   - Plain years (e.g. "2027")
    //   - Keyword phrases (e.g. "Check HEC Portal", "Opens Sep 2026", "See website", "TBD 2027")
    const unparseablePool = fc.constantFrom(
      // Month ranges
      'Oct-Nov 2026',
      'Feb-Mar 2027',
      'Jan-Feb 2025',
      // Rolling entries
      'Rolling 2026',
      'Rolling Admissions',
      // Plain years
      '2027',
      '2026',
      '2025',
      // Keyword phrases
      'Check HEC Portal',
      'Opens Sep 2026',
      'See website',
      'TBD 2027'
    );

    fc.assert(
      fc.property(unparseablePool, (deadlineStr) => {
        const parsed = parseDeadline(deadlineStr);
        assert.equal(
          parsed,
          null,
          `Expected parseDeadline("${deadlineStr}") to return null, got ${parsed}`
        );

        const closing = isClosingSoon(deadlineStr);
        assert.equal(
          closing,
          false,
          `Expected isClosingSoon("${deadlineStr}") to return false, got ${closing}`
        );
      }),
      { numRuns: 100 }
    );
  });

});

// Feature: careerpath-scholarship-finder — deadlineCountdownBadge status gate

// **Validates: countdown badge only renders for status="Open"**
describe('deadlineCountdownBadge: status gate', () => {

  it('returns empty string for every non-Open status regardless of deadline proximity', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 15 }),  // within the "Closing Soon" window
        fc.constantFrom(
          'Opens Sep 2026', 'Opens Jan 2027', 'Opens Jul 2026', 'Opens Aug 2026',
          'Opens Nov 2026', 'Check HEC Portal', 'Expected', 'Coming Soon',
          'Closed', 'Opens Soon', 'Expected 2027', undefined
        ),
        (daysOffset, status) => {
          const dateStr = dateStrFromToday(daysOffset);
          const html = deadlineCountdownBadge(dateStr, status);
          assert.strictEqual(html, '',
            `Expected no badge for status="${status}" but got: "${html}"`);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('returns a non-empty red badge for status="Open" and days in [0, 15]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 15 }),
        (daysOffset) => {
          const dateStr = dateStrFromToday(daysOffset);
          const html = deadlineCountdownBadge(dateStr, 'Open');
          assert.ok(html.includes('countdown-red'),
            `Expected red countdown badge for Open + ${daysOffset}d but got: "${html}"`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns a non-empty green badge for status="Open" and days > 15', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 16, max: 365 }),
        (daysOffset) => {
          const dateStr = dateStrFromToday(daysOffset);
          const html = deadlineCountdownBadge(dateStr, 'Open');
          assert.ok(html.includes('countdown-green'),
            `Expected green countdown badge for Open + ${daysOffset}d but got: "${html}"`);
        }
      ),
      { numRuns: 100 }
    );
  });

});
