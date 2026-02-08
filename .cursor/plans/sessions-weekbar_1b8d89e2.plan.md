---
name: sessions-weekbar
overview: Add an interactive week bar to Sessions page allowing week navigation, per-day selection, and creating sessions prefilled with selected date.
todos:
  - id: add-week-utils
    content: Create `src/lib/date/week.ts` with startOfWeek/endOfWeek and ISO helpers.
    status: pending
  - id: weekbar-component
    content: Add `src/components/sessions/WeekBar.tsx` implementing the week UI, prev-week control, day cells, dot indicator, and accessibility attributes.
    status: pending
  - id: sessionspage-wiring
    content: Update `src/pages/SessionsPage.tsx` to integrate WeekBar, maintain week/selected date state, compute `from`/`to` params, and pass `initialDate` to `NewSessionModal`.
    status: pending
  - id: modal-date-picker
    content: "Update `src/components/sessions/NewSessionModal.tsx` to accept `initialDate?: number`, display a date picker, and pass selected date to `onCreate`."
    status: pending
  - id: update-oncreate-signature
    content: Update NewSessionModal prop `onCreate` type and call sites (SessionsPage.handleCreateSession) to accept optional date parameter.
    status: pending
  - id: derive-day-dots
    content: In SessionsPage, fetch sessions for visible week (use `useSessions`) and pass `hasSessionForDate(date)` to WeekBar.
    status: pending
  - id: docs-prd
    content: Update `.ai/prd.md` and add a short plan note in `.cursor/plans/` describing the feature, acceptance criteria, and developer notes.
    status: pending
  - id: qa-and-accessibility
    content: "Manual QA: keyboard nav, screenreader labels, timezone day boundaries, mobile responsiveness."
    status: pending
isProject: false
---

# Sessions Week Bar — Implementation Plan

## Summary

Add an interactive week bar to `src/pages/SessionsPage.tsx` that: shows the current week by default (weeks start on Monday), allows scrolling to previous weeks only, indicates days with logged sessions (single dot), lets the user select a day (toggles per-day filter for the session list), and opens `NewSessionModal` prefilled with the selected date. Clicking a selected day again resets the weekly filter.

## Files to add / update

- Update: `src/pages/SessionsPage.tsx` — wire the week bar, maintain selectedWeek/selectedDate state, pass date filters to `SessionList`, open modal with initial date.
- Add: `src/components/sessions/WeekBar.tsx` — standalone interactive week bar component (horizontal list with prev-week navigation, day cells, dot indicator, keyboard & screen-reader support).
- Update: `src/components/sessions/NewSessionModal.tsx` — add `initialDate?: number` prop, add a date picker input (prefilled) and include selected date in `onCreate` payload.
- Update: `src/components/sessions/SessionList.tsx` — no structural changes, but will be passed `params` from SessionsPage (uses existing `from`/`to` params).
- Add: `src/lib/date/week.ts` — small date utilities (startOfWeek, endOfWeek, toISODateString, fromISODateString).
- Update docs: `.ai/prd.md` and `.cursor/plans/*` — add feature description and acceptance criteria.

## UX & behavior (spec)

- Week start: Monday (per preference).
- Default view: current week (Mon–Sun of current week), `SessionList` shows sessions within that week.
- Navigation: left/prev button to move to previous week(s). No forward navigation beyond current week.
- Day cell:
  - Shows date (short weekday + day number).
  - Shows single dot if any session exists for that day.
  - Click toggles selection:
    - If day becomes selected: `SessionList` is filtered to that single date (`from` = day start, `to` = day end).
    - If clicking again on already-selected day: clear selection and show whole week.
  - Keyboard: focusable, Enter/Space triggers click.
  - Accessibility: aria-pressed, aria-label with date human readable.
- New session flow: clicking a day opens `NewSessionModal` with `initialDate` set to that day. Modal date picker default value equals that `initialDate`.
- Session creation: `onCreate` should accept optional date override (unix ms) to set session.date. When creating from plan, pass the date as override.

## Implementation notes & key snippets

