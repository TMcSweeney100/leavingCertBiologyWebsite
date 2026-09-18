-- The student's own timeline items (design §3.2, §6.8). Private to the student: no role but the owner reads
-- this table, in any view or aggregate. No revisions, no retention rule: students edit and delete freely.
CREATE TABLE personal_item (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    student_user_id uuid        NOT NULL REFERENCES app_user (id),
    title           text        NOT NULL CONSTRAINT personal_item_title_present CHECK (btrim(title) <> '' AND char_length(title) <= 120),
    due_date        date        NOT NULL,
    kind            text        NOT NULL CONSTRAINT personal_item_kind_valid CHECK (kind IN ('TEST', 'ESSAY', 'DEADLINE', 'OTHER')),
    -- Only labels the item with a subject. Grants nobody any access.
    class_group_id  uuid        REFERENCES class_group (id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX personal_item_owner_date_idx ON personal_item (student_user_id, due_date);
