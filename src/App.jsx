import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Login from './Login'
import AdminDashboard from './AdminDashboard'
import EmployeeDashboard from './EmployeeDashboard'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('lila_user')
    if (stored) setUser(JSON.parse(stored))
    setLoading(false)
  }, [])

  const handleLogin = (userData) => {
    localStorage.setItem('lila_user', JSON.stringify(userData))
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem('lila_user')
    setUser(null)
  }

  if (loading) return <div style={{padding:40}}>Loading...</div>
  if (!user) return <Login onLogin={handleLogin} />
  if (user.role === 'admin') return <AdminDashboard user={user} onLogout={handleLogout} />
  return <EmployeeDashboard user={user} onLogout={handleLogout} />
}