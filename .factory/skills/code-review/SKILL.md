---
name: code-review
description: Review code changes for the Spiral codebase following project conventions
---

# Code Review Skill

Review TypeScript/React code changes for the Spiral writing assistant.

## Checklist

1. **TypeScript**
   - No `any` types without explicit eslint-disable comment
   - Strict mode compliance
   - Proper type definitions for props and state

2. **React Patterns**
   - Client components have `"use client"` directive
   - Hooks follow rules of hooks
   - No unnecessary re-renders

3. **Naming Conventions**
   - Components: PascalCase
   - Functions/variables: camelCase
   - Constants: UPPER_SNAKE_CASE
   - Files: kebab-case

4. **Styling**
   - Use Tailwind CSS classes
   - Dark theme colors (#1a1a1a background, orange-500 accent)
   - Responsive design with mobile-first approach

5. **Convex**
   - Schema changes are backward compatible
   - Mutations have proper validation
   - Queries are optimized with indexes

## Review Output Format

```markdown
## Summary
Brief overview of changes

## Issues Found
- [ ] Issue 1
- [ ] Issue 2

## Suggestions
- Suggestion 1
- Suggestion 2

## Approval
✅ Approved / ❌ Changes Requested
```
