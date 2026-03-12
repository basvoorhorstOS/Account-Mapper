import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const emptyNote = { title: '', meeting_date: new Date().toISOString().slice(0, 10), body: '' }

export default function AccountNotes({ accountId, userId }) {
  const [notes, setNotes] = useState([])
  const [form, setForm] = useState(emptyNote)
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState(null)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => { fetchNotes() }, [accountId])

  const fetchNotes = async () => {
    const { data } = await supabase.from('notes').select('*')
      .eq('account_id', accountId).order('meeting_date', { ascending: false })
    setNotes(data || [])
  }

  const save = async () => {
    if (!form.body.trim()) return
    const payload = { ...form, account_id: accountId, user_id: userId }
    if (editId) {
      await supabase.from('notes').update(payload).eq('id', editId)
      setEditId(null)
    } else {
      await supabase.from('notes').insert(payload)
    }
    setForm(emptyNote); setAdding(false)
    fetchNotes()
  }

  const deleteNote = async (id) => {
    await supabase.from('notes').delete().eq('id', id)
    fetchNotes()
  }

  const startEdit = (n) => {
    setForm({ title: n.title || '', meeting_date: n.meeting_date, body: n.body })
    setEditId(n.id); setAdding(true)
  }

  const fmt = (d) => new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })

  // Group notes by month
  const grouped = notes.reduce((acc, n) => {
    const key = new Date(n.meeting_date).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
    if (!acc[key]) acc[key] = []
    acc[key].push(n)
    return acc
  }, {})

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#4A5568' }}>{notes.length} notities</div>
        <button onClick={() => { setAdding(true); setEditId(null); setForm(emptyNote) }} className="btn-primary">
          + Notitie toevoegen
        </button>
      </div>

      {/* Form */}
      {adding && (
        <div style={{ background: 'white', border: '1px solid #1A56FF', borderRadius: 8, padding: '16px 18px', marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 10, marginBottom: 10 }}>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Titel (bijv. QBR meeting, check-in call)" autoFocus />
            <input type="date" value={form.meeting_date} onChange={e => setForm(p => ({ ...p, meeting_date: e.target.value }))} />
          </div>
          <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
            rows={6} placeholder="Notities, beslissingen, actiepunten, context…"
            style={{ width: '100%', resize: 'vertical', border: '1px solid #E2DFD5', borderRadius: 6, padding: '10px 12px', fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#0F1B3C', outline: 'none', marginBottom: 10 }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => { setAdding(false); setEditId(null) }} className="btn-secondary">Annuleer</button>
            <button onClick={save} className="btn-primary">{editId ? 'Bijwerken' : 'Opslaan'}</button>
          </div>
        </div>
      )}

      {/* Notes grouped by month */}
      {Object.entries(grouped).map(([month, monthNotes]) => (
        <div key={month} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8A96A8', marginBottom: 10, paddingBottom: 6, borderBottom: '2px solid #E2DFD5' }}>
            {month}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {monthNotes.map(n => (
              <div key={n.id} style={{ background: 'white', border: '1px solid #E2DFD5', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer' }}
                  onClick={() => setExpanded(expanded === n.id ? null : n.id)}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ background: '#EBF0FF', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: '#1A56FF', whiteSpace: 'nowrap' }}>
                      {fmt(n.meeting_date)}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0F1B3C' }}>
                      {n.title || 'Notitie'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <button onClick={e => { e.stopPropagation(); startEdit(n) }} className="btn-ghost" style={{ fontSize: 12 }}>Bewerk</button>
                    <button onClick={e => { e.stopPropagation(); deleteNote(n.id) }} className="btn-ghost" style={{ fontSize: 12, color: '#FF5C4D' }}>✕</button>
                    <span style={{ fontSize: 12, color: '#8A96A8', marginLeft: 4 }}>{expanded === n.id ? '▲' : '▼'}</span>
                  </div>
                </div>
                {expanded === n.id && (
                  <div style={{ padding: '0 16px 14px', borderTop: '1px solid #F0EDE4' }}>
                    <pre style={{ margin: '12px 0 0', fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#4A5568', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{n.body}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {notes.length === 0 && !adding && (
        <div style={{ color: '#8A96A8', padding: '32px 0', textAlign: 'center', fontSize: 13 }}>
          Nog geen notities — klik op "+ Notitie toevoegen" om te beginnen.
        </div>
      )}
    </div>
  )
}