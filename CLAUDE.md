# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Next.js web app plus a CLI, sharing code, that both bulk-import multiple-choice quiz questions into a Canvas LMS quiz via the Canvas REST API (`POST /courses/:course_id/quizzes/:quiz_id/questions`).

- **Web app** (`npm run dev` / `npm run build && npm start`): instructors log in via Canvas OAuth2, browse their courses/quizzes, upload a questions JSON file, review a validated preview table, select which questions to import (or "select all"), and import.
- **CLI** (`npm run cli -- <file.json>`): the original single-file tool, now with validation, a confirmation prompt, `--dry-run`, and colored output — still authenticates with a fixed Canvas personal access token from `.env`, unrelated to the web app's OAuth flow.

All application code lives under `src/`; root-level files are tooling config only (`package.json`, `next.config.mjs`, `jsconfig.json`, `.env*`).

The product/UI name is **CanvasTools** (the npm package is `canvas-tools`; the folder is still `tools/CanvasQuiz` — not renamed to avoid a disruptive path change). On `/courses`, `src/components/CourseBrowser.jsx` defaults to showing only favorited/starred Canvas courses (`is_favorite`, requested via `include[]=favorites` in `canvasClient.listCourses`), falling back to "Todos" only when the account has zero favorites — this is an intentional product default, not an oversight.

### Landing/cover page (`/`) — lives *inside* the dashboard, not before it

`src/app/(dashboard)/page.jsx` is the "capa" — the CanvasTools pitch plus a "what's built" vs. "future ideas" feature list — and it is a **protected dashboard page**, not a pre-login marketing page. `src/proxy.js`'s matcher includes the bare `'/'` (alongside `/courses/:path*` etc.) specifically so this page requires a valid session like every other dashboard route; an unauthenticated visit to `/` gets redirected to `/login` by the proxy before it ever renders. This means, post-login, `/` is reached three ways: clicking the sidebar logo (`Sidebar.jsx`'s `<Link href="/">`, not `/courses`), `/login`'s own already-authenticated redirect (now targets `/` instead of `/courses`), or typing the URL directly — in every case sidebar/topbar stay visible around it because it's a normal child of `(dashboard)/layout.jsx`. There is no more logic in `page.jsx` itself deciding where to send the user; that decision now lives entirely in the proxy + `/login`.

`/login` (outside the dashboard group, unauthenticated-reachable) intentionally shows **only** the existing Canvas-login card plus a `WebTechFooter` — no pitch, no feature list. That split — marketing content gated behind login, bare login+attribution before it — is the point of this whole structure; don't move the feature list back to a pre-auth page.

`src/components/WebTechFooter.jsx` is shared between `/login` and `(dashboard)/page.jsx` — one component, one place to update the WebTech copy/logo. `src/assets/images/webtech-logo.png` was downloaded from `https://webtech.network/logo.png` (WebTech's own official site) — like `logo.png`, it's a light/white-stroke mark on a transparent background, so it only reads against a dark backdrop; `.webtech-footer` in `globals.css` is a dark card (`--sidebar-bg`/`--sidebar-fg-soft`, the same permanently-dark palette the sidebar uses) precisely for that reason, rendered as a contained block wherever it appears rather than a full-bleed section. The logo is displayed at a fixed `width: 300px` (per explicit request — deliberately large for a footer mark, not a bug) with `height: auto` to preserve its aspect ratio.

### Dashboard shell (modeled on the Vercel Next.js admin dashboard template)

All authenticated pages live under the `src/app/(dashboard)/` route group (route groups don't affect the URL — `/courses` is still `/courses`), wrapped by `src/app/(dashboard)/layout.jsx`, which renders `src/components/Sidebar.jsx` (fixed dark icon rail — `'use client'` for `usePathname()` active-state) and `src/components/Topbar.jsx` (light bar with the logged-in user's name + a plain `<form method="POST">` logout button — no client JS needed there). `/login` and the root redirect `page.jsx` sit *outside* the group, so they render standalone with no sidebar/topbar chrome. The sidebar is deliberately always dark (`--sidebar-bg`/`--sidebar-fg` in `globals.css`, independent of the light/dark theme variables) because `src/assets/images/logo.png` is a light/white-stroke mark that isn't visible on a light background — don't let it start following `--paper`/`--ink`.

`src/proxy.js`'s matcher (`/courses/:path*`, `/api/canvas/:path*`) didn't need to change when the pages moved into the route group — route groups are purely organizational and invisible to routing/matchers.

Each dashboard page's `<main className="page">` wrapper doubles as the "card" surface (white background, border, shadow) sitting on the muted `--paper` background provided by `.dashboard-content` — this is why `.page` carries card-like styling in `globals.css` rather than each page rendering an explicit `<Card>` component.

On the courses table (`CourseBrowser.jsx`), each row is **not** a clickable link — the whole-row-as-link pattern was intentionally replaced with an explicit "Ver atividades" button in the actions cell, because more per-course actions are expected to land in that same cell later. Don't revert to a row-level `<Link>` wrapping the whole `<tr>`.

### Pending-grading visibility (`CourseBrowser.jsx` + `.../courses/[courseId]/atividades/`)

`CourseBrowser.jsx`'s table shows a **Pendências** badge (`course.needs_grading_count`, requested via `include[]=needs_grading_count` in `canvasClient.listCourses` — this is Canvas's own server-computed total, not something this app counts itself) and a `StatusIcon` (`src/components/StatusIcon.jsx`) derived from `course.workflow_state` (`available`→published, `unpublished`, `completed`). Its "Ver atividades" button leads to `src/app/(dashboard)/courses/[courseId]/atividades/page.jsx`, which lists the course's assignments (`canvasClient.listAssignments`) with their own `needs_grading_count`/`published`.

