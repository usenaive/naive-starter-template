# Naive Starter Template — E2E Test Report & Gap Analysis

**Date:** 2026-06-18
**Tested against:** production `https://api.usenaive.ai` with published `@usenaive-sdk/node@0.8.0` / `@usenaive-sdk/cli@0.7.0`
**Branch tested:** `openrouter_primitive` (PR #1) + SDK bumped to `^0.8.0`

---

## 1. What I tested (and the result)

Setup performed: `gh pr checkout 1` → bump `@usenaive-sdk/node` to `^0.8.0` → `npm install` → `npm run db:push` → `npm run typecheck` → `npm run build` → `npm run dev`, then drove the running app over HTTP.

| Step | Result |
|---|---|
| `npm install` (SDK 0.8.0) | ✅ clean, 0 vulns |
| `npm run db:push` (SQLite/Drizzle) | ✅ tables created |
| `npm run typecheck` | ✅ passes |
| `npm run build` (Next 15) | ✅ all routes compiled |
| BetterAuth sign-up (`POST /api/auth/sign-up/email`) | ✅ 200 + session cookie |
| Tenant provisioning on signup (`naive.users.create`) | ✅ (subsequent scoped calls succeed) |
| `GET /api/cards` (scoped) | ✅ `{"cards":[]}` |
| `GET /api/connections` (scoped) | ✅ `{"connections":[]}` |
| `POST /api/chat` — OpenRouter agent loop | ✅ streamed 29 text chunks + tool call |
| Tool-calling lane (`naive_search_primitives`) | ✅ executed, results returned |
| Credit billing through the chat | ✅ workspace credits `1.0 → 0.9124` |

**Bottom line:** with PR #1 applied and the SDK at `^0.8.0`, the template works fully end-to-end — multi-tenant signup → provisioning → scoped primitives → a streaming, tool-calling agent billed in Naive credits with **no Anthropic key**.

---

## 2. The OpenRouter PR is a required step (validated)

PR #1 ("Route the chat agent loop through Naive's OpenRouter LLM router") is **correct and should be merged.** It rewrites `app/api/chat/route.ts` to use `client.llm.stream()` with OpenAI-style tools mapped from `agentTools()`, drops `@anthropic-ai/sdk`, and removes the `ANTHROPIC_API_KEY` requirement. I verified it streams, dispatches tools via `kit.handle()`, and bills Naive credits.

**One change on top of the PR:** the PR pins `@usenaive-sdk/node@^0.5.0`; bump it to **`^0.8.0`** (latest) so the template also gets the `trading` client and the latest `llm.stream` typings. Verified building/running on `0.8.0`.

---

## 3. Gaps vs. what we shipped (prioritized)

### P0 — Merge PR #1 / drop Anthropic
On `main` the chat still calls Anthropic directly and **requires `ANTHROPIC_API_KEY`**, which contradicts the template's "one key" pitch and doesn't bill through Naive. Fixed by PR #1. Until merged, the template's headline feature is on the old path.

### P1 — Stale SDK (`^0.3.0`)
`package.json` on `main` pins `@usenaive-sdk/node@^0.3.0` (latest is `0.8.0`). Missing everything added since: the **`trading`** client, `llm.stream`, and newer billing/plans/webhooks typings. Bump to `^0.8.0`.

### P1 — No Trading primitive surface
We shipped the **trading** primitive (Alpaca OAuth; stocks/options/crypto). The template has **no `app/api/trading/route.ts` and no `app/app/trading/` page**, it's absent from the README "What you get" table, and there's no env/QA mention. The agent *can* reach it through the generic `naive_run_primitive` lane (if the Account Kit enables it), but there's no first-class demo like cards/email. **Add** a `trading` route + page (mirror `app/api/cards/route.ts` → `client.trading.connect/connections/account/createOrder/positions/quote`), and surface the OAuth connect → approval-gated order flow.

### P1 — No credits / billing awareness in the UI
Everything is metered in Naive credits and new workspaces now start with **1 free credit** (changed from the old default). The template:
- never shows the workspace credit balance (`GET /v1/status`), and
- doesn't handle `insufficient_credits` (HTTP 402) gracefully — the chat just errors when credits run out.

For a SaaS starter this is a notable omission. **Add** a small credits indicator and a 402-aware error path (link to top-up). The Quick Start should also note that a fresh workspace has only 1 credit, so you'll likely top up before heavy testing.

### P2 — No tenant monetization story (plans / per-tenant billing / webhooks)
The SDK now exposes operator **`plans`** (plan → Account Kit + quotas), per-tenant **`billing.setSubscription()/usage()`**, and **`webhooks`** (per-tenant outbound subscriptions). A multi-tenant SaaS starter ideally demonstrates: define a plan, subscribe a tenant (from your Stripe webhook), enforce metered quotas, and receive Naive webhooks. None of this is shown. Consider an optional "Billing/Plans" page + a `webhooks` example to complete the monetization narrative.

### P2 — README / metadata drift (post-PR)
After PR #1 these are wrong and should be updated:
- Badges: `@usenaive-sdk/node ^0.3.0` → `^0.8.0`; "Claude Sonnet 4.5" → "OpenRouter (any model)".
- Tech stack: "Anthropic Claude — the chat model" → "Naive `llm` primitive (OpenRouter)".
- Env table + `.env.example`: remove `ANTHROPIC_API_KEY` (no longer required); add optional `NAIVE_LLM_MODEL` (defaults to `anthropic/claude-sonnet-4.6`).
- Vercel "Deploy" button `env=…` list still includes `ANTHROPIC_API_KEY` — remove it.
- "How it works" mermaid still shows `Anthropic (tool-use)` — relabel to the Naive LLM router.

### P3 — Nice-to-haves
- The README QA checklist and example prompts could include a trading example (e.g., "connect my brokerage", "buy $25 of BTC") once the trading page exists.
- `.env.example` could mention that the chat now needs only `NAIVE_API_KEY` (no provider key).

---

## 4. Recommended order of operations
1. **Merge PR #1** (OpenRouter chat) — validated working.
2. **Bump `@usenaive-sdk/node` to `^0.8.0`** (PR pins `^0.5.0`).
3. **Update README + `.env.example` + Vercel deploy button** to drop Anthropic and reflect the OpenRouter routing (P2 drift list).
4. **Add a Trading page + route** (`client.trading.*`) — first-class parity with cards/email.
5. **Add credits visibility + 402 handling** in the UI; note the 1-credit starting balance.
6. *(Optional)* Add a **Plans / tenant-billing / webhooks** example to complete the monetization story.

## 5. Nothing "broke"
No runtime errors or build failures were found on the PR branch with SDK `0.8.0`. The only correctness issue on `main` is the Anthropic-coupled chat (fixed by PR #1). Everything else above is *missing coverage* of newly-shipped capabilities, not a regression.

> Note: testing created throwaway prod records — a workspace (`naive-tmpl-*@example.com`) and an app/tenant user (`tmpl-user-*@example.com`). Delete in the DB if undesired. Local clone left on branch `openrouter_primitive` with `@usenaive-sdk/node@^0.8.0` and a local `.env`/`dev.db` (gitignored).
