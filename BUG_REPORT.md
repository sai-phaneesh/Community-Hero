# CommunityHero — Pre-Submission Bug Report

**Date:** 2026-06-30
**Reviewed build:** local working tree (`src/`, `server.ts`)
**Status:** 🔴 **NOT demo-ready** — the app crashes to a blank screen after login, and several headline backend features return HTTP 500.

> These are *shallow* defects (missing imports, a renamed method, a context wiring gap). Estimated fix time: **under 1 hour.** Once fixed, the app is genuinely strong.

---

## How this was tested

The app was run live in **two** database configurations to rule out environment-specific causes:

| Configuration | How | Result |
|---|---|---|
| **Local JSON fallback** | `pnpm run dev` (no `DATABASE_URL`) | Boots; bugs reproduce |
| **Backend + CockroachDB in Docker** | `cockroachdb/cockroach:v23.2.4` single-node, `DATABASE_URL=postgresql://root@localhost:26257/defaultdb`, tables created + seeded (verified `2 issues / 4 users` via direct SQL) | Boots; **bugs reproduce identically** |

**Conclusion on the DB question:** the failures are **100% database-independent.** The crashing line (`ctx.issueUseCase.getIssueById(...)`) throws a `TypeError` *before any query is issued*, because the method does not exist on the class — so the repository layer (CockroachDB or JSON) is never reached. There is no `Dockerfile`/`docker-compose.yml` in the repo and no `DATABASE_URL` in `.env`, so the default run mode is the JSON fallback; either way the result is the same.

Verification commands used:
```bash
# JSON mode
pnpm run dev
# CockroachDB mode
docker run -d --name crdb -p 26257:26257 cockroachdb/cockroach:v23.2.4 start-single-node --insecure
DATABASE_URL="postgresql://root@localhost:26257/defaultdb?sslmode=disable" PORT=3000 npx tsx server.ts
curl -s http://localhost:3000/trpc/issue.list                       # ✅ works
# after logging in as a contractor and obtaining a JWT:
curl -s -X POST http://localhost:3000/trpc/bid.submit -H "Authorization: Bearer <token>" ...   # ❌ 500
```

---

## P0 — Critical (app is unusable until fixed)

### 1. 🔴 Dashboard white-screens after login — missing icon imports
- **Files:** `src/components/Dashboard.tsx:1591` (`Sun`, `Moon`), `src/components/Dashboard.tsx:5299` (`X`)
- **Symptom:** After any successful login the entire dashboard renders **blank** (verified in-browser: `#root` has 0 children; console: *"An error occurred in the `<Dashboard>` component"*; there is **no error boundary**). The login screen (`AuthModal`) renders fine — the crash is in `Dashboard`.
- **Root cause:** `Sun` and `Moon` are used in the always-rendered header theme-toggle (line 1591) and `X` is used at line 5299, but **none are imported** from `lucide-react`. At render they evaluate as undefined identifiers → `ReferenceError` → React unmounts the tree.
- **Evidence:** `tsc` reports `TS2304: Cannot find name 'Sun' / 'Moon' / 'X'`. Live browser test produced a black/blank screen for a logged-in user.
- **Fix:** Add `Sun`, `Moon`, `X` to the existing `lucide-react` import block at the top of `Dashboard.tsx`.

### 2. 🔴 `IssueUseCase.getIssueById()` does not exist — bidding & chat return 500
- **Caller files:** `bid.router.ts:26,91,159,204,266,336`, `issue-message.router.ts:21`, and `payment.router.ts:61` (calls `getIssue`).
- **Defined in:** `src/backend/usecases/issue.usecase.ts` — **the class has no `getIssueById` (or `getIssue`) method.**
- **Symptom (verified live, both DB modes):**
  ```
  POST /trpc/bid.submit        → 500  "ctx.issueUseCase.getIssueById is not a function"
  POST /trpc/issueMessage.send → 500  "ctx.issueUseCase.getIssueById is not a function"
  ```
  This breaks the **entire contractor bidding workflow** (submit / accept / reject / counter / accept-counter) and **issue chat**, and by the same pattern the **payment authorization** flow.