- Use existing `useSessions` hook: `SessionList` accepts `params` and already supports `from`/`to` date range. SessionsPage will compute from/to as ISO strings (or Date.toISOString) and pass via `params` to `SessionList`.
- Week utilities (example):

```javascript
// src/lib/date/week.ts (proposed)
export function startOfWeek(date = new Date(), weekStartsOn = 1) {
  const d = new Date(date);
  const diff = (d.getDay() + 7 - weekStartsOn) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
export function endOfWeek(date) {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}
export function toISODateString(d) {
  return new Date(d).toISOString();
}
```

- WeekBar responsibilities:
  - Accept `referenceDate` (Date | number) to show the week that contains it.
  - Expose callbacks: `onDayClick(date: number)`, `onPrevWeek()`; props: `hasSessionForDate(date: number): boolean`, `selectedDate?: number`.
  - Render 7 day cells (Mon–Sun), each cell shows dot if `hasSessionForDate(d)`.
- NewSessionModal change (key lines):
  - Add prop: `initialDate?: number`
  - Add local state `dateISO` initialized from `initialDate` or today; input: `<input type="date" value={dateISO} onChange=.../>` and convert to ms when calling `onCreate(name, planId, planName, dateMs)`.
  - Update `NewSessionModalProps.onCreate` signature to accept an optional `dateMs?: number`.
- SessionsPage wiring:
  - Manage state: `currentWeekRefDate` (Date ms), `selectedDate?: number` (ms), `weekOffset` (0 = this week, 1 = previous week, ...).
  - Compute weekFrom / weekTo using week utils and pass to `SessionList` as `params={{ from: toISO(weekFrom), to: toISO(weekTo) }}` when no selectedDate.
  - When `selectedDate` is set, pass `params` for that single date range.
  - Provide `hasSessionForDate` to WeekBar by querying sessions for the week (or use `useSessions` with week range and derive per-day presence).
  - When opening `NewSessionModal`, pass `initialDate={selectedDate ?? clickedDay}`.
  - Update `handleCreateSession` to accept optional `dateMs` and use that for session.date / instantiate overrides.

## Data & DB considerations

- No DB schema changes required: sessions already have `date` field and hooks accept dates. The change is only in UI and NewSessionModal props.
- Performance: fetch sessions for displayed week once and derive day-level existence from that array (avoid per-day queries).

## Accessibility

- Day buttons must be keyboard and screen reader friendly (role button, aria-pressed, aria-label like "Monday, Feb 9, 2026 — 1 session" or "no sessions").
- Ensure color contrast for selected state and dot indicators.

## Acceptance criteria

- Default shows current week (Mon–Sun) and `SessionList` shows sessions for those dates.
- Left navigation moves to previous weeks only.
- Days with any session show a dot.
- Clicking a day toggles per-day filter; `SessionList` updates accordingly.
- Clicking a day opens `NewSessionModal` prefilled with that date.
- New session created from the modal uses the selected date.
- PRD and plan docs updated to describe feature + acceptance tests.

## Files & minimal code pointers (where to edit)

- `src/pages/SessionsPage.tsx` — add WeekBar import, new state, pass params to `SessionList`, and pass `initialDate` to `NewSessionModal`.
- `src/components/sessions/NewSessionModal.tsx` — add `initialDate` prop and date picker input; update `onCreate` call signature accordingly.
- `src/components/sessions/WeekBar.tsx` — new component. Keep it small and dependency-free (no external date-picker lib). Use simple CSS/Tailwind.
- `src/lib/date/week.ts` — add helpers used by page and WeekBar.
- `.ai/prd.md` — add short section describing feature and acceptance tests.

## Risks & testing

- Timezone handling: store dates as timestamps (ms). For date-only filtering, compute day start/end in local timezone for from/to bounds.
- Query correctness: use `useSessions` with numeric dateRange bounds (SessionList expects ISO strings but converts via Date.parse — maintain string format like new Date(ms).toISOString()).
- Tests: manual QA on timezone edge cases (midnight), keyboard navigation, month boundary weeks.
