ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS resposta TEXT;

CREATE TABLE IF NOT EXISTS feedback_upvotes (
    feedback_id UUID NOT NULL REFERENCES feedbacks(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (feedback_id, user_id)
);
