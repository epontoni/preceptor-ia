// src/app/page.tsx
import { prisma } from '@/lib/prisma';
import StudentSyncTable from '@/components/students/StudentSyncTable';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const alumnos = await prisma.alumno.findMany({
    include: {
      inscripciones: {
        include: {
          curso: true,
        },
      },
      tutores: {
        include: {
          tutor: true,
        },
      },
      documentos: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { apellido: 'asc' },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Panel de Preceptoría & Legajo Digital
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Supervisa la matriculación, valida la documentación y gestiona las firmas de los tutores.
          </p>
        </div>
      </div>

      <StudentSyncTable initialAlumnos={alumnos as any} />
    </div>
  );
}
