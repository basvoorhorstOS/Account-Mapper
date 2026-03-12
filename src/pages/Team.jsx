import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Team() {
  const [user, setUser] = useState(null)
  const [team, setTeam] = useState(null)
  const [members, setMembers] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      loadTeam(data.user)
    })
  }, [])

  async function loadTeam(u) {
    setLoading(true)
    // Check if user is already in a team
    const { data: membership } = await supabase
      .from('team_members')
      .select('team_id, role, teams(id, name)')
      .eq('user_id', u.id)
      .single()

    if (membership) {
      setTeam(membership.teams)
      loadMembers(membership.teams.id)
    }
    setLoading(false)
  }

  async function loadMembers(teamId) {
    const { data } = await supabase
      .from('team_members')
      .select('id, role, user_id')
      .eq('team_id', teamId)
    setMembers(data || [])
  }

  async function createTeam() {
    const name = prompt('Naam van je team (bijv. OpenSpace CSM):')
    if (!name) return

    // Create team
    const { data: newTeam, error } = await supabase
      .from('teams')
      .insert({ name })
      .select()
      .single()

    if (error) { setMessage('Fout bij aanmaken team: ' + error.message); return }

    // Add current user as admin
    await supabase.from('team_members').insert({
      team_id: newTeam.id,
      user_id: user.id,
      role: 'admin'
    })

    // Link existing accounts to this team
    await supabase.from('accounts').update({ team_id: newTeam.id }).eq('user_id', user.id)
    await supabase.from('stakeholders').update({ team_id: newTeam.id }).eq('user_id', user.id)
    await supabase.from('account_plan').update({ team_id: newTeam.id }).eq('user_id', user.id)
    await supabase.from('actions').update({ team_id: newTeam.id }).eq('user_id', user.id)
    await supabase.from('notes').update({ team_id: newTeam.id }).eq('user_id', user.id)

    setTeam(newTeam)
    loadMembers(newTeam.id)
    setMessage('Team aangemaakt! Je bestaande data is gekoppeld aan het team.')
  }

  async function inviteMember() {
    if (!inviteEmail.trim()) return
    setMessage('')

    // Send magic link invite via Supabase
    const { error } = await supabase.auth.admin?.inviteUserByEmail
      ? supabase.auth.admin.inviteUserByEmail(inviteEmail)
      : { error: null }

    // Store pending invite — we use a simple approach:
    // When the invited user logs in for the first time, they need the team_id
    // For now, show the team_id so they can be added manually
    setMessage(`Stuur je collega deze link: ${window.location.origin} en geef hen team-ID: ${team.id} — zij kunnen zichzelf toevoegen via "Join team".`)
    setInviteEmail('')
  }

  async function joinTeam() {
    const teamId = prompt('Voer het team-ID in dat je ontvangen hebt:')
    if (!teamId) return

    const { error } = await supabase.from('team_members').insert({
      team_id: teamId,
      user_id: user.id,
      role: 'member'
    })

    if (error) { setMessage('Kon niet deelnemen: ' + error.message); return }

    const { data: t } = await supabase.from('teams').select('*').eq('id', teamId).single()
    setTeam(t)
    loadMembers(teamId)
    setMessage('Je bent toegevoegd aan het team!')
  }

  if (loading) return <div style={{ padding: 40, color: '#666' }}>Laden...</div>

  return (
    <div style={{ padding: 40, maxWidth: 600 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Team</h2>

      {message && (
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: 16, marginBottom: 24, fontSize: 14, color: '#0369a1', wordBreak: 'break-all' }}>
          {message}
        </div>
      )}

      {!team ? (
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={createTeam} style={{ background: '#1A56FF', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 20px', cursor: 'pointer', fontWeight: 600 }}>
            + Nieuw team aanmaken
          </button>
          <button onClick={joinTeam} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '12px 20px', cursor: 'pointer', fontWeight: 600 }}>
            Team joinen met ID
          </button>
        </div>
      ) : (
        <>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 24, marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Team naam</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{team.name}</div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 8 }}>Team ID: {team.id}</div>
          </div>

          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 24, marginBottom: 24 }}>
            <div style={{ fontWeight: 600, marginBottom: 16 }}>Leden ({members.length})</div>
            {members.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1A56FF22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: '#1A56FF' }}>
                  {m.user_id === user.id ? user.email?.[0]?.toUpperCase() : '?'}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{m.user_id === user.id ? user.email : m.user_id.slice(0, 8) + '...'}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{m.role}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 24 }}>
            <div style={{ fontWeight: 600, marginBottom: 16 }}>Collega uitnodigen</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="naam@bedrijf.com"
                style={{ flex: 1, border: '1px solid #ddd', borderRadius: 8, padding: '10px 14px', fontSize: 14 }}
              />
              <button onClick={inviteMember} style={{ background: '#1A56FF', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontWeight: 600 }}>
                Uitnodigen
              </button>
            </div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
              Je collega ontvangt het team-ID om mee in te loggen via {window.location.origin}
            </div>
          </div>
        </>
      )}
    </div>
  )
}