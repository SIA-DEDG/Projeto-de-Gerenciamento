-- Migration: se as tabelas existem com colunas INT8 (schema antigo), descarta tudo
-- e recria com UUID. Roda apenas uma vez; seguro para re-executar.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'tasks'
      AND column_name  = 'id'
      AND data_type    = 'bigint'
  ) THEN
    DROP TABLE IF EXISTS evidences CASCADE;
    DROP TABLE IF EXISTS tasks     CASCADE;
    DROP TABLE IF EXISTS projects  CASCADE;
    DROP TABLE IF EXISTS users     CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL,
  username            TEXT        NOT NULL UNIQUE,
  password_hash       TEXT        NOT NULL,
  role                TEXT        NOT NULL DEFAULT 'Funcionario',
  must_change_password BOOLEAN    NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration: rename email column to username on existing DBs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email'
  ) THEN
    ALTER TABLE users RENAME COLUMN email TO username;
  END IF;
END $$;

-- Migration: adiciona must_change_password se a tabela já existia sem ela
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'users'
      AND column_name  = 'must_change_password'
  ) THEN
    ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT TRUE;
    UPDATE users SET must_change_password = FALSE WHERE role = 'Admin';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  owner TEXT,
  deadline DATE,
  executive_status TEXT,
  objective TEXT,
  scope TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  activity TEXT NOT NULL,
  responsible TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Média',
  created_at DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS evidences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  note TEXT,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name    TEXT        NOT NULL,
  action       TEXT        NOT NULL,
  entity_type  TEXT        NOT NULL,
  entity_id    TEXT        NOT NULL,
  details      TEXT        NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration: upgrade project_id FK from SET NULL to CASCADE on existing DBs
DO $$
DECLARE v_con TEXT;
BEGIN
  SELECT rc.constraint_name INTO v_con
  FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu
    ON kcu.constraint_name = rc.constraint_name
  WHERE kcu.table_schema = 'public'
    AND kcu.table_name   = 'tasks'
    AND kcu.column_name  = 'project_id'
  LIMIT 1;

  IF v_con IS NOT NULL THEN
    EXECUTE 'ALTER TABLE tasks DROP CONSTRAINT ' || quote_ident(v_con);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tasks_project_id_fkey'
      AND table_name = 'tasks'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Migration: add co_responsibles and external_collaborators to tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'co_responsibles'
  ) THEN
    ALTER TABLE tasks ADD COLUMN co_responsibles TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'external_collaborators'
  ) THEN
    ALTER TABLE tasks ADD COLUMN external_collaborators TEXT;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS absences (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_name TEXT        NOT NULL,
  reason        TEXT        NOT NULL,
  justification TEXT,
  file_name     TEXT,
  file_data     TEXT,
  start_date    DATE        NOT NULL,
  end_date      DATE        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  responsibles TEXT       NOT NULL DEFAULT '[]',
  event_type  TEXT        NOT NULL,
  attendees   TEXT,
  start_date  DATE        NOT NULL,
  end_date    DATE        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration: add start_time to events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'start_time'
  ) THEN
    ALTER TABLE events ADD COLUMN start_time TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_absences_employee   ON absences(employee_name);
CREATE INDEX IF NOT EXISTS idx_absences_start_date ON absences(start_date);
CREATE INDEX IF NOT EXISTS idx_events_start_date   ON events(start_date);

CREATE INDEX IF NOT EXISTS idx_tasks_status        ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_category      ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_evidences_task_id   ON evidences(task_id);
CREATE INDEX IF NOT EXISTS idx_logs_user_id        ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at     ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_entity_type    ON activity_logs(entity_type);
