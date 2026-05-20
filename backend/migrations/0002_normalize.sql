ALTER TABLE tasks ADD COLUMN IF NOT EXISTS responsible_id UUID;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_id UUID;

ALTER TABLE absences ADD COLUMN IF NOT EXISTS user_id UUID;

CREATE TABLE IF NOT EXISTS task_co_responsibles (
    task_id UUID NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, user_id)
);

CREATE TABLE IF NOT EXISTS event_responsibles (
    event_id UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, user_id)
);

UPDATE tasks t
SET
    responsible_id = u.id
FROM users u
WHERE
    u.name = t.responsible
    AND t.responsible_id IS NULL;

UPDATE projects p
SET
    owner_id = u.id
FROM users u
WHERE
    u.name = p.owner
    AND p.owner_id IS NULL;

UPDATE absences a
SET
    user_id = u.id
FROM users u
WHERE
    u.name = a.employee_name
    AND a.user_id IS NULL;

INSERT INTO task_co_responsibles (task_id, user_id)
SELECT t.id, u.id
FROM tasks t
JOIN LATERAL json_array_elements_text(
  (CASE WHEN t.co_responsibles IS NOT NULL AND t.co_responsibles NOT IN ('', 'null', '[]')
        THEN t.co_responsibles ELSE '[]' END)::json
) AS elem ON true
JOIN users u ON u.name = elem
ON CONFLICT DO NOTHING;

INSERT INTO event_responsibles (event_id, user_id)
SELECT e.id, u.id
FROM events e
JOIN LATERAL json_array_elements_text(e.responsibles::json) AS elem ON true
JOIN users u ON u.name = elem
ON CONFLICT DO NOTHING;

ALTER TABLE tasks
ADD CONSTRAINT tasks_responsible_id_fkey FOREIGN KEY (responsible_id) REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE projects
ADD CONSTRAINT projects_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE absences
ADD CONSTRAINT absences_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE tasks DROP COLUMN IF EXISTS responsible;

ALTER TABLE tasks DROP COLUMN IF EXISTS co_responsibles;

ALTER TABLE projects DROP COLUMN IF EXISTS owner;

ALTER TABLE absences DROP COLUMN IF EXISTS employee_name;

ALTER TABLE events DROP COLUMN IF EXISTS responsibles;

CREATE INDEX IF NOT EXISTS idx_tasks_responsible_id ON tasks (responsible_id);

CREATE INDEX IF NOT EXISTS idx_absences_user_id ON absences (user_id);

CREATE INDEX IF NOT EXISTS idx_tcr_task_id ON task_co_responsibles (task_id);

CREATE INDEX IF NOT EXISTS idx_er_event_id ON event_responsibles (event_id);