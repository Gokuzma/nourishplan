export function HomePage() {
  return (
    <div className="min-h-screen bg-background px-4 py-8 font-sans">
      <h1 className="text-2xl font-bold text-primary mb-6">Welcome to NourishPlan</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="bg-surface rounded-[--radius-card] p-5 border border-secondary shadow-sm">
          <h2 className="font-semibold text-text mb-1">Meal Plans</h2>
          <p className="text-sm text-text/60">Coming Soon</p>
        </div>
        <div className="bg-surface rounded-[--radius-card] p-5 border border-secondary shadow-sm">
          <h2 className="font-semibold text-text mb-1">Quick Invite</h2>
          <p className="text-sm text-text/60">Coming Soon</p>
        </div>
      </div>
    </div>
  )
}
