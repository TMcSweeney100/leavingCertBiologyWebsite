-- Reference table. Its rows are content (db/content), so they can change with review
-- and without a schema migration.
CREATE TABLE subject (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    code        text        NOT NULL UNIQUE CONSTRAINT subject_code_format CHECK (code ~ '^[A-Z_]+$'),
    name        text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);
