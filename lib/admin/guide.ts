/**
 * The admin user guide (Markdown). Rendered in-app at /admin/help and mirrored to docs/ADMIN_USER_GUIDE.md.
 * Keep it in plain words — it's written for sales, content and operations staff, not developers.
 */
export const ADMIN_GUIDE_MD = `# Travelzada Admin — How to use it

The admin lives at **/admin**. Log in with your Travelzada account. The left menu only shows the pages your role can open. On a phone, tap ☰ (top left) to open the menu.

**Tip:** press **Ctrl + K** (⌘ + K on Mac) anywhere to jump to any page by typing its name.

---

## 1. Roles — who can do what

| Role | Who it's for | Pages they see |
|---|---|---|
| **Admin** | Owner / founders | Everything, plus Travel Agents and changing other people's access |
| **Sales Executive** | People who call and close leads | Overview, Meta Leads, Website Leads, Contact Messages, Customers, WhatsApp, AI Planner Chats, Create Quote PDF, Gift Vouchers |
| **Sales Manager** | Team lead for sales | Everything Sales has + Packages, Destinations, AI Package Writer, Vendors |
| **Content & SEO** | Blog writers, website editors | Overview, Packages, Destinations, Blogs, Authors, Testimonials, Newsletter, AI Package Writer |
| **Operations** | People who handle confirmed trips | Overview, Customers, Packages, Vendors, Gift Vouchers |
| **HR / Hiring** | Hiring | Overview, Job Openings, Applications |

An admin can also tick/untick single pages for a person ("customised" role).

### How to give someone access (Admin)
1. Ask the person to create an account at **travelzada.com/signup** (they must verify their email).
2. Open **Team & Hiring → Team & Roles** → **Add team member** → type their email.
3. Pick a role (e.g. *Sales Executive*). Fine-tune the ticks if needed → **Save**.
4. They log out and back in (or refresh) to see their pages.

To remove access: open the person → **Remove all access**. You cannot remove your own admin access (so the company never gets locked out).

---

## 2. The menu at a glance

| Section | Pages inside | Use it for |
|---|---|---|
| **Overview** | Overview | Today's numbers, leads to call first, overdue follow-ups, upcoming trips |
| **Sales & CRM** | Meta Leads · Website Leads · Contact Messages · Customers · WhatsApp · AI Planner Chats | Every enquiry in one place, and every customer after they get a quote |
| **Quotes & Itineraries** | Create Quote PDF · AI Package Writer | Making the PDF you send to a customer; drafting new packages with AI |
| **Packages & Destinations** | Packages · Destinations | What the website sells |
| **Content & Marketing** | Blogs · Authors · Testimonials · Newsletter | SEO content, reviews, email list |
| **Partners** | Travel Agents · Vendors · Gift Vouchers | B2B agents, vendor partners, QR gift vouchers |
| **Team & Hiring** | Team & Roles · Job Openings · Applications | Staff access and recruitment |
| **Help** | How to use | This guide |

When you open a section, its pages appear as **tabs across the top** so you can switch quickly.

---

## 3. Sales Executive — daily routine

**Morning (10 minutes)**
1. Open **Overview**. Look at *New leads today*, *Not contacted yet* and *Follow-ups overdue*.
2. *Call these leads first* lists the newest uncontacted leads. Tap 📞 to call or the green WhatsApp button — a friendly first message is already typed for you.

**Working a lead**
- **Meta Leads** (Facebook/Instagram ads): open a lead → log the call outcome, set the next follow-up, move the stage (*New → Contacted → Qualified → Proposal Sent → Negotiation → Won / Lost*). Use the AI sales assistant for reply suggestions.
- **Website Leads** (package pages + AI trip planner): change the status right in the list (*New → Contacted → Quote sent → Follow-up → Converted / Lost*). Calling or WhatsApp-ing a *New* lead moves it to *Contacted* automatically. Click **Edit** to add notes and a **follow-up date** (shortcuts: Tomorrow / 3 days / Next week).
- **Contact Messages**: opening a message marks it read. Use *Reply on WhatsApp* or *Reply by email*; it is then marked *Replied*.
- **WhatsApp**: the live inbox for all WhatsApp chats.

**Sending a quote (the most important step)**
1. From any lead click **Create quote PDF** — the customer's name, phone, email, destination, date and travellers are filled in for you. (Or open *Quotes & Itineraries → Create Quote PDF* directly.)
2. **Customer** → check details. **Package** → pick the destination and package. **Customise** → edit days, add hotels and flights, enter total price and advance paid, add notes.
3. **Preview** the PDF pages, then **Download**.
4. Click **Share on WhatsApp** to open a chat with the customer, then attach the downloaded PDF (WhatsApp doesn't allow attaching files automatically).
5. Set the lead to *Quote sent* and add a follow-up date (2 days is a good default).

Every PDF you create is saved automatically in **Customers** as a *Quote*.

**When the customer books**
- Open **Customers** → the record → change status to **Booked** and enter the advance received. The *Balance due* view shows who still has to pay; the WhatsApp button sends a polite balance reminder.
- Mark the lead *Converted* (Website Leads) or *Won* with the deal value (Meta Leads).

---

## 4. Sales Manager

Everything above, plus:
- **Overview** pipeline bar shows where all Meta leads stand; overdue follow-ups are listed under it — chase these with the team.
- **Customers** → *Upcoming trips* (soonest first, trips in the next 7 days highlighted) and *Balance due*.
- **Packages** / **AI Package Writer** to add new products, **Vendors** for partner deals.
- Export any list to Excel with **Export CSV**.

---

## 5. Content & SEO

**Packages**
- **Add package** opens a form with 5 tabs: *Basics* (name, destination, nights, price from, photo), *Trip details* (overview, highlights, day-by-day plan, inclusions/exclusions, hotels), *Tags* (occasion, travel type, theme, mood, budget — these power the homepage rails and the AI planner), *Page extras* (FAQs, reviews, policies), *SEO & advanced*.
- You don't type duration, price range, URL slug, SEO title/description or dates — they are filled automatically. Just enter **nights** and **price from**.
- Use the stat cards to find problems: *Missing photo or price*, *Not on a destination*.
- **Duplicate** a package to make a variant quickly. **Import** for Excel/CSV/JSON (download the template first).

**Destinations**: pick linked packages with the search box (no typing IDs). If a destination has no hand-picked packages, the site shows packages whose name contains the destination name.

**Blogs**
- **New post** → title, summary, then add content blocks (paragraph, heading, image, quote, list, FAQ, call-to-action…). Move blocks up/down.
- Right side: publish switch, date, cover image (required to publish), category, author, placement on the blog page.
- *SEO & advanced* (collapsed) shows a Google preview. Slug, read time and description fill themselves.
- **Ctrl + S** saves. Drafts can be previewed inside the admin.

**Authors** — profile cards; editing a name/photo updates their posts too. **Testimonials** — toggle *Homepage* to show a review on the homepage. **Newsletter** — export emails, unsubscribe people who ask.

---

## 6. Operations

- **Customers**: views *Quotes*, *Booked*, *Balance due*, *Trip done*, *Cancelled*. Open a record to edit hotels, flights, payments; every change is kept in its history.
- **Vendors**: vendor partners, their rewards and the leads they bring.
- **Gift Vouchers**: issue QR vouchers, track and mark them redeemed; *Print* gives a print-ready sheet.

---

## 7. HR / Hiring

- **Job Openings**: create, edit and close positions shown on the Careers page.
- **Applications**: filter by position and stage (*New → Reviewing → Shortlisted → Hired / Rejected*). Click a row for the cover letter, LinkedIn/resume, email and WhatsApp.

---

## 8. Admin only

- **Travel Agents** (B2B): approve, suspend or reject agents, set commission and notes.
- **Spam cleanup** (on the Travel Agents page): bots keep signing up as fake agents (e.g. "Inorxrhkt LLC"). Click **Spam cleanup** → review the suggested list (each row says why it looks fake; real agents with packages/bookings are never listed) → type **DELETE**. A backup file downloads first.
- Agent sign-up now blocks bots automatically (hidden bot trap, random-name check, max 5 sign-ups per hour per IP).
- **Team & Roles**: see section 1.

---

## 9. FAQ

**I can't see a page.** Your role doesn't include it — ask an admin.

**The PDF images are missing.** The package photo couldn't be loaded; the PDF uses a coloured background instead. Use an ImageKit/Firebase image URL on the package.

**A lead appears in both Meta Leads and Website Leads?** Old Facebook copies are hidden from Website Leads by default — work Facebook leads in Meta Leads only.

**Where did the old big admin page go?** Every section is now its own page in the left menu, so links, refresh and the back button work and nothing opens at the bottom of the page.
`
