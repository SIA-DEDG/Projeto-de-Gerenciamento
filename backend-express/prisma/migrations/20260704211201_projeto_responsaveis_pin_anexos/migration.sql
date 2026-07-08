-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "attachments" TEXT;

-- CreateTable
CREATE TABLE "project_responsibles" (
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "project_responsibles_pkey" PRIMARY KEY ("project_id","user_id")
);

-- CreateTable
CREATE TABLE "task_pins" (
    "task_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_pins_pkey" PRIMARY KEY ("task_id","user_id")
);

-- CreateIndex
CREATE INDEX "idx_project_responsibles_user_id" ON "project_responsibles"("user_id");

-- CreateIndex
CREATE INDEX "idx_task_pins_user_id" ON "task_pins"("user_id");

-- AddForeignKey
ALTER TABLE "project_responsibles" ADD CONSTRAINT "project_responsibles_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "project_responsibles" ADD CONSTRAINT "project_responsibles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "task_pins" ADD CONSTRAINT "task_pins_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "task_pins" ADD CONSTRAINT "task_pins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill de dados (adoção de responsáveis/owner de projeto)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Responsáveis dos projetos existentes = participantes atuais das atividades
--    (responsável + co-responsáveis das tarefas vinculadas ao projeto).
INSERT INTO "project_responsibles" ("project_id", "user_id")
SELECT DISTINCT t."project_id", t."responsible_id"
FROM "tasks" t
WHERE t."project_id" IS NOT NULL AND t."responsible_id" IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO "project_responsibles" ("project_id", "user_id")
SELECT DISTINCT t."project_id", tcr."user_id"
FROM "tasks" t
JOIN "task_co_responsibles" tcr ON tcr."task_id" = t."id"
WHERE t."project_id" IS NOT NULL
ON CONFLICT DO NOTHING;

-- 2. Owner dos projetos SEM dono = quem criou o projeto (registrado em activity_logs).
--    Pega o primeiro CREATE de cada projeto. Projetos sem registro de criação
--    permanecem sem owner (serão tratados manualmente).
UPDATE "projects" p
SET "owner_id" = sub."user_id"
FROM (
  SELECT DISTINCT ON (al."entity_id") al."entity_id", al."user_id"
  FROM "activity_logs" al
  WHERE al."action" = 'CREATE' AND al."entity_type" = 'project'
  ORDER BY al."entity_id", al."created_at" ASC
) sub
WHERE p."owner_id" IS NULL AND sub."entity_id" = p."id"::text;
