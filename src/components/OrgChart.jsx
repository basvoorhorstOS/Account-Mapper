import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const SENTIMENT_COLOR = {
  Champion: '#4CAF50', Supporter: '#1A56FF', Neutral: '#8A96A8',
  Skeptic: '#F0B429', Blocker: '#FF5C4D',
}
const SENTIMENT_BG = {
  Champion: '#E6F9F0', Supporter: '#EBF0FF', Neutral: '#F0EDE4',
  Skeptic: '#FFF8E6', Blocker: '#FFF0EE',
}
const CARD_W = 180, CARD_H = 110

function StakeholderCard({ s, selected, linkingFrom, pos, onMouseDown, onSingleClick, onDoubleClick }) {
  const initials = s.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  const sc = SENTIMENT_COLOR[s.sentiment] || '#8A96A8'
  const sb = SENTIMENT_BG[s.sentiment] || '#F0EDE4'
  const x = pos.x - CARD_W / 2, y = pos.y - CARD_H / 2
  const isSelected = selected === s.id
  const isFrom = linkingFrom === s.id

  const clickTimer = useRef(null)
  const handleClick = (e) => {
    e.stopPropagation()
    if (clickTimer.current) {
      clearTimeout(clickTimer.current)
      clickTimer.current = null
      onDoubleClick(e, s.id)
    } else {
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null
        onSingleClick(e, s.id)
      }, 220)
    }
  }

  return (
    <g transform={`translate(${x},${y})`} style={{ cursor: 'grab', userSelect: 'none' }}
      onMouseDown={e => onMouseDown(e, s.id)}
      onClick={handleClick}>
      <rect width={CARD_W} height={CARD_H} rx={8} fill="rgba(0,0,0,0.07)" transform="translate(2,3)" />
      <rect width={CARD_W} height={CARD_H} rx={8} fill="white"
        stroke={isFrom ? '#FF5C4D' : isSelected ? '#1A56FF' : '#E2DFD5'}
        strokeWidth={isSelected || isFrom ? 2.5 : 1} />
      {s.photo_url ? (
        <>
          <clipPath id={`clip-${s.id}`}><circle cx={CARD_W / 2} cy={36} r={26} /></clipPath>
          <circle cx={CARD_W / 2} cy={36} r={27} fill={sb} stroke={sc} strokeWidth={2} />
          <image href={s.photo_url} x={CARD_W / 2 - 26} y={10} width={52} height={52} clipPath={`url(#clip-${s.id})`} />
        </>
      ) : (
        <>
          <circle cx={CARD_W / 2} cy={36} r={27} fill={sb} stroke={sc} strokeWidth={2} />
          <text x={CARD_W / 2} y={41} textAnchor="middle" fontSize={16} fontWeight="700"
            fill={sc} fontFamily="Inter,sans-serif">{initials}</text>
        </>
      )}
      <text x={CARD_W / 2} y={76} textAnchor="middle" fontSize={12} fontWeight="600"
        fill="#0F1B3C" fontFamily="Inter,sans-serif">
        {s.name.length > 20 ? s.name.slice(0, 19) + '…' : s.name}
      </text>
      <text x={CARD_W / 2} y={91} textAnchor="middle" fontSize={10} fill="#4A5568" fontFamily="Inter,sans-serif">
        {(s.title || '').length > 24 ? s.title.slice(0, 23) + '…' : (s.title || '')}
      </text>
      <rect x={0} y={CARD_H - 7} width={CARD_W} height={7} rx={3} fill={sc} />
      <text x={CARD_W / 2} y={CARD_H - 1} textAnchor="middle" fontSize={8} fontWeight="600"
        fill="white" fontFamily="Inter,sans-serif" letterSpacing="0.05em">
        {s.sentiment?.toUpperCase()}
      </text>
    </g>
  )
}

