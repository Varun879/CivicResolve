---
name: Civic Infrastructure System
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45474c'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#75777d'
  outline-variant: '#c5c6cd'
  surface-tint: '#545f73'
  primary: '#091426'
  on-primary: '#ffffff'
  primary-container: '#1e293b'
  on-primary-container: '#8590a6'
  inverse-primary: '#bcc7de'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#201100'
  on-tertiary: '#ffffff'
  tertiary-container: '#3c2300'
  on-tertiary-container: '#c88000'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e3fb'
  primary-fixed-dim: '#bcc7de'
  on-primary-fixed: '#111c2d'
  on-primary-fixed-variant: '#3c475a'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-max-width: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system is engineered for high-stakes civic environments, emphasizing authority, transparency, and unwavering reliability. The design narrative follows a **Modern Corporate** aesthetic with a lean toward **Institutional Minimalism**. Every interface element must serve a functional purpose, eliminating decorative flourishes in favor of information density and clarity. 

The target audience includes municipal employees, city planners, and the general public, requiring a balance between professional data-heavy tools and accessible public-facing portals. The emotional response should be one of "structured competence"—users must feel that the platform is as stable and dependable as the physical infrastructure it manages.

Key principles:
- **Clarity over Expression:** Content hierarchy is strictly enforced through scale and weight.
- **Institutional Weight:** Use of Deep Slate Blue to anchor the interface in a sense of official governance.
- **Functional Progress:** Emerald Green is reserved for resolutions, successful states, and "go" signals.

## Colors

The palette is strictly functional, adhering to high-contrast requirements for accessibility (WCAG 2.1 AA/AAA).

- **Primary (Deep Slate Blue):** Used for navigation, headers, and primary actions. It represents the "Voice of the City."
- **Secondary (Emerald Green):** Used for success states, completed tasks, and positive growth metrics.
- **Accent (Amber):** Specifically reserved for warnings, pending items, or status changes requiring attention. Use sparingly to maintain its signaling power.
- **Neutral (Slate/Gray Tones):** A range of grays from #F8FAFC (Background) to #475569 (Secondary Text) provides the structural scaffolding.
- **Status Colors:** Standardized Red (#EF4444) for alerts and Blue (#3B82F6) for neutral information.

## Typography

The typography system uses **Inter** exclusively to leverage its exceptional legibility on digital screens. 

- **Weight Usage:** Use `Bold (700)` for display, `SemiBold (600)` for headlines and labels, and `Regular (400)` for all body copy. 
- **Readability:** Maintain a line height of at least 1.5x for body text to ensure ease of reading for long-form reports.
- **Letter Spacing:** Apply slight negative tracking on large headlines to maintain a tight, professional appearance. Apply slight positive tracking on small labels for clarity.

## Layout & Spacing

The design system utilizes a **12-column fluid grid** for desktop and a **4-column fluid grid** for mobile.

- **Rhythm:** An 8px base grid governs all spatial relationships. Spacing should consistently use multiples of 8 (8, 16, 24, 32, 48, 64).
- **Density:** Dashboard environments may utilize a "Compact" mode (4px increments) for data-heavy views, while public portals use "Standard" (8px increments) for higher whitespace.
- **Alignment:** All elements must align to the grid. Vertical rhythm is maintained by a 24px baseline spacing for standard paragraphs and 32px for sections.

## Elevation & Depth

This design system uses a **Tonal Layering** and **Low-Contrast Outline** approach rather than heavy shadows, ensuring the UI feels integrated with the browser and accessible.

- **Level 0 (Base):** #F8FAFC. The foundation layer.
- **Level 1 (Cards/Surface):** White (#FFFFFF) with a 1px solid border (#E2E8F0). No shadow.
- **Level 2 (Hover/Active):** White (#FFFFFF) with a very subtle, diffused ambient shadow: `0 4px 6px -1px rgb(0 0 0 / 0.05)`.
- **Level 3 (Modals/Overlays):** White (#FFFFFF) with a structured shadow: `0 10px 15px -3px rgb(0 0 0 / 0.1)`.

Depth is primarily communicated through background color shifts (e.g., a gray sidebar vs. a white content area) rather than physical elevation.

## Shapes

The shape language is **Soft (0.25rem)**. This provides a modern, approachable feel while maintaining the rigid structure expected of a government platform. 

- **Small Components:** Checkboxes, tags, and small buttons use a 4px (0.25rem) radius.
- **Large Components:** Cards, modals, and containers use a 8px (0.5rem) radius.
- **Circular elements:** Only used for user avatars or specific icon-only floating action buttons.

## Components

### Buttons
- **Primary:** Deep Slate Blue background, White text. High contrast, solid fill.
- **Secondary:** White background, 1px border (#CBD5E1), Deep Slate Blue text.
- **Success:** Emerald Green background, White text. Reserved for final confirmations.

### Cards
Cards are white with a 1px #E2E8F0 border. Headers within cards should have a subtle bottom border to separate titles from body content. Use 24px internal padding.

### Data Tables
Tables are the core of the platform. Use a "Zebra" striping pattern (Base White / #F8FAFC). Headers must be #1E293B with white or light gray text, SemiBold. Cell borders should be horizontal-only to emphasize data rows.

### Status Badges
Badges use a "Tinted" style: a 10% opacity background of the semantic color with a 100% opacity text color (e.g., Amber text on a light Amber background). This ensures they are visible but do not compete with primary buttons.

### Input Fields
Inputs use a 1px #CBD5E1 border that transitions to #1E293B on focus. Labels must always be visible above the field (never use placeholder-only labels) to meet accessibility standards.