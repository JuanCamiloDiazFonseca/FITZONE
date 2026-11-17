-- Existing users keep NULL registration dates and cannot sign in until they set a password.
-- New public and administrative user records receive a database generated timestamp.
BEGIN;
ALTER TABLE public.usuarios ALTER COLUMN document DROP NOT NULL;
ALTER TABLE public.usuarios ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.usuarios ADD COLUMN password_hash varchar(255);
ALTER TABLE public.usuarios ADD COLUMN created_at timestamptz(3);
ALTER TABLE public.usuarios ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX usuarios_created_at_idx ON public.usuarios(created_at);
COMMIT;
