// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Sembrando base de datos para preceptor-ia...');

  // 1. Limpiar datos previos
  await prisma.documento.deleteMany({});
  await prisma.inscripcion.deleteMany({});
  await prisma.alumnoTutor.deleteMany({});
  await prisma.tutor.deleteMany({});
  await prisma.alumno.deleteMany({});
  await prisma.curso.deleteMany({});
  await prisma.firmaSesion.deleteMany({});

  // 2. Crear Cursos
  const cursosData = [
    { nombre: '1° A', anio: 1, division: 'A', turno: 'Mañana', cicloLectivo: 2026 },
    { nombre: '1° B', anio: 1, division: 'B', turno: 'Tarde', cicloLectivo: 2026 },
    { nombre: '2° A', anio: 2, division: 'A', turno: 'Mañana', cicloLectivo: 2026 },
    { nombre: '2° B', anio: 2, division: 'B', turno: 'Tarde', cicloLectivo: 2026 },
    { nombre: '3° A', anio: 3, division: 'A', turno: 'Mañana', cicloLectivo: 2026 },
    { nombre: '3° B', anio: 3, division: 'B', turno: 'Tarde', cicloLectivo: 2026 },
    { nombre: '4° A', anio: 4, division: 'A', turno: 'Mañana', cicloLectivo: 2026 },
    { nombre: '5° A', anio: 5, division: 'A', turno: 'Mañana', cicloLectivo: 2026 },
    { nombre: '6° A', anio: 6, division: 'A', turno: 'Mañana', cicloLectivo: 2026 },
  ];

  const cursos = {};
  for (const c of cursosData) {
    const curso = await prisma.curso.create({ data: c });
    cursos[c.nombre] = curso;
  }
  console.log(`✅ ${cursosData.length} cursos creados.`);

  // 3. Crear Alumnos, Tutores y Documentos
  const estudiantesDemo = [
    {
      dni: '48921345',
      nombre: 'Lucas Matías',
      apellido: 'Fernández',
      fechaNacimiento: new Date('2011-04-15'),
      genero: 'M',
      direccion: 'Av. Colón 2450',
      localidad: 'Córdoba Capital',
      telefono: '351-4892019',
      email: 'fernandez.lucas@email.com',
      grupoSanguineo: '0 Positivo',
      obraSocial: 'APROSS',
      nroAfiliado: '894520-01',
      curso: '3° A',
      tutor: {
        dni: '28491029',
        nombre: 'Carlos',
        apellido: 'Fernández',
        telefono: '351-5901234',
        parentesco: 'PADRE',
      },
      docsStatus: {
        FICHA_INSCRIPCION: 'SINCRONIZADO',
        ISA: 'SINCRONIZADO',
        CUS: 'PENDIENTE',
        AUTORIZACION_IMAGEN: 'SINCRONIZADO',
      },
    },
    {
      dni: '49102847',
      nombre: 'Sofía Valentina',
      apellido: 'Romero',
      fechaNacimiento: new Date('2011-08-22'),
      genero: 'F',
      direccion: 'Bv. San Juan 840',
      localidad: 'Córdoba Capital',
      telefono: '351-7892301',
      grupoSanguineo: 'A Positivo',
      obraSocial: 'OSDE',
      nroAfiliado: '48910294-02',
      curso: '3° A',
      tutor: {
        dni: '30192847',
        nombre: 'Mariana',
        apellido: 'Pérez',
        telefono: '351-6102938',
        parentesco: 'MADRE',
      },
      docsStatus: {
        FICHA_INSCRIPCION: 'SINCRONIZADO',
        ISA: 'SINCRONIZADO',
        CUS: 'SINCRONIZADO',
        AUTORIZACION_IMAGEN: 'SINCRONIZADO',
      },
    },
    {
      dni: '47891023',
      nombre: 'Joaquín',
      apellido: 'Benítez',
      fechaNacimiento: new Date('2010-11-03'),
      genero: 'M',
      direccion: 'Calle Laprida 142',
      localidad: 'Villa Allende',
      telefono: '3543-489102',
      grupoSanguineo: 'B Positivo',
      obraSocial: 'PAMI / Sin cobertura',
      curso: '4° A',
      tutor: {
        dni: '25489102',
        nombre: 'Raúl',
        apellido: 'Benítez',
        telefono: '351-3901284',
        parentesco: 'TUTOR_LEGAL',
      },
      docsStatus: {
        FICHA_INSCRIPCION: 'ERROR_REINTENTABLE',
        ISA: 'PENDIENTE',
        CUS: 'PENDIENTE',
        AUTORIZACION_IMAGEN: 'PENDIENTE',
      },
    },
    {
      dni: '50192834',
      nombre: 'Martina',
      apellido: 'Albarracín',
      fechaNacimiento: new Date('2012-02-18'),
      genero: 'F',
      direccion: 'Duarte Quirós 1920',
      localidad: 'Córdoba Capital',
      telefono: '351-9012834',
      grupoSanguineo: '0 Negativo',
      obraSocial: 'DASPU',
      nroAfiliado: '782910-3',
      curso: '1° B',
      tutor: {
        dni: '32019284',
        nombre: 'Silvia',
        apellido: 'Albarracín',
        telefono: '351-4019283',
        parentesco: 'MADRE',
      },
      docsStatus: {
        FICHA_INSCRIPCION: 'PENDIENTE',
        ISA: 'PENDIENTE',
        CUS: 'PENDIENTE',
        AUTORIZACION_IMAGEN: 'PENDIENTE',
      },
    },
    {
      dni: '49382019',
      nombre: 'Mateo',
      apellido: 'Gómez',
      fechaNacimiento: new Date('2011-06-30'),
      genero: 'M',
      direccion: 'Castro Barros 520',
      localidad: 'Córdoba Capital',
      telefono: '351-3201928',
      grupoSanguineo: 'A Positivo',
      obraSocial: 'Sancor Salud',
      curso: '3° B',
      tutor: {
        dni: '29381029',
        nombre: 'Esteban',
        apellido: 'Gómez',
        telefono: '351-5029182',
        parentesco: 'PADRE',
      },
      docsStatus: {
        FICHA_INSCRIPCION: 'SINCRONIZADO',
        ISA: 'PENDIENTE',
        CUS: 'SINCRONIZADO',
        AUTORIZACION_IMAGEN: 'SINCRONIZADO',
      },
    },
  ];

  for (const item of estudiantesDemo) {
    const alumno = await prisma.alumno.create({
      data: {
        dni: item.dni,
        nombre: item.nombre,
        apellido: item.apellido,
        fechaNacimiento: item.fechaNacimiento,
        genero: item.genero,
        direccion: item.direccion,
        localidad: item.localidad,
        telefono: item.telefono,
        email: item.email,
        grupoSanguineo: item.grupoSanguineo,
        obraSocial: item.obraSocial,
        nroAfiliado: item.nroAfiliado,
      },
    });

    const tutor = await prisma.tutor.create({
      data: {
        dni: item.tutor.dni,
        nombre: item.tutor.nombre,
        apellido: item.tutor.apellido,
        telefono: item.tutor.telefono,
      },
    });

    await prisma.alumnoTutor.create({
      data: {
        alumnoId: alumno.id,
        tutorId: tutor.id,
        parentesco: item.tutor.parentesco,
        esPrincipal: true,
      },
    });

    const curso = cursos[item.curso];
    if (curso) {
      await prisma.inscripcion.create({
        data: {
          alumnoId: alumno.id,
          cursoId: curso.id,
          cicloLectivo: 2026,
        },
      });
    }

    // Crear Documentos con sus estados
    const tipos = ['FICHA_INSCRIPCION', 'ISA', 'CUS', 'AUTORIZACION_IMAGEN'];
    for (const tipo of tipos) {
      const status = item.docsStatus[tipo] || 'PENDIENTE';
      await prisma.documento.create({
        data: {
          alumnoId: alumno.id,
          tipo,
          estado: 'GENERADO',
        },
      });
    }
  }

  console.log(`✅ ${estudiantesDemo.length} estudiantes demo con legajos creados.`);
  console.log('🚀 Semilla completada exitosamente.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
