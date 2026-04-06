interface SlotShimmerProps {
  className?: string
}

export function SlotShimmer({ className }: SlotShimmerProps) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-lg bg-secondary/60 animate-pulse border-l-4 border-l-primary/20 min-h-[52px] ${className ?? ''}`}
    />
  )
}
