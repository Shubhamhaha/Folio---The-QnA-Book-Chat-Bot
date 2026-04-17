export function BookCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="h-48 skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-4 skeleton w-3/4" />
        <div className="h-3 skeleton w-1/2" />
        <div className="h-3 skeleton w-1/3" />
        <div className="space-y-1.5 mt-2">
          <div className="h-2.5 skeleton w-full" />
          <div className="h-2.5 skeleton w-5/6" />
        </div>
        <div className="flex gap-1.5 mt-2">
          <div className="h-5 w-14 skeleton rounded-full" />
          <div className="h-5 w-16 skeleton rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 skeleton w-2/3" />
      <div className="h-5 skeleton w-1/3" />
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-3 skeleton w-full" />
        ))}
      </div>
    </div>
  )
}

export function TextSkeleton({ lines = 3 }) {
  return (
    <div className="space-y-2">
      {[...Array(lines)].map((_, i) => (
        <div
          key={i}
          className="h-3 skeleton"
          style={{ width: `${85 + Math.random() * 15}%` }}
        />
      ))}
    </div>
  )
}
