import { useState } from 'react'

interface ManualAddItemInputProps {
  onAdd: (name: string) => void
}

export function ManualAddItemInput({ onAdd }: ManualAddItemInputProps) {
  const [value, setValue] = useState('')

  function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setValue('')
  }

  return (
    <div className="flex gap-2 px-3 py-3">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') handleSubmit()
        }}
        placeholder="Add an item..."
        className="flex-1 border border-secondary rounded-[--radius-btn] px-3 py-2 text-sm bg-surface text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <button
        type="button"
        onClick={handleSubmit}
        className="bg-primary text-white text-sm px-4 py-2 rounded-[--radius-btn] min-h-[44px] hover:opacity-90 transition-opacity"
      >
        Add
      </button>
    </div>
  )
}
