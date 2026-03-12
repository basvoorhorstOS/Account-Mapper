import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const ADOPTION_LEVELS = ['Niet gestart', 'Oriëntatie', 'Pilot', 'Uitrol', 'Volledig adoptie']

export default function AccountPlan({ accountId, userId }) {
  const [plan, setPlan] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    goals: '', competitors: '', risks: '', adoption_notes: ''
  })

  useEffect(() => { fetchPlan() }, [accountId])

  const fetchPlan = async () => {
    const { data } = await supabase.from('account_plan')
      .select('*').eq('account_id', accountId).maybeSingle()
    if (data) { setPlan(data); setForm(data) }
    else setForm({ goals: '', competitors: '', risks: '', adoption_notes: '' })
  }

  const save = async () => {
    setSaving(true)
    const payload = { ...form, account_id: accountId, user_id: userId, updated_at: new Date().toISOString() }
    if (plan) {
      await supabase.from('account_plan').update(payload).eq('id', plan.id)
    } else {
      const { data } = await supabase.from('account_plan').insert(payload).select().single()
      setPlan(data)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {/* Doelstellingen */}
      <div style={{ background: 'white', border: '1px solid #E2DFD5', borderRadius: 8, padding: '18px 20px', gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#0F1B3C' }}>🎯 Success Plan & Doelstellingen</div>
            <div style={{ fontSize: 12, color: '#8A96A8', marginTop: 2 }}>Wat wil de klant bereiken? Wat zijn de KPI's?</div>
          </div>
          <button onClick={save} disabled={saving} className="btn-primary" style={{ minWidth: 90 }}>
            {saving ? 'Opslaan…' : saved ? '✓ Opgeslagen' : 'Opslaan'}
          </button>
        </div>
        <textarea value={form.goals} onChange={set('goals')} rows={5}
          placeholder="Bijv: 35% kostenbesparing realiseren in Q3, NPS verbeteren van 32 naar 50, migratie afgerond voor einde FY..."
          style={{ width: '100%', resize: 'vertical', border: '1px solid #E2DFD5', borderRadius: 6, padding: '10px 12px', fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#0F1B3C', outline: 'none' }} />
      </div>

      {/* Concurrenten */}
      <div style={{ background: 'white', border: '1px solid #E2DFD5', borderRadius: 8, padding: '18px 20px' }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#0F1B3C', marginBottom: 4 }}>⚔️ Concurrenten</div>
        <div style={{ fontSize: 12, color: '#8A96A8', marginBottom: 12 }}>Wie zijn de alternatieven? Wat is hun positie?</div>
        <textarea value={form.competitors} onChange={set('competitors')} rows={6}
          placeholder="Bijv: Salesforce — sterk op enterprise, zwak op prijs. ServiceNow — al in gebruik bij IT-afdeling..."
          style={{ width: '100%', resize: 'vertical', border: '1px solid #E2DFD5', borderRadius: 6, padding: '10px 12px', fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#0F1B3C', outline: 'none' }} />
      </div>

      {/* Risico's */}
      <div style={{ background: 'white', border: '1px solid #E2DFD5', borderRadius: 8, padding: '18px 20px' }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#0F1B3C', marginBottom: 4 }}>⚠️ Risico's</div>
        <div style={{ fontSize: 12, color: '#8A96A8', marginBottom: 12 }}>Wat kan de deal of adoptie bedreigen?</div>
        <textarea value={form.risks} onChange={set('risks')} rows={6}
          placeholder="Bijv: Budget freeze Q2, reorganisatie IT-afdeling, champion verlaat het bedrijf, integratie met legacy ERP..."
          style={{ width: '100%', resize: 'vertical', border: '1px solid #E2DFD5', borderRadius: 6, padding: '10px 12px', fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#0F1B3C', outline: 'none' }} />
      </div>

      {/* Product adoptie */}
      <div style={{ background: 'white', border: '1px solid #E2DFD5', borderRadius: 8, padding: '18px 20px', gridColumn: '1 / -1' }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#0F1B3C', marginBottom: 4 }}>📦 Product & Module Adoptie</div>
        <div style={{ fontSize: 12, color: '#8A96A8', marginBottom: 12 }}>Welke modules gebruikt de klant? Wat is de adoptiegraad?</div>
        <textarea value={form.adoption_notes} onChange={set('adoption_notes')} rows={4}
          placeholder="Bijv: Core platform — volledig uitgerold (1200 users). Analytics module — pilot fase (50 users, Q2 uitrol gepland). API integratie — nog niet gestart..."
          style={{ width: '100%', resize: 'vertical', border: '1px solid #E2DFD5', borderRadius: 6, padding: '10px 12px', fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#0F1B3C', outline: 'none' }} />
      </div>

      {plan?.updated_at && (
        <div style={{ gridColumn: '1 / -1', fontSize: 11, color: '#8A96A8', textAlign: 'right' }}>
          Laatst bijgewerkt: {new Date(plan.updated_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  )
}