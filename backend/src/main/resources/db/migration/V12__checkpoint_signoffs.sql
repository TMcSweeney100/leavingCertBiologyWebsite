-- Phase 4 (design §6.5): the teacher's sign-off of a checkpoint for one student. Keyed on student and component,
-- not enrolment (review issue #3), like item_tick and log_entry. Never deleted: undoing or revoking one sets
-- revoked_by_user_id and revoked_at, once; signing off again adds a new row. Erasure goes through the school
-- (roadmap R8), whose procedure will need to lift this trigger deliberately, as for the log.

CREATE TABLE checkpoint_signoff (
    id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id           uuid        NOT NULL REFERENCES component_instance (id),
    student_user_id       uuid        NOT NULL REFERENCES app_user (id),
    checkpoint_id         uuid        NOT NULL REFERENCES template_checkpoint (id),
    signed_off_by_user_id uuid        NOT NULL REFERENCES app_user (id),
    signed_off_at         timestamptz NOT NULL,
    revoked_by_user_id    uuid        REFERENCES app_user (id),
    revoked_at            timestamptz,
    CONSTRAINT checkpoint_signoff_revoked_together CHECK ((revoked_by_user_id IS NULL) = (revoked_at IS NULL))
);

-- At most one live sign-off per student and checkpoint in a component; revoked rows are unlimited.
-- SignoffRepository.signOff's ON CONFLICT names exactly these columns and this predicate.
CREATE UNIQUE INDEX checkpoint_signoff_current
    ON checkpoint_signoff (instance_id, student_user_id, checkpoint_id) WHERE revoked_at IS NULL;

CREATE FUNCTION checkpoint_signoff_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE'
       OR OLD.revoked_at IS NOT NULL
       OR NEW.revoked_at IS NULL
       OR NEW.id <> OLD.id OR NEW.instance_id <> OLD.instance_id
       OR NEW.student_user_id <> OLD.student_user_id OR NEW.checkpoint_id <> OLD.checkpoint_id
       OR NEW.signed_off_by_user_id <> OLD.signed_off_by_user_id OR NEW.signed_off_at <> OLD.signed_off_at THEN
        RAISE EXCEPTION 'checkpoint_signoff is never deleted: only a live row''s revoked_by_user_id and revoked_at may be set, once'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER checkpoint_signoff_guard BEFORE UPDATE OR DELETE ON checkpoint_signoff
    FOR EACH ROW EXECUTE FUNCTION checkpoint_signoff_guard();
