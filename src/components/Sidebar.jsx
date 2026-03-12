import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Sidebar({ session }) {
  const [accounts, setAccounts] = useState([])
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const { id } = useParams()
  const nav = useNavigate()

  useEffect(() => { fetchAccounts() }, [])

  const fetchAccounts = async () => {
    const { data } = await supabase.from('accounts').select('id,name').order('name')
    setAccounts(data || [])
  }

  const addAccount = async () => {
    if (!newName.trim()) return
    const { data } = await supabase.from('accounts')
      .insert({ name: newName.trim(), user_id: session.user.id })
      .select().single()
    setNewName(''); setAdding(false)
    fetchAccounts()
    if (data) nav(`/account/${data.id}`)
  }

  const signOut = () => supabase.auth.signOut()
  const initials = session.user.email?.slice(0, 2).toUpperCase()

  return (
    <div style={{ width: 220, background: 'var(--c-sidebar)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', letterSpacing: '0.02em' }}>Account Mapper</span>
      </div>
      <div style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Link to="/" style={{ display: 'block', padding: '7px 16px', color: 'var(--c-sidebar-text)', textDecoration: 'none', fontSize: 13 }}
          onMouseEnter={e => e.currentTarget.style.background='var(--c-sidebar-hover)'}
          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
          ▤ Dashboard
        </Link>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        <div style={{ padding: '4px 16px 6px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--c-sidebar-text)', opacity: 0.6 }}>Accounts</div>
        {accounts.map(a => (
          <Link key={a.id} to={`/account/${a.id}`}
            style={{ display: 'block', padding: '6px 16px', color: id === a.id ? 'var(--c-sidebar-text-active)' : 'var(--c-sidebar-text)', background: id === a.id ? 'var(--c-sidebar-active)' : 'transparent', textDecoration: 'none', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {a.name}
          </Link>
        ))}
        {adding ? (
          <div style={{ padding: '6px 10px' }}>
            <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if(e.key==='Enter') addAccount(); if(e.key==='Escape') setAdding(false) }}
              placeholder="Accountnaam" style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 3, color: '#fff', padding: '5px 8px', fontSize: 12 }} />
          </div>
        ) : (
          <button onClick={() => setAdding(true)}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 16px', background: 'transparent', border: 'none', color: 'rgba(184,199,224,0.5)', fontSize: 12, cursor: 'pointer' }}>
            + Account toevoegen
          </button>
        )}
      </div>
      <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--c-sidebar-active)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#fff', flexShrink: 0 }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--c-sidebar-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.user.email}</div>
        </div>
        <button onClick={signOut} title="Uitloggen" style={{ background: 'none', border: 'none', color: 'var(--c-sidebar-text)', opacity: 0.5, fontSize: 14, cursor: 'pointer', padding: 2 }}>⏻</button>
      </div>
    </div>
  )
}
