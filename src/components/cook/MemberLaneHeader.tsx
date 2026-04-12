import { useState } from 'react'
import { useHouseholdMembers } from '../../hooks/useHousehold'

interface MemberLaneHeaderProps {
  memberId: string
  memberName: string
  avatarUrl: string | null
  stepsCompleted: number
  stepsTotal: number
  onSwapOwner: (newMemberId: string) => void
}

export function MemberLaneHeader({
  memberId,
  memberName,
  avatarUrl,
  stepsCompleted,
  stepsTotal,
  onSwapOwner,
}: MemberLaneHeaderProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const { data: members } = useHouseholdMembers()

  const initials = memberName
    ? memberName.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase()).slice(0, 2).join('')
    : '?'

  function handleSwapSelect(newMemberId: string) {
    setPickerOpen(false)
    if (newMemberId !== memberId) {
      onSwapOwner(newMemberId)
    }
  }

  return (
    <div className="sticky top-[52px] bg-background/95 backdrop-blur-sm px-4 py-2 z-30 flex items-center gap-2 border-b border-accent/20">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={memberName}
          className="w-6 h-6 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
          {initials}
        </div>
      )}

      <span className="text-xs font-semibold uppercase tracking-wide text-text/60 flex-1">
        {memberName}
      </span>

      <span className="text-xs text-text/50 font-sans">
        {stepsCompleted} of {stepsTotal} done
      </span>

      <div className="relative">
        <button
          onClick={() => setPickerOpen(p => !p)}
          className="text-xs text-primary underline"
        >
          Swap owner
        </button>

        {pickerOpen && members && members.length > 0 && (
          <div className="absolute right-0 top-full mt-1 bg-surface border border-accent/20 rounded-[--radius-card] shadow-lg z-40 min-w-[140px] py-1">
            {members.map(m => {
              const name = m.profiles?.display_name ?? 'Member'
              return (
                <button
                  key={m.user_id}
                  onClick={() => handleSwapSelect(m.user_id)}
                  className={`w-full text-left px-3 py-2 text-xs font-sans hover:bg-secondary/60 transition-colors${m.user_id === memberId ? ' text-primary font-semibold' : ' text-text'}`}
                >
                  {name}
                  {m.user_id === memberId && <span className="ml-1 text-text/40">(current)</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