**Important gotcha**: only assignments with a truthy `quiz_id` (classic Quiz, `submission_types: ['online_quiz']`) get an "Importar questões" button, linking to the *unchanged* `courses/[courseId]/quizzes/[quizId]/import` route using `assignment.quiz_id` as the quiz id. Do **not** use `assignment.is_quiz_assignment` for this check — that field flags New Quizzes (LTI) assignments, which this app's import endpoint (`POST /courses/:id/quizzes/:quiz_id/questions`, a classic-Quizzes-only API) cannot target. There is no `courses/[courseId]/quizzes/page.jsx` list anymore — `atividades/` replaced it as the sole way to reach the import screen; `quizzes/[quizId]/import/page.jsx` itself was not touched.

This feature was ported from `tools/CanvasQuiz/ct/` — an **orphaned, unwired reference folder** (Express + jQuery/DataTables code meant for a different, absent host app; not required by anything in `src/`, not runnable standalone, uses env var names — `CANVAS_API_ENDPOINT`, `CANVAS_CLIENT_ID`, etc. — that don't exist in this app's `.env`). Only its two Canvas API calls and the "trust Canvas's own `needs_grading_count`" logic were reused; the DataTables/jQuery frontend and the per-section grading breakdown (`needs_grading_count_by_section`) were deliberately not ported. `ct/` itself was left in place, untouched, as read-only reference material.

### AI provider adapters (`src/lib/aiProviders/`) — multi-provider by design

Question generation (and any future AI-backed feature) goes through a small adapter architecture, not a single hardcoded OpenAI integration:

- **Adapter contract** — each provider module (`openai.js`, `gemini.js`, `claude.js`) exports `id`, `label`, `defaultModel`, `async validateApiKey(apiKey)` (→ `{ valid, error? }`), and `async generateQuestions({ apiKey, model, specs })` (→ a `quiz.schema.json`-shaped object). Adding a new provider means writing one module matching this contract and adding it to the `PROVIDERS` array in `src/lib/aiProviders/index.js` — nothing else in the app changes.
- **`src/lib/aiProviders/index.js`** is the registry: `getProvider(id)` (throws on unknown id) and `listProviders()` (the id/label/defaultModel subset safe to send to the client — never the keys themselves).
- **`src/lib/aiProviders/shared.js`** holds everything the three current adapters have in common: `SYSTEM_PROMPT` (**condensed from the globally-installed `enade-it-questions` Claude Code skill**, `~/.claude/skills/enade-it-questions/`, not a repo file — the running app can't invoke the Skill tool at request time, so the rules are hardcoded as a template string; if that skill's rules change, this needs manual updating), `buildUserMessage(specs)`, and `buildQuizOutputSchema()`.
- `buildQuizOutputSchema()` strips `quiz.schema.json`'s `$defs.question.properties.answers.allOf` (the `contains`/`minContains`/`maxContains` mechanism enforcing "exactly one correct answer") and narrows `course_id`/`quiz_id` from `["integer","null"]` to plain `"integer"` (we always emit `0`, never `null`) — none of the three vendors' structured-output/tool-input schema dialects reliably support that `allOf` combination. The "exactly one correct answer" rule becomes prompt guidance instead (see `SYSTEM_PROMPT`) and is re-checked after generation via `validateStructural()` in `src/app/api/ai/[provider]/generate-questions/route.js` — same defense-in-depth pattern the Canvas import route already uses. There's no auto-retry: if it fails, the user just clicks "Gerar" again.
- Each adapter feeds that same schema to its provider's structured-output feature differently, because the three vendors' dialects aren't interchangeable: `openai.js` uses the Responses API's strict `json_schema` format (schema enforced server-side by OpenAI); `claude.js` forces tool use (`tool_choice: { type: 'tool', name: 'emit_quiz' }`) with the schema as `input_schema`, and reads `toolUse.input` directly (Anthropic parses it for you, no `JSON.parse` needed); `gemini.js` deliberately does **not** wire the schema into Gemini's native `responseSchema` field (its dialect is proto-derived and easy to get subtly wrong from outside the SDK) — instead it only sets `responseMimeType: 'application/json'` and describes the same schema as text in the prompt, relying on the shared post-generation validation as the real safety net.
- **Session shape**: `session.aiApiKeys = { openai: '...', gemini: '...', claude: '...' }` — a key per provider id, genuinely multi-valued now (not just future-proofing). No change needed in `src/lib/session.js` — iron-session doesn't enforce a fixed shape.
- **Routes are provider-generic**: `src/app/api/ai/[provider]/key/route.js` (`POST` validates via the matching adapter and saves `session.aiApiKeys[provider]`; `DELETE` clears it) and `src/app/api/ai/[provider]/generate-questions/route.js` (`POST`, looks up the adapter, requires `session.aiApiKeys[provider]` to be set, runs `validateStructural()` + the non-blocking ajv check same as before). Per-provider model overrides read `process.env['<PROVIDER_ID_UPPERCASE>_MODEL']` (`OPENAI_MODEL`, `GEMINI_MODEL`, `CLAUDE_MODEL`).
- `src/proxy.js`'s matcher includes `/questoes/:path*`, `/perfil/:path*`, and `/api/ai/:path*` alongside the Canvas-gated routes — an unauthenticated caller can't spend anyone's stored key, even though this feature doesn't touch Canvas or need token refresh to function.

