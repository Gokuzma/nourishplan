import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 font-sans">
      <div className="text-center">
        <p className="text-7xl font-bold text-primary mb-4">404</p>
        <h1 className="text-2xl font-semibold text-text mb-2">Page not found</h1>
        <p className="text-text/60 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-block bg-primary text-white font-medium px-6 py-2.5 rounded-full hover:bg-primary/90 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
