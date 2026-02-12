---
description: React-specific guidelines for component files in your-nutri-mate.
globs:
  - "**/*.tsx"
alwaysApply: false
---

### Guidelines for React

- Use functional components with hooks instead of class components
- Split into smaller components when possible
- Use hooks for business logic, minimize business logic inside components
- Never use "use client" and other Next.js directives as we use React with Astro
- Extract logic into custom hooks in `src/hooks`
- Extract layout elements such us header, navbar, footer, wrapper and place them in `src/layouts`
- Extract pages and place them in `src/pages`
- Implement React.memo() for expensive components that render often with the same props
- Use the useCallback hook for event handlers passed to child components to prevent unnecessary re-renders
- Prefer useMemo for expensive calculations to avoid recomputation on every render
- Implement useId() for generating unique IDs for accessibility attributes
- Consider using the new useOptimistic hook for optimistic UI updates in forms
- Use useTransition for non-urgent state updates to keep the UI responsive
