import { useState, useEffect } from 'react'
import { supabase } from './supabase'

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
  padding: '10px 18px',
  borderRadius: 10,
  boxShadow: '0 4px 12px rgba(68,171,81,0.35)',
  fontSize: 13,
  fontWeight: 700,
}
const btnSecondary = {
  background: '#f1f5f9',
  color: '#475569',
  padding: '8px 14px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
}
const btnDanger = {
  background: '#fef2f2',
  color: '#dc2626',
  padding: '8px 14px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
}
const inputStyle = {
  padding: '9px 12px',
  borderRadius: 10,
  border: '1.5px solid #e5e9f0',
  fontSize: 13,
  fontFamily: 'inherit',
  color: '#111827',
  outline: 'none',
  width: '100%',
}

// ── Admin Stock Tab ──────────────────────────────────────────
export function StockAdmin() {
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [logs, setLogs] = useState([])
  const [newCatName, setNewCatName] = useState('')
  const [editCat, setEditCat] = useState(null)
  const [newItem, setNewItem] = useState({})
  const [editItem, setEditItem] = useState(null)
  const [showLog, setShowLog] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expandedCat, setExpandedCat] = useState(null)

  useEffect(() => {
    fetchAll()
    fetchLogs()
    const channel = supabase
      .channel('stock-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_categories' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, fetchAll)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stock_logs' }, fetchLogs)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    if (editCat) setExpandedCat(editCat.id)
  }, [editCat])

  const fetchAll = async () => {
    const [{ data: cats }, { data: its }] = await Promise.all([
      supabase.from('stock_categories').select('*').order('name'),
      supabase.from('stock_items').select('*').order('created_at'),
    ])
    setCategories(cats || [])
    setItems(its || [])
    setLoading(false)
  }

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('stock_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) console.error('stock_logs fetch error:', error)
    setLogs(data || [])
  }

  const clearAllLogs = async () => {
    await supabase.from('stock_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    setLogs([])
  }

  const addCategory = async () => {
    if (!newCatName.trim()) return
    await supabase.from('stock_categories').insert({ name: newCatName.trim() })
    setNewCatName('')
  }

  const saveCategory = async () => {
    if (!editCat?.name?.trim()) return
    await supabase.from('stock_categories').update({ name: editCat.name.trim() }).eq('id', editCat.id)
    setEditCat(null)
  }

  const deleteCategory = async (id) => {
    await supabase.from('stock_categories').delete().eq('id', id)
    if (expandedCat === id) setExpandedCat(null)
  }

  const addItem = async (catId) => {
    const ni = newItem[catId]
    if (!ni?.name?.trim()) return
    await supabase.from('stock_items').insert({
      category_id: catId,
      name: ni.name.trim(),
      unit: ni.unit?.trim() || '',
      quantity: Number(ni.quantity) || 0,
    })
    setNewItem(prev => ({ ...prev, [catId]: { name: '', unit: '', quantity: '' } }))
  }

  const saveItem = async () => {
    if (!editItem) return
    await supabase.from('stock_items').update({
      name: editItem.name.trim(),
      unit: editItem.unit?.trim() || '',
      quantity: Number(editItem.quantity) || 0,
    }).eq('id', editItem.id)
    setEditItem(null)
  }

  const deleteItem = async (id) => {
    await supabase.from('stock_items').delete().eq('id', id)
  }

  if (loading) return <div style={{ padding: 20, color: '#9ca3af', fontSize: 14 }}>Loading stock…</div>

  const expandedCategory = categories.find(c => c.id === expandedCat)
  const expandedItems = expandedCategory ? items.filter(i => i.category_id === expandedCategory.id) : []
  const expandedNewItem = expandedCategory ? (newItem[expandedCategory.id] || { name: '', unit: '', quantity: '' }) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Add category */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Stock Management</h2>
        <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>
          Manage categories and items. Employees can adjust quantities.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            placeholder="New category name…"
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()}
            style={{ ...inputStyle, flex: 1, width: 'auto' }}
          />
          <button onClick={addCategory} style={{ ...btnPrimary, whiteSpace: 'nowrap' }}>+ Category</button>
        </div>
      </div>

      {/* Activity Log toggle */}
      <div
        onClick={() => setShowLog(v => !v)}
        style={{
          ...card,
          cursor: 'pointer',
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: showLog ? '#f8f9fa' : 'white',
          border: showLog ? '1.5px solid #e5e9f0' : '1px solid rgba(0,0,0,0.05)',
        }}
      >
        <div>
          <p style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>📋 Activity Log</p>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
            {logs.length > 0
              ? `${logs.length} entr${logs.length === 1 ? 'y' : 'ies'} — last by ${logs[0].employee_name}`
              : 'No activity yet'}
          </p>
        </div>
        <span style={{ fontSize: 18, color: '#9ca3af', transform: showLog ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span>
      </div>

      {showLog && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ fontSize: 12, color: '#9ca3af' }}>Last 7 days · {logs.length} entr{logs.length === 1 ? 'y' : 'ies'}</p>
            {logs.length > 0 && (
              <button
                onClick={() => { if (window.confirm('Clear all log entries?')) clearAllLogs() }}
                style={{ ...btnDanger, padding: '5px 12px', fontSize: 12 }}
              >🗑 Clear log</button>
            )}
          </div>
          {logs.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '12px 0' }}>No stock changes logged yet.</p>
          ) : (
            logs.map(log => {
              const isAdd = log.change > 0
              return (
                <div key={log.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: '1px solid #f3f4f6',
                }}>
                  <div style={{
                    flexShrink: 0,
                    minWidth: 44,
                    padding: '4px 8px',
                    borderRadius: 8,
                    background: isAdd ? '#edf8ee' : '#fef2f2',
                    color: isAdd ? '#44ab51' : '#dc2626',
                    fontWeight: 700,
                    fontSize: 13,
                    textAlign: 'center',
                  }}>
                    {isAdd ? '+' : ''}{log.change}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                      {log.item_name}
                      <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: 12, marginLeft: 6 }}>
                        ({log.category_name})
                      </span>
                    </p>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                      {log.employee_name} · {log.quantity_before} → {log.quantity_after}
                      {log.unit ? ` ${log.unit}` : ''}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {new Date(log.created_at).toLocaleString('en-GB', {
                      day: 'numeric', month: 'short',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Category grid */}
      {categories.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
          No categories yet. Add one above!
        </p>
      ) : (
        <div style={card}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', marginBottom: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Categories
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
            gap: 10,
          }}>
            {categories.map(cat => {
              const catItems = items.filter(i => i.category_id === cat.id)
              const hasEmpty = catItems.some(i => i.quantity === 0)
              const isSelected = expandedCat === cat.id
              return (
                <div
                  key={cat.id}
                  onClick={() => setExpandedCat(isSelected ? null : cat.id)}
                  style={{
                    position: 'relative',
                    background: isSelected ? '#edf8ee' : '#f8f9fa',
                    border: `2px solid ${isSelected ? '#44ab51' : '#e5e9f0'}`,
                    borderRadius: 12,
                    padding: '14px 8px 12px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  {hasEmpty && (
                    <div style={{
                      position: 'absolute', top: 7, right: 7,
                      width: 7, height: 7, borderRadius: '50%',
                      background: '#dc2626',
                    }} />
                  )}
                  <div style={{ fontSize: 20, marginBottom: 6 }}>📦</div>
                  <div style={{
                    fontWeight: 700,
                    fontSize: 12,
                    color: isSelected ? '#44ab51' : '#374151',
                    lineHeight: 1.3,
                    wordBreak: 'break-word',
                  }}>
                    {cat.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                    {catItems.length} item{catItems.length !== 1 ? 's' : ''}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Expanded category detail */}
      {expandedCategory && (
        <div style={card}>
          {editCat?.id === expandedCategory.id ? (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                value={editCat.name}
                onChange={e => setEditCat({ ...editCat, name: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && saveCategory()}
                style={{ ...inputStyle, flex: 1, width: 'auto', fontWeight: 700, fontSize: 15 }}
                autoFocus
              />
              <button onClick={() => setEditCat(null)} style={btnSecondary}>Cancel</button>
              <button onClick={saveCategory} style={{ ...btnPrimary, boxShadow: 'none' }}>Save</button>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#44ab51' }}>{expandedCategory.name}</h3>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setEditCat(expandedCategory)} style={{ ...btnSecondary, padding: '5px 10px', fontSize: 12 }}>✏️ Rename</button>
                <button onClick={() => deleteCategory(expandedCategory.id)} style={{ ...btnDanger, padding: '5px 10px', fontSize: 12 }}>🗑</button>
              </div>
            </div>
          )}

          {expandedItems.length === 0 && (
            <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 12 }}>No items yet.</p>
          )}

          {expandedItems.map(item => (
            editItem?.id === item.id ? (
              <div key={item.id} style={{ background: '#edf8ee', borderRadius: 10, padding: 14, marginBottom: 8, border: '1px solid #bbdfc0' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  <div style={{ flex: 2, minWidth: 100 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3 }}>Name</label>
                    <input value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })} style={inputStyle} />
                  </div>
                  <div style={{ flex: 1, minWidth: 80 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3 }}>Unit</label>
                    <input placeholder="kg, L, pcs…" value={editItem.unit} onChange={e => setEditItem({ ...editItem, unit: e.target.value })} style={inputStyle} />
                  </div>
                  <div style={{ flex: 1, minWidth: 70 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3 }}>Quantity</label>
                    <input type="number" min={0} value={editItem.quantity} onChange={e => setEditItem({ ...editItem, quantity: e.target.value })} style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setEditItem(null)} style={btnSecondary}>Cancel</button>
                  <button onClick={saveItem} style={{ ...btnPrimary, boxShadow: 'none' }}>Save</button>
                </div>
              </div>
            ) : (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{item.name}</span>
                  {item.unit && <span style={{ color: '#9ca3af', fontSize: 12, marginLeft: 8 }}>{item.unit}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 17, color: item.quantity === 0 ? '#dc2626' : '#44ab51', minWidth: 36, textAlign: 'right' }}>
                    {item.quantity}
                  </span>
                  <button onClick={() => setEditItem({ ...item })} style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12 }}>✏️</button>
                  <button onClick={() => deleteItem(item.id)} style={{ ...btnDanger, padding: '4px 10px', fontSize: 12 }}>🗑</button>
                </div>
              </div>
            )
          ))}

          {/* Add item form */}
          <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 14, marginTop: 14, border: '1px solid #e5e9f0' }}>
            <p style={{ fontWeight: 600, fontSize: 12, color: '#6b7280', marginBottom: 10 }}>Add item to {expandedCategory.name}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <div style={{ flex: 2, minWidth: 100 }}>
                <input
                  placeholder="Item name"
                  value={expandedNewItem.name}
                  onChange={e => setNewItem(prev => ({ ...prev, [expandedCategory.id]: { ...expandedNewItem, name: e.target.value } }))}
                  onKeyDown={e => e.key === 'Enter' && addItem(expandedCategory.id)}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1, minWidth: 80 }}>
                <input
                  placeholder="Unit (kg, L…)"
                  value={expandedNewItem.unit}
                  onChange={e => setNewItem(prev => ({ ...prev, [expandedCategory.id]: { ...expandedNewItem, unit: e.target.value } }))}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1, minWidth: 70 }}>
                <input
                  type="number"
                  min={0}
                  placeholder="Qty"
                  value={expandedNewItem.quantity}
                  onChange={e => setNewItem(prev => ({ ...prev, [expandedCategory.id]: { ...expandedNewItem, quantity: e.target.value } }))}
                  style={inputStyle}
                />
              </div>
            </div>
            <button onClick={() => addItem(expandedCategory.id)} style={{ ...btnPrimary, boxShadow: 'none' }}>+ Add Item</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Employee Stock Tab ───────────────────────────────────────