### Questões (`src/app/(dashboard)/questoes/page.jsx` + `QuestionGenerator.jsx`)

Lets a professor pick a registered AI provider (a `<select>` only appears once more than one is configured — see below), list per-question specs (tema/nível/tipo — RU/CM/AR only, `INT` is never offered here), and get back a `quiz.schema.json`-shaped JSON they can preview and download.

- `questoes/page.jsx` passes `QuestionGenerator` the subset of `listProviders()` for which `session.aiApiKeys[id]` is set — the component never sees provider ids that aren't configured. If none are configured, it shows an alert linking to `/perfil` instead of the spec form.
- `QuestionGenerator.jsx`'s preview strips generated HTML down to plain text via `DOMParser(...).body.textContent` (never `dangerouslySetInnerHTML`) — this app has zero HTML-sanitization tooling, and AI-generated content is the first freeform content ever rendered here. The **saved JSON file** still contains the full, untouched HTML (that's what Canvas needs) — only the on-screen preview strips tags.
- `course_id`/`quiz_id` always generate as `0`, matching the skill's own convention for unset codes (never `null`, even though the schema itself permits `null`) — harmless downstream, since the existing import flow (`ImportQuestions.jsx` → `/api/canvas/import`) already ignores a file's own `course_id`/`quiz_id` in favor of the route's real `courseId`/`quizId`.

### Perfil (`src/app/(dashboard)/perfil/page.jsx`) — where every provider's key is registered

Reached by clicking the username in `Topbar.jsx` (a `<Link href="/perfil">`, not a dropdown). Shows basic account info (`session.user?.name`, `session.baseUrl`) and, for every entry in `listProviders()`, one `src/components/ApiKeyManager.jsx` instance (`provider` + `hasApiKey` props) — a self-contained save/validate/swap/remove form hitting `POST`/`DELETE /api/ai/[provider]/key`. This is the **only** place keys are entered; `QuestionGenerator` and any future AI feature only ever read whether a key is configured, never manage it inline — single source of truth by construction. A "Preferências" section exists as a placeholder for future non-AI settings.

## Commands

```bash
npm install
npm run dev              # Next.js dev server (web app)
npm run build             # Next.js production build
npm start                 # Next.js production server (build first)
npm run cli -- [file.json] [--yes] [--dry-run] [--no-color] [--help]
```

There is no lint or test suite in this package.

## Two separate auth models — do not conflate them

