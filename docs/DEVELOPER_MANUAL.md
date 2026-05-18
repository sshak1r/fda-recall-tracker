# Developer Manual — FDA Recall Tracker

> **Audience:** Future developers taking over this codebase. This assumes you know web development basics but are new to this project.

---

## Project Architecture

```
fda-recall-tracker/
├── server.js          ← Node.js/Express backend (all API endpoints)
├── package.json       ← Dependencies and scripts
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
    └── DEVELOPER_MANUAL.md  ← This file
```

**Data flow:**
1. User interacts with an HTML page in `/public`
2. Front end calls a backend endpoint (e.g. `GET /api/recalls`) via `fetch()`
3. Backend either calls openFDA or reads/writes Supabase
4. JSON is returned and rendered in the UI

---

## 1. Installation

**Prerequisites:**
- Node.js v18 or higher — [nodejs.org](https://nodejs.org)
- A free Supabase account — [supabase.com](https://supabase.com)

**Steps:**

```bash
git clone https://github.com/YOUR_USERNAME/fda-recall-tracker.git
cd fda-recall-tracker
npm install
```

---

## 2. Supabase Setup

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

## 3. Running the Application

**Development (auto-reload on save):**

```bash
npm run dev
```

**Production:**

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Running Tests

Make sure the server is running first, then in a separate terminal:

```bash
npm test
```

Tests cover all three authored backend endpoints, checking status codes, response structure, and error handling.

---

## 5. API Endpoint Reference

All endpoints are in `server.js`. The front end calls them via `fetch()`.

---

### GET `/api/recalls`

Proxies the openFDA Food Enforcement API. Returns recall records.

**Query parameters:**

| Parameter        | Type   | Description |
|-----------------|--------|-------------|
| `search`        | string | Free-text keyword search |
| `classification`| string | `Class I`, `Class II`, or `Class III` |
| `state`         | string | Two-letter state code (e.g. `MD`) |
| `startDate`     | string | Date range start — format `YYYYMMDD` |
| `endDate`       | string | Date range end — format `YYYYMMDD` |
| `limit`         | number | Max results (default 20) |
| `count`         | string | Aggregate field (e.g. `classification.exact`) |

**Example:**
```
GET /api/recalls?search=peanut&classification=Class+I&limit=20
GET /api/recalls?count=classification.exact
```

**Response:**
```json
{
  "meta": { "results": { "total": 28759 } },
  "results": [ { "event_id": "...", "product_description": "...", ... } ]
}
```

---

### GET `/api/saved`

Returns all saved recalls from the Supabase database, newest first.

**Example:**
```
GET /api/saved
```

**Response:**
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

Saves a recall to the Supabase database. Uses upsert — re-saving the same `event_id` won't create a duplicate.

**Request body:**

| Field                 | Required | Description |
|----------------------|----------|-------------|
| `event_id`           | ✓        | FDA unique event ID |
| `product_description`| ✓        | Product name |
| `reason_for_recall`  |          | Reason text |
| `classification`     |          | Class I / II / III |
| `recalling_firm`     |          | Company name |
| `report_date`        |          | `YYYYMMDD` string |
| `state`              |          | Two-letter state code |

**Response (201):**
```json
{ "message": "Recall saved successfully" }
```

---

### DELETE `/api/saved/:event_id`

Removes a saved recall by its FDA event ID.

**Example:**
```
DELETE /api/saved/75272
```

**Response (200):**
```json
{ "message": "Recall removed successfully" }
```

---

## 6. Deploying to Vercel

1. Push the project to a **public GitHub repository**
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Add environment variables in Vercel project settings:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
4. Vercel auto-detects Node.js. Start command: `node server.js`
5. Visit the deployed URL and verify all pages and API calls work

---

## 7. JavaScript Libraries Used

| Library       | Where Used     | How It's Used |
|--------------|---------------|---------------|
| **Chart.js** | `charts.html` | Bar charts showing recalls by classification and by state |
| **DataTables**| `index.html`  | Adds pagination, sorting, and search to the results table |

Both are loaded from CDN — no installation needed.

---

## 8. Known Bugs

- **openFDA rate limiting:** Without an API key, the FDA API allows ~240 requests/minute. Heavy use may return 429 errors. Fix: register for a free API key at [open.fda.gov/apis/authentication](https://open.fda.gov/apis/authentication/) and add `&api_key=YOUR_KEY` to requests in `server.js`.
- **No user authentication:** All users share the same saved recalls table. Any user can see or delete any saved recall.
- **Date filter not on home page:** The home page search does not include a date range filter in the simplified version.

---

## 9. Roadmap for Future Development

- [ ] Add date range filter to the home page search
- [ ] Add openFDA API key to bypass rate limits
- [ ] Add Supabase Auth so each user has their own saved list
- [ ] Add a map view showing recall counts by state
- [ ] Write front-end browser tests with Playwright
- [ ] Add a PATCH endpoint to update notes on a saved recall
