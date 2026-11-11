// src/components/students/StudentSyncTable.tsx
'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  FileCheck2,
  Clock,
  ExternalLink,
  ChevronDown,
  FileText,
  Download,
  Eye,
  Sparkles,
  Layers,
  ArrowRight,
  Filter,
  UserPlus,
  RotateCcw,
  Smartphone,
  PenTool,
} from 'lucide-react';
import PhoneSignatureModal from '@/components/signature/PhoneSignatureModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface DocumentoItem {
  id: string;
  tipo: string;
  estado: string;
  fileUrl?: string | null;
  firmado?: boolean;
  firmaFecha?: string | null;
  firmaUrl?: string | null;
}

export interface AlumnoItem {
  id: string;
  dni: string;
  nombre: string;
  apellido: string;
  telefono?: string | null;
  email?: string | null;
  obraSocial?: string | null;
  grupoSanguineo?: string | null;
  inscripciones: Array<{
    curso: {
      id: string;
      nombre: string;
      turno: string;
    };
  }>;
  tutores: Array<{
    parentesco: string;
    tutor: {
      id?: string;
      dni: string;
      nombre: string;
      apellido: string;
      telefono: string;
    };
  }>;
  documentos: DocumentoItem[];
}

interface Props {
  initialAlumnos: AlumnoItem[];
}

const DOC_NAMES: Record<string, string> = {
  FICHA_INSCRIPCION: 'Ficha Matrícula',
  ISA: 'Informe Salud (ISA)',
  CUS: 'Cert. Salud (CUS)',
  AUTORIZACION_IMAGEN: 'Autoriz. Imagen / Salidas',
  CERTIFICADO_ESCOLARIDAD: 'Cert. Regular',
};