- **CLI**: `CANVAS_API_URL` (includes `/api/v1`) + `CANVAS_API_TOKEN`, a long-lived personal access token, read from `.env` via `dotenv`. Never expires, no refresh logic.
- **Web app**: full Canvas OAuth2 authorization-code flow against `CANVAS_DOMAIN` (bare domain, no `/api/v1`) using a Canvas Developer Key (`CANVAS_OAUTH_CLIENT_ID`/`CANVAS_OAUTH_CLIENT_SECRET`/`CANVAS_OAUTH_REDIRECT_URI`). Access tokens expire (~1h); the refresh token does not rotate (Canvas reuses the same one on every refresh — see `src/lib/canvasOAuth.js`). The Canvas token/session is never sent to the browser: it lives only in an encrypted `iron-session` httpOnly cookie (`SESSION_SECRET`, `src/lib/session.js`), read and refreshed server-side (`src/proxy.js`, Route Handlers, Server Components).
- `src/lib/canvasClient.js` is intentionally agnostic to which of the two auth models is in use — it just takes a `{ baseUrl, token }` (plus an optional `onUnauthorized` callback for OAuth's 401-retry). `normalizeBaseUrl()` inside it accepts either convention (`.../api/v1` or bare domain).

## Token refresh design (read this before touching `src/proxy.js`)

`src/proxy.js` is Next.js's Proxy file convention (Next.js 16 renamed `middleware.js` to `proxy.js`; the exported function is `proxy`, not `middleware`). It matches `/`, `/courses/:path*`, `/api/canvas/:path*`, `/questoes/:path*`, and `/api/ai/:path*` (never `/api/auth/*`, or the OAuth callback would be blocked before a session exists). On each matched request it proactively refreshes the access token if it's within 5 minutes of expiring, using `getIronSession(request, response, sessionOptions)` — the signature that actually works here (the `getIronSession(cookies(), ...)` form used in Route Handlers/Server Components has open compatibility issues when called from Proxy, per upstream iron-session GitHub issues).

The 5-minute safety margin is a deliberate choice, not an oversight: it sidesteps ambiguity in whether a proxy-refreshed cookie is visible to a Server Component rendered later in the *same* request — the current request's already-in-hand token is still valid regardless, and the *next* navigation picks up the refreshed cookie from the browser. `canvasClient.js`'s `onUnauthorized` 401-retry is a second, independent backstop for the (rare) case a call is made without going through the proxy-gated paths.

## Validation is intentionally two-tier — do not make schema validation blocking

`src/lib/quizValidation.js`:
- `validateStructural(data)` — **blocking**. The bare minimum to safely call Canvas's API (course_id/quiz_id/questions present, each question has answers with exactly one `is_correct: true`, etc.). Used by the CLI, the client-side file preview, and again server-side in the import route (defense in depth).
- `createSchemaValidator(schemaObject)` + `summarizeSchemaWarnings()` — **non-blocking, ajv against `src/lib/quiz.schema.json`**. This must stay non-blocking: real files under `Questoes/` routinely deviate from the schema (missing `question_model`, extra fields like `nivel` that trip `additionalProperties: false`) and are still legitimate content the tool must keep importing. If you're tempted to make schema conformance mandatory, don't — check `Questoes/DIW-prova1/Gemini/*.json` (no `question_model`) and `Questoes/DIW-prova2/JSON/*.json` (has an extra `nivel` field) first.
- `toCanvasPayload(question)` — the is_correct→answer_weight / answer_comment→answer_comment_html mapping, shared by the CLI and the import route handler.

`quizValidation.js` itself takes the parsed schema as a parameter rather than importing `quiz.schema.json` directly, because the three call sites need different JSON-import syntax: Next's bundler accepts a plain `import ... from '@/lib/quiz.schema.json'` (used in `ImportQuestions.jsx` and any server code), while the unbundled CLI (run directly by `node`) needs `import quizSchema from '../lib/quiz.schema.json' with { type: 'json' }`.

## Question bank data (`Questoes/`)

Unchanged in nature from before this refactor: real exam content across `DIW-prova1`/`DIW-prova2` exam folders, including multiple independent LLM-generated drafts of the same quiz (`claude_quiz/`, `gpt_quiz/`, `Gemini/`) and, in some subfolders, a paired `.md` human-readable version of each `.json` file — keep both in sync when hand-editing. `question_model` values map to Portuguese pedagogical question types: `RU` (Resposta Única), `CM` (Complementação Múltipla), `AR` (Asserção-Razão), `INT` (Interpretação).

## Layout

```
src/
  app/
    (dashboard)/  layout.jsx (Sidebar+Topbar shell) + page.jsx (capa/home), courses/**, questoes/, perfil/ — route group, invisible in the URL, proxy-gated
    login/, api/**   outside the dashboard group, unauthenticated-reachable — no shell chrome
  components/     Sidebar.jsx, Topbar.jsx, CourseBrowser.jsx, StatusIcon.jsx, WebTechFooter.jsx + ImportQuestions.jsx, QuestionGenerator.jsx, ApiKeyManager.jsx (client)
  lib/            canvasClient.js, canvasOAuth.js, session.js, quizValidation.js, quiz.schema.json, aiProviders/{index,shared,openai,gemini,claude}.js
  cli/            index.js (entry), colors.js, prompt.js
  proxy.js        OAuth + AI-key session gate, proactive Canvas token refresh (Next.js "Proxy", ex-middleware)
```
