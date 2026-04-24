/*
 * Editorial primitives — Gazette page structure components shared across
 * v2.0 page rewrites. Visual contract is defined by .nameplate / .story-head
 * / .section-head / .folio CSS classes in src/styles/global.css.
 */

interface NameplateProps {
  left: string
  title: React.ReactNode
  right: string
  size?: 'lg' | 'sm'
}

export function Nameplate({ left, title, right, size = 'lg' }: NameplateProps) {
  return (
    <div className={`nameplate ${size === 'sm' ? 'sm' : ''}`}>
      <div className="left">{left}</div>
      <div className="title">{title}</div>
      <div className="right">{right}</div>
    </div>
  )
}

interface StoryHeadProps {
  kicker: string
  headline: string
  headlineAccent?: string
  byline?: string | null
  size?: 'lg' | 'sm'
}

export function StoryHead({ kicker, headline, headlineAccent, byline, size = 'lg' }: StoryHeadProps) {
  return (
    <div className={`story-head ${size === 'sm' ? 'sm' : ''}`}>
      <div>
        <div className="kicker">{kicker}</div>
        <div className="headline">
          {headline}
          {headlineAccent && (
            <>
              {' '}
              <em>{headlineAccent}</em>
            </>
          )}
        </div>
      </div>
      {byline && (
        <div className="byline">
          {byline.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
    </div>
  )
}

interface SectionHeadProps {
  no: string
  label: string
  aux?: string
  className?: string
}

export function SectionHead({ no, label, aux, className }: SectionHeadProps) {
  return (
    <div className={`section-head ${className ?? ''}`}>
      <span className="no">§{no}</span>
      <span className="label">{label}</span>
      {aux && <span className="aux">{aux}</span>}
    </div>
  )
}

interface FolioProps {
  num: string
  title: string
  tagline: string
  pageOf: string
}

export function Folio({ num, title, tagline, pageOf }: FolioProps) {
  return (
    <div className="folio">
      <span>
        <span className="num">{num}</span> · {title}
      </span>
      <span>{tagline}</span>
      <span>{pageOf}</span>
    </div>
  )
}

interface RuleProps {
  variant?: 'default' | 'soft' | 'dashed' | 'double' | 'triple'
  className?: string
}

export function Rule({ variant = 'default', className }: RuleProps) {
  const variantCls =
    variant === 'soft' ? 'rule-soft'
      : variant === 'dashed' ? 'rule-dashed'
      : variant === 'double' ? 'rule-double'
      : variant === 'triple' ? 'rule-triple'
      : ''
  return <hr className={`rule ${variantCls} ${className ?? ''}`} />
}

interface ChipProps {
  kind?: 'tomato' | 'butter' | 'chart' | 'plum' | 'sky' | 'leaf'
  children: React.ReactNode
  ariaLabel?: string
  title?: string
}

export function Chip({ kind = 'tomato', children, ariaLabel, title }: ChipProps) {
  return <span className={`chip chip-${kind}`} aria-label={ariaLabel} title={title}>{children}</span>
}

interface PipProps {
  variant?: 'ok' | 'warn' | 'danger'
  children: React.ReactNode
}

export function Pip({ variant = 'ok', children }: PipProps) {
  return <span className={`pip ${variant === 'warn' ? 'warn' : variant === 'danger' ? 'danger' : ''}`}>{children}</span>
}
