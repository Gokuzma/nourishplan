interface PortionStepperProps {
  value: number
  onChange: (v: number) => void
  min?: number
  step?: number
}

const PRESETS = [0.5, 1.0, 1.5, 2.0]

export function PortionStepper({ value, onChange, min = 0.25, step = 0.25 }: PortionStepperProps) {
  function decrement() {
    const next = Math.max(min, parseFloat((value - step).toFixed(4)))
    onChange(next)
  }

  function increment() {
    const next = parseFloat((value + step).toFixed(4))
    onChange(next)
  }

  function handleManualInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = parseFloat(e.target.value)
    if (!isNaN(raw) && raw >= min) {
      onChange(raw)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Stepper row */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={decrement}
          disabled={value <= min}
          className="w-9 h-9 rounded-[--radius-btn] border border-secondary bg-surface text-text/70 hover:bg-secondary/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg font-semibold"
          aria-label="Decrease serving"
        >
          -
        </button>
        <span className="flex-1 text-center text-base font-semibold text-text tabular-nums">
          {value % 1 === 0 ? value.toFixed(0) : value}
        </span>
        <button
          type="button"
          onClick={increment}
          className="w-9 h-9 rounded-[--radius-btn] border border-secondary bg-surface text-text/70 hover:bg-secondary/30 transition-colors text-lg font-semibold"
          aria-label="Increase serving"
        >
          +
        </button>
      </div>

      {/* Preset buttons */}
      <div className="flex gap-2">
        {PRESETS.map(preset => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className={`flex-1 rounded-[--radius-btn] py-1.5 text-sm font-medium transition-colors border ${
              value === preset
                ? 'bg-primary text-white border-primary'
                : 'border-secondary bg-surface text-text/60 hover:bg-secondary/30 hover:text-text'
            }`}
          >
            {preset % 1 === 0 ? preset.toFixed(0) : preset}
          </button>
        ))}
      </div>

      {/* Manual input */}
      <input
        type="number"
        value={value}
        onChange={handleManualInput}
        min={min}
        step={step}
        className="w-full rounded-[--radius-btn] border border-accent/30 bg-surface px-3 py-1.5 text-sm text-text text-center placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
        aria-label="Manual serving input"
      />
    </div>
  )
}
