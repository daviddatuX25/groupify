---
id: epic-6-deploy-ops
title: Epic 6 — Deploy & Ops (dev env, realtime envelope, Dokploy deploy, smoke)
status: in-progress
createdAt: 2026-08-14
specIds:
  - CAP-1
  - CAP-9
requirementIds:
  - FR-5.5
  - FR-8.1
  - FR-8.3
  - NFR-1
  - NFR-5
---

# Proposal

The operational envelope: one-box Docker dev environment (PHP 8.4 + Node 22 +
Composer, Laravel 13 + Inertia + Reverb + SQLite), the realtime queue path,
production deployment to Dokploy, and the end-to-end smoke.

REQ-6.1 (dev env) and REQ-6.2 (reverb/queue) implemented; REQ-6.3 (deploy)
BLOCKED on user's Dokploy credentials; REQ-6.4 (smoke) passed locally, full
20+ production run pending deploy.

# Requirements

## REQ-6.1 Docker dev environment
One command runs Laravel + Vite + Reverb + SQLite with hot reload; no host PHP needed.

Status: implemented — story `6-1-docker-dev` (in-progress record; AC3 deferred)

## REQ-6.2 Reverb + queue
Broadcasts flow through the database queue worker; env-driven driver swap.

Status: implemented — story `6-2-reverb-queue`

## REQ-6.3 Dokploy deploy
Live at groupify.dxtechph.online with SSL + WS proxy.

Status: blocked — awaits user's Dokploy credentials

## REQ-6.4 End-to-end smoke
SPEC success signal: 20+ join by QR/PIN, topic groups, CSV, ≤1s updates, offline drill.

Status: in-progress — local simulation passed (14 joins, CSV, 865ms); production run pending deploy

# Tasks

- [x] Dockerfile/compose/bootstrap/entrypoint (6-1)
- [x] Reverb + Echo + queue worker envelope (6-2)
- [ ] Dokploy deployment (6-3) — BLOCKED
- [~] Local e2e smoke (6-4) — passed locally; AC 5 drill + production pending
