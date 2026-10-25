-- Backlog ready-for-signoff (docs/intent/ready-for-signoff.md). A student's link to their work, their requests for a
-- checkpoint's sign-off and the teacher's answers. Keyed on student and component, like checkpoint_signoff. Never
-- deleted; erasure goes through the school (roadmap R8), whose procedure will need to lift these triggers.

-- One class has one component, so this is the per-class setting (decision R-6).
ALTER TABLE component_instance ADD COLUMN require_link_for_signoff boolean NOT NULL DEFAULT false;

-- Every link a student has set for a component; the newest is current (FR-38). Stored, never fetched (FR-39).
CREATE TABLE document_link (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id     uuid        NOT NULL REFERENCES component_instance (id),
    student_user_id uuid        NOT NULL REFERENCES app_user (id),
    url             text        NOT NULL CHECK (char_length(url) <= 2000),
    set_at          timestamptz NOT NULL
);
CREATE INDEX document_link_current_idx ON document_link (instance_id, student_user_id, set_at DESC);

CREATE FUNCTION document_link_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'document_link is history: a new link is a new row' USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER document_link_guard BEFORE UPDATE OR DELETE ON document_link
    FOR EACH ROW EXECUTE FUNCTION document_link_guard();

-- A request is open until the student withdraws it or the teacher answers it, once.
CREATE TABLE signoff_request (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id         uuid        NOT NULL REFERENCES component_instance (id),
    student_user_id     uuid        NOT NULL REFERENCES app_user (id),
    checkpoint_id       uuid        NOT NULL REFERENCES template_checkpoint (id),
    asked_at            timestamptz NOT NULL,
    student_note        text        CHECK (char_length(student_note) <= 280),
    withdrawn_at        timestamptz,
    answered_by_user_id uuid        REFERENCES app_user (id),
    answered_at         timestamptz,
    outcome             text        CHECK (outcome IN ('ACCEPTED', 'NOT_YET')),
    teacher_note        text        CHECK (char_length(teacher_note) <= 500),
    CONSTRAINT signoff_request_answered_together
        CHECK ((answered_by_user_id IS NULL) = (answered_at IS NULL) AND (answered_at IS NULL) = (outcome IS NULL)),
    CONSTRAINT signoff_request_note_needs_answer CHECK (teacher_note IS NULL OR answered_at IS NOT NULL),
    CONSTRAINT signoff_request_closed_once CHECK (withdrawn_at IS NULL OR answered_at IS NULL)
);

-- At most one open request per student and checkpoint in a component. SignoffRequestRepository.ask's ON CONFLICT
-- names exactly these columns and this predicate.
CREATE UNIQUE INDEX signoff_request_open
    ON signoff_request (instance_id, student_user_id, checkpoint_id) WHERE withdrawn_at IS NULL AND answered_at IS NULL;
CREATE INDEX signoff_request_component_idx ON signoff_request (instance_id, asked_at);

CREATE FUNCTION signoff_request_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE'
       OR OLD.withdrawn_at IS NOT NULL OR OLD.answered_at IS NOT NULL
       OR (NEW.withdrawn_at IS NULL AND NEW.answered_at IS NULL)
       OR NEW.id <> OLD.id OR NEW.instance_id <> OLD.instance_id
       OR NEW.student_user_id <> OLD.student_user_id OR NEW.checkpoint_id <> OLD.checkpoint_id
       OR NEW.asked_at <> OLD.asked_at OR NEW.student_note IS DISTINCT FROM OLD.student_note THEN
        RAISE EXCEPTION 'signoff_request is never deleted: an open row may be withdrawn or answered, once'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER signoff_request_guard BEFORE UPDATE OR DELETE ON signoff_request
    FOR EACH ROW EXECUTE FUNCTION signoff_request_guard();
