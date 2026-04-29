import { useState } from 'react'
import { supabase } from './supabase'

export default function Login({ onLogin }) {
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError('')
    setLoading(true)
  const { data, error } = await supabase
  .from('employees')
  .select('*')
  .eq('name', name.trim())
  .eq('pin', pin.trim())
  .single()

console.log('Login result:', data, 'Error:', error)
setLoading(false)
if (error || !data) {
  setError('Name or PIN is incorrect.')
  return
}
    onLogin(data)
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
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#e8723a', marginBottom: 4 }}>🍽 Lila</h1>
        <p style={{ color: '#888', marginBottom: 32 }}>Staff Scheduler</p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Your Name</label>
          <input
            placeholder="e.g. Sara"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>PIN Code</label>
          <input
            placeholder="4-digit PIN"
            type="password"
            maxLength={4}
            value={pin}
            onChange={e => setPin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>

        {error && <p style={{ color: 'red', fontSize: 13, marginBottom: 16 }}>{error}</p>}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width: '100%', background: '#e8723a', color: 'white', padding: '12px', fontSize: 16 }}
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </div>
    </div>
  )
}