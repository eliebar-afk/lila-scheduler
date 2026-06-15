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
  background: 'var(--card)',
  borderRadius: 20,
  padding: 20,
  boxShadow: '0 2px 4px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.06), 0 32px 64px rgba(0,0,0,0.04)',
  border: '1px solid var(--border)',
}

const selectStyle = {
  padding: '9px 36px 9px 12px',
  borderRadius: 10,
  border: '1.5px solid var(--border-soft)',
  fontSize: 13,
  background: 'var(--card)',
  fontFamily: 'inherit',
  color: 'var(--text)',
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
  border: '1.5px solid var(--border-soft)',
  fontSize: 12,
  background: 'var(--card)',
  fontFamily: 'inherit',
  color: 'var(--text2)',
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  cursor: 'pointer',
}

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef(null)
  useEffect(() => {
    const duration = 700
    const startTime = Date.now()
    const tick = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(value * eased * 10) / 10)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setDisplay(value)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value])
  return <>{display}</>
}

function Toast({ msg, type }) {
  const bg = { error: '#dc2626', success: '#44ab51', info: '#1e293b' }[type] || '#1e293b'
  return (
    <div style={{
      position: 'fixed', bottom: 90, left: '50%',
      transform: 'translateX(-50%)',
      background: bg, color: 'white',
      padding: '12px 22px', borderRadius: 14,
      fontSize: 14, fontWeight: 600,
      zIndex: 9999, whiteSpace: 'nowrap',
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      animation: 'toastSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      pointerEvents: 'none',
    }}>
      {msg}
    </div>
  )
}

function LiveClock() {
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5))
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toTimeString().slice(0, 5)), 1000)
    return () => clearInterval(id)
  }, [])
  return <>{time}</>
}

