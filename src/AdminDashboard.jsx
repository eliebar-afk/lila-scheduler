import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const HOURS = ['11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '00:00']
const HOURS_LATE = ['11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '00:00', '00:30', '01:00', '01:30', '02:00']

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
    '02:00': '#795548'
  }
  return colors[startTime] || '#44ab51'
}

export default function AdminDashboard({ user, onLogout }) {
  const [employees, setEmployees] = useState([])
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
  const [extraEmployees, setExtraEmployees] = useState([])

  const getCurrentWeekStart = () => {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    return d.toISOString().split('T')[0]
  }

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async (weekFilter = null) => {
    setLoading(true)
    try {
    const weekStart = weekFilter || getCurrentWeekStart()

   const [weekOptions, setWeekOptions] = useState([])
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
    const weekStart = getCurrentWeekStart()
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
    const weekStart = getCurrentWeekStart()
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

    if (uniqueShifts.length > 0) {
      await supabase.from('shifts').insert(uniqueShifts)
    }

    setScheduleWarnings(warnings)
    fetchAll(viewingWeek)
  }

  const publishSchedule = async () => {
    const weekStart = getCurrentWeekStart()
    await supabase.from('shifts').update({ published: true }).eq('week_start', weekStart)
    alert('Schedule published! Employees can now see their shifts.')
    fetchAll(viewingWeek)
  }

  const getShift = (employeeId, day) => shifts.find(s => s.employee_id === employeeId && s.day === day)
  const getPref = (employeeId, day) => preferences.find(p => p.employee_id === employeeId && p.day === day)

  const getWeekNumber = (dateStr) => {
    const d = dateStr ? new Date(dateStr) : new Date()
    const startOfYear = new Date(d.getFullYear(), 0, 1)
    return Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7)
  }

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
      <div style={{ background: '#44ab51', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'white', fontSize: 20, fontWeight: 800 }}>🍽 Lila</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>Admin Panel</p>
        </div>
        <button onClick={onLogout} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 13 }}>Logout</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #eee', overflowX: 'auto' }}>
        {['schedule', 'rules', 'attendance', 'employees'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: 14, background: 'none', borderRadius: 0, whiteSpace: 'nowrap',
            borderBottom: tab === t ? '3px solid #44ab51' : '3px solid transparent',
            color: tab === t ? '#44ab51' : '#888', fontWeight: 600, fontSize: 12
          }}>
            {t === 'schedule' ? '📅 Schedule' : t === 'rules' ? '📋 Rules' : t === 'attendance' ? '🕐 Hours' : '👥 Staff'}
          </button>
        ))}
      </div>

      <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>

        {/* Schedule Tab */}
        {tab === 'schedule' && (
          <>
            <div style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>📅 Auto Schedule Generator</h2>
              <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>Builds the schedule automatically based on employee availability and your staffing rules.</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={generateSchedule} style={{ background: '#44ab51', color: 'white', padding: '12px 24px' }}>
                  ✨ Generate Schedule
                </button>
                <button onClick={publishSchedule} style={{ background: '#1976d2', color: 'white', padding: '12px 24px' }}>
                  🚀 Publish Schedule
                </button>
              </div>

              {scheduleWarnings.length > 0 && (
                <div style={{ marginTop: 16, padding: 14, background: '#fff8e1', borderRadius: 8, border: '1px solid #ffc107' }}>
                  <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#b8860b' }}>⚠️ Staffing Gaps Detected</p>
                  {scheduleWarnings.map((w, i) => (
                    <p key={i} style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>{w}</p>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>
                  Weekly Schedule — Week {getWeekNumber(viewingWeek)}
                </h2>
                <select
                  value={viewingWeek || ''}
                  onChange={e => { setViewingWeek(e.target.value || null); fetchAll(e.target.value || null) }}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}
                >
                  <option value="">This Week</option>
                  {weekOptions.map(w => (
                    <option key={w} value={w}>
                      Week {getWeekNumber(w)} — {new Date(w).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </option>
                  ))}
                </select>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: '#888', fontWeight: 600 }}>Employee</th>
                    {DAYS.map(d => (
                      <th key={d} style={{ padding: '8px 6px', color: '#888', fontWeight: 600, textAlign: 'center', fontSize: 12 }}>
                        {d.slice(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{emp.name}</td>
                      {DAYS.map(day => {
                        const shift = getShift(emp.id, day)
                        const pref = getPref(emp.id, day)
                        return (
                          <td key={day} style={{ padding: '6px', textAlign: 'center' }}>
                            <div
                              onClick={() => setEditShift(
    shift || {
      employee_id: emp.id,
      day,
      start_time: pref?.start_time || '11:00',
      end_time: pref?.end_time || '17:00'
    }
  )}
  style={{
                                cursor: 'pointer', borderRadius: 6, padding: '4px 2px',
                                background: shift ? `${getShiftColor(shift.start_time)}22` : pref ? '#f9fff9' : '#f9f9f9',
                                border: `1px solid ${shift ? getShiftColor(shift.start_time) : pref ? '#86c98e' : '#eee'}`,
                                minHeight: 36, display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center'
                              }}
                            >
                              {shift ? (
                                <>
                                  <span style={{ fontSize: 10, color: getShiftColor(shift.start_time), fontWeight: 700 }}>{shift.start_time}</span>
                                  <span style={{ fontSize: 10, color: getShiftColor(shift.start_time) }}>{shift.end_time}</span>
                                </>
                              ) : pref ? (
                                <span style={{ fontSize: 10, color: '#86c98e' }}>avail</span>
                              ) : (
                                <span style={{ fontSize: 16, color: '#ccc' }}>+</span>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: 12, color: '#aaa', marginTop: 12 }}>
                🟢 Scheduled &nbsp;&nbsp; 🟢 Available (not scheduled) &nbsp;&nbsp; Click any cell to add/edit a shift
              </p>
            </div>
          </>
        )}

        {/* Rules Tab */}
        {tab === 'rules' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>📋 Staffing Rules</h2>
              <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>Define how many staff you need for each time slot.</p>

              <div style={{ background: '#f9f9f9', borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>+ Add New Rule</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Day</label>
                    <select value={newRule.day} onChange={e => setNewRule({ ...newRule, day: e.target.value })}
                      style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}>
                      {DAYS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: 90 }}>
                    <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>From</label>
                    <select value={newRule.start_time} onChange={e => setNewRule({ ...newRule, start_time: e.target.value })}
                      style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}>
                      {HOURS_LATE.map(h => <option key={h}>{h}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: 90 }}>
                    <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>To</label>
                    <select value={newRule.end_time} onChange={e => setNewRule({ ...newRule, end_time: e.target.value })}
                      style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}>
                      {HOURS_LATE.map(h => <option key={h}>{h}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: 70 }}>
                    <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Min Staff</label>
                    <input type="number" min={1} max={20} value={newRule.min_staff}
                      onChange={e => setNewRule({ ...newRule, min_staff: Number(e.target.value) })}
                      style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 70 }}>
                    <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Max Staff</label>
                    <input type="number" min={1} max={20} value={newRule.max_staff}
                      onChange={e => setNewRule({ ...newRule, max_staff: Number(e.target.value) })}
                      style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }} />
                  </div>
                </div>
                <button onClick={addRule} style={{ background: '#44ab51', color: 'white', padding: '10px 20px' }}>
                  + Add Rule
                </button>
              </div>

              {DAYS.map(day => {
                const dayRules = staffingRules.filter(r => r.day === day)
                if (dayRules.length === 0) return null
                return (
                  <div key={day} style={{ marginBottom: 16 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: '#44ab51', marginBottom: 8 }}>{day}</p>
                    {dayRules.map(rule => (
                      <div key={rule.id}>
                        {editRule?.id === rule.id ? (
                          <div style={{ background: '#f0faf0', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                              <div style={{ flex: 1, minWidth: 90 }}>
                                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 3 }}>From</label>
                                <select value={editRule.start_time} onChange={e => setEditRule({ ...editRule, start_time: e.target.value })}
                                  style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid #ddd', fontSize: 12 }}>
                                  {HOURS_LATE.map(h => <option key={h}>{h}</option>)}
                                </select>
                              </div>
                              <div style={{ flex: 1, minWidth: 90 }}>
                                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 3 }}>To</label>
                                <select value={editRule.end_time} onChange={e => setEditRule({ ...editRule, end_time: e.target.value })}
                                  style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid #ddd', fontSize: 12 }}>
                                  {HOURS_LATE.map(h => <option key={h}>{h}</option>)}
                                </select>
                              </div>
                              <div style={{ flex: 1, minWidth: 60 }}>
                                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 3 }}>Min</label>
                                <input type="number" min={1} max={20} value={editRule.min_staff}
                                  onChange={e => setEditRule({ ...editRule, min_staff: Number(e.target.value) })}
                                  style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid #ddd', fontSize: 12 }} />
                              </div>
                              <div style={{ flex: 1, minWidth: 60 }}>
                                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 3 }}>Max</label>
                                <input type="number" min={1} max={20} value={editRule.max_staff}
                                  onChange={e => setEditRule({ ...editRule, max_staff: Number(e.target.value) })}
                                  style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid #ddd', fontSize: 12 }} />
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => setEditRule(null)} style={{ background: '#f0f0f0', color: '#333', padding: '6px 12px', fontSize: 12 }}>Cancel</button>
                              <button onClick={saveRule} style={{ background: '#44ab51', color: 'white', padding: '6px 12px', fontSize: 12 }}>Save</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f9f9f9', borderRadius: 8, marginBottom: 8 }}>
                            <div>
                              <span style={{ fontWeight: 600, fontSize: 13 }}>{rule.start_time} – {rule.end_time}</span>
                              <span style={{ color: '#888', fontSize: 12, marginLeft: 12 }}>Min: {rule.min_staff} · Max: {rule.max_staff} staff</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => setEditRule(rule)} style={{ background: '#f0f0f0', color: '#555', padding: '4px 10px', fontSize: 12 }}>✏️</button>
                              <button onClick={() => deleteRule(rule.id)} style={{ background: '#fee', color: '#e44', padding: '4px 10px', fontSize: 12 }}>🗑</button>
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
          <AttendanceReport employees={employees} supabase={supabase} shifts={shifts} />
        )}

        {/* Employees Tab */}
        {tab === 'employees' && (
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>👥 Manage Employees</h2>
            <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
              <input placeholder="Employee name" value={newName} onChange={e => setNewName(e.target.value)} style={{ flex: 2, minWidth: 120 }} />
              <input placeholder="4-digit PIN" maxLength={4} value={newPin} onChange={e => setNewPin(e.target.value)} style={{ flex: 1, minWidth: 100 }} />
              <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ padding: '10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}>
                <option value="employee">Staff</option>
                <option value="extra">Extra</option>
              </select>
              <button onClick={addEmployee} style={{ background: '#44ab51', color: 'white' }}>+ Add</button>
            </div>
            {employees.length === 0 ? (
              <p style={{ color: '#888', fontSize: 14 }}>No employees yet. Add one above!</p>
            ) : employees.map(emp => (
              <EmployeeRow key={emp.id} emp={emp} onRemove={removeEmployee} supabase={supabase} onUpdate={() => fetchAll(viewingWeek)} />
            ))}
            {extraEmployees.length > 0 && (
              <>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#888', margin: '20px 0 12px' }}>🧹 Extra Workers</h3>
                {extraEmployees.map(emp => (
                  <EmployeeRow key={emp.id} emp={emp} onRemove={removeEmployee} supabase={supabase} onUpdate={() => fetchAll(viewingWeek)} />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Edit Shift Modal */}
      {editShift && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '90%', maxWidth: 340 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 4 }}>{editShift.id ? 'Edit Shift' : 'Add Shift'}</h3>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>
              {employees.find(e => e.id === editShift.employee_id)?.name} — {editShift.day}
            </p>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Start Time</label>
              <select value={editShift.start_time} onChange={e => setEditShift({ ...editShift, start_time: e.target.value })}
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}>
                {(editShift.day === 'Friday' || editShift.day === 'Saturday' ? HOURS_LATE : HOURS).map(h => <option key={h}>{h}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>End Time</label>
              <select value={editShift.end_time} onChange={e => setEditShift({ ...editShift, end_time: e.target.value })}
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}>
                {(editShift.day === 'Friday' || editShift.day === 'Saturday' ? HOURS_LATE : HOURS).map(h => <option key={h}>{h}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditShift(null)} style={{ flex: 1, background: '#f0f0f0', color: '#333' }}>Cancel</button>
              {editShift.id && <button onClick={() => deleteShift(editShift.id)} style={{ flex: 1, background: '#fee', color: '#e44' }}>Delete</button>}
              <button onClick={saveShift} style={{ flex: 1, background: '#44ab51', color: 'white' }}>Save</button>
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

  const weekOptions = getWeekOptions()
  const monthOptions = getMonthOptions()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', background: 'white', borderRadius: 12, padding: 6, gap: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {['weekly', 'monthly'].map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            flex: 1, padding: 10, borderRadius: 8,
            background: view === v ? '#44ab51' : 'transparent',
            color: view === v ? 'white' : '#888', fontWeight: 600, fontSize: 14
          }}>
            {v === 'weekly' ? '📅 Weekly' : '📆 Monthly'}
          </button>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 8 }}>
          {view === 'weekly' ? 'Select Week' : 'Select Month'}
        </label>
        <select
          value={view === 'weekly' ? selectedWeek : selectedMonth}
          onChange={e => view === 'weekly' ? setSelectedWeek(Number(e.target.value)) : setSelectedMonth(Number(e.target.value))}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
        >
          {(view === 'weekly' ? weekOptions : monthOptions).map((opt, i) => (
            <option key={i} value={i}>{i === 0 ? `This ${view === 'weekly' ? 'Week' : 'Month'} — ` : ''}{opt.label}</option>
          ))}
        </select>
      </div>

      <div onClick={() => setShowComparison(!showComparison)} style={{
        background: showComparison ? '#f0faf0' : 'white', borderRadius: 12, padding: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer',
        border: `2px solid ${showComparison ? '#44ab51' : '#eee'}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: 14 }}>📊 Scheduled vs Actual Hours</p>
          <p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Compare planned shifts with real check-in hours</p>
        </div>
        <span style={{ fontSize: 20 }}>{showComparison ? '✅' : '⬜'}</span>
      </div>

      {loading ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>Loading...</div>
      ) : employees.map(emp => {
        const { actualHours, scheduledHours, diff, records: empRecords } = getEmployeeData(emp.id)
        return (
          <div key={emp.id} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{emp.name}</span>
              <span style={{ background: '#f0faf0', color: '#44ab51', fontWeight: 700, padding: '4px 12px', borderRadius: 20, fontSize: 14 }}>
                {actualHours} hrs worked
              </span>
            </div>
            {showComparison && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1, background: '#f9f9f9', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: '#aaa', marginBottom: 2 }}>Scheduled</p>
                  <p style={{ fontWeight: 700, fontSize: 16, color: '#555' }}>{scheduledHours} hrs</p>
                </div>
                <div style={{ flex: 1, background: '#f9f9f9', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: '#aaa', marginBottom: 2 }}>Actual</p>
                  <p style={{ fontWeight: 700, fontSize: 16, color: '#44ab51' }}>{actualHours} hrs</p>
                </div>
                <div style={{ flex: 1, borderRadius: 8, padding: '10px 14px', textAlign: 'center', background: diff === 0 ? '#f0faf0' : diff > 0 ? '#fff8e1' : '#fff0f0' }}>
                  <p style={{ fontSize: 11, color: '#aaa', marginBottom: 2 }}>Difference</p>
                  <p style={{ fontWeight: 700, fontSize: 16, color: diff === 0 ? '#44ab51' : diff > 0 ? '#f0a500' : '#e44' }}>
                    {diff > 0 ? `+${diff}` : diff} hrs
                  </p>
                </div>
              </div>
            )}
            {empRecords.length === 0 ? (
              <p style={{ color: '#aaa', fontSize: 13 }}>No check-ins recorded</p>
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
      <div style={{ padding: '10px 0', borderTop: '1px solid #f0f0f0' }}>
        <p style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{record.date}</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 2 }}>Check In</label>
            <input type="time" value={checkIn} onChange={e => setCheckIn(e.target.value)}
              style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 2 }}>Check Out</label>
            <input type="time" value={checkOut} onChange={e => setCheckOut(e.target.value)}
              style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }} />
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
            <button onClick={() => setEditing(false)} style={{ background: '#f0f0f0', color: '#333', padding: '6px 12px', fontSize: 12 }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ background: '#44ab51', color: 'white', padding: '6px 12px', fontSize: 12 }}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: '1px solid #f0f0f0', fontSize: 13 }}>
      <span style={{ color: '#666' }}>{record.date}</span>
      <span>{record.check_in || '—'} → {record.check_out || '—'}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#44ab51', fontWeight: 600 }}>
          {record.check_in && record.check_out ? (() => {
            const [inH, inM] = record.check_in.split(':').map(Number)
            const [outH, outM] = record.check_out.split(':').map(Number)
            let mins = (outH * 60 + outM) - (inH * 60 + inM)
            if (mins < 0) mins += 24 * 60
            return Math.round(mins / 60 * 10) / 10
          })() : 0} hrs
        </span>
        <button onClick={() => setEditing(true)} style={{ background: '#f0f0f0', color: '#555', padding: '4px 10px', fontSize: 12 }}>✏️ Edit</button>
      </div>
    </div>
  )
}

function EmployeeRow({ emp, onRemove, supabase, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(emp.name)
  const [pin, setPin] = useState(emp.pin)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim() || pin.length !== 4) return
    setSaving(true)
    await supabase.from('employees').update({ name: name.trim(), pin }).eq('id', emp.id)
    setSaving(false)
    setEditing(false)
    onUpdate()
  }

  if (editing) {
    return (
      <div style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" style={{ flex: 2, minWidth: 120 }} />
          <input value={pin} onChange={e => setPin(e.target.value)} placeholder="4-digit PIN" maxLength={4} style={{ flex: 1, minWidth: 100 }} />
          <button onClick={() => setEditing(false)} style={{ background: '#f0f0f0', color: '#333', padding: '8px 12px', fontSize: 13 }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ background: '#44ab51', color: 'white', padding: '8px 12px', fontSize: 13 }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
      <div>
        <span style={{ fontWeight: 600 }}>{emp.name}</span>
        <span style={{ color: '#aaa', fontSize: 13, marginLeft: 10 }}>PIN: {emp.pin}</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setEditing(true)} style={{ background: '#f0f0f0', color: '#555', fontSize: 13, padding: '6px 12px' }}>✏️ Edit</button>
        <button onClick={() => onRemove(emp.id)} style={{ background: '#fee', color: '#e44', fontSize: 13, padding: '6px 12px' }}>Remove</button>
      </div>
    </div>
  )
}