-- A class's component: the brief it runs, its stage dates, and the teacher's own items (design §6.4).

-- One component per class (plan 2D P2-23). A brief is shared by every class that runs it.
CREATE TABLE component_instance (
    id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    class_group_id     uuid        NOT NULL UNIQUE REFERENCES class_group (id),
    annual_brief_id    uuid        NOT NULL REFERENCES annual_brief (id),
    created_by_user_id uuid        NOT NULL REFERENCES app_user (id),
    created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX component_instance_brief_idx ON component_instance (annual_brief_id);

-- The class's own date for a stage. No row means "no date yet". Dates needn't be in stage order.
CREATE TABLE instance_stage_date (
    instance_id       uuid        NOT NULL REFERENCES component_instance (id),
    template_stage_id uuid        NOT NULL REFERENCES template_stage (id),
    due_date          date        NOT NULL,
    updated_at        timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (instance_id, template_stage_id)
);

-- The teacher's own to-dos inside a stage. Retired, never deleted.
CREATE TABLE teacher_item (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id       uuid        NOT NULL REFERENCES component_instance (id),
    template_stage_id uuid        NOT NULL REFERENCES template_stage (id),
    ordinal           int         NOT NULL CONSTRAINT teacher_item_ordinal_positive CHECK (ordinal > 0),
    text              text        NOT NULL CONSTRAINT teacher_item_text_present CHECK (btrim(text) <> '' AND char_length(text) <= 200),
    due_date          date,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    retired_at        timestamptz,
    CONSTRAINT teacher_item_ordinal_unique UNIQUE (instance_id, template_stage_id, ordinal)
);
CREATE INDEX teacher_item_instance_idx ON teacher_item (instance_id);

-- Design §6.4: a date after the brief's completion date is refused in the service, and here as a backstop.
-- The stage must also belong to the version the component's brief pins.
CREATE FUNCTION check_component_date() RETURNS trigger
    LANGUAGE plpgsql AS $$
DECLARE
    v_completion date;
    v_version    uuid;
BEGIN
    SELECT b.completion_date, b.template_version_id INTO v_completion, v_version
    FROM component_instance i JOIN annual_brief b ON b.id = i.annual_brief_id
    WHERE i.id = NEW.instance_id;

    IF NOT EXISTS (SELECT 1 FROM template_stage WHERE id = NEW.template_stage_id AND version_id = v_version) THEN
        RAISE EXCEPTION 'stage % isn''t in this component''s template version', NEW.template_stage_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF NEW.due_date IS NOT NULL AND NEW.due_date > v_completion THEN
        RAISE EXCEPTION 'COMPLETION_DATE_EXCEEDED: % is after the completion date %', NEW.due_date, v_completion
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER instance_stage_date_within_completion BEFORE INSERT OR UPDATE ON instance_stage_date
    FOR EACH ROW EXECUTE FUNCTION check_component_date();
CREATE TRIGGER teacher_item_within_completion BEFORE INSERT OR UPDATE ON teacher_item
    FOR EACH ROW EXECUTE FUNCTION check_component_date();
