# Story 6.3: Dokploy Deploy

Status: ready-for-dev

## Story

As an operator,
I want the app deployed to Dokploy at groupify.dxtechph.online with SSL and correctly proxied WebSocket upgrades,
so that the night-one success signal runs on a real public URL.

## Acceptance Criteria

1. GIVEN the Dokploy project WHEN the deployment config is applied THEN the app is configured to serve at groupify.dxtechph.online with an SSL certificate (Let's Encrypt via Dokploy).
2. GIVEN the Dokploy proxy WHEN Reverb WebSocket traffic arrives on the domain THEN upgrade requests are proxied correctly (upgrade headers, no buffering) so Echo connects.
3. GIVEN the deployed app WHEN the deploy config is verified THEN /health returns OK and the server-status UX reports online — this acceptance is deployment-config-level; applying to live requires the user's Dokploy credentials.

## Tasks / Subtasks

- [ ] Production container + Dokploy project (AC: 1)
  - [ ] Production Dockerfile (build assets; run app + queue worker + Reverb per AD-10)
  - [ ] Dokploy application configured for repo + branch with SQLite volume persistence
  - [ ] Domain groupify.dxtechph.online + Let's Encrypt SSL via Dokploy
- [ ] WebSocket proxy rules (AC: 2)
  - [ ] Expose the Reverb port and configure Dokploy/Nginx upgrade proxying (HTTP/1.1 upgrade headers, no buffering)
  - [ ] Verify an Echo handshake passes through the proxy on the deployed config
- [ ] Deploy verification plan (AC: 3)
  - [ ] Document exact verification steps: open URL, /health OK, join flow, offline-banner drill
  - [ ] Note the prerequisite: live deployment requires the user's Dokploy credentials — acceptance is config-level, not a live-deploy claim

## Dev Notes

- AD-10: Dokploy deploy at groupify.dxtechph.online; SQLite file DB; database queue + one worker; Reverb on the same box; broadcast driver from env. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-10]
- AD-11: /health must be reachable on the deployed box so the server-status UX works. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-11]
- NFR-5: single-box deploy (Dokploy), SQLite, one queue worker; no external paid services. [Source: docs/prds/prd-groupify/prd.md#NFR-5]
- CAP-9: a dead server is shown to every client within ~5s — the deployed box must expose /health and Reverb. [Source: docs/specs/spec-groupify/SPEC.md#CAP-9]
- Reverb is bundled with Laravel 13 (keep patched — CVE-2026-23524 class). [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#Stack]
- **Deploy prerequisite:** applying this to live Dokploy requires the user's credentials; acceptance is deployment-config-level, not a live-deploy claim.
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md#E6S3]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-10]
- [Source: docs/prds/prd-groupify/prd.md#NFR-5]

# Traceability

- FR: NFR-5 | CAP: CAP-9 | AD: AD-10, AD-11

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/6-3-dokploy-deploy.md
