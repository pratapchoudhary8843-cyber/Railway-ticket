-- ============================================================
-- Datastraw Support CRM — Database Schema (PostgreSQL)
-- ============================================================

-- ------------------------------------------------------------
-- TICKETS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tickets (
    id              SERIAL PRIMARY KEY,
    ticket_id       TEXT NOT NULL UNIQUE,        -- e.g. 'TKT-001'
    customer_name   TEXT NOT NULL,
    customer_email  TEXT NOT NULL,
    subject         TEXT NOT NULL,
    description     TEXT,
    status          TEXT NOT NULL DEFAULT 'Open' -- Open / In Progress / Closed
                        CHECK (status IN ('Open', 'In Progress', 'Closed')),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tickets_ticket_id ON tickets (ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status    ON tickets (status);
CREATE INDEX IF NOT EXISTS idx_tickets_customer  ON tickets (customer_name, customer_email);

-- Keep updated_at current whenever a row changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tickets_updated_at ON tickets;
CREATE TRIGGER trg_tickets_updated_at
BEFORE UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- NOTES TABLE (optional, linked to tickets)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notes (
    id          SERIAL PRIMARY KEY,
    ticket_id   INTEGER NOT NULL,
    note_text   TEXT NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notes_ticket_id ON notes (ticket_id);

-- ============================================================
-- SAMPLE SEED DATA (optional — remove if you want to start empty)
-- ============================================================
INSERT INTO tickets (ticket_id, customer_name, customer_email, subject, description, status)
VALUES
    ('TKT-001', 'Jane Doe',  'jane@example.com', 'Cannot log in to portal',
     'Getting a 500 error every time I try to sign in since this morning.', 'In Progress'),
    ('TKT-002', 'Bob Smith', 'bob@example.com',  'Charged twice for June invoice',
     'My card was billed twice on the 3rd for the same invoice number.', 'Open')
ON CONFLICT (ticket_id) DO NOTHING;

INSERT INTO notes (ticket_id, note_text)
VALUES
    (1, 'Escalated to engineering, checking auth logs.');

-- ============================================================
-- USEFUL QUERIES (reference only — commented out)
-- ============================================================

-- List all tickets, newest first
-- SELECT ticket_id, customer_name, subject, status, created_at
-- FROM tickets
-- ORDER BY created_at DESC;

-- Search across name, email, ticket ID, subject, description
-- SELECT * FROM tickets
-- WHERE customer_name  ILIKE '%jane%'
--    OR customer_email ILIKE '%jane%'
--    OR ticket_id       ILIKE '%jane%'
--    OR subject         ILIKE '%jane%'
--    OR description     ILIKE '%jane%';

-- Filter by status
-- SELECT * FROM tickets WHERE status = 'Open';

-- Get one ticket with its notes
-- SELECT t.*, n.note_text, n.created_at AS note_created_at
-- FROM tickets t
-- LEFT JOIN notes n ON n.ticket_id = t.id
-- WHERE t.ticket_id = 'TKT-001';

-- Update a ticket's status
-- UPDATE tickets SET status = 'Closed' WHERE ticket_id = 'TKT-001';
