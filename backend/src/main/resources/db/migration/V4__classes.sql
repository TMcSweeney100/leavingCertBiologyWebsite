-- A teacher's class for one subject in one academic year (design §6.1).
CREATE TABLE class_group (
    id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id            uuid        NOT NULL REFERENCES school (id),
    subject_id           uuid        NOT NULL REFERENCES subject (id),
    name                 text        NOT NULL CONSTRAINT class_group_name_present CHECK (btrim(name) <> ''),
    year_group           int         NOT NULL CONSTRAINT class_group_year_group_valid CHECK (year_group IN (5, 6)),
    academic_year        text        NOT NULL CONSTRAINT class_group_academic_year_format CHECK (academic_year ~ '^[0-9]{4}/[0-9]{2}$'),
    -- Optional: 5th year classes are often mixed.
    level                text        CONSTRAINT class_group_level_valid CHECK (level IN ('HIGHER', 'ORDINARY', 'MIXED')),
    owner_user_id        uuid        NOT NULL REFERENCES app_user (id),
    -- 8 characters, no 0/O/1/I/L. NULL means joining is off.
    join_code            text        UNIQUE CONSTRAINT class_group_join_code_format CHECK (join_code ~ '^[A-HJKMNP-Z2-9]{8}$'),
    join_code_expires_at timestamptz,
    created_at           timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT class_group_join_code_expiry CHECK ((join_code IS NULL) = (join_code_expires_at IS NULL))
);
CREATE INDEX class_group_owner_idx ON class_group (owner_user_id);
CREATE INDEX class_group_school_idx ON class_group (school_id);

CREATE TABLE enrolment (
    id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    class_group_id     uuid        NOT NULL REFERENCES class_group (id),
    student_user_id    uuid        NOT NULL REFERENCES app_user (id),
    status             text        NOT NULL CONSTRAINT enrolment_status_valid CHECK (status IN ('PENDING', 'APPROVED', 'REMOVED')),
    requested_at       timestamptz NOT NULL,
    decided_at         timestamptz,
    decided_by_user_id uuid        REFERENCES app_user (id),
    created_at         timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT enrolment_unique UNIQUE (class_group_id, student_user_id)
);
CREATE INDEX enrolment_student_idx ON enrolment (student_user_id);
