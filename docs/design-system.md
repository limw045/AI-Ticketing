# GT AI design system

The interface has one semantic system and two themes. UI color names describe a job, not a hue. Light and dark themes map the same roles to different values in `app/globals.css`; authenticated pages must not redefine their own palette.

## Color

| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| `--color-bg-canvas` | `#F8F7FA` | `#0B0F19` | Page background |
| `--color-bg-surface` | `#FFFFFF` | `#12131D` | Cards, sidebar, form surfaces |
| `--color-bg-elevated` | `#F3F0F6` | `#191B28` | Secondary panels and popovers |
| `--color-bg-hover` | `#ECE8F0` | `#222432` | Hovered neutral controls |
| `--color-text-primary` | `#18141D` | `#F5F4F7` | Headings and body |
| `--color-text-secondary` | `#625C68` | `#B6B1BE` | Supporting text |
| `--color-text-tertiary` | `#746E7B` | `#898390` | Metadata |
| `--color-border-default` | `#E5E1E8` | `#2A2C38` | Decorative separators |
| `--color-border-strong` | `#96909D` | `#6F7180` | Form and control boundaries |
| `--color-action-primary` | `#4F2D7F` | `#6B5CF4` | Primary CTA, current step |
| `--color-action-soft` | `#EFEAF4` | `#2B2750` | Selected navigation and subtle emphasis |
| `--color-focus` | `#7655A5` | `#A99CFF` | Keyboard focus |
| `--color-accent-lavender` | `#E6E6FA` | `#E6E6FA` | Decorative accent only |

Use `--brand`, `--surface`, `--muted` and other compatibility aliases only where an existing component has not yet been migrated; they resolve to the semantic roles above. Do not add a page-specific purple or neutral palette. The light primary on white is approximately 10.43:1 and the dark primary with white text is approximately 4.71:1. Lavender on white is only approximately 1.23:1, so it must not carry text, focus, status, or a control boundary. Important control boundaries use the strong border role. [WCAG contrast guidance](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum)

Status colors are separate from brand: info blue, success green, warning amber, danger red, neutral gray. Always show a status label alongside its color; a colored dot alone is insufficient. [WCAG use-of-color guidance](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color)

The illustration palette has its own `--illustration-*` tokens. The shared illustration canvas is `#F4F1FC` in light mode and `#1A2035` in dark mode. Illustration navy and graphite are artwork colors, not UI card colors. The dark artwork blends into that one canvas so the supplied images do not create seams.

## Typography

Geist is the single UI family. GT Walsheim would require a licensed font asset, which this repository does not contain. UI metadata uses tabular numerals when alignment matters; code and logs may use monospace only for actual machine-readable content. The supported weights are 400, 500, 600 and 700.

| Role | Size / line height | Weight |
| --- | --- | --- |
| Marketing display | 56 / 60–64 px | 700 |
| Marketing H1 | 44 / 52 px | 700 |
| Marketing H2 | 32 / 40 px | 600 |
| Marketing H3 | 24 / 32 px | 600 |
| Product page title | 28–32 / 36–40 px | 700 |
| Product section | 20–24 / 28–32 px | 600 |
| Card title | 16 / 24 px | 600 |
| Reading body | 16 / 24 px | 400 |
| Dense UI body | 14 / 20 px | 400 |
| Label / button | 14 / 20 px | 500 / 600 |
| Metadata | 12–13 / 16–18 px | 400 / 500 |

Body letter spacing is normal, heading tracking is `--tracking-heading` (`-0.025em`), and uppercase eyebrows use `--tracking-eyebrow` (`0.06em`). Reserve eyebrow styling for section labels, not every card or marketing sentence.

## Layout, shape and motion

Spacing follows 4, 8, 12, 16, 24, 32, 48 and 64 px via `--space-*` tokens. Radius roles are 8 px for small controls, 12 px for inputs, 16 px for cards and 24 px for large panels. Use `--motion-fast`, `--motion-quiet` and `--motion-slow` for transitions. Motion should explain a state change, remain subtle, and stop for `prefers-reduced-motion`.

Lucide is the UI icon family. Use approximately 16 px with text controls, 20 px for stand-alone actions and 24 px in empty states. Icons that communicate a state need a text label or accessible name.

## Component rules

- Buttons: purple is reserved for the primary action; secondary and destructive actions use neutral and semantic roles respectively. Use `--button-primary-*` and the shared `Button` component.
- Inputs: use the strong border role and visible `--color-focus` ring; labels are at least 14 px. Use shared `Input`, `Select`, `Textarea` and `FieldLabel` where possible.
- Status badges: map ticket state and priority to semantic colors and always render text. `In progress` is information, not brand.
- Navigation: use a soft purple selection surface plus text, not purple on every icon. The same grouping and state rules apply to desktop and mobile.
- Tables and ticket cards: keep the surface neutral. Use 13–14 px for dense data, and 16 / 24 px for descriptions, conversations and knowledge articles.
- Modal, toast, conversation and knowledge surfaces: follow the same canvas → surface → elevated → hover ladder. Feedback tones are semantic and must include words.

The public homepage keeps its Hero → request → track → knowledge narrative. Its section labels are limited to the product role, How it works and Knowledge. Authentication pages give roughly 65% of desktop width to the task and 35% to static supporting artwork; mobile hides the artwork. Light and dark use different supplied illustrations but the same content and layout.

PDF exports and authentication emails keep the Grant Thornton name and logo treatment. Their action color is the light functional purple; email uses a broadly supported sans-serif fallback because mail clients cannot reliably load the web font. Email-template deployment is separate from repository changes.
