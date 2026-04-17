import { Link } from 'react-router-dom'
import { Star, ExternalLink } from 'lucide-react'

function StarRating({ rating }) {
  const full = Math.floor(rating || 0)
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={11}
          className={i <= full ? 'text-amber-500 fill-amber-500' : 'text-ink-200 fill-ink-200'}
        />
      ))}
      <span className="text-ink-500 text-[11px] font-mono ml-0.5">{rating?.toFixed(1)}</span>
    </div>
  )
}

export default function BookCard({ book }) {
  const insights = book.ai_insights || {}

  return (
    <Link
      to={`/books/${book.id}`}
      className="group card p-0 overflow-hidden hover:shadow-md hover:border-ink-200 transition-all duration-200 flex flex-col"
    >
      {/* Cover */}
      <div className="relative h-48 bg-ink-100 overflow-hidden">
        {book.cover_image ? (
          <img
            src={book.cover_image}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { e.target.style.display = 'none' }}
          />
        ) : (
          <CoverPlaceholder title={book.title} />
        )}
        {/* Genre tag overlay */}
        {book.genre && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-0.5 bg-ink-950/80 text-parchment text-[10px] font-mono rounded-sm backdrop-blur-sm">
              {book.genre}
            </span>
          </div>
        )}
        {/* Sentiment indicator */}
        {insights.sentiment && (
          <div className="absolute top-2 right-2">
            <SentimentDot sentiment={insights.sentiment} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-display text-sm font-semibold text-ink-900 leading-snug line-clamp-2 group-hover:text-ink-700 transition-colors">
          {book.title}
        </h3>
        <p className="text-ink-500 text-xs font-body mt-1 font-light">{book.author}</p>

        {book.rating && (
          <div className="mt-2">
            <StarRating rating={book.rating} />
          </div>
        )}

        {insights.summary && (
          <p className="text-ink-600 text-[11px] font-body mt-2.5 line-clamp-2 leading-relaxed flex-1">
            {insights.summary}
          </p>
        )}

        {insights.key_themes?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {insights.key_themes.slice(0, 2).map((t) => (
              <span key={t} className="tag">{t}</span>
            ))}
          </div>
        )}

        {book.price && (
          <div className="mt-3 pt-3 border-t border-ink-100 flex items-center justify-between">
            <span className="font-mono text-xs text-ink-700 font-medium">{book.price}</span>
            {book.book_url && (
              <ExternalLink size={11} className="text-ink-400" />
            )}
          </div>
        )}
      </div>
    </Link>
  )
}

function CoverPlaceholder({ title }) {
  const colors = [
    'from-ink-700 to-ink-900',
    'from-sage to-ink-700',
    'from-ink-600 to-ink-800',
    'from-amber-800 to-ink-800',
  ]
  const idx = (title?.charCodeAt(0) || 0) % colors.length
  return (
    <div className={`w-full h-full bg-gradient-to-br ${colors[idx]} flex items-center justify-center p-4`}>
      <p className="font-display text-parchment/80 text-sm text-center leading-snug line-clamp-4">{title}</p>
    </div>
  )
}

function SentimentDot({ sentiment }) {
  const map = {
    Positive: 'bg-green-400',
    Neutral: 'bg-blue-400',
    Mixed: 'bg-amber-400',
    'Dark/Negative': 'bg-red-400',
  }
  const color = map[sentiment] || 'bg-ink-400'
  return (
    <div className={`w-2 h-2 rounded-full ${color} ring-2 ring-white/60`} title={`Tone: ${sentiment}`} />
  )
}
