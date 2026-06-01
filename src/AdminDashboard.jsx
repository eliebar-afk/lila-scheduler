import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { StockAdmin } from './StockTab'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const HOURS = ['11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30']
const HOURS_LATE = ['11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30']
const TODAY = new Date().toLocaleDateString('en-GB', { weekday: 'long' })

const getShiftColor = (startTime) => {
  const colors = {
    '11:00': '#4CAF50', '11:30': '#4CAF50',
    '12:00': '#8BC34A', '12:30': '#8BC34A',
    '13:00': '#CDDC39', '13:30': '#CDDC39',
    '14:00': '#FFC107', '14:30': '#FFC107',
    '15:00': '#FF9800', '15:30': '#FF9800',
    '16:00': '#FF5722', '16:30': '#FF5722',
    '17:00': '#F44336', '17:30': '#F44336',
    '18:00': '#E91E63', '18:30': '#E91E63',
    '19:00': '#9C27B0', '19:30': '#9C27B0',
    '20:00': '#673AB7', '20:30': '#673AB7',
    '21:00': '#3F51B5', '21:30': '#3F51B5',
    '22:00': '#2196F3', '22:30': '#2196F3',
    '23:00': '#03A9F4', '23:30': '#03A9F4',
    '00:00': '#00BCD4', '00:30': '#00BCD4',
    '01:00': '#009688', '01:30': '#009688',
    '02:00': '#795548', '02:30': '#795548',
    '03:00': '#607D8B', '03:30': '#607D8B'
  }
  return colors[startTime] || '#44ab51'
}

// Shared style tokens
const card = {
  background: 'white',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.07)',
  border: '1px solid rgba(0,0,0,0.05)',
}
const btnPrimary = {
  background: 'linear-gradient(135deg, #44ab51 0%, #37944a 100%)',
  color: 'white',
  padding: '11px 22px',
  borderRadius: 10,
  boxShadow: '0 4px 12px rgba(68,171,81,0.35)',
  fontSize: 14,
  fontWeight: 700,
}
const btnSecondary = {
  background: '#f1f5f9',
  color: '#475569',
  padding: '11px 18px',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
}
const btnDanger = {
  background: '#fef2f2',
  color: '#dc2626',
  padding: '11px 18px',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
}
const btnSmPrimary = { ...btnPrimary, padding: '6px 14px', fontSize: 13 }
const btnSmSecondary = { ...btnSecondary, padding: '6px 12px', fontSize: 13 }
const btnSmDanger = { ...btnDanger, padding: '6px 12px', fontSize: 13 }
const selectStyle = {
  padding: '9px 12px',
  borderRadius: 10,
  border: '1.5px solid #e5e9f0',
  fontSize: 13,
  background: 'white',
  fontFamily: 'inherit',
  color: '#111827',
}

