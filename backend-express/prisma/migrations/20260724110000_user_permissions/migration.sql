ALTER TABLE "users"
  ADD COLUMN "email" TEXT,
  ADD COLUMN "job_title" TEXT,
  ADD COLUMN "permissions" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE TABLE "permission_presets" (
  "role" TEXT NOT NULL,
  "permissions" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "permission_presets_pkey" PRIMARY KEY ("role")
);