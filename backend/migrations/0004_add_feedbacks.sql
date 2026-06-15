CREATE TABLE IF NOT EXISTS feedbacks (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo         TEXT NOT NULL,
    titulo       TEXT NOT NULL,
    descricao    TEXT NOT NULL,
    severidade   TEXT,
    usuario_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    usuario_nome TEXT,
    imagens      TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks (created_at DESC);
