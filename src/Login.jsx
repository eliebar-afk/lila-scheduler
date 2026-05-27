import { useState } from 'react'
import { supabase } from './supabase'
import heroImg from './assets/hero.png'

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

  const btnPrimary = {
    width: '100%',
    background: 'linear-gradient(135deg, #44ab51 0%, #37944a 100%)',
    color: 'white',
    padding: '13px',
    fontSize: 15,
    fontWeight: 700,
    borderRadius: 12,
    boxShadow: '0 4px 16px rgba(68, 171, 81, 0.4)',
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(160deg, #f1f4f8 0%, #e4f0e6 100%)',
      padding: 20,
    }}>
      <div style={{
        background: 'white',
        borderRadius: 22,
        padding: '40px 36px',
        width: '100%',
        maxWidth: 380,
        boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 20px 56px rgba(0,0,0,0.11)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
          <img src={heroImg} alt="Lila" style={{ width: 48, height: 48, objectFit: 'contain' }} />
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px', lineHeight: 1.1 }}>Lila</h1>
            <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 2 }}>Staff Scheduler</p>
          </div>
        </div>

        {/* Mode toggle */}
        <div style={{
          display: 'flex',
          background: '#f1f4f8',
          borderRadius: 12,
          padding: 4,
          marginBottom: 28,
          gap: 4,
        }}>
          {['employee', 'admin'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }} style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: 9,
              background: mode === m ? 'white' : 'transparent',
              color: mode === m ? '#111827' : '#9ca3af',
              fontWeight: 600,
              fontSize: 13,
              boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s',
            }}>
              {m === 'employee' ? '👤 Employee' : '🔐 Admin'}
            </button>
          ))}
        </div>

        {mode === 'employee' ? (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Your Name</label>
              <input placeholder="e.g. Sara" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>PIN Code</label>
              <input placeholder="4-digit PIN" type="password" maxLength={4} value={pin}
                onChange={e => setPin(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleEmployeeLogin()} />
            </div>
            {error && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 16, fontWeight: 500 }}>{error}</p>}
            <button onClick={handleEmployeeLogin} disabled={loading} style={btnPrimary}>
              {loading ? 'Logging in…' : 'Log In'}
            </button>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Email</label>
              <input placeholder="admin@restaurant.com" type="email" value={email}
                onChange={e => setEmail(e.target.value)} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Password</label>
              <input placeholder="Your password" type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdminLogin()} />
            </div>
            {error && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 16, fontWeight: 500 }}>{error}</p>}
            <button onClick={handleAdminLogin} disabled={loading} style={btnPrimary}>
              {loading ? 'Logging in…' : 'Log In as Admin'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
