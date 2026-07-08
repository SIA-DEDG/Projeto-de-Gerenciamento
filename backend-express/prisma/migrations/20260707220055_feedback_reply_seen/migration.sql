-- Aviso de "feedback respondido" passa a ser rastreado por usuário no banco
-- (antes era localStorage por dispositivo). Marcado como visto pelo autor.
ALTER TABLE "feedbacks" ADD COLUMN "reply_seen" BOOLEAN NOT NULL DEFAULT false;
