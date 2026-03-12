import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const ROLES = ['Economic Buyer','Technical Buyer','Champion','End User','Legal/Compliance','Exec Sponsor','Gatekeeper','Influencer']
const empty = { name:'', title:'', email:'', country:'', region:'', business_unit:'', role:'', influence:'Medium', sentiment:'Neutral', notes:'', last_contact:'', photo_url:'' }

export default function StakeholderForm({ accountId, userId, existing, onDone, onCancel }) {
  const [f, setF] = useState(existing ? { ...existing } : { ...empty })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }))

  const uploadPhoto = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${userId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setF(p => ({ ...p, photo_url: data.publicUrl }))
    }
    setUploading(false)
  }

  const save = async () => {
    if (!f.name.trim()) return
    setSaving(true)
    const payload = { ...f, account_id: accountId, user_id: userId, last_contact: f.last_contact || null }
    if (existing) {
      await supabase.from('stakeholders').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('stakeholders').insert(payload)
    }
    setSaving(false)
    onDone()
  }

  const row = (label, content) => (
    <div style={{ display: 'contents' }}>
      <label style={{ fontSize: 12, color: 'var(--c-text-secondary)', fontWeight: 500, alignSelf: 'center' }}>{label}</label>
      <div>{content}</div>
    </div>
  )

  const initials = f.name ? f.name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase() : '?'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,30,66,0.54)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: 'white', borderRadius: 4, width: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{existing ? 'Stakeholder bewerken' : 'Stakeholder toevoegen'}</span>
          <button onClick={onCancel} className="btn-ghost">✕</button>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--c-border)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#e9f2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--c-border)' }}>
              {f.photo_url ? <img src={f.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 20, fontWeight: 600, color: '#0747a6' }}>{initials}</span>}
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--c-text-secondary)', marginBottom: 6 }}>Profielfoto</div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadPhoto} />
              <button onClick={() => fileRef.current.click()} className="btn-secondary" style={{ fontSize: 12, padding: '4px 12px' }} disabled={uploading}>
                {uploading ? 'Uploaden…' : 'Foto uploaden'}
              </button>
              {f.photo_url && <button onClick={() => setF(p=>({...p,photo_url:''}))} className="btn-ghost" style={{ fontSize: 12, marginLeft: 6 }}>Verwijder</button>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px 16px', alignItems: 'start' }}>
            {row('Naam *', <input value={f.name} onChange={set('name')} placeholder="Voornaam Achternaam" />)}
            {row('Functietitel', <input value={f.title} onChange={set('title')} placeholder="VP Operations" />)}
            {row('E-mail', <input value={f.email} onChange={set('email')} placeholder="naam@bedrijf.com" />)}
            {row('Business Unit', <input value={f.business_unit} onChange={set('business_unit')} placeholder="EMEA Sales" />)}
            {row('Regio', <input value={f.region} onChange={set('region')} placeholder="EMEA, APAC, …" />)}
            {row('Land', <input value={f.country} onChange={set('country')} placeholder="Nederland" />)}
            {row('Rol', (
              <select value={f.role} onChange={set('role')}>
                <option value="">Selecteer rol</option>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            ))}
            {row('Invloed', (
              <div style={{ display: 'flex', gap: 6 }}>
                {['High','Medium','Low'].map(l => (
                  <button key={l} onClick={() => setF(p=>({...p,influence:l}))}
                    style={{ flex:1, padding:'5px', border:`1px solid ${f.influence===l?'var(--c-accent)':'var(--c-border)'}`, borderRadius:3, background: f.influence===l?'#e9f2ff':'white', color: f.influence===l?'var(--c-accent)':'var(--c-text-secondary)', fontWeight: f.influence===l?600:400 }}>
                    {l}
                  </button>
                ))}
              </div>
            ))}
            {row('Sentiment', (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['Champion','Supporter','Neutral','Skeptic','Blocker'].map(s => (
                  <button key={s} onClick={() => setF(p=>({...p,sentiment:s}))}
                    style={{ padding:'4px 10px', border:`1px solid ${f.sentiment===s?'var(--c-accent)':'var(--c-border)'}`, borderRadius:3, background: f.sentiment===s?'#e9f2ff':'white', color: f.sentiment===s?'var(--c-accent)':'var(--c-text-secondary)', fontWeight: f.sentiment===s?600:400, fontSize:12 }}>
                    {s}
                  </button>
                ))}
              </div>
            ))}
            {row('Laatste contact', <input type="date" value={f.last_contact} onChange={set('last_contact')} />)}
            {row('Notities', <textarea value={f.notes} onChange={set('notes')} rows={3} placeholder="Context, actiepunten, relatiestatus…" style={{ resize:'vertical' }} />)}
          </div>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--c-border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} className="btn-secondary">Annuleer</button>
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Opslaan…' : 'Opslaan'}</button>
        </div>
      </div>
    </div>
  )
}