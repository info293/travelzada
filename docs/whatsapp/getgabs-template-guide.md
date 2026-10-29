# Travelzada × GetGabs — WhatsApp Template Build Guide

> **Who this is for:** an AI assistant (Claude extension) that will create Travelzada's WhatsApp message templates in GetGabs, and the Travelzada owner supervising it.
> **Goal:** create the full template library in Section 5 in GetGabs, get them approved by Meta, and record each one's status.
> Last updated: 26 Oct 2026.

---

## 0. Read this first (for the human, before handing over)

Answer these four questions **before** the assistant starts. Put the answers in the "Decisions" block below; the assistant must not guess them.

1. **Which WhatsApp number is connected to GetGabs?** The site currently uses two numbers:
   - `+91 99299 62350`: the "chat with us" links on the website.
   - `+91 85298 70220`: the automated lead messages sent by the website code (`lib/whatsappAutomation.ts`) through Meta's Cloud API directly.

   A number can be connected to **only one** WhatsApp API provider at a time. If you move `+91 85298 70220` to GetGabs, the website's current automation (templates `tz_lead_welcome` and `tz_followup`) stops working until it's rewired. Ask GetGabs support: *"Will you connect to my existing WABA (ID 1644894666204677), or create a new one?"* If they use the existing WABA, the templates already there are shared, so don't recreate them.
2. **Templates in GetGabs are created per number/WABA.** Make sure you're logged into the right account and number.
3. **Language code:** use `en` (English) for everything, to match the existing templates. Whatever code a template is created with must also be used when sending it.
4. **Offers:** only create templates for offers you really run. Templates 30 (referral) and 33 (seasonal offer) mention discounts and prices, so skip them if you don't run those offers.

```
DECISIONS (fill in before starting)
GetGabs account login email: ____________________
Connected WhatsApp number:   ____________________
Same WABA as Meta Cloud API (1644894666204677)?  yes / no / unknown
Language code:               en
Method:                      A (dashboard)  /  B (API)
Templates to SKIP:           ____________________
Owner's test number:         ____________________
```

---

## 1. Rules for the assistant (non-negotiable)

1. **Never message real customers.** Only send test messages to the owner's test number in the Decisions block.
2. **Never delete or edit existing approved templates**, especially `tz_lead_welcome` and `tz_followup`. If a name already exists, skip it and record it as "already exists".
3. **Never paste API keys or session tokens** into chat, files, commits or screenshots. If you need a key, ask the owner to enter it.
4. **Stop and ask the owner** if GetGabs shows any prompt about migrating a phone number, connecting a new number, billing, or deleting anything.
5. **Copy template text exactly** from Section 5, including line breaks and emoji. Don't rewrite copy to "improve" it: rejections are easier to diagnose when the text is known.
6. **Work in batches** (Section 3). After each batch, update the tracker (Section 6) and report back.
7. If the GetGabs screen differs from what this guide describes, **match fields by meaning** (e.g. "Template name" = name). Never guess a category or invent a button.

---

## 2. WhatsApp template rules (Meta) — check every template against these

| Item | Rule |
|---|---|
| Name | lowercase letters, digits and `_` only. Unique per language. All Travelzada names start with `tz_`. |
| Category | `UTILITY` = about something the customer started (enquiry, quote, booking, payment, trip logistics). No promotion. `MARKETING` = anything promotional, re-engagement, offers, reviews. `AUTHENTICATION` = OTP only. Meta may re-categorise a template; accept it and record the change. |
| Header | Optional. Text (max 60 chars, max 1 variable) **or** Image / Video / Document. |
| Body | Max 1024 chars. Variables are `{{1}}`, `{{2}}` … in order, with no gaps. A variable must not be the very first or very last thing in the body, and two variables must not sit side by side. |
| Sample values | Every variable needs a realistic sample value. Missing samples are the #1 cause of rejection. |
| Footer | Optional, max 60 chars, no variables. Default footer: `Travelzada · Journeys designed for two` |
| Buttons | Up to 10 total. Quick reply text max 25 chars. Max 2 URL buttons and 1 phone button. A URL button's variable can only go at the **end** of the URL, and the domain must be fixed. |
| Links | No URL shorteners (bit.ly etc.). Use `https://www.travelzada.com/...`. |
| Marketing | Every marketing template must include an opt-out quick reply (`Stop promotions` / `Stop messages`). |