function SwipeButton({ label, onComplete, disabled, color }) {
  const [progress, setProgress] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [done, setDone] = useState(false)
  const trackRef = useRef(null)
  const startX = useRef(0)
  const progressRef = useRef(0)

  const THUMB = 56
  const PAD = 6

  const travel = () => (trackRef.current?.offsetWidth ?? 320) - THUMB - PAD * 2

  const onStart = (x) => {
    if (disabled || done) return
    setDragging(true)
    startX.current = x - progressRef.current * travel()
  }

  const onMove = (x) => {
    if (!dragging) return
    const p = Math.max(0, Math.min(1, (x - startX.current) / travel()))
    progressRef.current = p
    setProgress(p)
  }

  const onEnd = async () => {
    if (!dragging) return
    setDragging(false)
    if (progressRef.current > 0.82) {
      progressRef.current = 1
      setProgress(1)
      setDone(true)
      await onComplete()
    } else {
      progressRef.current = 0
      setProgress(0)
    }
  }

  const thumbLeft = PAD + progress * travel()
  const fillPct = trackRef.current
    ? Math.min(100, ((thumbLeft + THUMB / 2) / trackRef.current.offsetWidth) * 100)
    : 0

  return (
    <div
      ref={trackRef}
      onMouseDown={e => onStart(e.clientX)}
      onMouseMove={e => dragging && onMove(e.clientX)}
      onMouseUp={onEnd}
      onMouseLeave={() => dragging && onEnd()}
      onTouchStart={e => { e.preventDefault(); onStart(e.touches[0].clientX) }}
      onTouchMove={e => { e.preventDefault(); onMove(e.touches[0].clientX) }}
      onTouchEnd={onEnd}
      style={{
        position: 'relative', height: 70, borderRadius: 35,
        background: disabled ? 'var(--raised)' : `${color}10`,
        border: `1.5px solid ${disabled ? 'var(--border-soft)' : color + '30'}`,
        overflow: 'hidden',
        cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none', WebkitUserSelect: 'none',
        touchAction: 'none',
      }}
    >
      {/* Fill */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0,
        width: `${fillPct}%`,
        background: `${color}20`,
        borderRadius: 35,
        transition: dragging ? 'none' : 'width 0.45s cubic-bezier(0.34,1.56,0.64,1)',
        pointerEvents: 'none',
      }} />

      {/* Label */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <span style={{
          fontSize: 15, fontWeight: 700,
          color: disabled ? 'var(--text4)' : color,
          letterSpacing: '-0.2px',
          opacity: Math.max(0, 1 - progress * 2.5),
          transition: dragging ? 'none' : 'opacity 0.3s',
        }}>
          {label}
        </span>
      </div>

      {/* Thumb */}
      <div style={{
        position: 'absolute',
        top: PAD, left: thumbLeft,
        width: THUMB, height: THUMB,
        borderRadius: '50%',
        background: disabled
          ? 'var(--border-soft)'
          : done
            ? color
            : `linear-gradient(145deg, ${color}cc, ${color})`,
        boxShadow: disabled ? 'none' : `0 4px 20px ${color}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: dragging ? 'none' : 'left 0.45s cubic-bezier(0.34,1.56,0.64,1)',
        pointerEvents: 'none',
        fontSize: 22, color: 'white', fontWeight: 800,
      }}>
        {done ? '✓' : '›'}
      </div>
    </div>
  )
}

export default function EmployeeDashboard({ user, onLogout, darkMode, toggleDarkMode }) {
  const [preferences, setPreferences] = useState({})
  const [schedule, setSchedule] = useState([])
  const [myWeekShifts, setMyWeekShifts] = useState([])
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
  const [toastMsg, setToastMsg] = useState(null)
  const [pullY, setPullY] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const viewingWeekRef = useRef(null)
  const toastTimer = useRef(null)
  const touchStartY = useRef(0)

  const showToast = (msg, type = 'info') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToastMsg({ msg, type })
    toastTimer.current = setTimeout(() => setToastMsg(null), 3000)
  }

  useEffect(() => {
    fetchData()
    fetchIp()
    fetchHandover()
    fetchWeekOptions()
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel(`employee-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => {
        fetchSchedule(viewingWeekRef.current)
        fetchMyWeekData(viewingWeekRef.current)
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

  const fetchMyWeekData = async (weekFilter = null) => {
    const weekStart = weekFilter || getCurrentWeekStart()
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    const [{ data: shiftsData }, { data: attData }] = await Promise.all([
      supabase.from('shifts').select('*').eq('published', true).eq('week_start', weekStart).eq('employee_id', user.id),
      supabase.from('attendance').select('*').eq('employee_id', user.id).gte('date', weekStart).lt('date', weekEndStr),
    ])

    if (shiftsData) setMyWeekShifts(shiftsData)
    if (attData) setWeekAttendance(attData)
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

    const [
      { data: prefData },
      { data: empData },
      { data: attData },
      { data: publishSetting },
    ] = await Promise.all([
      supabase.from('preferences').select('*').eq('employee_id', user.id),
      supabase.from('employees').select('*').eq('role', 'employee'),
      supabase.from('attendance').select('*').eq('employee_id', user.id).eq('date', today).single(),
      supabase.from('settings').select('*').eq('id', 'schedule_published_at').single(),
    ])

    if (prefData) {
      const map = {}
      prefData.forEach(p => { map[p.day] = { available: p.available, start: p.start_time, end: p.end_time } })
      setPreferences(map)
    }
    if (empData) setEmployees(empData)
    if (attData) setAttendance(attData)

    if (publishSetting?.value) {
      const publishedAt = new Date(publishSetting.value)
      const lastSeen = localStorage.getItem(`schedule_seen_${user.id}`)
      if (!lastSeen || new Date(lastSeen) < publishedAt) setNewScheduleAlert(true)
    }

    await Promise.all([
      fetchSchedule(viewingWeekRef.current),
      fetchMyWeekData(viewingWeekRef.current),
    ])
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
        showToast(`Max ${maxDays} days per week`, 'error')
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
    showToast('Availability saved!', 'success')
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
    if (navigator.vibrate) navigator.vibrate(60)
    setCheckLoading(true)
    const { data, error } = await supabase.functions.invoke('check-in', {
      body: { employee_id: user.id, action: 'check-in' },
    })
    setCheckLoading(false)
    if (error || data?.error) {
      showToast(data?.error || 'Check-in failed. Try again.', 'error')
      return
    }
    if (data?.data) {
      setAttendance(data.data)
      showToast(`Checked in at ${data.data.check_in}`, 'success')
    }
  }

  const handleCheckOut = async () => {
    if (!attendance) return
    if (navigator.vibrate) navigator.vibrate(60)
    setCheckLoading(true)
    const { data, error } = await supabase.functions.invoke('check-in', {
      body: { employee_id: user.id, action: 'check-out' },
    })
    setCheckLoading(false)
    if (error || data?.error) {
      showToast(data?.error || 'Check-out failed. Try again.', 'error')
      return
    }
    if (data?.data) {
      setAttendance(data.data)
      showToast(`Checked out at ${data.data.check_out}`, 'success')
    }
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

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e) => {
    if (window.scrollY > 0) return
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 0) setPullY(Math.min(delta * 0.45, 72))
  }

  const handleTouchEnd = async () => {
    if (pullY > 52) {
      setRefreshing(true)
      setPullY(0)
      await fetchData()
      setRefreshing(false)
    } else {
      setPullY(0)
    }
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

  const todayShift = myWeekShifts.find(s => s.day === TODAY)

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <style>{`@keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }`}</style>
      <div style={{ background: 'linear-gradient(135deg, #44ab51 0%, #37944a 100%)', height: 86 }} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[88, 200, 160, 110].map((h, i) => (
          <div key={i} style={{
            height: h, borderRadius: 20,
            background: 'linear-gradient(90deg, var(--raised) 25%, var(--border-soft) 50%, var(--raised) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }} />
        ))}
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
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, rgba(68,171,81,0.07) 0px, var(--bg) 160px)',
        paddingBottom: 80,
      }}>
      <style>{`
        @keyframes tabFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGreen {
          0%   { box-shadow: 0 0 0 0   rgba(68,171,81,0.45), 0 12px 40px rgba(68,171,81,0.5); }
          70%  { box-shadow: 0 0 0 20px rgba(68,171,81,0),   0 12px 40px rgba(68,171,81,0.5); }
          100% { box-shadow: 0 0 0 0   rgba(68,171,81,0),   0 12px 40px rgba(68,171,81,0.5); }
        }
        @keyframes pulseRed {
          0%   { box-shadow: 0 0 0 0   rgba(220,38,38,0.45), 0 12px 40px rgba(220,38,38,0.45); }
          70%  { box-shadow: 0 0 0 20px rgba(220,38,38,0),   0 12px 40px rgba(220,38,38,0.45); }
          100% { box-shadow: 0 0 0 0   rgba(220,38,38,0),   0 12px 40px rgba(220,38,38,0.45); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0 }
          100% { background-position:  200% 0 }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes toastSlideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        * { -webkit-tap-highlight-color: transparent; }
        button { transition: transform 0.12s ease; font-family: inherit; }
        button:active { transform: scale(0.96) !important; }
        input, textarea, select { font-family: inherit; }
      `}</style>

      {toastMsg && <Toast msg={toastMsg.msg} type={toastMsg.type} />}

      {/* Header — glassmorphism sticky */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(48, 155, 67, 0.88)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
        padding: '12px 20px 14px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ color: 'white', fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1.1 }}>Lila</h1>
            <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: 13, marginTop: 2, fontWeight: 500 }}>Hi, {user.name}!</p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2, fontWeight: 500 }}>
              {todayShift ? `Today · ${todayShift.start_time} – ${todayShift.end_time}` : 'No shift today'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              onClick={toggleDarkMode}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{ width: 40, height: 22, borderRadius: 11, background: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', flexShrink: 0 }}
            >
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'transform 0.2s', transform: darkMode ? 'translateX(18px)' : 'translateX(0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
                {darkMode ? '🌙' : '☀️'}
              </div>
            </div>
            <button onClick={onLogout} style={{ background: 'rgba(255,255,255,0.18)', color: 'white', fontSize: 13, padding: '7px 16px', borderRadius: 8, fontWeight: 600 }}>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Pull-to-refresh indicator */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: refreshing ? 44 : pullY * 0.6,
        overflow: 'hidden',
        transition: pullY === 0 && !refreshing ? 'height 0.25s ease' : 'none',
      }}>
        {(pullY > 8 || refreshing) && (
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            border: '2.5px solid var(--border-soft)', borderTopColor: '#44ab51',
            animation: refreshing ? 'spin 0.8s linear infinite' : 'none',
            transform: !refreshing ? `rotate(${Math.min(pullY * 3.5, 360)}deg)` : undefined,
            transition: 'opacity 0.15s',
          }} />
        )}
      </div>

      {/* Tab content — fades in on each tab switch */}
      <div key={tab} style={{ padding: 16, maxWidth: 820, margin: '0 auto', animation: 'tabFadeIn 0.22s ease-out' }}>

        {/* ── Schedule Tab ── */}
        {tab === 'schedule' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {newScheduleAlert && (
              <div style={{ background: 'linear-gradient(135deg, #44ab51 0%, #37944a 100%)', borderRadius: 18, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 6px 24px rgba(68,171,81,0.35)' }}>
                <div>
                  <p style={{ color: 'white', fontWeight: 800, fontSize: 16, letterSpacing: '-0.2px' }}>🎉 New schedule published!</p>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 3, fontWeight: 500 }}>Your shifts for this week have been updated.</p>
                </div>
                <button onClick={() => { localStorage.setItem(`schedule_seen_${user.id}`, new Date().toISOString()); setNewScheduleAlert(false) }}
                  style={{ background: 'rgba(255,255,255,0.22)', color: 'white', padding: '8px 14px', fontSize: 13, fontWeight: 700, borderRadius: 10, whiteSpace: 'nowrap', marginLeft: 12 }}>
                  Got it ✓
                </button>
              </div>
            )}

            {/* My Hours */}
            <div style={card}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Week {getWeekNumber(viewingWeek)} Hours
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, background: 'var(--raised)', borderRadius: 14, padding: '14px 16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 6, fontWeight: 600 }}>Scheduled</p>
                  <p style={{ fontWeight: 800, fontSize: 28, color: 'var(--text2)', letterSpacing: '-0.5px' }}>
                    <AnimatedNumber value={scheduledHours} /><span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text4)' }}>h</span>
                  </p>
                </div>
                <div style={{ flex: 1, background: 'rgba(68,171,81,0.1)', borderRadius: 14, padding: '14px 16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: '#44ab51', marginBottom: 6, fontWeight: 600 }}>Worked</p>
                  <p style={{ fontWeight: 800, fontSize: 28, color: '#44ab51', letterSpacing: '-0.5px' }}>
                    <AnimatedNumber value={workedHours} /><span style={{ fontSize: 14, fontWeight: 500, color: '#6dcf77' }}>h</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Team schedule */}
            <div style={{ ...card, overflowX: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.3px' }}>
                  Team Schedule
                </h2>
                <select
                  value={viewingWeek || ''}
                  onChange={e => {
                    const val = e.target.value || null
                    setViewingWeek(val)
                    viewingWeekRef.current = val
                    fetchSchedule(val)
                    fetchMyWeekData(val)
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
                    <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--text4)', fontWeight: 700, minWidth: 80, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Employee</th>
                    {DAYS.map(d => (
                      <th key={d} style={{ padding: '8px 4px', color: d === TODAY ? '#44ab51' : 'var(--text4)', fontWeight: d === TODAY ? 800 : 600, textAlign: 'center', minWidth: 54, background: d === TODAY ? 'rgba(68,171,81,0.07)' : 'transparent', borderRadius: 6, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {d.slice(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id} style={{ borderTop: '1px solid var(--border-table)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: emp.id === user.id ? 700 : 500, color: emp.id === user.id ? '#44ab51' : 'var(--text2)', fontSize: 13 }}>
                        {emp.name}{emp.id === user.id ? ' (me)' : ''}
                      </td>
                      {DAYS.map(day => {
                        const shift = schedule.find(s => s.employee_id === emp.id && s.day === day)
                        const color = shift ? getShiftColor(shift.start_time) : null
                        return (
                          <td key={day} style={{ padding: '4px 3px', textAlign: 'center' }}>
                            {shift ? (
                              <div style={{
                                borderRadius: 8,
                                padding: '4px 5px',
                                background: `${color}18`,
                                borderLeft: `3px solid ${color}`,
                                minHeight: 36,
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'flex-start', justifyContent: 'center',
                              }}>
                                <span style={{ fontSize: 10, color: 'var(--text)', fontWeight: 700, lineHeight: 1.3 }}>{shift.start_time}</span>
                                <span style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.3 }}>{shift.end_time}</span>
                              </div>
                            ) : (
                              <div style={{ minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: 12, color: 'var(--border-soft)' }}>—</span>
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
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.2px' }}>⏳ Pending Handover</h3>
                  <button onClick={() => setTab('handover')} style={{ background: 'rgba(68,171,81,0.1)', color: '#44ab51', padding: '5px 12px', fontSize: 12, fontWeight: 700, borderRadius: 9 }}>See all</button>
                </div>
                {handoverTasks.filter(t => !t.completed).slice(0, 3).map(task => (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border-table)' }}>
                    <div onClick={() => toggleTask(task)} style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, border: '2px solid var(--border-soft)', cursor: 'pointer' }} />
                    <div>
                      <p style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{task.task}</p>
                      <p style={{ fontSize: 11, color: 'var(--text4)', marginTop: 1, fontWeight: 500 }}>by {task.added_by_name}</p>
                    </div>
                  </div>
                ))}
                {handoverTasks.filter(t => !t.completed).length > 3 && (
                  <p style={{ fontSize: 12, color: 'var(--text4)', marginTop: 10, textAlign: 'center' }}>+{handoverTasks.filter(t => !t.completed).length - 3} more</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Check In Tab ── */}
        {tab === 'checkin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Main card */}
            <div style={card}>

              {/* WiFi pill */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 20, marginBottom: 28, background: isOnRestaurantWifi ? 'rgba(68,171,81,0.09)' : 'rgba(220,38,38,0.06)', border: `1px solid ${isOnRestaurantWifi ? 'rgba(68,171,81,0.25)' : 'rgba(220,38,38,0.18)'}` }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: isOnRestaurantWifi ? '#44ab51' : '#dc2626', boxShadow: `0 0 0 2px ${isOnRestaurantWifi ? 'rgba(68,171,81,0.25)' : 'rgba(220,38,38,0.2)'}` }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: isOnRestaurantWifi ? '#166534' : '#991b1b' }}>
                  {isOnRestaurantWifi ? 'Restaurant WiFi' : 'No restaurant WiFi'}
                </span>
              </div>

              {/* Live clock */}
              {!attendance?.check_out && (
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                    {!attendance?.check_in ? 'Check in at' : 'Check out at'}
                  </p>
                  <p style={{ fontSize: 58, fontWeight: 900, color: 'var(--text)', letterSpacing: '-3px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    <LiveClock />
                  </p>
                </div>
              )}

              {/* Swipe button */}
              {!attendance?.check_in ? (
                <>
                  <SwipeButton
                    key="checkin"
                    label={checkLoading ? 'Checking in…' : '› Slide to check in'}
                    onComplete={handleCheckIn}
                    disabled={!isOnRestaurantWifi || checkLoading}
                    color="#44ab51"
                  />
                  {!isOnRestaurantWifi && (
                    <p style={{ fontSize: 12, color: 'var(--text4)', textAlign: 'center', marginTop: 10, fontWeight: 500 }}>
                      Connect to restaurant WiFi to unlock
                    </p>
                  )}
                </>
              ) : !attendance?.check_out ? (
                <>
                  {/* Today's record so far */}
                  <div style={{ display: 'flex', gap: 20, padding: '12px 16px', background: 'var(--raised)', borderRadius: 14, marginBottom: 16, border: '1px solid var(--border-soft)' }}>
                    <div>
                      <p style={{ fontSize: 10, color: 'var(--text4)', fontWeight: 700, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Checked in</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: '#44ab51', letterSpacing: '-0.3px' }}>{attendance.check_in}</p>
                    </div>
                  </div>
                  <SwipeButton
                    key="checkout"
                    label={checkLoading ? 'Checking out…' : '› Slide to check out'}
                    onComplete={handleCheckOut}
                    disabled={!isOnRestaurantWifi || checkLoading}
                    color="#dc2626"
                  />
                  {!isOnRestaurantWifi && (
                    <p style={{ fontSize: 12, color: 'var(--text4)', textAlign: 'center', marginTop: 10, fontWeight: 500 }}>
                      Connect to restaurant WiFi to unlock
                    </p>
                  )}
                </>
              ) : (
                <>
                  {/* Completed state */}
                  <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
                    <p style={{ fontSize: 44, marginBottom: 8 }}>✅</p>
                    <p style={{ color: '#44ab51', fontWeight: 800, fontSize: 18, letterSpacing: '-0.3px' }}>Shift complete!</p>
                    <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4, fontWeight: 500 }}>See you next time.</p>
                  </div>
                  <div style={{ display: 'flex', gap: 20, padding: '14px 16px', background: 'rgba(68,171,81,0.08)', borderRadius: 14, marginTop: 20, border: '1px solid rgba(68,171,81,0.18)' }}>
                    <div>
                      <p style={{ fontSize: 10, color: '#44ab51', fontWeight: 700, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>In</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: '#44ab51', letterSpacing: '-0.3px' }}>{attendance.check_in}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, color: '#44ab51', fontWeight: 700, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Out</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: '#44ab51', letterSpacing: '-0.3px' }}>{attendance.check_out}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Manual request card — only when off WiFi and shift not done */}
            {!isOnRestaurantWifi && !attendance?.check_out && (
              <div style={card}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 14 }}>
                  {!attendance?.check_in ? '📩 Request manual check-in' : '📩 Request manual check-out'}
                </p>
                {(!attendance?.check_in ? manualSent : manualOutSent) ? (
                  <div style={{ background: 'rgba(68,171,81,0.09)', borderRadius: 12, padding: '16px', border: '1px solid rgba(68,171,81,0.2)', textAlign: 'center' }}>
                    <p style={{ fontWeight: 700, color: '#44ab51', fontSize: 14 }}>✅ Request sent to admin</p>
                    <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 4, fontWeight: 500 }}>They'll manually log your time.</p>
                  </div>
                ) : (
                  <>
                    <textarea
                      placeholder="Optional: explain why you're not on WiFi…"
                      value={!attendance?.check_in ? manualNote : manualOutNote}
                      onChange={e => !attendance?.check_in ? setManualNote(e.target.value) : setManualOutNote(e.target.value)}
                      rows={2}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid var(--border-soft)', fontSize: 14, resize: 'none', outline: 'none', marginBottom: 10, color: 'var(--text)', background: 'var(--raised)', boxSizing: 'border-box' }}
                    />
                    <button
                      onClick={!attendance?.check_in ? handleManualCheckIn : handleManualCheckOut}
                      disabled={!attendance?.check_in ? manualLoading : manualOutLoading}
                      style={{ width: '100%', padding: '13px', fontSize: 14, fontWeight: 700, background: 'var(--raised)', color: 'var(--text2)', borderRadius: 12, border: '1.5px solid var(--border-soft)' }}
                    >
                      {(!attendance?.check_in ? manualLoading : manualOutLoading) ? 'Sending…' : 'Send request to admin'}
                    </button>
                    <p style={{ fontSize: 11, color: 'var(--text4)', textAlign: 'center', marginTop: 8, fontWeight: 500 }}>Admin will approve and log your time.</p>
                  </>
                )}
              </div>
            )}

            {/* Weekly attendance history */}
            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 14, letterSpacing: '-0.2px' }}>This Week's Attendance</h3>
              {(() => {
                const weekStart = new Date(getCurrentWeekStart())
                return DAYS.map((dayName, i) => {
                  const date = new Date(weekStart)
                  date.setDate(date.getDate() + i)
                  const dateStr = date.toISOString().split('T')[0]
                  const record = weekAttendance.find(a => a.date === dateStr)
                  const isToday = dateStr === new Date().toISOString().split('T')[0]

                  let workedMins = 0
                  if (record?.check_in && record?.check_out) {
                    const [inH, inM] = record.check_in.split(':').map(Number)
                    const [outH, outM] = record.check_out.split(':').map(Number)
                    workedMins = (outH * 60 + outM) - (inH * 60 + inM)
                    if (workedMins < 0) workedMins += 24 * 60
                  }

                  return (
                    <div key={dayName} style={{
                      display: 'flex', alignItems: 'center',
                      padding: '10px 12px', borderRadius: 12, marginBottom: 4,
                      background: isToday ? 'rgba(68,171,81,0.09)' : 'var(--raised)',
                      border: `1px solid ${isToday ? 'rgba(68,171,81,0.25)' : 'var(--border-soft)'}`,
                    }}>
                      <div style={{ width: 80 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: isToday ? '#44ab51' : 'var(--text)' }}>
                          {dayName.slice(0, 3)}
                          {isToday && <span style={{ fontSize: 10, fontWeight: 600, color: '#44ab51', marginLeft: 5 }}>Today</span>}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text4)', marginTop: 1, fontWeight: 500 }}>
                          {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      {record ? (
                        <>
                          <div style={{ flex: 1, display: 'flex', gap: 20 }}>
                            <div>
                              <p style={{ fontSize: 10, color: 'var(--text4)', marginBottom: 2, fontWeight: 600 }}>In</p>
                              <p style={{ fontSize: 14, fontWeight: 700, color: '#44ab51' }}>{record.check_in || '—'}</p>
                            </div>
                            <div>
                              <p style={{ fontSize: 10, color: 'var(--text4)', marginBottom: 2, fontWeight: 600 }}>Out</p>
                              <p style={{ fontSize: 14, fontWeight: 700, color: record.check_out ? '#44ab51' : 'var(--text4)' }}>
                                {record.check_out || '—'}
                              </p>
                            </div>
                          </div>
                          {workedMins > 0 && (
                            <p style={{ fontSize: 13, color: '#44ab51', fontWeight: 800 }}>
                              {Math.round(workedMins / 60 * 10) / 10}h
                            </p>
                          )}
                          {record.check_in && !record.check_out && (
                            <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, background: 'rgba(245,158,11,0.12)', padding: '3px 9px', borderRadius: 7 }}>Active</span>
                          )}
                        </>
                      ) : (
                        <p style={{ fontSize: 13, color: 'var(--text4)', flex: 1, fontWeight: 500 }}>—</p>
                      )}
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        )}

        {/* ── Availability Tab ── */}
        {tab === 'availability' && (
          <div style={card}>
            <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 4, color: 'var(--text)', letterSpacing: '-0.3px' }}>My Availability</h2>
            <p style={{ color: 'var(--text4)', fontSize: 13, marginBottom: 18, fontWeight: 500 }}>
              Tap the days you can work and set your preferred hours.
              {(user.min_days || user.max_days) && (
                <span style={{ color: '#44ab51', fontWeight: 700 }}> ({user.min_days || 1}–{user.max_days || 7} days/week)</span>
              )}
            </p>

            {DAYS.map(day => (
              <div key={day} style={{ marginBottom: 10 }}>
                <div
                  onClick={() => toggleDay(day)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                    padding: '13px 16px',
                    borderRadius: preferences[day] ? '14px 14px 0 0' : 14,
                    background: preferences[day] ? 'rgba(68,171,81,0.08)' : 'var(--raised)',
                    border: `1.5px solid ${preferences[day] ? '#44ab51' : 'var(--border-soft)'}`,
                    borderBottom: preferences[day] ? 'none' : `1.5px solid var(--border-soft)`,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ width: 22, height: 22, borderRadius: 7, background: preferences[day] ? '#44ab51' : 'var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                    {preferences[day] && <span style={{ color: 'white', fontSize: 13, fontWeight: 800 }}>✓</span>}
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 14, color: preferences[day] ? '#166534' : 'var(--text2)' }}>{day}</span>
                </div>

                {preferences[day] && (
                  <div style={{ display: 'flex', gap: 12, padding: '12px 16px', background: 'rgba(68,171,81,0.06)', borderRadius: '0 0 14px 14px', border: '1.5px solid #44ab51', borderTop: 'none' }}>
                    {[
                      { label: 'From', field: 'start', hours: day === 'Friday' || day === 'Saturday' ? HOURS_LATE : HOURS },
                      { label: 'To',   field: 'end',   hours: day === 'Friday' || day === 'Saturday' ? HOURS_LATE : HOURS },
                    ].map(({ label, field, hours }) => (
                      <div key={field} style={{ flex: 1 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
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
                background: saved ? 'rgba(68,171,81,0.1)' : 'linear-gradient(135deg, #44ab51 0%, #37944a 100%)',
                color: saved ? '#44ab51' : 'white',
                padding: '15px', fontSize: 15, fontWeight: 800, borderRadius: 14, marginTop: 14,
                boxShadow: saved ? 'none' : '0 6px 20px rgba(68,171,81,0.4)',
                transition: 'all 0.3s',
                border: saved ? '1.5px solid rgba(68,171,81,0.3)' : 'none',
                letterSpacing: '-0.2px',
              }}
            >
              {saved ? '✓ Saved!' : 'Save Availability'}
            </button>
          </div>
        )}

        {/* ── Stock Tab ── */}
        {tab === 'stock' && <StockEmployee user={user} />}

        {/* ── Handover Tab ── */}
        {tab === 'handover' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={card}>
              <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 4, color: 'var(--text)', letterSpacing: '-0.3px' }}>Handover List</h2>
              <p style={{ color: 'var(--text4)', fontSize: 13, marginBottom: 18, fontWeight: 500 }}>Add tasks for the next shift. Check off completed items.</p>

              <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
                <input
                  placeholder="Add a task for the next shift…"
                  value={newTask}
                  onChange={e => setNewTask(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTask()}
                  style={{ flex: 1, padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--border-soft)', fontSize: 14, outline: 'none', color: 'var(--text)', background: 'var(--raised)', boxSizing: 'border-box' }}
                />
                <button onClick={addTask} disabled={taskLoading} style={{ background: 'linear-gradient(135deg, #44ab51 0%, #37944a 100%)', color: 'white', padding: '11px 20px', fontWeight: 800, fontSize: 14, borderRadius: 12, boxShadow: '0 4px 14px rgba(68,171,81,0.4)', whiteSpace: 'nowrap' }}>
                  + Add
                </button>
              </div>

              {handoverTasks.filter(t => !t.completed).length > 0 && (
                <div style={{ marginBottom: 22 }}>
                  <p style={{ fontSize: 10, fontWeight: 800, color: '#dc2626', marginBottom: 10, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Pending</p>
                  {handoverTasks.filter(t => !t.completed).map(task => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-table)' }}>
                      <div onClick={() => toggleTask(task)} style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, border: '2px solid var(--border-soft)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{task.task}</p>
                        <p style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2, fontWeight: 500 }}>
                          {task.added_by_name} · {new Date(task.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {task.added_by === user.id && (
                        <button onClick={() => deleteTask(task.id)} style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', padding: '5px 10px', fontSize: 12, borderRadius: 8, fontWeight: 700 }}>🗑</button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {handoverTasks.filter(t => t.completed).length > 0 && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 800, color: '#44ab51', marginBottom: 10, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Completed</p>
                  {handoverTasks.filter(t => t.completed).map(task => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-table)', opacity: 0.6 }}>
                      <div onClick={() => toggleTask(task)} style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, background: '#44ab51', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: 'white', fontSize: 13, fontWeight: 800 }}>✓</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, textDecoration: 'line-through', color: 'var(--text4)' }}>{task.task}</p>
                        <p style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2, fontWeight: 500 }}>by {task.added_by_name} · done by {task.completed_by_name}</p>
                      </div>
                      {task.added_by === user.id && (
                        <button onClick={() => deleteTask(task.id)} style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', padding: '5px 10px', fontSize: 12, borderRadius: 8, fontWeight: 700 }}>🗑</button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {handoverTasks.length === 0 && (
                <p style={{ color: 'var(--text4)', fontSize: 14, textAlign: 'center', padding: '28px 0', fontWeight: 500 }}>No tasks yet. Add something for the next shift!</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom tab bar — fixed */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--card)',
        borderTop: '1px solid var(--border)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '8px 12px',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        display: 'flex', gap: 4,
        zIndex: 100,
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '8px 4px 6px',
            background: tab === t.id ? '#44ab51' : 'transparent',
            borderRadius: 12,
            color: tab === t.id ? 'white' : 'var(--text4)',
            fontWeight: tab === t.id ? 800 : 500,
            fontSize: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            transition: 'background 0.2s, color 0.2s',
          }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <span style={{ letterSpacing: '0.01em' }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
