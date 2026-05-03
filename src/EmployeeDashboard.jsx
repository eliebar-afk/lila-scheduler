import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const HOURS = ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00']
const HOURS_LATE = ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00', '01:00', '02:00']

// 🔧 Replace this with your restaurant's public IP later
const RESTAURANT_IP = '31.187.153.185'

export default function EmployeeDashboard({ user, onLogout }) {
  const [preferences, setPreferences] = useState({})
  const [schedule, setSchedule] = useState([])
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userIp, setUserIp] = useState('')
  const [attendance, setAttendance] = useState(null)
  const [checkLoading, setCheckLoading] = useState(false)
  const [tab, setTab] = useState('schedule')

  useEffect(() => {
    fetchData()
    fetchIp()
  }, [])

  const fetchIp = async () => {
    try {
      const res = await fetch('https://api.ipify.org?format=json')
      const data = await res.json()
      setUserIp(data.ip)
    } catch (e) {
      setUserIp('')
    }
  }

  const fetchData = async () => {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]

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

    const { data: attData } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', user.id)
      .eq('date', today)
      .single()

    if (attData) setAttendance(attData)
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

  const handleCheckIn = async () => {
    if (userIp !== RESTAURANT_IP && RESTAURANT_IP !== 'PLACEHOLDER') {
      alert('You must be connected to the restaurant WiFi to check in.')
      return
    }
    setCheckLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toTimeString().slice(0, 5)

    const { data } = await supabase
      .from('attendance')
      .insert({ employee_id: user.id, date: today, check_in: now })
      .select()
      .single()

    if (data) setAttendance(data)
    setCheckLoading(false)
  }

  const handleCheckOut = async () => {
    if (userIp !== RESTAURANT_IP && RESTAURANT_IP !== 'PLACEHOLDER') {
      alert('You must be connected to the restaurant WiFi to check out.')
      return
    }
    if (!attendance) return
    setCheckLoading(true)
    const now = new Date().toTimeString().slice(0, 5)

    const { data } = await supabase
      .from('attendance')
      .update({ check_out: now })
      .eq('id', attendance.id)
      .select()
      .single()

    if (data) setAttendance(data)
    setCheckLoading(false)
  }

  const isOnRestaurantWifi = userIp === RESTAURANT_IP || RESTAURANT_IP === 'PLACEHOLDER'

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
      <div style={{ background: '#44ab51', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'white', fontSize: 20, fontWeight: 800 }}>🍽 Lila</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>Hi, {user.name}!</p>
        </div>
        <button onClick={onLogout} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 13 }}>Logout</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #eee' }}>
        {['schedule', 'checkin', 'availability'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: 14, background: 'none', borderRadius: 0,
              borderBottom: tab === t ? '3px solid #44ab51' : '3px solid transparent',
              color: tab === t ? '#44ab51' : '#888', fontWeight: 600, fontSize: 13
            }}
          >
            {t === 'schedule' ? '📅 Schedule' : t === 'checkin' ? '✅ Check In' : '✏️ Availability'}
          </button>
        ))}
      </div>

      <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>

        {/* Schedule Tab */}
        {tab === 'schedule' && (
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📅 My Schedule This Week</h2>
            {schedule.length === 0 ? (
              <p style={{ color: '#888', fontSize: 14 }}>No shifts scheduled yet.</p>
            ) : (
              schedule.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <span style={{ fontWeight: 600 }}>{s.day}</span>
                  <span style={{ color: '#44ab51', fontWeight: 600 }}>{s.start_time} – {s.end_time}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Check In Tab */}
        {tab === 'checkin' && (
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>✅ Check In / Check Out</h2>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>You must be connected to the restaurant WiFi to check in or out.</p>

            {/* WiFi Status */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              borderRadius: 8, marginBottom: 24,
              background: isOnRestaurantWifi ? '#f0faf0' : '#fff0f0',
              border: `1px solid ${isOnRestaurantWifi ? '#44ab51' : '#ffaaaa'}`
            }}>
              <span style={{ fontSize: 20 }}>{isOnRestaurantWifi ? '🟢' : '🔴'}</span>
              <div>
                <p style={{ fontWeight: 600, fontSize: 14, color: isOnRestaurantWifi ? '#2d8a50' : '#cc4444' }}>
                  {isOnRestaurantWifi ? 'Connected to restaurant WiFi' : 'Not on restaurant WiFi'}
                </p>
              </div>
            </div>

            {/* Today's Attendance */}
            {attendance && (
              <div style={{ padding: '12px 16px', background: '#f9f9f9', borderRadius: 8, marginBottom: 24 }}>
                <p style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Today's record</p>
                <div style={{ display: 'flex', gap: 24 }}>
                  <div>
                    <p style={{ fontSize: 12, color: '#aaa' }}>Checked in</p>
                    <p style={{ fontWeight: 700, color: '#44ab51' }}>{attendance.check_in || '—'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 12, color: '#aaa' }}>Checked out</p>
                    <p style={{ fontWeight: 700, color: '#44ab51' }}>{attendance.check_out || '—'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Check In/Out Button */}
            {!attendance?.check_in ? (
              <button
                onClick={handleCheckIn}
                disabled={checkLoading || !isOnRestaurantWifi}
                style={{
                  width: '100%', padding: 16, fontSize: 16, fontWeight: 700,
                  background: isOnRestaurantWifi ? '#44ab51' : '#ccc',
                  color: 'white', borderRadius: 12
                }}
              >
                {checkLoading ? 'Checking in...' : '🟢 Check In'}
              </button>
            ) : !attendance?.check_out ? (
              <button
                onClick={handleCheckOut}
                disabled={checkLoading || !isOnRestaurantWifi}
                style={{
                  width: '100%', padding: 16, fontSize: 16, fontWeight: 700,
                  background: isOnRestaurantWifi ? '#e8723a' : '#ccc',
                  color: 'white', borderRadius: 12
                }}
              >
                {checkLoading ? 'Checking out...' : '🔴 Check Out'}
              </button>
            ) : (
              <div style={{ textAlign: 'center', padding: 20, color: '#44ab51', fontWeight: 700, fontSize: 16 }}>
                ✅ Shift complete for today!
              </div>
            )}
          </div>
        )}

        {/* Availability Tab */}
        {tab === 'availability' && (
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
                    background: preferences[day] ? '#f0faf0' : '#f9f9f9',
                    border: `2px solid ${preferences[day] ? '#44ab51' : '#eee'}`
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: 6,
                    background: preferences[day] ? '#44ab51' : '#ddd',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {preferences[day] && <span style={{ color: 'white', fontSize: 12 }}>✓</span>}
                  </div>
                  <span style={{ fontWeight: 600 }}>{day}</span>
                </div>

                {preferences[day] && (
                  <div style={{ display: 'flex', gap: 12, padding: '8px 14px', background: '#f0faf0', borderRadius: '0 0 8px 8px', marginTop: -4 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>From</label>
                      <select
                        value={preferences[day].start}
                        onChange={e => updateTime(day, 'start', e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
                      >
                        {(day === 'Friday' || day === 'Saturday' ? HOURS_LATE : HOURS).map(h => <option key={h}>{h}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>To</label>
                      <select
                        value={preferences[day].end}
                        onChange={e => updateTime(day, 'end', e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
                      >
                        {(day === 'Friday' || day === 'Saturday' ? HOURS_LATE : HOURS).map(h => <option key={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={savePreferences}
              style={{ width: '100%', background: '#44ab51', color: 'white', padding: 14, fontSize: 15, marginTop: 8 }}
            >
              {saved ? '✓ Saved!' : 'Save Availability'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}