export default function AdminDashboard({ user, onLogout }) {
  const [employees, setEmployees] = useState([])
  const [extraEmployees, setExtraEmployees] = useState([])
  const [shifts, setShifts] = useState([])
  const [preferences, setPreferences] = useState([])
  const [staffingRules, setStaffingRules] = useState([])
  const [tab, setTab] = useState('schedule')
  const [newName, setNewName] = useState('')
  const [newPin, setNewPin] = useState('')
  const [newRole, setNewRole] = useState('employee')
  const [loading, setLoading] = useState(true)
  const [editShift, setEditShift] = useState(null)
  const [scheduleWarnings, setScheduleWarnings] = useState([])
  const [newRule, setNewRule] = useState({ day: 'Monday', start_time: '11:00', end_time: '17:00', min_staff: 2, max_staff: 4 })
  const [editRule, setEditRule] = useState(null)
  const [viewingWeek, setViewingWeek] = useState(null)
  const [weekOptions, setWeekOptions] = useState([])
  const [handoverTasks, setHandoverTasks] = useState([])
  const [approvingTask, setApprovingTask] = useState(null) // { task, time, date }

  const getCurrentWeekStart = () => {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    return d.toISOString().split('T')[0]
  }

  const getNextWeekStart = () => {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) + 7
    d.setDate(diff)
    return d.toISOString().split('T')[0]
  }

  const getSchedulingWeek = () => viewingWeek || getCurrentWeekStart()

  const getWeekNumber = (dateStr) => {
    const d = dateStr ? new Date(dateStr) : new Date()
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    const dayNum = date.getUTCDay() || 7
    date.setUTCDate(date.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7)
  }

  const fetchHandover = async () => {
    const { data } = await supabase
      .from('handover')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setHandoverTasks(data)
  }

  const fetchAll = async (weekFilter = null) => {
    setLoading(true)
    try {
      const weekStart = weekFilter || getCurrentWeekStart()
      const [{ data: emps }, { data: extras }, { data: sh }, { data: prefs }, { data: rules }, { data: weeks }] = await Promise.all([
        supabase.from('employees').select('*').eq('role', 'employee'),
        supabase.from('employees').select('*').eq('role', 'extra'),
        supabase.from('shifts').select('*').eq('week_start', weekStart),
        supabase.from('preferences').select('*'),
        supabase.from('staffing_rules').select('*').order('day').order('start_time'),
        supabase.from('shifts').select('week_start').order('week_start', { ascending: false })
      ])
      setEmployees(emps || [])
      setExtraEmployees(extras || [])
      setShifts(sh || [])
      setPreferences(prefs || [])
      setStaffingRules(rules || [])
      if (weeks) {
        const unique = [...new Set(weeks.map(w => w.week_start).filter(Boolean))]
        setWeekOptions(unique)
      }
      setLoading(false)
    } catch(e) {
      console.error('fetchAll error:', e)
      setLoading(false)
    }
  }

  // Ref so real-time callbacks always see the latest viewingWeek without stale closure
  const viewingWeekRef = useRef(null)

  useEffect(() => { fetchAll(); fetchHandover() }, [])

  // Real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'handover' }, fetchHandover)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => fetchAll(viewingWeekRef.current))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => fetchAll(viewingWeekRef.current))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const addEmployee = async () => {
    if (!newName.trim() || newPin.length !== 4) return
    await supabase.from('employees').insert({ name: newName.trim(), pin: newPin, role: newRole })
    setNewName('')
    setNewPin('')
    setNewRole('employee')
    fetchAll(viewingWeek)
  }

  const removeEmployee = async (id) => {
    await supabase.from('employees').delete().eq('id', id)
    await supabase.from('shifts').delete().eq('employee_id', id)
    await supabase.from('preferences').delete().eq('employee_id', id)
    fetchAll(viewingWeek)
  }

  const saveShift = async () => {
    if (!editShift) return
    const weekStart = getSchedulingWeek()
    if (editShift.id) {
      await supabase.from('shifts').update({
        start_time: editShift.start_time,
        end_time: editShift.end_time
      }).eq('id', editShift.id)
    } else {
      await supabase.from('shifts').insert({
        employee_id: editShift.employee_id,
        day: editShift.day,
        start_time: editShift.start_time,
        end_time: editShift.end_time,
        published: false,
        week_start: weekStart
      })
    }
    setEditShift(null)
    fetchAll(viewingWeek)
  }

  const deleteShift = async (id) => {
    await supabase.from('shifts').delete().eq('id', id)
    setEditShift(null)
    fetchAll(viewingWeek)
  }

  const addRule = async () => {
    await supabase.from('staffing_rules').insert(newRule)
    setNewRule({ day: 'Monday', start_time: '11:00', end_time: '17:00', min_staff: 2, max_staff: 4 })
    fetchAll(viewingWeek)
  }

  const saveRule = async () => {
    if (!editRule) return
    await supabase.from('staffing_rules').update({
      day: editRule.day,
      start_time: editRule.start_time,
      end_time: editRule.end_time,
      min_staff: editRule.min_staff,
      max_staff: editRule.max_staff
    }).eq('id', editRule.id)
    setEditRule(null)
    fetchAll(viewingWeek)
  }

  const deleteRule = async (id) => {
    await supabase.from('staffing_rules').delete().eq('id', id)
    fetchAll(viewingWeek)
  }

  const adminDeleteTask = async (id) => {
    await supabase.from('handover').delete().eq('id', id)
    fetchHandover()
  }

  const adminToggleTask = async (task) => {
    await supabase.from('handover').update({
      completed: !task.completed,
      completed_by_name: !task.completed ? 'Admin' : null,
      completed_at: !task.completed ? new Date().toISOString() : null
    }).eq('id', task.id)
    fetchHandover()
  }

  const approveManualRequest = async () => {
    if (!approvingTask) return
    const { task, time, date } = approvingTask
    const isCheckIn = task.task.includes('check-in request')

    if (isCheckIn) {
      await supabase.from('attendance').insert({
        employee_id: task.added_by,
        date,
        check_in: time,
      })
    } else {
      await supabase.from('attendance').update({ check_out: time })
        .eq('employee_id', task.added_by)
        .eq('date', date)
    }

    await supabase.from('handover').update({
      completed: true,
      completed_by_name: 'Admin',
      completed_at: new Date().toISOString(),
    }).eq('id', task.id)

    setApprovingTask(null)
    fetchHandover()
  }

  const timeToMins = (t) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }

  const overlaps = (rStart, rEnd, sStart, sEnd) => {
    let rs = timeToMins(rStart)
    let re = timeToMins(rEnd)
    let ss = timeToMins(sStart)
    let se = timeToMins(sEnd)
    if (re <= rs) re += 24 * 60
    if (se <= ss) se += 24 * 60
    if (rs < 180 && rs >= 0) rs += 24 * 60
    return ss < re && se > rs
  }

  const generateSchedule = async () => {
    const weekStart = getSchedulingWeek()
    await supabase.from('shifts').delete().eq('week_start', weekStart).eq('published', false)
    const newShifts = []
    const warnings = []

    for (const rule of staffingRules) {
      const available = employees.filter(emp => {
        const pref = preferences.find(p => p.employee_id === emp.id && p.day === rule.day)
        if (!pref) return false
        return overlaps(rule.start_time, rule.end_time, pref.start_time, pref.end_time)
      })
      const alreadyAssigned = newShifts.filter(s => s.day === rule.day).map(s => s.employee_id)
      const unassigned = available.filter(e => !alreadyAssigned.includes(e.id))
      const toAssign = unassigned.slice(0, rule.max_staff)
      const totalForDay = [...alreadyAssigned, ...toAssign.map(e => e.id)]

      if (totalForDay.length < rule.min_staff) {
        warnings.push(`⚠️ ${rule.day}: Need at least ${rule.min_staff} staff for ${rule.start_time}–${rule.end_time}, only ${totalForDay.length} available`)
      }

      for (const emp of toAssign) {
        const pref = preferences.find(p => p.employee_id === emp.id && p.day === rule.day)
        newShifts.push({
          employee_id: emp.id,
          day: rule.day,
          start_time: pref.start_time,
          end_time: pref.end_time,
          published: false,
          week_start: weekStart
        })
      }
    }

    const uniqueShifts = newShifts.filter((s, i, arr) =>
      arr.findIndex(x => x.employee_id === s.employee_id && x.day === s.day) === i
    )

    const shiftsByEmployee = {}
    const enforcedShifts = uniqueShifts.filter(s => {
      const emp = employees.find(e => e.id === s.employee_id)
      const max = emp?.max_days || 7
      shiftsByEmployee[s.employee_id] = (shiftsByEmployee[s.employee_id] || 0) + 1
      return shiftsByEmployee[s.employee_id] <= max
    })

    if (enforcedShifts.length > 0) {
      await supabase.from('shifts').insert(enforcedShifts)
    }

    setScheduleWarnings(warnings)
    fetchAll(viewingWeek)
  }

  const publishSchedule = async () => {
    await supabase.from('shifts').update({ published: true }).eq('published', false)
    await supabase.from('settings').upsert({ id: 'schedule_published_at', value: new Date().toISOString() })
    alert('Schedule published! Employees can now see their shifts.')
    fetchAll(viewingWeek)
  }

  const getShift = (employeeId, day) => shifts.find(s => s.employee_id === employeeId && s.day === day)
  const getPref = (employeeId, day) => preferences.find(p => p.employee_id === employeeId && p.day === day)

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f4f8' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid #e5e9f0', borderTopColor: '#44ab51',
          margin: '0 auto 12px',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: '#9ca3af', fontSize: 14 }}>Loading…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )

  const tabs = [
    { id: 'schedule', label: '📅 Schedule' },
    { id: 'rules', label: '📋 Rules' },
    { id: 'attendance', label: '🕐 Hours' },
    { id: 'employees', label: '👥 Staff' },
    { id: 'handover', label: '🔁 Handover' },
    { id: 'stock', label: '📦 Stock' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f1f4f8' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #44ab51 0%, #37944a 100%)',
        padding: '14px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 12px rgba(68,171,81,0.25)',
      }}>
        <div>
          <h1 style={{ color: 'white', fontSize: 20, fontWeight: 800, letterSpacing: '-0.3px' }}>Lila</h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 1 }}>Admin Panel</p>
        </div>
        <button onClick={onLogout} style={{
          background: 'rgba(255,255,255,0.18)',
          color: 'white',
          fontSize: 13,
          padding: '7px 16px',
          borderRadius: 8,
          backdropFilter: 'blur(4px)',
        }}>
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e5e9f0',
        padding: '6px 16px',
        display: 'flex',
        gap: 4,
        overflowX: 'auto',
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 16px',
            background: tab === t.id ? '#44ab51' : 'transparent',
            borderRadius: 8,
            whiteSpace: 'nowrap',
            color: tab === t.id ? 'white' : '#6b7280',
            fontWeight: 600,
            fontSize: 13,
            transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 20, maxWidth: 820, margin: '0 auto' }}>

        {/* Schedule Tab */}
        {tab === 'schedule' && (
          <>
            <div style={{ ...card, marginBottom: 20 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Auto Schedule Generator</h2>
              <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>
                Builds the schedule from employee availability and your staffing rules.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={generateSchedule} style={btnPrimary}>✨ Generate Schedule</button>
                <button onClick={publishSchedule} style={{ ...btnPrimary, background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', boxShadow: '0 4px 12px rgba(59,130,246,0.35)' }}>
                  🚀 Publish Schedule
                </button>
              </div>
              {scheduleWarnings.length > 0 && (
                <div style={{ marginTop: 16, padding: 14, background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a' }}>
                  <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#92400e' }}>⚠️ Staffing Gaps Detected</p>
                  {scheduleWarnings.map((w, i) => (
                    <p key={i} style={{ fontSize: 13, color: '#78350f', marginBottom: 4 }}>{w}</p>
                  ))}
                </div>
              )}
            </div>

            <div style={{ ...card, overflowX: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700 }}>
                  Weekly Schedule — Week {getWeekNumber(viewingWeek)}
                </h2>
                <select
                  value={viewingWeek || ''}
                  onChange={e => { const val = e.target.value || null; setViewingWeek(val); viewingWeekRef.current = val; fetchAll(val) }}
                  style={selectStyle}
                >
                  <option value="">This Week</option>
                  <option value={getNextWeekStart()}>
                    Next Week — {new Date(getNextWeekStart()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </option>
                  {weekOptions.filter(w => w !== getCurrentWeekStart() && w !== getNextWeekStart()).map(w => (
                    <option key={w} value={w}>
                      Week {getWeekNumber(w)} — {new Date(w).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </option>
                  ))}
                </select>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: '#9ca3af', fontWeight: 600, fontSize: 12 }}>Employee</th>
                    {DAYS.map(d => (
                      <th key={d} style={{
                        padding: '8px 4px',
                        color: d === TODAY ? '#44ab51' : '#9ca3af',
                        fontWeight: d === TODAY ? 800 : 600,
                        textAlign: 'center',
                        fontSize: 11,
                        background: d === TODAY ? '#edf8ee' : 'transparent',
                        borderRadius: 6,
                      }}>
                        {d.slice(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, color: '#374151' }}>{emp.name}</td>
                      {DAYS.map(day => {
                        const shift = getShift(emp.id, day)
                        const pref = getPref(emp.id, day)
                        const color = shift ? getShiftColor(shift.start_time) : null
                        return (
                          <td key={day} style={{ padding: '4px 3px', textAlign: 'center' }}>
                            <div
                              onClick={() => setEditShift(shift || { employee_id: emp.id, day, start_time: pref?.start_time || '11:00', end_time: pref?.end_time || '17:00' })}
                              style={{
                                cursor: 'pointer',
                                borderRadius: 8,
                                padding: '5px 2px',
                                minHeight: 38,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: shift ? color : pref ? '#edf8ee' : '#f8f9fa',
                                border: `1px solid ${shift ? 'transparent' : pref ? '#bbdfc0' : '#e5e9f0'}`,
                                transition: 'opacity 0.1s',
                              }}
                            >
                              {shift ? (
                                <>
                                  <span style={{ fontSize: 10, color: 'white', fontWeight: 700, lineHeight: 1.3 }}>{shift.start_time}</span>
                                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', lineHeight: 1.3 }}>{shift.end_time}</span>
                                </>
                              ) : pref ? (
                                <span style={{ fontSize: 10, color: '#44ab51', fontWeight: 600 }}>avail</span>
                              ) : (
                                <span style={{ fontSize: 14, color: '#d1d5db' }}>+</span>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 12 }}>
                Colored = scheduled &nbsp;·&nbsp; Light green = available &nbsp;·&nbsp; Click any cell to add or edit a shift
              </p>
            </div>
          </>
        )}

        {/* Rules Tab */}
        {tab === 'rules' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={card}>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Staffing Rules</h2>
              <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>Define how many staff you need per time slot.</p>

              {/* Add new rule */}
              <div style={{ background: '#f8f9fa', borderRadius: 12, padding: 16, marginBottom: 24, border: '1px solid #e5e9f0' }}>
                <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: '#374151' }}>Add New Rule</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                  {[
                    { label: 'Day', key: 'day', options: DAYS },
                    { label: 'From', key: 'start_time', options: HOURS_LATE },
                    { label: 'To', key: 'end_time', options: HOURS_LATE },
                  ].map(({ label, key, options }) => (
                    <div key={key} style={{ flex: 1, minWidth: 100 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>{label}</label>
                      <select value={newRule[key]} onChange={e => setNewRule({ ...newRule, [key]: e.target.value })} style={{ ...selectStyle, width: '100%' }}>
                        {options.map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                  {[
                    { label: 'Min Staff', key: 'min_staff' },
                    { label: 'Max Staff', key: 'max_staff' },
                  ].map(({ label, key }) => (
                    <div key={key} style={{ flex: 1, minWidth: 80 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>{label}</label>
                      <input
                        type="number" min={1} max={20} value={newRule[key]}
                        onChange={e => setNewRule({ ...newRule, [key]: Number(e.target.value) })}
                        style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e5e9f0', fontSize: 13, width: '100%' }}
                      />
                    </div>
                  ))}
                </div>
                <button onClick={addRule} style={btnSmPrimary}>+ Add Rule</button>
              </div>

              {DAYS.map(day => {
                const dayRules = staffingRules.filter(r => r.day === day)
                if (dayRules.length === 0) return null
                return (
                  <div key={day} style={{ marginBottom: 20 }}>
                    <p style={{ fontWeight: 700, fontSize: 13, color: '#44ab51', marginBottom: 8 }}>{day}</p>
                    {dayRules.map(rule => (
                      <div key={rule.id}>
                        {editRule?.id === rule.id ? (
                          <div style={{ background: '#edf8ee', borderRadius: 10, padding: 14, marginBottom: 8, border: '1px solid #bbdfc0' }}>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                              {[
                                { label: 'From', key: 'start_time', options: HOURS_LATE },
                                { label: 'To', key: 'end_time', options: HOURS_LATE },
                              ].map(({ label, key, options }) => (
                                <div key={key} style={{ flex: 1, minWidth: 90 }}>
                                  <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3 }}>{label}</label>
                                  <select value={editRule[key]} onChange={e => setEditRule({ ...editRule, [key]: e.target.value })} style={{ ...selectStyle, width: '100%', fontSize: 12 }}>
                                    {options.map(h => <option key={h}>{h}</option>)}
                                  </select>
                                </div>
                              ))}
                              {[
                                { label: 'Min', key: 'min_staff' },
                                { label: 'Max', key: 'max_staff' },
                              ].map(({ label, key }) => (
                                <div key={key} style={{ flex: 1, minWidth: 60 }}>
                                  <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3 }}>{label}</label>
                                  <input type="number" min={1} max={20} value={editRule[key]}
                                    onChange={e => setEditRule({ ...editRule, [key]: Number(e.target.value) })}
                                    style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #e5e9f0', fontSize: 12, width: '100%' }} />
                                </div>
                              ))}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => setEditRule(null)} style={btnSmSecondary}>Cancel</button>
                              <button onClick={saveRule} style={btnSmPrimary}>Save</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '11px 14px', background: '#f8f9fa', borderRadius: 10, marginBottom: 8,
                            border: '1px solid #e5e9f0',
                          }}>
                            <div>
                              <span style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{rule.start_time} – {rule.end_time}</span>
                              <span style={{ color: '#9ca3af', fontSize: 12, marginLeft: 12 }}>Min: {rule.min_staff} · Max: {rule.max_staff} staff</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => setEditRule(rule)} style={{ ...btnSmSecondary, padding: '5px 10px', fontSize: 12 }}>✏️</button>
                              <button onClick={() => deleteRule(rule.id)} style={{ ...btnSmDanger, padding: '5px 10px', fontSize: 12 }}>🗑</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Attendance Tab */}
        {tab === 'attendance' && (
          <AttendanceReport employees={[...employees, ...extraEmployees]} supabase={supabase} shifts={shifts} />
        )}

        {/* Employees Tab */}
        {tab === 'employees' && (
          <div style={card}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Manage Staff</h2>
            <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 2, minWidth: 120 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Name</label>
                <input placeholder="Employee name" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div style={{ flex: 1, minWidth: 100 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>PIN</label>
                <input placeholder="4-digit PIN" maxLength={4} value={newPin} onChange={e => setNewPin(e.target.value)} />
              </div>
              <div style={{ flex: 1, minWidth: 100 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Role</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ ...selectStyle, width: '100%' }}>
                  <option value="employee">Staff</option>
                  <option value="extra">Extra</option>
                </select>
              </div>
              <button onClick={addEmployee} style={{ ...btnPrimary, padding: '10px 20px' }}>+ Add</button>
            </div>
            {employees.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 14 }}>No employees yet. Add one above!</p>
            ) : employees.map(emp => (
              <EmployeeRow key={emp.id} emp={emp} onRemove={removeEmployee} supabase={supabase} onUpdate={() => fetchAll(viewingWeek)} />
            ))}
            {extraEmployees.length > 0 && (
              <>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#9ca3af', margin: '20px 0 12px' }}>Extra Workers</p>
                {extraEmployees.map(emp => (
                  <EmployeeRow key={emp.id} emp={emp} onRemove={removeEmployee} supabase={supabase} onUpdate={() => fetchAll(viewingWeek)} />
                ))}
              </>
            )}
          </div>
        )}

        {/* Stock Tab */}
        {tab === 'stock' && <StockAdmin />}

        {/* Handover Tab */}
        {tab === 'handover' && (
          <div style={card}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Handover List</h2>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>Full history including completed and deleted items.</p>

            {handoverTasks.filter(t => !t.completed && !t.deleted).length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 10, letterSpacing: '0.03em', textTransform: 'uppercase' }}>Pending</p>
                {handoverTasks.filter(t => !t.completed && !t.deleted).map(task => {
                  const isManual = task.task.includes('check-in request') || task.task.includes('check-out request')
                  const isApproving = approvingTask?.task?.id === task.id
                  const timeMatch = task.task.match(/at (\d{2}:\d{2})/)
                  const suggestedTime = timeMatch ? timeMatch[1] : new Date().toTimeString().slice(0, 5)
                  const taskDate = new Date(task.created_at).toISOString().split('T')[0]
                  return (
                  <div key={task.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0' }}>
                      {isManual ? (
                        <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: '#fffbeb', border: '2px solid #fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 11 }}>!</span>
                        </div>
                      ) : (
                        <div onClick={() => adminToggleTask(task)} style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, border: '2px solid #d1d5db', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }} />
                      )}
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{task.task}</p>
                        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                          Added by {task.added_by_name} · {new Date(task.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {isManual ? (
                        <button
                          onClick={() => setApprovingTask(isApproving ? null : { task, time: suggestedTime, date: taskDate })}
                          style={{ ...btnSmPrimary, padding: '5px 12px', background: isApproving ? '#f1f5f9' : undefined, color: isApproving ? '#475569' : undefined, boxShadow: isApproving ? 'none' : undefined }}
                        >
                          {isApproving ? 'Cancel' : '✅ Approve'}
                        </button>
                      ) : (
                        <button onClick={() => adminDeleteTask(task.id)} style={{ ...btnSmDanger, padding: '4px 10px' }}>🗑</button>
                      )}
                    </div>

                    {/* Inline approval form */}
                    {isApproving && (
                      <div style={{ background: '#f8f9fa', borderRadius: 12, padding: '14px 16px', marginBottom: 10, border: '1px solid #e5e9f0' }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>
                          Approve {task.task.includes('check-in') ? 'check-in' : 'check-out'} for <strong>{task.added_by_name}</strong>
                        </p>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                              Date
                            </label>
                            <input
                              type="date"
                              value={approvingTask.date}
                              onChange={e => setApprovingTask({ ...approvingTask, date: e.target.value })}
                              style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #e5e9f0', fontSize: 13, width: 'auto' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                              Time
                            </label>
                            <input
                              type="time"
                              value={approvingTask.time}
                              onChange={e => setApprovingTask({ ...approvingTask, time: e.target.value })}
                              style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #e5e9f0', fontSize: 13, width: 'auto' }}
                            />
                          </div>
                          <button onClick={approveManualRequest} style={{ ...btnSmPrimary }}>
                            Confirm & Log
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )})}
              </div>
            )}

            {handoverTasks.filter(t => t.completed && !t.deleted).length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#44ab51', marginBottom: 10, letterSpacing: '0.03em', textTransform: 'uppercase' }}>Completed</p>
                {handoverTasks.filter(t => t.completed && !t.deleted).map(task => (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <div onClick={() => adminToggleTask(task)} style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                      background: '#44ab51', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ color: 'white', fontSize: 13 }}>✓</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, textDecoration: 'line-through', color: '#9ca3af' }}>{task.task}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                        Added by {task.added_by_name} · Completed by {task.completed_by_name} · {task.completed_at ? new Date(task.completed_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                    <button onClick={() => adminDeleteTask(task.id)} style={{ ...btnSmDanger, padding: '4px 10px' }}>🗑</button>
                  </div>
                ))}
              </div>
            )}

            {handoverTasks.filter(t => t.deleted).length > 0 && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', marginBottom: 10, letterSpacing: '0.03em', textTransform: 'uppercase' }}>Deleted by employees</p>
                {handoverTasks.filter(t => t.deleted).map(task => (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid #f3f4f6', opacity: 0.5 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, border: '2px solid #d1d5db' }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, textDecoration: 'line-through', color: '#9ca3af' }}>{task.task}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                        Added by {task.added_by_name}{task.completed_by_name ? ` · Completed by ${task.completed_by_name}` : ''} · Deleted by {task.deleted_by_name} · {task.deleted_at ? new Date(task.deleted_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                    <button onClick={() => adminDeleteTask(task.id)} style={{ ...btnSmDanger, padding: '4px 10px' }}>🗑</button>
                  </div>
                ))}
              </div>
            )}

            {handoverTasks.length === 0 && (
              <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>No handover tasks yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Edit Shift Modal */}
      {editShift && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
          padding: 20,
        }}>
          <div style={{
            background: 'white',
            borderRadius: 20,
            padding: '28px 28px 24px',
            width: '100%',
            maxWidth: 340,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }}>
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: '#111827' }}>
              {editShift.id ? 'Edit Shift' : 'Add Shift'}
            </h3>
            <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 22 }}>
              {employees.find(e => e.id === editShift.employee_id)?.name} — {editShift.day}
            </p>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Start Time</label>
              <select value={editShift.start_time} onChange={e => setEditShift({ ...editShift, start_time: e.target.value })}
                style={{ ...selectStyle, width: '100%' }}>
                {(editShift.day === 'Friday' || editShift.day === 'Saturday' ? HOURS_LATE : HOURS).map(h => <option key={h}>{h}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>End Time</label>
              <select value={editShift.end_time} onChange={e => setEditShift({ ...editShift, end_time: e.target.value })}
                style={{ ...selectStyle, width: '100%' }}>
                {(editShift.day === 'Friday' || editShift.day === 'Saturday' ? HOURS_LATE : HOURS).map(h => <option key={h}>{h}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEditShift(null)} style={{ flex: 1, ...btnSecondary, padding: '11px' }}>Cancel</button>
              {editShift.id && (
                <button onClick={() => deleteShift(editShift.id)} style={{ flex: 1, ...btnDanger, padding: '11px' }}>Delete</button>
              )}
              <button onClick={saveShift} style={{ flex: 1, ...btnPrimary, padding: '11px', boxShadow: 'none' }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AttendanceReport({ employees, supabase, shifts }) {
  const [records, setRecords] = useState([])
  const [view, setView] = useState('weekly')
  const [loading, setLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState(0)
  const [selectedMonth, setSelectedMonth] = useState(0)
  const [showComparison, setShowComparison] = useState(false)

  useEffect(() => { fetchRecords() }, [view, selectedWeek, selectedMonth])

  const getWeekOptions = () => {
    const weeks = []
    for (let i = 0; i < 12; i++) {
      const d = new Date()
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      d.setDate(diff - i * 7)
      const start = new Date(d)
      const end = new Date(d)
      end.setDate(end.getDate() + 6)
      weeks.push({
        label: `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      })
    }
    return weeks
  }

  const getMonthOptions = () => {
    const months = []
    for (let i = 0; i < 12; i++) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const start = new Date(d.getFullYear(), d.getMonth(), 1)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      months.push({
        label: start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      })
    }
    return months
  }

  const fetchRecords = async () => {
    setLoading(true)
    const options = view === 'weekly' ? getWeekOptions() : getMonthOptions()
    const selected = options[view === 'weekly' ? selectedWeek : selectedMonth]
    const { data } = await supabase.from('attendance').select('*').gte('date', selected.startDate).lte('date', selected.endDate)
    setRecords(data || [])
    setLoading(false)
  }

  const calcHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0
    const [inH, inM] = checkIn.split(':').map(Number)
    const [outH, outM] = checkOut.split(':').map(Number)
    let mins = (outH * 60 + outM) - (inH * 60 + inM)
    if (mins < 0) mins += 24 * 60
    return Math.round(mins / 60 * 10) / 10
  }

  const calcScheduledHours = (startTime, endTime) => {
    if (!startTime || !endTime) return 0
    const [inH, inM] = startTime.split(':').map(Number)
    const [outH, outM] = endTime.split(':').map(Number)
    let mins = (outH * 60 + outM) - (inH * 60 + inM)
    if (mins < 0) mins += 24 * 60
    return Math.round(mins / 60 * 10) / 10
  }

  const getEmployeeData = (employeeId) => {
    const empRecords = records.filter(r => r.employee_id === employeeId)
    const empShifts = shifts.filter(s => s.employee_id === employeeId)
    const actualHours = empRecords.reduce((sum, r) => sum + calcHours(r.check_in, r.check_out), 0)
    const scheduledHours = empShifts.reduce((sum, s) => sum + calcScheduledHours(s.start_time, s.end_time), 0)
    const diff = Math.round((actualHours - scheduledHours) * 10) / 10
    return { actualHours, scheduledHours, diff, records: empRecords }
  }

  const totalScheduled = employees.reduce((sum, emp) => sum + getEmployeeData(emp.id).scheduledHours, 0)
  const totalWorked = employees.reduce((sum, emp) => sum + getEmployeeData(emp.id).actualHours, 0)
  const totalDiff = Math.round((totalWorked - totalScheduled) * 10) / 10

  const weekOptions = getWeekOptions()
  const monthOptions = getMonthOptions()
  const selectStyle = { padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e5e9f0', fontSize: 13, background: 'white', fontFamily: 'inherit', color: '#111827' }
  const cardStyle = { background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.05)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* View toggle */}
      <div style={{ background: 'white', borderRadius: 14, padding: 6, display: 'flex', gap: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.05)' }}>
        {['weekly', 'monthly'].map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            flex: 1, padding: '10px', borderRadius: 10,
            background: view === v ? 'linear-gradient(135deg, #44ab51 0%, #37944a 100%)' : 'transparent',
            color: view === v ? 'white' : '#6b7280',
            fontWeight: 600, fontSize: 14,
            boxShadow: view === v ? '0 4px 12px rgba(68,171,81,0.3)' : 'none',
          }}>
            {v === 'weekly' ? '📅 Weekly' : '📆 Monthly'}
          </button>
        ))}
      </div>

      <div style={cardStyle}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 8 }}>
          {view === 'weekly' ? 'Select Week' : 'Select Month'}
        </label>
        <select
          value={view === 'weekly' ? selectedWeek : selectedMonth}
          onChange={e => view === 'weekly' ? setSelectedWeek(Number(e.target.value)) : setSelectedMonth(Number(e.target.value))}
          style={{ ...selectStyle, width: '100%' }}
        >
          {(view === 'weekly' ? weekOptions : monthOptions).map((opt, i) => (
            <option key={i} value={i}>{i === 0 ? `This ${view === 'weekly' ? 'Week' : 'Month'} — ` : ''}{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Team totals */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#111827' }}>Team Totals</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'Total Scheduled', value: `${totalScheduled} hrs`, bg: '#f8f9fa', color: '#374151' },
            { label: 'Total Worked', value: `${totalWorked} hrs`, bg: '#edf8ee', color: '#44ab51' },
            { label: 'Difference', value: `${totalDiff > 0 ? '+' : ''}${totalDiff} hrs`, bg: totalDiff === 0 ? '#edf8ee' : totalDiff > 0 ? '#fffbeb' : '#fef2f2', color: totalDiff === 0 ? '#44ab51' : totalDiff > 0 ? '#d97706' : '#dc2626' },
          ].map(({ label, value, bg, color }) => (
            <div key={label} style={{ flex: 1, background: bg, borderRadius: 12, padding: '14px', textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>{label}</p>
              <p style={{ fontWeight: 700, fontSize: 20, color }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison toggle */}
      <div onClick={() => setShowComparison(!showComparison)} style={{
        background: showComparison ? '#edf8ee' : 'white',
        borderRadius: 14, padding: '14px 16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.07)',
        border: `1.5px solid ${showComparison ? '#44ab51' : '#e5e9f0'}`,
        cursor: 'pointer',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        transition: 'all 0.15s',
      }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>Scheduled vs Actual Hours</p>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Compare planned shifts with real check-in hours</p>
        </div>
        <div style={{
          width: 22, height: 22, borderRadius: 6,
          background: showComparison ? '#44ab51' : 'transparent',
          border: `2px solid ${showComparison ? '#44ab51' : '#d1d5db'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}>
          {showComparison && <span style={{ color: 'white', fontSize: 13 }}>✓</span>}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>Loading…</div>
      ) : employees.map(emp => {
        const { actualHours, scheduledHours, diff, records: empRecords } = getEmployeeData(emp.id)
        return (
          <div key={emp.id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{emp.name}</span>
              <span style={{ background: '#edf8ee', color: '#44ab51', fontWeight: 700, padding: '4px 12px', borderRadius: 20, fontSize: 13 }}>
                {actualHours} hrs worked
              </span>
            </div>
            {showComparison && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                {[
                  { label: 'Scheduled', value: `${scheduledHours} hrs`, bg: '#f8f9fa', color: '#374151' },
                  { label: 'Actual', value: `${actualHours} hrs`, bg: '#f8f9fa', color: '#44ab51' },
                  { label: 'Difference', value: `${diff > 0 ? '+' : ''}${diff} hrs`, bg: diff === 0 ? '#edf8ee' : diff > 0 ? '#fffbeb' : '#fef2f2', color: diff === 0 ? '#44ab51' : diff > 0 ? '#d97706' : '#dc2626' },
                ].map(({ label, value, bg, color }) => (
                  <div key={label} style={{ flex: 1, background: bg, borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{label}</p>
                    <p style={{ fontWeight: 700, fontSize: 15, color }}>{value}</p>
                  </div>
                ))}
              </div>
            )}
            {empRecords.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 13 }}>No check-ins recorded</p>
            ) : (
              empRecords.map(r => (
                <AttendanceRow key={r.id} record={r} supabase={supabase} onUpdate={fetchRecords} />
              ))
            )}
          </div>
        )
      })}
    </div>
  )
}

function AttendanceRow({ record, supabase, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [checkIn, setCheckIn] = useState(record.check_in || '')
  const [checkOut, setCheckOut] = useState(record.check_out || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await supabase.from('attendance').update({
      check_in: checkIn || null,
      check_out: checkOut || null
    }).eq('id', record.id)
    setSaving(false)
    setEditing(false)
    onUpdate()
  }

  if (editing) {
    return (
      <div style={{ padding: '10px 0', borderTop: '1px solid #f3f4f6' }}>
        <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>{record.date}</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {[
            { label: 'Check In', value: checkIn, setter: setCheckIn },
            { label: 'Check Out', value: checkOut, setter: setCheckOut },
          ].map(({ label, value, setter }) => (
            <div key={label}>
              <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 2 }}>{label}</label>
              <input type="time" value={value} onChange={e => setter(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #e5e9f0', fontSize: 13, width: 'auto' }} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setEditing(false)} style={{ background: '#f1f5f9', color: '#475569', padding: '7px 12px', fontSize: 12, borderRadius: 8, fontWeight: 600 }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ background: 'linear-gradient(135deg, #44ab51, #37944a)', color: 'white', padding: '7px 12px', fontSize: 12, borderRadius: 8, fontWeight: 600 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderTop: '1px solid #f3f4f6', fontSize: 13 }}>
      <span style={{ color: '#6b7280' }}>{record.date}</span>
      <span style={{ color: '#374151' }}>{record.check_in || '—'} → {record.check_out || '—'}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: '#44ab51', fontWeight: 600 }}>
          {record.check_in && record.check_out ? (() => {
            const [inH, inM] = record.check_in.split(':').map(Number)
            const [outH, outM] = record.check_out.split(':').map(Number)
            let mins = (outH * 60 + outM) - (inH * 60 + inM)
            if (mins < 0) mins += 24 * 60
            return Math.round(mins / 60 * 10) / 10
          })() : 0} hrs
        </span>
        <button onClick={() => setEditing(true)} style={{ background: '#f1f5f9', color: '#475569', padding: '4px 10px', fontSize: 12, borderRadius: 7, fontWeight: 600 }}>✏️ Edit</button>
      </div>
    </div>
  )
}

function EmployeeRow({ emp, onRemove, supabase, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(emp.name)
  const [pin, setPin] = useState(emp.pin)
  const [minDays, setMinDays] = useState(emp.min_days || 1)
  const [maxDays, setMaxDays] = useState(emp.max_days || 7)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim() || pin.length !== 4) return
    setSaving(true)
    await supabase.from('employees').update({
      name: name.trim(),
      pin,
      min_days: minDays,
      max_days: maxDays
    }).eq('id', emp.id)
    setSaving(false)
    setEditing(false)
    onUpdate()
  }

  if (editing) {
    return (
      <div style={{ padding: '14px 0', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 10 }}>
          <div style={{ flex: 2, minWidth: 120 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" />
          </div>
          <div style={{ flex: 1, minWidth: 100 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>PIN</label>
            <input value={pin} onChange={e => setPin(e.target.value)} placeholder="4-digit PIN" maxLength={4} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          {[
            { label: 'Min days/week', value: minDays, setter: setMinDays },
            { label: 'Max days/week', value: maxDays, setter: setMaxDays },
          ].map(({ label, value, setter }) => (
            <div key={label} style={{ flex: 1, minWidth: 100 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>{label}</label>
              <input type="number" min={0} max={7} value={value} onChange={e => setter(Number(e.target.value))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e5e9f0', fontSize: 14 }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setEditing(false)} style={{ background: '#f1f5f9', color: '#475569', padding: '8px 14px', fontSize: 13, borderRadius: 9, fontWeight: 600 }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ background: 'linear-gradient(135deg, #44ab51, #37944a)', color: 'white', padding: '8px 14px', fontSize: 13, borderRadius: 9, fontWeight: 600, boxShadow: '0 4px 10px rgba(68,171,81,0.3)' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: '1px solid #f3f4f6' }}>
      <div>
        <span style={{ fontWeight: 600, color: '#111827' }}>{emp.name}</span>
        <span style={{ color: '#d1d5db', fontSize: 13, marginLeft: 10 }}>PIN: {emp.pin}</span>
        <span style={{ color: '#44ab51', fontSize: 12, marginLeft: 10, fontWeight: 600 }}>{emp.min_days || 1}–{emp.max_days || 7} days/week</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setEditing(true)} style={{ background: '#f1f5f9', color: '#475569', fontSize: 13, padding: '6px 12px', borderRadius: 8, fontWeight: 600 }}>✏️ Edit</button>
        <button onClick={() => onRemove(emp.id)} style={{ background: '#fef2f2', color: '#dc2626', fontSize: 13, padding: '6px 12px', borderRadius: 8, fontWeight: 600 }}>Remove</button>
      </div>
    </div>
  )
}
