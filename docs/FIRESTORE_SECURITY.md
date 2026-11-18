# Firestore security — inventory, plan and draft rules

Status: **DRAFT. Nothing here is deployed.** Written 2026-11-19 from a grep of `app/`, `lib/`, `components/`, `contexts/`, `hooks/`.

Files that go with this document:

| File | What it is |
|---|---|
| `firestore.rules` | Rules for the **target** state, after the Admin SDK migration. The bottom of the file has a commented **INTERIM** ruleset that is safe to use **today**. |
| `firebase.json` | Points the Firebase CLI and emulator at the rules and indexes files. Ports: Firestore 8080, Auth 9099, UI 4000. |
| `firestore.indexes.json` | Empty placeholder. Before you ever deploy indexes, export the real ones (see "Testing" below). |

---

## 1. The problem in one paragraph

The Firebase web config (API key + project id `travelzada`) ships in every page's JS bundle. It is also hard-coded as a fallback in `lib/admin/serverAuth.ts`. With that config, anyone can open the Firestore client SDK and read or write any collection, because the database has no real rules today. That includes customer phone numbers, leads, WhatsApp conversations and OTP codes. `lib/admin/privacy.tsx` hides numbers from non-admin staff, but only in the UI. The data underneath is still open to everyone.

## 2. Why rules alone can't fix it today

Every server route (`app/api/**`) and every server component uses the same client SDK (`lib/firebase.ts`) and never signs in. To Firestore, a request from a webhook looks exactly like a request from an anonymous visitor (`request.auth == null`). So any rule that blocks anonymous reads or writes also blocks:

- the WhatsApp/GetGabs and Facebook webhooks,
- broadcasts, vouchers, the planner, the OTP flow and the whole agent API,
- `requireStaff()` itself, which reads `users/{uid}` without authenticating.

There is no rule that means "only my server". A server can only be told apart from a visitor by authenticating. The proper way to do that is the **Admin SDK**, which uses a service account and bypasses rules.

### The fix

1. `npm i firebase-admin`. All routes run on the Node runtime; none use `runtime = 'edge'` (checked).
2. Add the env var `FIREBASE_SERVICE_ACCOUNT` holding the service-account JSON on one line (Vercel → Project → Environment Variables). For local runs, `GOOGLE_APPLICATION_CREDENTIALS=path/to/key.json` also works. **Never commit the key.**
3. Add `lib/firebaseAdmin.ts`:

```ts
// lib/firebaseAdmin.ts — server only. Never import this from a 'use client' file.
import 'server-only'
import { cert, getApps, initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

const app = getApps()[0] ?? initializeApp({
  credential: process.env.FIREBASE_SERVICE_ACCOUNT
    ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    : applicationDefault(),
  projectId: 'travelzada',
})
export const adminDb = getFirestore(app)
export const adminAuth = getAuth(app)
```

4. Move the server files listed below from `firebase/firestore` to `adminDb`. The API is different:
   - `doc(db,'x',id)` becomes `adminDb.collection('x').doc(id)`
   - `getDoc` becomes `.get()`, and `exists()` becomes `.exists` (a property, not a method)
   - `serverTimestamp()` / `increment()` / `arrayUnion()` become `FieldValue.*`
   - `runTransaction(db, …)` becomes `adminDb.runTransaction(…)`
5. **Important:** the Admin SDK skips the rules, so each migrated route has to check its caller itself.
   - Replace the REST lookup in `lib/admin/serverAuth.ts` with `adminAuth.verifyIdToken()`.
   - Add `requireStaff` to the admin routes that have no check today.
   - Agent routes must take the agent id from the verified token, not from `?agentId=`.
6. Deploy the target `firestore.rules`. Server-only collections are then closed to browsers completely.

Server **components** that only read public collections (`packages`, `destinations`, `blogs`, `authors`, `agents`, plus `sitemap.ts`, `lib/homepageData.ts`, `lib/destinationSlugMapper.ts`) can stay on the client SDK. Public read stays allowed for those collections.