---

## 3. Order of work

| Batch | Templates | Why first |
|---|---|---|
| **P1** | 1, 2, 4, 7, 8, 11, 12, 13, 19, 38 | Day-to-day sales and booking messages |
| **P2** | 9, 14–18, 20–27, 39 | Payments, pre-trip, on-trip |
| **P3** | 5, 6, 10, 28–37, 40 | Marketing, campaigns, carousel, OTP |

Per batch: create → submit → wait for approval (minutes to 24 h) → fix rejections → send 1 test of each approved template to the owner's test number → update tracker.

---

## 4. How to create a template in GetGabs

Use **Method A** (dashboard) unless the owner chose B.

### Method A — GetGabs dashboard (browser)

1. Log in at `https://app.getgabs.com`.
2. Open the **Templates** section (often under *WhatsApp → Templates* or *Manage Templates*). Click **Create / New Template** (choose *Custom template* if asked).
3. Fill in from Section 5:
   - **Template name** → `name`
   - **Category** → `category`
   - **Language** → English (`en`)
   - **Header** → choose None / Text / Image / Document as listed. For media headers, upload a sample file: an image for Image, any sample PDF for Document. The sample is only for review; the real file is sent at send time.
   - **Body** → paste the body exactly
   - **Variable samples** → fill each `{{n}}` with the sample listed
   - **Footer** → footer text
   - **Buttons** → add each button in the listed order. Quick reply = "Quick reply"; URL = "Visit website" (choose *Dynamic* when the URL ends in `{{1}}` and enter the sample URL); Call = "Call phone number".
4. Check the preview on the right matches the spec, then click **Submit** (it may say *Save & Submit* or *Submit for approval*).
5. Record the result in the tracker.

### Method B — GetGabs API (for a code-capable assistant)

API docs: https://documenter.getpostman.com/view/40451098/2sAYJ1k2VV/

1. **Session token**: `GET https://app.getgabs.com/partners/getSessionToken` with JSON body `{"api_key": "<API KEY>"}`. Read the API key from an environment variable (`GETGABS_API_KEY`), never hard-code it.
2. **Check what exists**: `POST https://app.getgabs.com/partners/api/template/fetchAll`, header `Authorization: Bearer <session token>`, JSON `{"adminauthToken": "<API KEY>", "searchValue": "tz_"}`. Skip names that already exist.
3. **Create**: `POST https://app.getgabs.com/partners/template/designtemplate` as **multipart/form-data**, headers `Authorization: Bearer <session token>` and `X-Requested-With: XMLHttpRequest`.

| Spec field | form-data field |
|---|---|
| name | `templatename` |
| language | `language` (`en`) |
| category | `category` (`UTILITY` / `MARKETING` / `AUTHENTICATION`) |
| body | `body` |
| body samples | `bodyVars[0]`, `bodyVars[1]`, … in order |
| footer | `previewfooterText` |
| image header | `headerType=Image` + `headerFile` (file upload) |
| quick replies | `quickReplyButtonText[0]`, `quickReplyButtonText[1]`, … |
| URL button | `websiteButtonText[]`, `previewWebsiteUrl[]` (URL with `{{1}}`), `UrlVars[]` (sample value) |
| call button | `callbuttonText`, `phoneCountry` (`91`), `prevviewphoneNumber` |
| OTP | `copyCodeButtonTextAuthTemp`, `codeexpirationminutes` |
| submit | `savedata=save_submit` |

