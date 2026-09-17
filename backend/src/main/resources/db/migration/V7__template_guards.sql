-- Design §6.2: once a template version is PUBLISHED (or RETIRED), its text can be corrected but its
-- structure can't change. Classes already running stay on their version; structure changes make a new one.
--
-- One function guards every table below a version. Each trigger passes the names of that table's
-- correctable text columns (plan 2A P2-7). An UPDATE is allowed when the row is identical apart from
-- those columns; any other change, and any INSERT or DELETE, is refused.

CREATE FUNCTION template_version_status(p_version_id uuid) RETURNS text
    LANGUAGE sql STABLE AS $$ SELECT status FROM template_version WHERE id = p_version_id $$;

CREATE FUNCTION refuse_frozen_template_structure() RETURNS trigger
    LANGUAGE plpgsql AS $$
DECLARE
    v_old_status text;
    v_new_status text;
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        v_old_status := template_version_status(OLD.version_id);
    END IF;
    IF TG_OP IN ('UPDATE', 'INSERT') THEN
        v_new_status := template_version_status(NEW.version_id);
    END IF;

    IF TG_OP = 'UPDATE'
       AND v_old_status <> 'DRAFT'
       AND OLD.version_id = NEW.version_id
       AND (to_jsonb(NEW) - TG_ARGV) = (to_jsonb(OLD) - TG_ARGV) THEN
        RETURN NEW;
    END IF;

    IF coalesce(v_old_status, 'DRAFT') <> 'DRAFT' OR coalesce(v_new_status, 'DRAFT') <> 'DRAFT' THEN
        RAISE EXCEPTION '% on %: template version is %, so only its text can change; create a new template version',
            TG_OP, TG_TABLE_NAME, coalesce(v_old_status, v_new_status)
            USING ERRCODE = 'check_violation';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER template_stage_frozen BEFORE INSERT OR UPDATE OR DELETE ON template_stage
    FOR EACH ROW EXECUTE FUNCTION refuse_frozen_template_structure('label', 'name', 'description', 'source_ref', 'created_at');
CREATE TRIGGER template_section_frozen BEFORE INSERT OR UPDATE OR DELETE ON template_section
    FOR EACH ROW EXECUTE FUNCTION refuse_frozen_template_structure('label', 'name', 'indicative_content', 'source_ref', 'created_at');
CREATE TRIGGER template_section_stage_frozen BEFORE INSERT OR UPDATE OR DELETE ON template_section_stage
    FOR EACH ROW EXECUTE FUNCTION refuse_frozen_template_structure();
CREATE TRIGGER template_mark_band_frozen BEFORE INSERT OR UPDATE OR DELETE ON template_mark_band
    FOR EACH ROW EXECUTE FUNCTION refuse_frozen_template_structure('label', 'name', 'criteria', 'source_ref', 'created_at');
CREATE TRIGGER template_mark_band_section_frozen BEFORE INSERT OR UPDATE OR DELETE ON template_mark_band_section
    FOR EACH ROW EXECUTE FUNCTION refuse_frozen_template_structure();
CREATE TRIGGER template_checkpoint_frozen BEFORE INSERT OR UPDATE OR DELETE ON template_checkpoint
    FOR EACH ROW EXECUTE FUNCTION refuse_frozen_template_structure('text', 'source_quote', 'source_ref', 'created_at');
CREATE TRIGGER template_prompt_frozen BEFORE INSERT OR UPDATE OR DELETE ON template_prompt
    FOR EACH ROW EXECUTE FUNCTION refuse_frozen_template_structure('heading', 'text', 'source_ref', 'created_at');

