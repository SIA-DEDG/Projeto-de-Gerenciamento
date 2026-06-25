-- Migration: Multi-Diretoria

-- 1. Criar tabela diretorias
CREATE TABLE IF NOT EXISTS "diretorias" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "name"        TEXT        NOT NULL,
  "slug"        TEXT        NOT NULL,
  "description" TEXT,
  "color"       TEXT,
  "active"      BOOLEAN     NOT NULL DEFAULT true,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "diretorias_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "diretorias_slug_key" ON "diretorias"("slug");
CREATE INDEX IF NOT EXISTS "diretorias_active_idx" ON "diretorias"("active");

-- 2. Inserir diretoria padrão
INSERT INTO "diretorias" ("name", "slug", "description", "color")
SELECT 'Principal', 'principal', 'Diretoria padrão do sistema', '#034EA2'
WHERE NOT EXISTS (SELECT 1 FROM "diretorias" WHERE "slug" = 'principal');

-- 3. Adicionar directoria_id (nullable) aos modelos
ALTER TABLE "users"         ADD COLUMN IF NOT EXISTS "directoria_id" UUID;
ALTER TABLE "projects"      ADD COLUMN IF NOT EXISTS "directoria_id" UUID;
ALTER TABLE "tasks"         ADD COLUMN IF NOT EXISTS "directoria_id" UUID;
ALTER TABLE "absences"      ADD COLUMN IF NOT EXISTS "directoria_id" UUID;
ALTER TABLE "events"        ADD COLUMN IF NOT EXISTS "directoria_id" UUID;
ALTER TABLE "activity_logs" ADD COLUMN IF NOT EXISTS "directoria_id" UUID;
ALTER TABLE "feedbacks"     ADD COLUMN IF NOT EXISTS "usuario_diretoria" TEXT;

-- 4. Preencher dados existentes com a diretoria padrão
UPDATE "users"         SET "directoria_id" = (SELECT "id" FROM "diretorias" WHERE "slug" = 'principal' LIMIT 1)
  WHERE "role" != 'Admin' AND "directoria_id" IS NULL;
UPDATE "projects"      SET "directoria_id" = (SELECT "id" FROM "diretorias" WHERE "slug" = 'principal' LIMIT 1) WHERE "directoria_id" IS NULL;
UPDATE "tasks"         SET "directoria_id" = (SELECT "id" FROM "diretorias" WHERE "slug" = 'principal' LIMIT 1) WHERE "directoria_id" IS NULL;
UPDATE "absences"      SET "directoria_id" = (SELECT "id" FROM "diretorias" WHERE "slug" = 'principal' LIMIT 1) WHERE "directoria_id" IS NULL;
UPDATE "events"        SET "directoria_id" = (SELECT "id" FROM "diretorias" WHERE "slug" = 'principal' LIMIT 1) WHERE "directoria_id" IS NULL;
UPDATE "activity_logs" SET "directoria_id" = (SELECT "id" FROM "diretorias" WHERE "slug" = 'principal' LIMIT 1) WHERE "directoria_id" IS NULL;

-- 5. Adicionar FKs
ALTER TABLE "users"         ADD FOREIGN KEY ("directoria_id") REFERENCES "diretorias"("id") ON DELETE SET NULL;
ALTER TABLE "projects"      ADD FOREIGN KEY ("directoria_id") REFERENCES "diretorias"("id") ON DELETE CASCADE;
ALTER TABLE "tasks"         ADD FOREIGN KEY ("directoria_id") REFERENCES "diretorias"("id") ON DELETE CASCADE;
ALTER TABLE "absences"      ADD FOREIGN KEY ("directoria_id") REFERENCES "diretorias"("id") ON DELETE CASCADE;
ALTER TABLE "events"        ADD FOREIGN KEY ("directoria_id") REFERENCES "diretorias"("id") ON DELETE CASCADE;
ALTER TABLE "activity_logs" ADD FOREIGN KEY ("directoria_id") REFERENCES "diretorias"("id") ON DELETE SET NULL;

-- 6. NOT NULL nas entidades principais (depois de popul-las)
ALTER TABLE "projects" ALTER COLUMN "directoria_id" SET NOT NULL;
ALTER TABLE "tasks"    ALTER COLUMN "directoria_id" SET NOT NULL;
ALTER TABLE "absences" ALTER COLUMN "directoria_id" SET NOT NULL;
ALTER TABLE "events"   ALTER COLUMN "directoria_id" SET NOT NULL;

-- 7. Índices
CREATE INDEX IF NOT EXISTS "users_directoria_id_idx"         ON "users"("directoria_id");
CREATE INDEX IF NOT EXISTS "projects_directoria_id_idx"      ON "projects"("directoria_id");
CREATE INDEX IF NOT EXISTS "tasks_directoria_id_idx"         ON "tasks"("directoria_id");
CREATE INDEX IF NOT EXISTS "absences_directoria_id_idx"      ON "absences"("directoria_id");
CREATE INDEX IF NOT EXISTS "events_directoria_id_idx"        ON "events"("directoria_id");
CREATE INDEX IF NOT EXISTS "activity_logs_directoria_id_idx" ON "activity_logs"("directoria_id");
