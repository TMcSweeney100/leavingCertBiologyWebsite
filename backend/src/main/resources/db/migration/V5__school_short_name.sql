-- The form of the school's name that fits the app header ("North Wicklow ETSS"). Optional: the
-- header falls back to the full name. Set by the operator (create-school or set-school-short-name).
ALTER TABLE school
    ADD COLUMN short_name text CONSTRAINT school_short_name_present CHECK (short_name IS NULL OR btrim(short_name) <> '');
