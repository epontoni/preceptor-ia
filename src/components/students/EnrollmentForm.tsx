// src/components/students/EnrollmentForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  User,
  Heart,
  Users,
  GraduationCap,
  FileCheck2,
  CheckCircle2,
  Download,
  ArrowRight,
  ArrowLeft,
  Loader2,
  FileText,
  Save,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Building2,
  ShieldCheck,
  PhoneCall,
  Activity,
  Trash2,
  Eye,
  Check,
  Smartphone,
} from 'lucide-react';
import DriveFolderSaver from '@/components/students/DriveFolderSaver';
import PhoneSignatureModal from '@/components/signature/PhoneSignatureModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface CursoOption {
  id: string;
  nombre: string;
  turno: string;
}

const DRAFT_STORAGE_KEY = 'preceptor_ia_enrollment_draft_v4';

const INITIAL_FORM_DATA = {
  // 1. Estudiante
  dni: '',
  nombre: '',
  apellido: '',
  fechaNacimiento: '2012-03-15',
  edad: '14',
  genero: 'M',
  lugarNacimiento: 'Leones, Córdoba',
  nacionalidad: 'Argentina',
  direccion: '',
  barrio: 'Centro',
  localidad: 'Leones',
  codigoPostal: '2594',
  departamento: '',
  telefono: '',
  email: '',

  // 2. Trayectoria escolar & Matrícula
  cursoId: '',
  escuelaProcedencia: 'IPETYM Nº 256 "Lib. Gral. San Martín"',
  anioAnterior: '2° Año',
  turnoAnterior: 'Mañana',
  materiasAdeudadas: 'Ninguna',
  tieneHermanos: false,
  cantidadHermanos: '0',
  cursosHermanos: '',

  // 3. Tutor / Urgencias
  tutorDni: '',
  tutorNombre: '',
  tutorApellido: '',
  tutorTelefono: '',
  tutorEmail: '',
  tutorParentesco: 'PADRE',
  tutorOcupacion: 'Empleado / Comerciante',
  tutorDomicilio: '',
  tutorLocalidad: 'Leones',
  tutorNacionalidad: 'Argentina',

  // 4. Datos Médicos (I.S.A. & C.U.S.)
  grupoSanguineo: '0 Positivo',
  obraSocial: 'APROSS',
  nroAfiliado: '',
  enfermedadesCronicas: 'Ninguna',
  recibeAtencionMedica: false,
  tomaMedicacion: false,
  medicacionDetalle: '',
  alergias: '',
  patologias: [] as string[],
  planAlimentarioEspecial: false,
  planAlimentarioDetalle: '',
  usaAnteojos: false,
  observacionesMedicas: '',
  urgenciasDetalle: '',

  // 5. Autorizaciones IPETYM 256
  autorizaSalidas: true,
  autorizaImagenes: true,
};

const PATOLOGIAS_OPTIONS = [
  { id: 'alergias', label: 'Alergias (Medicamentos o Alimentos)' },
  { id: 'cardio', label: 'Cardiovasculares (Arritmia, Hipertensión)' },
  { id: 'diabetes', label: 'Diabetes' },
  { id: 'neuro', label: 'Neurológicas (Epilepsia, Convulsiones)' },
  { id: 'oftalmo', label: 'Oftalmológicas / Uso de Anteojos' },
  { id: 'auditivas', label: 'Auditivas / Hipoacusia' },
];

