// src/components/students/DriveFolderSaver.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { FolderOpen, HardDriveDownload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  chooseFolder,
  getSavedFolderName,
  isFolderSaveSupported,
  savePdfsToFolder,
} from '@/lib/drive-folder';

interface Props {
  dni: string;
  alumnoId?: string;
  documentos: Array<{ id: string; tipo: string }>;
  /** Si es true, intenta guardar automáticamente al montar (cuando ya hay carpeta elegida). */
  autoSave?: boolean;
  /** Cambiar para forzar un nuevo guardado (ej. tras firmar). */
  refreshKey?: number;
}

export default function DriveFolderSaver({ dni, alumnoId, documentos, autoSave = true, refreshKey = 0 }: Props) {
  const [supported, setSupported] = useState(true);
  const [folder, setFolder] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const n = await savePdfsToFolder(
        [
          ...documentos.map((d) => ({ url: `/api/pdf/download/${d.id}`, fileName: `${d.tipo}_${dni}.pdf` })),
          ...(alumnoId
            ? [{ url: `/api/alumnos/${alumnoId}/firma`, fileName: `FIRMA_TUTOR_${dni}.png`, optional: true }]
            : []),
        ],
        dni
      );
      setMsg({ ok: true, text: `${n} archivos guardados en "${folder}/${dni}".` });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Error al guardar en la carpeta.' });
    } finally {
      setBusy(false);
    }
  };

  const pick = async () => {
    try {
      setFolder(await chooseFolder());
    } catch {
      /* cancelado por el usuario */
    }
  };

  useEffect(() => {
    setSupported(isFolderSaveSupported());
    getSavedFolderName().then(setFolder);
  }, []);

  useEffect(() => {
    if (autoSave && folder && documentos.length > 0) save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder, refreshKey]);

  if (!supported) {
    return (
      <p className="text-xs text-muted-foreground">
        Para guardar en la carpeta de Google Drive usá Chrome o Edge; en este navegador usá el botón Descargar.
      </p>
    );
  }

  return (
    <div className="p-3 rounded-xl border bg-background space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={pick}>
          <FolderOpen className="w-4 h-4 mr-1.5" />
          {folder ? `Carpeta: ${folder} (cambiar)` : 'Elegir carpeta de Google Drive'}
        </Button>
        <Button type="button" size="sm" disabled={!folder || busy} onClick={save}>
          {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <HardDriveDownload className="w-4 h-4 mr-1.5" />}
          Guardar en la carpeta
        </Button>
      </div>
      {msg && <p className={`text-xs ${msg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{msg.text}</p>}
    </div>
  );
}

