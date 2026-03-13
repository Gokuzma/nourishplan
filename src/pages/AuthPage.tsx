import { AuthForm } from '../components/auth/AuthForm'

export function AuthPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">NourishPlan</h1>
        </div>
        <div className="bg-surface rounded-[--radius-card] p-6 shadow-sm">
          <AuthForm />
        </div>
      </div>
    </div>
  )
}
