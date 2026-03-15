interface ProgressRingProps {
  value: number
  target: number
  size?: number
  strokeWidth?: number
  color?: string
  bgColor?: string
  label?: string
  showValue?: boolean
}

/**
 * SVG circular progress indicator comparing value to target.
 * Background ring defaults to currentColor at low opacity — adapts to light/dark mode.
 */
export function ProgressRing({
  value,
  target,
  size = 40,
  strokeWidth = 4,
  color = '#A8C5A0',
  bgColor = 'currentColor',
  showValue = false,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = target > 0 ? Math.min(value / target, 1) : 0
  const dashOffset = circumference * (1 - pct)
  const fontSize = size <= 36 ? 9 : size <= 48 ? 11 : 13

  return (
    <svg width={size} height={size}>
      <g style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}>
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
          strokeOpacity={bgColor === 'currentColor' ? 0.12 : 0.2}
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
      </g>
      {showValue && (
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize}
          fontWeight={600}
          fill="currentColor"
          style={{ opacity: 0.7 }}
        >
          {Math.round(value)}
        </text>
      )}
    </svg>
  )
}
