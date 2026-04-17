import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  Send, Sparkles, BookOpen, ChevronDown, X, RotateCcw, User, Bot
} from 'lucide-react'
import { askQuestion } from '../utils/api'
import toast from 'react-hot-toast'

const SAMPLE_QUESTIONS = [
  'Which books have the most positive reviews?',
  'Recommend a mystery book with dark themes',
  'What are some books about adventure and exploration?',
  'Which books are suitable for beginners?',
  'Tell me about books with themes of love and loss',
]

export default function QnA() {
  const [searchParams] = useSearchParams()
  const prefilledBookId = searchParams.get('book_id')
  const prefilledTitle = searchParams.get('title')

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [bookFilter, setBookFilter] = useState(prefilledBookId || '')
  const bottomRef = useRef(null)

  const mutation = useMutation({
    mutationFn: askQuestion,
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer, sources: data.sources, model: data.model_used },
      ])
    },
    onError: (err) => {
      toast.error(err.userMessage || 'Failed to get answer. Is the backend running?')
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', sources: [], isError: true },
      ])
    },
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, mutation.isPending])

  const handleSend = (question = input) => {
    if (!question.trim()) return
    const q = question.trim()
    setMessages((prev) => [...prev, { role: 'user', content: q }])
    setInput('')
    mutation.mutate({ question: q, book_id: bookFilter || undefined })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-ink-100 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl text-ink-900">Ask the Library</h1>
          <p className="text-ink-500 text-xs mt-0.5">RAG-powered Q&amp;A across your book collection</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Book filter indicator */}
          {prefilledTitle && bookFilter && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-ink-100 rounded-sm text-sm">
              <BookOpen size={12} className="text-ink-500" />
              <span className="text-ink-700 text-xs font-body truncate max-w-[160px]">{prefilledTitle}</span>
              <button
                onClick={() => setBookFilter('')}
                className="text-ink-400 hover:text-ink-700 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          )}
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="btn-secondary text-xs gap-1.5"
            >
              <RotateCcw size={12} />
              Clear chat
            </button>
          )}
        </div>
      </header>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        {/* Empty / welcome state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full pb-8 animate-fade-in">
            <div className="w-14 h-14 bg-ink-100 rounded-full flex items-center justify-center mb-4">
              <Sparkles size={22} className="text-ink-500" />
            </div>
            <h2 className="font-display text-2xl text-ink-800 mb-2">What would you like to know?</h2>
            <p className="text-ink-500 text-sm text-center max-w-sm mb-8">
              Ask anything about the books in your library. I'll search through the content and provide answers with source citations.
            </p>
            {/* Sample questions */}
            <div className="flex flex-col gap-2 w-full max-w-md">
              {SAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="text-left px-4 py-2.5 border border-ink-200 rounded-sm text-sm text-ink-600 hover:bg-ink-50 hover:border-ink-300 hover:text-ink-900 transition-all font-body"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {/* Thinking indicator */}
        {mutation.isPending && (
          <div className="flex items-start gap-3 animate-fade-in">
            <div className="w-7 h-7 rounded-full bg-ink-800 flex items-center justify-center shrink-0 mt-0.5">
              <Bot size={13} className="text-parchment" />
            </div>
            <div className="card px-4 py-3">
              <div className="flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-ink-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-ink-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-ink-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-ink-400 text-xs ml-1 font-mono">Searching library…</span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-ink-100 px-8 py-4 bg-parchment/95 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  // Auto-resize
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                }}
                onKeyDown={handleKeyDown}
                placeholder={bookFilter ? `Ask about "${prefilledTitle}"…` : 'Ask about any book in the library…'}
                className="input-field resize-none overflow-hidden pr-10 min-h-[42px]"
                style={{ lineHeight: '1.5' }}
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || mutation.isPending}
              className="btn-primary p-2.5 shrink-0 disabled:opacity-40"
            >
              <Send size={15} />
            </button>
          </div>
          <p className="text-ink-400 text-[11px] font-mono mt-1.5 text-center">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }) {
  const [showSources, setShowSources] = useState(false)
  const isUser = message.role === 'user'

  return (
    <div className={`flex items-start gap-3 animate-slide-up ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
          isUser ? 'bg-ink-200' : 'bg-ink-800'
        }`}
      >
        {isUser
          ? <User size={13} className="text-ink-700" />
          : <Bot size={13} className="text-parchment" />
        }
      </div>

      {/* Bubble */}
      <div className={`max-w-2xl space-y-2 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`px-4 py-3 rounded-sm text-sm leading-relaxed ${
            isUser
              ? 'bg-ink-800 text-parchment font-body'
              : `card prose-ink ${message.isError ? 'border-red-200' : ''}`
          }`}
        >
          {message.content}
        </div>

        {/* Sources */}
        {!isUser && message.sources?.length > 0 && (
          <div className="w-full">
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-1.5 text-ink-400 hover:text-ink-700 text-[11px] font-mono transition-colors"
            >
              <BookOpen size={10} />
              {message.sources.length} source{message.sources.length > 1 ? 's' : ''}
              <ChevronDown size={10} className={`transition-transform ${showSources ? 'rotate-180' : ''}`} />
            </button>

            {showSources && (
              <div className="mt-2 space-y-2 animate-fade-in">
                {message.sources.map((src, i) => (
                  <div key={i} className="card px-3 py-2.5 border-l-2 border-ink-300">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-body text-xs font-medium text-ink-800">{src.title}</p>
                        <p className="text-ink-400 text-[10px]">{src.author}</p>
                      </div>
                      <span className="font-mono text-[10px] text-ink-400 shrink-0">
                        {(src.relevance_score * 100).toFixed(0)}% match
                      </span>
                    </div>
                    <p className="text-ink-500 text-[11px] mt-1.5 leading-relaxed italic line-clamp-2">
                      "{src.excerpt}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Model badge */}
        {!isUser && message.model && (
          <span className="text-ink-400 text-[10px] font-mono">via {message.model}</span>
        )}
      </div>
    </div>
  )
}
