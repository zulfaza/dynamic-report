---
name: emil
description: Emil Kowalski's design engineering guides for web UI polish and motion. Use when building, reviewing, auditing, removing, or naming animations and transitions; staggering or sequencing elements; drag, swipe, sheet, or gesture interactions; janky or dropped-frame animations; Apple-style springs and materials; mobile web fixes (100vh, tap highlight, input zoom, safe areas); Sonner toasts; stress-testing UI with worst-case data; picking a frontend library; prototyping UI variants; turning design corrections into rules; or writing modern Swift.
---

# Emil Kowalski skills

This skill bundles the guides from `emilkowalski/skills` into one entry. Each guide is in `<topic>/GUIDE.md`. Read only the guide that matches the task. A guide can link to files in its folder (for example `RECIPES.md`). Read those as the guide tells you.

When a guide names another skill (for example "use review-animations"), read `<that-name>/GUIDE.md` in this folder. `animate-expo` is not installed. Ignore references to it.

## Guides

| Task | Guide |
| --- | --- |
| Build a web animation or transition from scratch | [animate](animate/GUIDE.md) |
| Coordinate several elements that move together (stagger, sequence, morph) | [choreograph](choreograph/GUIDE.md) |
| Drag, swipe, fling, sheet, drawer, or hold gestures | [gestures](gestures/GUIDE.md) |
| Janky animation, frame drops, `will-change`, CSS vs JS cost | [animation-performance](animation-performance/GUIDE.md) |
| Find the name of a motion effect from a description | [animation-vocabulary](animation-vocabulary/GUIDE.md) |
| Find places that should animate (read-only proposals) | [find-animation-opportunities](find-animation-opportunities/GUIDE.md) |
| Remove animations the UI does not need | [remove-animations](remove-animations/GUIDE.md) |
| Audit all motion in the codebase and write fix plans | [improve-animations](improve-animations/GUIDE.md) |
| Apple-style fluid motion, springs, materials, typography | [apple-design](apple-design/GUIDE.md) |
| General UI polish and component design philosophy | [emil-design-eng](emil-design-eng/GUIDE.md) |
| Make a web app feel native on a phone | [mobile-native](mobile-native/GUIDE.md) |
| Sonner toast setup, API, and troubleshooting | [ask-sonner](ask-sonner/GUIDE.md) |
| Stress-test a component with worst-case data | [break-ui](break-ui/GUIDE.md) |
| Write, review, or migrate Swift | [write-swift](write-swift/GUIDE.md) |

## Explicit-only guides

Use these guides only when the user asks for them by name (for example `/emil review-animations`):

| Task | Guide |
| --- | --- |
| Review animation code against a high craft bar | [review-animations](review-animations/GUIDE.md) |
| Pick a frontend library for a task | [pick-ui-library](pick-ui-library/GUIDE.md) |
| Build many UI variants behind a live picker | [prototype](prototype/GUIDE.md) |
| Turn the user's design corrections into project rules | [learn-taste](learn-taste/GUIDE.md) |

## Arguments

If the user gives a guide name as the argument (`/emil <name> ...`), read that guide and follow it with the rest of the argument as input.