### Files to migrate, grouped, with effort

| # | Group | Files | Effort |
|---|---|---|---|
| 0 | Setup | `lib/firebaseAdmin.ts`, env var on Vercel and locally, `lib/admin/serverAuth.ts` → `verifyIdToken`, small `requireAgent()` helper | 0.5 d |
| A | WhatsApp | `app/api/whatsapp/webhook`, `getgabs-webhook`, `status`, `send`, `templates`, `broadcasts/route.ts`, `broadcasts/[id]`, `[id]/send`, `[id]/status`, `audience`, `lists`, `templates`, `test`, `broadcasts/_lib/{server,lists,audience}.ts`, `lib/whatsapp.ts` (`resolveWhatsAppRef`), `lib/whatsappAutomation.ts`, `lib/whatsapp/broadcasts.ts` (`recordOptOut`; the module is also imported by the client for constants, so move the Firestore part to a server file) | 2 d |
| B | Meta / Facebook CRM + automation | `app/api/facebook/leads/webhook`, `facebook/sync-leads`, `facebook/crm-events`, `facebook/meta-leads`, `automation/meta-leads`, `ai/ad-coach`, `ai/sales-assistant`, `lib/leadAutomation.ts`, `lib/metaServer.ts`. `lib/metaLeadsCrm.ts` is used by **both** sides, so split out a server copy and keep the browser one. | 1.5 d |
| C | Vouchers | `lib/voucherServer.ts`, `app/api/vouchers/claim`, `vouchers/card/[code]`, `vouchers/code/[code]` (+`/image`, `/pdf`), `app/api/admin/vouchers` | 0.5 d |
| D | AI planner | `app/api/planner/itinerary/analyze`, `planner/itinerary/lead`, `planner/lead`, `planner/game-data`, `lib/planner/records.ts`, `lib/planner/catalog.ts` (read-only, optional), `app/api/tailored-travel/{smart-search,find-packages,share-plan,_lib/plannerServer.ts}` | 1 d |
| E | Agent platform | `app/api/agent/{analytics,bookings,import-packages,notifications,packages,packages/[id],profile,quotations,quotations/[id],register,sessions,subagents,subagents/[id],track}`, `app/api/admin/agents`, `app/api/admin/agents/[id]`. Also add token checks; today they trust `agentId` from the query/body. | 2–2.5 d |
| F | Auth / OTP | `app/api/auth/send-otp`, `auth/verify-otp`, `lib/admin/serverAuth.ts` | 0.5 d |
| G | Public form endpoints | `app/api/reviews`, `app/api/vendor-leads`, `app/api/vendors/[vendorKey]` | 0.5 d |
| H | Admin tools (read public collections only; optional) | `app/api/admin/embed-packages`, `admin/packages/ai-create`, `admin/packages/ai-images`, `admin/seo/optimize`, `admin/quotes/upload-image`, `lib/packages/aiCreate.ts`, `lib/seo/optimizer.ts`. **Delete `app/api/dump`**. | 0.5 d |
| I | Small browser changes the target rules need | `NewsletterSubscription.tsx` (doc id = email), optional PII split (below), blog `published` filter | 0.5–1 d (+ PII split 2–3 d) |
| J | Rules rollout | Emulator tests, Rules Playground, deploy, watch for `permission-denied` in Vercel logs | 1–1.5 d |

**Total: about 10–12 developer days** without the PII split, or 13–15 days with it. Groups A–G can ship one at a time. Interim rules can go out first.

---

## 3. Inventory — every collection the code touches

Counts: **41 top-level collections + 2 sub-collections** (`whatsapp_broadcasts/*/recipients`, `whatsapp_contact_lists/*/contacts`). A legacy name, `vouchers`, appears only in the `WHATSAPP_REF_FIELDS` allow-list in `lib/whatsapp.ts`.

