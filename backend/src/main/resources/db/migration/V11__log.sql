-- Phase 3 (design §6.6): a student's dated, versioned log per component. Keyed on student and component,
-- not enrolment (the item_tick choice, review issue #3). Append-only: nothing here is ever deleted, and only
-- an entry's visibility and current revision ever change. Erasure goes through the school (design §6.6);
-- the operator procedure for it (roadmap R8) will need to lift these triggers deliberately.

CREATE TABLE log_entry (
    id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id        uuid        NOT NULL REFERENCES component_instance (id),
    student_user_id    uuid        NOT NULL REFERENCES app_user (id),
    kind               text        NOT NULL CHECK (kind IN ('NOTE', 'SOURCE', 'AI_USE')),
    created_at         timestamptz NOT NULL,
    visible_to_teacher boolean     NOT NULL DEFAULT true,
    current_revision   integer     NOT NULL DEFAULT 1 CHECK (current_revision >= 1)
);
CREATE INDEX log_entry_list_idx ON log_entry (instance_id, student_user_id, created_at DESC);

CREATE TABLE log_entry_revision (
    entry_id    uuid        NOT NULL REFERENCES log_entry (id),
    revision_no integer     NOT NULL CHECK (revision_no >= 1),
    body        text        CHECK (length(body) <= 4000),
    fields      jsonb,
    created_at  timestamptz NOT NULL,
    PRIMARY KEY (entry_id, revision_no)
);

CREATE TABLE log_visibility_change (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id   uuid        NOT NULL REFERENCES log_entry (id),
    visible    boolean     NOT NULL,
    changed_at timestamptz NOT NULL
);
CREATE INDEX log_visibility_change_entry_idx ON log_visibility_change (entry_id, changed_at DESC);

CREATE FUNCTION log_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION '% is append-only: rows are never updated or deleted', TG_TABLE_NAME
        USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER log_entry_revision_append_only BEFORE UPDATE OR DELETE ON log_entry_revision
    FOR EACH ROW EXECUTE FUNCTION log_append_only();
CREATE TRIGGER log_visibility_change_append_only BEFORE UPDATE OR DELETE ON log_visibility_change
    FOR EACH ROW EXECUTE FUNCTION log_append_only();

-- An entry's identity and creation time are frozen; its revision number only moves forward.
CREATE FUNCTION log_entry_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE'
       OR NEW.id <> OLD.id OR NEW.instance_id <> OLD.instance_id OR NEW.student_user_id <> OLD.student_user_id
       OR NEW.kind <> OLD.kind OR NEW.created_at <> OLD.created_at
       OR NEW.current_revision < OLD.current_revision THEN
        RAISE EXCEPTION 'log_entry is append-only: only visible_to_teacher and a forward current_revision may change'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER log_entry_guard BEFORE UPDATE OR DELETE ON log_entry
    FOR EACH ROW EXECUTE FUNCTION log_entry_guard();
