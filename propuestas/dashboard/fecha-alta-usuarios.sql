-- PROPUESTA: NO EJECUTADA. Requiere autorización expresa y revisión del destino.
-- No atribuye fechas inventadas a registros anteriores: quedan NULL.
BEGIN;
ALTER TABLE public.usuarios ADD COLUMN created_at timestamptz(3);
ALTER TABLE public.usuarios ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX usuarios_created_at_idx ON public.usuarios(created_at);
COMMIT;
