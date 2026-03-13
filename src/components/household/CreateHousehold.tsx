import { useState } from 'react'
import { useCreateHousehold } from '../../hooks/useHousehold'

interface CreateHouseholdProps {
  onSuccess?: () => void
}

export function CreateHousehold({ onSuccess }: CreateHouseholdProps) {
  const [name, setName] = useState('')
  const createHousehold = useCreateHousehold()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    createHousehold.mutate(trimmed, {
      onSuccess: () => {
        onSuccess?.()
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="household-name" className="text-sm font-semibold text-text">
          Household name
        </label>
        <input
          id="household-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. The Johnson Family"
          required
          className="rounded-btn border border-accent/40 bg-surface px-3 py-2 text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {createHousehold.error && (
        <p className="text-sm text-red-500">
          {createHousehold.error instanceof Error
            ? createHousehold.error.message
            : 'Failed to create household. Please try again.'}
        </p>
      )}

      <button
        type="submit"
        disabled={createHousehold.isPending || !name.trim()}
        className="rounded-btn bg-primary px-4 py-2 font-semibold text-surface transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {createHousehold.isPending ? 'Creating…' : 'Create Household'}
      </button>
    </form>
  )
}
