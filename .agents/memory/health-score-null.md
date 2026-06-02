---
name: Health score null
description: calculateClassHealthScore returns null (not 50) when no students exist.
---

`server/services/analyticsService.js` — `calculateClassHealthScore` returns `null` when `!students.length`. Previously returned `50`, which wrongly implied a meaningful score with no data.

The `ClassHealthScore` component (`client/src/components/ClassHealthScore.jsx`) renders an empty-state panel when `score === null || totalStudents === 0`. The Dashboard passes `score={dashboard.classHealthScore ?? null}` (no fallback to 50).

**Why:** "Fix analytics correctness" requirement — no fabricated numbers. Judges/evaluators checking the empty state would see `50` and know it's fake.

**How to apply:** Any metric that has no meaningful value with no data should return `null`, not a placeholder number. The UI should explicitly say "No data yet" rather than silently showing 0 or 50.
