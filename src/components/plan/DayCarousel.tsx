import { useRef, useEffect } from 'react'

interface DayCarouselProps {
  children: React.ReactNode[]
  currentDayIndex: number
  onDayChange: (index: number) => void
}

export function DayCarousel({ children, currentDayIndex, onDayChange }: DayCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  // Detect centered card via IntersectionObserver
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const index = itemRefs.current.indexOf(entry.target as HTMLDivElement)
            if (index >= 0 && index !== currentDayIndex) onDayChange(index)
          }
        }
      },
      { root: container, threshold: 0.6 },
    )
    itemRefs.current.forEach(el => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [children.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to day when changed externally (e.g. dot tap)
  useEffect(() => {
    const el = itemRefs.current[currentDayIndex]
    if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [currentDayIndex])

  return (
    <div>
      {/* Day indicator dots */}
      <div className="flex justify-center gap-1.5 mb-4">
        {Array.from({ length: children.length }, (_, i) => (
          <button
            key={i}
            onClick={() => onDayChange(i)}
            className={`w-2 h-2 rounded-full transition-colors ${i === currentDayIndex ? 'bg-primary' : 'bg-accent/40'}`}
            aria-label={`Day ${i + 1} of ${children.length}`}
          />
        ))}
      </div>

      {/* Horizontal scroll-snap container */}
      <div
        ref={scrollRef}
        className="flex overflow-x-scroll snap-x snap-mandatory gap-3 px-6"
        style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
      >
        {children.map((child, i) => (
          <div
            key={i}
            ref={el => { itemRefs.current[i] = el }}
            className="flex-none w-[calc(100vw-48px)] snap-center"
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  )
}
