import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { SentimentBadge, InfluenceBadge } from '../components/Badge'
import StakeholderForm from '../components/StakeholderForm'
import OrgChart from '../components/OrgChart'
import AccountPlan from './AccountPlan'
import AccountActions from './AccountActions'
import AccountNotes from './AccountNotes'

const SENTIMENTS = ['Champion', 'Supporter', 'Neutral', 'Skeptic', 'Blocker']
const TABS = ['Stakeholders', 'Plan', 'Acties', 'Notities']

export default function Account() {
  const { id } = useParams()
  const [account, setAccount] = useState(null)
  const [stakeholders, setStakeholders] = useState([])
  const [session, setSession] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [view, setView] = useState('table')
  const [tab, setTab] = useState('Stakeholders')
  const [filterSentiment, setFilterSentiment] = useState('All')
  const [filterRegion, setFilterRegion] = useState('All')
  const [filterBU, setFilterBU] = useState('All')
  const [search, setSearch] = useState('')
  const [actionCount, setActionCount] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    fetchData()
  }, [id])

  useEffect(() => {
    if (!id) return
    supabase.from('actions').select('id', { count: 'exact' })
      .eq('account_id', id).neq('status', 'Done')
      .then(({ count }) => setActionCount(count || 0))
  }, [id, tab])

  const fetchData = async () => {
    const [{ data: acc }, { data: staks }] = await Promise.all([
      supabase.from('accounts').select('*').eq('id', id).single(),
      supabase.from('stakeholders').select('*').eq('account_id', id).order('name')
    ])
    setAccount(acc)
    setStakeholders(staks || [])
  }

  const deleteStakeholder = async (sid) => {
    if (!confirm('Stakeholder verwijderen?')) return
    await supabase.from('stakeholders').delete().eq('id', sid)
    fetchData()
  }

  if (!account) return <div style={{ color: '#8A96A8' }}>Laden…</div>

  const regions = ['All', ...new Set(stakeholders.map(s => s.region).filter(Boolean))]
  const bus = ['All', ...new Set(stakeholders.map(s => s.business_unit).filter(Boolean))]

  const filtered = stakeholders.filter(s =>
    (filterSentiment === 'All' || s.sentiment === filterSentiment) &&
    (filterRegion === 'All' || s.region === filterRegion) &&
    (filterBU === 'All' || s.business_unit === filterBU) &&
    (!search || s.name.toLowerCase().includes(search.toLowerCase()) || s.title?.toLowerCase().includes(search.toLowerCase()))
  )

  const counts = SENTIMENTS.reduce((a, s) => ({ ...a, [s]: stakeholders.filter(x => x.sentiment === s).length }), {})

  const grouped = filtered.reduce((acc, s) => {
    const geo = [s.country, s.region].filter(Boolean).join(' / ') || 'Onbekend'
    const bu = s.business_unit || 'Algemeen'
    if (!acc[geo]) acc[geo] = {}
    if (!acc[geo][bu]) acc[geo][bu] = []
    acc[geo][bu].push(s)
    return acc
  }, {})

  // Health score
  const sentMap = { Champion: 2, Supporter: 1, Neutral: 0, Skeptic: -1, Blocker: -2 }
  const avgSentiment = stakeholders.length
    ? stakeholders.reduce((s, x) => s + (sentMap[x.sentiment] || 0), 0) / stakeholders.length
    : 0
  const healthScore = Math.round(((avgSentiment + 2) / 4) * 100)
  const healthColor = healthScore >= 70 ? '#4CAF50' : healthScore >= 40 ? '#F0B429' : '#FF5C4D'
  const healthLabel = healthScore >= 70 ? 'Gezond' : healthScore >= 40 ? 'Aandacht nodig' : 'Risico'

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F1B3C', marginBottom: 4 }}>{account.name}</h1>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#4A5568' }}>{stakeholders.length} stakeholders</span>
            <span style={{ width: 1, height: 14, background: '#E2DFD5' }} />
            <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 20, background: healthColor + '22', color: healthColor, fontWeight: 600, border: `1px solid ${healthColor}` }}>
              ● {healthLabel} ({healthScore}%)
            </span>
          </div>
        </div>
        {tab === 'Stakeholders' && (
          <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary">
            + Stakeholder
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #E2DFD5' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '8px 20px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? '#1A56FF' : 'transparent'}`, marginBottom: -2, cursor: 'pointer', fontSize: 13, fontWeight: tab === t ? 600 : 400, color: tab === t ? '#1A56FF' : '#4A5568', transition: 'all 0.15s', position: 'relative' }}>
            {t}
            {t === 'Acties' && actionCount > 0 && (
              <span style={{ marginLeft: 6, background: '#FF5C4D', color: 'white', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>{actionCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Stakeholders */}
      {tab === 'Stakeholders' && (
        <div>
          {/* Sentiment tiles */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {SENTIMENTS.map(s => (
              <div key={s} onClick={() => setFilterSentiment(filterSentiment === s ? 'All' : s)}
                style={{ padding: '8px 14px', border: `1px solid ${filterSentiment === s ? '#1A56FF' : '#E2DFD5'}`, borderRadius: 6, background: filterSentiment === s ? '#EBF0FF' : 'white', cursor: 'pointer', textAlign: 'center', minWidth: 80 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1A56FF' }}>{counts[s]}</div>
                <div style={{ fontSize: 11, color: '#4A5568' }}>{s}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Zoek op naam of functie…" style={{ width: 220 }} />
            <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)} style={{ width: 140 }}>
              {regions.map(r => <option key={r}>{r}</option>)}
            </select>
            <select value={filterBU} onChange={e => setFilterBU(e.target.value)} style={{ width: 160 }}>
              {bus.map(b => <option key={b}>{b}</option>)}
            </select>
            {(filterSentiment !== 'All' || filterRegion !== 'All' || filterBU !== 'All' || search) && (
              <button onClick={() => { setFilterSentiment('All'); setFilterRegion('All'); setFilterBU('All'); setSearch('') }} className="btn-ghost" style={{ fontSize: 12 }}>Wis filters</button>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              {['table', 'map', 'orgchart'].map(v => (
                <button key={v} onClick={() => setView(v)}
                  style={{ padding: '5px 12px', border: `1px solid ${view === v ? '#1A56FF' : '#E2DFD5'}`, borderRadius: 6, background: view === v ? '#EBF0FF' : 'white', color: view === v ? '#1A56FF' : '#4A5568', fontWeight: view === v ? 600 : 400, fontSize: 12 }}>
                  {v === 'table' ? 'Tabel' : v === 'map' ? 'Kaart' : 'Org Chart'}
                </button>
              ))}
            </div>
          </div>

          {/* Table view */}
          {view === 'table' && (
            <div style={{ background: 'white', border: '1px solid #E2DFD5', borderRadius: 8, overflow: 'hidden' }}>
              <table>
                <thead>
                  <tr>
                    <th>Naam</th><th>Functie</th><th>Business Unit</th><th>Regio / Land</th>
                    <th>Rol</th><th>Invloed</th><th>Sentiment</th><th>Laatste contact</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 500 }}>{s.name}</td>
                      <td style={{ color: '#4A5568' }}>{s.title || '—'}</td>
                      <td style={{ color: '#4A5568' }}>{s.business_unit || '—'}</td>
                      <td style={{ color: '#4A5568' }}>{[s.region, s.country].filter(Boolean).join(', ') || '—'}</td>
                      <td style={{ color: '#4A5568' }}>{s.role || '—'}</td>
                      <td><InfluenceBadge value={s.influence} /></td>
                      <td><SentimentBadge value={s.sentiment} /></td>
                      <td style={{ color: '#4A5568' }}>{s.last_contact || '—'}</td>
                      <td>
                        <button onClick={() => { setEditing(s); setShowForm(true) }} className="btn-ghost">Bewerk</button>
                        <button onClick={() => deleteStakeholder(s.id)} className="btn-ghost" style={{ color: '#FF5C4D' }}>✕</button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} style={{ color: '#8A96A8', textAlign: 'center', padding: 32 }}>Geen stakeholders gevonden.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Map view */}
          {view === 'map' && (
            <div>
              {Object.entries(grouped).map(([geo, bus]) => (
                <div key={geo} style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4A5568', marginBottom: 10, paddingBottom: 6, borderBottom: '2px solid #E2DFD5' }}>{geo}</div>
                  {Object.entries(bus).map(([bu, staks]) => (
                    <div key={bu} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 12, color: '#8A96A8', marginBottom: 8, fontStyle: 'italic' }}>{bu}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {staks.map(s => <MiniCard key={s.id} s={s} onEdit={() => { setEditing(s); setShowForm(true) }} onDelete={() => deleteStakeholder(s.id)} />)}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {Object.keys(grouped).length === 0 && <div style={{ color: '#8A96A8', padding: '24px 0' }}>Geen stakeholders gevonden.</div>}
            </div>
          )}

          {/* Org Chart view */}
          {view === 'orgchart' && session && (
            <OrgChart accountId={id} userId={session.user.id} stakeholders={filtered} onRefresh={fetchData} />
          )}
        </div>
      )}

      {/* Tab: Plan */}
      {tab === 'Plan' && session && (
        <AccountPlan accountId={id} userId={session.user.id} />
      )}

      {/* Tab: Acties */}
      {tab === 'Acties' && session && (
        <AccountActions accountId={id} userId={session.user.id} />
      )}

      {/* Tab: Notities */}
      {tab === 'Notities' && session && (
        <AccountNotes accountId={id} userId={session.user.id} />
      )}

      {/* Stakeholder form modal */}
      {showForm && session && (
        <StakeholderForm accountId={id} userId={session.user.id} existing={editing}
          onDone={() => { setShowForm(false); setEditing(null); fetchData() }}
          onCancel={() => { setShowForm(false); setEditing(null) }} />
      )}
    </div>
  )
}

function MiniCard({ s, onEdit, onDelete }) {
  const sc = { Champion: '#0A6640', Supporter: '#1340CC', Neutral: '#4A5568', Skeptic: '#7A5200', Blocker: '#BF2600' }
  const bg = { Champion: '#E6F9F0', Supporter: '#EBF0FF', Neutral: '#F0EDE4', Skeptic: '#FFF8E6', Blocker: '#FFF0EE' }
  const initials = s.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div style={{ width: 175, background: 'white', border: '1px solid #E2DFD5', borderRadius: 8, padding: 12 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: bg[s.sentiment] || '#F0EDE4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: sc[s.sentiment] || '#4A5568', flexShrink: 0 }}>{initials}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
          <div style={{ fontSize: 11, color: '#4A5568', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title || '—'}</div>
        </div>
      </div>
      {s.role && <div style={{ fontSize: 11, color: '#8A96A8', marginBottom: 6 }}>{s.role}</div>}
      <div style={{ display: 'flex', gap: 4, marginBottom: s.notes ? 6 : 0 }}>
        <SentimentBadge value={s.sentiment} />
        <InfluenceBadge value={s.influence} />
      </div>
      {s.notes && <div style={{ fontSize: 11, color: '#4A5568', marginTop: 6, borderTop: '1px solid #E2DFD5', paddingTop: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.notes}</div>}
      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
        <button onClick={onEdit} className="btn-ghost" style={{ flex: 1, fontSize: 11, padding: '3px 0', textAlign: 'center' }}>Bewerk</button>
        <button onClick={onDelete} className="btn-ghost" style={{ flex: 1, fontSize: 11, padding: '3px 0', textAlign: 'center', color: '#FF5C4D' }}>✕</button>
      </div>
    </div>
  )
}