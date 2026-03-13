import { useHouseholdMembers, useMemberProfiles } from '../../hooks/useHousehold'
import { useAuth } from '../../hooks/useAuth'
import { useHousehold } from '../../hooks/useHousehold'

interface MemberSelectorProps {
  selectedMemberId: string
  onSelect: (id: string, type: 'user' | 'profile') => void
}

/**
 * Dropdown for selecting which household member's targets to view.
 * Includes auth users (from household_members) and managed profiles (from member_profiles).
 */
export function MemberSelector({ selectedMemberId, onSelect }: MemberSelectorProps) {
  const { session } = useAuth()
  const { data: membership } = useHousehold()
  const { data: members } = useHouseholdMembers()
  const { data: profiles } = useMemberProfiles()

  const options: { id: string; type: 'user' | 'profile'; label: string }[] = []

  if (members) {
    for (const m of members) {
      const name = m.profiles?.display_name ?? 'Unknown Member'
      const label = m.user_id === session?.user.id ? `${name} (you)` : name
      options.push({ id: m.user_id, type: 'user', label })
    }
  }

  if (profiles) {
    for (const p of profiles) {
      options.push({ id: p.id, type: 'profile', label: p.name })
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const [id, type] = e.target.value.split('|')
    onSelect(id, type as 'user' | 'profile')
  }

  const value = `${selectedMemberId}|${options.find(o => o.id === selectedMemberId)?.type ?? 'user'}`

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-text/60 font-sans shrink-0">Targets for:</label>
      <select
        value={value}
        onChange={handleChange}
        className="rounded-[--radius-btn] border border-accent/30 bg-surface px-3 py-1.5 text-sm text-text font-sans focus:outline-none focus:border-primary"
      >
        {options.map(opt => (
          <option key={`${opt.id}|${opt.type}`} value={`${opt.id}|${opt.type}`}>
            {opt.label}
          </option>
        ))}
        {options.length === 0 && (
          <option value={`${session?.user.id ?? ''}|user`}>Me</option>
        )}
      </select>
    </div>
  )
}