- **Fix:** Add a method to `IssueUseCase`:
  ```ts
  async getIssueById(id: string): Promise<Issue | null> {
    return await this.issueRepo.findById(id);
  }
  ```
  (and a `getIssue` alias, or rename the `payment.router.ts` call to `getIssueById`).

### 3. 🔴 `ctx.issueRepository` is undefined — bid accept / reviews / timeline / duplicate-detection crash
- **Caller files:** `bid.router.ts:114,288`, `issue.router.ts:133,142,156`, `issue-timeline.router.ts:23`, `review.router.ts:18,58`.
- **Root cause:** `issueRepository` is instantiated at module scope in `context.ts` but is **never included in the object returned by `createContext`** (`src/backend/presentation/trpc/context.ts:63`). Routers read `ctx.issueRepository.update(...)` → `Cannot read properties of undefined`.
- **Status:** confirmed by static analysis (`TS2551`); same crash class as #2.
- **Fix:** Add `issueRepository` to the returned context object in `createContext`.

### 4. 🔴 `TRPCError` is not imported — duplicate-detection path throws `ReferenceError`
- **File:** `src/backend/presentation/trpc/routers/issue.router.ts:127,135,144`
- **Root cause:** `throw new TRPCError({...})` is used but `TRPCError` is never imported.
- **Fix:** `import { TRPCError } from "@trpc/server";`

### 5. 🔴 `ctx.user.name` does not exist — payment authorize & review submit
- **Files:** `payment.router.ts:64,74`, `review.router.ts:48`
- **Root cause:** The JWT payload (`UserTokenPayload`) contains `id`, `role`, `email`, `sessionId` — **not `name`**. `ctx.user.name` is `undefined`, so payments/reviews get written with `authorizedByName: undefined` (or crash downstream).
- **Fix:** Either add `name` to the signed token (`auth.router.ts` `signToken(...)`), or look the user up via `ctx.userRepository.findById(ctx.user.id)` and read `.name`.

### 6. 🔴 `notificationUseCase.createNotification` called with 1 argument (expects 3–5)
- **Files:** `announcement.router.ts:54,63`, `bid.router.ts:54,128,137,179,229,299,352`, `issue-message.router.ts:58`
- **Root cause:** The call sites pass a single object, but the method signature is `(userId, title, message, targetIssueId?, targetType?)`. Notifications for bids, announcements, and chat are malformed/broken.
- **Fix:** Update each call to the positional signature (or change `createNotification` to accept an object — pick one and apply consistently).

---

## P1 — Correctness bugs (compile away, but degrade behavior)

| # | File:line | Issue | Effect | Fix |
|---|---|---|---|---|
| 7 | `Dashboard.tsx:2334` | `mutation.isLoading` | TanStack Query **v5 renamed** `isLoading`→`isPending` on mutations; `.isLoading` is `undefined`, so the review-submit loading spinner never shows | Use `.isPending` |
| 8 | `payment.repository.ts:1` | `Cannot find module '../../types'` | Wrong relative path to `types.ts` | Correct the import path |
| 9 | `database.ts:38` | `defaultDB` missing `payments` | `DB` type requires `payments: any[]`; seed object omits it | Add `payments: []` to `defaultDB` |
| 10 | `AuthModal.tsx:120,161` | `phone` not in register input type | Phone entered at signup is silently dropped from the typed payload | Add `phone` to the auth register zod input + `AuthUseCase.register` |
| 11 | `Dashboard.tsx:3962` | reads `.paymentMethod` (field is `method`) | Payment method shows blank | Use `.method` |
| 12 | `Dashboard.tsx:5357` | object literal has stray `paymentId` | Harmless extra prop / type error | Remove it |
| 13 | `Dashboard.tsx:3686` | `window.__jumpToIssue` untyped | Type error only | Add a `declare global` Window augmentation |

---

## Documentation / config inconsistencies (low risk, but reviewers notice)

- **Port mismatch:** README says open `http://localhost:5001`; `server.ts:11` hardcodes `const PORT = 3000` (and ignores the `PORT` env var). Align them and read `PORT` from env.
- **`task.md` claims verification done:** the checklist item *"Run npm run build and resolve any typechecks"* is ticked, but `pnpm run lint` (`tsc --noEmit`) currently reports **43 errors**. The build only passes because Vite/esbuild strip types without checking.
- **`.env.example`** references `DATABASE_URL`, GCS, and Firebase vars, but there is no Docker/compose file to stand up CockroachDB locally — consider adding a `docker-compose.yml` so reviewers can run the "real" stack in one command.

