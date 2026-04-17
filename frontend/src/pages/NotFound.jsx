import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-center">
      <BookOpen size={40} className="text-ink-300 mb-4" />
      <h1 className="font-display text-4xl text-ink-800 mb-2">404</h1>
      <p className="text-ink-500 text-sm mb-6">This page seems to be missing from the shelf.</p>
      <Link to="/" className="btn-primary">Return to Library</Link>
    </div>
  )
}
