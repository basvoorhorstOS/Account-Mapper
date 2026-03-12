import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const STATUS_STYLE = {
  Open:        { bg: '#FFF8E6', color: '#7A5200', border: '#F0B429' },
  'In Progress': { bg: '#EBF0FF', color: '#1340CC', border: '#1A56FF' },
  Done:        { bg: '#E6F9F0', color: '#0A6640', border: '#4CAF50' },
}

const empty = { title: '', owner: '', due_date: '', status: 'Open' }

export default function AccountActions({ accountId, userId }) {
  const [actions, setActions] = useState([])
  const [form, setForm] = useState(empty)
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState(null)

  useEffect(() => { fetchActions() }, [accountId])

  const fetchActions = async () => {
    const { data } = await supabase.from('actions').select('*')
      .eq('account_id', accountId).order('due_date', { ascending: true, nullsFirst: false })
    setActions(data || [])
  }

  const save = async () => {
    if (!form.title.trim()) return
    const payload = { ...form, account_id: accountId, user_id: userId, due_date: form.due_date || null }
    if (editId) {
      await supabase.from('actions').update(payload).eq('id', editId)
      setEditId(null)
    } else {
      await supabase.from('actions').insert(payload)
    }
    setForm(empty); setAdding(false)
    fetchActions()
  }

  const updateStatus = async (id, status) => {
    await supabase.from('actions').update({ status }).eq('id', id)
    fetchActions()
  }

  const deleteAction = async (id) => {
    await supabase.from('actions').delete().eq('id', id)
    fetchActions()
  }

  const startEdit = (a) => {
    setForm({ title: a.title, owner: a.owner || '', due_date: a.due_date || '', status: a.status })
    setEditId(a.id); setAdding(true)
  }

  const isOverdue = (a) => a.due_date && a.status !== 'Done' && new Date(a.due_date) < new Date()

  const open = actions.filter(a => a.status !== 'Done')
  const done = actions.filter(a => a.status === 'Done')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1A56FF' }}>{open.length}</div>
            <div style={{ fontSize: 11, color: '#8A96A8' }}>Open</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#FF5C4D' }}>{actions.filter(a => isOverdue(a)).length}</div>
            <div style={{ fontSize: 11, color: '#8A96A8' }}>Verlopen</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#4CAF50' }}>{done.length}</div>
            <div style={{ fontSize: 11, color: '#8A96A8' }}>Klaar</div>
          </div>
        </div>
        <button onClick={() => { setAdding(true); setEditId(null); setForm(empty) }} className="btn-primary">
          + Actie toevoegen
        </button>
      </div>

      {/* Form */}
      {adding && (
        <div style={{ background: 'white', border: '1px solid #1A56FF', borderRadius: 8, padding: '16px 18px', marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px 140px', gap: 10, marginBottom: 10 }}>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Omschrijving actie *" autoFocus />
            <input value={form.owner} onChange={e => setForm(p => ({ ...p, owner: e.target.value }))}
              placeholder="Eigenaar" />
            <input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              <option>Open</option>
              <option>In Progress</option>
              <option>Done</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => { setAdding(false); setEditId(null) }} className="btn-secondary">Annuleer</button>
            <button onClick={save} className="btn-primary">{editId ? 'Bijwerken' : 'Toevoegen'}</button>
          </div>
        </div>
      )}

      {/* Open actions */}
      {open.length > 0 && (
        <div style={{ background: 'white', border: '1px solid #E2DFD5', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8F7F4' }}>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#8A96A8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Actie</th>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#8A96A8', textTransform: 'uppercase', letterSpacing: '0.06em', width: 140 }}>Eigenaar</th>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#8A96A8', textTransform: 'uppercase', letterSpacing: '0.06em', width: 120 }}>Deadline</th>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#8A96A8', textTransform: 'uppercase', letterSpacing: '0.06em', width: 130 }}>Status</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {open.map(a => {
                const ss = STATUS_STYLE[a.status] || STATUS_STYLE.Open
                const overdue = isOverdue(a)
                return (
                  <tr key={a.id} style={{ borderTop: '1px solid #E2DFD5' }}>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: '#0F1B3C', fontWeight: 500 }}>
                      {overdue && <span style={{ color: '#FF5C4D', marginRight: 6, fontSize: 12 }}>●</span>}
                      {a.title}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: '#4A5568' }}>{a.owner || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: overdue ? '#FF5C4D' : '#4A5568', fontWeight: overdue ? 600 : 400 }}>
                      {a.due_date ? new Date(a.due_date).toLocaleDateString('nl-NL') : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <select value={a.status} onChange={e => updateStatus(a.id, e.target.value)}
                        style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, border: `1px solid ${ss.border}`, background: ss.bg, color: ss.color, fontWeight: 600, cursor: 'pointer' }}>
                        <option>Open</option>
                        <option>In Progress</option>
                        <option>Done</option>
                      </select>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <button onClick={() => startEdit(a)} className="btn-ghost" style={{ fontSize: 12 }}>Bewerk</button>
                      <button onClick={() => deleteAction(a.id)} className="btn-ghost" style={{ fontSize: 12, color: '#FF5C4D' }}>✕</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Done */}
      {done.length > 0 && (
        <details style={{ background: 'white', border: '1px solid #E2DFD5', borderRadius: 8, overflow: 'hidden' }}>
          <summary style={{ padding: '10px 14px', fontSize: 12, color: '#8A96A8', cursor: 'pointer', fontWeight: 500 }}>
            ✓ {done.length} voltooide acties
          </summary>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {done.map(a => (
                <tr key={a.id} style={{ borderTop: '1px solid #E2DFD5', opacity: 0.6 }}>
                  <td style={{ padding: '8px 14px', fontSize: 13, color: '#4A5568', textDecoration: 'line-through' }}>{a.title}</td>
                  <td style={{ padding: '8px 14px', fontSize: 13, color: '#8A96A8', width: 140 }}>{a.owner || '—'}</td>
                  <td style={{ padding: '8px 14px', fontSize: 13, color: '#8A96A8', width: 120 }}>{a.due_date ? new Date(a.due_date).toLocaleDateString('nl-NL') : '—'}</td>
                  <td style={{ padding: '8px 14px', width: 130 }}>
                    <select value={a.status} onChange={e => updateStatus(a.id, e.target.value)}
                      style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, border: '1px solid #4CAF50', background: '#E6F9F0', color: '#0A6640', fontWeight: 600, cursor: 'pointer' }}>
                      <option>Open</option><option>In Progress</option><option>Done</option>
                    </select>
                  </td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', width: 80 }}>
                    <button onClick={() => deleteAction(a.id)} className="btn-ghost" style={{ fontSize: 12, color: '#FF5C4D' }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      {actions.length === 0 && !adding && (
        <div style={{ color: '#8A96A8', padding: '32px 0', textAlign: 'center', fontSize: 13 }}>
          Nog geen acties — klik op "+ Actie toevoegen" om te beginnen.
        </div>
      )}
    </div>
  )
}