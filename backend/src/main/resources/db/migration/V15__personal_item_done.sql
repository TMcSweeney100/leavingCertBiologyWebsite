-- The student's own tick on their own item (plan timeline-redesign T-6). Null means not done.
-- Unticking sets it back to null. Still private to the owner, like the rest of the row.
ALTER TABLE personal_item ADD COLUMN done_at timestamptz;
