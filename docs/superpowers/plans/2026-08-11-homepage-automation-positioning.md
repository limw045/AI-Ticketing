# Homepage Automation Positioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy cropped logo artwork and reposition the public homepage copy around internal automation ticketing and case traceability.

**Architecture:** Swap the shared `BrandMark` image asset, then replace the approved homepage copy in `app/page.tsx` and the site metadata in `app/layout.tsx`. No layout, component, or dependency changes.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4, React 19, TypeScript.

## Global Constraints

- Use the supplied 447x447 PNG as a tracked local asset at `public/brand/gt-automation-mark.png`; never reference the temporary clipboard path or any external URL at runtime.
- Keep the existing `BrandLockup` text (`Grant Thornton` / `AI Department`), dimensions, spacing, semantic colors, and responsive behavior.
- Do not add sections, animations, dependencies, remote assets, or a new visual system.
- Keep the existing login (`/login`) and register (`/register`) destinations and the footer unchanged.
- `docs/` and all `*.md` files are gitignored; use `git add -f` when committing this plan.
- All checks must run from the repository root with the project scripts: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.

---

### Task 1: Homepage Tests for Automation Positioning Copy

**Files:**
- Create: `tests/homepage-copy.test.ts`

**Interfaces:**
- Consumes: `app/page.tsx` source file only.
- Produces: A regression test asserting the approved homepage copy so later edits cannot silently revert the messaging.

- [ ] **Step 1: Write the failing test**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

describe("homepage automation positioning", () => {
  it("states the automation-first positioning", () => {
    expect(page).toContain("One place to report, trace, and resolve automation issues.");
    expect(page).toContain("Automation-ready intake");
    expect(page).toContain("Trace every case");
    expect(page).toContain("Resolve recurring issues faster");
  });

  it("keeps the internal entry-point CTAs", () => {
    expect(page).toContain("Open ticketing workspace");
    expect(page).toContain("Create staff account");
    expect(page).toContain("Create account");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/homepage-copy.test.ts`
Expected: FAIL because the current page contains the old headline and CTAs.

- [ ] **Step 3: Commit the failing test only**

```bash
git add tests/homepage-copy.test.ts
git commit -m "test(首页): 添加自动化定位文案回归测试"
```

---

### Task 2: Replace Brand Mark Asset and Component

**Files:**
- Create: `public/brand/gt-automation-mark.png`
- Modify: `components/ui/BrandLockup.tsx`

**Interfaces:**
- Consumes: The supplied `codex-clipboard-62c03702-910e-4c4e-b425-365f5ddc5d87.png` artwork (447x447).
- Produces: `BrandMark` renders the new square mark without the legacy crop offsets; all header/sidebar callers are unchanged.

- [ ] **Step 1: Copy the artwork into the project**

```powershell
Copy-Item -LiteralPath "C:\Users\limwj\AppData\Local\Temp\codex-clipboard-62c03702-910e-4c4e-b425-365f5ddc5d87.png" -Destination "F:\Works\Ticketing\public\brand\gt-automation-mark.png" -Force
```

- [ ] **Step 2: Update the shared mark**

```tsx
<Image
  src="/brand/gt-automation-mark.png"
  alt=""
  width={447}
  height={447}
  className="h-full w-full object-contain"
  priority
/>
```

- [ ] **Step 3: Verify the asset and component**

```powershell
Get-Item -LiteralPath 'F:\Works\Ticketing\public\brand\gt-automation-mark.png' | Select-Object Length
```

Expected: File exists; component references only the new path with square 447x447 dimensions and no legacy `-left-[34%]` crop class.

- [ ] **Step 4: Commit**

```bash
git add public/brand/gt-automation-mark.png components/ui/BrandLockup.tsx
git commit -m "feat(品牌): 用新自动化标志替换全站 Logo"
```

---

### Task 3: Rewrite Homepage Copy and Site Metadata

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: Approved copy from `docs/superpowers/specs/2026-08-10-homepage-automation-positioning-design.md`.
- Produces: The homepage exposes the new badge, headline, description, CTA labels, and three feature messages; `metadata.description` matches the automation positioning.

- [ ] **Step 1: Apply the approved copy to the homepage**

- Badge: `Grant Thornton · Internal Automation Operations`
- Headline: `One place to report, trace, and resolve automation issues.`
- Description: `Built for teams that rely on Grant Thornton's internal automations. Automated services can raise structured tickets with logs and runtime context, while staff can report blockers directly. Every case stays traceable from the first signal to resolution.` (render the apostrophe as `&apos;` in JSX)
- Header primary CTA: `Create account`
- Hero primary CTA: `Open ticketing workspace`
- Hero secondary CTA: `Create staff account`
- Feature 1 title: `Automation-ready intake` / body: `Internal tools can create tickets automatically with source details, logs, and execution context already attached.`
- Feature 2 title: `Trace every case` / body: `Track ownership, status, comments, subtasks, and audit history from the first alert through final resolution.`
- Feature 3 title: `Resolve recurring issues faster` / body: `Turn resolved cases into searchable internal knowledge so repeated failures are easier to diagnose and prevent.`

- [ ] **Step 2: Update site metadata**

```ts
description:
  "Internal ticketing and case tracking for Grant Thornton automations. Automated services report issues with logs and context, and every case stays traceable to resolution.",
```

- [ ] **Step 3: Run the new regression test**

Run: `npx vitest run tests/homepage-copy.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx app/layout.tsx tests/homepage-copy.test.ts
git commit -m "feat(首页): 改为内部自动化 ticketing 定位文案"
```

---

### Task 4: Full Verification and Release

**Files:**
- Modify: none

**Interfaces:**
- Consumes: All tasks above.

- [ ] **Step 1: Run the full quality gates sequentially**

Run: `npm test`, then `npm run lint`, then `npm run typecheck`, then `npm run build`
Expected: all pass.

- [ ] **Step 2: Confirm asset references and old copy are gone**

```powershell
rg -n "gt-logo|support desk|Start today|Structured requests|Tracked case path|Answers first" app components public tests
```

Expected: no matches in tracked source besides this plan; the old mark is unused.

- [ ] **Step 3: Push and deploy**

```bash
git push origin master
```

Expected: Vercel auto-deploys production; confirm the new deployment is Ready.