4. **Carousel** (template 36): `POST https://app.getgabs.com/partners/template/CarouselTemplateDesignProcess`, with fields `mainBody`, `carouselCards` (JSON string) and `carouselFiles[n]`. See the Postman example "5. Create Carousel Template".
5. **Fields the docs don't show:** the text header, the document header, and mixing quick reply + URL buttons in one template. Create **one** such template through the dashboard with the browser DevTools Network tab open, copy the exact form-data field names from the `designtemplate` request, then use those. Test one template of each shape before running the batch.
6. Write a small script that reads the specs, submits one template at a time, waits 2 s between calls, and logs the response for each name. Do not retry a failed name more than once without reading the error.

---

## 5. Template library

Placeholders in samples: names are fictional. `{{1}}` is always the customer's first name unless stated.
**Default footer** unless stated: `Travelzada · Journeys designed for two`

### A. Enquiries & leads

#### 1. `tz_enquiry_received`
- **Category:** UTILITY · **When:** right after someone submits an enquiry
- **Header:** none
- **Body:**
```
Hi {{1}}, thank you for reaching out to Travelzada! 💛

We've received your request for a {{2}} trip to {{3}}. Your personal travel designer will share a free, day-by-day itinerary within {{4}}.

Reply here anytime with your dates, budget or special wishes.
```
- **Samples:** Priya · honeymoon · Bali · 2 hours
- **Buttons:** Quick reply `Share my dates` · Quick reply `Call me back`

#### 2. `tz_enquiry_missed_call`
- **Category:** UTILITY · **When:** a planner called the lead and couldn't reach them
- **Header:** none
- **Body:**
```
Hi {{1}}, this is {{2}} from Travelzada. I tried calling you about your {{3}} trip but couldn't get through.

When would be a good time to talk? You can also simply reply here.
```
- **Samples:** Priya · Ananya · Kashmir
- **Buttons:** Quick reply `Call me now` · Quick reply `Call me later` · Quick reply `Chat on WhatsApp`

#### 3. `tz_lead_welcome` — ALREADY EXISTS
Created by the website code. **Do not recreate it.** Record it as "exists" in the tracker.

#### 4. `tz_itinerary_ready`
- **Category:** UTILITY · **When:** the personalised/AI itinerary is ready
- **Header:** Text: `Your itinerary is ready ✨`
- **Body:**
```
Hi {{1}}, your personalised {{2}} itinerary is ready!

It covers all {{3}} nights: hand-picked hotels, transfers, experiences and romantic extras, with every cost itemised.

Take a look and tell us what you'd like to change. Edits are free and unlimited.
```
- **Samples:** Priya · Bali honeymoon · 6
- **Buttons:** URL `View itinerary` → `https://www.travelzada.com/shared-plan/{{1}}` (sample: `https://www.travelzada.com/shared-plan/abc123`) · Quick reply `Customise it`

#### 5. `tz_lead_followup_day5`
- **Category:** MARKETING · **When:** 5 days after enquiry, no reply (the day-2 follow-up `tz_followup` already exists)
- **Header:** none
- **Body:**
```
Hi {{1}}, still dreaming about {{2}}? 🌅

Our travel designers have put together a few ideas couples loved this season: quiet stays, private experiences and easy flights.

Would you like us to send them over?
```
- **Samples:** Priya · Maldives
- **Buttons:** Quick reply `Yes, send ideas` · Quick reply `Change destination` · Quick reply `Stop messages`

#### 6. `tz_lead_last_nudge`
- **Category:** MARKETING · **When:** final message to an unresponsive lead (around day 10)
- **Header:** none
- **Body:**
```
Hi {{1}}, we don't want to keep messaging if your plans have changed.

Should we keep your {{2}} trip open? If you're ready later, just say hello here and we'll pick up where we left off.
```
- **Samples:** Priya · Kashmir
- **Buttons:** Quick reply `Yes, keep it open` · Quick reply `Plans postponed` · Quick reply `Stop messages`

### B. Quotations & proposals

#### 7. `tz_quote_sent`
- **Category:** UTILITY · **When:** sending a quotation PDF
- **Header:** Document (sample: any PDF named `Travelzada-Quote.pdf`)
- **Body:**
```
Hi {{1}}, here is your quotation for {{2}} ({{3}}).

Total for two: {{4}}, fully itemised, with no hidden charges. These prices are held until {{5}}.

Tell us if you'd like to change hotels, nights or add a surprise.
```
- **Samples:** Priya · Kashmir Honeymoon · 6N/7D · ₹76,000 · 15 Nov 2026
- **Buttons:** Quick reply `Looks good, book it` · Quick reply `Request changes` · Quick reply `Call me back`

