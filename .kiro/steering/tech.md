# Tech Stack

## Runtime & Language
- Vanilla JavaScript (ES5-compatible, `'use strict'` everywhere)
- No build step, no bundler, no transpiler — files are served directly
- Node.js used only for running tests (not part of the app runtime)

## Frontend
- Single HTML file: `index.html` (contains all CSS and inline script)
- Shared logic lives in `lib.js`, exported via a UMD-compatible IIFE
  - In-browser: all functions injected as globals via `Object.assign(globalThis, ...)`
  - In Node.js (tests): loaded via `require('../lib')`
- No frontend framework (no React, Vue, etc.)
- No external CSS framework — all styles are hand-written in `<style>` inside `index.html`
- CSS custom properties (variables) defined on `:root` for the design token system
- Data source: `scholarships.json` fetched at runtime via the browser `fetch()` API

## Testing
- **Test runner**: Node.js built-in `node:test` (no Jest, Mocha, etc.)
- **Assertion library**: `node:assert/strict`
- **Property-based testing**: `fast-check` ^3.22.0 (only `devDependency`)
- Test files: `tests/*.test.js`

## Deployment
- Deployed on Vercel (see `.vercel/project.json`)
- No server-side code; static file hosting only

## Common Commands

```bash
# Run all tests (single pass, no watch mode)
node --test tests/*.test.js

# npm shorthand
npm test
```
