import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Login from './Login'
import AdminDashboard from './AdminDashboard'
import EmployeeDashboard from './EmployeeDashboard'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing employee session
    const stored = localStorage.getItem('lila_user')
    if (stored) {
      setUser(JSON.parse(stored))
      setLoading(false)
      return
    }

    // Check for existing admin session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser({ role: 'admin', email: session.user.email, id: session.user.id })
      }
      setLoading(false)
    })

    // Listen for admin auth changes
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

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>
  if (!user) return <Login onLogin={handleLogin} />
  if (user.role === 'admin') return <AdminDashboard user={user} onLogout={handleLogout} />
  return <EmployeeDashboard user={user} onLogout={handleLogout} />
}