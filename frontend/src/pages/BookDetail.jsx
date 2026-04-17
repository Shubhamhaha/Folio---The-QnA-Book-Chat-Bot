import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, Star, ExternalLink, Tag, Brain, Smile, Layers,
  BookOpen, MessageSquare, Sparkles
} from 'lucide-react'
import { fetchBook, fetchRecommendations } from '../utils/api'
import { DetailSkeleton } from '../components/Skeletons'

export default function BookDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: book, isLoading, error } = useQuery({
    queryKey: ['book', id],
    queryFn: () => fetchBook(id),
  })

  const { data: recommendations, isLoading: recLoading } = useQuery({
    queryKey: ['recommendations', id],
    queryFn: () => fetchRecommendations(id, 4),
    enabled: !!id,
  })

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-ink-500">Book not found.</p>
          <button onClick={() => navigate('/')} className="btn-secondary mt-4">Back to Library</button>
        </div>
      </div>
    )
  }

  const insights = book?.ai_insights || {}

  return (
    <div className="min-h-screen">
      {/* Top nav */}
      <div className="sticky top-0 z-10 bg-parchment/95 backdrop-blur-sm border-b border-ink-100 px-8 py-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-ink-500 hover:text-ink-900 text-sm font-body transition-colors"
        >
          <ArrowLeft size={14} />
          Back
        </button>
      </div>

      <div className="px-8 py-8 max-w-5xl mx-auto">
        {isLoading ? (
          <DetailSkeleton />
        ) : book ? (
          <>
            {/* Hero section */}
            <div className="flex gap-8 mb-10">
              {/* Cover */}
              <div className="shrink-0 w-40 h-56 rounded-sm overflow-hidden shadow-lg border border-ink-100">
                {book.cover_image ? (
                  <img
                    src={book.cover_image}
                    alt={book.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-ink-700 to-ink-900 flex items-center justify-center p-3">
                    <p className="font-display text-parchment/80 text-xs text-center leading-snug">{book.title}</p>
                  </div>
                )}
              </div>

              {/* Meta */}
              <div className="flex-1 space-y-3">
                <div>
                  <h1 className="font-display text-3xl text-ink-900 leading-tight">{book.title}</h1>
                  <p className="text-ink-500 font-body mt-1">by <span className="text-ink-700">{book.author}</span></p>
                </div>

                {book.rating && (
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        size={14}
                        className={i <= Math.floor(book.rating) ? 'text-amber-500 fill-amber-500' : 'text-ink-200 fill-ink-200'}
                      />
                    ))}
                    <span className="font-mono text-sm text-ink-600">{book.rating.toFixed(1)} / 5</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {book.genre && (
                    <span className="tag">
                      <Tag size={9} className="mr-1" />
                      {book.genre}
                    </span>
                  )}
                  {insights.genre_classification && insights.genre_classification !== book.genre && (
                    <span className="tag bg-sage/20 text-ink-700">
                      <Brain size={9} className="mr-1" />
                      {insights.genre_classification}
                    </span>
                  )}
                  {insights.sentiment && (
                    <span className={`tag ${sentimentStyle(insights.sentiment)}`}>
                      <Smile size={9} className="mr-1" />
                      {insights.sentiment}
                    </span>
                  )}
                  {book.price && (
                    <span className="tag bg-amber-50 text-amber-800">{book.price}</span>
                  )}
                </div>

                {book.book_url && (
                  <a
                    href={book.book_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-ink-500 hover:text-ink-800 text-xs font-mono transition-colors"
                  >
                    <ExternalLink size={11} />
                    View on source site
                  </a>
                )}

                {/* Ask about this book */}
                <Link
                  to={`/ask?book_id=${id}&title=${encodeURIComponent(book.title)}`}
                  className="btn-primary mt-2 inline-flex"
                >
                  <MessageSquare size={13} />
                  Ask AI about this book
                </Link>
              </div>
            </div>

            {/* Two-column layout: description + insights */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-10">
              {/* Description */}
              <div className="lg:col-span-3 space-y-4">
                {book.description && (
                  <Section title="Description" icon={<BookOpen size={13} />}>
                    <p className="text-ink-700 text-sm leading-7">{book.description}</p>
                  </Section>
                )}
              </div>

              {/* AI Insights panel */}
              <div className="lg:col-span-2 space-y-4">
                <div className="card p-4 space-y-4">
                  <div className="flex items-center gap-2 border-b border-ink-100 pb-3">
                    <Sparkles size={13} className="text-ink-500" />
                    <h2 className="font-display text-sm text-ink-900">AI Insights</h2>
                  </div>

                  {insights.summary ? (
                    <InsightItem title="Summary">
                      <p className="text-ink-600 text-xs leading-relaxed">{insights.summary}</p>
                    </InsightItem>
                  ) : null}

                  {insights.key_themes?.length > 0 && (
                    <InsightItem title="Key Themes">
                      <div className="flex flex-wrap gap-1.5">
                        {insights.key_themes.map((t) => (
                          <span key={t} className="tag">{t}</span>
                        ))}
                      </div>
                    </InsightItem>
                  )}

                  {typeof insights.sentiment_score === 'number' && (
                    <InsightItem title="Sentiment Score">
                      <SentimentBar score={insights.sentiment_score} />
                    </InsightItem>
                  )}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <Section title="You might also like" icon={<Layers size={13} />}>
              {recLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-28 skeleton rounded-sm" />
                  ))}
                </div>
              ) : recommendations?.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {recommendations.map((rec) => (
                    <RecCard key={rec.book_id} rec={rec} />
                  ))}
                </div>
              ) : (
                <p className="text-ink-500 text-sm">
                  No recommendations yet. Make sure embeddings are generated.
                </p>
              )}
            </Section>
          </>
        ) : null}
      </div>
    </div>
  )
}

