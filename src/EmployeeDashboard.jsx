import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { StockEmployee } from './StockTab'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const HOURS = ['11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '00:00', '00:30']
const HOURS_LATE = ['11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '00:00', '00:30', '01:00', '01:30', '02:00', '02:30']
const TODAY = new Date().toLocaleDateString('en-GB', { weekday: 'long' })
const RESTAURANT_IP = '62.195.229.217'

const getShiftColor = (startTime) => {
  const colors = {
    '11:00': '#2d85d7', '11:30': '#2d85d7',
    '12:00': '#46c042', '12:30': '#46c042',
    '13:00': '#CDDC39', '13:30': '#CDDC39',
    '14:00': '#e03308', '14:30': '#e03308',
    '15:00': '#e03308', '15:30': '#e03308',
    '16:00': '#FFC107', '16:30': '#FFC107',
    '17:00': '#FFC107', '17:30': '#FFC107',
    '18:00': '#FFC107', '18:30': '#FFC107',
    '19:00': '#9C27B0', '19:30': '#9C27B0',
    '20:00': '#673AB7', '20:30': '#673AB7',
    '21:00': '#3F51B5', '21:30': '#3F51B5',
    '22:00': '#2196F3', '22:30': '#2196F3',
    '23:00': '#03A9F4', '23:30': '#03A9F4',
    '00:00': '#00BCD4', '00:30': '#00BCD4',
    '01:00': '#009688', '01:30': '#009688',
    '02:00': '#795548', '02:30': '#795548'
  }
  return colors[startTime] || '#44ab51'
}

const getCurrentWeekStart = () => {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

const getWeekNumber = (dateStr) => {
  const d = dateStr ? new Date(dateStr) : new Date()
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7)
}

const card = {
  background: 'white',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.07)',
  border: '1px solid rgba(0,0,0,0.05)',
}

const selectStyle = {
  padding: '9px 36px 9px 12px',
  borderRadius: 10,
  border: '1.5px solid #c3e6c8',
  fontSize: 13,
  background: 'white',
  fontFamily: 'inherit',
  color: '#111827',
  width: '100%',
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2344ab51' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  cursor: 'pointer',
}

const weekSelectStyle = {
  padding: '7px 32px 7px 10px',
  borderRadius: 9,
  border: '1.5px solid #e5e9f0',
  fontSize: 12,
  background: 'white',
  fontFamily: 'inherit',
  color: '#374151',
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  cursor: 'pointer',
}

export default function EmployeeDashboard({ user, onLogout }) {
  const [preferences, setPreferences] = useState({})
  const [schedule, setSchedule] = useState([])         // viewed week's team schedule
  const [myWeekShifts, setMyWeekShifts] = useState([]) // always current week, for hours summary
  const [weekOptions, setWeekOptions] = useState([])
  const [viewingWeek, setViewingWeek] = useState(null)
  const [employees, setEmployees] = useState([])
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userIp, setUserIp] = useState('')
  const [attendance, setAttendance] = useState(null)
  const [checkLoading, setCheckLoading] = useState(false)
  const [tab, setTab] = useState('schedule')
  const [weekAttendance, setWeekAttendance] = useState([])
  const [handoverTasks, setHandoverTasks] = useState([])
  const [newTask, setNewTask] = useState('')
  const [taskLoading, setTaskLoading] = useState(false)
  const [newScheduleAlert, setNewScheduleAlert] = useState(false)
  const [manualNote, setManualNote] = useState('')
  const [manualLoading, setManualLoading] = useState(false)
  const [manualSent, setManualSent] = useState(false)
  const [manualOutNote, setManualOutNote] = useState('')
  const [manualOutLoading, setManualOutLoading] = useState(false)
  const [manualOutSent, setManualOutSent] = useState(false)

  // Ref so real-time callbacks always see the current viewingWeek without stale closure
  const viewingWeekRef = useRef(null)

  useEffect(() => {
    fetchData()
    fetchIp()
    fetchHandover()
    fetchWeekOptions()
  }, [])

  // Real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel(`employee-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => {
        fetchSchedule(viewingWeekRef.current)
        fetchWeekOptions()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'handover' }, fetchHandover)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, fetchData)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const fetchIp = async () => {
    try {
      const res = await fetch('https://api.ipify.org?format=json')
      const data = await res.json()
      setUserIp(data.ip)
    } catch {
      setUserIp('')
    }
  }

  const fetchSchedule = async (weekFilter = null) => {
    const weekStart = weekFilter || getCurrentWeekStart()
    const { data } = await supabase
      .from('shifts')
      .select('*')
      .eq('published', true)
      .eq('week_start', weekStart)
    if (data) setSchedule(data)
  }

  const fetchWeekOptions = async () => {
    const { data } = await supabase
      .from('shifts')
      .select('week_start')
      .eq('published', true)
      .order('week_start', { ascending: false })
    if (data) {
      const unique = [...new Set(data.map(w => w.week_start).filter(Boolean))]
      setWeekOptions(unique)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const weekStart = getCurrentWeekStart()

    const [
      { data: prefData },
      { data: weekAttData },
      { data: myShiftsData },
      { data: empData },
      { data: attData },
      { data: publishSetting },
    ] = await Promise.all([
      supabase.from('preferences').select('*').eq('employee_id', user.id),
      supabase.from('attendance').select('*').eq('employee_id', user.id).gte('date', weekStart),
      supabase.from('shifts').select('*').eq('published', true).eq('week_start', weekStart).eq('employee_id', user.id),
      supabase.from('employees').select('*').eq('role', 'employee'),
      supabase.from('attendance').select('*').eq('employee_id', user.id).eq('date', today).single(),
      supabase.from('settings').select('*').eq('id', 'schedule_published_at').single(),
    ])

    if (prefData) {
      const map = {}
      prefData.forEach(p => { map[p.day] = { available: p.available, start: p.start_time, end: p.end_time } })
      setPreferences(map)
    }
    if (weekAttData) setWeekAttendance(weekAttData)
    if (myShiftsData) setMyWeekShifts(myShiftsData)
    if (empData) setEmployees(empData)
    if (attData) setAttendance(attData)

    if (publishSetting?.value) {
      const publishedAt = new Date(publishSetting.value)
      const lastSeen = localStorage.getItem(`schedule_seen_${user.id}`)
      if (!lastSeen || new Date(lastSeen) < publishedAt) setNewScheduleAlert(true)
    }

    await fetchSchedule(viewingWeekRef.current)
    setLoading(false)
  }

  const toggleDay = (day) => {
    setPreferences(prev => {
      if (prev[day]) {
        const updated = { ...prev }
        delete updated[day]
        return updated
      }
      const maxDays = user.max_days || 7
      const currentCount = Object.values(prev).filter(Boolean).length
      if (currentCount >= maxDays) {
        alert(`You can only select a maximum of ${maxDays} days per week.`)
        return prev
      }
      return { ...prev, [day]: { available: true, start: '11:00', end: '17:00' } }
    })
  }

  const updateTime = (day, field, value) => {
    setPreferences(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }))
  }

  const savePreferences = async () => {
    await supabase.from('preferences').delete().eq('employee_id', user.id)
    const rows = Object.entries(preferences)
      .filter(([_, v]) => v)
      .map(([day, v]) => ({
        employee_id: user.id, day, available: true, start_time: v.start, end_time: v.end
      }))
    if (rows.length > 0) await supabase.from('preferences').insert(rows)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const fetchHandover = async () => {
    const { data } = await supabase
      .from('handover')
      .select('*')
      .eq('deleted', false)
      .order('created_at', { ascending: false })
    if (data) setHandoverTasks(data)
  }

  const addTask = async () => {
    if (!newTask.trim()) return
    setTaskLoading(true)
    await supabase.from('handover').insert({
      task: newTask.trim(), added_by: user.id, added_by_name: user.name, completed: false
    })
    setNewTask('')
    fetchHandover()
    setTaskLoading(false)
  }

  const toggleTask = async (task) => {
    await supabase.from('handover').update({
      completed: !task.completed,
      completed_by: !task.completed ? user.id : null,
      completed_by_name: !task.completed ? user.name : null,
      completed_at: !task.completed ? new Date().toISOString() : null
    }).eq('id', task.id)
    fetchHandover()
  }

  const deleteTask = async (id) => {
    await supabase.from('handover').update({
      deleted: true, deleted_by_name: user.name, deleted_at: new Date().toISOString()
    }).eq('id', id)
    fetchHandover()
  }

  const handleCheckIn = async () => {
    if (userIp !== RESTAURANT_IP) {
      alert('You must be connected to the restaurant WiFi to check in.')
      return
    }
    setCheckLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toTimeString().slice(0, 5)
    const { data } = await supabase
      .from('attendance').insert({ employee_id: user.id, date: today, check_in: now }).select().single()
    if (data) setAttendance(data)
    setCheckLoading(false)
  }

  const handleCheckOut = async () => {
    if (userIp !== RESTAURANT_IP) {
      alert('You must be connected to the restaurant WiFi to check out.')
      return
    }
    if (!attendance) return
    setCheckLoading(true)
    const now = new Date().toTimeString().slice(0, 5)
    const { data } = await supabase
      .from('attendance').update({ check_out: now }).eq('id', attendance.id).select().single()
    if (data) setAttendance(data)
    setCheckLoading(false)
  }

  const handleManualCheckOut = async () => {
    setManualOutLoading(true)
    const now = new Date().toTimeString().slice(0, 5)
    const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
    await supabase.from('handover').insert({
      task: `⚠️ Manual check-out request — ${user.name}, ${dateLabel} at ${now}${manualOutNote.trim() ? `: "${manualOutNote.trim()}"` : ''}`,
      added_by: user.id,
      added_by_name: user.name,
      completed: false,
    })
    setManualOutSent(true)
    setManualOutNote('')
    setManualOutLoading(false)
  }

  const handleManualCheckIn = async () => {
    setManualLoading(true)
    const now = new Date().toTimeString().slice(0, 5)
    const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
    await supabase.from('handover').insert({
      task: `⚠️ Manual check-in request — ${user.name}, ${dateLabel} at ${now}${manualNote.trim() ? `: "${manualNote.trim()}"` : ''}`,
      added_by: user.id,
      added_by_name: user.name,
      completed: false,
    })
    setManualSent(true)
    setManualNote('')
    setManualLoading(false)
  }

  const isOnRestaurantWifi = userIp === RESTAURANT_IP

  const scheduledHours = myWeekShifts.reduce((sum, s) => {
    if (!s.start_time || !s.end_time) return sum
    const [inH, inM] = s.start_time.split(':').map(Number)
    const [outH, outM] = s.end_time.split(':').map(Number)
    let mins = (outH * 60 + outM) - (inH * 60 + inM)
    if (mins < 0) mins += 24 * 60
    return sum + Math.round(mins / 60 * 10) / 10
  }, 0)

  const workedHours = weekAttendance.reduce((sum, a) => {
    if (!a.check_in || !a.check_out) return sum
    const [inH, inM] = a.check_in.split(':').map(Number)
    const [outH, outM] = a.check_out.split(':').map(Number)
    let mins = (outH * 60 + outM) - (inH * 60 + inM)
    if (mins < 0) mins += 24 * 60
    return sum + Math.round(mins / 60 * 10) / 10
  }, 0)

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f4f8' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #e5e9f0', borderTopColor: '#44ab51', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#9ca3af', fontSize: 14 }}>Loading…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )

  const tabs = [
    { id: 'schedule', icon: '📅', label: 'Schedule' },
    { id: 'checkin', icon: '✅', label: 'Check In' },
    { id: 'availability', icon: '✏️', label: 'Availability' },
    { id: 'handover', icon: '🔁', label: 'Handover' },
    { id: 'stock', icon: '📦', label: 'Stock' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f1f4f8' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #44ab51 0%, #37944a 100%)', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 12px rgba(68,171,81,0.25)' }}>
        <div>
          <h1 style={{ color: 'white', fontSize: 20, fontWeight: 800, letterSpacing: '-0.3px' }}>Lila</h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 1 }}>Hi, {user.name}!</p>
        </div>
        <button onClick={onLogout} style={{ background: 'rgba(255,255,255,0.18)', color: 'white', fontSize: 13, padding: '7px 16px', borderRadius: 8, backdropFilter: 'blur(4px)' }}>
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e9f0', padding: '6px 10px', display: 'flex', gap: 4 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '8px 4px',
            background: tab === t.id ? '#44ab51' : 'transparent',
            borderRadius: 10,
            color: tab === t.id ? 'white' : '#9ca3af',
            fontWeight: tab === t.id ? 700 : 500,
            fontSize: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            transition: 'all 0.2s',
          }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div style={{ padding: 16, maxWidth: 820, margin: '0 auto' }}>

        {/* ── Schedule Tab ── */}
        {tab === 'schedule' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* New schedule alert */}
            {newScheduleAlert && (
              <div style={{ background: 'linear-gradient(135deg, #44ab51 0%, #37944a 100%)', borderRadius: 14, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 16px rgba(68,171,81,0.3)' }}>
                <div>
                  <p style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>🎉 New schedule published!</p>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 }}>Your shifts for this week have been updated.</p>
                </div>
                <button onClick={() => { localStorage.setItem(`schedule_seen_${user.id}`, new Date().toISOString()); setNewScheduleAlert(false) }}
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '8px 14px', fontSize: 13, borderRadius: 8, whiteSpace: 'nowrap', marginLeft: 12 }}>
                  Got it ✓
                </button>
              </div>
            )}

            {/* My hours — always current week */}
            <div style={card}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>My Hours This Week</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, background: '#f8f9fa', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Scheduled</p>
                  <p style={{ fontWeight: 700, fontSize: 22, color: '#374151' }}>{scheduledHours}<span style={{ fontSize: 13, fontWeight: 500, color: '#9ca3af' }}> hrs</span></p>
                </div>
                <div style={{ flex: 1, background: '#edf8ee', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Worked</p>
                  <p style={{ fontWeight: 700, fontSize: 22, color: '#44ab51' }}>{workedHours}<span style={{ fontSize: 13, fontWeight: 500, color: '#6dcf77' }}> hrs</span></p>
                </div>
              </div>
            </div>

            {/* Team schedule */}
            <div style={{ ...card, overflowX: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
                  Team Schedule — Week {getWeekNumber(viewingWeek)}
                </h2>
                <select
                  value={viewingWeek || ''}
                  onChange={e => {
                    const val = e.target.value || null
                    setViewingWeek(val)
                    viewingWeekRef.current = val
                    fetchSchedule(val)
                  }}
                  style={weekSelectStyle}
                >
                  <option value="">This Week</option>
                  {weekOptions.map(w => (
                    <option key={w} value={w}>
                      Week {getWeekNumber(w)} — {new Date(w).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </option>
                  ))}
                </select>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px 10px', color: '#9ca3af', fontWeight: 600, minWidth: 80, fontSize: 12 }}>Employee</th>
                    {DAYS.map(d => (
                      <th key={d} style={{ padding: '8px 4px', color: d === TODAY ? '#44ab51' : '#9ca3af', fontWeight: d === TODAY ? 800 : 600, textAlign: 'center', minWidth: 56, background: d === TODAY ? '#edf8ee' : 'transparent', borderRadius: 6, fontSize: 11 }}>
                        {d.slice(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px 10px', fontWeight: emp.id === user.id ? 700 : 500, color: emp.id === user.id ? '#44ab51' : '#374151', fontSize: 13 }}>
                        {emp.name}{emp.id === user.id ? ' (me)' : ''}
                      </td>
                      {DAYS.map(day => {
                        const shift = schedule.find(s => s.employee_id === emp.id && s.day === day)
                        return (
                          <td key={day} style={{ padding: '4px 3px', textAlign: 'center' }}>
                            {shift ? (
                              <div style={{ borderRadius: 8, padding: '5px 2px', background: getShiftColor(shift.start_time), minHeight: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: 10, color: 'white', fontWeight: 700, lineHeight: 1.3 }}>{shift.start_time}</span>
                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', lineHeight: 1.3 }}>{shift.end_time}</span>
                              </div>
                            ) : (
                              <div style={{ minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: 12, color: '#e5e9f0' }}>—</span>
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Handover preview */}
            {handoverTasks.filter(t => !t.completed).length > 0 && (
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>⏳ Pending Handover</h3>
                  <button onClick={() => setTab('handover')} style={{ background: '#edf8ee', color: '#44ab51', padding: '4px 12px', fontSize: 12, fontWeight: 600, borderRadius: 8 }}>See all</button>
                </div>
                {handoverTasks.filter(t => !t.completed).slice(0, 3).map(task => (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <div onClick={() => toggleTask(task)} style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, border: '2px solid #d1d5db', cursor: 'pointer' }} />
                    <div>
                      <p style={{ fontSize: 14, color: '#111827' }}>{task.task}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>Added by {task.added_by_name}</p>
                    </div>
                  </div>
                ))}
                {handoverTasks.filter(t => !t.completed).length > 3 && (
                  <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 10, textAlign: 'center' }}>+{handoverTasks.filter(t => !t.completed).length - 3} more tasks</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Check In Tab ── */}
        {tab === 'checkin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={card}>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: '#111827' }}>Check In / Check Out</h2>
              <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 20 }}>You must be on the restaurant WiFi to check in or out.</p>

              {/* WiFi status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, marginBottom: 20, background: isOnRestaurantWifi ? '#edf8ee' : '#fef2f2', border: `1px solid ${isOnRestaurantWifi ? '#bbdfc0' : '#fca5a5'}` }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: isOnRestaurantWifi ? '#44ab51' : '#dc2626', boxShadow: `0 0 0 3px ${isOnRestaurantWifi ? 'rgba(68,171,81,0.2)' : 'rgba(220,38,38,0.2)'}` }} />
                <p style={{ fontWeight: 600, fontSize: 14, color: isOnRestaurantWifi ? '#166534' : '#991b1b' }}>
                  {isOnRestaurantWifi ? 'Connected to restaurant WiFi' : 'Not on restaurant WiFi'}
                </p>
              </div>

              {/* Today's record */}
              {attendance && (
                <div style={{ padding: '14px 16px', background: '#f8f9fa', borderRadius: 12, marginBottom: 20, border: '1px solid #e5e9f0' }}>
                  <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Today's Record</p>
                  <div style={{ display: 'flex', gap: 28 }}>
                    <div>
                      <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Checked in</p>
                      <p style={{ fontWeight: 700, fontSize: 18, color: '#44ab51' }}>{attendance.check_in || '—'}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Checked out</p>
                      <p style={{ fontWeight: 700, fontSize: 18, color: '#44ab51' }}>{attendance.check_out || '—'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Check In / Out button */}
              {!attendance?.check_in ? (
                <>
                  <button
                    onClick={handleCheckIn}
                    disabled={checkLoading || !isOnRestaurantWifi}
                    style={{
                      width: '100%', padding: '18px', fontSize: 17, fontWeight: 700,
                      background: isOnRestaurantWifi ? 'linear-gradient(135deg, #44ab51 0%, #37944a 100%)' : '#e5e9f0',
                      color: isOnRestaurantWifi ? 'white' : '#9ca3af',
                      borderRadius: 14,
                      boxShadow: isOnRestaurantWifi ? '0 6px 20px rgba(68,171,81,0.4)' : 'none',
                    }}
                  >
                    {checkLoading ? 'Checking in…' : '🟢 Check In'}
                  </button>

                  {/* Manual check-in fallback when off WiFi */}
                  {!isOnRestaurantWifi && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <div style={{ flex: 1, height: 1, background: '#e5e9f0' }} />
                        <span style={{ fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>WiFi not available?</span>
                        <div style={{ flex: 1, height: 1, background: '#e5e9f0' }} />
                      </div>

                      {manualSent ? (
                        <div style={{ background: '#edf8ee', borderRadius: 12, padding: '16px', border: '1px solid #bbdfc0', textAlign: 'center' }}>
                          <p style={{ fontSize: 20, marginBottom: 6 }}>✅</p>
                          <p style={{ fontWeight: 700, color: '#44ab51', fontSize: 15 }}>Request sent to admin</p>
                          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>They'll manually log your check-in.</p>
                        </div>
                      ) : (
                        <>
                          <textarea
                            placeholder="Optional: explain why you're not on WiFi…"
                            value={manualNote}
                            onChange={e => setManualNote(e.target.value)}
                            rows={2}
                            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e9f0', fontSize: 14, fontFamily: 'inherit', resize: 'none', outline: 'none', marginBottom: 10, color: '#111827' }}
                          />
                          <button
                            onClick={handleManualCheckIn}
                            disabled={manualLoading}
                            style={{ width: '100%', padding: '13px', fontSize: 14, fontWeight: 700, background: '#f8f9fa', color: '#374151', borderRadius: 12, border: '1.5px solid #e5e9f0' }}
                          >
                            {manualLoading ? 'Sending…' : '📩 Request Manual Check-in'}
                          </button>
                          <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 8 }}>
                            Notifies the admin — they'll approve and log your time.
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </>
              ) : !attendance?.check_out ? (
                <>
                  <button
                    onClick={handleCheckOut}
                    disabled={checkLoading || !isOnRestaurantWifi}
                    style={{
                      width: '100%', padding: '18px', fontSize: 17, fontWeight: 700,
                      background: isOnRestaurantWifi ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : '#e5e9f0',
                      color: isOnRestaurantWifi ? 'white' : '#9ca3af',
                      borderRadius: 14,
                      boxShadow: isOnRestaurantWifi ? '0 6px 20px rgba(220,38,38,0.35)' : 'none',
                    }}
                  >
                    {checkLoading ? 'Checking out…' : '🔴 Check Out'}
                  </button>

                  {/* Manual check-out fallback when off WiFi */}
                  {!isOnRestaurantWifi && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <div style={{ flex: 1, height: 1, background: '#e5e9f0' }} />
                        <span style={{ fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>WiFi not available?</span>
                        <div style={{ flex: 1, height: 1, background: '#e5e9f0' }} />
                      </div>
                      {manualOutSent ? (
                        <div style={{ background: '#edf8ee', borderRadius: 12, padding: '16px', border: '1px solid #bbdfc0', textAlign: 'center' }}>
                          <p style={{ fontSize: 20, marginBottom: 6 }}>✅</p>
                          <p style={{ fontWeight: 700, color: '#44ab51', fontSize: 15 }}>Check-out request sent</p>
                          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>Admin will log your check-out time.</p>
                        </div>
                      ) : (
                        <>
                          <textarea
                            placeholder="Optional: explain why you're not on WiFi…"
                            value={manualOutNote}
                            onChange={e => setManualOutNote(e.target.value)}
                            rows={2}
                            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e9f0', fontSize: 14, fontFamily: 'inherit', resize: 'none', outline: 'none', marginBottom: 10, color: '#111827' }}
                          />
                          <button
                            onClick={handleManualCheckOut}
                            disabled={manualOutLoading}
                            style={{ width: '100%', padding: '13px', fontSize: 14, fontWeight: 700, background: '#f8f9fa', color: '#374151', borderRadius: 12, border: '1.5px solid #e5e9f0' }}
                          >
                            {manualOutLoading ? 'Sending…' : '📩 Request Manual Check-out'}
                          </button>
                          <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 8 }}>Notifies the admin — they'll log your end time.</p>
                        </>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', background: '#edf8ee', borderRadius: 14, border: '1px solid #bbdfc0' }}>
                  <p style={{ fontSize: 24, marginBottom: 6 }}>✅</p>
                  <p style={{ color: '#44ab51', fontWeight: 700, fontSize: 16 }}>Shift complete for today!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Availability Tab ── */}
        {tab === 'availability' && (
          <div style={card}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: '#111827' }}>My Availability</h2>
            <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 18 }}>
              Tap the days you can work and set your preferred hours.
              {(user.min_days || user.max_days) && (
                <span style={{ color: '#44ab51', fontWeight: 600 }}> ({user.min_days || 1}–{user.max_days || 7} days/week)</span>
              )}
            </p>

            {DAYS.map(day => (
              <div key={day} style={{ marginBottom: 10 }}>
                <div
                  onClick={() => toggleDay(day)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                    padding: '12px 14px',
                    borderRadius: preferences[day] ? '12px 12px 0 0' : 12,
                    background: preferences[day] ? '#edf8ee' : '#f8f9fa',
                    border: `1.5px solid ${preferences[day] ? '#44ab51' : '#e5e9f0'}`,
                    borderBottom: preferences[day] ? 'none' : `1.5px solid #e5e9f0`,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ width: 22, height: 22, borderRadius: 7, background: preferences[day] ? '#44ab51' : '#e5e9f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                    {preferences[day] && <span style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>✓</span>}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 14, color: preferences[day] ? '#166534' : '#374151' }}>{day}</span>
                </div>

                {preferences[day] && (
                  <div style={{ display: 'flex', gap: 12, padding: '10px 14px', background: '#edf8ee', borderRadius: '0 0 12px 12px', border: '1.5px solid #44ab51', borderTop: 'none' }}>
                    {[
                      { label: 'From', field: 'start', hours: day === 'Friday' || day === 'Saturday' ? HOURS_LATE : HOURS },
                      { label: 'To', field: 'end', hours: day === 'Friday' || day === 'Saturday' ? HOURS_LATE : HOURS },
                    ].map(({ label, field, hours }) => (
                      <div key={field} style={{ flex: 1 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>{label}</label>
                        <select value={preferences[day][field]} onChange={e => updateTime(day, field, e.target.value)} style={selectStyle}>
                          {hours.map(h => <option key={h}>{h}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={savePreferences}
              style={{
                width: '100%',
                background: saved ? '#edf8ee' : 'linear-gradient(135deg, #44ab51 0%, #37944a 100%)',
                color: saved ? '#44ab51' : 'white',
                padding: '14px', fontSize: 15, fontWeight: 700, borderRadius: 12, marginTop: 12,
                boxShadow: saved ? 'none' : '0 4px 16px rgba(68,171,81,0.4)',
                transition: 'all 0.3s',
                border: saved ? '1.5px solid #bbdfc0' : 'none',
              }}
            >
              {saved ? '✓ Saved!' : 'Save Availability'}
            </button>
          </div>
        )}

        {/* ── Stock Tab ── */}
        {tab === 'stock' && <StockEmployee />}

        {/* ── Handover Tab ── */}
        {tab === 'handover' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={card}>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: '#111827' }}>Handover List</h2>
              <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 16 }}>Add tasks for the next shift. Check off completed items.</p>

              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <input
                  placeholder="Add a task for the next shift…"
                  value={newTask}
                  onChange={e => setNewTask(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTask()}
                  style={{ flex: 1 }}
                />
                <button onClick={addTask} disabled={taskLoading} style={{ background: 'linear-gradient(135deg, #44ab51 0%, #37944a 100%)', color: 'white', padding: '10px 18px', fontWeight: 700, fontSize: 14, borderRadius: 10, boxShadow: '0 4px 12px rgba(68,171,81,0.35)', whiteSpace: 'nowrap' }}>
                  + Add
                </button>
              </div>

              {handoverTasks.filter(t => !t.completed).length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', marginBottom: 10, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Pending</p>
                  {handoverTasks.filter(t => !t.completed).map(task => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid #f3f4f6' }}>
                      <div onClick={() => toggleTask(task)} style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, border: '2px solid #d1d5db', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{task.task}</p>
                        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                          Added by {task.added_by_name} · {new Date(task.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {task.added_by === user.id && (
                        <button onClick={() => deleteTask(task.id)} style={{ background: '#fef2f2', color: '#dc2626', padding: '4px 10px', fontSize: 12, borderRadius: 7, fontWeight: 600 }}>🗑</button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {handoverTasks.filter(t => t.completed).length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#44ab51', marginBottom: 10, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Completed</p>
                  {handoverTasks.filter(t => t.completed).map(task => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid #f3f4f6', opacity: 0.65 }}>
                      <div onClick={() => toggleTask(task)} style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, background: '#44ab51', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>✓</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, textDecoration: 'line-through', color: '#9ca3af' }}>{task.task}</p>
                        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Added by {task.added_by_name} · Completed by {task.completed_by_name}</p>
                      </div>
                      {task.added_by === user.id && (
                        <button onClick={() => deleteTask(task.id)} style={{ background: '#fef2f2', color: '#dc2626', padding: '4px 10px', fontSize: 12, borderRadius: 7, fontWeight: 600 }}>🗑</button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {handoverTasks.length === 0 && (
                <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>No tasks yet. Add something for the next shift!</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