Legend:
- **Anon**: public website visitor.
- **Cust/Agent**: logged-in customer, agent, sub-agent or decorator.
- **Admin UI**: signed-in staff using the client SDK, with the permission key from `lib/admin/nav.ts`.
- **Server**: unauthenticated client SDK in `app/api/**`, `lib/*` or a server component.
- R = read, C = create, U = update, D = delete.
- "Interim" says what the interim ruleset can lock today.

| Collection | Anon | Cust/Agent | Admin UI (perm) | Server (unauth) | PII | Interim (today) |
|---|---|---|---|---|---|---|
| `users` | — | R/C/U own doc (`AuthContext`, `signup`, `agent-register` writes **role:'agent'** itself) | R/U all (`users`); agents page R; CRM picker R (`leads`) | R (`serverAuth`, `agent/quotations/[id]`), list by email (`auth/send-otp`), U role/agentStatus (`agent/register`, `admin/agents/[id]`, `agent/subagents/**`) | email, name, phone | **Partly:** block self-escalation and any write of role `admin` or `permissions`. Reads stay open. |
| `email_otps` | — | — | — | C/R/U/D (`auth/send-otp`, `auth/verify-otp`) | email + **plaintext OTP** | No. Hash it (see risks). |
| `packages` | R | R (dmc dashboards) | R/C/U/D (`packages`, `ai-generator`) | R only (sitemap, pages, planner, ai-create, seo, embed, import, dump) | — | **Yes:** public read, staff write |
| `destinations` | R | — | R/C/U/D (`destinations`) | R only | — | **Yes** |
| `blogs` | R, U `views` +1 (`ViewCounter`) | — | R/C/U/D (`blogs`, `authors`) | R only | — | **Yes** |
| `authors` | R | — | C/U/D (`authors`, `blogs`) | R only (server pages) | — | **Yes** |
| `testimonials` | R | — | C/U/D (`testimonials`) | — | names | **Yes** |
| `jobs` | R | — | C/U/D (`jobs`) | — | — | **Yes** |
| `reviews` | R (`Testimonials`, presentation) | — | — | C (`api/reviews`) | names | Writes: create open, U/D staff |
| `leads` | C (`LeadForm`, homepage, `TailoredResultsChat`) | — | R/U/D (`leads`) | C (FB webhook/sync, WhatsApp webhook, `voucherServer`, `planner/records`); R (broadcast audience, `resolveWhatsAppRef`, sales-assistant, `metaServer`) | name, **mobile**, email | U/D staff only; R stays open |
| `ai_planner_leads` | C (`ConversationAgent`) | — | R/U/D (`leads`) | R (broadcast audience, `resolveWhatsAppRef`) | name, **mobile** | U/D staff only; R open |
| `ai_planner_chats` | C/U own session (`ConversationAgent` setDoc merge) | — | R/D (admin only) | — | free-text trip details | **Yes:** no public read |
| `contact_messages` | C (`app/contact`) | — | R/U/D (`contacts`) | R (audience, `resolveWhatsAppRef`) | name, **phone**, email | U/D staff; R open |
| `job_applications` | C (`app/careers`) | — | R/U/D (`careers`, `jobs`) | — | name, **phone**, email, CV text | **Yes:** no public read |
| `newsletter_subscribers` | C + **list query by email** (dedupe) | — | R/U/D (`subscribers`) | — | email | After a ~5-line code change (doc id = email) |
| `customer_itineraries` | — | — | R/C/U/D (`create-itinerary`, `customer-records`) | R (audience, `resolveWhatsAppRef`) | **clientPhone**, name, prices | Writes staff only; R open |
| `vendors` | — | — | R/C/U/D (`vendors`) | R/U (`api/vendors/[vendorKey]`, `api/vendor-leads` counters) | vendor contacts | No (deletes staff only) |
| `vendor_leads` | via API | — | R/U/D (`vendors`) | C (`api/vendor-leads`); R (`resolveWhatsAppRef`) | **userPhone** | U/D staff; R/C open |
| `voucher_cards` | via API | — | R/C/U (`vouchers`, `leads`) | R, tx.update `claimCount` (`voucherServer`) | — | C/D staff; anon U limited to `claimCount+1` |
| `voucher_claims` | via API | — | R/U (`vouchers`, `leads`) | C/R/U (`voucherServer`, `api/vouchers/code`, `api/admin/vouchers`) | **phone**, name | No (deletes staff only) |
| `meta_lead_crm` | — | — | R/C/U (`leads`, via `lib/metaLeadsCrm.ts`) | R/U (`leadAutomation`, `whatsappAutomation`, `facebook/crm-events`, `automation/meta-leads`) | **phone**, email | No (deletes staff only) |
| `meta_lead_messages` | — | — | R (`leads`) | C/R (`leadAutomation`) | message text | No |
| `meta_ad_coach_reports` | — | — | R (`leads`) | C (`ai/ad-coach`) | — | No |
| `automation_settings` | — | — | via API | R/U (`leadAutomation`) | — | No |
| `planner_activity` | — | — | R (`leads`) | C/U (`lib/planner/records.ts`) | search text, sometimes contact | No |
| `whatsapp_chats` | — | — | R, U `unreadCount` (`whatsapp`, `leads`) | C/R/U (webhooks, send, broadcasts, FB webhook) | **doc id = phone**, name | No |
| `whatsapp_messages` | — | — | R (`whatsapp`, `leads`) | C/R/U (webhooks, send, status, broadcasts) | **phone**, message text | No |
| `whatsapp_broadcasts` (+`recipients`) | — | — | R (`whatsapp`, `leads`) | C/R/U (`api/whatsapp/broadcasts/**`) | **recipient phones** | No |
| `whatsapp_contact_lists` (+`contacts`) | — | — | via API | C/R/U (`broadcasts/_lib/lists.ts`) | **phones** | No |
| `whatsapp_optouts` | — | — | — | C/R/D (`recordOptOut`, broadcast server) | phone key | No (server deletes on opt-in) |
| `agents` | R (server component `/tailored-travel/[agentSlug]`) | R/U own (`AgentSettings`, dmc dashboard) | R (`agents`, admin only) | C/R/U (`agent/register`, `admin/agents/[id]`, `agent/*`, `find-packages`) | agent business contact | No |
| `agent_packages` | R (tailored-travel steps, `AgentPackageFinder`) | — | R/D (admin agents page) | C/R/U/D (`agent/packages/**`) | — | No (server deletes) |
| `agent_bookings` | — | R own (`CustomerRecords`) | R/D (admin agents) | C/R/U (`agent/bookings`, analytics, `admin/agents`) | customer details | No |
| `agent_customers` | — | R/U own (`CustomerRecords`) | R/D (admin agents) | C/R (`agent/bookings`, analytics) | **customer phones** | No |
| `agent_notifications` | — | R own (dmc dashboard onSnapshot) | — | C/R/U (`agent/notifications`, bookings, quotations) | customer names | No |
| `quotations` | — | R own (dmc dashboard) | — | C/R/U (`agent/quotations/**`) | customer names | No |
| `sub_agents` | — | — | — | C/R/U/D (`agent/subagents/**`, quotations) | names, emails | No (server deletes) |
| `agent_sessions` | — | — | — | C (`agent/sessions`, `agent/track`) | visitor info | Delete can close |
| `shared_plans` | R by id, U `messages`/`package` (`shared-plan/[id]`, `CollaborativeChat`) | — | — | C (`tailored-travel/share-plan`) | trip details | No |
| `decor_catalog` | — | R/C/U/D own (`lib/decorStore.ts`, `vendorId == uid`) | — | — | — | **Yes:** owner only |
| `decor_designs` | R by id, U comments/approval/booking (`/design/[id]`) | R/C/U/D own | — | — | client name + **phone** in `approval` | **Yes:** owner + limited public update |

