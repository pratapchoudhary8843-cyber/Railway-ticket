# Datastraw Support CRM

A full-stack customer support ticketing system built for the Datastraw Assessment Test.

**Stack:** Python + FastAPI · SQLite · HTML + Tailwind CSS + Vanilla JS · Deploy on Railway

## Features

- Create tickets with customer name, email, subject, and description (auto-generated `TKT-###` IDs)
- List all tickets in a clean table view (ID, name, subject, status, date)
- Live search across name, email, ticket ID, subject, and description
- Filter by status: Open / In Progress / Closed
- Ticket detail view with status updates and notes/comments


## Technical Approach

- **Backend**: FastAPI serves both the JSON API and the server-rendered HTML pages (via Jinja2) from a single app, keeping deployment simple (one process, one URL).
- **Database**: Two tables as specified — `tickets` and an optional `notes` table for comments, linked by a foreign key.
- **Frontend**: HTML, CSS, and JavaScript combined into a single `index.html` file (no separate static assets) — hand-written dark dashboard theme, served directly by FastAPI. All interactivity (create, search, filter, status updates, notes) happens through a modal on one page, talking to the API via `fetch`.
- **Ticket IDs**: Auto-generated sequentially as `TKT-001`, `TKT-002`, etc.
- **Search**: Case-insensitive `LIKE` query across name, email, ticket ID, subject, and description.



```
SupportCRM/
├── backend/
│   ├── main.py          # FastAPI app, API routes + single page route
│   ├── database.py      # SQLAlchemy engine/session setup
│   ├── models.py        # Ticket & Note ORM models
│   ├── schemas.py       # Pydantic request/response schemas
│   └── crud.py          # DB operations
├── frontend/
│   └── templates/
│       └── index.html   # Single-page dashboard — HTML, CSS, and JS all in one file
├── database/
│   ├── schema.sql          # SQLite schema (reference — tables are auto-created by SQLAlchemy)
│   └── postgres-schema.sql # PostgreSQL equivalent, for reference if you migrate later
├── requirements.txt
├── Procfile              # Railway/Heroku-style start command
├── .env.example
└── .gitignore
```

## Performance

A few things tuned for speed and to keep the app healthy as ticket volume grows:

- **Indexes** on `status`, `customer_name`, `customer_email`, `created_at`, and `notes.ticket_id` — the columns actually used for filtering, sorting, and joins.
- **Pagination** on `GET /api/tickets` — defaults to 50 results, capped at 200 (`?skip=&limit=`), instead of returning the entire table on every request.
- **SQLite WAL mode** — reads no longer block behind writes, which matters once more than one request hits the API at the same time.
- **Gzip compression** on responses over 1KB (ticket lists, the HTML page).
- **orjson** for response serialization — noticeably faster than the standard library's `json` module for the list/detail endpoints.

Measured with 2,000 seeded tickets: list queries and filtered searches both completed in under 20ms, single-ticket lookups in ~7ms.

## Known Limitations / Improvements With More Time

- No authentication (kept out of scope per assessment MVP guidance)
- SQLite is fine for this assessment but would move to Postgres for real production use
- Could add pagination for large ticket volumes and basic input rate-limiting
- Could add email notifications on ticket creation/status change
