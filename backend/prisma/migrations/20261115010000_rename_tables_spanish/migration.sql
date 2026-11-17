BEGIN;

DO $$
BEGIN
    IF to_regclass('users') IS NULL
       OR to_regclass('plans') IS NULL
       OR to_regclass('memberships') IS NULL
       OR to_regclass('payments') IS NULL
       OR to_regclass('admins') IS NULL THEN
        RAISE EXCEPTION 'No se encontraron todas las tablas FITZONE con sus nombres actuales';
    END IF;

    IF to_regclass('usuarios') IS NOT NULL
       OR to_regclass('planes') IS NOT NULL
       OR to_regclass('membresias') IS NOT NULL
       OR to_regclass('pagos') IS NOT NULL
       OR to_regclass('administradores') IS NOT NULL THEN
        RAISE EXCEPTION 'Uno o más nombres de destino ya están ocupados';
    END IF;
END
$$;

ALTER TABLE "users" RENAME TO "usuarios";
ALTER TABLE "plans" RENAME TO "planes";
ALTER TABLE "memberships" RENAME TO "membresias";
ALTER TABLE "payments" RENAME TO "pagos";
ALTER TABLE "admins" RENAME TO "administradores";

COMMIT;
