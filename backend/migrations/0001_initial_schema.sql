CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Funcionario',
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    category TEXT NOT NULL,
    activity TEXT NOT NULL,
    responsible TEXT NOT NULL,
    status TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'Média',
    created_at DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    project_id UUID REFERENCES projects (id) ON DELETE CASCADE,
    co_responsibles TEXT,
    external_collaborators TEXT
);

CREATE TABLE IF NOT EXISTS evidences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    task_id UUID NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT,
    note TEXT,
    storage_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS absences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    employee_name TEXT NOT NULL,
    reason TEXT NOT NULL,
    justification TEXT,
    file_name TEXT,
    file_data TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name TEXT NOT NULL,
    responsibles TEXT NOT NULL DEFAULT '[]',
    event_type TEXT NOT NULL,
    attendees TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);

CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks (category);

CREATE INDEX IF NOT EXISTS idx_evidences_task_id ON evidences (task_id);

CREATE INDEX IF NOT EXISTS idx_logs_user_id ON activity_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_logs_created_at ON activity_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_logs_entity_type ON activity_logs (entity_type);

CREATE INDEX IF NOT EXISTS idx_absences_employee ON absences (employee_name);

CREATE INDEX IF NOT EXISTS idx_absences_start ON absences (start_date);

CREATE INDEX IF NOT EXISTS idx_events_start ON events (start_date);