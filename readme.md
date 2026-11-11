# preceptor.ia &bull; IPETYM Nº 256

Sistema de matriculación digital, generación de legajos oficiales en PDF y sincronización con Ciudadano Digital (CiDi).

---

## 📍 Guía de Calibración de Coordenadas PDF

Toda la posición de campos y textos a estampar en los formularios oficiales de `src/assets/` está centralizada en:
📁 [`src/lib/pdf/pdf-coordinates.ts`](src/lib/pdf/pdf-coordinates.ts)

### Sistema de Ejes (`pdf-lib`):
- **Eje X (Horizontal)**: `0` es el borde izquierdo. Aumentar `x` mueve el texto a la **derecha**.
- **Eje Y (Vertical)**: `0` es el borde inferior (abajo). Aumentar `y` mueve el texto hacia **arriba** (más alto).

---

## 👮 Documento `Aexternos.pdf` (Autorización Salidas / Alumnos Externos)

> **Importante para la Policía / Juez de Paz**:
> Debido a que la autorización de alumnos externos requiere **firma certificada ante la autoridad policial o escribano público**, el campo **"Lugar y fecha" se deja intencionalmente en blanco** en la plantilla para que el oficial certificante consigne la fecha, lugar y sello en el acto presencial.

---

## 🎯 Archivos de Calibración Visual

En `public/calibration-grids/` se encuentran las plantillas con cuadrícula milimétrica superpuesta:
- `grid_finscripcion.pdf` (Ficha de Matrícula)
- `grid_isa.pdf` (Informe de Salud Anual)
- `grid_cus.pdf` (Certificado Único de Salud)
- `grid_aexternos.pdf` (Autorización Alumnos Externos)
- `grid_aimagen.pdf` (Autorización Publicación de Imágenes)