# Design direction

The rules for new screens are in [DESIGN.md](../../DESIGN.md). This folder keeps the history behind them: the references, the decisions, and the mascot sources.

The system comes from dGrape, an earlier project with the provisional name DFE. Dynamic Report keeps its palette, type, geometry, component recipes and sloth.

## References

The user approved these references. Resend is excluded. Do not copy their logos, mascots or exact colors.

| Reference | Lesson | Limit |
| --- | --- | --- |
| [Oyenza](https://oyenza.com/) | Explain features with familiar examples and a warm character | Adapt it to a data workspace |
| [GitHub](https://github.com/home) | Show the product through real workflows | An original sloth, no GitHub branding |
| [PostHog](https://posthog.com/) | Show many tools together and keep character | Keep navigation and data views calmer |
| [Duolingo](https://blog.duolingo.com/reshaping-duo/) | A clear silhouette that supports a set of expressions | No streaks or pressure |

The measured study is in [reference-study.md](reference-study.md).

## Decisions

These come from the dGrape decision records (ADR 0010, 0012, 0014, 0015 and 0016).

- **shadcn/ui is the component base.** Theme it with shared semantic tokens. The generated source belongs to the repo; read it before you use it.
- **Friendly, with a sloth.** Character goes in onboarding, empty states and completion moments. Data screens stay readable and fast. The sloth is flat and simple, and it never replaces status text.
- **The working set leads.** A white and cool gray base, a forest action color and a small yellow accent. IBM Plex Sans with clear size and weight roles. The first lavender theme with Manrope and Source Sans was rejected as generic.
- **Shared geometry, one feedback.** Radius by role (4, 6, 8, 12px) in all places, also portals. Neutral charcoal in dark mode. Borders before shadow. One toast for each completed action, not a banner and a line too.
- **Stacked Sonner toasts.** The shadcn Sonner recipe, up to four visible, expand on hover or Alt+T, with a close control.

## Mascot sources

- [assets/mascot-reference.png](assets/mascot-reference.png): the model sheet (front, side, back). Use it as the reference for new poses.
- [assets/sloth-simple-concept.png](assets/sloth-simple-concept.png): the first simple concept sheet (welcome, organizing, report).
- [assets/mascot-library.md](assets/mascot-library.md): the prompts for each pose.

The production poses are in `apps/web/public/brand/mascot`.
