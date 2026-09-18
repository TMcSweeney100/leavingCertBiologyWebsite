-- A student's own tick on a teacher item (design §6.5). Self-reported, and the interface says so.
-- Keyed on student and component, not enrolment (review issue #3). Unticking clears done_at; the row stays.
CREATE TABLE item_tick (
    instance_id     uuid        NOT NULL REFERENCES component_instance (id),
    student_user_id uuid        NOT NULL REFERENCES app_user (id),
    teacher_item_id uuid        NOT NULL REFERENCES teacher_item (id),
    done_at         timestamptz,
    updated_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (student_user_id, teacher_item_id)
);
CREATE INDEX item_tick_instance_idx ON item_tick (instance_id, student_user_id);
