const SENTIMENT = {
  Champion: { bg:'var(--c-champion-bg)', color:'var(--c-champion-text)', border:'var(--c-champion-border)' },
  Supporter: { bg:'var(--c-supporter-bg)', color:'var(--c-supporter-text)', border:'var(--c-supporter-border)' },
  Neutral:   { bg:'var(--c-neutral-bg)',   color:'var(--c-neutral-text)',   border:'var(--c-neutral-border)' },
  Skeptic:   { bg:'var(--c-skeptic-bg)',   color:'var(--c-skeptic-text)',   border:'var(--c-skeptic-border)' },
  Blocker:   { bg:'var(--c-blocker-bg)',   color:'var(--c-blocker-text)',   border:'var(--c-blocker-border)' },
}
const INFLUENCE = {
  High:   { bg:'var(--c-high-bg)',   color:'var(--c-high-text)',   border:'var(--c-high-border)' },
  Medium: { bg:'var(--c-medium-bg)', color:'var(--c-medium-text)', border:'var(--c-medium-border)' },
  Low:    { bg:'var(--c-low-bg)',    color:'var(--c-low-text)',    border:'var(--c-low-border)' },
}

export function SentimentBadge({ value }) {
  const s = SENTIMENT[value] || SENTIMENT.Neutral
  return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 3, background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontWeight: 500, whiteSpace: 'nowrap' }}>{value}</span>
}

export function InfluenceBadge({ value }) {
  const s = INFLUENCE[value] || INFLUENCE.Medium
  return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 3, background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontWeight: 500, whiteSpace: 'nowrap' }}>{value}</span>
}
