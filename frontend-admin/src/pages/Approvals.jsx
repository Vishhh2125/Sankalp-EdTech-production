import { useEffect, useState } from 'react'
import { approvalsApi } from '../services/api'

export default function Approvals() {
  const [items, setItems] = useState({ shows: [], episodes: [] })
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await approvalsApi.list()
      const payload = res.data?.data || res.data || { shows: [], episodes: [] }
      setItems(payload)
    } catch (err) {
      alert('Failed to load approvals: ' + (err.response?.data?.message || err.message))
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const act = async (type, id, action) => {
    try {
      await approvalsApi.act(type, id, action)
      await load()
    } catch (err) { 
      alert('Failed: ' + (err.response?.data?.message || err.message)) 
    }
  }

  if (loading) return <div className="page-enter">Loading…</div>

  return (
    <div className="page-enter">
      <div className="card">
        <h2>Pending Shows</h2>
        {items.shows.length === 0 ? <div>No pending shows</div> : (
          items.shows.map(s => (
            <div key={s.id} style={{ display:'flex', justifyContent:'space-between', padding:8, borderBottom:'1px solid var(--border)' }}>
              <div>{s.title} — {s.teacher?.name || s.teacher_id}</div>
              <div>
                <button className="btn btn-primary btn-sm" onClick={() => act('show', s.id, 'approve')}>Approve</button>
                <button className="btn btn-danger btn-sm" onClick={() => act('show', s.id, 'reject')}>Reject</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h2>Pending Episodes</h2>
        {items.episodes.length === 0 ? <div>No pending episodes</div> : (
          items.episodes.map(e => (
            <div key={e.id} style={{ display:'flex', justifyContent:'space-between', padding:8, borderBottom:'1px solid var(--border)' }}>
              <div>{e.title} — {e.show?.title || e.show_id}</div>
              <div>
                <button className="btn btn-primary btn-sm" onClick={() => act('episode', e.id, 'approve')}>Approve</button>
                <button className="btn btn-danger btn-sm" onClick={() => act('episode', e.id, 'reject')}>Reject</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