export function StockEmployee({ user }) {
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [customAmt, setCustomAmt] = useState({})
  const [loading, setLoading] = useState(true)
  const [expandedCat, setExpandedCat] = useState(null)

  useEffect(() => {
    fetchAll()
    const channel = supabase
      .channel('stock-employee')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_categories' }, fetchAll)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const fetchAll = async () => {
    const [{ data: cats }, { data: its }] = await Promise.all([
      supabase.from('stock_categories').select('*').order('name'),
      supabase.from('stock_items').select('*').order('created_at'),
    ])
    setCategories(cats || [])
    setItems(its || [])
    setLoading(false)
  }

  const writeLog = async (item, change, quantityBefore, quantityAfter) => {
    const cat = categories.find(c => c.id === item.category_id)
    const { error } = await supabase.from('stock_logs').insert({
      item_id: item.id,
      item_name: item.name,
      unit: item.unit || '',
      category_name: cat?.name || '',
      employee_id: user.id,
      employee_name: user.name,
      change,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
    })
    if (error) console.error('stock_logs insert error:', error)
  }

  const adjust = async (item, delta) => {
    const newQty = Math.max(0, item.quantity + delta)
    const actualDelta = newQty - item.quantity
    if (actualDelta === 0) return
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i))
    await supabase.from('stock_items').update({ quantity: newQty }).eq('id', item.id)
    await writeLog(item, actualDelta, item.quantity, newQty)
  }

  const applyCustom = async (item) => {
    const val = Number(customAmt[item.id])
    if (!val || isNaN(val)) return
    const newQty = Math.max(0, item.quantity + val)
    const actualDelta = newQty - item.quantity
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i))
    setCustomAmt(prev => ({ ...prev, [item.id]: '' }))
    await supabase.from('stock_items').update({ quantity: newQty }).eq('id', item.id)
    await writeLog(item, actualDelta, item.quantity, newQty)
  }

  if (loading) return (
    <div style={{ padding: 20, color: '#9ca3af', fontSize: 14, textAlign: 'center' }}>Loading stock…</div>
  )

  if (categories.length === 0) return (
    <div style={{ ...card, textAlign: 'center', padding: '32px 20px' }}>
      <p style={{ color: '#9ca3af', fontSize: 14 }}>No stock items yet. Ask your admin to set them up.</p>
    </div>
  )

  const expandedCategory = categories.find(c => c.id === expandedCat)
  const expandedItems = expandedCategory ? items.filter(i => i.category_id === expandedCategory.id) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Category grid */}
      <div style={card}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', marginBottom: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Categories
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
          gap: 10,
        }}>
          {categories.map(cat => {
            const catItems = items.filter(i => i.category_id === cat.id)
            if (catItems.length === 0) return null
            const hasEmpty = catItems.some(i => i.quantity === 0)
            const isSelected = expandedCat === cat.id
            return (
              <div
                key={cat.id}
                onClick={() => setExpandedCat(isSelected ? null : cat.id)}
                style={{
                  position: 'relative',
                  background: isSelected ? '#edf8ee' : '#f8f9fa',
                  border: `2px solid ${isSelected ? '#44ab51' : '#e5e9f0'}`,
                  borderRadius: 12,
                  padding: '14px 8px 12px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                {hasEmpty && (
                  <div style={{
                    position: 'absolute', top: 7, right: 7,
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#dc2626',
                  }} />
                )}
                <div style={{ fontSize: 20, marginBottom: 6 }}>📦</div>
                <div style={{
                  fontWeight: 700,
                  fontSize: 12,
                  color: isSelected ? '#44ab51' : '#374151',
                  lineHeight: 1.3,
                  wordBreak: 'break-word',
                }}>
                  {cat.name}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                  {catItems.length} item{catItems.length !== 1 ? 's' : ''}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Expanded category items */}
      {expandedCategory && expandedItems.length > 0 && (
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#44ab51', marginBottom: 14 }}>{expandedCategory.name}</h3>
          {expandedItems.map((item, idx) => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 0',
              borderBottom: idx < expandedItems.length - 1 ? '1px solid #f3f4f6' : 'none',
              flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, minWidth: 100 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{item.name}</span>
                {item.unit && <span style={{ color: '#9ca3af', fontSize: 12, marginLeft: 6 }}>{item.unit}</span>}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => adjust(item, -1)}
                  disabled={item.quantity === 0}
                  style={{
                    width: 34, height: 34, borderRadius: 9,
                    background: item.quantity === 0 ? '#f3f4f6' : '#fef2f2',
                    color: item.quantity === 0 ? '#d1d5db' : '#dc2626',
                    fontWeight: 700, fontSize: 20, lineHeight: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >−</button>
                <span style={{
                  fontWeight: 700, fontSize: 18,
                  color: item.quantity === 0 ? '#dc2626' : '#111827',
                  minWidth: 40, textAlign: 'center',
                }}>
                  {item.quantity}
                </span>
                <button
                  onClick={() => adjust(item, 1)}
                  style={{
                    width: 34, height: 34, borderRadius: 9,
                    background: '#edf8ee', color: '#44ab51',
                    fontWeight: 700, fontSize: 20, lineHeight: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >+</button>
              </div>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="number"
                  placeholder="±qty"
                  value={customAmt[item.id] || ''}
                  onChange={e => setCustomAmt(prev => ({ ...prev, [item.id]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && applyCustom(item)}
                  style={{ width: 60, padding: '6px 8px', borderRadius: 8, border: '1.5px solid #e5e9f0', fontSize: 13, textAlign: 'center', outline: 'none', fontFamily: 'inherit' }}
                />
                <button
                  onClick={() => applyCustom(item)}
                  style={{ padding: '6px 12px', background: '#f1f5f9', color: '#475569', borderRadius: 8, fontSize: 12, fontWeight: 600 }}
                >Apply</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