**Collections that are entirely server-only after migration**, so the target rules deny all browser writes: `email_otps`, `whatsapp_messages`, `whatsapp_broadcasts`(+recipients), `whatsapp_contact_lists`(+contacts), `whatsapp_optouts`, `planner_activity`, `meta_lead_messages`, `meta_ad_coach_reports`, `automation_settings`, `agent_sessions`, `quotations`, `sub_agents`, `agent_packages`, `agent_bookings` (create), `voucher_claims` (create), `vendor_leads` (create), `reviews` (create), `shared_plans` (create).

---

## 4. Target rules (summary of `firestore.rules`)

- **Helpers:**
  - `signedIn()`
  - `me()`: reads `users/{auth.uid}`
  - `isAdmin()`: `role == 'admin'` and not `isActive == false`
  - `hasPerm(p)` / `hasAnyPerm([...])`: admin, or the key is in `permissions`, the same logic as `canAccessItem`
  - `isStaff()`
  - validation helpers: `onlyKeys`, `changedOnly`, `reqStr` with length limits, phone/email regex, `freshInbox()` (public submissions must arrive as `status:'new'` and `read:false`)
- **`users/{uid}`:**
  - You can read only your own doc, unless you are staff.
  - Self-create is allowed only with role `user` or `agent`, empty `permissions`, and `agentStatus` set to pending.
  - Self-update can never touch `role`, `permissions`, `isActive`, `agentStatus`, `agentSlug`, `agentId`, `parentAgentId` or `isAdmin`.
  - A `users`-permission holder can manage non-admin accounts, but cannot create an admin or hand out `users`.
  - Only admins can delete.