export default function StudentSyncTable({ initialAlumnos }: Props) {
  const [alumnos, setAlumnos] = useState<AlumnoItem[]>(initialAlumnos);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCurso, setSelectedCurso] = useState('ALL');
  const [selectedDocType, setSelectedDocType] = useState('ALL');
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; title: string; text: string } | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string; docId: string } | null>(null);
  const [signModalState, setSignModalState] = useState<{
    open: boolean;
    documentoId?: string;
    alumnoId?: string;
    tutorId?: string;
    documentoTitulo?: string;
    tipoDocumento?: string;
  }>({ open: false });

  const showToast = (title: string, text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ title, text, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const refreshData = async () => {
    try {
      const res = await fetch('/api/alumnos');
      const data = await res.json();
      if (data.success) {
        setAlumnos(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Cursos disponibles
  const cursos = useMemo(() => {
    const list = new Set<string>();
    alumnos.forEach((a) => {
      a.inscripciones.forEach((i) => list.add(i.curso.nombre));
    });
    return Array.from(list).sort();
  }, [alumnos]);

  // Métricas generales
  const stats = useMemo(() => {
    let totalDocs = 0;
    let signedDocs = 0;
    alumnos.forEach((a) => {
      a.documentos.forEach((d) => {
        totalDocs++;
        if (d.firmado) signedDocs++;
      });
    });
    const completionRate = totalDocs > 0 ? Math.round((signedDocs / totalDocs) * 100) : 0;
    return { totalDocs, signedDocs, pendingSign: totalDocs - signedDocs, completionRate };
  }, [alumnos]);

  // Filtrado de alumnos
  const filteredAlumnos = useMemo(() => {
    return alumnos.filter((alumno) => {
      const matchSearch =
        searchTerm.trim() === '' ||
        alumno.dni.includes(searchTerm.trim()) ||
        `${alumno.apellido} ${alumno.nombre}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alumno.tutores.some((t) => `${t.tutor.apellido} ${t.tutor.nombre}`.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCurso =
        selectedCurso === 'ALL' ||
        alumno.inscripciones.some((i) => i.curso.nombre === selectedCurso);

      const matchDocType =
        selectedDocType === 'ALL' ||
        alumno.documentos.some((d) => d.tipo === selectedDocType);

      return matchSearch && matchCurso && matchDocType;
    });
  }, [alumnos, searchTerm, selectedCurso, selectedDocType]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <Alert
          variant={notification.type === 'error' ? 'destructive' : notification.type === 'success' ? 'success' : 'default'}
          className="shadow-md animate-in fade-in-50 slide-in-from-top-2"
        >
          <AlertTitle className="font-bold">{notification.title}</AlertTitle>
          <AlertDescription>{notification.text}</AlertDescription>
        </Alert>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alumnos Matriculados</CardTitle>
            <Layers className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">{alumnos.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Ciclo Lectivo Oficial 2026</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Documentos Generados</CardTitle>
            <FileText className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">{stats.totalDocs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Documentos Firmados</CardTitle>
            <PenTool className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-black text-foreground">{stats.signedDocs}</div>
              <Badge variant="success">{stats.completionRate}% Firmado</Badge>
            </div>
            <div className="mt-2">
              <Progress value={stats.completionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes de Firma</CardTitle>
            <Clock className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.pendingSign}</div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar & Filter Bar */}
      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Buscador */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por DNI, Apellido o Nombre del estudiante o tutor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full"
              />
            </div>

            {/* Acciones Rápidas */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                className="flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Actualizar</span>
              </Button>

              <Button asChild size="sm" variant="brand">
                <Link href="/inscripcion" className="flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4" />
                  <span>Nueva Inscripción</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* Filtros Dropdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Curso / División</label>
              <Select value={selectedCurso} onValueChange={setSelectedCurso}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos los Cursos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los Cursos</SelectItem>
                  {cursos.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Tipo de Documento</label>
              <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos los Tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los Documentos</SelectItem>
                  <SelectItem value="FICHA_INSCRIPCION">Ficha de Matrícula</SelectItem>
                  <SelectItem value="ISA">Informe de Salud (ISA)</SelectItem>
                  <SelectItem value="CUS">Certificado de Salud (CUS)</SelectItem>
                  <SelectItem value="AUTORIZACION_IMAGEN">Autorizaciones Institucionales</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Estudiantes & Legajos */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[260px]">Estudiante & Contacto</TableHead>
                <TableHead className="w-[110px]">Curso</TableHead>
                <TableHead className="w-[200px]">Tutor Responsable</TableHead>
                <TableHead className="min-w-[340px]">Documentación</TableHead>
                <TableHead className="text-right w-[120px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAlumnos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No se encontraron estudiantes que coincidan con la búsqueda.</p>
                    <p className="text-xs mt-1">Prueba cambiando los filtros o registra un nuevo estudiante.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAlumnos.map((alumno) => {
                  const cursoNombre = alumno.inscripciones[0]?.curso?.nombre || 'Sin Asignar';
                  const cursoTurno = alumno.inscripciones[0]?.curso?.turno || '';
                  const tutorRel = alumno.tutores[0];

                  return (
                    <TableRow key={alumno.id} className="hover:bg-muted/40 transition-colors">
                      {/* Estudiante */}
                      <TableCell className="font-medium align-top py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground">
                            {alumno.apellido}, {alumno.nombre}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono mt-0.5">
                            DNI {alumno.dni}
                          </span>
                          {alumno.obraSocial && (
                            <span className="text-[11px] text-primary mt-1">
                              {alumno.obraSocial} {alumno.grupoSanguineo ? `(${alumno.grupoSanguineo})` : ''}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Curso */}
                      <TableCell className="align-top py-4">
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="w-fit font-bold">
                            {cursoNombre}
                          </Badge>
                          {cursoTurno && (
                            <span className="text-[11px] text-muted-foreground">{cursoTurno}</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Tutor */}
                      <TableCell className="align-top py-4">
                        {tutorRel ? (
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-foreground">
                              {tutorRel.tutor.apellido}, {tutorRel.tutor.nombre}
                            </span>
                            <span className="text-[11px] text-muted-foreground mt-0.5">
                              {tutorRel.parentesco} &bull; {tutorRel.tutor.telefono || 'Sin tel'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Sin tutor</span>
                        )}
                      </TableCell>

                      {/* Documentación */}
                      <TableCell className="align-top py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {alumno.documentos.map((doc) => {
                            const label = DOC_NAMES[doc.tipo] || doc.tipo;

                            return (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-secondary/40 border text-xs gap-2"
                              >
                                <div className="flex flex-col overflow-hidden">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-foreground truncate">{label}</span>
                                    {doc.firmado && (
                                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/40 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30">
                                        ✓ Firmado
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                    title="Previsualizar PDF"
                                    onClick={() =>
                                      setPreviewDoc({
                                        url: `/api/pdf/download/${doc.id}`,
                                        title: `${label} - ${alumno.apellido}, ${alumno.nombre}`,
                                        docId: doc.id,
                                      })
                                    }
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                      "h-7 w-7",
                                      doc.firmado
                                        ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                        : "text-primary hover:bg-primary/10"
                                    )}
                                    title={doc.firmado ? "Documento firmado (Click para volver a firmar)" : "Firmar con teléfono celular (Tutor)"}
                                    onClick={() =>
                                      setSignModalState({
                                        open: true,
                                        documentoId: doc.id,
                                        alumnoId: alumno.id,
                                        tutorId: tutorRel?.tutor?.id,
                                        documentoTitulo: `${label} - ${alumno.apellido}, ${alumno.nombre}`,
                                        tipoDocumento: doc.tipo,
                                      })
                                    }
                                  >
                                    <Smartphone className="w-3.5 h-3.5" />
                                  </Button>

                                  <a
                                    href={`/api/pdf/download/${doc.id}`}
                                    download
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                                    title="Descargar PDF"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>

                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </TableCell>

                      {/* Acciones Alumno */}
                      <TableCell className="align-top py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const firstDoc = alumno.documentos[0];
                              setSignModalState({
                                open: true,
                                documentoId: firstDoc?.id,
                                alumnoId: alumno.id,
                                tutorId: tutorRel?.tutor?.id,
                                documentoTitulo: `Legajo de Matrícula - ${alumno.apellido}, ${alumno.nombre}`,
                              });
                            }}
                            className="h-8 text-xs font-medium border-slate-300 dark:border-slate-700 hover:bg-muted"
                            title="Solicitar firma del tutor mediante código QR"
                          >
                            <Smartphone className="w-3.5 h-3.5 mr-1 text-primary" />
                            Firmar con teléfono
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal Previsualizador de Documento PDF */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl w-[95vw] h-[85vh] flex flex-col p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileCheck2 className="w-5 h-5 text-primary" />
              <span>{previewDoc?.title}</span>
            </DialogTitle>
            <DialogDescription>
              Documento oficial generado con plantilla del IPETYM 256.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 w-full bg-muted/40 rounded-xl overflow-hidden border my-2">
            {previewDoc && (
              <iframe
                src={previewDoc.url}
                className="w-full h-full border-0"
                title={previewDoc.title}
              />
            )}
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Formato vectorial A4 &bull; Sello institucional &bull; Código UUID
            </span>
            <div className="flex items-center gap-2">
              {previewDoc && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSignModalState({
                        open: true,
                        documentoId: previewDoc.docId,
                        documentoTitulo: previewDoc.title,
                      });
                    }}
                    className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Firmar con teléfono</span>
                  </Button>

                  <a
                    href={previewDoc.url}
                    download
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium border rounded-lg bg-background hover:bg-accent"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar Archivo</span>
                  </a>
                </>
              )}
              <Button onClick={() => setPreviewDoc(null)}>Cerrar</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          showToast('Firma Recibida', 'La firma manuscrita del tutor fue recibida y estampada en el documento oficial.');
          await refreshData();
          if (previewDoc && previewDoc.docId === data.documentoId) {
            setPreviewDoc((prev) => (prev ? { ...prev, url: `/api/pdf/download/${prev.docId}?t=${Date.now()}` } : null));
          }
        }}
      />
    </div>
  );
}
