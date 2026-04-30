import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const HOURS = ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00']

export default function AdminDashboard({ user, onLogout }) {
  const [employees, setEmployees] = useState([])
  const [shifts, setShifts] = useState([])
  const [preferences, setPreferences] = useState([])
  const [tab, setTab] = useState('schedule')
  const [newName, setNewName] = useState('')
  const [newPin, setNewPin] = useState('')
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [editShift, setEditShift] = useState(null)
  const [minStaff, setMinStaff] = useState(2)
  const [restaurantRules, setRestaurantRules] = useState('')
  const [weekNotes, setWeekNotes] = useState('')
  const [settingsSaved, setSettingsSaved] = useState(false)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: emps }, { data: sh }, { data: prefs }, { data: sets }] = await Promise.all([
      supabase.from('employees').select('*').eq('role', 'employee'),
      supabase.from('shifts').select('*'),
      supabase.from('preferences').select('*'),
      supabase.from('settings').select('*')
    ])
    setEmployees(emps || [])
    setShifts(sh || [])
    setPreferences(prefs || [])
    if (sets) {
      const rules = sets.find(s => s.id === 'restaurant_rules')
      const notes = sets.find(s => s.id === 'week_notes')
      if (rules) setRestaurantRules(rules.value)
      if (notes) setWeekNotes(notes.value)
    }
    setLoading(false)
  }

  const addEmployee = async () => {
    if (!newName.trim() || newPin.length !== 4) return
    await supabase.from('employees').insert({ name: newName.trim(), pin: newPin, role: 'employee' })
    setNewName('')
    setNewPin('')
    fetchAll()
  }

  const removeEmployee = async (id) => {
    await supabase.from('employees').delete().eq('id', id)
    await supabase.from('shifts').delete().eq('employee_id', id)
    await supabase.from('preferences').delete().eq('employee_id', id)
    fetchAll()
  }

  const saveShift = async () => {
    if (!editShift) return
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
        end_time: editShift.end_time
      })
    }
    setEditShift(null)
    fetchAll()
  }

  const saveSettings = async () => {
    await supabase.from('settings').upsert([
      { id: 'restaurant_rules', value: restaurantRules },
      { id: 'week_notes', value: weekNotes }
    ])
    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 2000)
  }

  const deleteShift = async (id) => {
    await supabase.from('shifts').delete().eq('id', id)
    setEditShift(null)
    fetchAll()
  }

  const getShift = (employeeId, day) =>
    shifts.find(s => s.employee_id === employeeId && s.day === day)

  const getPref = (employeeId, day) =>
    preferences.find(p => p.employee_id === employeeId && p.day === day)

  const generateAISchedule = async () => {
    setAiLoading(true)
    const prefSummary = employees.map(emp => {
      const empPrefs = preferences.filter(p => p.employee_id === emp.id)
      if (empPrefs.length === 0) return `${emp.name}: no preferences submitted`
      return `${emp.name}: available on ${empPrefs.map(p => `${p.day} (${p.start_time}–${p.end_time})`).join(', ')}`
    }).join('\n')

    const prompt = `You are a restaurant scheduling assistant for Lila restaurant.
The restaurant is open every day from 11:00 to 00:00.
Minimum staff required per day: ${minStaff}

PERMANENT RESTAURANT RULES (always follow these):
${restaurantRules || 'No specific rules set.'}

SPECIAL INSTRUCTIONS FOR THIS WEEK:
${weekNotes || 'No special instructions for this week.'}

Employee availability this week:
${prefSummary}

Generate a weekly schedule following all the rules above. Assign shifts only on days employees are available and within their preferred hours.

Respond ONLY with a valid JSON array, no explanation, no markdown, like this:
[{"employee_name":"Sara","day":"Monday","start_time":"11:00","end_time":"17:00"},...]`

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      )
      const data = await response.json()
      console.log('Gemini response:', JSON.stringify(data))
      const text = data.candidates[0].content.parts[0].text
      const clean = text.replace(/```json|```/g, '').trim()
      const schedule = JSON.parse(clean)

      const { error: deleteError } = await supabase.from('shifts').delete().gt('created_at', '2000-01-01')
      console.log('Delete error:', deleteError)

      const rows = schedule.map(s => {
        const emp = employees.find(e => e.name === s.employee_name)
        if (!emp) return null
        return { employee_id: emp.id, day: s.day, start_time: s.start_time, end_time: s.end_time }
      }).filter(Boolean)

      console.log('Inserting rows:', rows)
      if (rows.length > 0) await supabase.from('shifts').insert(rows)
      await fetchAll()
    } catch (e) {
      console.error('AI error:', e)
      alert('AI scheduling failed. Please try again.')
    }
    setAiLoading(false)
  }

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
      <div style={{ background: '#e8723a', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'white', fontSize: 20, fontWeight: 800 }}>🍽 Lila</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>Admin Panel</p>
        </div>
        <button onClick={onLogout} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 13 }}>Logout</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #eee' }}>
        {['schedule', 'settings', 'employees'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: 14, background: 'none', borderRadius: 0,
              borderBottom: tab === t ? '3px solid #e8723a' : '3px solid transparent',
              color: tab === t ? '#e8723a' : '#888', fontWeight: 600, fontSize: 14
            }}
          >
            {t === 'schedule' ? '📅 Schedule' : t === 'settings' ? '⚙️ Instructions' : '👥 Employees'}
          </button>
        ))}
      </div>

      <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>

        {/* Schedule Tab */}
        {tab === 'schedule' && (
          <>
            <div style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>🤖 AI Schedule Generator</h2>
              <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>Set your minimum staffing and let AI build the schedule based on employee availability.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <label style={{ fontSize: 14, fontWeight: 600 }}>Min staff per day:</label>
                <input
                  type="number" min={1} max={10}
                  value={minStaff}
                  onChange={e => setMinStaff(Number(e.target.value))}
                  style={{ width: 70 }}
                />
              </div>
              <button
                onClick={generateAISchedule}
                disabled={aiLoading}
                style={{ background: '#e8723a', color: 'white', padding: '12px 24px' }}
              >
                {aiLoading ? '⏳ Generating...' : '✨ Generate Schedule with AI'}
              </button>
            </div>

            <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Weekly Schedule</h2>
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
                              onClick={() => setEditShift(shift || { employee_id: emp.id, day, start_time: pref?.start_time || '11:00', end_time: pref?.end_time || '17:00' })}
                              style={{
                                cursor: 'pointer', borderRadius: 6, padding: '4px 2px',
                                background: shift ? '#fff4ef' : pref ? '#f0faf0' : '#f9f9f9',
                                border: `1px solid ${shift ? '#e8723a' : pref ? '#86c98e' : '#eee'}`,
                                minHeight: 36, display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center'
                              }}
                            >
                              {shift ? (
                                <>
                                  <span style={{ fontSize: 10, color: '#e8723a', fontWeight: 700 }}>{shift.start_time}</span>
                                  <span style={{ fontSize: 10, color: '#e8723a' }}>{shift.end_time}</span>
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
                🟠 Scheduled &nbsp;&nbsp; 🟢 Available (not scheduled) &nbsp;&nbsp; Click any cell to add/edit a shift
              </p>
            </div>
          </>
        )}

        {/* Instructions Tab */}
        {tab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>📋 Permanent Restaurant Rules</h2>
              <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>These rules apply every week when generating the schedule. Example: "Always have at least 2 people on Saturday night", "Elie never works Mondays".</p>
              <textarea
                value={restaurantRules}
                onChange={e => setRestaurantRules(e.target.value)}
                placeholder="Write your permanent rules here..."
                style={{ width: '100%', height: 160, padding: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>🗓 This Week's Special Instructions</h2>
              <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>One-time notes for this week only. Example: "Christmas week, restaurant closes at 20:00", "We need extra staff on Friday".</p>
              <textarea
                value={weekNotes}
                onChange={e => setWeekNotes(e.target.value)}
                placeholder="Write this week's special instructions here..."
                style={{ width: '100%', height: 120, padding: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            <button
              onClick={saveSettings}
              style={{ background: '#e8723a', color: 'white', padding: 14, fontSize: 15 }}
            >
              {settingsSaved ? '✓ Saved!' : 'Save Instructions'}
            </button>
          </div>
        )}

        {/* Employees Tab */}
        {tab === 'employees' && (
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>👥 Manage Employees</h2>

            <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
              <input
                placeholder="Employee name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                style={{ flex: 2, minWidth: 120 }}
              />
              <input
                placeholder="4-digit PIN"
                maxLength={4}
                value={newPin}
                onChange={e => setNewPin(e.target.value)}
                style={{ flex: 1, minWidth: 100 }}
              />
              <button onClick={addEmployee} style={{ background: '#e8723a', color: 'white' }}>
                + Add
              </button>
            </div>

            {employees.length === 0 ? (
              <p style={{ color: '#888', fontSize: 14 }}>No employees yet. Add one above!</p>
            ) : (
              employees.map(emp => (
                <div key={emp.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 0', borderBottom: '1px solid #f0f0f0'
                }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{emp.name}</span>
                    <span style={{ color: '#aaa', fontSize: 13, marginLeft: 10 }}>PIN: {emp.pin}</span>
                  </div>
                  <button
                    onClick={() => removeEmployee(emp.id)}
                    style={{ background: '#fee', color: '#e44', fontSize: 13, padding: '6px 12px' }}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Edit Shift Modal */}
      {editShift && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '90%', maxWidth: 340 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 4 }}>
              {editShift.id ? 'Edit Shift' : 'Add Shift'}
            </h3>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>
              {employees.find(e => e.id === editShift.employee_id)?.name} — {editShift.day}
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Start Time</label>
              <select
                value={editShift.start_time}
                onChange={e => setEditShift({ ...editShift, start_time: e.target.value })}
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
              >
                {HOURS.map(h => <option key={h}>{h}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>End Time</label>
              <select
                value={editShift.end_time}
                onChange={e => setEditShift({ ...editShift, end_time: e.target.value })}
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
              >
                {HOURS.map(h => <option key={h}>{h}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditShift(null)} style={{ flex: 1, background: '#f0f0f0', color: '#333' }}>Cancel</button>
              {editShift.id && (
                <button onClick={() => deleteShift(editShift.id)} style={{ flex: 1, background: '#fee', color: '#e44' }}>Delete</button>
              )}
              <button onClick={saveShift} style={{ flex: 1, background: '#e8723a', color: 'white' }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}