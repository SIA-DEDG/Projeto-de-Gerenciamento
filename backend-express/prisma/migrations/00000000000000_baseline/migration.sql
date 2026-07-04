-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "diretorias" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diretorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Funcionario',
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "directoria_id" UUID,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "category" TEXT,
    "deadline" DATE,
    "executive_status" TEXT,
    "objective" TEXT,
    "scope" TEXT,
    "summary" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "owner_id" UUID,
    "directoria_id" UUID NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'Média',
    "created_at" DATE NOT NULL DEFAULT CURRENT_DATE,
    "description" TEXT,
    "project_id" UUID,
    "external_collaborators" TEXT,
    "responsible_id" UUID,
    "deadline" DATE,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "directoria_id" UUID NOT NULL,
    "attachments" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_co_responsibles" (
    "task_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "task_co_responsibles_pkey" PRIMARY KEY ("task_id","user_id")
);

-- CreateTable
CREATE TABLE "absences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reason" TEXT NOT NULL,
    "justification" TEXT,
    "file_name" TEXT,
    "file_data" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID,
    "approval_status" TEXT NOT NULL DEFAULT 'pendente',
    "file_path" TEXT,
    "directoria_id" UUID NOT NULL,

    CONSTRAINT "absences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "attendees" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "start_time" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "minutes_file_name" TEXT,
    "minutes_file_path" TEXT,
    "directoria_id" UUID NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_responsibles" (
    "event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "event_responsibles_pkey" PRIMARY KEY ("event_id","user_id")
);

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "severidade" TEXT,
    "usuario_id" UUID,
    "usuario_nome" TEXT,
    "usuario_diretoria" TEXT,
    "imagens" TEXT,
    "resposta" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_upvotes" (
    "feedback_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_upvotes_pkey" PRIMARY KEY ("feedback_id","user_id")
);

-- CreateTable
CREATE TABLE "feedback_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "feedback_id" UUID NOT NULL,
    "parent_id" UUID,
    "usuario_id" UUID,
    "usuario_nome" TEXT NOT NULL DEFAULT 'An?nimo',
    "conteudo" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "user_name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "directoria_id" UUID,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_sqlx_migrations" (
    "version" BIGINT NOT NULL,
    "description" TEXT NOT NULL,
    "installed_on" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL,
    "checksum" BYTEA NOT NULL,
    "execution_time" BIGINT NOT NULL,

    CONSTRAINT "_sqlx_migrations_pkey" PRIMARY KEY ("version")
);

-- CreateTable
CREATE TABLE "evidences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT,
    "note" TEXT,
    "storage_path" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "diretorias_slug_key" ON "diretorias"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_directoria_id_idx" ON "users"("directoria_id");

-- CreateIndex
CREATE INDEX "projects_directoria_id_idx" ON "projects"("directoria_id");

-- CreateIndex
CREATE INDEX "tasks_archived_idx" ON "tasks"("archived");

-- CreateIndex
CREATE INDEX "tasks_directoria_id_idx" ON "tasks"("directoria_id");

-- CreateIndex
CREATE INDEX "idx_tasks_category" ON "tasks"("category");

-- CreateIndex
CREATE INDEX "idx_tasks_responsible_id" ON "tasks"("responsible_id");

-- CreateIndex
CREATE INDEX "idx_tasks_status" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "idx_tcr_task_id" ON "task_co_responsibles"("task_id");

-- CreateIndex
CREATE INDEX "absences_directoria_id_idx" ON "absences"("directoria_id");

-- CreateIndex
CREATE INDEX "idx_absences_start" ON "absences"("start_date");

-- CreateIndex
CREATE INDEX "idx_absences_user_id" ON "absences"("user_id");

-- CreateIndex
CREATE INDEX "events_archived_idx" ON "events"("archived");

-- CreateIndex
CREATE INDEX "events_directoria_id_idx" ON "events"("directoria_id");

-- CreateIndex
CREATE INDEX "idx_events_start" ON "events"("start_date");

-- CreateIndex
CREATE INDEX "idx_er_event_id" ON "event_responsibles"("event_id");

-- CreateIndex
CREATE INDEX "feedbacks_created_at_idx" ON "feedbacks"("created_at");

-- CreateIndex
CREATE INDEX "feedback_comments_feedback_idx" ON "feedback_comments"("feedback_id");

-- CreateIndex
CREATE INDEX "activity_logs_directoria_id_idx" ON "activity_logs"("directoria_id");

-- CreateIndex
CREATE INDEX "idx_logs_created_at" ON "activity_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_logs_entity_type" ON "activity_logs"("entity_type");

-- CreateIndex
CREATE INDEX "idx_logs_user_id" ON "activity_logs"("user_id");

-- CreateIndex
CREATE INDEX "idx_evidences_task_id" ON "evidences"("task_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_directoria_id_fkey" FOREIGN KEY ("directoria_id") REFERENCES "diretorias"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_directoria_id_fkey" FOREIGN KEY ("directoria_id") REFERENCES "diretorias"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_directoria_id_fkey" FOREIGN KEY ("directoria_id") REFERENCES "diretorias"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "task_co_responsibles" ADD CONSTRAINT "task_co_responsibles_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "task_co_responsibles" ADD CONSTRAINT "task_co_responsibles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "absences" ADD CONSTRAINT "absences_directoria_id_fkey" FOREIGN KEY ("directoria_id") REFERENCES "diretorias"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "absences" ADD CONSTRAINT "absences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_directoria_id_fkey" FOREIGN KEY ("directoria_id") REFERENCES "diretorias"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "event_responsibles" ADD CONSTRAINT "event_responsibles_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "event_responsibles" ADD CONSTRAINT "event_responsibles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feedback_upvotes" ADD CONSTRAINT "feedback_upvotes_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "feedbacks"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feedback_upvotes" ADD CONSTRAINT "feedback_upvotes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feedback_comments" ADD CONSTRAINT "feedback_comments_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "feedbacks"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_directoria_id_fkey" FOREIGN KEY ("directoria_id") REFERENCES "diretorias"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

