import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import BookDetail from './pages/BookDetail'
import QnA from './pages/QnA'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="books/:id" element={<BookDetail />} />
        <Route path="ask" element={<QnA />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
