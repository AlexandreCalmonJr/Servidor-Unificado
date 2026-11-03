interface TableSkeletonProps {
  rows?: number
  columns?: number
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div style={{ width: '100%', padding: '12px 0' }} role="status" aria-label="Carregando dados...">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div
          key={`skeleton-row-${rIdx}`}
          style={{
            display: 'flex',
            gap: '16px',
            padding: '14px 16px',
            borderBottom: '1px solid var(--line)',
            alignItems: 'center',
          }}
        >
          {Array.from({ length: columns }).map((_, cIdx) => (
            <div
              key={`skeleton-col-${rIdx}-${cIdx}`}
              style={{
                height: '14px',
                borderRadius: '4px',
                background:
                  'linear-gradient(90deg, var(--canvas) 25%, #e2e8f0 50%, var(--canvas) 75%)',
                backgroundSize: '200% 100%',
                animation: 'skeleton-pulse 1.5s infinite',
                flex: cIdx === 0 ? 1.5 : 1,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

