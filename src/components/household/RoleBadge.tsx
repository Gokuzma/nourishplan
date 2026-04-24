export function RoleBadge({ role }: { role: 'admin' | 'member' }) {
  const isAdmin = role === 'admin'
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        isAdmin
          ? 'bg-primary/20 text-primary'
          : 'bg-secondary text-text/60'
      }`}
    >
      {isAdmin ? 'Admin' : 'Member'}
    </span>
  )
}
