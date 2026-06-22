ALTER TABLE absences ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pendente';
