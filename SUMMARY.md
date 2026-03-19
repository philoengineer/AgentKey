# AgentKey — Project Summary, Capabilities & Roadmap

## Context

AgentKey is a World Mini App that lets verified humans delegate scoped, time-limited, revocable credentials to AI agents. It runs inside World App's WebView via the MiniKit SDK and uses World's tiered identity verification (wallet, device, passport, orb) as the trust foundation for what agents are allowed to do.

The app is currently a **fully interactive UI prototype** — all flows work end-to-end in the browser, but everything is client-side simulation. No backend, no persistence, no real World verification yet.

**Repo**: https://github.com/philoengineer/AgentKey

---

## What's Built

### Core Files
| File | Lines | Purpose |
|---|---|---|
| `agentkey.jsx` | ~910 | Entire app: state, logic, UI |
| `public/ma.css` | ~860 | Ma (間) design system |
| `app/layout.jsx` | 22 | Root layout + MiniKit install |
| `app/page.jsx` | 11 | Client-side render guard |
| `app/globals.css` | 10 | Font imports + CSS variable wiring |
| `package.json` | — | Next.js 15, React 19, MiniKit SDK |

### Identity & Trust System

**4-tier verification ladder** (cumulative base scores):
- **Wallet** (L0, +5) — World App wallet connected
- **Device** (L1, +20) — Device verification via World App
- **Passport** (L2, +30) — NFC passport or national ID
- **Orb** (L3, +40) — Iris biometric, full proof of personhood

**Social vouching** adds bonus trust points, weighted by voucher's tier:
- Vouch weights: Wallet +1, Device +2, Passport +3, Orb +5
- Diminishing returns: higher tiers get smaller max social boost (Wallet +15 cap, Orb +5 cap)
- Trust score = base score + min(social score, tier cap) — max theoretical ~100

### Scope & Permission Model

**11 scopes** gated by tier level, with risk ratings:
- L0 (low risk): `read:profile`, `read:data`
- L1 (low-medium): `read:eligibility`, `claim:rewards`, `claim:daily`, `vote:poll`
- L2 (medium-high): `claim:benefit`, `sign:messages` (HITL), `pay:transfer` (HITL)
- L3 (high): `tx:contract` (HITL), `vote:governance` (HITL)

4 scopes require **Human-in-the-Loop approval** — the agent queues a request and the human must approve or deny before execution.

### Constraint System

Grants enforce constraints at multiple levels:
- **Time**: Expiration, active hours (UTC window), allowed days of week
- **Budget**: Max actions, rate limit per hour, per-scope action limits
- **Financial**: Per-transaction spending cap, total spending cap (WLD)
- **Allowlists**: Whitelisted contracts, domains, recipients

The simulation engine (`doSim`) checks constraints in order: time window → day → per-scope limit → spending cap → HITL check → execute. Denied actions produce audit log entries explaining which constraint blocked them.

### Agent Templates

4 pre-configured starting points:
- **Rewards Bot** — auto-claims daily WLD grants (7 days, 50 actions)
- **Poll Voter** — votes in polls per preferences (30 days, 100 actions)
- **Portfolio Agent** — monitors/manages token positions (24 hrs, 10 actions, HITL)
- **Custom Agent** — blank slate, user configures everything

### Grant Lifecycle

`Create → Active → (Simulate/Execute/HITL approve) → Revoke or Expire`

Every grant carries: verification stack, trust score, scopes, full constraint set, audit log, pending HITL queue, cryptographic signature (currently simulated), and revocation state.

### UI / Design

**Ma (間) design language** — light, spacious, restrained:
- Light mode default, user-toggled dark mode via app bar button
- Inter font (weight 300-500), JetBrains Mono for code/addresses
- Zinc/gray palette, subtle borders, generous whitespace
- No emojis — text labels and CSS indicators only
- 300ms transitions, no bounce/pulse/glow (except verification pulse)
- 420px mobile-optimized layout (World App WebView target)
- 5 tabs: Home, Trust, Delegate, Agents, Vouch

---

## What's Simulated (Not Real Yet)