-- The version itself: DRAFT -> PUBLISHED -> RETIRED, never back; a non-draft version keeps its template
-- and number and is never deleted. Its process note is text and stays correctable.
CREATE FUNCTION guard_template_version_lifecycle() RETURNS trigger
    LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.status <> 'DRAFT' THEN
            RAISE EXCEPTION 'template version % is %: it can''t be deleted; retire it instead', OLD.id, OLD.status
                USING ERRCODE = 'check_violation';
        END IF;
        RETURN OLD;
    END IF;

    IF OLD.status <> 'DRAFT'
       AND (NEW.template_id <> OLD.template_id OR NEW.version_no <> OLD.version_no) THEN
        RAISE EXCEPTION 'template version % is %: its template and number are fixed; create a new template version',
            OLD.id, OLD.status USING ERRCODE = 'check_violation';
    END IF;

    IF NOT ((OLD.status = NEW.status)
            OR (OLD.status = 'DRAFT' AND NEW.status = 'PUBLISHED')
            OR (OLD.status = 'PUBLISHED' AND NEW.status = 'RETIRED')) THEN
        RAISE EXCEPTION 'template version % can''t go from % to %; create a new template version',
            OLD.id, OLD.status, NEW.status USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER template_version_lifecycle BEFORE UPDATE OR DELETE ON template_version
    FOR EACH ROW EXECUTE FUNCTION guard_template_version_lifecycle();
-- Design §6.3 and plan 2A P2-8: a published brief keeps its template, version, exam year and SEC code, and
-- its rule rows; its completion date, limits and wording stay correctable because the SEC can move a date.
CREATE FUNCTION guard_annual_brief() RETURNS trigger
    LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.status <> 'DRAFT' THEN
            RAISE EXCEPTION 'brief % is published: it can''t be deleted', OLD.sec_code USING ERRCODE = 'check_violation';
        END IF;
        RETURN OLD;
    END IF;

    -- Only checked on the transition into PUBLISHED: once published, the block below keeps the brief's
    -- template_version_id fixed, so a later retirement of that version must not re-fail this check on an
    -- unrelated update (a completion-date move, say).
    IF NEW.status = 'PUBLISHED' AND (TG_OP = 'INSERT' OR OLD.status <> 'PUBLISHED')
       AND template_version_status(NEW.template_version_id) <> 'PUBLISHED' THEN
        RAISE EXCEPTION 'brief % can''t be published on a template version that isn''t published', NEW.sec_code
            USING ERRCODE = 'check_violation';
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.status = 'PUBLISHED'
       AND (NEW.status <> 'PUBLISHED'
            OR NEW.template_id <> OLD.template_id
            OR NEW.template_version_id <> OLD.template_version_id
            OR NEW.exam_year <> OLD.exam_year
            OR NEW.sec_code <> OLD.sec_code) THEN
        RAISE EXCEPTION 'brief % is published: its template, version, year, code and status are fixed', OLD.sec_code
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER annual_brief_guard BEFORE INSERT OR UPDATE OR DELETE ON annual_brief
    FOR EACH ROW EXECUTE FUNCTION guard_annual_brief();

CREATE FUNCTION brief_status(p_brief_id uuid) RETURNS text
    LANGUAGE sql STABLE AS $$ SELECT status FROM annual_brief WHERE id = p_brief_id $$;

CREATE FUNCTION refuse_frozen_brief_rules() RETURNS trigger
    LANGUAGE plpgsql AS $$
DECLARE
    v_old_status text;
    v_new_status text;
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        v_old_status := brief_status(OLD.brief_id);
    END IF;
    IF TG_OP IN ('UPDATE', 'INSERT') THEN
        v_new_status := brief_status(NEW.brief_id);
    END IF;

    IF TG_OP = 'UPDATE' AND v_old_status = 'PUBLISHED' AND OLD.brief_id = NEW.brief_id
       AND (to_jsonb(NEW) - TG_ARGV) = (to_jsonb(OLD) - TG_ARGV) THEN
        RETURN NEW;
    END IF;

    IF coalesce(v_old_status, 'DRAFT') <> 'DRAFT' OR coalesce(v_new_status, 'DRAFT') <> 'DRAFT' THEN
        RAISE EXCEPTION '% on brief_rule: the brief is published, so only rule wording can change', TG_OP
            USING ERRCODE = 'check_violation';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER brief_rule_frozen BEFORE INSERT OR UPDATE OR DELETE ON brief_rule
    FOR EACH ROW EXECUTE FUNCTION refuse_frozen_brief_rules('key', 'value', 'source_ref', 'created_at');
