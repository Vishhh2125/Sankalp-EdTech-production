import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, RefreshCw } from 'lucide-react'
import Modal, { FormGroup, ModalSection } from '../components/ui/Modal.jsx'
import { studentsApi, geoApi } from '../services/api.js'

function OnboardModal({ open, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    student_id: '',
    mobile_no: '',
    dob: '',
    gender: '',
    country: 'IN',
    state: '',
    city: '',
  })

  const [countries, setCountries] = useState([])
  const [states, setStates] = useState([])
  const [cities, setCities] = useState([])
  const [loadingGeo, setLoadingGeo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Load countries on open
  useEffect(() => {
    if (open) {
      setForm({
        name: '',
        email: '',
        password: generateRandomPassword(),
        student_id: '',
        mobile_no: '',
        dob: '',
        gender: '',
        country: 'IN',
        state: '',
        city: '',
      })
      setError('')
      geoApi.getCountries()
        .then((res) => setCountries(res.data?.data || []))
        .catch(() => setCountries([]))
    }
  }, [open])

  // Load states when country changes
  useEffect(() => {
    if (form.country) {
      setLoadingGeo(true)
      geoApi.getStates(form.country)
        .then((res) => {
          setStates(res.data?.data || [])
          setCities([])
        })
        .catch(() => setStates([]))
        .finally(() => setLoadingGeo(false))
    } else {
      setStates([])
      setCities([])
    }
  }, [form.country])

  // Load cities when state changes
  useEffect(() => {
    if (form.country && form.state) {
      setLoadingGeo(true)
      geoApi.getCities(form.country, form.state)
        .then((res) => setCities(res.data?.data || []))
        .catch(() => setCities([]))
        .finally(() => setLoadingGeo(false))
    } else {
      setCities([])
    }
  }, [form.country, form.state])

  function generateRandomPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  }

  const upd = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const handleSubmit = async () => {
    setError('')
    if (!form.email?.trim() || !form.name?.trim() || !form.password?.trim()) {
      setError('Name, email, and password are required.')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    try {
      setSaving(true)
      const res = await studentsApi.onboard(form)
      onSuccess(res.data?.data?.student)
      onClose()
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Onboarding failed'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Onboard New Student"
      width={600}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Onboarding…' : 'Onboard & Send Credentials'}
          </button>
        </>
      }
    >
      {error && (
        <div style={{
          background: 'var(--red-bg, rgba(239, 68, 68, 0.1))',
          color: 'var(--red, #ef4444)',
          border: '1px solid var(--red-border, rgba(239, 68, 68, 0.2))',
          padding: '10px 14px',
          borderRadius: 8,
          fontSize: 13,
          marginBottom: 16
        }}>
          {error}
        </div>
      )}

      <ModalSection title="Account & Identity">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormGroup label="Full Name *">
            <input
              className="input"
              placeholder="e.g. Rahul Sharma"
              value={form.name}
              onChange={(e) => upd('name', e.target.value)}
            />
          </FormGroup>
          <FormGroup label="Student ID / Roll No (Optional)">
            <input
              className="input"
              placeholder="e.g. STU-2026-089"
              value={form.student_id}
              onChange={(e) => upd('student_id', e.target.value)}
            />
          </FormGroup>
        </div>

        <FormGroup label="Email Address *">
          <input
            className="input"
            type="email"
            placeholder="student@institute.com"
            value={form.email}
            onChange={(e) => upd('email', e.target.value)}
          />
        </FormGroup>

        <FormGroup label="Password *">
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              type="text"
              placeholder="Temporary password"
              value={form.password}
              onChange={(e) => upd('password', e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => upd('password', generateRandomPassword())}
              title="Auto-generate password"
            >
              <RefreshCw size={14} /> Generate
            </button>
          </div>
        </FormGroup>
      </ModalSection>

      <ModalSection title="Personal & Demographic Details">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormGroup label="Gender">
            <select
              className="input"
              value={form.gender}
              onChange={(e) => upd('gender', e.target.value)}
            >
              <option value="">Select Gender</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
              <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
            </select>
          </FormGroup>
          <FormGroup label="Date of Birth">
            <input
              className="input"
              type="date"
              value={form.dob}
              onChange={(e) => upd('dob', e.target.value)}
            />
          </FormGroup>
        </div>

        <FormGroup label="Mobile Number">
          <input
            className="input"
            placeholder="+91 9876543210"
            value={form.mobile_no}
            onChange={(e) => upd('mobile_no', e.target.value)}
          />
        </FormGroup>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <FormGroup label="Country">
            <select
              className="input"
              value={form.country}
              onChange={(e) => upd('country', e.target.value)}
            >
              <option value="">Select Country</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </FormGroup>

          <FormGroup label="State">
            <select
              className="input"
              value={form.state}
              onChange={(e) => upd('state', e.target.value)}
              disabled={!form.country || loadingGeo}
            >
              <option value="">Select State</option>
              {states.map((s) => (
                <option key={s.code} value={s.code}>{s.name}</option>
              ))}
            </select>
          </FormGroup>

          <FormGroup label="City">
            <select
              className="input"
              value={form.city}
              onChange={(e) => upd('city', e.target.value)}
              disabled={!form.state || loadingGeo}
            >
              <option value="">Select City</option>
              {cities.map((ct) => (
                <option key={ct.name} value={ct.name}>{ct.name}</option>
              ))}
            </select>
          </FormGroup>
        </div>
      </ModalSection>
    </Modal>
  )
}

export default function StudentOnboarding() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 })
  const [modalOpen, setModalOpen] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const fetchStudents = useCallback(async (searchQuery = '', pageNum = 1) => {
    try {
      setLoading(true)
      const res = await studentsApi.list({ search: searchQuery, page: pageNum, limit: 15 })
      const data = res.data?.data || {}
      setStudents(data.students || [])
      setPagination(data.pagination || { total: 0, totalPages: 1 })
    } catch (err) {
      setErrorMsg('Failed to load student directory')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStudents(search, page)
  }, [fetchStudents, search, page])

  const handleStudentCreated = (student) => {
    setSuccessMsg(`Successfully onboarded student "${student.name}" (${student.email})! Credentials dispatched to their email.`)
    fetchStudents(search, 1)
    setTimeout(() => setSuccessMsg(''), 6000)
  }

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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, maxWidth: 360 }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input
              className="input"
              placeholder="Search student name, email, ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ paddingLeft: 34 }}
            />
          </div>
        </div>

        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={15} /> Onboard Student
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Student ID</th>
                <th>Contact & Location</th>
                <th>Admin Assigned Courses</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--text3)' }}>
                    Loading student directory…
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
                    No students found. Click <strong>"Onboard Student"</strong> to create a student account.
                  </td>
                </tr>
              ) : (
                students.map((st) => (
                  <tr key={st.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar" style={{ background: 'var(--blue-bg)', fontWeight: 600 }}>
                          {st.name?.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{st.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{st.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-gray" style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>
                        {st.student_id || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                        {st.mobile_no || '—'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {[st.city, st.state, st.country].filter(Boolean).join(', ') || 'No location set'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {st.show_access && st.show_access.filter(sa => sa.access_type === 'ADMIN_GRANTED').length > 0 ? (
                          st.show_access.filter(sa => sa.access_type === 'ADMIN_GRANTED').map((sa) => (
                            <span key={sa.id} className="badge badge-blue" style={{ fontSize: 10 }}>
                              {sa.show?.title}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text3)' }}>No courses assigned</span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>
                      {st.createdAt ? new Date(st.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              Showing {students.length} of {pagination.total} students
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <OnboardModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleStudentCreated}
      />
    </div>
  )
}
