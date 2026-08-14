---
id: epic-4-flexibility-systems
title: Epic 4 — Flexibility Systems (config, fields, permissions, delegation, extensions)
status: implemented
createdAt: 2026-08-14
specIds:
  - CAP-7
  - CAP-8
requirementIds:
  - FR-1.2
  - FR-4.5
  - FR-6.1
  - FR-6.2
  - FR-6.3
  - FR-6.5
  - FR-7.1
  - FR-7.2
---

# Proposal

The flexibility spine: one validated session config object (rules/fields/perms/
extensions), a centralized permission engine (session → role → system), fields
as config (cards/search/CSV), bounded delegation (leader group size), and a
registry-based extension framework. Flexibility is configuration, never code paths.

Delivered across 4-1 … 4-5 (fields 4-2 and engine 4-3 landed inside 4-1/E2/E3
work), 20 new Pest tests, gates green (81 total, 316 assertions).

# Requirements

## REQ-4.1 Session config object
One validated structure; single resolver; config-only schema evolution.

Status: implemented — story `4-1-session-config`

## REQ-4.2 Fields system
Config-driven fields on create form, cards, search, CSV — no migrations.

Status: implemented — story `4-2-fields-system` (2-2/2-3/3-5)

## REQ-4.3 Permission engine
can?(action, role) resolution order; allowed-action set for the UI.

Status: implemented — story `4-3-permission-engine` (4-1 slice)

## REQ-4.4 Delegation toggles
Bounded leader powers: group size within session limits; fill fields; overrides win.

Status: implemented — story `4-4-delegation-toggles`

## REQ-4.5 Extensions framework
Registry + validation; enablement config-only; zero modules on night one.

Status: implemented — story `4-5-extensions-framework`

# Tasks

- [x] SessionConfig value object + cast + validation + update endpoint + event
- [x] PermissionService + RoleDefaults + allowedActions
- [x] groups.capacity + openSlots; delegation enforcement in GroupController
- [x] ExtensionRegistry + registry validation in config updates
- [x] 20 new Pest tests; gates green (81 total, 316 assertions)
