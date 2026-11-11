// src/lib/signature/stroke-utils.ts
export interface Point {
  x: number;
  y: number;
  time?: number;
}

export interface Stroke {
  points: Point[];
}

/**
 * Convierte un arreglo de trazos vectoriales a una cadena SVG limpia.
 */
export function strokesToSvg(strokes: Stroke[], width = 500, height = 250): string {
  if (!strokes || strokes.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"></svg>`;
  }

  // Generar rutas SVG con suavizado básico de curvas
  const paths = strokes
    .filter((stroke) => stroke.points && stroke.points.length > 0)
    .map((stroke) => {
      const pts = stroke.points;
      if (pts.length === 1) {
        return `<circle cx="${pts[0].x.toFixed(1)}" cy="${pts[0].y.toFixed(1)}" r="1.5" fill="#0f172a" />`;
      }

      let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
      for (let i = 1; i < pts.length; i++) {
        const p1 = pts[i - 1];
        const p2 = pts[i];
        const midX = ((p1.x + p2.x) / 2).toFixed(1);
        const midY = ((p1.y + p2.y) / 2).toFixed(1);
        d += ` Q ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}, ${midX} ${midY}`;
      }
      const last = pts[pts.length - 1];
      d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;

      return `<path d="${d}" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />`;
    })
    .join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <g>
    ${paths}
  </g>
</svg>`;
}

/**
 * Valida que los trazos contengan una firma manuscrita real (no un simple clic o canvas vacío).
 */
export function validateStrokes(strokes: Stroke[]): { valid: boolean; reason?: string; pointCount: number } {
  if (!strokes || !Array.isArray(strokes) || strokes.length === 0) {
    return { valid: false, reason: 'No se detectaron trazos en la firma', pointCount: 0 };
  }

  let totalPoints = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const stroke of strokes) {
    if (stroke.points && Array.isArray(stroke.points)) {
      totalPoints += stroke.points.length;
      for (const pt of stroke.points) {
        if (typeof pt.x === 'number' && typeof pt.y === 'number') {
          if (pt.x < minX) minX = pt.x;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.y > maxY) maxY = pt.y;
        }
      }
    }
  }

  // Mínimo de 4 puntos en total para validar trazo real
  if (totalPoints < 4) {
    return { valid: false, reason: 'La firma es demasiado corta o está vacía', pointCount: totalPoints };
  }

  // Verificar que tenga cierta amplitud (no un único punto microscópico)
  const widthSpan = maxX - minX;
  const heightSpan = maxY - minY;
  if (widthSpan < 8 && heightSpan < 8) {
    return { valid: false, reason: 'La firma no tiene dimensiones suficientes', pointCount: totalPoints };
  }

  return { valid: true, pointCount: totalPoints };
}