---

## What currently works (verified live)

- ✅ Server boots in both JSON and CockroachDB (Docker) modes; tables auto-create + seed.
- ✅ `issue.list` (main feed) serves seeded data.
- ✅ JWT auth: `auth.login` issues a token; protected procedures correctly reject unauthenticated calls with `401 UNAUTHORIZED`.
- ✅ **Gemini AI analysis (`issue.analyze`) genuinely works** — returns real, contextual category/severity/waste/repair output (not the rule-based fallback). This is the strongest part of the project.

---

## Fix checklist (do in this order)

- [ ] Add `Sun, Moon, X` to the `lucide-react` import in `Dashboard.tsx`  *(un-blanks the app)*
- [ ] Add `getIssueById()` (and `getIssue`) to `IssueUseCase`
- [ ] Add `issueRepository` to the `createContext` return object
- [ ] `import { TRPCError } from "@trpc/server"` in `issue.router.ts`
- [ ] Provide `name` for `ctx.user` (token or DB lookup) in payment/review routers
- [ ] Fix all `createNotification(...)` call sites to the correct argument shape
- [ ] `mutation.isLoading` → `mutation.isPending` (Dashboard.tsx:2334)
- [ ] Fix remaining P1 type errors (8–13)
- [ ] **Wrap the app in a React error boundary** so a single bad render never blanks the whole screen again
- [ ] Run `pnpm run lint` until it reports **0 errors**, then click every button as resident / contractor / admin
- [ ] Align README port with `server.ts` (read `PORT` from env)

---

## Appendix — full `tsc --noEmit` output (43 errors)

```
backend/domain/repositories/payment.repository.ts:1  TS2307  Cannot find module '../../types'
backend/infrastructure/database.ts:38                TS2741  Property 'payments' is missing in type ... DB
backend/presentation/trpc/routers/announcement.router.ts:54,63   TS2554  Expected 3-5 arguments, but got 1
backend/presentation/trpc/routers/bid.router.ts:26,91,159,204,266,336   TS2339  getIssueById does not exist on IssueUseCase
backend/presentation/trpc/routers/bid.router.ts:54,128,137,179,229,299,352   TS2554  Expected 3-5 arguments, but got 1
backend/presentation/trpc/routers/bid.router.ts:114,288   TS2551  issueRepository does not exist on ctx
backend/presentation/trpc/routers/issue-message.router.ts:21   TS2339  getIssueById does not exist on IssueUseCase
backend/presentation/trpc/routers/issue-message.router.ts:58   TS2554  Expected 3-5 arguments, but got 1
backend/presentation/trpc/routers/issue-timeline.router.ts:23   TS2551  issueRepository does not exist on ctx
backend/presentation/trpc/routers/issue.router.ts:127,135,144   TS2552  Cannot find name 'TRPCError'
backend/presentation/trpc/routers/issue.router.ts:133,142,156   TS2551  issueRepository does not exist on ctx
backend/presentation/trpc/routers/payment.router.ts:61   TS2339  getIssue does not exist on IssueUseCase
backend/presentation/trpc/routers/payment.router.ts:64,74   TS2339  name does not exist on UserTokenPayload
backend/presentation/trpc/routers/review.router.ts:18,58   TS2551  issueRepository does not exist on ctx
backend/presentation/trpc/routers/review.router.ts:48   TS2339  name does not exist on UserTokenPayload
components/AuthModal.tsx:120,161   TS2353  'phone' not in register input type
components/Dashboard.tsx:1591   TS2304  Cannot find name 'Moon' / 'Sun'
components/Dashboard.tsx:2334   TS2339  isLoading does not exist (use isPending)
components/Dashboard.tsx:3686   TS2339  __jumpToIssue does not exist on Window
components/Dashboard.tsx:3962   TS2339  paymentMethod does not exist (field is 'method')
components/Dashboard.tsx:5299   TS2304  Cannot find name 'X'
components/Dashboard.tsx:5357   TS2353  'paymentId' not in payment object literal
```
