# MediChain Clinical Design System

> Visual standards, design tokens, and reusable component guidelines for MediChain.

---

## 1. Brand Philosophy & Clinical Credibility

MediChain is designed for deployment in healthcare facilities, clinical laboratories, hospital departments, and identity verification portals. Unlike consumer apps, the interface must prioritize:

- **Restraint and Authority:** Dominated by clinical navy (`#0F2B3C`) and sterile white surfaces, projecting security and professional precision.
- **Data Density & Legibility:** Clean tabular structures, high-contrast monospace identifiers for SHA-256 hashes and patient codes, and explicit visual hierarchy.
- **Predictable State Feedback:** Explicit visual feedback for all interaction lifecycle stages—hover, active, focus-visible, disabled, loading, empty, and validation errors.
- **Zero Decorative Fluff:** No emoji icons, excessive gradients, oversized novelty typography, or disruptive animations.

---

## 2. Centralized Design Tokens

Design tokens are defined programmatically in [`apps/web/src/design-system/tokens.ts`](file:///c:/Users/anand/OneDrive/Desktop/MediChain/apps/web/src/design-system/tokens.ts) and configured in [`apps/web/tailwind.config.js`](file:///c:/Users/anand/OneDrive/Desktop/MediChain/apps/web/tailwind.config.js).

### 2.1 Color Palette

| Token         | Hex       | Role                                                   | Contrast Ratio        |
| ------------- | --------- | ------------------------------------------------------ | --------------------- |
| `navy-900`    | `#0F2B3C` | Primary headers, structural chrome, key action buttons | 14.2:1 on white (AAA) |
| `navy-800`    | `#1B445C` | Hover state for primary actions                        | 10.5:1 on white (AAA) |
| `navy-100`    | `#E1ECF4` | Muted navy accent backgrounds                          | 12.1:1 with navy-900  |
| `medical-700` | `#0254A2` | Interactive links and focus rings                      | 7.4:1 on white (AAA)  |
| `medical-50`  | `#F0F7FF` | Info alert and active card tint                        | Accessible background |
| `slate-50`    | `#F8FAFC` | Primary application canvas background                  | Neutral hospital grey |
| `white`       | `#FFFFFF` | Card and modal surface container                       | Clinical crispness    |
| `slate-200`   | `#E2E8F0` | Structural borders, card boundaries, table dividers    | Subtle 1px separation |

### 2.2 Status Color Indicators

Each status color uses a triple-token system (light background, defined border, and high-contrast dark foreground text) to ensure legibility and compliance:

- **Verified / Success:**
  - Background: `#F0FDF4`
  - Border: `#BBF7D0`
  - Text: `#166534` (Contrast > 7:1)
  - Solid: `#16A34A`
- **Pending Review / Warning:**
  - Background: `#FFFBEB`
  - Border: `#FDE68A`
  - Text: `#92400E` (Contrast > 7:1)
  - Solid: `#D97706`
- **Revoked / Error:**
  - Background: `#FEF2F2`
  - Border: `#FECACA`
  - Text: `#991B1B` (Contrast > 7:1)
  - Solid: `#DC2626`
- **Informational:**
  - Background: `#F0F9FF`
  - Border: `#BAE6FD`
  - Text: `#075985` (Contrast > 7:1)
  - Solid: `#0284C7`

### 2.3 Typography Scale

Base font: **Inter** with fallback to standard clinical sans-serif (`-apple-system`, `Segoe UI`, `Roboto`). Monospace: **JetBrains Mono** for hashes, tokens, and patient identifiers.

- `text-xs` (12px / 16px line-height): Badges, table headers, form hints, helper text.
- `text-sm` (14px / 20px line-height): Body copy, table cells, form inputs, button labels.
- `text-base` (16px / 24px line-height): Card titles, dialog titles, primary headings.
- `text-lg` (18px / 28px line-height): Section headers.
- `text-xl` to `text-2xl` (20px-24px): Application page titles.

---

## 3. Component Architecture

All components live in [`apps/web/src/components/ui/`](file:///c:/Users/anand/OneDrive/Desktop/MediChain/apps/web/src/components/ui/) and are exported through a unified barrel index.

### 3.1 Button (`Button.tsx`)

- **Variants:** `primary` (navy), `secondary` (outlined slate), `ghost` (minimal), `danger` (red), `link` (underlined medical text).
- **Sizes:** `sm` (32px height), `md` (36px height), `lg` (44px height).
- **Features:** High-contrast focus outline, `isLoading` with spinning indicator and `aria-busy="true"`, `leftIcon`, `rightIcon`.

### 3.2 Form Controls (`FormField.tsx`, `Input.tsx`, `Select.tsx`, `Checkbox.tsx`)

- Form inputs automatically associate labels using `htmlFor`.
- Error messages display with `role="alert"` and connect to inputs via `aria-describedby`.
- Inputs expose `isInvalid` boolean triggering high-contrast red borders (`border-red-400 focus-visible:ring-red-500`).

### 3.3 Status Badge (`Badge.tsx`)

- Supports `verified`, `pending`, `revoked`, `info`, and `neutral` statuses.
- Supports `subtle` (hospital standard), `outline`, and `solid` variants.
- Includes accessible status dot indicator.

### 3.4 Card & Table (`Card.tsx`, `Table.tsx`)

- **Card:** Clean clinical white surface, subtle 1px border (`border-slate-200/90`), subtle shadow, optional header/footer dividers.
- **Table:** Accessible `<table>` with sticky-friendly uppercase headers, row hover states (`hover:bg-slate-50/80`), responsive overflow scroll container (`TableContainer`).

### 3.5 Dialog & Confirmation (`Modal.tsx`, `ConfirmDialog.tsx`)

- Accessible modal dialog utilizing `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and `aria-describedby`.
- Traps and restores focus upon open/close.
- Dismisses via native `Escape` key and backdrop click.
- Locks page background scroll while active.

### 3.6 Notifications (`Alert.tsx`, `Toast.tsx`)

- **Inline Alert:** Contextual banner with semantic icons (`Info`, `CheckCircle2`, `AlertTriangle`, `AlertOctagon`).
- **Toast System:** Accessible floating notifications via `ToastProvider` and `useToast()` hook with auto-dismiss timers and dismiss buttons.

### 3.7 Loading & Empty States (`Skeleton.tsx`, `EmptyState.tsx`)

- **Skeleton:** Low-motion pulse placeholders (`SkeletonTableRow` for table placeholders).
- **EmptyState:** Clean dashed clinical placeholder with icon, title, description, and action button.

---

## 4. Accessibility Verification Checklist

- [x] **WCAG AA / AAA Contrast:** All text tokens exceed 4.5:1 (normal) and 7:1 (headings/badges).
- [x] **Keyboard Navigation:** Every interactive element has an explicit `focus-visible:ring-2 focus-visible:ring-medical-600` outline.
- [x] **Modal Focus Trap:** Focus is moved into dialog on mount, kept within dialog, and restored to trigger on dismiss.
- [x] **Escape Key Support:** All overlays and modals dismiss on `Escape`.
- [x] **Screen Reader Semantics:** Inputs use `aria-invalid`, `aria-describedby`, and error alerts use `role="alert"`.
