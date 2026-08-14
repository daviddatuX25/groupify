---
id: epic-5-reliability-shell
title: Epic 5 — Reliability & UX Shell (status banner, Kinetic theme, roadmap, accessibility)
status: implemented
createdAt: 2026-08-14
specIds:
  - CAP-9
requirementIds:
  - FR-7.4
  - FR-8.1
  - FR-8.2
  - NFR-2
  - NFR-3
---

# Proposal

The visible-degradation and brand layer: /health heartbeat + server-status banner
(online/reconnecting/offline), the Kinetic dark design system applied as theme
tokens + fonts, the roadmap "Coming next" section, and accessibility passes
(reduced motion, non-color states).

Implemented across stories 5-1 … 5-4, commit `17d7f54` (base), browser-verified.

# Requirements

## REQ-5.1 Server-status UX
/health + WS-driven banner; never silently broken.

Status: implemented — story `5-1-server-status`

## REQ-5.2 Mobile shell (Kinetic theme)
Brand tokens + fonts per brand-context.md.

Status: implemented — story `5-2-mobile-shell`

## REQ-5.3 Coming-next section
Roadmap visible in the product.

Status: implemented — story `5-3-coming-next`

## REQ-5.4 Accessibility
Reduced motion honored; text-backed states.

Status: implemented — story `5-4-accessibility`

# Tasks

- [x] /health route + HealthTest
- [x] ServerStatus + ComingNext components; integration on both pages
- [x] @theme Kinetic tokens + fonts + global reduced-motion CSS
- [x] Flash reduced-motion guard
- [x] Gates green (82 tests, 318 assertions)
