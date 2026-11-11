// prisma/seed-cursos.js
// Carga SOLO los cursos del ciclo lectivo (idempotente, no borra nada). Apto para producción.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CICLO = 2026;
const cursos = [
  { nombre: '1° A', anio: 1, division: 'A', turno: 'Mañana' },
  { nombre: '1° B', anio: 1, division: 'B', turno: 'Tarde' },
  { nombre: '2° A', anio: 2, division: 'A', turno: 'Mañana' },
  { nombre: '2° B', anio: 2, division: 'B', turno: 'Tarde' },
  { nombre: '3° A', anio: 3, division: 'A', turno: 'Mañana' },
  { nombre: '3° B', anio: 3, division: 'B', turno: 'Tarde' },
  { nombre: '4° A', anio: 4, division: 'A', turno: 'Mañana' },
  { nombre: '5° A', anio: 5, division: 'A', turno: 'Mañana' },
  { nombre: '6° A', anio: 6, division: 'A', turno: 'Mañana' },
];

async function main() {
  for (const c of cursos) {
    await prisma.curso.upsert({
      where: {
        anio_division_turno_cicloLectivo: { anio: c.anio, division: c.division, turno: c.turno, cicloLectivo: CICLO },
      },
      update: { nombre: c.nombre },
      create: { ...c, cicloLectivo: CICLO },
    });
  }
  console.log(`✅ ${cursos.length} cursos cargados para el ciclo ${CICLO}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