- **Public catalog** (`packages`, `destinations`, `blogs`, `authors`, `testimonials`, `jobs`, `reviews`):
  - Everyone can read.
  - Writes are limited to the matching permission key.
  - Blogs allow an anonymous `views + 1` and nothing else.
- **Public inputs** (`leads`, `ai_planner_leads`, `contact_messages`, `job_applications`, `newsletter_subscribers`, `ai_planner_chats`):
  - **Create-only**, with an exact key allow-list, length limits and phone/email format checks.
  - Never publicly readable.
  - Staff read by key: `leads`, `contacts`, `careers`/`jobs`, `subscribers`. AI chats are admin-only, matching nav `adminOnly`.
- **Staff business data:**
  - `customer_itineraries` by `create-itinerary`/`customer-records`.
  - `vendors`/`vendor_leads` by `vendors`.
  - `voucher_*` by `vouchers`/`leads`.
  - `meta_lead_crm` by `leads`. The admin UI writes it directly.
- **Agents:**
  - `agents/{agentId}` is publicly readable for white-label pages. The owner can update, but not `status`/approval/slug fields.
  - `agent_bookings`, `agent_customers`, `agent_notifications`, `quotations` and `sub_agents` are readable only where `agentId == auth.uid` (or `subAgentId`), plus the `agents` permission.
  - Browsers write only `agent_customers` updates and notification `isRead`.
- **Decor:**
  - `vendorId == auth.uid` for the catalog and design lists.
  - Designs can be fetched by id (share link). Anonymous updates may touch only `comments`, `status → 'approved'`, `approval` and `booking`.
- **Server-only:** browser writes are denied. Staff can read where the admin UI needs it, e.g. the WhatsApp inbox. Staff may set `whatsapp_chats.unreadCount` to 0.

### Field-level PII: Firestore can't hide single fields

A read rule applies to the whole document. If a staff member without phone access can read a lead, they can read `lead.mobile` with the SDK, whatever `lib/admin/privacy.tsx` shows on screen. To really keep numbers admin-only, split them into a sub-doc readable only by admins, for example `leads/{id}/private/contact` → `{ mobile, email }`, with `match /{col}/{id}/private/{d} { allow read: if isAdmin(); }`.

The staff UI already sends a `ref` (`collection/id`) to the server, and `resolveWhatsAppRef` looks the number up on the server. So WhatsApp actions keep working for staff without the number ever reaching their browser.

Candidates, in priority order:

