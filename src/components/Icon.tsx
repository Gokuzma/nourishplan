/**
 * Thin-stroke line icons — NourishPlan v2.0 Gazette edition.
 *
 * Ported from the Claude Design handoff bundle (nourishplan/project/icons.jsx).
 * Hand-drawn 1.5px stroke, 24×24 viewBox, stroke="currentColor", fill="none".
 * Designed to replace emoji icons in nav + action buttons so the app reads
 * "crafted" rather than "wellness-app default".
 *
 * Add new glyphs by extending the IconName union and the switch below.
 * Keep stroke-width: 1.5 and round line caps for visual consistency.
 */

import type { CSSProperties } from 'react'

export type IconName =
  | 'home'
  | 'book'
  | 'plate'
  | 'calendar'
  | 'box'
  | 'cart'
  | 'chart'
  | 'users'
  | 'gear'
  | 'compass'
  | 'search'
  | 'plus'
  | 'minus'
  | 'lock'
  | 'unlock'
  | 'flame'
  | 'pot'
  | 'clock'
  | 'grip'
  | 'more'
  | 'check'
  | 'x'
  | 'arrow-right'
  | 'arrow-down'
  | 'pantry'
  | 'fridge'
  | 'freezer'
  | 'leaf'
  | 'tag'
  | 'link'
  | 'copy'
  | 'edit'
  | 'crown'
  | 'asterisk'
  | 'command'
  | 'bell'
  | 'sun'
  | 'moon'
  | 'door'

export interface IconProps {
  name: IconName
  size?: number
  className?: string
  style?: CSSProperties
  'aria-label'?: string
}

