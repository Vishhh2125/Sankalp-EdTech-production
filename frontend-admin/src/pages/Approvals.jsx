import { useEffect, useState } from 'react'
import { Check, X, Download, ExternalLink, Calendar, User, Film, Tv, Loader, RefreshCw } from 'lucide-react'
import { approvalsApi, mediaApi } from '../services/api.js'

export default function Approvals() {
  const [items, setItems] = useState({ shows: [], episodes: [], rejectedShows: [], rejectedEpisodes: [] })
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('all') // 'all', 'shows', 'episodes', 'rejected'
  const [downloadingId, setDownloadingId] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await approvalsApi.list()
      const payload = res.data?.data || res.data || { shows: [], episodes: [], rejectedShows: [], rejectedEpisodes: [] }
      setItems({
        shows: payload.shows || [],
        episodes: payload.episodes || [],
        rejectedShows: payload.rejectedShows || [],
        rejectedEpisodes: payload.rejectedEpisodes || [],
      })
    } catch (err) {
      alert('Failed to load approvals: ' + (err.response?.data?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const act = async (type, id, action) => {
    try {
      await approvalsApi.act(type, id, action)
      await load()
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.message || err.message))
    }
  }

  const handleDownloadVideo = async (episodeId) => {
    setDownloadingId(episodeId)
    try {
      const res = await mediaApi.getDownloadUrl(episodeId)
      const downloadUrl = res.data?.data?.download_url || res.data?.download_url
      if (downloadUrl) {
        // Trigger browser download
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = ''
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } else {
        alert('Could not retrieve download link for this video.')
      }
    } catch (err) {
      alert('Failed to get download link: ' + (err.response?.data?.message || err.message))
    } finally {
      setDownloadingId(null)
    }
  }

  if (loading && !items.shows.length && !items.episodes.length && !items.rejectedShows.length && !items.rejectedEpisodes.length) {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
        <Loader className="spin" size={24} style={{ color: 'var(--accent2)' }} />
        <div style={{ fontSize: 13, color: 'var(--text3)' }}>Loading approvals queue...</div>
      </div>
    )
  }

  const totalPendingShows = items.shows?.length || 0
  const totalPendingEpisodes = items.episodes?.length || 0
  const totalAll = totalPendingShows + totalPendingEpisodes

  const totalRejectedShows = items.rejectedShows?.length || 0
  const totalRejectedEpisodes = items.rejectedEpisodes?.length || 0
  const totalRejected = totalRejectedShows + totalRejectedEpisodes

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: 'var(--text)' }}>Content Approvals Queue</h2>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
          Review pending course submissions, inspect video lectures, and manage rejected items.
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', marginBottom: 20, paddingBottom: 8 }}>
        <button
          className={`chip ${activeTab === 'all' ? 'chip-active' : ''}`}
          onClick={() => setActiveTab('all')}
          style={{ padding: '6px 14px', cursor: 'pointer' }}
        >
          All Pending ({totalAll})
        </button>
        <button
          className={`chip ${activeTab === 'shows' ? 'chip-active' : ''}`}
          onClick={() => setActiveTab('shows')}
          style={{ padding: '6px 14px', cursor: 'pointer' }}
        >
          <Tv size={14} style={{ marginRight: 6 }} />
          Courses ({totalPendingShows})
        </button>
        <button
          className={`chip ${activeTab === 'episodes' ? 'chip-active' : ''}`}
          onClick={() => setActiveTab('episodes')}
          style={{ padding: '6px 14px', cursor: 'pointer' }}
        >
          <Film size={14} style={{ marginRight: 6 }} />
          Lectures ({totalPendingEpisodes})
        </button>
        <button
          className={`chip ${activeTab === 'rejected' ? 'chip-active' : ''}`}
          onClick={() => setActiveTab('rejected')}
          style={{
            padding: '6px 14px',
            cursor: 'pointer',
            borderColor: activeTab === 'rejected' ? 'var(--red)' : undefined,
            color: activeTab === 'rejected' ? 'var(--red)' : undefined,
          }}
        >
          <X size={14} style={{ marginRight: 6 }} />
          Rejected ({totalRejected})
        </button>
      </div>

      {/* Main Content Area */}
      {activeTab === 'rejected' ? (
        /* REJECTED TAB VIEW */
        totalRejected === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text2)', marginBottom: 4 }}>No Rejected Items</div>
            <div style={{ fontSize: 13 }}>There are currently no rejected courses or video lectures.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Rejected Courses */}
            {totalRejectedShows > 0 && (
              <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 15, color: 'var(--red)' }}>
                    <Tv size={16} />
                    Rejected Courses ({totalRejectedShows})
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {items.rejectedShows.map((s, idx) => {
                    const teacherName = s.teacher?.name || s.teacher?.full_name || 'Unknown Teacher'
                    const dateStr = new Date(s.updated_at || s.created_at).toLocaleDateString(undefined, {
                      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })

                    return (
                      <div
                        key={s.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '16px 20px',
                          borderTop: idx === 0 ? 'none' : '1px solid var(--border)',
                        }}
                      >
                        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1, minWidth: 0 }}>
                          {s.thumbnail_url ? (
                            <img src={s.thumbnail_url} alt={s.title} style={{ width: 64, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                          ) : (
                            <div style={{ width: 64, height: 40, background: 'var(--bg4)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Tv size={18} style={{ color: 'var(--text3)' }} />
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{s.title}</span>
                              <span className="badge badge-red" style={{ fontSize: 10 }}>Rejected</span>
                            </div>
                            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text3)' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <User size={12} style={{ color: 'var(--accent2)' }} /> {teacherName}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Calendar size={12} /> {dateStr}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => act('show', s.id, 'approve')}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--accent2)' }}
                            title="Reconsider and approve this course directly"
                          >
                            <RefreshCw size={13} /> Reconsider & Approve
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Rejected Video Lectures */}
            {totalRejectedEpisodes > 0 && (
              <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 15, color: 'var(--red)' }}>
                    <Film size={16} />
                    Rejected Video Lectures ({totalRejectedEpisodes})
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {items.rejectedEpisodes.map((e, idx) => {
                    const parentShowTitle = e.show?.title || 'Unknown Course'
                    const teacherName = e.show?.teacher?.name || e.show?.teacher?.full_name || 'Teacher'
                    const dateStr = new Date(e.updated_at || e.created_at).toLocaleDateString(undefined, {
                      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })
                    const isDownloading = downloadingId === e.id

                    return (
                      <div
                        key={e.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '16px 20px',
                          borderTop: idx === 0 ? 'none' : '1px solid var(--border)',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent2)', fontWeight: 600 }}>
                              EP {e.episode_num}
                            </span>
                            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                              {e.title}
                            </span>
                            <span className="badge badge-red" style={{ fontSize: 10 }}>Rejected</span>
                          </div>
                          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text3)' }}>
                            <span>Course: <strong style={{ color: 'var(--text2)' }}>{parentShowTitle}</strong></span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <User size={12} style={{ color: 'var(--accent2)' }} /> {teacherName}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Calendar size={12} /> {dateStr}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {e.video_source === 'YOUTUBE' ? (
                            <a
                              href={`https://youtube.com/watch?v=${e.youtube_video_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-ghost btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                            >
                              <ExternalLink size={13} /> View YouTube Video
                            </a>
                          ) : (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleDownloadVideo(e.id)}
                              disabled={isDownloading}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              title="Download video file to inspect content"
                            >
                              {isDownloading ? <Loader className="spin" size={13} /> : <Download size={13} />}
                              {isDownloading ? 'Fetching Link...' : 'Download Video'}
                            </button>
                          )}

                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => act('episode', e.id, 'approve')}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--accent2)' }}
                            title="Reconsider and approve this lecture directly"
                          >
                            <RefreshCw size={13} /> Reconsider & Approve
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        /* PENDING TABS VIEW */
        totalAll === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text2)', marginBottom: 4 }}>All caught up!</div>
            <div style={{ fontSize: 13 }}>No pending courses or lectures waiting for review.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Pending Courses (Shows) */}
            {(activeTab === 'all' || activeTab === 'shows') && (
              <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 15 }}>
                    <Tv size={16} style={{ color: 'var(--accent2)' }} />
                    Pending Courses ({totalPendingShows})
                  </div>
                </div>

                {totalPendingShows === 0 ? (
                  <div style={{ padding: '24px 20px', color: 'var(--text3)', fontSize: 13, textAlign: 'center' }}>
                    No courses pending review
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {items.shows.map((s, idx) => {
                      const teacherName = s.teacher?.name || s.teacher?.full_name || 'Unknown Teacher'
                      const submittedAt = new Date(s.created_at).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })

                      return (
                        <div
                          key={s.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '16px 20px',
                            borderTop: idx === 0 ? 'none' : '1px solid var(--border)',
                          }}
                        >
                          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1, minWidth: 0 }}>
                            {s.thumbnail_url ? (
                              <img
                                src={s.thumbnail_url}
                                alt={s.title}
                                style={{ width: 64, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }}
                              />
                            ) : (
                              <div style={{ width: 64, height: 40, background: 'var(--bg4)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Tv size={18} style={{ color: 'var(--text3)' }} />
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>
                                {s.title}
                              </div>
                              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text3)' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <User size={12} style={{ color: 'var(--accent2)' }} /> {teacherName}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Calendar size={12} /> {submittedAt}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => act('show', s.id, 'approve')}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              <Check size={13} /> Approve
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => act('show', s.id, 'reject')}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              <X size={13} /> Reject
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Pending Lectures (Episodes) */}
            {(activeTab === 'all' || activeTab === 'episodes') && (
              <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 15 }}>
                    <Film size={16} style={{ color: 'var(--amber)' }} />
                    Pending Video Lectures ({totalPendingEpisodes})
                  </div>
                </div>

                {totalPendingEpisodes === 0 ? (
                  <div style={{ padding: '24px 20px', color: 'var(--text3)', fontSize: 13, textAlign: 'center' }}>
                    No video lectures pending review
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {items.episodes.map((e, idx) => {
                      const parentShowTitle = e.show?.title || 'Unknown Course'
                      const teacherName = e.show?.teacher?.name || e.show?.teacher?.full_name || 'Teacher'
                      const submittedAt = new Date(e.created_at).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })
                      const isDownloading = downloadingId === e.id

                      return (
                        <div
                          key={e.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '16px 20px',
                            borderTop: idx === 0 ? 'none' : '1px solid var(--border)',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent2)', fontWeight: 600 }}>
                                EP {e.episode_num}
                              </span>
                              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                                {e.title}
                              </span>
                              {e.is_free ? (
                                <span className="badge badge-green" style={{ fontSize: 10 }}>Free</span>
                              ) : (
                                <span className="badge badge-amber" style={{ fontSize: 10 }}>₹{e.coin_cost} Coins</span>
                              )}
                            </div>

                            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text3)' }}>
                              <span>Course: <strong style={{ color: 'var(--text2)' }}>{parentShowTitle}</strong></span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <User size={12} style={{ color: 'var(--accent2)' }} /> {teacherName}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Calendar size={12} /> {submittedAt}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {e.video_source === 'YOUTUBE' ? (
                              <a
                                href={`https://youtube.com/watch?v=${e.youtube_video_id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-ghost btn-sm"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                              >
                                <ExternalLink size={13} /> View YouTube Video
                              </a>
                            ) : (
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleDownloadVideo(e.id)}
                                disabled={isDownloading}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                title="Download video file to inspect content"
                              >
                                {isDownloading ? <Loader className="spin" size={13} /> : <Download size={13} />}
                                {isDownloading ? 'Fetching Link...' : 'Download Video'}
                              </button>
                            )}

                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => act('episode', e.id, 'approve')}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              <Check size={13} /> Approve
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => act('episode', e.id, 'reject')}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              <X size={13} /> Reject
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      )}
    </div>
  )
}
