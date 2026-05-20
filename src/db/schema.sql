-- ============================================================
-- HydroTrack — Schema completo
-- Execute no PGAdmin: clique com botão direito no banco
-- "hydrotrack" → Query Tool → cole e execute (F5)
-- ============================================================

-- Habilita extensão de UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── USERS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  weight_kg     NUMERIC(5,2),
  height_cm     NUMERIC(5,2),
  gender        VARCHAR(20),
  daily_goal_ml INTEGER     NOT NULL DEFAULT 2000,
  created_at    TIMESTAMP   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ─── HYDRATION LOGS ──────────────────────────────────────────
-- Cada registro de consumo de água do usuário
CREATE TABLE IF NOT EXISTS hydration_logs (
  id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_ml  INTEGER   NOT NULL CHECK (amount_ml > 0),
  logged_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  note       TEXT
);

-- ─── NOTIFICATION SETTINGS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_settings (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  enabled          BOOLEAN NOT NULL DEFAULT true,
  interval_minutes INTEGER NOT NULL DEFAULT 60 CHECK (interval_minutes > 0),
  start_time       TIME    NOT NULL DEFAULT '07:00',
  end_time         TIME    NOT NULL DEFAULT '22:00',
  active_days      INTEGER[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}', -- 0=Dom ... 6=Sáb
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── REFRESH TOKENS ──────────────────────────────────────────
-- Permite invalidar sessões individuais (logout)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT      NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_hydration_logs_user_id   ON hydration_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_hydration_logs_logged_at ON hydration_logs(logged_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token     ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id   ON refresh_tokens(user_id);

-- ─── AUTO-UPDATE updated_at ──────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_notif_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── VERIFICAÇÃO ─────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
