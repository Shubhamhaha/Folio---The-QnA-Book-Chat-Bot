import { useState } from 'react'
import { X, Download, Loader2, ChevronDown } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { triggerScrape } from '../utils/api'
import toast from 'react-hot-toast'

export default function ScrapeModal({ onClose }) {
  const [pages, setPages] = useState(2)
  const [genre, setGenre] = useState('')
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: triggerScrape,
    onSuccess: (data) => {
      toast.success(`${data.books_added} new books added to your library!`)
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      onClose()
    },
    onError: (err) => {
      toast.error(err.userMessage || 'Scraping failed. Is the backend running?')
    },
  })

  const handleSubmit = () => {
    mutation.mutate({
      url: 'https://books.toscrape.com',
      max_pages: pages,
      genre_filter: genre || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-parchment border border-ink-200 rounded-sm shadow-xl w-full max-w-md mx-4 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
          <div>
            <h2 className="font-display text-lg text-ink-900">Import Books</h2>
            <p className="text-ink-500 text-xs mt-0.5">Scrape from books.toscrape.com</p>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Pages */}
          <div>
            <label className="block text-sm font-body font-medium text-ink-700 mb-1.5">
              Pages per category
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={5}
                value={pages}
                onChange={(e) => setPages(Number(e.target.value))}
                className="flex-1 accent-ink-700"
              />
              <span className="font-mono text-sm text-ink-700 w-6 text-center">{pages}</span>
            </div>
            <p className="text-ink-400 text-xs mt-1">
              ~{pages * 20} books across 5 categories
            </p>
          </div>

          {/* Genre filter */}
          <div>
            <label className="block text-sm font-body font-medium text-ink-700 mb-1.5">
              Genre filter <span className="text-ink-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Mystery, Romance, Science…"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Info box */}
          <div className="bg-ink-50 border border-ink-200 rounded-sm p-3">
            <p className="text-ink-600 text-xs leading-relaxed">
              AI insights (summary, genre classification, sentiment) will be generated
              for each book automatically. Embeddings are stored in background.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-ink-100 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="btn-primary min-w-[120px] justify-center"
          >
            {mutation.isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Scraping…
              </>
            ) : (
              <>
                <Download size={14} />
                Start Import
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
