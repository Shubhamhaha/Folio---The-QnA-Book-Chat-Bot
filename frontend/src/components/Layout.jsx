import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { BookOpen, MessageSquare, LayoutDashboard, Sparkles, Github } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchStats } from '../utils/api'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Library', end: true },
  { to: '/ask', icon: MessageSquare, label: 'Ask AI' },
]

export default function Layout() {
  const location = useLocation()
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    refetchInterval: 30000,
  })

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-ink-950 text-parchment flex flex-col fixed top-0 left-0 h-screen z-30">
        {/* Logo */}
        <div className="px-6 py-7 border-b border-ink-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-ink-400 rounded-sm flex items-center justify-center">
              <BookOpen size={14} className="text-ink-950" />
            </div>
            <div>
              <h1 className="font-display text-lg leading-none tracking-wide text-parchment">Folio</h1>
              <p className="text-ink-500 text-[10px] font-mono mt-0.5 tracking-widest uppercase">Book Intelligence</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-body transition-colors duration-150 ${
                  isActive
                    ? 'bg-ink-800 text-parchment'
                    : 'text-ink-400 hover:text-parchment hover:bg-ink-900'
                }`
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Stats */}
        {stats && (
          <div className="px-4 py-4 border-t border-ink-800 space-y-2.5">
            <p className="text-ink-600 text-[10px] font-mono uppercase tracking-widest">System</p>
            <div className="space-y-1.5">
              <StatRow label="Books" value={stats.total_books} />
              <StatRow label="Genres" value={stats.total_genres} />
              <StatRow label="Chunks" value={stats.rag_chunks} />
            </div>
            <div className="pt-1">
              <div className="flex items-center gap-1.5">
                <Sparkles size={10} className="text-ink-500" />
                <p className="text-ink-600 text-[10px] font-mono truncate">{stats.llm_model}</p>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 py-3 border-t border-ink-800">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-ink-600 hover:text-ink-400 text-xs font-mono transition-colors"
          >
            <Github size={12} />
            View on GitHub
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-56 min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-500 text-[11px] font-mono">{label}</span>
      <span className="text-ink-300 text-[11px] font-mono tabular-nums">{value ?? '—'}</span>
    </div>
  )
}
