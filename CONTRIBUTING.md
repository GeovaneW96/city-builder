# Contributing

This project is currently in the early design and prototype phase.

## Principles

- Keep the scope small.
- Preserve the simulation/rendering boundary.
- Make behavior testable.
- Update documentation when rules change.
- Prefer data-driven configuration.
- Optimize for fun and clarity before realism.

## Working on a Feature

Before implementing a feature:

1. Find the related doc in `docs/`.
2. Create or update a feature spec using `docs/templates/FEATURE_SPEC_TEMPLATE.md`.
3. Implement only the agreed scope.
4. Add tests for simulation logic.
5. Update documentation if behavior changes.
6. Add notes to `CHANGELOG.md`.

## Commit Message Style

Use simple, descriptive commits:

```txt
Add grid hover interaction
Implement basic economy tick
Document residential demand formula
Fix road placement validation
```

## Code Review Checklist

- Is the change scoped?
- Is the simulation independent from rendering?
- Are magic numbers moved into data/config?
- Are tests included?
- Is the UI feedback clear?
- Are relevant docs updated?