| Feature | Current State | What's Needed |
|---|---|---|
| Verification | `setTimeout` (2-3s fake) | Real MiniKit SDK calls |
| Signatures | Random hex string | ECDSA via `viem` or similar |
| Grant storage | React `useState` (lost on refresh) | Database or localStorage |
| Agent keys | Random hex | Proper key generation |
| Spending tracking | Client-side counter | Server-side ledger |
| Multi-user | Single simulated user | Auth + user accounts |
| Audit log | In-memory array | Persistent storage |
| Allowlist enforcement | Not checked in sim | Server-side validation |
| Rate limiting | Not enforced | Server-side middleware |

---

## Roadmap

### Phase 1 — Persistence & Polish (make the demo real enough to share)
- [x] **localStorage persistence** — grants, verifications, vouches, audit logs survive refresh
- [x] **Dark mode preference** — persist toggle choice in localStorage
- [x] **Error states** — expired grant detection, constraint conflict warnings in review
- [ ] **Responsive polish** — test on actual mobile viewport sizes
- [ ] **Loading states** — skeleton screens for initial load

### Phase 2 — Deploy & Integrate (get it running in World App)
- [x] **MiniKitProvider refactor** — server-side root layout + client-side providers.jsx; proper SDK initialization
- [x] **World App gate** — `MiniKit.isInstalled()` check; browser shows "Open in World App" banner
- [ ] **Deploy to Replit** — public URL via Replit deployment for World Developer Portal registration
- [ ] **Real MiniKit verification** — replace `doVerify` simulation with actual SDK calls (`MiniKit.commandsAsync.verify`, `MiniKit.commandsAsync.walletAuth`)
- [ ] **World Developer Portal** — register as Mini App, get app ID
- [ ] **Environment config** — `.env.example` with `NEXT_PUBLIC_APP_ID`, `WORLD_ACTION_ID`

### Phase 3 — Backend & Security (make it production-grade)
- [ ] **API routes** — `/api/grants` (CRUD), `/api/verify` (World verification callback), `/api/vouches`
- [ ] **Database** — Postgres or Turso for users, grants, audit logs, vouches
- [ ] **Real cryptographic signatures** — `viem` for grant signing, signature validation
- [ ] **Server-side constraint enforcement** — time windows, spending caps, allowlists validated server-side
- [ ] **Session management** — wallet-based auth, session tokens
- [ ] **MPP integration** — use Machine Payments Protocol (mpp.dev) as the execution layer for `pay:transfer` and `tx:contract` scopes. AgentKey enforces spending caps and allowlists client-side before MPP fulfills the 402 payment challenge; HITL approvals pause the agent before credential retry; MPP receipts replace simulated grant signatures with cryptographic proof of delivery.

### Phase 4 — Advanced Features (from the PRD)
- [ ] **On-chain grant registry** — anchor grant hashes on-chain for verifiability
- [ ] **Agent-to-agent delegation** — chained grants with scope narrowing
- [ ] **Reputation decay** — trust scores that decay without activity
- [ ] **Vouch penalties** — if someone you vouched for is flagged, your social score drops
- [ ] **Grant templates marketplace** — share and discover constraint presets
- [ ] **Webhook notifications** — real-time alerts for HITL requests

### Phase 5 — Testing & Hardening
- [ ] **Test suite** — grant creation, constraint enforcement, HITL flows, trust calculation
- [ ] **E2E tests** — full delegation flow from verification to revocation
- [ ] **Security audit** — constraint bypass attempts, signature forgery, scope escalation
- [ ] **Rate limit testing** — verify throttling under load

---

## How to Test Today

1. `npm run dev` → open http://localhost:3000
2. **Trust tab**: Walk through Wallet → Device → Passport → Orb verification
3. **Delegate tab**: Pick a template or create custom agent with advanced constraints
4. **Agents tab**: View grant detail, run simulation, watch constraints get enforced in audit log
5. **Vouch tab**: Send/receive vouches, watch trust score change
6. Toggle dark mode via the moon/sun button in the app bar
