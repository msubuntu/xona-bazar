export default function ProductSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl overflow-hidden animate-pulse" style={{ background: 'var(--bg-card, #fff)', border: '1px solid var(--border-light, #f3f4f6)' }}>
      <div className="aspect-square" style={{ background: 'var(--bg-input, #e5e7eb)' }} />
      <div className="flex flex-col gap-2.5 p-3">
        <div className="h-3 w-16 rounded" style={{ background: 'var(--bg-input, #e5e7eb)' }} />
        <div className="space-y-1.5">
          <div className="h-3.5 w-full rounded" style={{ background: 'var(--bg-input, #e5e7eb)' }} />
          <div className="h-3.5 w-3/4 rounded" style={{ background: 'var(--bg-input, #e5e7eb)' }} />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full" style={{ background: 'var(--bg-input, #e5e7eb)' }} />
          <div className="h-3 w-8 rounded" style={{ background: 'var(--bg-input, #e5e7eb)' }} />
          <div className="h-3 w-10 rounded" style={{ background: 'var(--bg-input, #e5e7eb)' }} />
        </div>
        <div className="flex items-baseline gap-2 pt-1">
          <div className="h-5 w-24 rounded" style={{ background: 'var(--bg-input, #e5e7eb)' }} />
          <div className="h-3.5 w-16 rounded" style={{ background: 'var(--bg-input, #e5e7eb)' }} />
        </div>
      </div>
    </div>
  )
}