const SHARED = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function Icon({
  name,
  size = 18,
  className = '',
  style,
  'aria-label': ariaLabel,
}: IconProps) {
  const commonProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    className: `icon ${className}`.trim(),
    style,
    'aria-label': ariaLabel,
    role: ariaLabel ? 'img' : 'presentation',
    'aria-hidden': ariaLabel ? undefined : true,
  }

  switch (name) {
    case 'home':
      return (
        <svg {...commonProps} {...SHARED}>
          <path d="M3.5 11 12 4l8.5 7M5.5 9.5V20h13V9.5M10 20v-6h4v6" />
        </svg>
      )
    case 'book':
      return (
        <svg {...commonProps} {...SHARED}>
          <path d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z" />
          <path d="M9 8h5M9 11h5M9 14h3" />
        </svg>
      )
    case 'plate':
      return (
        <svg {...commonProps} {...SHARED}>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="5" />
          <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2" />
        </svg>
      )
    case 'calendar':
      return (
        <svg {...commonProps} {...SHARED}>
          <rect x="3.5" y="5" width="17" height="15" rx="1" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
      )
    case 'box':
      return (
        <svg {...commonProps} {...SHARED}>
          <path d="M3.5 8 12 4l8.5 4v8L12 20l-8.5-4V8z" />
          <path d="M3.5 8 12 12l8.5-4M12 12v8" />
        </svg>
      )
    case 'cart':
      return (
        <svg {...commonProps} {...SHARED}>
          <path d="M3 4h2.5L8 16h10l2-9H6" />
          <circle cx="9" cy="20" r="1.2" />
          <circle cx="17" cy="20" r="1.2" />
        </svg>
      )
    case 'chart':
      return (
        <svg {...commonProps} {...SHARED}>
          <path d="M4 20V8M10 20V4M16 20v-8M20 20H3.5" />
        </svg>
      )
    case 'users':
      return (
        <svg {...commonProps} {...SHARED}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M3 20c.5-3.5 3-6 6-6s5.5 2.5 6 6" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M15 20c0-3 2-5 4-5" />
        </svg>
      )
    case 'gear':
      return (
        <svg {...commonProps} {...SHARED}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M4 12H1M23 12h-3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" />
        </svg>
      )
    case 'compass':
      return (
        <svg {...commonProps} {...SHARED}>
          <circle cx="12" cy="12" r="9" />
          <path d="m14.5 9.5-5 2-2 5 5-2 2-5z" />
        </svg>
      )
    case 'search':
      return (
        <svg {...commonProps} {...SHARED}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m20 20-4-4" />
        </svg>
      )
    case 'plus':
      return (
        <svg {...commonProps} {...SHARED}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      )
    case 'minus':
      return (
        <svg {...commonProps} {...SHARED}>
          <path d="M5 12h14" />
        </svg>
      )
    case 'lock':
      return (
        <svg {...commonProps} {...SHARED}>
          <rect x="5" y="10" width="14" height="10" rx="1" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      )
    case 'unlock':
      return (
        <svg {...commonProps} {...SHARED}>
          <rect x="5" y="10" width="14" height="10" rx="1" />
          <path d="M8 10V7a4 4 0 0 1 8 0" />
        </svg>
      )
    case 'flame':
      return (
        <svg {...commonProps} {...SHARED}>
          <path d="M12 3s4 4 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 2 2 2-1 0-2 0-3 0-4z" />
        </svg>
      )
    case 'pot':
      return (
        <svg {...commonProps} {...SHARED}>
          <path d="M4 10h16v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6zM2 10h20" />
          <path d="M9 7c0-1.5 3-1.5 3-3M14 7c0-1.5 2-1.5 2-3" />
        </svg>
      )
    case 'clock':
      return (
        <svg {...commonProps} {...SHARED}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5l3 2" />
        </svg>
      )
    case 'grip':
      return (
        <svg {...commonProps} {...SHARED}>
          <circle cx="9" cy="6" r="1.2" />
          <circle cx="9" cy="12" r="1.2" />
          <circle cx="9" cy="18" r="1.2" />
          <circle cx="15" cy="6" r="1.2" />
          <circle cx="15" cy="12" r="1.2" />
          <circle cx="15" cy="18" r="1.2" />
        </svg>
      )
    case 'more':
      return (
        <svg {...commonProps} {...SHARED}>
          <circle cx="5" cy="12" r="1.2" />
          <circle cx="12" cy="12" r="1.2" />
          <circle cx="19" cy="12" r="1.2" />
        </svg>
      )
    case 'check':
      return (
        <svg {...commonProps} {...SHARED}>
          <path d="m5 12 4.5 4.5L19 7" />
        </svg>
      )
    case 'x':
      return (
        <svg {...commonProps} {...SHARED}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      )
    case 'arrow-right':
      return (
        <svg {...commonProps} {...SHARED}>
          <path d="M4 12h16M14 6l6 6-6 6" />
        </svg>
      )
    case 'arrow-down':
      return (
        <svg {...commonProps} {...SHARED}>
          <path d="M12 4v16M6 14l6 6 6-6" />
        </svg>
      )
    case 'pantry':
      return (
        <svg {...commonProps} {...SHARED}>
          <rect x="4" y="3" width="16" height="18" rx="1" />
          <path d="M4 9h16M4 15h16M12 3v18" />
        </svg>
      )
    case 'fridge':
      return (
        <svg {...commonProps} {...SHARED}>
          <rect x="5" y="3" width="14" height="18" rx="1" />
          <path d="M5 10h14M8 6v2M8 13v3" />
        </svg>
      )
    case 'freezer':
      return (
        <svg {...commonProps} {...SHARED}>
          <rect x="5" y="3" width="14" height="18" rx="1" />
          <path d="M5 10h14M12 5v3M12 13v5M10 14l4 3M14 14l-4 3" />
        </svg>
      )
    case 'leaf':
      return (
        <svg {...commonProps} {...SHARED}>
          <path d="M5 19c0-8 6-14 15-14-1 9-6 15-14 15l-1-1zM5 19l7-7" />
        </svg>
      )
    case 'tag':
      return (
        <svg {...commonProps} {...SHARED}>
          <path d="M3 12V4h8l10 10-8 8L3 12z" />
          <circle cx="7.5" cy="7.5" r="1" />
        </svg>
      )
    case 'link':
      return (
        <svg {...commonProps} {...SHARED}>
          <path d="M10 14a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6L12 7" />
          <path d="M14 10a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6L12 17" />
        </svg>
      )
    case 'copy':
      return (
        <svg {...commonProps} {...SHARED}>
          <rect x="9" y="9" width="12" height="12" rx="1" />
          <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
        </svg>
      )
    case 'edit':
      return (
        <svg {...commonProps} {...SHARED}>
          <path d="M3 21h4l12-12-4-4L3 17v4zM14 6l4 4" />
        </svg>
      )
    case 'crown':
      return (
        <svg {...commonProps} {...SHARED}>
          <path d="M3 7l3 10h12l3-10-5 4-4-7-4 7-5-4z" />
        </svg>
      )
    case 'asterisk':
      return (
        <svg {...commonProps} {...SHARED}>
          <path d="M12 3v18M5 7l14 10M19 7 5 17" />
        </svg>
      )
    case 'command':
      return (
        <svg {...commonProps} {...SHARED}>
          <path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6z" />
        </svg>
      )
    case 'bell':
      return (
        <svg {...commonProps} {...SHARED}>
          <path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2zM10 20a2 2 0 0 0 4 0" />
        </svg>
      )
    case 'sun':
      return (
        <svg {...commonProps} {...SHARED}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" />
        </svg>
      )
    case 'moon':
      return (
        <svg {...commonProps} {...SHARED}>
          <path d="M20 14a8 8 0 0 1-10-10 8 8 0 1 0 10 10z" />
        </svg>
      )
    case 'door':
      return (
        <svg {...commonProps} {...SHARED}>
          <path d="M6 3h12v18H6z" />
          <circle cx="15" cy="12" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      )
    default:
      return null
  }
}
