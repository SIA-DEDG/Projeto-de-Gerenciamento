-- Substitui file_data (base64 no banco) por file_path (path no Supabase Storage)

ALTER TABLE absences
  ADD COLUMN IF NOT EXISTS file_path TEXT,
  DROP COLUMN IF EXISTS file_data;

-- Substitui minutes_file_data (base64) por minutes_file_path (path no Supabase)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS minutes_file_path TEXT,
  DROP COLUMN IF EXISTS minutes_file_data;
