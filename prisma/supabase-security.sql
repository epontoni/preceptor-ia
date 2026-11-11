-- prisma/supabase-security.sql
-- Ejecutar UNA VEZ en Supabase (SQL Editor) despues de `npm run db:push`.
-- Activa Row Level Security en todas las tablas SIN politicas: bloquea el acceso desde la API REST/GraphQL
-- publica de Supabase (clave anon). Prisma se conecta con el rol `postgres` (que ignora RLS), asi que
-- la aplicacion sigue funcionando, pero nadie puede leer los datos usando la anon key.
ALTER TABLE "Curso"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Alumno"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tutor"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AlumnoTutor"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Inscripcion"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Documento"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FirmaSesion"  ENABLE ROW LEVEL SECURITY;

-- Por seguridad adicional, retirar permisos de los roles publicos de la API
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

