CREATE TABLE school (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text        NOT NULL,
    roll_number text        NOT NULL UNIQUE,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Deliberately minimal: nothing is collected that the pilot doesn't use (design §6.1).
CREATE TABLE app_user (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name  text        NOT NULL CONSTRAINT app_user_first_name_present CHECK (btrim(first_name) <> ''),
    last_name   text        NOT NULL CONSTRAINT app_user_last_name_present CHECK (btrim(last_name) <> ''),
    disabled_at timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Separate from app_user so school sign-in can arrive later without restructuring accounts (design §5.2).
CREATE TABLE password_credential (
    user_id       uuid        PRIMARY KEY REFERENCES app_user (id),
    username      text        NOT NULL UNIQUE
                              CONSTRAINT password_credential_username_format CHECK (username ~ '^[a-z0-9._-]{3,32}$'),
    password_hash text        NOT NULL,
    must_change   boolean     NOT NULL DEFAULT false,
    updated_at    timestamptz NOT NULL DEFAULT now(),
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- One person can hold several roles, e.g. a year head who also teaches. school_id is required in
-- the pilot and becomes nullable when individual subscribers arrive.
CREATE TABLE user_role (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid        NOT NULL REFERENCES app_user (id),
    school_id  uuid        NOT NULL REFERENCES school (id),
    role       text        NOT NULL CONSTRAINT user_role_role_valid CHECK (role IN ('STUDENT', 'TEACHER', 'SCHOOL_LEADER')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT user_role_unique UNIQUE (user_id, school_id, role)
);
CREATE INDEX user_role_user_idx ON user_role (user_id);

CREATE TABLE password_reset_code (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid        NOT NULL REFERENCES app_user (id),
    code_hash         text        NOT NULL,
    issued_by_user_id uuid        NOT NULL REFERENCES app_user (id),
    expires_at        timestamptz NOT NULL,
    used_at           timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX password_reset_code_user_idx ON password_reset_code (user_id);

-- Role changes, enrolment decisions, reset codes, sign-offs, join code rotation (design §9).
-- details never holds a password, a code or student-written content.
CREATE TABLE audit_event (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    occurred_at   timestamptz NOT NULL,
    actor_user_id uuid        REFERENCES app_user (id),
    event_type    text        NOT NULL,
    subject_type  text        NOT NULL,
    subject_id    uuid        NOT NULL,
    details       jsonb       NOT NULL DEFAULT '{}'::jsonb,
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_event_subject_idx ON audit_event (subject_type, subject_id);
