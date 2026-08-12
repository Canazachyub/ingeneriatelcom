// Helper de exportación a Excel real (.xlsx) con formato:
// encabezado en negrita con fondo, fila congelada, autofiltro, anchos
// automáticos y formatos numéricos. ExcelJS se carga bajo demanda
// (dynamic import) para no inflar el bundle inicial.
export interface ColumnaExcel {
  titulo: string
  ancho?: number    // si no se indica, se calcula del contenido (8–42)
  formato?: string  // numFmt de Excel, ej. '#,##0.00'
}

export interface HojaExcel {
  nombre: string    // máx 31 chars, sin []:*?/\
  columnas: ColumnaExcel[]
  filas: (string | number | null)[][]
}

function anchoAuto(titulo: string, filas: (string | number | null)[][], idx: number): number {
  let max = titulo.length
  for (const f of filas) {
    const v = f[idx]
    if (v === null || v === undefined) continue
    const len = String(v).length
    if (len > max) max = len
  }
  return Math.min(42, Math.max(8, max + 2))
}

export async function exportarExcel(nombreArchivo: string, hojas: HojaExcel[]): Promise<void> {
  const ExcelJS = await import('exceljs')
  const wb = new ExcelJS.Workbook()

  for (const h of hojas) {
    const ws = wb.addWorksheet(h.nombre.slice(0, 31))
    ws.columns = h.columnas.map((c, idx) => ({
      header: c.titulo,
      width: c.ancho ?? anchoAuto(c.titulo, h.filas, idx),
    }))

    const headerRow = ws.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2847' } }
    headerRow.height = 20

    h.filas.forEach((f) => ws.addRow(f))

    h.columnas.forEach((c, idx) => {
      if (c.formato) ws.getColumn(idx + 1).numFmt = c.formato
    })

    ws.views = [{ state: 'frozen', ySplit: 1 }]
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: h.columnas.length } }
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nombreArchivo
  a.click()
  URL.revokeObjectURL(a.href)
}
