import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Login from './Login'
import AdminDashboard from './AdminDashboard'
import EmployeeDashboard from './EmployeeDashboard'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('lila_dark') === 'true')

  const toggleDarkMode = () => {
    setDarkMode(d => {
      const next = !d
      localStorage.setItem('lila_dark', String(next))
      return next
    })
  }

  useEffect(() => {
    document.body.style.background = darkMode ? '#0f172a' : ''
  }, [darkMode])

  useEffect(() => {
    const stored = localStorage.getItem('lila_user')
    if (stored) {
      setUser(JSON.parse(stored))
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser({ role: 'admin', email: session.user.email, id: session.user.id })
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !localStorage.getItem('lila_user')) {
        setUser({ role: 'admin', email: session.user.email, id: session.user.id })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = (userData) => {
    if (userData.role === 'employee') {
      localStorage.setItem('lila_user', JSON.stringify(userData))
    }
    setUser(userData)
  }

  const handleLogout = async () => {
    localStorage.removeItem('lila_user')
    await supabase.auth.signOut()
    setUser(null)
  }

  const cssVars = {
    '--bg':           darkMode ? '#0f172a'              : '#f1f4f8',
    '--card':         darkMode ? '#1e293b'              : 'white',
    '--raised':       darkMode ? '#293548'              : '#f8f9fa',
    '--input':        darkMode ? '#162032'              : 'white',
    '--border':       darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    '--border-soft':  darkMode ? '#334155'              : '#e5e9f0',
    '--border-table': darkMode ? '#2d3f53'              : '#f3f4f6',
    '--text':         darkMode ? '#f1f5f9'              : '#111827',
    '--text2':        darkMode ? '#cbd5e1'              : '#374151',
    '--text3':        darkMode ? '#94a3b8'              : '#6b7280',
    '--text4':        darkMode ? '#64748b'              : '#9ca3af',
  }

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>

  return (
    <div style={{ ...cssVars, minHeight: '100vh' }}>
      {!user && <Login onLogin={handleLogin} />}
      {user?.role === 'admin' && (
        <AdminDashboard user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      )}
      {user && user.role !== 'admin' && (
        <EmployeeDashboard user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      )}
    </div>
  )
}
