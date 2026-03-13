interface ProgressRingProps {
  value: number
  target: number
  size?: number
  strokeWidth?: number
  color?: string
  label?: string
}

/**
 * SVG circular progress indicator comparing value to target.
 * Background ring is peach (#E8B4A2), fill is sage (#A8C5A0) by default.
 */
export function ProgressRing({
  value,
  target,
  size = 40,
  strokeWidth = 4,
  color = '#A8C5A0',
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = target > 0 ? Math.min(value / target, 1) : 0
  const dashOffset = circumference * (1 - pct)

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#E8B4A2"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
      />
    </svg>
  )
}
