-- Component templates, versioned, and the SEC's annual briefs (design §6.2, §6.3). The rows are content
-- (db/content) and are reviewed against the source PDFs; this file is only their shape. V7 adds the
-- triggers that freeze a published version's structure.
--
-- Composite keys: every row below a version carries version_id, and points at its parent by
-- (id, version_id), so a checkpoint can't hang off a stage from another version.

CREATE TABLE component_template (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id        uuid        NOT NULL REFERENCES subject (id),
    slug              text        NOT NULL UNIQUE CONSTRAINT component_template_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    name              text        NOT NULL CONSTRAINT component_template_name_present CHECK (btrim(name) <> ''),
    deliverable_type  text        NOT NULL CONSTRAINT component_template_deliverable_valid CHECK (deliverable_type IN ('REPORT')),
    weighting_percent int         NOT NULL CONSTRAINT component_template_weighting_valid CHECK (weighting_percent BETWEEN 1 AND 100),
    marks_total       int         NOT NULL CONSTRAINT component_template_marks_positive CHECK (marks_total > 0),
    created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE template_version (
    id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id             uuid        NOT NULL REFERENCES component_template (id),
    version_no              int         NOT NULL CONSTRAINT template_version_no_positive CHECK (version_no > 0),
    status                  text        NOT NULL DEFAULT 'DRAFT'
                                        CONSTRAINT template_version_status_valid CHECK (status IN ('DRAFT', 'PUBLISHED', 'RETIRED')),
    -- "The stages aren't linear" (science) / "monitoring and reflection run across all stages" (Business).
    process_note            text        NOT NULL,
    process_note_source_ref text        NOT NULL,
    published_at            timestamptz,
    created_at              timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT template_version_unique UNIQUE (template_id, version_no),
    CONSTRAINT template_version_id_template UNIQUE (id, template_id),
    CONSTRAINT template_version_published_at CHECK ((status = 'DRAFT') = (published_at IS NULL))
);

CREATE TABLE template_stage (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id  uuid        NOT NULL REFERENCES template_version (id),
    ordinal     int         NOT NULL CONSTRAINT template_stage_ordinal_positive CHECK (ordinal > 0),
    -- "Stage 1" … "Stage 6"; NULL for Business's unnumbered "Compilation of the final report".
    label       text,
    name        text        NOT NULL,
    description text        NOT NULL,
    -- Display only in the pilot. "Up to 4 hours" is (NULL, 4).
    hours_min   int         CONSTRAINT template_stage_hours_min_valid CHECK (hours_min >= 0),
    hours_max   int         CONSTRAINT template_stage_hours_max_valid CHECK (hours_max > 0),
    -- Stages sharing one estimate (Business Stages 4 and 5, "6-8 hours") share a group key and the same hours.
    hours_group text,
    supervised  boolean     NOT NULL DEFAULT false,
    source_ref  text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT template_stage_ordinal_unique UNIQUE (version_id, ordinal),
    CONSTRAINT template_stage_id_version UNIQUE (id, version_id),
    CONSTRAINT template_stage_hours_order CHECK (hours_min IS NULL OR hours_max IS NULL OR hours_min <= hours_max)
);

CREATE TABLE template_section (
    id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id         uuid        NOT NULL REFERENCES template_version (id),
    ordinal            int         NOT NULL CONSTRAINT template_section_ordinal_positive CHECK (ordinal > 0),
    label              text        NOT NULL,
    name               text        NOT NULL,
    suggested_words    int         CONSTRAINT template_section_words_positive CHECK (suggested_words > 0),
    indicative_content text[]      NOT NULL DEFAULT '{}',
    source_ref         text        NOT NULL,
    created_at         timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT template_section_ordinal_unique UNIQUE (version_id, ordinal),
    CONSTRAINT template_section_id_version UNIQUE (id, version_id)
);

-- Which stage a report section is written during. Empty until that mapping is confirmed (plan 2A P2-5).
CREATE TABLE template_section_stage (
    version_id uuid NOT NULL,
    section_id uuid NOT NULL,
    stage_id   uuid NOT NULL,
    PRIMARY KEY (section_id, stage_id),
    FOREIGN KEY (section_id, version_id) REFERENCES template_section (id, version_id),
    FOREIGN KEY (stage_id, version_id) REFERENCES template_stage (id, version_id)
);

CREATE TABLE template_mark_band (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id   uuid        NOT NULL REFERENCES template_version (id),
    ordinal      int         NOT NULL CONSTRAINT template_mark_band_ordinal_positive CHECK (ordinal > 0),
    -- Science bands are lettered A-D; Business bands have names only.
    label        text,
    name         text,
    marks        int         NOT NULL CONSTRAINT template_mark_band_marks_positive CHECK (marks > 0),
    whole_report boolean     NOT NULL,
    criteria     text[]      NOT NULL DEFAULT '{}',
    source_ref   text        NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT template_mark_band_ordinal_unique UNIQUE (version_id, ordinal),
    CONSTRAINT template_mark_band_id_version UNIQUE (id, version_id),
    CONSTRAINT template_mark_band_named CHECK (label IS NOT NULL OR name IS NOT NULL)
);

CREATE TABLE template_mark_band_section (
    version_id uuid NOT NULL,
    band_id    uuid NOT NULL,
    section_id uuid NOT NULL,
    PRIMARY KEY (band_id, section_id),
    FOREIGN KEY (band_id, version_id) REFERENCES template_mark_band (id, version_id),
    FOREIGN KEY (section_id, version_id) REFERENCES template_section (id, version_id)
);

-- Teacher sign-offs, drawn only from where the guidelines have a student share work (design §7.3).
CREATE TABLE template_checkpoint (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id   uuid        NOT NULL,
    stage_id     uuid        NOT NULL,
    ordinal      int         NOT NULL CONSTRAINT template_checkpoint_ordinal_positive CHECK (ordinal > 0),
    -- Working wording, reviewed by the subject's teacher (roadmap Q1).
    text         text        NOT NULL,
    basis        text        NOT NULL CONSTRAINT template_checkpoint_basis_valid CHECK (basis IN ('EXPLICIT', 'DESCRIBED')),
    -- The guideline sentence the checkpoint rests on, word for word.
    source_quote text        NOT NULL,
    source_ref   text        NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT template_checkpoint_ordinal_unique UNIQUE (stage_id, ordinal),
    FOREIGN KEY (stage_id, version_id) REFERENCES template_stage (id, version_id)
);

-- The guidelines' own sample questions, shown read-only.
CREATE TABLE template_prompt (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id uuid        NOT NULL,
    stage_id   uuid        NOT NULL,
    ordinal    int         NOT NULL CONSTRAINT template_prompt_ordinal_positive CHECK (ordinal > 0),
    heading    text,
    text       text        NOT NULL,
    source_ref text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT template_prompt_ordinal_unique UNIQUE (stage_id, ordinal),
    FOREIGN KEY (stage_id, version_id) REFERENCES template_stage (id, version_id)
);

-- One SEC brief per template per exam year. It pins the template version whose sections it uses.
CREATE TABLE annual_brief (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id         uuid        NOT NULL REFERENCES component_template (id),
    template_version_id uuid        NOT NULL,
    exam_year           int         NOT NULL CONSTRAINT annual_brief_exam_year_valid CHECK (exam_year BETWEEN 2027 AND 2100),
    sec_code            text        NOT NULL UNIQUE CONSTRAINT annual_brief_sec_code_format CHECK (sec_code ~ '^[0-9]{4}L[0-9]{3}C[0-9]E[A-Z]$'),
    status              text        NOT NULL DEFAULT 'DRAFT' CONSTRAINT annual_brief_status_valid CHECK (status IN ('DRAFT', 'PUBLISHED')),
    title               text        NOT NULL,
    topic_title         text,
    topic_body          text        NOT NULL,
    completion_date     date        NOT NULL,
    word_limit          int         NOT NULL CONSTRAINT annual_brief_word_limit_positive CHECK (word_limit > 0),
    words_not_counted   text        NOT NULL,
    image_limit         int         NOT NULL CONSTRAINT annual_brief_image_limit_valid CHECK (image_limit >= 0),
    image_note          text,
    source_url          text        CONSTRAINT annual_brief_source_url_https CHECK (source_url ~ '^https://'),
    source_ref          text        NOT NULL,
    published_at        timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT annual_brief_one_per_year UNIQUE (template_id, exam_year),
    CONSTRAINT annual_brief_year_matches_code CHECK (exam_year = substring(sec_code, 1, 4)::int),
    CONSTRAINT annual_brief_published_at CHECK ((status = 'DRAFT') = (published_at IS NULL)),
    FOREIGN KEY (template_version_id, template_id) REFERENCES template_version (id, template_id)
);

-- The brief's formatting-rules table, row by row, in its own words.
CREATE TABLE brief_rule (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    brief_id   uuid        NOT NULL REFERENCES annual_brief (id),
    ordinal    int         NOT NULL CONSTRAINT brief_rule_ordinal_positive CHECK (ordinal > 0),
    key        text        NOT NULL,
    value      text        NOT NULL,
    source_ref text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT brief_rule_ordinal_unique UNIQUE (brief_id, ordinal)
);
