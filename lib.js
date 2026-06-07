'use strict';

/* ── Date utilities ─────────────────────────────────────────────── */
/**
 * Parse deadline strings into a Date object.
 * Supports: "01-Apr-2027", "Apr-2027", "Apr 2027", "01/04/2027"
 * Returns null for rolling / range / unparseable values.
 */
function parseDeadline(str) {
  if (!str || typeof str !== 'string') return null;
  const s = str.trim();

  // Reject obvious non-specific strings
  if (/rolling|range|tbd|see|check|opens/i.test(s)) return null;
  // Reject month ranges like "Oct-Nov 2026"
  if (/[a-z]{3,}-[a-z]{3,}/i.test(s)) return null;

  // Try native parse first (works for ISO etc.)
  // DD-Mon-YYYY  e.g. "01-Apr-2027"
  const ddMonYYYY = s.match(/^(\d{1,2})-([A-Za-z]{3,})-(\d{4})$/);
  if (ddMonYYYY) {
    const d = new Date(`${ddMonYYYY[2]} ${ddMonYYYY[1]}, ${ddMonYYYY[3]}`);
    if (!isNaN(d)) return d;
  }

  // Mon-YYYY or Mon YYYY  e.g. "Dec 2026"
  const monYYYY = s.match(/^([A-Za-z]{3,})[- ](\d{4})$/);
  if (monYYYY) {
    const d = new Date(`${monYYYY[1]} 1, ${monYYYY[2]}`);
    if (!isNaN(d)) return d;
  }

  // "Oct 2026" single month (no dash separator confusion)
  const monYYYY2 = s.match(/^([A-Za-z]{3,})\s+(\d{4})$/);
  if (monYYYY2) {
    const d = new Date(`${monYYYY2[1]} 1, ${monYYYY2[2]}`);
    if (!isNaN(d)) return d;
  }

  // Feb-Mar 2027 style — range, return null
  if (/[a-z]+-[a-z]+\s+\d{4}/i.test(s)) return null;

  // Rolling 2026 style — year only
  const yearOnly = s.match(/^rolling\s+(\d{4})$/i);
  if (yearOnly) return null;

  // Plain year  e.g. "2027"
  const plain = s.match(/^(\d{4})$/);
  if (plain) return null;

  // "Jun 2026" caught by native Date parse
  const d = new Date(s);
  if (!isNaN(d)) return d;

  return null;
}

