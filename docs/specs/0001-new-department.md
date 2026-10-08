# 0001 · New department Social Media and Digital Marketing Management

**Status**: Proposed
**Date**: 2026-10-08

## Summary

Add a new department `dept-social-media-management` named "Social Media and Digital Marketing Management". It sits alongside the existing `dept-digital-marketing` ("Digital Marketing"), which stays untouched. Department only; teams and people come later.

## Requirements

- People tab add-employee form lists "Social Media and Digital Marketing Management" in the department dropdown.
- The existing "Digital Marketing" entry keeps working unchanged.
- Fresh installs, memory store, and already-provisioned MySQL databases all show the new entry.
- No change to teams, leave approval, manager scope, payroll, or org chart logic.

## Decision

Add as a separate department row with its own id, same pattern as migration 011. A rename is rejected: the engineer wants both entries to exist. A parent/child column is rejected for this slice: it would touch schema, validation, scope checks, and payroll grouping for no current need. With no team yet, first hires report to the top of the org via the existing "no team" sentinel.

## Build plan

1. `backend/src/store/seedData.js`: append the new row to DEPARTMENTS.
2. New `backend/sql/017_social_media_management_department.sql`: `INSERT IGNORE` for the new row.
3. `backend/src/db/migrate.js`: apply 017 once via `schema_migrations`, same pattern as 011-016.

## Consequences

- Memory store picks it up on API restart. MySQL picks it up on next boot/migrate.
- `INSERT IGNORE` keyed on the primary key keeps the migration a no-op if the row already exists.

## Follow-up

- Add child teams under this department when hiring starts.

## Rationale

Smallest safe slice: one additive row, no existing data touched, zero logic changed. See scope `docs/scope/scope.md` feature 1.
