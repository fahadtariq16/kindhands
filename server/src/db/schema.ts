/**
 * Database schema. Every statement is idempotent (IF NOT EXISTS), so it runs safely on every start.
 * For a production app with many changes over time, move to a migration tool (e.g. node-pg-migrate).
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS waitlist (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(100)  NOT NULL,
  email           VARCHAR(254)  NOT NULL UNIQUE,
  organisation    VARCHAR(150)  NOT NULL,
  org_type        VARCHAR(10)   NOT NULL CHECK (org_type IN ('charity', 'event')),
  volunteer_count VARCHAR(10)   NOT NULL,
  consent_at      TIMESTAMPTZ   NOT NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organisations (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  slug       VARCHAR(60)  NOT NULL UNIQUE,
  org_type   VARCHAR(10)  NOT NULL DEFAULT 'charity',
  timezone   VARCHAR(64)  NOT NULL DEFAULT 'Europe/Tallinn',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memberships (
  user_id    INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id     INT         NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  role       VARCHAR(12) NOT NULL CHECK (role IN ('admin', 'coordinator')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, org_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT        PRIMARY KEY,
  user_id    INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);

-- One table for both kinds of invite link:
--   org-setup: sent after joining the waitlist, creates a new organisation
--   team:      sent by an admin to add a coordinator/admin to their organisation
CREATE TABLE IF NOT EXISTS invites (
  token        TEXT         PRIMARY KEY,
  kind         VARCHAR(10)  NOT NULL CHECK (kind IN ('org-setup', 'team')),
  email        VARCHAR(254) NOT NULL,
  name         VARCHAR(100),
  organisation VARCHAR(150),
  org_type     VARCHAR(10),
  org_id       INT          REFERENCES organisations(id) ON DELETE CASCADE,
  role         VARCHAR(12)  NOT NULL DEFAULT 'admin',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ  NOT NULL,
  used_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS shifts (
  id          SERIAL PRIMARY KEY,
  org_id      INT          NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  title       VARCHAR(120) NOT NULL,
  description TEXT         NOT NULL DEFAULT '',
  location    VARCHAR(200) NOT NULL DEFAULT '',
  starts_at   TIMESTAMPTZ  NOT NULL,
  ends_at     TIMESTAMPTZ  NOT NULL CHECK (ends_at > starts_at),
  spots       INT          NOT NULL CHECK (spots > 0),
  series_id   TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS shifts_org_start_idx ON shifts (org_id, starts_at);

CREATE TABLE IF NOT EXISTS volunteers (
  id         SERIAL PRIMARY KEY,
  org_id     INT          NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(254) NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, email)
);

CREATE TABLE IF NOT EXISTS signups (
  id            SERIAL PRIMARY KEY,
  shift_id      INT         NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  volunteer_id  INT         NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  manage_token  TEXT        NOT NULL UNIQUE,
  status        VARCHAR(10) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  checked_in_at TIMESTAMPTZ,
  reminded_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shift_id, volunteer_id)
);

-- Dev mailbox: when SMTP is not configured, emails are stored here so you can open the links locally.
CREATE TABLE IF NOT EXISTS dev_outbox (
  id         SERIAL PRIMARY KEY,
  to_email   VARCHAR(254) NOT NULL,
  subject    TEXT         NOT NULL,
  html       TEXT         NOT NULL,
  text       TEXT         NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
`;