| Collection | Fields to move |
|---|---|
| `leads` | `mobile`, `phone`, `phoneNumber`, `email` |
| `ai_planner_leads` | `mobile`, `email` |
| `contact_messages` | `phone`, `email` |
| `meta_lead_crm` | `phone`, `phoneNorm`, `email` (the `phoneNorm` lookup moves to the server) |
| `customer_itineraries` | `clientPhone`, `phone`, `clientEmail` |
| `voucher_claims` | `phone`, `phoneNorm` |
| `vendor_leads` | `userPhone`, `phone` |
| `decor_designs.approval.phone` | → `decor_designs/{id}/private/approval` |
| `whatsapp_chats` / `whatsapp_messages` | The **doc id is the phone number** and messages carry `senderPhone`. Hiding these means re-keying chats by a hash. That is a large change, so the honest stance is that the `whatsapp` permission implies seeing numbers. |

Not worth splitting: `job_applications` (the careers reviewer needs the phone) and `agent_customers` (the agent owns them).

---

## 5. Interim rules: what can be locked TODAY

See the commented block at the bottom of `firestore.rules`. Each item was checked with grep.

**Fully locked today** (no server route or server component touches them):
- `job_applications`, `ai_planner_chats`: public create, no public read
- `decor_catalog`, `decor_designs`: owner-scoped
- `packages`, `destinations`, `blogs`, `authors`, `testimonials`, `jobs`: the server only reads them, so writes become staff-only

**Writes tightened, reads must stay open** (the server reads them unauthenticated):
- `leads`, `ai_planner_leads`, `contact_messages`: server code only ever `addDoc`s these, so update and delete become staff-only.
- `customer_itineraries`: writes are staff-only.
- `vendor_leads`, `reviews`: update and delete are staff-only.
- `voucher_cards`: create and delete are staff-only. An anonymous update may only do `claimCount + 1` and `lastClaimAt`, which is exactly what `voucherServer`'s transaction writes.
- `users`:
  - Signed-in users can't change their own `role`, `permissions`, `isActive` or `agentStatus`.
  - Unauthenticated writes (the server routes) can never set role `admin`, change `permissions`, or touch an admin's doc.
  - This closes the "make myself admin" path. It does **not** stop an anonymous caller from setting someone's role to `agent`/`subagent` or changing `agentStatus`; that needs the Admin SDK.

**Deletes:** only these collections are deleted by unauthenticated server code: `email_otps` (verify-otp), `agent_packages` (`agent/packages/[id]`), `sub_agents` (`agent/subagents/[id]`) and `whatsapp_optouts` (opt back in). Every other delete becomes staff-only (`isStaff()`) or admin-only.

**Still fully open until the Admin SDK lands:**
- `voucher_claims`, `vendors`, `agents`, `agent_*`, `quotations`, `sub_agents`
- `shared_plans`, `meta_*`, `automation_settings`, `planner_activity`
- every `whatsapp_*` collection, `email_otps`
- reads of every PII collection above

**Two code changes that need no Admin SDK and are worth doing now:**
1. **Hash OTPs.** In `send-otp`, store `sha256(otp + OTP_PEPPER)` instead of `otp`, and compare hashes in `verify-otp`. Reading the doc then reveals nothing useful.
2. **Newsletter dedupe.** In `NewsletterSubscription.tsx`, replace the `where('email','==',…)` query with `setDoc(doc(db,'newsletter_subscribers', email), …)`. A duplicate becomes a denied *update*; catch `permission-denied` and show "already subscribed". Public list reads can then be closed.

---

## 6. Top risks found

1. **Role escalation to admin (critical).** No rules exist on `users/{uid}`. Any logged-in user, or anyone, can `setDoc(users/<their uid>, {role:'admin'}, {merge:true})`.
   - `AuthContext` and `lib/admin/serverAuth.ts` both trust that field. That one write gives the admin UI **and** every `requireStaff` API route: broadcasts, AI tools, quotes.
   - `/agent-register` already writes `role:'agent'` from the browser.
   - Separately, the `users` permission lets a non-admin grant any permission, including `users`, through the Team page. In practice it equals admin. The target rules restrict this.
