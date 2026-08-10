# Homepage Automation Positioning Design

## Goal

Reposition the public homepage as the internal entry point for reporting, tracing,
and resolving issues from Grant Thornton automation tools. The page should speak
to internal staff, while making automated ticket creation and end-to-end case
traceability the primary differentiator.

## Brand Mark

- Replace the existing cropped horizontal logo artwork with the supplied purple
  square mark.
- Apply the replacement through the shared `BrandMark` component so the homepage,
  authentication pages, workspace sidebar, and mobile header remain consistent.
- Keep the existing `Grant Thornton / AI Department` lockup text, dimensions,
  spacing, semantic colors, and responsive behavior.
- Store the supplied artwork as a tracked local asset under `public/brand/`; do
  not use a temporary path or external URL at runtime.

## Homepage Copy

### Badge

> Grant Thornton · Internal Automation Operations

### Headline

> One place to report, trace, and resolve automation issues.

### Description

> Built for teams that rely on Grant Thornton’s internal automations. Automated
> services can raise structured tickets with logs and runtime context, while staff
> can report blockers directly. Every case stays traceable from the first signal
> to resolution.

### Calls to Action

- Header secondary action: `Sign in`
- Header primary action: `Create account`
- Hero primary action: `Open ticketing workspace`
- Hero secondary action: `Create staff account`

### Feature Messages

1. **Automation-ready intake**
   - Internal tools can create tickets automatically with source details, logs,
     and execution context already attached.
2. **Trace every case**
   - Track ownership, status, comments, subtasks, and audit history from the first
     alert through final resolution.
3. **Resolve recurring issues faster**
   - Turn resolved cases into searchable internal knowledge so repeated failures
     are easier to diagnose and prevent.

## Visual and Interaction Constraints

- Preserve the current homepage structure, typography, spacing, surfaces, icons,
  responsive breakpoints, light/dark themes, and purple semantic palette.
- Do not add sections, animations, dependencies, remote assets, or a new visual
  system.
- Keep the existing login and registration destinations unchanged.
- Keep the footer content and navigation unchanged.

## Validation

- Confirm the new mark renders without the old crop offsets at every shared
  `BrandMark` location and remains legible in both themes.
- Confirm all approved copy appears exactly once on the homepage and all CTA links
  still point to `/login` or `/register` as specified.
- Run lint, TypeScript checks, unit tests, and the Next.js production build.
- Check desktop and mobile layouts for wrapping or overflow regressions.
