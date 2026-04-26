# Portfolio — AI Agent Context

The portfolio serves the root route (`/`) and is a server-rendered page driven by a Supabase `sections` table.

## Architecture: Server-Driven UI (SDUI)

Content and layout are defined entirely in Supabase — no redeployment needed to reorder sections or change copy.

**Flow**: `loader` (in `routes/home.tsx`) → fetches `sections` table → passes to page → maps each row through `registry.ts` → renders the matching component.

```
Supabase sections table
  └── loader() in routes/home.tsx
        └── getSection(type) from registry.ts
              └── <Hero | ExperienceList | ProjectList> with props blob
```

**Component registry** (`registry.ts`) maps the `type` column string to a React component. To add a new section type: create the component, add it to the registry, insert a row in Supabase.

## Supabase schema

**`sections`** table:
| Column | Type | Notes |
|--------|------|-------|
| id | int | Primary key |
| type | text | Maps to registry key (e.g. `"hero"`, `"experience_list"`) |
| props | jsonb | All content for the section, including `children` array |
| order | int | Sort order on the page |
| visible | boolean | Hidden sections are filtered out in the loader |

All content lives in `props.children` — there are no separate content tables. Image paths in `children` are resolved to signed Supabase Storage URLs by the loader before passing to components.

## Theming

Catppuccin Mocha palette. `class="mocha"` on `<html>` (set in `root.tsx`) activates CSS custom properties. All Tailwind colors use the `ctp-` prefix. `RippleBackground.tsx` imports RGB values directly from `@catppuccin/palette` for canvas rendering.

## Key files

| File                              | Role                                                 |
| --------------------------------- | ---------------------------------------------------- |
| `routes/home.tsx`                 | Loader + page component                              |
| `registry.ts`                     | Section type → component map                         |
| `types.ts`                        | `Section`, `SectionComponentProps`, `Action` types   |
| `components/Hero.tsx`             | Top section with bio + action buttons                |
| `components/ExperienceList.tsx`   | Timeline of jobs                                     |
| `components/ProjectList.tsx`      | Grid of project cards                                |
| `components/RippleBackground.tsx` | Animated canvas background (mouse-reactive wave sim) |