#### 8. `tz_quote_revised`
- **Category:** UTILITY · **When:** sending an updated quote
- **Header:** Document (sample PDF)
- **Body:**
```
Hi {{1}}, we've updated your {{2}} quotation with the changes you asked for: {{3}}.

New total for two: {{4}}. The revised plan is attached.
```
- **Samples:** Priya · Bali · upgraded to a private pool villa · ₹1,12,000
- **Buttons:** Quick reply `Confirm booking` · Quick reply `More changes`

#### 9. `tz_quote_expiring`
- **Category:** UTILITY (Meta may change it to MARKETING; that's fine) · **When:** 1 day before the price hold ends
- **Header:** none
- **Body:**
```
Hi {{1}}, a quick reminder that the prices in your {{2}} quotation are held until {{3}}.

After that, hotel and flight rates may change. Reply here if you have any questions.
```
- **Samples:** Priya · Kashmir · tomorrow, 6 PM
- **Buttons:** Quick reply `Confirm now` · Quick reply `Talk to my planner`

#### 10. `tz_hotel_options`
- **Category:** MARKETING · **When:** sharing hotel choices for a destination
- **Header:** Image (sample: a hotel/resort photo)
- **Body:**
```
Hi {{1}}, here are our favourite couple-friendly stays in {{2}} 🏝️

Each one is chosen for privacy, views and romantic touches. Pick a favourite and we'll build your plan around it.
```
- **Samples:** Priya · Bali
- **Buttons:** URL `See all stays` → `https://www.travelzada.com/destinations/{{1}}` (sample: `https://www.travelzada.com/destinations/bali`) · Quick reply `Stop promotions`

### C. Booking & payments

#### 11. `tz_booking_confirmed`
- **Category:** UTILITY · **When:** booking confirmed
- **Header:** Document (sample PDF named `Booking-Confirmation.pdf`)
- **Body:**
```
Hi {{1}}, your {{2}} is confirmed! 🎉

Booking ID: {{3}}
Travel dates: {{4}}

Your trip coordinator {{5}} will be your single point of contact from now until you're home. Your confirmation is attached.
```
- **Samples:** Priya · Bali honeymoon · TZ-24871 · 12–18 Feb 2027 · Ananya
- **Buttons:** URL `View booking` → `https://www.travelzada.com/shared-plan/{{1}}` (sample: `https://www.travelzada.com/shared-plan/abc123`)

#### 12. `tz_payment_received`
- **Category:** UTILITY · **When:** any payment received
- **Header:** none
- **Body:**
```
Hi {{1}}, we've received your payment of {{2}} for booking {{3}}. Thank you! 💛

Balance due: {{4}}, by {{5}}.

Your receipt will follow by email.
```
- **Samples:** Priya · ₹40,000 · TZ-24871 · ₹36,000 · 20 Jan 2027
- **Buttons:** none

#### 13. `tz_payment_reminder`
- **Category:** UTILITY · **When:** 3 days before a balance is due
- **Header:** none
- **Body:**
```
Hi {{1}}, a gentle reminder that the balance of {{2}} for your {{3}} trip (booking {{4}}) is due on {{5}}.

Paying on time keeps your hotel and flight bookings secure.
```
- **Samples:** Priya · ₹36,000 · Bali · TZ-24871 · 20 Jan 2027
- **Buttons:** Quick reply `Share payment details` · Quick reply `I've already paid`

#### 14. `tz_payment_link`
- **Category:** UTILITY · **When:** sending a payment link
- **Header:** none
- **Body:**
```
Hi {{1}}, here is your secure payment link for booking {{2}}.

Amount: {{3}}
Link valid until: {{4}}

Tap the button below to pay.
```
- **Samples:** Priya · TZ-24871 · ₹36,000 · 20 Jan 2027
- **Buttons:** URL `Pay securely` → **ASK THE OWNER** which payment gateway is used. The URL must be fixed up to the variable, e.g. Razorpay `https://rzp.io/rzp/{{1}}`. If there's no gateway, skip this template.

#### 15. `tz_booking_cancelled`
- **Category:** UTILITY
- **Header:** none
- **Body:**
```
Hi {{1}}, as requested, booking {{2}} for {{3}} has been cancelled.

A refund of {{4}} will be processed to your original payment method within {{5}}. We hope to plan something special for you two again.
```
- **Samples:** Priya · TZ-24871 · Bali · ₹30,000 · 7 working days
- **Buttons:** none

#### 16. `tz_refund_processed`
- **Category:** UTILITY
- **Header:** none
- **Body:**
```
Hi {{1}}, your refund of {{2}} for booking {{3}} has been processed today.

It should reflect in your account within {{4}}. Reply here if you don't see it by then.
```
- **Samples:** Priya · ₹30,000 · TZ-24871 · 5–7 working days
- **Buttons:** none

### D. Before the trip

#### 17. `tz_documents_needed`
- **Category:** UTILITY
- **Header:** none
- **Body:**
```
Hi {{1}}, to confirm your {{2}} hotels and transfers we need: {{3}}.

Please share them here by {{4}}. Everything is stored securely and used only for your bookings.
```
- **Samples:** Priya · Bali · passport copies of both travellers · 10 Jan 2027
- **Buttons:** Quick reply `Uploading now` · Quick reply `Need help`

#### 18. `tz_visa_update`
- **Category:** UTILITY
- **Header:** none
- **Body:**
```
Hi {{1}}, an update on your {{2}} visa: {{3}}.

Reply here if you have any questions.
```
- **Samples:** Priya · Bali · both e-visas have been approved and emailed to you
- **Buttons:** none

#### 19. `tz_travel_kit_ready`
- **Category:** UTILITY · **When:** vouchers and final itinerary are ready
- **Header:** Document (sample PDF named `Travel-Kit.pdf`)
- **Body:**
```
Hi {{1}}, your travel kit for {{2}} is ready ✈️

Attached: hotel vouchers, transfer details and your day-by-day itinerary. Your trip starts on {{3}}.

Save this chat. Your coordinator is reachable here 24/7.
```
- **Samples:** Priya · Bali · 12 Feb 2027
- **Buttons:** none

#### 20. `tz_trip_reminder_7d`
- **Category:** UTILITY
- **Header:** Text: `7 days to go 🌴`
- **Body:**
```
Hi {{1}}, your {{2}} escape begins in 7 days!

Quick checklist: {{3}}.

Expected weather: {{4}}. Reply here if you need anything before you fly.
```
- **Samples:** Priya · Bali · passports, printed vouchers, forex card, sunscreen · 29°C with evening showers
- **Buttons:** Quick reply `All set` · Quick reply `I have a question`

#### 21. `tz_flight_reminder_24h`
- **Category:** UTILITY
- **Header:** none
- **Body:**
```
Hi {{1}}, your flight {{2}} departs on {{3}} at {{4}}.

Please reach the airport at least {{5}} before departure. Have a beautiful journey! ✈️
```
- **Samples:** Priya · 6E 1603 · 12 Feb · 10:40 AM · 3 hours
- **Buttons:** none

#### 22. `tz_pickup_details`
- **Category:** UTILITY
- **Header:** none
- **Body:**
```
Hi {{1}}, your pickup in {{2}} is all set.

Driver: {{3}}
Phone: {{4}}
Vehicle: {{5}}

They will meet you at {{6}} with a Travelzada name board.
```
- **Samples:** Priya · Bali · Made · +62 812 3456 7890 · White Toyota Innova, DK 1234 AB · arrivals gate 2
- **Buttons:** none

### E. During the trip

#### 23. `tz_checkin_welcome`
- **Category:** UTILITY
- **Header:** none
- **Body:**
```
Welcome to {{1}}, {{2}}! 💛

You're checked in at {{3}}. Your coordinator {{4}} is available 24/7 right here on WhatsApp.

Enjoy every moment together.
```
- **Samples:** Bali · Priya · The Kayon Jungle Resort · Ananya
- **Buttons:** Quick reply `All good` · Quick reply `Need help`

#### 24. `tz_daily_plan`
- **Category:** UTILITY · **When:** each morning of the trip
- **Header:** none
- **Body:**
```
Good morning {{1}}! ☀️ Here's your plan for today in {{2}}:

{{3}}

Pickup at {{4}} from your hotel lobby. Have a lovely day!
```
- **Samples:** Priya · Ubud · Tegallalang rice terraces, lunch with a view, couples' spa at 4 PM · 9:00 AM
- **Note:** `{{3}}` must be one line. WhatsApp doesn't allow line breaks inside a variable.
- **Buttons:** none

#### 25. `tz_surprise_confirmed`
- **Category:** UTILITY · **When:** confirming a surprise (proposal, decor, cake) to the person who booked it
- **Header:** none
- **Body:**
```
Hi {{1}}, everything is set for {{2}} on {{3}} at {{4}}. 🤫

We'll keep it a secret. Your coordinator will message you 1 hour before with final details.
```
- **Samples:** Rahul · the beach proposal dinner · 14 Feb · 7:30 PM
- **Buttons:** Quick reply `Perfect, thank you` · Quick reply `Change something`

#### 26. `tz_trip_checkin`
- **Category:** UTILITY · **When:** day 2 of the trip
- **Header:** none
- **Body:**
```
Hi {{1}}, how is {{2}} treating you two?

If anything isn't perfect, from the room to a transfer, tell us and we'll fix it right away.
```
- **Samples:** Priya · Bali
- **Buttons:** Quick reply `All perfect 💛` · Quick reply `Need help`

### F. After the trip

#### 27. `tz_welcome_home`
- **Category:** UTILITY (Meta may change it to MARKETING; that's fine)
- **Header:** none
- **Body:**
```
Welcome home, {{1}}! We hope {{2}} was everything you dreamed of.

How would you rate your trip?
```
- **Samples:** Priya · Bali
- **Buttons:** Quick reply `Loved it 😍` · Quick reply `It was good` · Quick reply `Could be better`

#### 28. `tz_review_request`
- **Category:** MARKETING
- **Header:** none
- **Body:**
```
Hi {{1}}, could you take one minute to share your {{2}} story?

Your review helps other couples plan their special trip with confidence 💛
```
- **Samples:** Priya · Bali honeymoon
- **Buttons:** URL `Write a review` → `https://www.travelzada.com/reviews` (static) · Quick reply `Stop promotions`

#### 29. `tz_photo_request`
- **Category:** MARKETING
- **Header:** none
- **Body:**
```
Hi {{1}}, we'd love to see your favourite photo from {{2}}! 📸

Share one here and, with your permission, we may feature your story on our page.
```
- **Samples:** Priya · Bali
- **Buttons:** Quick reply `Sending one` · Quick reply `Prefer not` · Quick reply `Stop promotions`

#### 30. `tz_referral` — ONLY if a referral offer really exists
- **Category:** MARKETING
- **Header:** none
- **Body:**
```
Hi {{1}}, know a couple planning a honeymoon or anniversary?

Introduce them to Travelzada and you both get {{2}} off your next trip together.
```
- **Samples:** Priya · ₹2,000
- **Buttons:** Quick reply `Refer a couple` · Quick reply `Stop promotions`

### G. Occasions & campaigns (image header)

#### 31. `tz_anniversary_reminder` — only if anniversary dates are collected
- **Category:** MARKETING
- **Header:** Image (sample: romantic dinner/sunset photo)
- **Body:**
```
Hi {{1}}, your anniversary is coming up on {{2}} 💛

Shall we plan something unforgettable? Think {{3}}.

Our travel designers will create a free plan for you.
```
- **Samples:** Priya · 18 December · a private dinner on a Maldives sandbank
- **Buttons:** Quick reply `Show me ideas` · Quick reply `Not this year` · Quick reply `Stop promotions`

#### 32. `tz_honeymoon_campaign`
- **Category:** MARKETING
- **Header:** Image (sample: honeymoon couple photo)
- **Body:**
```
Hi {{1}}, planning your honeymoon? ✨

Our travel designers will create a free, personalised itinerary for {{2}}, with no payment until you love the plan.

Tell us your dates and we'll take care of the rest.
```
- **Samples:** Priya · Bali
- **Buttons:** URL `Start planning` → `https://www.travelzada.com/tailored-travel` (static) · Quick reply `Plan our honeymoon` · Quick reply `Stop promotions`

#### 33. `tz_seasonal_offer` — ONLY if the offer is real
- **Category:** MARKETING
- **Header:** Image
- **Body:**
```
Hi {{1}}, {{2}} season is here! 🌸

Couples' packages to {{3}} start from {{4}} for two, and dates in {{5}} are filling fast.

Want us to check availability for you?
```
- **Samples:** Priya · Winter · Kashmir · ₹42,000 · December
- **Buttons:** URL `Explore packages` → `https://www.travelzada.com/destinations/{{1}}` (sample: `https://www.travelzada.com/destinations/kashmir`) · Quick reply `Check availability` · Quick reply `Stop promotions`

#### 34. `tz_valentines_campaign`
- **Category:** MARKETING · **When:** send in mid-January
- **Header:** Image
- **Body:**
```
Hi {{1}}, Valentine's Day is on 14 February 💘

From a candlelit dinner by the sea to a surprise weekend away, let us plan a moment {{2}} will never forget.
```
- **Samples:** Priya · your partner
- **Buttons:** Quick reply `Plan a surprise` · Quick reply `Stop promotions`

#### 35. `tz_new_destination`
- **Category:** MARKETING
- **Header:** Image
- **Body:**
```
Hi {{1}}, just launched: {{2}} for couples 🌍

{{3}}

Tap below to see the packages.
```
- **Samples:** Priya · Vietnam · Lantern-lit Hoi An, Ha Long Bay cruises and quiet beach villas in Phu Quoc.
- **Buttons:** URL `Explore packages` → `https://www.travelzada.com/destinations/{{1}}` (sample: `https://www.travelzada.com/destinations/vietnam`) · Quick reply `Stop promotions`

#### 36. `tz_destination_carousel`
- **Category:** MARKETING · **Type:** Carousel (3 cards)
- **Main body:**
```
Hi {{1}}, here are three escapes couples are loving right now 💛
```
- **Main body sample:** Priya
- **Each card:** Image header + body + the same 2 buttons (all cards must have the same button types)

| Card | Image sample | Card body | Buttons |
|---|---|---|---|
| 1 | Maldives villa | `Maldives · overwater villas from {{1}} for two` (sample ₹1,45,000) | Quick reply `Tell me more` · URL `View` → `https://www.travelzada.com/destinations/maldives` |
| 2 | Bali temple | `Bali · jungle pool villas from {{1}} for two` (sample ₹78,000) | Quick reply `Tell me more` · URL `View` → `https://www.travelzada.com/destinations/bali` |
| 3 | Kashmir houseboat | `Kashmir · houseboats and snow from {{1}} for two` (sample ₹52,000) | Quick reply `Tell me more` · URL `View` → `https://www.travelzada.com/destinations/kashmir` |

- **Note:** check the destination slugs on the live site before submitting (open each URL and make sure it isn't a 404).

#### 37. `tz_reengage_90d`
- **Category:** MARKETING · **When:** past customers or leads after 90 days of silence
- **Header:** none
- **Body:**
```
Hi {{1}}, it's been a while! 💛

Planning your next escape together? Tell us where your hearts are set and we'll design it for free.
```
- **Samples:** Priya
- **Buttons:** Quick reply `Plan a new trip` · Quick reply `Stop promotions`

### H. Internal / partner notifications

#### 38. `tz_team_new_lead`
- **Category:** UTILITY · **Sent to:** Travelzada sales team numbers, not customers
- **Header:** none
- **Body:**
```
New lead received: {{1}}, phone {{2}}.

Trip: {{3}} to {{4}}
Source: {{5}}

Please contact them within 15 minutes.
```
- **Samples:** Priya Sharma · +91 98765 43210 · Honeymoon · Bali · Homepage form
- **Buttons:** none

#### 39. `tz_agent_new_enquiry`
- **Category:** UTILITY · **Sent to:** travel agents on the Travelzada agent platform
- **Header:** none
- **Body:**
```
Hi {{1}}, you have a new enquiry on Travelzada: {{2}} is planning a {{3}} trip to {{4}}.

Reply within 1 hour to keep your response score high.
```
- **Samples:** Rohit · Priya · honeymoon · Bali
- **Buttons:** URL `Open dashboard` → `https://www.travelzada.com/travel-agent-dashboard` (static)

### I. Authentication

#### 40. `tz_login_otp`
- **Category:** AUTHENTICATION
- **Body:** fixed by Meta. Leave the body empty in GetGabs; Meta generates "*{{1}} is your verification code.*"
- **Options:** Copy-code button text `Copy code` · Code expiry `10` minutes · Turn on the security recommendation if offered.

---

## 6. Tracker — update after every batch

Keep this table in this file (or a copy the owner can see).

| # | Name | Category (submitted) | Category (approved) | Status | Rejection reason | Test sent? | Notes |
|---|---|---|---|---|---|---|---|
| 1 | tz_enquiry_received | UTILITY | | | | | |
| 3 | tz_lead_welcome | MARKETING | MARKETING | exists | | | created by website code |
| … | | | | | | | |

Status values: `pending` · `approved` · `rejected` · `paused` · `exists` · `skipped (reason)`

---

## 7. If a template is rejected

| Rejection reason | Fix |
|---|---|
| `INVALID_FORMAT` / variable issues | Check `{{n}}` order, no gaps, not at the start/end of the body, no two variables side by side, samples filled. |
| `INCORRECT_CATEGORY` / utility re-categorised | Resubmit as MARKETING, or remove promotional words from the utility text. |
| Abusive / promotional content in UTILITY | Remove words like "offer", "deal", "limited" and emoji-heavy hype. |
| Duplicate content | Content too close to an existing template. Change wording slightly and use a new name with `_v2`. |
| URL issues | The domain must be `www.travelzada.com` (or the payment gateway), with no shorteners and the variable only at the end. |
| Unclear | Read the full reason in GetGabs, change **only** what it mentions, resubmit as `name_v2`, and log both in the tracker. |

Rejected names can't always be reused right away. Use `_v2`, `_v3` instead of fighting it.

---

## 8. After approval — sending from the website (later step, needs the owner's go-ahead)

The website currently sends WhatsApp messages through Meta's Cloud API (`lib/whatsapp.ts`, `lib/whatsappAutomation.ts`). Switching any sending to GetGabs is a **code change**. Only do it if the owner explicitly asks.

- Endpoint: `POST https://app.getgabs.com/whatsappbusiness/send-templated-message`
- Body: `api_key`, `sender` (connected number), `campaign_id`, `messaging_product: "whatsapp"`, `recipient_type: "individual"`, `to`, `type: "template"`, `template: { name, language: { code: "en" }, components: [...] }`. `components` uses the same format as Meta's Cloud API: HEADER / BODY parameters, buttons with `sub_type` and `index`.
- How to get a campaign ID: https://getgabs.com/blogs/how-to-get-campaign-id-on-getgabs-to-send-template-messages-via-api/
- Store `GETGABS_API_KEY`, `GETGABS_SENDER`, `GETGABS_CAMPAIGN_ID` in `.env.local` only, and never commit them.
- Quick-reply taps arrive through the GetGabs webhook ("Quick reply button webhook" in the docs), not Meta's.

---

## 9. Final report (assistant → owner)

When finished, reply with:
1. Counts: approved / pending / rejected / skipped.
2. The tracker table.
3. Every template whose category Meta changed.
4. Anything you had to guess or that needs the owner's decision (payment gateway URL, referral offer, number/WABA question).
