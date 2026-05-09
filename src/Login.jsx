import { useState } from 'react'
import { supabase } from './supabase'

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('employee')
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEmployeeLogin = async () => {
    setError('')
    setLoading(true)
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('name', name.trim())
      .eq('pin', pin.trim())
      .in('role', ['employee', 'extra'])
      .single()

    setLoading(false)
    if (error || !data) {
      setError('Name or PIN is incorrect.')
      return
    }
    onLogin(data)
  }

  const handleAdminLogin = async () => {
    setError('')
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    })

    setLoading(false)
    if (error || !data.user) {
      setError('Invalid email or password.')
      return
    }
    onLogin({ role: 'admin', email: data.user.email, id: data.user.id })
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f5f5f5'
    }}>
      <div style={{
        background: 'white', borderRadius: 16, padding: 40,
        width: '100%', maxWidth: 360, boxShadow: '0 4px 24px rgba(0,0,0,0.08)'
      }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#44ab51', marginBottom: 4 }}>🍽 Lila</h1>
        <p style={{ color: '#888', marginBottom: 24 }}>Staff Scheduler</p>

        {/* Toggle */}
        <div style={{ display: 'flex', background: '#f5f5f5', borderRadius: 10, padding: 4, marginBottom: 24 }}>
          {['employee', 'admin'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }} style={{
              flex: 1, padding: 10, borderRadius: 8,
              background: mode === m ? '#44ab51' : 'transparent',
              color: mode === m ? 'white' : '#888',
              fontWeight: 600, fontSize: 14
            }}>
              {m === 'employee' ? '👤 Employee' : '🔐 Admin'}
            </button>
          ))}
        </div>

        {mode === 'employee' ? (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Your Name</label>
              <input placeholder="e.g. Sara" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>PIN Code</label>
              <input placeholder="4-digit PIN" type="password" maxLength={4} value={pin}
                onChange={e => setPin(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleEmployeeLogin()} />
            </div>
            {error && <p style={{ color: 'red', fontSize: 13, marginBottom: 16 }}>{error}</p>}
            <button onClick={handleEmployeeLogin} disabled={loading}
              style={{ width: '100%', background: '#44ab51', color: 'white', padding: '12px', fontSize: 16 }}>
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Email</label>
              <input placeholder="admin@restaurant.com" type="email" value={email}
                onChange={e => setEmail(e.target.value)} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Password</label>
              <input placeholder="Your password" type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdminLogin()} />
            </div>
            {error && <p style={{ color: 'red', fontSize: 13, marginBottom: 16 }}>{error}</p>}
            <button onClick={handleAdminLogin} disabled={loading}
              style={{ width: '100%', background: '#44ab51', color: 'white', padding: '12px', fontSize: 16 }}>
              {loading ? 'Logging in...' : 'Log In as Admin'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}