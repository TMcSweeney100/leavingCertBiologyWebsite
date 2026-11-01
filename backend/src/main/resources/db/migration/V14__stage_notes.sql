-- The teacher's own note on one stage of their class's component (plan stage-sheet S-8). Shown to the class's
-- students beside the official description, which it never replaces. Plain text; links in it are never fetched.
CREATE TABLE stage_note (
    instance_id       uuid        NOT NULL REFERENCES component_instance (id),
    template_stage_id uuid        NOT NULL REFERENCES template_stage (id),
    text              text        NOT NULL CONSTRAINT stage_note_text_present CHECK (btrim(text) <> '' AND char_length(text) <= 1000),
    updated_at        timestamptz NOT NULL,
    PRIMARY KEY (instance_id, template_stage_id)
);
