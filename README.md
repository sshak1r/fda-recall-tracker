# FDA Recall Tracker

## Description

FDA Recall Tracker is a full-stack web application that makes FDA food recall data searchable, filterable, and easy to understand. It pulls live data from the openFDA Food Enforcement API, displays results in a sortable paginated table, visualizes trends with charts, and lets users save recalls to a personal watchlist stored in a Supabase database.

Built for INST 377 — Information Architecture for the Web, University of Maryland, Spring 2026.

## Target Browsers

- **Desktop:** Chrome 120+, Firefox 120+, Safari 17+, Edge 120+
- **Mobile:** iOS Safari 17+, Android Chrome 120+
- Responsive layout works on screens 375px and wider.

## Link to Developer Manual

See the Developer Manual section below.

---

# Developer Manual

> **Audience:** Future developers taking over this codebase. This assumes you know web development basics but are new to this project.

## Project Architecture

```
fda-recall-tracker/
├── server.js          ← Node.js/Express backend (all API endpoints)
├── package.json       ← Dependencies and npm scripts
├── .env.example       ← Copy to .env and fill in your credentials
├── .gitignore
├── public/
│   ├── index.html     ← Home page: search + filterable results table (DataTables)
│   ├── charts.html    ← Charts page: Chart.js visualizations
│   ├── saved.html     ← Saved recalls watchlist (reads/deletes from DB)
│   ├── about.html     ← About page
│   ├── style.css      ← Single stylesheet for all pages
│   └── app.js         ← Shared JS helpers (formatDate, classLabel, saveRecall)
├── tests/
│   └── api.test.js    ← API tests (run with: node tests/api.test.js)
└── docs/
    └── DEVELOPER_MANUAL.md
```

**Data flow:**
1. User interacts with an HTML page in `/public`
2. Front end calls a backend endpoint via `fetch()`
3. Backend either calls the openFDA API or reads/writes to Supabase
4. JSON is returned and rendered in the UI

---

## How to Install the Application and All Dependencies

**Prerequisites:**
- Node.js v18 or higher — [nodejs.org](https://nodejs.org)
- A free Supabase account — [supabase.com](https://supabase.com)

**Steps:**

```bash
git clone https://github.com/YOUR_USERNAME/fda-recall-tracker.git
cd fda-recall-tracker
npm install
```

### Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Open the **SQL Editor** and run this to create the table:

```sql
CREATE TABLE saved_recalls (
  id                  SERIAL PRIMARY KEY,
  event_id            TEXT UNIQUE NOT NULL,
  product_description TEXT,
  reason_for_recall   TEXT,
  classification      TEXT,
  recalling_firm      TEXT,
  report_date         TEXT,
  state               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

3. Go to **Settings → API** and copy your Project URL and anon key
4. Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Fill it in:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
PORT=3000
```

---

## How to Run the Application on a Server

**Development (auto-reload on save):**

```bash
npm run dev
```

**Production:**

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Deploying to Vercel

1. Push the project to a **public GitHub repository**
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Add environment variables in Vercel project settings:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
4. Vercel auto-detects Node.js. Start command: `node server.js`
5. Visit the deployed URL and verify all pages and API calls work

---

## How to Run Tests

Make sure the server is running first, then in a separate terminal:

```bash
npm test
```

Tests cover all three authored backend endpoints, checking status codes, response structure, and error handling.

---

## API Endpoints

All endpoints are authored in `server.js`. The front end calls them via `fetch()`.

### GET `/api/recalls`

Proxies the openFDA Food Enforcement API. Returns recall records matching the query.

**Query parameters:**

| Parameter        | Type   | Description |
|-----------------|--------|-------------|
| `search`        | string | Free-text keyword search |
| `classification`| string | `Class I`, `Class II`, or `Class III` |
| `state`         | string | Two-letter state code (e.g. `MD`) |
| `startDate`     | string | Date range start — format `YYYYMMDD` |
| `endDate`       | string | Date range end — format `YYYYMMDD` |
| `limit`         | number | Max results to return (default 20) |
| `count`         | string | Field to aggregate (e.g. `classification.exact`) |

**Example requests:**
```
GET /api/recalls?search=peanut&classification=Class+I&limit=20
GET /api/recalls?count=classification.exact
GET /api/recalls?state=MD&limit=10
```

**Example response:**
```json
{
  "meta": { "results": { "total": 28759 } },
  "results": [
    {
      "event_id": "75272",
      "product_description": "...",
      "classification": "Class II",
      "recalling_firm": "...",
      "state": "FL",
      "report_date": "20260101"
    }
  ]
}
```

---

### GET `/api/saved`

Retrieves all saved recalls from the Supabase database, ordered newest first.

**Example request:**
```
GET /api/saved
```

**Example response:**
```json
[
  {
    "id": 1,
    "event_id": "75272",
    "product_description": "...",
    "classification": "Class I",
    "state": "MD",
    "created_at": "2026-04-19T12:00:00Z"
  }
]
```

---

### POST `/api/saved`

Saves a recall to the Supabase database. Uses upsert — re-saving the same `event_id` will not create a duplicate.

**Request body (JSON):**

| Field                 | Required | Description |
|----------------------|----------|-------------|
| `event_id`           | ✓        | FDA unique event ID |
| `product_description`| ✓        | Product name/description |
| `reason_for_recall`  |          | Reason for the recall |
| `classification`     |          | Class I, Class II, or Class III |
| `recalling_firm`     |          | Company issuing the recall |
| `report_date`        |          | Date string in `YYYYMMDD` format |
| `state`              |          | Two-letter state code |

**Response (201):**
```json
{ "message": "Recall saved successfully" }
```

---

### DELETE `/api/saved/:event_id`

Removes a saved recall from the database by its FDA event ID.

**Example request:**
```
DELETE /api/saved/75272
```

**Response (200):**
```json
{ "message": "Recall removed successfully" }
```

---

## Known Bugs

- **openFDA rate limiting:** Without an API key, the FDA API allows ~240 requests/minute. Heavy use may return 429 errors. Fix: register for a free key at [open.fda.gov/apis/authentication](https://open.fda.gov/apis/authentication/) and append `&api_key=YOUR_KEY` to requests in `server.js`.
- **No user authentication:** All users share the same saved recalls table. Any user can see or delete any saved recall.
- **No date filter on home page:** The home page search does not include a date range filter in the current version.

---

## Roadmap for Future Development

- [ ] Add date range filter to the home page search
- [ ] Add openFDA API key support to bypass rate limits
- [ ] Add Supabase Auth so each user has their own private saved list
- [ ] Add a map view showing recall counts by state
- [ ] Write front-end browser tests with Playwright
- [ ] Add a PATCH endpoint to update notes on a saved recall