export default function OrgChart({ accountId, userId, stakeholders, onRefresh }) {
  const svgRef = useRef(null)
  const posRef = useRef({})
  const saveTimerRef = useRef({})  // debounce timers per stakeholder
  const [posVer, setPosVer] = useState(0)
  const [rels, setRels] = useState([])
  const [dragging, setDragging] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [hasDragged, setHasDragged] = useState(false)
  const [selected, setSelected] = useState(null)
  const [linkingFrom, setLinkingFrom] = useState(null)
  const [linkType, setLinkType] = useState('knows')
  const [detail, setDetail] = useState(null)
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 })
  const [panning, setPanning] = useState(false)
  const panStart = useRef({ mx: 0, my: 0, vx: 0, vy: 0 })

  useEffect(() => {
    posRef.current = {}
    stakeholders.forEach((s, i) => {
      posRef.current[s.id] = {
        x: s.pos_x > 0 ? s.pos_x : 250 + (i % 5) * 230,
        y: s.pos_y > 0 ? s.pos_y : 180 + Math.floor(i / 5) * 190,
      }
    })
    setPosVer(v => v + 1)
    fetchRels()
  }, [accountId])

  useEffect(() => {
    let changed = false
    stakeholders.forEach((s, i) => {
      if (!posRef.current[s.id]) {
        posRef.current[s.id] = {
          x: s.pos_x > 0 ? s.pos_x : 250 + (i % 5) * 230,
          y: s.pos_y > 0 ? s.pos_y : 180 + Math.floor(i / 5) * 190,
        }
        changed = true
      }
    })
    if (changed) setPosVer(v => v + 1)
  }, [stakeholders])

  const fetchRels = async () => {
    const { data } = await supabase.from('relationships').select('*').eq('account_id', accountId)
    setRels(data || [])
  }

  // Save position to Supabase with debounce — fires 600ms after last move
  const savePosition = useCallback((id, x, y) => {
    if (saveTimerRef.current[id]) clearTimeout(saveTimerRef.current[id])
    saveTimerRef.current[id] = setTimeout(async () => {
      await supabase.from('stakeholders')
        .update({ pos_x: Math.round(x), pos_y: Math.round(y) })
        .eq('id', id)
    }, 600)
  }, [])

  const clientToCanvas = useCallback((cx, cy) => {
    const rect = svgRef.current.getBoundingClientRect()
    return {
      x: view.x + (cx - rect.left) / view.scale,
      y: view.y + (cy - rect.top) / view.scale,
    }
  }, [view])

  const onNodeMouseDown = useCallback((e, id) => {
    e.stopPropagation()
    if (linkingFrom && linkingFrom !== '__pick__') return
    setDragging(id)
    setSelected(id)
    setHasDragged(false)
    const pt = clientToCanvas(e.clientX, e.clientY)
    const pos = posRef.current[id] || { x: 0, y: 0 }
    setDragOffset({ x: pt.x - pos.x, y: pt.y - pos.y })
  }, [linkingFrom, clientToCanvas])

  const onSVGMouseDown = (e) => {
    if (e.currentTarget === e.target) {
      setSelected(null); setDetail(null)
      setPanning(true)
      panStart.current = { mx: e.clientX, my: e.clientY, vx: view.x, vy: view.y }
    }
  }

  const onSVGMouseMove = useCallback((e) => {
    if (panning) {
      setView(v => ({
        ...v,
        x: panStart.current.vx - (e.clientX - panStart.current.mx) / v.scale,
        y: panStart.current.vy - (e.clientY - panStart.current.my) / v.scale,
      }))
      return
    }
    if (!dragging) return
    setHasDragged(true)
    const pt = clientToCanvas(e.clientX, e.clientY)
    const x = Math.max(CARD_W / 2, pt.x - dragOffset.x)
    const y = Math.max(CARD_H / 2, pt.y - dragOffset.y)
    posRef.current[dragging] = { x, y }
    setPosVer(v => v + 1)
    // Save to Supabase with debounce while dragging
    savePosition(dragging, x, y)
  }, [panning, dragging, dragOffset, clientToCanvas, savePosition])

  const onSVGMouseUp = useCallback(() => {
    // Also save immediately on mouse up to ensure position is stored
    if (dragging && hasDragged) {
      const pos = posRef.current[dragging]
      if (pos) {
        if (saveTimerRef.current[dragging]) clearTimeout(saveTimerRef.current[dragging])
        supabase.from('stakeholders')
          .update({ pos_x: Math.round(pos.x), pos_y: Math.round(pos.y) })
          .eq('id', dragging)
      }
    }
    setDragging(null)
    setPanning(false)
  }, [dragging, hasDragged])

  const onWheel = useCallback((e) => {
    e.preventDefault()
    const rect = svgRef.current.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
    setView(v => {
      const newScale = Math.min(4, Math.max(0.15, v.scale * factor))
      return {
        x: v.x + mx / v.scale - mx / newScale,
        y: v.y + my / v.scale - my / newScale,
        scale: newScale,
      }
    })
  }, [])

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  const onNodeSingleClick = useCallback((e, id) => {
    if (!linkingFrom) { setSelected(id); return }
    if (linkingFrom === '__pick__') { setLinkingFrom(id); return }
    if (linkingFrom === id) { setLinkingFrom(null); return }
    supabase.from('relationships').insert({
      account_id: accountId, user_id: userId,
      from_id: linkingFrom, to_id: id, type: linkType,
    }).then(() => { setLinkingFrom(null); fetchRels() })
  }, [linkingFrom, linkType, accountId, userId])

  const onNodeDoubleClick = useCallback((e, id) => {
    if (hasDragged) return
    setDetail(stakeholders.find(s => s.id === id) || null)
  }, [stakeholders, hasDragged])

  const deleteRel = async (id) => {
    await supabase.from('relationships').delete().eq('id', id)
    fetchRels()
  }

  const positions = posRef.current
  const transform = `scale(${view.scale}) translate(${-view.x},${-view.y})`

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#4A5568', fontWeight: 500 }}>Relatie:</span>
        {[['knows', '🤝 Kent', '#4CAF50'], ['influences', '⚡ Beïnvloedt', '#1A56FF']].map(([t, label, color]) => (
          <button key={t}
            onClick={() => { setLinkType(t); setLinkingFrom(f => f ? null : '__pick__') }}
            style={{ fontSize: 12, padding: '5px 12px', border: `1.5px solid ${linkType === t && linkingFrom ? color : '#E2DFD5'}`, borderRadius: 6, background: linkType === t && linkingFrom ? '#EBF0FF' : 'white', cursor: 'pointer', color: linkType === t && linkingFrom ? color : '#4A5568', fontWeight: 500 }}>
            {label}
          </button>
        ))}
        {linkingFrom && (
          <span style={{ fontSize: 12, color: '#1A56FF', fontWeight: 500 }}>
            {linkingFrom === '__pick__' ? 'Klik op stakeholder 1…' : 'Klik nu op stakeholder 2…'}
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#8A96A8' }}>Scroll = zoom &nbsp;|&nbsp; Sleep achtergrond = pannen &nbsp;|&nbsp; Dubbelklik = details</span>
          <button onClick={() => setView({ x: 0, y: 0, scale: 1 })}
            style={{ fontSize: 11, padding: '4px 10px', border: '1px solid #E2DFD5', borderRadius: 6, background: 'white', cursor: 'pointer', color: '#4A5568' }}>
            ⟳ Reset
          </button>
        </div>
      </div>

      <div style={{ border: '1px solid #E2DFD5', borderRadius: 8, overflow: 'hidden', background: '#F8F7F4', height: 600 }}>
        <svg ref={svgRef} width="100%" height="100%"
          style={{ cursor: panning ? 'grabbing' : dragging ? 'grabbing' : 'default', display: 'block' }}
          onMouseDown={onSVGMouseDown}
          onMouseMove={onSVGMouseMove}
          onMouseUp={onSVGMouseUp}
          onMouseLeave={onSVGMouseUp}>
          <defs>
            <marker id="arrowBlue" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#1A56FF" />
            </marker>
            <pattern id="dots" width="40" height="40" patternUnits="userSpaceOnUse"
              patternTransform={`scale(${view.scale}) translate(${-(view.x % 40)},${-(view.y % 40)})`}>
              <circle cx="20" cy="20" r="1.5" fill="#E2DFD5" opacity="0.7" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />

          <g transform={transform}>
            {rels.map(r => {
              const from = positions[r.from_id], to = positions[r.to_id]
              if (!from || !to) return null
              const color = r.type === 'influences' ? '#1A56FF' : '#4CAF50'
              const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2
              return (
                <g key={r.id}>
                  <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke={color} strokeWidth={2}
                    strokeDasharray={r.type === 'knows' ? '8,5' : '0'} opacity={0.75}
                    markerEnd={r.type === 'influences' ? 'url(#arrowBlue)' : undefined} />
                  <circle cx={mx} cy={my} r={9} fill="white" stroke={color} strokeWidth={1.5}
                    style={{ cursor: 'pointer' }} onClick={() => deleteRel(r.id)} />
                  <text x={mx} y={my + 4} textAnchor="middle" fontSize={11} fill={color}
                    style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => deleteRel(r.id)}>✕</text>
                </g>
              )
            })}

            {stakeholders.map(s => {
              const pos = positions[s.id]
              if (!pos) return null
              return <StakeholderCard key={s.id} s={s} pos={pos} selected={selected}
                linkingFrom={linkingFrom} onMouseDown={onNodeMouseDown}
                onSingleClick={onNodeSingleClick} onDoubleClick={onNodeDoubleClick} />
            })}
          </g>
        </svg>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11, color: '#8A96A8', flexWrap: 'wrap', alignItems: 'center' }}>
        {Object.entries(SENTIMENT_COLOR).map(([k, v]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: v, display: 'inline-block' }} />{k}
          </span>
        ))}
      </div>

      {detail && (
        <div style={{ position: 'fixed', right: 24, top: 80, width: 280, background: 'white', border: '1px solid #E2DFD5', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 300, overflow: 'hidden' }}>
          <div style={{ height: 6, background: SENTIMENT_COLOR[detail.sentiment] || '#8A96A8' }} />
          <div style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0F1B3C' }}>{detail.name}</div>
                <div style={{ fontSize: 12, color: '#4A5568', marginTop: 2 }}>{detail.title}</div>
              </div>
              <button onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', fontSize: 16, color: '#8A96A8', cursor: 'pointer' }}>✕</button>
            </div>
            {[['Rol', detail.role], ['Business Unit', detail.business_unit], ['Regio', detail.region],
              ['Land', detail.country], ['Invloed', detail.influence], ['Sentiment', detail.sentiment],
              ['Laatste contact', detail.last_contact]].filter(([, v]) => v).map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #F0EDE4', fontSize: 12 }}>
                <span style={{ color: '#8A96A8' }}>{label}</span>
                <span style={{ color: '#0F1B3C', fontWeight: 500 }}>{val}</span>
              </div>
            ))}
            {detail.notes && <div style={{ marginTop: 10, fontSize: 12, color: '#4A5568', background: '#F8F7F4', borderRadius: 6, padding: '8px 10px' }}>{detail.notes}</div>}
          </div>
        </div>
      )}
    </div>
  )
}