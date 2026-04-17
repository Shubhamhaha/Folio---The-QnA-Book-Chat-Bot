import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, SlidersHorizontal, Download, BookOpen, RefreshCw } from 'lucide-react'
import { fetchBooks, fetchGenres } from '../utils/api'
import BookCard from '../components/BookCard'
import { BookCardSkeleton } from '../components/Skeletons'
import ScrapeModal from '../components/ScrapeModal'

export default function Dashboard() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [showScrape, setShowScrape] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const PAGE_SIZE = 20

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['books', page, search, genre],
    queryFn: () => fetchBooks({ page, page_size: PAGE_SIZE, search: search || undefined, genre: genre || undefined }),
    keepPreviousData: true,
  })

  const { data: genresData } = useQuery({
    queryKey: ['genres'],
    queryFn: fetchGenres,
  })

  const handleSearch = useCallback((e) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }, [searchInput])

  const handleGenre = (g) => {
    setGenre(g === genre ? '' : g)
    setPage(1)
  }

  const books = data?.books || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const genres = genresData?.genres || []

  return (
    <div className="min-h-screen">
      {/* Page header */}
      <header className="sticky top-0 z-20 bg-parchment/95 backdrop-blur-sm border-b border-ink-100 px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="Search titles or authors…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="input-field pl-9 pr-4"
              />
            </div>
          </form>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary ${showFilters ? 'bg-ink-100' : ''}`}
            >
              <SlidersHorizontal size={14} />
              Filters
            </button>
            <button onClick={() => refetch()} className="btn-secondary p-2.5" title="Refresh">
              <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setShowScrape(true)} className="btn-primary">
              <Download size={14} />
              Import Books
            </button>
          </div>
        </div>

        {/* Genre filter bar */}
        {showFilters && genres.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 animate-fade-in">
            <button
              onClick={() => handleGenre('')}
              className={`tag cursor-pointer hover:bg-ink-200 transition-colors ${genre === '' ? 'bg-ink-800 text-parchment' : ''}`}
            >
              All
            </button>
            {genres.map((g) => (
              <button
                key={g}
                onClick={() => handleGenre(g)}
                className={`tag cursor-pointer hover:bg-ink-200 transition-colors ${genre === g ? 'bg-ink-800 text-parchment' : ''}`}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Content */}
      <div className="px-8 py-6">
        {/* Title row */}
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl text-ink-900">
              {genre ? genre : search ? `"${search}"` : 'The Library'}
            </h2>
            {!isLoading && (
              <p className="text-ink-500 text-sm mt-0.5">
                {total} {total === 1 ? 'book' : 'books'}
                {genre && ` in ${genre}`}
                {search && ` matching "${search}"`}
              </p>
            )}
          </div>
          {total > 0 && (
            <span className="text-ink-400 text-xs font-mono">
              Page {page} / {totalPages}
            </span>
          )}
        </div>

        {/* Empty state */}
        {!isLoading && books.length === 0 && (
          <EmptyState onImport={() => setShowScrape(true)} hasSearch={!!search || !!genre} />
        )}

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {isLoading
            ? [...Array(10)].map((_, i) => <BookCardSkeleton key={i} />)
            : books.map((book) => <BookCard key={book.id} book={book} />)
          }
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary disabled:opacity-40"
            >
              Previous
            </button>
            <div className="flex gap-1">
              {[...Array(Math.min(totalPages, 7))].map((_, i) => {
                const p = i + 1
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 text-sm font-mono rounded-sm transition-colors ${
                      page === p ? 'bg-ink-800 text-parchment' : 'text-ink-600 hover:bg-ink-100'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {showScrape && <ScrapeModal onClose={() => setShowScrape(false)} />}
    </div>
  )
}

function EmptyState({ onImport, hasSearch }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 bg-ink-100 rounded-full flex items-center justify-center mb-4">
        <BookOpen size={24} className="text-ink-400" />
      </div>
      <h3 className="font-display text-xl text-ink-700 mb-2">
        {hasSearch ? 'No books found' : 'Your library is empty'}
      </h3>
      <p className="text-ink-500 text-sm max-w-xs">
        {hasSearch
          ? 'Try a different search term or clear your filters.'
          : 'Import books to get started. We\'ll scrape, analyse, and index them automatically.'}
      </p>
      {!hasSearch && (
        <button onClick={onImport} className="btn-primary mt-6">
          <Download size={14} />
          Import Books
        </button>
      )}
    </div>
  )
}
