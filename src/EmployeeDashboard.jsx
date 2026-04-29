import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const HOURS = ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00']

export default function EmployeeDashboard({ user, onLogout }) {
  const [preferences, setPreferences] = useState({})
  const [schedule, setSchedule] = useState([])
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: prefData } = await supabase
      .from('preferences')
      .select('*')
      .eq('employee_id', user.id)

    if (prefData) {
      const map = {}
      prefData.forEach(p => { map[p.day] = { available: p.available, start: p.start_time, end: p.end_time } })
      setPreferences(map)
    }

    const { data: schedData } = await supabase
      .from('shifts')
      .select('*')
      .eq('employee_id', user.id)

    if (schedData) setSchedule(schedData)
    setLoading(false)
  }

  const toggleDay = (day) => {
    setPreferences(prev => ({
      ...prev,
      [day]: prev[day] ? undefined : { available: true, start: '11:00', end: '17:00' }
    }))
  }

  const updateTime = (day, field, value) => {
    setPreferences(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }))
  }

  const savePreferences = async () => {
    await supabase.from('preferences').delete().eq('employee_id', user.id)
    const rows = Object.entries(preferences)
      .filter(([_, v]) => v)
      .map(([day, v]) => ({
        employee_id: user.id,
        day,
        available: true,
        start_time: v.start,
        end_time: v.end
      }))
    if (rows.length > 0) await supabase.from('preferences').insert(rows)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
      <div style={{ background: '#e8723a', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'white', fontSize: 20, fontWeight: 800 }}>🍽 Lila</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>Hi, {user.name}!</p>
        </div>
        <button onClick={onLogout} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 13 }}>Logout</button>
      </div>

      <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>

        {/* My Schedule */}
        <div style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📅 My Schedule This Week</h2>
          {schedule.length === 0 ? (
            <p style={{ color: '#888', fontSize: 14 }}>No shifts scheduled yet.</p>
          ) : (
            schedule.map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ fontWeight: 600 }}>{s.day}</span>
                <span style={{ color: '#e8723a', fontWeight: 600 }}>{s.start_time} – {s.end_time}</span>
              </div>
            ))
          )}
        </div>

        {/* Preferences */}
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>✏️ My Availability This Week</h2>
          <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>Tap the days you can work and set your preferred hours.</p>

          {DAYS.map(day => (
            <div key={day} style={{ marginBottom: 12 }}>
              <div
                onClick={() => toggleDay(day)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                  padding: '10px 14px', borderRadius: 8,
                  background: preferences[day] ? '#fff4ef' : '#f9f9f9',
                  border: `2px solid ${preferences[day] ? '#e8723a' : '#eee'}`
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 6,
                  background: preferences[day] ? '#e8723a' : '#ddd',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {preferences[day] && <span style={{ color: 'white', fontSize: 12 }}>✓</span>}
                </div>
                <span style={{ fontWeight: 600 }}>{day}</span>
              </div>

              {preferences[day] && (
                <div style={{ display: 'flex', gap: 12, padding: '8px 14px', background: '#fff4ef', borderRadius: '0 0 8px 8px', marginTop: -4 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>From</label>
                    <select
                      value={preferences[day].start}
                      onChange={e => updateTime(day, 'start', e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
                    >
                      {HOURS.map(h => <option key={h}>{h}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>To</label>
                    <select
                      value={preferences[day].end}
                      onChange={e => updateTime(day, 'end', e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
                    >
                      {HOURS.map(h => <option key={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={savePreferences}
            style={{ width: '100%', background: '#e8723a', color: 'white', padding: 14, fontSize: 15, marginTop: 8 }}
          >
            {saved ? '✓ Saved!' : 'Save Availability'}
          </button>
        </div>
      </div>
    </div>
  )
}