2. **Plaintext OTPs are world-readable (critical).** `email_otps/{email}` holds the 6-digit code. Anyone can read it, or reset `attempts`, and pass email verification for any address. Fix it today by hashing (above).
3. **Bulk PII exposure.** Anyone with the public config can download every lead, contact message, Meta CRM record, voucher claim, customer itinerary, newsletter email and job application (with phone numbers), plus the full WhatsApp inbox. `whatsapp_chats` doc ids *are* phone numbers. The admin privacy masking does not help against this.
4. **Server routes that check nobody, which become *more* dangerous after migration.** These have no caller check:
   - `app/api/admin/agents` and `admin/agents/[id]` (approve or suspend any agent)
   - `admin/vouchers`, `admin/embed-packages`, `api/dump` (dumps the catalog)
   - all of `app/api/agent/**`, which trusts `agentId` from the query string or body. That is an IDOR on other agents' bookings, customers and quotations.

   Once these use the Admin SDK they bypass rules, so verifying the ID token has to ship **in the same change**.
5. **Unrestricted tampering and deletes.** Anyone can:
   - delete or rewrite `packages`, `blogs` or `leads`,
   - edit `voucher_cards.claimCount` or claims,
   - mark agents `active`,
   - inject rows into an existing broadcast's `recipients` sub-collection or a contact list. When staff press Send, the business WhatsApp number then messages arbitrary numbers, which risks a ban.

   Most of this is closed by the interim rules. The broadcast and recipient tampering is closed only by the Admin SDK.

Smaller notes:
- `decor_designs` exposes the client's approval phone to anyone holding the share link.
- `agents/{id}` is publicly readable and may contain private business fields.
- Firebase **Storage** rules (images uploaded by `decorStore`, quotes and AI images) were out of scope. Check them as well.

---

## 7. Testing (nothing here installs or deploys anything)

The repo does not install `firebase-tools`. Use a global install or `npx firebase-tools@13` when you are ready.

1. **Emulator:** `firebase emulators:start --only firestore` (add `,auth` to test signed-in cases). It loads `firestore.rules` through `firebase.json`.
   - Point a test script at `localhost:8080` with `connectFirestoreEmulator(db,'localhost',8080)`.
   - Or write unit tests with `@firebase/rules-unit-testing` using `assertSucceeds` / `assertFails` for each row of the table: anon create lead OK, anon read lead FAIL, self role → admin FAIL, staff with `contacts` reads `contact_messages` OK, and so on.
   - To try the INTERIM set, paste it over the target block in a scratch copy of the file first.
2. **Rules Playground:** Firebase console → Firestore → Rules → *Rules Playground*. Paste the draft (don't Publish), then simulate:
   - `get /users/<uid>` as unauthenticated
   - `update /users/<your uid>` with `{role:'admin'}` while authenticated as yourself
   - `create /leads/x` with a valid payload, and with an extra key
3. **Indexes:** before running `firebase deploy --only firestore:indexes`, export the live indexes with `firebase firestore:indexes --project travelzada > firestore.indexes.json`. Otherwise the CLI offers to delete every index that is not in the empty placeholder.
4. **Rollout:**
   - Deploy rules only, with `firebase deploy --only firestore:rules --project travelzada`.
   - Watch the Vercel logs and the browser console for `permission-denied` for a day.
   - Keep the previous ruleset handy: the console keeps rule history, so you can roll back in one click.

## Added later

| Collection | Who reads / writes | Rule |
|---|---|---|
| `hotels` | Signed-in admin UI only (quote builder auto-capture, /admin/hotels) | staff with `packages` or `create-itinerary`; delete = admin |
| `flights` | Signed-in admin UI only (quote builder auto-capture, /admin/flights) | staff with `packages` or `create-itinerary`; delete = admin |

Both work the same under the INTERIM and TARGET rules (no server routes touch them). When public hotel/route pages are built, allow public read of docs where `publishable == true`.
