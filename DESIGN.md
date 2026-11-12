---
name: Dynamic Report
status: working design system
components: shadcn/ui (base-sera, Base UI) in packages/ui
mascot: original flat illustrated sloth
---

# Dynamic Report design system

Dynamic Report keeps rows in collections with typed properties, and shows them on dashboards of stat, chart and table panels. The interface must feel capable, approachable and calm. Data stays legible. The sloth gives character, but it does not distract from the work.

This system comes from dGrape, an earlier project with the same sloth. The design history and mascot prompts are in [docs/design](docs/design/README.md). Use the sloth head in `apps/web/public/favicon.svg` for the browser icon and small brand marks.

## Foundations

All values are semantic CSS variables in `packages/ui/src/styles/globals.css`. Radius roles are in `packages/ui/src/styles/geometry.css`. When a token changes, change this document in the same commit.

| Role             | Light   | Dark             | Purpose                                    |
| ---------------- | ------- | ---------------- | ------------------------------------------ |
| Background       | #F5F7F5 | #1E1F21          | Quiet canvas of the page                   |
| Secondary, muted | #EEF1EE | #2D2E31          | Quiet groups and control states            |
| Foreground       | #24332B | #E9EAEC          | Main text and headings                     |
| Card, popover    | #FFFFFF | #252628, #2D2E31 | Surfaces that have a clear content purpose |
| Primary          | #315847 | #8CC9A7          | One main action in each group              |
| Accent           | #E6BD5B | #284435          | Small selection or bookmark mark           |
| Muted foreground | #59665D | #B5B8BE          | Secondary text, with readable contrast     |
| Border           | #C3CBC5 | #44464A          | Edges of data and controls                 |
| Sidebar          | #315847 | #232427          | Forest frame around the page               |
| Sidebar accent   | #3E6655 | #284435          | Hover and current row in the sidebar       |
| Sidebar primary  | #E6BD5B | #8CC9A7          | Bookmark on the current sidebar row        |

Status tokens: `success`, `warning` and `destructive`, each with a `-surface` pair. `mascot-surface` is the pale yellow behind a sloth note.

Data tones (`--tone-gray` to `--tone-pink`) color select options. An option keeps its tone in each view: table chips, chart series, pie slices and bars. Charts read the same values from `apps/web/src/features/viz/tones.ts`. Keep the two lists the same.

Dark mode uses neutral charcoal surfaces. Green is only for actions and selection. Do not tint the canvas and each panel green. Do not invert a full page. Each text pair must reach WCAG AA for its size. Do not use yellow as text on white.

### Type

IBM Plex Sans for all text: headings, navigation, prose and data. Use 400 for body, 500 for controls, 600 for headings. Size and weight make the hierarchy, not a second family. `font-display` and `font-heading` are the same family; they stay as names for big figures and titles. Use JetBrains Mono only for code, IDs and technical values. Use `tabular-nums` for numbers in tables and stats. Body text is 14 to 16px.

### Space, radius and elevation

Spacing uses a 4px base: 8, 12, 16, 24, 32 and 48px. Use `gap` before stacked margins.

| Role    | Value | Used by                                         |
| ------- | ----- | ----------------------------------------------- |
| Small   | 4px   | Checkbox, menu item, tooltip, icon action       |
| Control | 6px   | Button, input, select trigger, sidebar row      |
| Panel   | 8px   | Dialog, popover, menu, sheet, toast, page inset |
| Note    | 12px  | Contextual sloth note                           |

Equal components use the same role, also in portals. Use full pills only for small status chips. Borders and space define surfaces. Buttons, inputs and cards are flat. Only floating layers (dialog, popover, menu, toast) get a small shadow. Do not put the same card frame around each block.

## Component recipes

- **Actions.** One primary action in each group. Other actions are secondary, outline or ghost. A destructive action says what it removes. Disabled and busy buttons keep a readable name. Icon-only controls have an accessible label.
- **Navigation.** The sidebar is the forest frame. It lists Dashboards, then Collections, then small actions, then the user menu in the footer. The current row is a lighter green row with a yellow bookmark on its left edge. Yellow marks only the current location. Hover uses the same lighter green. On small screens the sidebar opens as a sheet.
- **Forms.** Use the shadcn `Field` composition with visible labels, short help and inline errors (`aria-invalid`). A placeholder is not a label.
- **Tables.** Use semantic tables with stable alignment, visible units and horizontal scroll. Do not abbreviate a status or an amount. When a long value is cut, its full text stays available.
- **Dashboards.** A panel shows its data and its query. Each chart has labelled tooltips on hover and keyboard focus. Give a table or text alternative to marks.
- **Feedback.** Loading, empty, error and done are different states. Each error has a recovery action.
- **Toasts.** Use the shared shadcn Sonner `Toaster` (mounted once in `__root.tsx`). Up to four toasts show in a stack, which expands on hover or Alt+T. One toast for each completed action. Do not repeat the same result in a banner or a line under the button. Errors that need a fix stay where the fix happens.
- **Overlays.** Real triggers, a title, a close control, correct focus return, and the theme in portaled content.

Use the built-in shadcn variants first. Change semantic tokens for a theme, not each instance. Read the installed component code before you use it: this project uses Base UI (`render` prop, not `asChild`).

## Mascot

The sloth is flat: warm brown shapes, a pale face, clear dark eye patches, simple dark outlines and few props in forest green and yellow. No fur, gloss, 3D, pouch or jewelry. The model reference is `docs/design/assets/mascot-reference.png`.

Poses are transparent 512×512 PNGs in `apps/web/public/brand/mascot`. Show them with the `Mascot` component (`apps/web/src/components/mascot.tsx`). They are decorative: the text near them carries the meaning.

| Pose      | Use                                  |
| --------- | ------------------------------------ |
| wave      | Home page, first visit               |
| chart     | Empty dashboard: add the first panel |
| laptop    | Connect an agent (MCP setup)         |
| celebrate | Rare completion moments              |
| thinking  | Not found, nothing matches           |

Use the sloth in welcome, empty and not-found states, and in rare completion moments. It does not replace a status label, show progress, cover data or celebrate a failure. It does not move in the workspace. To add a pose, generate it from the model reference and record the prompt in `docs/design/assets/mascot-library.md`.

## Do and do not

- Do keep the data workspace quiet. Do not put a sloth in each card or panel.
- Do show true timestamps and labels for sample data. Do not imply that sample data is live.
- Do give status colors a text label. Do not show meaning with color, motion or a sloth face alone.
- Do reuse tokens, variants and controls. Do not copy hex values or radii into a screen.
- Do not restore the old blue palette, a lavender welcome banner, or a condensed display font.

## Verification

Check keyboard use, focus order, dialog close and focus return, contrast in both themes, form errors, long values, empty, error and loading states, mobile overflow and reduced motion. Check radii in portaled content: dialog 8px, inputs and buttons 6px.

Known gaps: the app has no theme switch yet, so dark mode tokens apply only when the `dark` class is set on `<html>`.
