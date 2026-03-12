import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [accounts, setAccounts] = useState([])

  useEffect(() => {
    supabase.from('accounts')
      .select('id, name, industry, created_at, stakeholders(id, sentiment)')
      .order('name')
      .then(({ data }) => setAccounts(data || []))
  }, [])

  const sentimentScore = staks => {
    const map = { Champion:2, Supporter:1, Neutral:0, Skeptic:-1, Blocker:-2 }
    if (!staks.length) return null
    const avg = staks.reduce((s,x) => s + (map[x.sentiment]||0), 0) / staks.length
    if (avg >= 1) return { label:'Positief', color:'var(--c-champion-text)', bg:'var(--c-champion-bg)' }
    if (avg >= 0) return { label:'Neutraal', color:'var(--c-neutral-text)', bg:'var(--c-neutral-bg)' }
    if (avg >= -1) return { label:'Risico', color:'var(--c-skeptic-text)', bg:'var(--c-skeptic-bg)' }
    return { label:'Kritiek', color:'var(--c-blocker-text)', bg:'var(--c-blocker-bg)' }
  }

  const totalStakeholders = accounts.reduce((s,a) => s + (a.stakeholders?.length||0), 0)

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Dashboard</h1>
        <p style={{ color: 'var(--c-text-secondary)' }}>{accounts.length} accounts · {totalStakeholders} stakeholders</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {accounts.map(a => {
          const staks = a.stakeholders || []
          const score = sentimentScore(staks)
          return (
            <Link key={a.id} to={`/account/${a.id}`} style={{ textDecoration:'none' }}>
              <div style={{ background:'white', border:'1px solid var(--c-border)', borderRadius:4, padding:'16px 18px', transition:'box-shadow 0.15s', cursor:'pointer' }}
                onMouseEnter={e=>e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'}
                onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <div style={{ fontWeight:600, fontSize:14, color:'var(--c-text-primary)' }}>{a.name}</div>
                  {score && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:3, background:score.bg, color:score.color, fontWeight:500 }}>{score.label}</span>}
                </div>
                <div style={{ display:'flex', gap:16 }}>
                  <div>
                    <div style={{ fontSize:20, fontWeight:700, color:'var(--c-accent)' }}>{staks.length}</div>
                    <div style={{ fontSize:11, color:'var(--c-text-muted)' }}>Stakeholders</div>
                  </div>
                  <div>
                    <div style={{ fontSize:20, fontWeight:700, color:'var(--c-champion-text)' }}>{staks.filter(s=>s.sentiment==='Champion').length}</div>
                    <div style={{ fontSize:11, color:'var(--c-text-muted)' }}>Champions</div>
                  </div>
                  <div>
                    <div style={{ fontSize:20, fontWeight:700, color:'var(--c-blocker-text)' }}>{staks.filter(s=>s.sentiment==='Blocker').length}</div>
                    <div style={{ fontSize:11, color:'var(--c-text-muted)' }}>Blockers</div>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
        {accounts.length === 0 && (
          <div style={{ color:'var(--c-text-muted)', padding:'24px 0' }}>Voeg een account toe via de sidebar om te beginnen.</div>
        )}
      </div>
    </div>
  )
}
