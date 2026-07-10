interface TableSkeletonProps {
  rows?: number
  cols?: number
}

// Anchos determinísticos por índice de columna (evita Math.random en render)
const WIDTH_PATTERN = ['w-3/4', 'w-1/2', 'w-2/3', 'w-1/3', 'w-5/6', 'w-1/4']

function widthFor(rowIndex: number, colIndex: number): string {
  return WIDTH_PATTERN[(rowIndex + colIndex) % WIDTH_PATTERN.length]
}

/**
 * Esqueleto de carga para tablas del panel admin.
 * Se ve bien sobre fondo bg-primary-900/60.
 */
export default function TableSkeleton({ rows = 6, cols = 5 }: TableSkeletonProps) {
  return (
    <div className="bg-primary-900/60 border border-primary-800 rounded-2xl overflow-hidden animate-pulse">
      {/* Header */}
      <div className="border-b border-primary-800 bg-primary-950/60 px-4 py-3 flex gap-6">
        {Array.from({ length: cols }).map((_, c) => (
          <div key={c} className={`h-3 rounded bg-primary-800/60 ${c === 0 ? 'w-24' : 'w-16'}`} />
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-primary-800/60">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-4 py-4 flex items-center gap-6">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className={`h-3.5 rounded bg-primary-800/60 ${widthFor(r, c)}`}
                style={{ flex: c === 0 ? '2' : '1' }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