function Section({ title, icon, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-ink-400">{icon}</span>
        <h2 className="font-display text-base text-ink-900">{title}</h2>
        <div className="flex-1 h-px bg-ink-100" />
      </div>
      {children}
    </div>
  )
}

function InsightItem({ title, children }) {
  return (
    <div className="space-y-1.5">
      <p className="text-ink-400 text-[10px] font-mono uppercase tracking-widest">{title}</p>
      {children}
    </div>
  )
}

function SentimentBar({ score }) {
  const pct = ((score + 1) / 2) * 100
  const color = score > 0.3 ? 'bg-green-400' : score < -0.3 ? 'bg-red-400' : 'bg-amber-400'
  return (
    <div className="space-y-1">
      <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-ink-500 text-[10px] font-mono">{score.toFixed(2)} ({score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral'} tone)</p>
    </div>
  )
}

function RecCard({ rec }) {
  return (
    <Link to={`/books/${rec.book_id}`} className="group card p-3 hover:border-ink-200 hover:shadow-sm transition-all">
      {rec.cover_image && (
        <div className="h-20 rounded-sm overflow-hidden mb-2">
          <img
            src={rec.cover_image}
            alt={rec.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            onError={(e) => { e.target.style.display = 'none' }}
          />
        </div>
      )}
      <p className="font-display text-xs text-ink-900 leading-snug line-clamp-2">{rec.title}</p>
      <p className="text-ink-400 text-[10px] mt-0.5 line-clamp-1">{rec.author}</p>
      <p className="text-ink-500 text-[10px] mt-1.5 line-clamp-2 italic leading-relaxed">{rec.reason}</p>
    </Link>
  )
}

function sentimentStyle(sentiment) {
  const map = {
    Positive: 'bg-green-50 text-green-800',
    Neutral: 'bg-blue-50 text-blue-800',
    Mixed: 'bg-amber-50 text-amber-800',
    'Dark/Negative': 'bg-red-50 text-red-800',
  }
  return map[sentiment] || ''
}
