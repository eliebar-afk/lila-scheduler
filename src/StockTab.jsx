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
  const [newCatName, setNewCatName] = useState('')
  const [editCat, setEditCat] = useState(null)
  const [newItem, setNewItem] = useState({})
  const [editItem, setEditItem] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAll()
    const channel = supabase
      .channel('stock-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_categories' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, fetchAll)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const fetchAll = async () => {
    const [{ data: cats }, { data: its }] = await Promise.all([
      supabase.from('stock_categories').select('*').order('name'),
      supabase.from('stock_items').select('*').order('name'),
    ])
    setCategories(cats || [])
    setItems(its || [])
    setLoading(false)
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

      {categories.length === 0 && (
        <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
          No categories yet. Add one above!
        </p>
      )}

      {categories.map(cat => {
        const catItems = items.filter(i => i.category_id === cat.id)
        const ni = newItem[cat.id] || { name: '', unit: '', quantity: '' }
        return (
          <div key={cat.id} style={card}>
            {/* Category header */}
            {editCat?.id === cat.id ? (
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
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#44ab51' }}>{cat.name}</h3>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setEditCat(cat)} style={{ ...btnSecondary, padding: '5px 10px', fontSize: 12 }}>✏️ Rename</button>
                  <button onClick={() => deleteCategory(cat.id)} style={{ ...btnDanger, padding: '5px 10px', fontSize: 12 }}>🗑</button>
                </div>
              </div>
            )}

            {catItems.length === 0 && (
              <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 12 }}>No items yet.</p>
            )}

            {catItems.map(item => (
              editItem?.id === item.id ? (
                <div key={item.id} style={{ background: '#edf8ee', borderRadius: 10, padding: 14, marginBottom: 8, border: '1px solid #bbdfc0' }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    <div style={{ flex: 2, minWidth: 100 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3 }}>Name</label>
                      <input value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })}
                        style={inputStyle} />
                    </div>
                    <div style={{ flex: 1, minWidth: 80 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3 }}>Unit</label>
                      <input placeholder="kg, L, pcs…" value={editItem.unit} onChange={e => setEditItem({ ...editItem, unit: e.target.value })}
                        style={inputStyle} />
                    </div>
                    <div style={{ flex: 1, minWidth: 70 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3 }}>Quantity</label>
                      <input type="number" min={0} value={editItem.quantity} onChange={e => setEditItem({ ...editItem, quantity: e.target.value })}
                        style={inputStyle} />
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
              <p style={{ fontWeight: 600, fontSize: 12, color: '#6b7280', marginBottom: 10 }}>Add item to {cat.name}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <div style={{ flex: 2, minWidth: 100 }}>
                  <input
                    placeholder="Item name"
                    value={ni.name}
                    onChange={e => setNewItem(prev => ({ ...prev, [cat.id]: { ...ni, name: e.target.value } }))}
                    onKeyDown={e => e.key === 'Enter' && addItem(cat.id)}
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 80 }}>
                  <input
                    placeholder="Unit (kg, L…)"
                    value={ni.unit}
                    onChange={e => setNewItem(prev => ({ ...prev, [cat.id]: { ...ni, unit: e.target.value } }))}
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 70 }}>
                  <input
                    type="number"
                    min={0}
                    placeholder="Qty"
                    value={ni.quantity}
                    onChange={e => setNewItem(prev => ({ ...prev, [cat.id]: { ...ni, quantity: e.target.value } }))}
                    style={inputStyle}
                  />
                </div>
              </div>
              <button onClick={() => addItem(cat.id)} style={{ ...btnPrimary, boxShadow: 'none' }}>+ Add Item</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Employee Stock Tab ───────────────────────────────────────
export function StockEmployee() {
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [customAmt, setCustomAmt] = useState({})
  const [loading, setLoading] = useState(true)

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
      supabase.from('stock_items').select('*').order('name'),
    ])
    setCategories(cats || [])
    setItems(its || [])
    setLoading(false)
  }

  const adjust = async (item, delta) => {
    const newQty = Math.max(0, item.quantity + delta)
    // Optimistic update
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i))
    await supabase.from('stock_items').update({ quantity: newQty }).eq('id', item.id)
  }

  const applyCustom = async (item) => {
    const val = Number(customAmt[item.id])
    if (!val || isNaN(val)) return
    const newQty = Math.max(0, item.quantity + val)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i))
    setCustomAmt(prev => ({ ...prev, [item.id]: '' }))
    await supabase.from('stock_items').update({ quantity: newQty }).eq('id', item.id)
  }

  if (loading) return (
    <div style={{ padding: 20, color: '#9ca3af', fontSize: 14, textAlign: 'center' }}>Loading stock…</div>
  )

  if (categories.length === 0) return (
    <div style={{ ...card, textAlign: 'center', padding: '32px 20px' }}>
      <p style={{ color: '#9ca3af', fontSize: 14 }}>No stock items yet. Ask your admin to set them up.</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {categories.map(cat => {
        const catItems = items.filter(i => i.category_id === cat.id)
        if (catItems.length === 0) return null
        return (
          <div key={cat.id} style={card}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#44ab51', marginBottom: 14 }}>{cat.name}</h3>
            {catItems.map((item, idx) => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 0',
                borderBottom: idx < catItems.length - 1 ? '1px solid #f3f4f6' : 'none',
                flexWrap: 'wrap',
              }}>
                {/* Name + unit */}
                <div style={{ flex: 1, minWidth: 100 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{item.name}</span>
                  {item.unit && <span style={{ color: '#9ca3af', fontSize: 12, marginLeft: 6 }}>{item.unit}</span>}
                </div>

                {/* −1 / qty / +1 */}
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

                {/* Bulk adjust */}
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
        )
      })}
    </div>
  )
}