export default function EnrollmentForm() {
  const [step, setStep] = useState(1);
  const [driveRefreshKey, setDriveRefreshKey] = useState(0);
  const [cursos, setCursos] = useState<CursoOption[]>([]);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [loadingCursos, setLoadingCursos] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [capturedSignature, setCapturedSignature] = useState<{
    token: string;
    pngUrl: string;
    signedAt: string;
    tutorNombre?: string;
  } | null>(null);
  const [signModalState, setSignModalState] = useState<{
    open: boolean;
    documentoId?: string;
    alumnoId?: string;
    tutorId?: string;
    documentoTitulo?: string;
    tipoDocumento?: string;
  }>({ open: false });

  // Cargar cursos
  useEffect(() => {
    async function loadCursos() {
      try {
        const res = await fetch('/api/cursos');
        const data = await res.json();
        if (data.success && data.data) {
          setCursos(data.data);
          if (data.data.length > 0 && !formData.cursoId) {
            setFormData((prev) => ({ ...prev, cursoId: data.data[0].id }));
          }
        }
      } catch (err) {
        console.error('Error al cargar cursos:', err);
      } finally {
        setLoadingCursos(false);
      }
    }
    loadCursos();
  }, []);

  // Cargar borrador de localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}
  }, []);

  // Guardar borrador automáticamente al cambiar datos
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
      setDraftSaved(true);
      const timer = setTimeout(() => setDraftSaved(false), 2000);
      return () => clearTimeout(timer);
    } catch {}
  }, [formData]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-calcular edad si cambia fecha de nacimiento
      if (field === 'fechaNacimiento' && value) {
        const birthDate = new Date(value);
        if (!isNaN(birthDate.getTime())) {
          const ageDifMs = Date.now() - birthDate.getTime();
          const ageDate = new Date(ageDifMs);
          const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
          updated.edad = String(calculatedAge);
        }
      }
      return updated;
    });
  };

  const togglePatologia = (id: string) => {
    setFormData((prev) => {
      const current = prev.patologias || [];
      const updated = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      return { ...prev, patologias: updated };
    });
  };

  const resetForm = () => {
    if (confirm('¿Estás seguro de reiniciar el formulario? Se borrarán los datos ingresados.')) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setFormData(INITIAL_FORM_DATA);
      setCapturedSignature(null);
      setStep(1);
      setSuccessData(null);
      setErrorMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    try {
      const payload = {
        ...formData,
        firmaToken: capturedSignature?.token,
      };

      const res = await fetch('/api/alumnos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        setSuccessData(data.data);
      } else {
        setErrorMessage(data.error || 'Error al procesar la inscripción');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión con el servidor');
    } finally {
      setSaving(false);
    }
  };

  const stepsConfig = [
    { num: 1, title: 'Estudiante', icon: User, desc: 'Datos personales y contacto' },
    { num: 2, title: 'Trayectoria', icon: GraduationCap, desc: 'Curso, turno y procedencia' },
    { num: 3, title: 'Tutor / Urgencias', icon: Users, desc: 'Responsable y emergencias' },
    { num: 4, title: 'Salud (ISA/CUS)', icon: Heart, desc: 'Ficha médica oficial' },
    { num: 5, title: 'Autorizaciones', icon: ShieldCheck, desc: 'Salidas e imágenes' },
  ];

  // Vista de éxito al completar inscripción
  if (successData) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in-50">
        <Card className="border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-md">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-2 shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              ¡Inscripción y Legajo Digital Generados con Éxito!
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Se ha matriculado a <strong>{formData.apellido}, {formData.nombre}</strong> (DNI {formData.dni}) en{' '}
              <strong>{cursos.find((c) => c.id === formData.cursoId)?.nombre || 'su curso'}</strong>.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="p-4 rounded-xl bg-background border space-y-2">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-primary" />
                <span>4 Documentos Oficiales en PDF listos:</span>
              </h4>
              <p className="text-xs text-muted-foreground">
                Se generaron los archivos PDF en base a las plantillas oficiales del IPETYM 256. Están listos para imprimir o guardar en la carpeta de Google Drive. Si firmás después, volvé a pulsar "Guardar en la carpeta".
              </p>
            </div>

            {/* Banner de firma digital o estado de firma completada */}
            {capturedSignature ? (
              <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                      ✓ Formularios generados con Firma Digital del Tutor
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      La firma manuscrita fue estampada en su lugar correspondiente en todos los documentos oficiales.
                    </p>
                  </div>
                </div>
                <div className="h-11 px-3 py-1 bg-white dark:bg-slate-900 border rounded-lg hidden sm:flex items-center justify-center">
                  <img
                    src={capturedSignature.pngUrl}
                    alt="Firma Tutor"
                    className="max-h-8 max-w-[100px] object-contain"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shrink-0 shadow-xs">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">¿El padre o tutor está presente?</h4>
                    <p className="text-xs text-muted-foreground">Podés solicitar su firma manuscrita ahora escaneando el código QR con su celular.</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => {
                    const firstDoc = successData.documentos?.[0];
                    setSignModalState({
                      open: true,
                      documentoId: firstDoc?.id,
                      alumnoId: successData.alumno?.id,
                      documentoTitulo: `Ficha de Matrícula - ${formData.apellido}, ${formData.nombre}`,
                    });
                  }}
                  className="whitespace-nowrap font-bold shadow-xs w-full sm:w-auto"
                >
                  <Smartphone className="w-4 h-4 mr-1.5" /> Firmar con Teléfono
                </Button>
              </div>
            )}

            <DriveFolderSaver
              dni={formData.dni}
              alumnoId={successData.alumno?.id}
              documentos={successData.documentos || []}
              refreshKey={driveRefreshKey}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {successData.documentos?.map((doc: any) => {
                const names: Record<string, string> = {
                  FICHA_INSCRIPCION: '1. Ficha de Matrícula Oficial',
                  ISA: '2. Informe de Salud Anual (I.S.A.)',
                  CUS: '3. Certificado Único de Salud (C.U.S.)',
                  AUTORIZACION_IMAGEN: '4. Autorización Salidas & Imagen',
                };
                const estaFirmado = doc.firmado || Boolean(capturedSignature);
                return (
                  <div
                    key={doc.id}
                    className="p-4 rounded-xl border bg-card text-card-foreground flex flex-col justify-between shadow-2xs gap-3"
                  >
                    <div>
                      <span className="font-semibold text-sm text-foreground">{names[doc.tipo] || doc.tipo}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="success" className="text-[10px]">
                          PDF Generado
                        </Badge>
                        {estaFirmado && (
                          <Badge variant="success" className="text-[10px] bg-emerald-600 text-white">
                            ✓ Firmado Digitalmente
                          </Badge>
                        )}
                        <Badge variant="warning" className="text-[10px]">
                          Pendiente de firma
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSignModalState({
                            open: true,
                            documentoId: doc.id,
                            alumnoId: successData.alumno?.id,
                            documentoTitulo: `${names[doc.tipo] || doc.tipo} - ${formData.apellido}, ${formData.nombre}`,
                            tipoDocumento: doc.tipo,
                          })
                        }
                        className="h-8 px-2.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
                        title="Firmar documento con el teléfono celular"
                      >
                        <Smartphone className="w-3.5 h-3.5 mr-1" />
                        <span>Firmar</span>
                      </Button>
                      <a
                        href={`/api/pdf/download/${doc.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium border bg-background hover:bg-accent"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver PDF</span>
                      </a>
                      <a
                        href={`/api/pdf/download/${doc.id}`}
                        download
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Descargar</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setSuccessData(null);
                setFormData(INITIAL_FORM_DATA);
                setStep(1);
              }}
              className="w-full sm:w-auto"
            >
              Registrar Otro Alumno
            </Button>

            <Button asChild variant="brand" className="w-full sm:w-auto">
              <Link href="/">
                Ir al Panel de Legajos <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Modal de Firma Digital Mediante Teléfono + QR */}
        <PhoneSignatureModal
          open={signModalState.open}
          onOpenChange={(open) => setSignModalState((prev) => ({ ...prev, open }))}
          documentoId={signModalState.documentoId}
          alumnoId={signModalState.alumnoId}
          tutorId={signModalState.tutorId}
          documentoTitulo={signModalState.documentoTitulo}
          tipoDocumento={signModalState.tipoDocumento}
          onSignatureCompleted={async (data) => {
            setCapturedSignature(data);
            setDriveRefreshKey((k) => k + 1);
            if (successData?.alumno?.id) {
              try {
                const r = await fetch(`/api/alumnos?search=${encodeURIComponent(formData.dni)}`);
                const j = await r.json();
                if (j.success && j.data?.[0]) {
                  setSuccessData((prev: any) => ({
                    ...prev,
                    documentos: j.data[0].documentos,
                  }));
                }
              } catch (e) {}
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Cabecera del Formulario */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <span>Matriculación & Legajo Digital</span>
            <Badge variant="outline" className="text-xs font-mono">Ciclo 2026</Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Completa el formulario oficial del IPETYM 256 para generar automáticamente la ficha de matrícula, ISA y CUS en PDF.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {draftSaved && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-pulse">
              <Save className="w-3.5 h-3.5" /> Borrador guardado
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={resetForm} className="text-muted-foreground text-xs">
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Limpiar
          </Button>
        </div>
      </div>

      {/* Stepper Navigation Responsive */}
      <div className="space-y-3">
        {/* Progress Bar */}
        <Progress value={(step / 5) * 100} className="h-2" />

        {/* Pasos en Desktop / Tablets */}
        <div className="grid grid-cols-5 gap-2 hidden md:grid">
          {stepsConfig.map((s) => {
            const Icon = s.icon;
            const isCurrent = step === s.num;
            const isCompleted = step > s.num;

            return (
              <button
                type="button"
                key={s.num}
                onClick={() => setStep(s.num)}
                className={cn(
                  'flex flex-col items-start p-3 rounded-xl border text-left transition-all',
                  isCurrent
                    ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary/30'
                    : isCompleted
                    ? 'border-border bg-card hover:bg-muted/40'
                    : 'border-transparent bg-muted/40 opacity-60'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                      isCurrent
                        ? 'bg-primary text-primary-foreground'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.num}
                  </div>
                  <span className={cn('text-xs font-bold', isCurrent ? 'text-primary' : 'text-foreground')}>
                    {s.title}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground line-clamp-1">{s.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Step Indicator para Móviles */}
        <div className="md:hidden flex items-center justify-between p-3 rounded-xl bg-card border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
              {step}
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Paso {step} de 5</p>
              <h3 className="text-sm font-bold text-foreground">{stepsConfig[step - 1].title}</h3>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {Math.round((step / 5) * 100)}%
          </Badge>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <Alert variant="destructive" className="shadow-xs">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Error al procesar</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Formulario Principal */}
      <form onSubmit={handleSubmit}>
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              {React.createElement(stepsConfig[step - 1].icon, { className: 'w-4 h-4' })}
              <span>{stepsConfig[step - 1].desc}</span>
            </div>
            <CardTitle className="text-xl font-bold">
              {step === 1 && 'Paso 1: Datos Personales del Estudiante'}
              {step === 2 && 'Paso 2: Trayectoria Escolar & Curso Destino'}
              {step === 3 && 'Paso 3: Padre, Madre, Tutor o Encargado'}
              {step === 4 && 'Paso 4: Ficha Médica y Salud (ISA & CUS)'}
              {step === 5 && 'Paso 5: Autorizaciones & Confirmación'}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* ========================================================================= */}
            {/* PASO 1: DATOS DEL ESTUDIANTE */}
            {/* ========================================================================= */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="dni">DNI del Alumno *</Label>
                    <Input
                      id="dni"
                      type="text"
                      required
                      placeholder="Ej: 48921345"
                      value={formData.dni}
                      onChange={(e) => handleChange('dni', e.target.value.replace(/\D/g, ''))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="apellido">Apellido(s) *</Label>
                    <Input
                      id="apellido"
                      type="text"
                      required
                      placeholder="Ej: Fernández"
                      value={formData.apellido}
                      onChange={(e) => handleChange('apellido', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="nombre">Nombre(s) *</Label>
                    <Input
                      id="nombre"
                      type="text"
                      required
                      placeholder="Ej: Lucas Matías"
                      value={formData.nombre}
                      onChange={(e) => handleChange('nombre', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fechaNacimiento">Fecha de Nacimiento *</Label>
                    <Input
                      id="fechaNacimiento"
                      type="date"
                      required
                      value={formData.fechaNacimiento}
                      onChange={(e) => handleChange('fechaNacimiento', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edad">Edad (Años)</Label>
                    <Input
                      id="edad"
                      type="number"
                      value={formData.edad}
                      onChange={(e) => handleChange('edad', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="genero">Género</Label>
                    <Select value={formData.genero} onValueChange={(val) => handleChange('genero', val)}>
                      <SelectTrigger id="genero">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculino (M)</SelectItem>
                        <SelectItem value="F">Femenino (F)</SelectItem>
                        <SelectItem value="X">No Binario / Otro (X)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="nacionalidad">Nacionalidad</Label>
                    <Input
                      id="nacionalidad"
                      type="text"
                      value={formData.nacionalidad}
                      onChange={(e) => handleChange('nacionalidad', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="direccion">Domicilio (Calle y Número) *</Label>
                    <Input
                      id="direccion"
                      type="text"
                      placeholder="Ej: Av. Libertador 1450"
                      value={formData.direccion}
                      onChange={(e) => handleChange('direccion', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="barrio">Barrio</Label>
                    <Input
                      id="barrio"
                      type="text"
                      value={formData.barrio}
                      onChange={(e) => handleChange('barrio', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="localidad">Localidad</Label>
                    <Input
                      id="localidad"
                      type="text"
                      value={formData.localidad}
                      onChange={(e) => handleChange('localidad', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="codigoPostal">Código Postal</Label>
                    <Input
                      id="codigoPostal"
                      type="text"
                      value={formData.codigoPostal}
                      onChange={(e) => handleChange('codigoPostal', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lugarNacimiento">Lugar de Nacimiento</Label>
                    <Input
                      id="lugarNacimiento"
                      type="text"
                      value={formData.lugarNacimiento}
                      onChange={(e) => handleChange('lugarNacimiento', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="telefono">Teléfono del Alumno (opcional)</Label>
                    <Input
                      id="telefono"
                      type="text"
                      placeholder="Ej: 03472-15489021"
                      value={formData.telefono}
                      onChange={(e) => handleChange('telefono', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email">Correo Electrónico (opcional)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="alumno@ejemplo.com"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* PASO 2: TRAYECTORIA ESCOLAR & MATRÍCULA */}
            {/* ========================================================================= */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="cursoId">Curso y División de Inscripción 2026 *</Label>
                    {loadingCursos ? (
                      <div className="h-10 flex items-center text-xs text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Cargando divisiones...
                      </div>
                    ) : (
                      <Select value={formData.cursoId} onValueChange={(val) => handleChange('cursoId', val)}>
                        <SelectTrigger id="cursoId">
                          <SelectValue placeholder="Seleccionar Curso" />
                        </SelectTrigger>
                        <SelectContent>
                          {cursos.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nombre} &bull; {c.turno}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="escuelaProcedencia">Establecimiento de Procedencia</Label>
                    <Input
                      id="escuelaProcedencia"
                      type="text"
                      value={formData.escuelaProcedencia}
                      onChange={(e) => handleChange('escuelaProcedencia', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="anioAnterior">Curso Anterior</Label>
                    <Input
                      id="anioAnterior"
                      type="text"
                      placeholder="Ej: 2° Año"
                      value={formData.anioAnterior}
                      onChange={(e) => handleChange('anioAnterior', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="turnoAnterior">Turno Anterior</Label>
                    <Input
                      id="turnoAnterior"
                      type="text"
                      placeholder="Ej: Mañana"
                      value={formData.turnoAnterior}
                      onChange={(e) => handleChange('turnoAnterior', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="materiasAdeudadas">Materias que Adeuda</Label>
                    <Input
                      id="materiasAdeudadas"
                      type="text"
                      placeholder="Ninguna o materias pendientes"
                      value={formData.materiasAdeudadas}
                      onChange={(e) => handleChange('materiasAdeudadas', e.target.value)}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="tieneHermanos" className="font-semibold text-foreground">
                        ¿Tiene hermanos estudiando en el IPETYM Nº 256?
                      </Label>
                      <p className="text-xs text-muted-foreground">Para vinculación y coordinación escolar</p>
                    </div>
                    <Switch
                      id="tieneHermanos"
                      checked={formData.tieneHermanos}
                      onCheckedChange={(checked) => handleChange('tieneHermanos', checked)}
                    />
                  </div>

                  {formData.tieneHermanos && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                      <div className="space-y-1.5">
                        <Label htmlFor="cantidadHermanos">Cantidad de Hermanos</Label>
                        <Input
                          id="cantidadHermanos"
                          type="number"
                          min="1"
                          value={formData.cantidadHermanos}
                          onChange={(e) => handleChange('cantidadHermanos', e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="cursosHermanos">Cursos / Divisiones que cursan</Label>
                        <Input
                          id="cursosHermanos"
                          type="text"
                          placeholder="Ej: 1° B, 5° A"
                          value={formData.cursosHermanos}
                          onChange={(e) => handleChange('cursosHermanos', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* PASO 3: TUTOR Y RESPONSABLE LEGAL */}
            {/* ========================================================================= */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="tutorDni">DNI del Tutor / Responsable *</Label>
                    <Input
                      id="tutorDni"
                      type="text"
                      required
                      placeholder="Ej: 24189023"
                      value={formData.tutorDni}
                      onChange={(e) => handleChange('tutorDni', e.target.value.replace(/\D/g, ''))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="tutorApellido">Apellido(s) del Tutor *</Label>
                    <Input
                      id="tutorApellido"
                      type="text"
                      required
                      placeholder="Ej: Fernández"
                      value={formData.tutorApellido}
                      onChange={(e) => handleChange('tutorApellido', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="tutorNombre">Nombre(s) del Tutor *</Label>
                    <Input
                      id="tutorNombre"
                      type="text"
                      required
                      placeholder="Ej: Carlos"
                      value={formData.tutorNombre}
                      onChange={(e) => handleChange('tutorNombre', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="tutorParentesco">Rol / Parentesco</Label>
                    <Select value={formData.tutorParentesco} onValueChange={(val) => handleChange('tutorParentesco', val)}>
                      <SelectTrigger id="tutorParentesco">
                        <SelectValue placeholder="Parentesco" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PADRE">PADRE</SelectItem>
                        <SelectItem value="MADRE">MADRE</SelectItem>
                        <SelectItem value="TUTOR_LEGAL">TUTOR LEGAL</SelectItem>
                        <SelectItem value="ABUELO/A">ABUELO / ABUELA</SelectItem>
                        <SelectItem value="OTRO">OTRO FAMILIAR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="tutorTelefono" className="text-primary font-bold">
                      Teléfono Urgencias *
                    </Label>
                    <Input
                      id="tutorTelefono"
                      type="text"
                      required
                      placeholder="Ej: 03472-15498822"
                      value={formData.tutorTelefono}
                      onChange={(e) => handleChange('tutorTelefono', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="tutorEmail">Correo Electrónico</Label>
                    <Input
                      id="tutorEmail"
                      type="email"
                      placeholder="tutor@ejemplo.com"
                      value={formData.tutorEmail}
                      onChange={(e) => handleChange('tutorEmail', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="tutorDomicilio">Domicilio del Tutor</Label>
                    <Input
                      id="tutorDomicilio"
                      type="text"
                      placeholder="Mismo del alumno o especificar"
                      value={formData.tutorDomicilio}
                      onChange={(e) => handleChange('tutorDomicilio', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="tutorOcupacion">Profesión u Ocupación</Label>
                    <Input
                      id="tutorOcupacion"
                      type="text"
                      value={formData.tutorOcupacion}
                      onChange={(e) => handleChange('tutorOcupacion', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* PASO 4: FICHA MÉDICA Y SALUD (ISA & CUS) */}
            {/* ========================================================================= */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="grupoSanguineo">Grupo Sanguíneo</Label>
                    <Select value={formData.grupoSanguineo} onValueChange={(val) => handleChange('grupoSanguineo', val)}>
                      <SelectTrigger id="grupoSanguineo">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0 Positivo">0 Positivo (0+)</SelectItem>
                        <SelectItem value="0 Negativo">0 Negativo (0-)</SelectItem>
                        <SelectItem value="A Positivo">A Positivo (A+)</SelectItem>
                        <SelectItem value="A Negativo">A Negativo (A-)</SelectItem>
                        <SelectItem value="B Positivo">B Positivo (B+)</SelectItem>
                        <SelectItem value="B Negativo">B Negativo (B-)</SelectItem>
                        <SelectItem value="AB Positivo">AB Positivo (AB+)</SelectItem>
                        <SelectItem value="AB Negativo">AB Negativo (AB-)</SelectItem>
                        <SelectItem value="No informado">No informado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="obraSocial">Obra Social / Cobertura</Label>
                    <Input
                      id="obraSocial"
                      type="text"
                      placeholder="Ej: APROSS, OSECAC, Pública"
                      value={formData.obraSocial}
                      onChange={(e) => handleChange('obraSocial', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="nroAfiliado">Número de Afiliado</Label>
                    <Input
                      id="nroAfiliado"
                      type="text"
                      placeholder="Ej: 8942103/01"
                      value={formData.nroAfiliado}
                      onChange={(e) => handleChange('nroAfiliado', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="enfermedadesCronicas">Enfermedades Crónicas</Label>
                    <Input
                      id="enfermedadesCronicas"
                      type="text"
                      placeholder="Ninguna o especificar"
                      value={formData.enfermedadesCronicas}
                      onChange={(e) => handleChange('enfermedadesCronicas', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="alergias">Alergias (Medicamentos / Alimentos)</Label>
                    <Input
                      id="alergias"
                      type="text"
                      placeholder="Ej: Penicilina, polen, etc."
                      value={formData.alergias}
                      onChange={(e) => handleChange('alergias', e.target.value)}
                    />
                  </div>
                </div>

                {/* Tratamientos y Medicación */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="tomaMedicacion" className="font-semibold text-foreground">
                        ¿Toma medicación habitual?
                      </Label>
                      <p className="text-xs text-muted-foreground">Prescripta por médico</p>
                    </div>
                    <Switch
                      id="tomaMedicacion"
                      checked={formData.tomaMedicacion}
                      onCheckedChange={(checked) => handleChange('tomaMedicacion', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="recibeAtencionMedica" className="font-semibold text-foreground">
                        ¿Recibe atención médica periódica?
                      </Label>
                      <p className="text-xs text-muted-foreground">Controles especializados</p>
                    </div>
                    <Switch
                      id="recibeAtencionMedica"
                      checked={formData.recibeAtencionMedica}
                      onCheckedChange={(checked) => handleChange('recibeAtencionMedica', checked)}
                    />
                  </div>

                  {formData.tomaMedicacion && (
                    <div className="sm:col-span-2 space-y-1.5 pt-2 border-t">
                      <Label htmlFor="medicacionDetalle">Detalle de Medicación y Horarios</Label>
                      <Input
                        id="medicacionDetalle"
                        type="text"
                        placeholder="Nombre comercial, dosis y si debe tomarse en horario escolar"
                        value={formData.medicacionDetalle}
                        onChange={(e) => handleChange('medicacionDetalle', e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* Checkboxes de Patologías ISA */}
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground">Patologías a declarar para el informe I.S.A.</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PATOLOGIAS_OPTIONS.map((p) => {
                      const isChecked = (formData.patologias || []).includes(p.id);
                      return (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => togglePatologia(p.id)}
                          className={cn(
                            'flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs font-medium transition-colors',
                            isChecked
                              ? 'border-primary bg-primary/10 text-primary font-bold'
                              : 'border-border bg-card text-foreground hover:bg-muted'
                          )}
                        >
                          <div
                            className={cn(
                              'w-4 h-4 rounded border flex items-center justify-center',
                              isChecked ? 'bg-primary border-primary text-white' : 'border-input bg-background'
                            )}
                          >
                            {isChecked && <Check className="w-3 h-3" />}
                          </div>
                          <span>{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="observacionesMedicas">Observaciones Médicas y Urgencias</Label>
                  <Textarea
                    id="observacionesMedicas"
                    rows={2}
                    autoComplete="off"
                    spellCheck={false}
                    value={formData.observacionesMedicas}
                    onChange={(e) => handleChange('observacionesMedicas', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* PASO 5: AUTORIZACIONES & CONFIRMACIÓN */}
            {/* ========================================================================= */}
            {step === 5 && (
              <div className="space-y-6">
                <div className="p-4 rounded-xl border bg-muted/40 space-y-4">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span>Autorizaciones Institucionales IPETYM Nº 256</span>
                  </h4>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
                    <div className="space-y-0.5">
                      <Label htmlFor="autorizaSalidas" className="font-bold text-foreground">
                        1. Autorización de Salidas Educativas & Alumnos Externos
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Permite traslados a campos de deportes, eventos pedagógicos y salidas curriculares autorizadas.
                      </p>
                    </div>
                    <Switch
                      id="autorizaSalidas"
                      checked={formData.autorizaSalidas}
                      onCheckedChange={(checked) => handleChange('autorizaSalidas', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
                    <div className="space-y-0.5">
                      <Label htmlFor="autorizaImagenes" className="font-bold text-foreground">
                        2. Autorización de Publicación de Imágenes de Alumnos
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Uso pedagógico de fotos y filmaciones en eventos escolares para la web institucional y redes del colegio.
                      </p>
                    </div>
                    <Switch
                      id="autorizaImagenes"
                      checked={formData.autorizaImagenes}
                      onCheckedChange={(checked) => handleChange('autorizaImagenes', checked)}
                    />
                  </div>
                </div>

                {/* Firma Digital Manuscrita del Tutor (Opcional antes de generar formularios) */}
                <div className="p-4 rounded-xl border bg-card space-y-4 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-primary" />
                        <h4 className="font-bold text-sm text-foreground">
                          Firma Manuscrita Digital del Tutor
                        </h4>
                        <Badge variant={capturedSignature ? 'success' : 'outline'} className="text-[10px]">
                          {capturedSignature ? '✓ Firma Capturada' : 'Opcional'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Solicitá la firma con teléfono antes de generar los documentos. Al capturarla ahora, se estampará automáticamente en TODOS los formularios en su lugar exacto.
                      </p>
                    </div>
                  </div>

                  {!capturedSignature ? (
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Smartphone className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-foreground">
                            {formData.tutorApellido && formData.tutorNombre
                              ? `Tutor: ${formData.tutorApellido}, ${formData.tutorNombre} (${formData.tutorParentesco || 'Tutor'})`
                              : 'Podés solicitar la firma en tiempo real escaneando un código QR.'}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            No requiere cables ni apps adicionales. Si el tutor no está presente, podés omitir este paso.
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="default"
                        onClick={() => {
                          if (!formData.tutorApellido || !formData.tutorNombre) {
                            alert('Por favor completa primero el Nombre y Apellido del Tutor en el Paso 3.');
                            return;
                          }
                          setSignModalState({
                            open: true,
                            documentoTitulo: `Inscripción 2026 - ${formData.apellido || 'Estudiante'}, ${formData.nombre || ''}`,
                          });
                        }}
                        className="w-full sm:w-auto font-bold bg-primary text-primary-foreground shadow-xs shrink-0"
                      >
                        <Smartphone className="w-4 h-4 mr-1.5" />
                        Firmar con Teléfono (QR)
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in-50">
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                              ✓ Firma Digital Registrada
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              ({new Date(capturedSignature.signedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })})
                            </span>
                          </div>
                          <p className="text-xs text-foreground font-medium">
                            {formData.tutorApellido}, {formData.tutorNombre} {formData.tutorDni ? `- DNI ${formData.tutorDni}` : ''}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Se colocará en el lugar correspondiente en Matrícula, ISA, CUS y Autorización de Imagen.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <div className="h-12 px-3 py-1 bg-white dark:bg-slate-900 border rounded-lg flex items-center justify-center shadow-2xs">
                          <img
                            src={capturedSignature.pngUrl}
                            alt="Firma del Tutor"
                            className="max-h-10 max-w-[120px] object-contain"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSignModalState({
                                open: true,
                                documentoTitulo: `Inscripción 2026 - ${formData.apellido || 'Estudiante'}, ${formData.nombre || ''}`,
                              });
                            }}
                            className="h-7 text-[11px] px-2"
                          >
                            Volver a firmar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setCapturedSignature(null)}
                            className="h-7 text-[11px] px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          >
                            Quitar firma
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Resumen Final */}
                <div className="p-4 rounded-xl border bg-card space-y-3">
                  <h4 className="font-bold text-sm text-foreground">Resumen de la Ficha a Generar:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Estudiante:</span>{' '}
                      <strong className="text-foreground">{formData.apellido}, {formData.nombre}</strong> (DNI {formData.dni})
                    </div>
                    <div>
                      <span className="text-muted-foreground">Curso Destino:</span>{' '}
                      <strong className="text-foreground">
                        {cursos.find((c) => c.id === formData.cursoId)?.nombre || 'Seleccionado'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tutor Legal:</span>{' '}
                      <strong className="text-foreground">{formData.tutorApellido}, {formData.tutorNombre}</strong> ({formData.tutorParentesco})
                    </div>
                    <div>
                      <span className="text-muted-foreground">Teléfono Contacto:</span>{' '}
                      <strong className="text-foreground">{formData.tutorTelefono}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          {/* Botones de Navegación de Pasos */}
          <CardFooter className="flex items-center justify-between pt-4 border-t">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Anterior
              </Button>
            ) : (
              <div />
            )}

            {step < 5 ? (
              <Button
                type="button"
                variant="default"
                onClick={() => {
                  if (step === 1 && (!formData.dni || !formData.apellido || !formData.nombre)) {
                    alert('Por favor completa DNI, Apellido y Nombre del estudiante.');
                    return;
                  }
                  if (step === 3 && (!formData.tutorDni || !formData.tutorApellido || !formData.tutorNombre || !formData.tutorTelefono)) {
                    alert('Por favor completa los datos obligatorios del tutor y su teléfono de urgencias.');
                    return;
                  }
                  setStep((s) => s + 1);
                }}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground"
              >
                Siguiente <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                variant="brand"
                disabled={saving}
                className="flex items-center gap-1.5 text-base px-6 shadow-md"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generando PDFs con Plantillas...
                  </>
                ) : (
                  <>
                    <FileCheck2 className="w-4 h-4" />
                    Confirmar e Inscribir Alumno
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </form>

      {/* Modal de Firma Digital Mediante Teléfono + QR (disponible antes de enviar en Paso 5) */}
      <PhoneSignatureModal
        open={signModalState.open}
        onOpenChange={(open) => setSignModalState((prev) => ({ ...prev, open }))}
        documentoId={signModalState.documentoId}
        alumnoId={signModalState.alumnoId}
        tutorId={signModalState.tutorId}
        documentoTitulo={signModalState.documentoTitulo}
        tipoDocumento={signModalState.tipoDocumento}
        onSignatureCompleted={(data) => {
          setCapturedSignature({
            token: data.token,
            pngUrl: data.pngUrl,
            signedAt: data.signedAt,
            tutorNombre: data.tutorNombre || `${formData.tutorApellido}, ${formData.tutorNombre}`,
          });
          setSignModalState((prev) => ({ ...prev, open: false }));
        }}
      />
    </div>
  );
}
