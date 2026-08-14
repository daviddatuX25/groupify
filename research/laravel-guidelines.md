# Groupify — Stack Implementation Guidelines (verified 2026-08-15)

Source: librarian research against laravel/installer + starter-kit package sources,
laravel.com/docs/13.x, inertiajs.com/docs/v3, ui.shadcn.com, pestphp.com,
playwright.dev. This is the binding implementation guide for the dev loop.

## Versions (locked)

Laravel ^13.17 (PHP 8.3–8.5) · @inertiajs/react ^3 (3.6.1) · @inertiajs/vite ^3 ·
inertiajs/inertia-laravel ^3 · React ^19.2 · Vite ^8 · laravel-vite-plugin ^3.1 ·
Tailwind ^4 (@tailwindcss/vite ^4.1.11) · lucide-react ^0.475 · TypeScript ^5.7 ·
Pest ^4 (**PHP 8.4+**) · Pint ^1.27 · Reverb ^1.0 · laravel-echo/@laravel/echo-react 2.4.0

## Scaffold (E6S1)

```bash
composer global update laravel/installer
laravel new groupify --react --no-authentication --pest --database=sqlite --npm --no-git
```
- `--no-authentication` → `laravel/blank-react-starter-kit` (no Fortify/users pages — Groupify needs this).
- No `--inertia` flag exists; React/Inertia starter = `--react`.
- Pest is default; `--pest` explicit. **Pest 4 requires PHP 8.4+** — pin ≥8.4 in Docker.
- Blank kit does NOT pre-install shadcn/lucide — run `npx shadcn@latest init` (+ `add` per component).
- Kit ships: Wayfinder (typed routes, beta — gitignore `resources/js/{wayfinder,actions,routes}`,
  `route:clear` before build), React Compiler babel plugin, TS strict, `composer run dev` = `php artisan dev`
  (serve + queue:listen + Vite together), pint.json (preset laravel).

## Post-scaffold (in order)

```bash
npx shadcn@latest init          # new-york, neutral, lucide; theme to Kinetic brand in story 5-2
php artisan install:broadcasting --reverb   # one command: config, channels.php, Echo for React, VITE_REVERB_* env
php artisan queue:table && php artisan migrate   # database queue (skeleton default QUEUE_CONNECTION=database)
php artisan reverb:start        # WS server (0.0.0.0:8080); restart: reverb:restart
```

## Laravel 13 conventions (must-follow)

- Routes `routes/web.php`; channels `routes/channels.php` (registered via `withRouting`).
- **Attribute-based model config** preferred: `#[Table('x')]`, `#[Cast(...)]`, `#[Fillable([...])]`,
  `#[Hidden([...])]`, `#[WithoutIncrementing]`; controllers `#[Middleware]`/`#[Authorize]`; jobs
  `#[Tries]`/`#[Backoff]`/`#[Timeout]`. Classic `$fillable`/`$casts` still work.
- CSRF middleware renamed → **`PreventRequestForgery`** (origin-aware). No `VerifyCsrfToken` references.
- Session serialization defaults `json`; `Cache::touch()`; queue routing `Queue::route()`.
- `php artisan dev` (composer run dev) = local dev; inside Sail use `sail up` + `sail npm run dev` +
  `sail artisan queue:work` + `sail artisan reverb:start` (map 8080 in compose.yaml).

## Inertia 3 + React 19 (breaking vs v2)

- No Axios (built-in XHR), no `qs`/`lodash-es`; events: `invalid`→`httpException`, `exception`→`networkError`.
- `router.cancel()` → `router.cancelAll()`; `Inertia::lazy()` → `Inertia::optional()`.
- Optimistic updates built-in: `router.optimistic((props)=>...).post(url, data)` — auto-rollback on failure.
- Forms: new `<Form action method>` component + `useForm` (`data,setData,post,processing,errors,isDirty,wasSuccessful,reset...`).
- Errors: `Inertia::handleExceptionsUsing(fn (ExceptionResponse $r) => $r->render('ErrorPage',['status'=>$r->statusCode()])->withSharedData())` in AppServiceProvider::boot().
- SSR works in dev automatically via @inertiajs/vite; disable in tests: `INERTIA_SSR_ENABLED=false`.
- `.layout` must be an array for arrow-function layouts; `data-inertia` attr; ESM-only.

## Realtime (no users table — critical)

- Channels: Groupify has NO auth guard. Options verified:
  1. **Public channels** (`new Channel('session.'.$code)`) — zero auth; fine for grid/presence events. PREFERRED for night one.
  2. Token-guarded private channels: `Broadcast::resolveAuthenticatedUserUsing(fn (Request $r) => $tokenIdentity)`
     (new in 13) + custom Echo authorizer posting Bearer to `/broadcasting/auth`.
- Client: `configureEcho({ broadcaster: 'reverb' })` (auto-injected); listen via `useEcho(channel, event, cb)`.
- **Broadcast::fake()/assertBroadcastedTo are REMOVED in Laravel 13** — test broadcasts with
  `Event::fake()`/`Queue::fake()` + assert event dispatched, or BROADCAST_CONNECTION=log in tests.
- Broadcasts are queued jobs — queue worker MUST run (database driver; `queue:table` migration).

## SQLite

- Skeleton sets `journal_mode` null — **set WAL explicitly**: `'journal_mode' => 'wal'`,
  `'busy_timeout' => 5000`, `'synchronous' => 'normal'`, `transaction_mode` → `'IMMEDIATE'`
  (avoids SQLITE_BUSY once queue worker + Reverb share the file).

## Testing

- Pest 4 (`./vendor/bin/pest`, `php artisan test`); `--parallel`.
- Inertia: `->assertInertia(fn (Assert $page) => $page->component('X')->has('k', n, fn($p)=>...)->where('k','v'))`,
  `inertiaProps('dot.path')`, `assertInertiaFlash`.
- E2E: **Pest Browser Testing** (`pestphp/pest-plugin-browser` + Playwright) — official, current.
  Plain `@playwright/test` also fine. **hyvor/laravel-playwright is archived (2026-08-11) — do not use.**
- Lint/static: `./vendor/bin/pint` (fix) / `--test` (CI); `composer run test` = lint + phpstan + artisan test.

## Docker

- Use **Laravel Sail** (official; IS a compose.yaml — editable, no lock-in):
  `composer require laravel/sail --dev && php artisan sail:install` → `./vendor/bin/sail up`.
- PHP image must be ≥8.4 (Pest 4); map Reverb 8080; SQLite file mounted (or volume).

## Builder checklist (gotchas)

- Remove/replace starter `app/Models/User.php` + auth shared props — Groupify identity is device tokens (AD-3).
- `HandleInertiaRequests` shares `auth.user` by default — strip it; share session-scoped identity instead.
- Wayfinder generated dirs gitignored; `route:clear` before deploy builds.
- `resources/css/app.css`: `@import 'tailwindcss'; @source '../views'; @theme {...}` — theme Kinetic brand
  tokens there (dark-only, CSS-first — no tailwind.config.js).
- Laravel 13: `upsert()` throws on empty uniqueBy; polymorphic pivot names pluralized.
