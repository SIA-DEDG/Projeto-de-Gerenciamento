-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Funcionario',
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "owner_id" UUID,
    "deadline" DATE,
    "executive_status" TEXT,
    "objective" TEXT,
    "scope" TEXT,
    "summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "responsible_id" UUID,
    "status" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'Média',
    "created_at" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "project_id" UUID,
    "external_collaborators" TEXT,
    "deadline" DATE,
    "archived" BOOLEAN NOT NULL DEFAULT false,

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
    "id" UUID NOT NULL,
    "user_id" UUID,
    "reason" TEXT NOT NULL,
    "justification" TEXT,
    "file_name" TEXT,
    "file_data" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "approval_status" TEXT NOT NULL DEFAULT 'pendente',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "absences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "attendees" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "start_time" TEXT,
    "minutes_file_name" TEXT,
    "minutes_file_data" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
    "id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "severidade" TEXT,
    "usuario_id" UUID,
    "usuario_nome" TEXT,
    "imagens" TEXT,
    "resposta" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_upvotes" (
    "feedback_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_upvotes_pkey" PRIMARY KEY ("feedback_id","user_id")
);

-- CreateTable
CREATE TABLE "feedback_comments" (
    "id" UUID NOT NULL,
    "feedback_id" UUID NOT NULL,
    "parent_id" UUID,
    "usuario_id" UUID,
    "usuario_nome" TEXT NOT NULL DEFAULT 'Anônimo',
    "conteudo" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "user_name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_co_responsibles" ADD CONSTRAINT "task_co_responsibles_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_co_responsibles" ADD CONSTRAINT "task_co_responsibles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absences" ADD CONSTRAINT "absences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_responsibles" ADD CONSTRAINT "event_responsibles_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_responsibles" ADD CONSTRAINT "event_responsibles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_upvotes" ADD CONSTRAINT "feedback_upvotes_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "feedbacks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_upvotes" ADD CONSTRAINT "feedback_upvotes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_comments" ADD CONSTRAINT "feedback_comments_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "feedbacks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_comments" ADD CONSTRAINT "feedback_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "feedback_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_comments" ADD CONSTRAINT "feedback_comments_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