function daysUntil(date) {
  if (!date) return null;
  const now  = new Date();
  now.setHours(0, 0, 0, 0);
  const ms = date - now;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/**
 * Returns true only when BOTH conditions hold:
 *   1. The scholarship status is "Open" (case-insensitive)
 *   2. The deadline is parseable and within 30 calendar days from today
 * @param {string} deadline - Deadline string
 * @param {string} [status] - Scholarship status value (e.g. "Open")
 * @returns {boolean}
 */
function isClosingSoon(deadline, status) {
  if (status !== undefined && status.toLowerCase().trim() !== 'open') return false;
  const d = parseDeadline(deadline);
  if (!d) return false;
  const days = daysUntil(d);
  return days !== null && days >= 0 && days <= 30;
}

/* ── Search / Filter utilities ──────────────────────────────────── */
/**
 * Returns true if the scholarship matches the given query string.
 * Checks name, provider, and country (case-insensitive substring match).
 * @param {object} s - Scholarship record
 * @param {string} query - Lowercased, trimmed query string
 */
function matchesSearch(s, query) {
  return (
    (s.name     && s.name.toLowerCase().includes(query))     ||
    (s.provider && s.provider.toLowerCase().includes(query)) ||
    (s.country  && s.country.toLowerCase().includes(query))
  );
}

/**
 * Filters a scholarships array by search query and filter criteria.
 * Pure function — does not mutate the input array.
 * @param {object[]} scholarships - Full array of scholarship records
 * @param {object}   filters
 * @param {string}   filters.query   - Already lowercased and trimmed
 * @param {string}   filters.degree  - Degree level filter value (empty = any)
 * @param {string}   filters.country - Country filter value (empty = any)
 * @param {string}   filters.type    - Type filter value (empty = any)
 * @param {number}   filters.cgpa    - Minimum CGPA threshold (0 = no filter)
 * @returns {object[]} Filtered subset of scholarships
 */
function applyFilters(scholarships, { query, degree, country, type, cgpa }) {
  // query should already be lowercased and trimmed
  return scholarships.filter(s => {
    if (query   && !matchesSearch(s, query))        return false;
    if (degree  && !s.degree.includes(degree))      return false;
    if (country && s.country !== country)           return false;
    if (type    && s.type    !== type)              return false;
    if (cgpa > 0 && s.minCGPA > cgpa)              return false;
    return true;
  });
}

/* ── Filter dropdown helpers ────────────────────────────────────── */
/**
 * Returns a sorted array of unique, non-empty string values for a given
 * field key across all scholarship records.
 *
 * Example:
 *   getUniqueSortedValues(scholarships, "country")
 *   // → ["Australia", "Canada", "UK", ...]
 *
 * @param {object[]} scholarships - Array of scholarship records
 * @param {string}   field        - Field key to extract values from (e.g. "degree", "country")
 * @returns {string[]} Sorted array of unique, non-empty values
 */
function getUniqueSortedValues(scholarships, field) {
  const seen = new Set();
  for (const s of scholarships) {
    const val = s[field];
    if (val && typeof val === 'string' && val.trim() !== '') {
      seen.add(val.trim());
    }
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

/* ── HTML escape helper ─────────────────────────────────────────── */
/**
 * Escape special HTML characters in a value to prevent XSS.
 * @param {*} str - Value to escape (coerced to string)
 * @returns {string} HTML-safe string
 */
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ── Status badge class helper ──────────────────────────────────── */
/**
 * Maps a scholarship status string to the appropriate CSS badge class.
 * @param {string} status - The scholarship status value
 * @returns {string} CSS class name
 */
function statusClass(status) {
  if (!status) return 'badge-status-default';
  const s = status.toLowerCase();
  if (s.includes('opens'))    return 'badge-status-opens';
  if (s.includes('open'))     return 'badge-status-open';
  if (s.includes('check'))    return 'badge-status-check';
  if (s.includes('expected')) return 'badge-status-expected';
  return 'badge-status-default';
}

/* ── Deadline countdown badge ───────────────────────────────────── */
/**
 * Returns a countdown badge HTML string for a deadline.
 *
 * Rules:
 * - Only shows a badge when status is exactly "Open" (case-insensitive trim).
 *   Any other status value (e.g. "Opens Sep 2026", "Check HEC Portal",
 *   "Expected", "Coming Soon") returns '' — no badge at all.
 * - Past or unparseable deadline → ''
 * - status=Open AND days = 0   → red "🔥 Last day!"
 * - status=Open AND days ≤ 15  → red "🔥 Closing Soon · Xd left"
 * - status=Open AND days > 15  → green "Xd left"
 *
 * @param {string} deadline
 * @param {string} [status]
 * @returns {string}
 */
function deadlineCountdownBadge(deadline, status) {
  // Only scholarships with status exactly "Open" get any countdown badge
  if (!status || status.trim().toLowerCase() !== 'open') return '';
  const d = parseDeadline(deadline);
  if (!d) return '';
  const days = daysUntil(d);
  if (days === null || days < 0) return '';
  if (days === 0) {
    return `<span class="badge countdown-badge countdown-red">🔥 Last day!</span>`;
  }
  if (days <= 15) {
    return `<span class="badge countdown-badge countdown-red">🔥 Closing Soon · ${days}d left</span>`;
  }
  return `<span class="badge countdown-badge countdown-green">${days}d left</span>`;
}

/* ── Card renderer ──────────────────────────────────────────────── */
/**
 * Renders a single scholarship card as an HTML string.
 * Pure function — no side effects.
 * @param {Object} s           - Scholarship record
 * @param {Object} [opts]      - Optional display options
 * @param {number} [opts.matchScore]   - 0–100 match score (omit to hide)
 * @param {string} [opts.matchReason]  - One-line reason string (omit to hide)
 * @param {boolean} [opts.bookmarked]  - Whether the card is bookmarked
 * @returns {string} HTML string for the card
 */
function renderCard(s, opts) {
  opts = opts || {};
  const d = parseDeadline(s.deadline);
  const days = daysUntil(d);
  const deadlineClass = (days !== null && days >= 0 && days <= 30) ? ' deadline-urgent' : '';
  const bookmarked = opts.bookmarked ? ' bookmarked' : '';
  const bookmarkTitle = opts.bookmarked ? 'Remove bookmark' : 'Bookmark this scholarship';
  const whatsappMsg = encodeURIComponent(
    `Check out this scholarship: ${s.name} — Deadline: ${s.deadline} — Apply here: ${s.link} via CareerPath`
  );

  const matchScoreHtml = (typeof opts.matchScore === 'number')
    ? `<div class="match-score-bar">
        <div class="match-score-header">
          <span class="match-score-label">Match Score</span>
          <span class="match-score-value ${opts.matchScore >= 70 ? 'match-high' : opts.matchScore >= 40 ? 'match-mid' : 'match-low'}">${opts.matchScore}%</span>
        </div>
        <div class="match-score-track"><div class="match-score-fill" style="width:${opts.matchScore}%;background:${opts.matchScore >= 70 ? 'var(--green)' : opts.matchScore >= 40 ? 'var(--amber)' : 'var(--red)'}"></div></div>
        ${opts.matchReason ? `<div class="match-reason">${opts.matchReason}</div>` : ''}
      </div>`
    : '';

  return `
    <article class="card${bookmarked}" role="article" data-name="${escHtml(s.name)}">
      <div class="card-top">
        <div class="card-badges">
          <span class="badge badge-country">${escHtml(s.country)}</span>
          <span class="badge badge-degree">${escHtml(s.degree)}</span>
          <span class="badge ${statusClass(s.status)}">${escHtml(s.status)}</span>
          ${deadlineCountdownBadge(s.deadline, s.status)}
        </div>
        <div class="card-actions">
          <button class="btn-bookmark${bookmarked}" data-name="${escHtml(s.name)}" title="${bookmarkTitle}" aria-label="${bookmarkTitle}">🔖</button>
          <a href="https://wa.me/?text=${whatsappMsg}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp" title="Share on WhatsApp" aria-label="Share on WhatsApp">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Share
          </a>
        </div>
        <div class="card-name">${escHtml(s.name)}</div>
        <div class="card-provider">${escHtml(s.provider)}</div>
      </div>
      <div class="card-body">
        ${matchScoreHtml}
        <div class="card-row">
          <span class="card-row-icon">💰</span>
          <span class="card-row-label">Funding</span>
          <span class="card-row-val">${escHtml(s.funding)}</span>
        </div>
        <div class="card-row">
          <span class="card-row-icon">📅</span>
          <span class="card-row-label">Deadline</span>
          <span class="card-row-val${deadlineClass}">${escHtml(s.deadline)}</span>
        </div>
        <div class="card-row">
          <span class="card-row-icon">📊</span>
          <span class="card-row-label">Min CGPA</span>
          <span class="card-row-val">${escHtml(s.minCGPA)}</span>
        </div>
        ${s.province && s.province !== 'All Pakistan' ? `
        <div class="card-row">
          <span class="card-row-icon">📍</span>
          <span class="card-row-label">Province</span>
          <span class="card-row-val">${escHtml(s.province)}</span>
        </div>` : ''}
        ${s.requirements ? `<div class="card-requirements" title="${escHtml(s.requirements)}">${escHtml(s.requirements)}</div>` : ''}
      </div>
      <div class="card-footer">
        ${(s.link && s.link.trim())
          ? `<a href="${escHtml(s.link.trim())}" target="_blank" rel="noopener noreferrer" class="btn-apply" data-provider="${escHtml(s.provider)}">Apply Now ↗</a>
             <div class="apply-fallback" role="alert">
               ⚠ If this link doesn't work, visit the official website of <strong>${escHtml(s.provider)}</strong> directly for the latest application link.
             </div>`
          : `<span class="btn-apply btn-apply-disabled" aria-disabled="true">No Link Available</span>
             <div class="apply-fallback visible" role="note">
               Visit the official website of <strong>${escHtml(s.provider)}</strong> for the latest application link.
             </div>`}
      </div>
    </article>`;
}

/* ── Eligibility Analyzer ───────────────────────────────────────── */
/**
 * Analyses a student profile against a list of scholarships and
 * categorises each into one of three buckets.
 *
 * @param {{ cgpa: number, degree: string, province: string, countryPref: string, fieldOfStudy: string, financialNeed: boolean }} profile
 * @param {object[]} scholarships - Full array of scholarship records
 * @returns {{ qualified: object[], close: object[], notEligible: object[] }}
 */
function analyzeEligibility(profile, scholarships) {
  const qualified   = [];
  const close       = [];
  const notEligible = [];

  for (const scholarship of scholarships) {
    // Degree match: if profile.degree is empty, treat as match
    const degreeMatch = profile.degree === ''
      ? true
      : scholarship.degree.toLowerCase().includes(profile.degree.toLowerCase());

    // CGPA gap: positive means student falls short
    const cgpaGap = scholarship.minCGPA - profile.cgpa;

    // Build gap note
    const notes = [];
    if (cgpaGap > 0) {
      notes.push(
        `Your CGPA is ${profile.cgpa}, this scholarship requires ${scholarship.minCGPA} — gap of ${cgpaGap.toFixed(1)}`
      );
    }
    if (!degreeMatch) {
      notes.push(
        `Degree mismatch: you are applying for ${profile.degree}, this scholarship is for ${scholarship.degree}`
      );
    }
    const gapNote = notes.join('\n');

    const result = { scholarship, cgpaGap, degreeMatch, gapNote };

    if (degreeMatch && cgpaGap <= 0) {
      qualified.push(result);
    } else if (degreeMatch && cgpaGap > 0 && cgpaGap <= 0.5) {
      close.push(result);
    } else {
      notEligible.push(result);
    }
  }

  return { qualified, close, notEligible };
}

(function(root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    const exports = factory();
    Object.assign(root, exports);  // inject all functions as globals
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  return { parseDeadline, daysUntil, isClosingSoon, matchesSearch, applyFilters, getUniqueSortedValues, escHtml, statusClass, renderCard, deadlineCountdownBadge, analyzeEligibility };
});
