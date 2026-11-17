// src/app/inscripcion/page.tsx
import EnrollmentForm from '@/components/students/EnrollmentForm';

export default function InscripcionPage({
  searchParams,
}: {
  searchParams?: { edit?: string };
}) {
  return (
    <div className="py-2">
      <EnrollmentForm editAlumnoId={searchParams?.edit} />
    </div>
  );
}
