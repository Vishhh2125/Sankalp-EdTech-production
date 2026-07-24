import { useState, useEffect, useCallback } from 'react'
import { Search, BookOpen, CheckCircle, ShieldAlert, Trash2, Plus, Lock, User } from 'lucide-react'
import Modal, { FormGroup, ModalSection } from '../components/ui/Modal.jsx'
import { studentsApi, showsApi } from '../services/api.js'

export default function AssignCourses() {
  const [students, setStudents] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [allShows, setAllShows] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [loadingShows, setLoadingShows] = useState(true)
  const [studentSearch, setStudentSearch] = useState('')
  const [showSearch, setShowSearch] = useState('')
  const [selectedShowIds, setSelectedShowIds] = useState([])
  const [assigning, setAssigning] = useState(false)
  const [revokingId, setRevokingId] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // 1. Fetch Students List
  const fetchStudents = useCallback(async (searchQuery = '') => {
    try {
      setLoadingStudents(true)
      const res = await studentsApi.list({ search: searchQuery, limit: 50 })
      const list = res.data?.data?.students || []
      setStudents(list)
      if (list.length > 0 && !selectedStudentId) {
        setSelectedStudentId(list[0].id)
      }
    } catch (err) {
      setErrorMsg('Failed to load student list')
    } finally {
      setLoadingStudents(false)
    }
  }, [selectedStudentId])

  // 2. Fetch All Shows/Courses
  const fetchShows = useCallback(async () => {
    try {
      setLoadingShows(true)
      const res = await showsApi.getAll({ include_inactive: true, limit: 200 })
      const raw = res.data?.data || res.data
      const list = Array.isArray(raw)
        ? raw
        : raw?.shows || raw?.items || raw?.dramas || res.data?.shows || res.data?.items || []
      setAllShows(list)
    } catch (err) {
      console.error('Failed to load courses:', err)
    } finally {
      setLoadingShows(false)
    }
  }, [])

  useEffect(() => {
    setSelectedShowIds([])
  }, [selectedStudentId])

  useEffect(() => {
    fetchStudents(studentSearch)
  }, [fetchStudents, studentSearch])

  useEffect(() => {
    fetchShows()
  }, [fetchShows])

  const activeStudent = students.find((s) => s.id === selectedStudentId)

  // Current active access array for selected student
  const activeAccessList = activeStudent?.show_access || []
  const grantedShowIds = new Set(activeAccessList.map((sa) => sa.show_id))

  // Handle course assignment
  const handleAssignCourses = async () => {
    if (!selectedStudentId || selectedShowIds.length === 0) return
    setErrorMsg('')
    setSuccessMsg('')

    try {
      setAssigning(true)
      await studentsApi.assignCourses(selectedStudentId, selectedShowIds)
      setSuccessMsg(`Successfully assigned ${selectedShowIds.length} course(s) to ${activeStudent?.name}!`)
      setSelectedShowIds([])
      await fetchStudents(studentSearch)
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to assign courses')
    } finally {
      setAssigning(false)
    }
  }

  // Handle course revocation
  const handleRevokeCourse = async (showId, showTitle) => {
    if (!selectedStudentId || !showId) return
    setErrorMsg('')
    setSuccessMsg('')

    try {
      setRevokingId(showId)
      await studentsApi.revokeCourse(selectedStudentId, showId)
      setSuccessMsg(`Revoked access for "${showTitle}" from ${activeStudent?.name}`)
      await fetchStudents(studentSearch)
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to revoke course access')
    } finally {
      setRevokingId(null)
    }
  }

  const toggleShowSelect = (showId) => {
    setSelectedShowIds((prev) =>
      prev.includes(showId) ? prev.filter((id) => id !== showId) : [...prev, showId]
    )
  }

  // Filter shows available to assign (excluding already assigned active shows)
  const availableShows = allShows.filter((s) => {
    const isAlreadyAssigned = grantedShowIds.has(s.id)
    const matchesSearch = !showSearch || s.title?.toLowerCase().includes(showSearch.toLowerCase())
    return !isAlreadyAssigned && matchesSearch
  })

  return (
    <div className="page-enter">
      {successMsg && (
        <div style={{
          background: 'var(--green-bg, rgba(34, 197, 94, 0.1))',
          color: 'var(--green, #22c55e)',
          border: '1px solid var(--green-border, rgba(34, 197, 94, 0.2))',
          padding: '12px 16px',
          borderRadius: 8,
          fontSize: 13,
          marginBottom: 16
        }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{
          background: 'var(--red-bg, rgba(239, 68, 68, 0.1))',
          color: 'var(--red, #ef4444)',
          border: '1px solid var(--red-border, rgba(239, 68, 68, 0.2))',
          padding: '12px 16px',
          borderRadius: 8,
          fontSize: 13,
          marginBottom: 16
        }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
        {/* Left Panel: Student Selector */}
        <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, height: 'fit-content' }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Select Student</div>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input
              className="input"
              placeholder="Search student..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              style={{ paddingLeft: 30, fontSize: 12 }}
            />
          </div>

          <div style={{ maxHeight: 520, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}>
            {loadingStudents ? (
              <div style={{ fontSize: 12, color: 'var(--text3)', padding: 12, textAlign: 'center' }}>Loading students…</div>
            ) : students.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text3)', padding: 12, textAlign: 'center' }}>No students found</div>
            ) : (
              students.map((st) => (
                <div
                  key={st.id}
                  onClick={() => setSelectedStudentId(st.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: selectedStudentId === st.id ? 'var(--accent-bg, rgba(59, 130, 246, 0.1))' : 'var(--bg3)',
                    border: `1px solid ${selectedStudentId === st.id ? 'var(--accent, #3b82f6)' : 'var(--border)'}`,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13, color: selectedStudentId === st.id ? 'var(--accent2)' : 'var(--text)' }}>
                    {st.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                    <span>{st.email}</span>
                    {st.student_id && <span style={{ fontFamily: 'var(--mono)' }}>{st.student_id}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel: Course Assignment & Revocation */}
        {activeStudent ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Student Info Card */}
            <div className="card" style={{ padding: 18, background: 'var(--bg2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div className="avatar" style={{ width: 44, height: 44, fontSize: 16, background: 'var(--accent-bg)', color: 'var(--accent)' }}>
                    {activeStudent.name?.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{activeStudent.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', gap: 12, marginTop: 2 }}>
                      <span>✉ {activeStudent.email}</span>
                      {activeStudent.student_id && <span>🆔 {activeStudent.student_id}</span>}
                      {activeStudent.mobile_no && <span>📞 {activeStudent.mobile_no}</span>}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {activeStudent.memberships && activeStudent.memberships.length > 0 && (
                    <span className="badge badge-purple" style={{ padding: '6px 12px', fontSize: 12 }}>
                      ⭐ {activeStudent.memberships[0].plan?.name || 'Active Membership'} (Expires {activeStudent.memberships[0].end_date ? new Date(activeStudent.memberships[0].end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Lifetime'})
                    </span>
                  )}
                  <span className="badge badge-blue">
                    {activeAccessList.length} Permanent Assigned Course(s)
                  </span>
                </div>
              </div>
            </div>

            {/* Granted Courses Table */}
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Currently Assigned & Unlocked Courses</div>
              </div>

              {activeStudent.memberships && activeStudent.memberships.length > 0 && (
                <div style={{
                  padding: '12px 18px',
                  background: 'rgba(168, 85, 247, 0.1)',
                  color: '#c084fc',
                  borderBottom: '1px solid rgba(168, 85, 247, 0.2)',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <span>⭐</span>
                  <div>
                    <strong>Active Subscription Membership ({activeStudent.memberships[0].plan?.name || 'All-Access'}):</strong> Unlocks courses on the mobile app until {activeStudent.memberships[0].end_date ? new Date(activeStudent.memberships[0].end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Lifetime'}.
                  </div>
                </div>
              )}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Access Type</th>
                      <th>Granted / Purchased On</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeAccessList.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--text3)' }}>
                          No active courses assigned to this student.
                        </td>
                      </tr>
                    ) : (
                      activeAccessList.map((sa) => (
                        <tr key={sa.id}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>
                              {sa.show?.title || 'Unknown Course'}
                            </div>
                          </td>
                          <td>
                            {sa.access_type === 'ADMIN_GRANTED' ? (
                              <span className="badge badge-green">Admin Granted (Free)</span>
                            ) : sa.access_type === 'PACKAGE_BUNDLE' ? (
                              <span className="badge badge-purple">Package Bundle</span>
                            ) : (
                              <span className="badge badge-amber">Purchased (Coins)</span>
                            )}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text3)' }}>
                            {sa.purchased_at ? new Date(sa.purchased_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                          </td>
                          <td>
                            {sa.access_type === 'ADMIN_GRANTED' ? (
                              <button
                                className="btn btn-danger btn-sm"
                                disabled={revokingId === sa.show_id}
                                onClick={() => handleRevokeCourse(sa.show_id, sa.show?.title)}
                              >
                                <Trash2 size={12} /> {revokingId === sa.show_id ? 'Revoking…' : 'Revoke Access'}
                              </button>
                            ) : (
                              <span style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }} title="Purchased or package access cannot be revoked by admin">
                                <Lock size={12} /> Cannot Revoke
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Available Courses Selection to Assign */}
            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>Grant New Course Access</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>Select one or more courses below to grant zero-cost admin access.</div>
                </div>

                <button
                  className="btn btn-primary"
                  disabled={selectedShowIds.length === 0 || assigning}
                  onClick={handleAssignCourses}
                >
                  <Plus size={15} /> {assigning ? 'Assigning…' : `Assign Selected (${selectedShowIds.length})`}
                </button>
              </div>

              <div style={{ marginBottom: 12, position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                <input
                  className="input"
                  placeholder="Filter available courses..."
                  value={showSearch}
                  onChange={(e) => setShowSearch(e.target.value)}
                  style={{ paddingLeft: 30, fontSize: 12 }}
                />
              </div>

              <div style={{ maxHeight: 320, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {loadingShows ? (
                  <div style={{ gridColumn: 'span 2', padding: 20, textAlign: 'center', color: 'var(--text3)' }}>Loading available courses…</div>
                ) : availableShows.length === 0 ? (
                  <div style={{ gridColumn: 'span 2', padding: 20, textAlign: 'center', color: 'var(--text3)' }}>No available courses to grant.</div>
                ) : (
                  availableShows.map((show) => {
                    const isSelected = selectedShowIds.includes(show.id)
                    return (
                      <div
                        key={show.id}
                        onClick={() => toggleShowSelect(show.id)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          background: isSelected ? 'var(--accent-bg, rgba(59, 130, 246, 0.1))' : 'var(--bg3)',
                          border: `1px solid ${isSelected ? 'var(--accent, #3b82f6)' : 'var(--border)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justify: 'space-between',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ flex: 1, paddingRight: 8 }}>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{show.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{show.category?.name || 'Course'}</div>
                        </div>

                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          style={{ cursor: 'pointer' }}
                        />
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
            Select a student from the left panel to manage course access.
          </div>
        )}
      </div>
    </div>
  )
}
