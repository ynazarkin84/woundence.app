---
name: react-day-picker v9 API
description: Class names and component API changed substantially from v8 to v9; old shadcn calendar templates break.
---

## Rule
react-day-picker v9 has a renamed API. Shadcn calendar components written for v8 will produce TypeScript errors.

**Why:** The project pins `react-day-picker: ^9.11.1`. v8 templates from shadcn use `IconLeft`/`IconRight` components and class names like `caption`, `nav_button_previous`, `head_row`, `head_cell`, `cell`, `day` which no longer exist or have different semantics in v9.

**How to apply — v9 class name replacements:**
- `caption` → `month_caption`
- `nav_button_previous` → `button_previous`
- `nav_button_next` → `button_next`
- `table` → `month_grid`
- `head_row` → `weekdays`
- `head_cell` → `weekday`
- `row` → `week`
- `day` (outer cell wrapper) → `day` (still used but semantics differ)
- `day_range_end` → `range_end`, `day_selected` → `selected`, `day_today` → `today`, `day_outside` → `outside`, `day_disabled` → `disabled`, `day_range_middle` → `range_middle`, `day_hidden` → `hidden`

**How to apply — v9 component replacement:**
Replace `IconLeft` / `IconRight` custom components with a single `Chevron` component:
```tsx
components={{
  Chevron: ({ orientation, ...rest }) =>
    orientation === "left" ? (
      <ChevronLeft className="h-4 w-4" {...rest} />
    ) : (
      <ChevronRight className="h-4 w-4" {...rest} />
    ),
}}
```
