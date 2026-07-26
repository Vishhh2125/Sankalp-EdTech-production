import { useState, useEffect, useRef } from 'react'
import { Edit2, Eye, Plus, Trash2, Globe, Search, RefreshCw, AlertCircle, CheckCircle, ArrowLeft, Code, Layout } from 'lucide-react'
import Modal, { FormGroup, ModalSection } from '../components/ui/Modal.jsx'
import { cmsApi } from '../services/api.js'

function slugify(text) {
  if (!text) return ''
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
}

function formatDate(dateStr) {
  if (!dateStr) return 'Not set'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function PageEditorModal({ open, onClose, onSave, initial, onPreview, loading }) {
  const isEdit = !!initial?.id
  const [form, setForm] = useState({ name: '', slug: '', content: '', status: 'draft' })
  const [userCustomizedSlug, setUserCustomizedSlug] = useState(false)
  const [editorMode, setEditorMode] = useState('visual') // 'visual' | 'code'
  const [activeCommands, setActiveCommands] = useState({
    bold: false,
    italic: false,
    underline: false,
    h1: false,
    h2: false,
    insertUnorderedList: false,
  })
  
  const textareaRef = useRef(null)
  const visualEditorRef = useRef(null)

  const updateActiveState = () => {
    if (editorMode !== 'visual') return
    try {
      const isBold = document.queryCommandState('bold')
      const isItalic = document.queryCommandState('italic')
      const isUnderline = document.queryCommandState('underline')
      const isList = document.queryCommandState('insertUnorderedList')

      let isH1 = false
      let isH2 = false
      try {
        const block = (document.queryCommandValue('formatBlock') || '').toLowerCase()
        isH1 = block.includes('h1')
        isH2 = block.includes('h2')
      } catch {}

      setActiveCommands({
        bold: isBold,
        italic: isItalic,
        underline: isUnderline,
        h1: isH1,
        h2: isH2,
        insertUnorderedList: isList,
      })
    } catch {}
  }

  useEffect(() => {
    if (open) {
      const initialContent = initial?.content || ''
      setForm({
        id: initial?.id,
        name: initial?.name || '',
        slug: initial?.slug || '',
        content: initialContent,
        status: initial?.status || 'draft',
        version: initial?.version || 1,
      })
      setUserCustomizedSlug(!!initial?.id)
      setEditorMode('visual')

      // Sync visual editor innerHTML after render
      setTimeout(() => {
        if (visualEditorRef.current) {
          visualEditorRef.current.innerHTML = initialContent
          updateActiveState()
        }
      }, 50)
    }
  }, [open, initial])

  const handleNameChange = (e) => {
    const newName = e.target.value
    setForm((prev) => {
      const updated = { ...prev, name: newName }
      if (!userCustomizedSlug) {
        updated.slug = slugify(newName)
      }
      return updated
    })
  }

  const handleSlugChange = (e) => {
    setUserCustomizedSlug(true)
    setForm((prev) => ({ ...prev, slug: slugify(e.target.value) }))
  }

  const updateContentFromVisual = () => {
    if (visualEditorRef.current) {
      const html = visualEditorRef.current.innerHTML
      setForm((prev) => ({ ...prev, content: html }))
    }
  }

  const switchMode = (newMode) => {
    if (newMode === editorMode) return
    if (newMode === 'code') {
      // Switching to code mode: sync from visual editor to content state
      if (visualEditorRef.current) {
        setForm((prev) => ({ ...prev, content: visualEditorRef.current.innerHTML }))
      }
    } else {
      // Switching to visual mode: sync from content state to visual editor innerHTML
      setTimeout(() => {
        if (visualEditorRef.current) {
          visualEditorRef.current.innerHTML = form.content
          updateActiveState()
        }
      }, 50)
    }
    setEditorMode(newMode)
  }

  const execVisualCommand = (cmd, arg = null) => {
    if (editorMode === 'visual') {
      if (visualEditorRef.current) {
        visualEditorRef.current.focus()
      }
      if (cmd === 'createLink') {
        const url = prompt('Enter URL link:', 'https://')
        if (url) {
          document.execCommand('createLink', false, url)
        }
      } else if (cmd === 'h1' || cmd === 'h2') {
        let currentBlock = ''
        try {
          currentBlock = (document.queryCommandValue('formatBlock') || '').toLowerCase()
        } catch {}

        if (currentBlock.includes(cmd.toLowerCase())) {
          document.execCommand('formatBlock', false, '<P>')
        } else {
          document.execCommand('formatBlock', false, `<${cmd.toUpperCase()}>`)
        }
      } else {
        document.execCommand(cmd, false, arg)
      }
      updateContentFromVisual()
      setTimeout(updateActiveState, 20)
    } else {
      // Raw HTML mode fallback insertion
      insertCodeTag(cmd)
    }
  }

  const insertCodeTag = (cmd) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const currentVal = form.content || ''
    const selectedText = currentVal.substring(start, end)

    let openTag = ''
    let closeTag = ''
    let defaultText = 'sample text'

    switch (cmd) {
      case 'bold': openTag = '<b>'; closeTag = '</b>'; defaultText = 'Bold text'; break
      case 'italic': openTag = '<i>'; closeTag = '</i>'; defaultText = 'Italic text'; break
      case 'underline': openTag = '<u>'; closeTag = '</u>'; defaultText = 'Underlined text'; break
      case 'h1': openTag = '<h1>'; closeTag = '</h1>'; defaultText = 'Heading 1'; break
      case 'h2': openTag = '<h2>'; closeTag = '</h2>'; defaultText = 'Heading 2'; break
      case 'insertUnorderedList': openTag = '<ul>\n  <li>'; closeTag = '</li>\n</ul>'; defaultText = 'List item 1'; break
      case 'createLink': openTag = '<a href="https://example.com">'; closeTag = '</a>'; defaultText = 'Link title'; break
      default: break
    }

    const textToWrap = selectedText || defaultText
    const replacement = `${openTag}${textToWrap}${closeTag}`
    const newContent = currentVal.substring(0, start) + replacement + currentVal.substring(end)

    setForm((prev) => ({ ...prev, content: newContent }))

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + openTag.length, start + openTag.length + textToWrap.length)
    }, 50)
  }

  if (!open) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit — ${form.name || initial?.name}` : 'Create New CMS Page'}
      width={760}
      footer={
        <>
          <button
            className="btn btn-ghost"
            onClick={() => {
              const currentContent = editorMode === 'visual' && visualEditorRef.current
                ? visualEditorRef.current.innerHTML
                : form.content
              onPreview({ ...form, content: currentContent })
            }}
            disabled={loading}
          >
            <Eye size={13} style={{ marginRight: 4 }} /> Preview
          </button>
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              const currentContent = editorMode === 'visual' && visualEditorRef.current
                ? visualEditorRef.current.innerHTML
                : form.content
              onSave({ ...form, content: currentContent, status: 'draft' })
            }}
            disabled={loading || !form.name.trim()}
          >
            Save as Draft
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              const currentContent = editorMode === 'visual' && visualEditorRef.current
                ? visualEditorRef.current.innerHTML
                : form.content
              onSave({ ...form, content: currentContent, status: 'published' })
            }}
            disabled={loading || !form.name.trim()}
          >
            {loading ? 'Publishing...' : 'Publish'}
          </button>
        </>
      }
    >
      <ModalSection title="Page Details">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <FormGroup label="Page Name *">
            <input
              className="input"
              placeholder="e.g. Terms & Conditions"
              value={form.name}
              onChange={handleNameChange}
            />
          </FormGroup>

          <FormGroup label="URL Slug *" hint={`Preview: /page/${form.slug || 'slug'}`}>
            <input
              className="input"
              placeholder="terms-conditions"
              value={form.slug}
              onChange={handleSlugChange}
            />
          </FormGroup>
        </div>
      </ModalSection>

      <ModalSection title="Content Editor">
        {/* Mode Toggle Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>
            Page Body Content
          </div>
          <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 6, padding: 2, gap: 2 }}>
            <button
              type="button"
              onClick={() => switchMode('visual')}
              style={{
                border: 'none',
                background: editorMode === 'visual' ? 'var(--bg)' : 'transparent',
                color: editorMode === 'visual' ? 'var(--text)' : 'var(--text3)',
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: editorMode === 'visual' ? 600 : 400,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Layout size={12} /> Visual Mode
            </button>
            <button
              type="button"
              onClick={() => switchMode('code')}
              style={{
                border: 'none',
                background: editorMode === 'code' ? 'var(--bg)' : 'transparent',
                color: editorMode === 'code' ? 'var(--text)' : 'var(--text3)',
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: editorMode === 'code' ? 600 : 400,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Code size={12} /> HTML Code Mode
            </button>
          </div>
        </div>

        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
            background: 'var(--bg2)',
          }}
        >
          {/* Rich Text Toolbar */}
          <div
            style={{
              background: 'var(--bg3)',
              borderBottom: '1px solid var(--border)',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
            }}
          >
            {[
              { label: 'B', cmd: 'bold', title: 'Bold' },
              { label: 'I', cmd: 'italic', title: 'Italic' },
              { label: 'U', cmd: 'underline', title: 'Underline' },
              { label: 'H1', cmd: 'h1', title: 'Heading 1' },
              { label: 'H2', cmd: 'h2', title: 'Heading 2' },
              { label: '• List', cmd: 'insertUnorderedList', title: 'Bullet List' },
              { label: '🔗 Link', cmd: 'createLink', title: 'Hyperlink' },
            ].map((btn) => {
              const isActive = activeCommands[btn.cmd]
              return (
                <button
                  key={btn.cmd}
                  type="button"
                  title={btn.title}
                  onClick={() => execVisualCommand(btn.cmd)}
                  style={{
                    background: isActive ? 'var(--primary, #e11d48)' : 'var(--bg4)',
                    border: isActive ? '1px solid var(--primary, #e11d48)' : '1px solid var(--border)',
                    borderRadius: 5,
                    padding: '5px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    color: isActive ? '#ffffff' : 'var(--text2)',
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 0 10px rgba(225, 29, 72, 0.45)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {btn.label}
                </button>
              )
            })}
          </div>

          {/* Visual Editable Canvas */}
          {editorMode === 'visual' ? (
            <div
              ref={visualEditorRef}
              contentEditable
              className="cms-editor-canvas"
              onInput={() => {
                updateContentFromVisual()
                updateActiveState()
              }}
              onKeyUp={updateActiveState}
              onMouseUp={updateActiveState}
              onClick={updateActiveState}
              onSelect={updateActiveState}
              style={{
                minHeight: 250,
                maxHeight: 400,
                overflowY: 'auto',
                padding: '18px 22px',
                fontSize: 14,
                lineHeight: 1.7,
                color: 'var(--text)',
                outline: 'none',
                background: 'var(--bg)',
              }}
            />
          ) : (
            /* HTML Code Textarea */
            <textarea
              ref={textareaRef}
              className="input"
              rows={12}
              style={{
                width: '100%',
                border: 'none',
                borderRadius: 0,
                resize: 'vertical',
                fontFamily: 'monospace',
                fontSize: 13,
                lineHeight: 1.6,
                padding: 12,
              }}
              placeholder="Write HTML formatted content..."
              value={form.content}
              onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
            />
          )}
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text3)' }}>
          {editorMode === 'visual'
            ? 'Format text using toolbar buttons or type naturally. Text renders visually as formatted.'
            : 'Direct HTML editing mode for tags, headings, lists, and links.'}
        </div>
      </ModalSection>
    </Modal>
  )
}

function PreviewModal({ open, onClose, page, onBackToEdit, onSave, loading }) {
  if (!page || !open) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Preview — ${page.name || 'Untitled'}`}
      width={720}
      footer={
        <>
          <button
            className="btn btn-ghost"
            onClick={() => onBackToEdit(page)}
            disabled={loading}
            style={{ marginRight: 'auto' }}
          >
            <ArrowLeft size={13} style={{ marginRight: 4 }} /> Back to Edit
          </button>
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Close
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => onSave({ ...page, status: 'draft' })}
            disabled={loading || !page.name?.trim()}
          >
            Save as Draft
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onSave({ ...page, status: 'published' })}
            disabled={loading || !page.name?.trim()}
          >
            {loading ? 'Publishing...' : 'Publish'}
          </button>
        </>
      }
    >
      <div
        style={{
          background: 'var(--bg)',
          borderRadius: 8,
          padding: 24,
          border: '1px solid var(--border)',
          minHeight: 220,
          maxHeight: 480,
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            borderBottom: '1px solid var(--border)',
            paddingBottom: 12,
          }}
        >
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text)' }}>
              {page.name || 'Untitled Page'}
            </h1>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
              Slug:{' '}
              <code style={{ background: 'var(--bg3)', padding: '2px 6px', borderRadius: 4 }}>
                /{page.slug || 'slug'}
              </code>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <span className={`badge ${page.status === 'published' ? 'badge-green' : 'badge-amber'}`}>
              {page.status === 'published' ? 'Published' : 'Draft'}
            </span>
            {page.version && <span className="badge badge-blue">v{page.version}</span>}
          </div>
        </div>

        {page.content ? (
          <div
            className="cms-preview-content"
            style={{
              fontSize: 14,
              color: 'var(--text2)',
              lineHeight: 1.8,
              whiteSpace: 'pre-wrap',
            }}
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        ) : (
          <div style={{ color: 'var(--text3)', fontStyle: 'italic', padding: '20px 0', textAlign: 'center' }}>
            (No content authored yet)
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 14,
          fontSize: 11,
          color: 'var(--text3)',
          display: 'flex',
          justify: 'space-between',
        }}
      >
        <span>App path: profile/cms/{page.slug}</span>
        <span>Last updated: {formatDate(page.updated_at || new Date())}</span>
      </div>
    </Modal>
  )
}

function DeleteModal({ open, onClose, onConfirm, page, loading }) {
  if (!open || !page) return null

  return (
    <Modal open={open} onClose={onClose} title="Delete CMS Page" width={440}>
      <div style={{ padding: '8px 0' }}>
        <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
          Are you sure you want to permanently delete <strong>"{page.name}"</strong>?
        </p>
        <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0 }}>
          This page will be permanently removed from the database and will no longer be accessible in the app.
        </p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
          Cancel
        </button>
        <button className="btn btn-danger" onClick={() => onConfirm(page.id)} disabled={loading}>
          {loading ? 'Deleting...' : 'Delete Page'}
        </button>
      </div>
    </Modal>
  )
}

export default function CMS() {
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [modal, setModal] = useState(null) // 'edit' | 'preview' | 'delete'
  const [selected, setSelected] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadPages = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await cmsApi.list()
      const data = res.data?.data || []
      setPages(data)
    } catch (err) {
      console.error('Failed to load CMS pages:', err)
      setError(err.response?.data?.message || 'Failed to load CMS pages')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPages()
  }, [])

  const handleSavePage = async (formData) => {
    try {
      setActionLoading(true)
      if (formData.id) {
        await cmsApi.update(formData.id, formData)
        showToast(`Page "${formData.name}" updated successfully`)
      } else {
        await cmsApi.create(formData)
        showToast(`Page "${formData.name}" created successfully`)
      }
      setModal(null)
      setSelected(null)
      await loadPages()
    } catch (err) {
      console.error('Failed to save CMS page:', err)
      alert(err.response?.data?.message || 'Failed to save CMS page')
    } finally {
      setActionLoading(false)
    }
  }

  const handleStatusToggle = async (page) => {
    const nextStatus = page.status === 'published' ? 'draft' : 'published'
    try {
      setActionLoading(true)
      await cmsApi.updateStatus(page.id, nextStatus)
      showToast(`Page "${page.name}" is now ${nextStatus}`)
      await loadPages()
    } catch (err) {
      console.error('Failed to update page status:', err)
      alert(err.response?.data?.message || 'Failed to update status')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeletePage = async (id) => {
    try {
      setActionLoading(true)
      await cmsApi.delete(id)
      showToast('Page deleted successfully')
      setModal(null)
      setSelected(null)
      await loadPages()
    } catch (err) {
      console.error('Failed to delete CMS page:', err)
      alert(err.response?.data?.message || 'Failed to delete page')
    } finally {
      setActionLoading(false)
    }
  }

  const filteredPages = pages.filter((pg) => {
    const matchesSearch =
      pg.name.toLowerCase().includes(search.toLowerCase()) ||
      pg.slug.toLowerCase().includes(search.toLowerCase())
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'published' && pg.status === 'published') ||
      (statusFilter === 'draft' && pg.status === 'draft')
    return matchesSearch && matchesStatus
  })

  const publishedCount = pages.filter((p) => p.status === 'published').length
  const draftCount = pages.filter((p) => p.status === 'draft').length

  return (
    <div className="page-enter" style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      {/* Dynamic List & Typography CSS Styles */}
      <style>{`
        .cms-editor-canvas, .cms-preview-content {
          line-height: 1.7;
          font-size: 14px;
          color: var(--text, #f1f5f9);
        }

        .cms-editor-canvas h1, .cms-preview-content h1 {
          font-size: 22px !important;
          font-weight: 700 !important;
          color: var(--text, #ffffff) !important;
          margin-top: 16px !important;
          margin-bottom: 12px !important;
          line-height: 1.3 !important;
        }

        .cms-editor-canvas h2, .cms-preview-content h2 {
          font-size: 18px !important;
          font-weight: 700 !important;
          color: var(--text, #ffffff) !important;
          margin-top: 14px !important;
          margin-bottom: 10px !important;
          line-height: 1.4 !important;
        }

        .cms-editor-canvas p, .cms-preview-content p {
          margin-top: 0 !important;
          margin-bottom: 12px !important;
          line-height: 1.7 !important;
        }

        .cms-editor-canvas ul, .cms-preview-content ul {
          margin-top: 8px !important;
          margin-bottom: 16px !important;
          padding-left: 28px !important;
          list-style-type: disc !important;
        }

        .cms-editor-canvas ol, .cms-preview-content ol {
          margin-top: 8px !important;
          margin-bottom: 16px !important;
          padding-left: 28px !important;
          list-style-type: decimal !important;
        }

        .cms-editor-canvas li, .cms-preview-content li {
          margin-bottom: 8px !important;
          padding-left: 4px !important;
          line-height: 1.6 !important;
          color: var(--text2, #cbd5e1) !important;
        }

        .cms-editor-canvas a, .cms-preview-content a {
          color: #3b82f6 !important;
          text-decoration: underline !important;
          font-weight: 500 !important;
        }

        .cms-editor-canvas b, .cms-editor-canvas strong,
        .cms-preview-content b, .cms-preview-content strong {
          font-weight: 700 !important;
          color: var(--text, #ffffff) !important;
        }

        .cms-editor-canvas i, .cms-editor-canvas em,
        .cms-preview-content i, .cms-preview-content em {
          font-style: italic !important;
        }

        .cms-editor-canvas u, .cms-preview-content u {
          text-decoration: underline !important;
        }
      `}</style>
      {/* Toast Banner */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: toast.type === 'error' ? 'var(--red, #ef4444)' : 'var(--green, #10b981)',
            color: '#fff',
            padding: '10px 16px',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: 9999,
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text)' }}>CMS & Legal Pages</h2>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
            Manage static and legal content pages rendered dynamically inside the app.
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setSelected(null)
            setModal('edit')
          }}
        >
          <Plus size={15} style={{ marginRight: 4 }} /> New Page
        </button>
      </div>

      {/* Filters and Stats */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          {/* Search bar */}
          <div style={{ position: 'relative', width: 280 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text3)' }} />
            <input
              className="input"
              style={{ paddingLeft: 32, fontSize: 13 }}
              placeholder="Search by name or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status Tabs */}
          <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 6, padding: 3, gap: 2 }}>
            {[
              { id: 'all', label: `All (${pages.length})` },
              { id: 'published', label: `Published (${publishedCount})` },
              { id: 'draft', label: `Drafts (${draftCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  border: 'none',
                  background: statusFilter === tab.id ? 'var(--bg)' : 'transparent',
                  color: statusFilter === tab.id ? 'var(--text)' : 'var(--text3)',
                  padding: '5px 12px',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: statusFilter === tab.id ? 600 : 400,
                  cursor: 'pointer',
                  boxShadow: statusFilter === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button className="btn btn-ghost btn-sm" onClick={loadPages} title="Refresh pages">
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--red)', marginBottom: 16, padding: 14 }}>
          <div style={{ color: 'var(--red)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} />
            {error}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Page Name</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>URL Slug</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Version</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Last Updated</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Status</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text2)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text3)', fontSize: 13 }}>
                    <RefreshCw size={18} className="spin" style={{ marginBottom: 8 }} />
                    <div>Loading CMS pages...</div>
                  </td>
                </tr>
              ) : filteredPages.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text3)' }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>No CMS pages found</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      {search || statusFilter !== 'all'
                        ? 'Try clearing filters or search terms'
                        : 'Click "New Page" above to create your first static page'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPages.map((pg) => (
                  <tr key={pg.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                      {pg.name}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <code style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--primary)', background: 'var(--bg3)', padding: '2px 6px', borderRadius: 4 }}>
                        /{pg.slug}
                      </code>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="badge badge-blue" style={{ fontSize: 11 }}>
                        v{pg.version || 1}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text3)', fontSize: 12 }}>
                      {formatDate(pg.updated_at)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${pg.status === 'published' ? 'badge-green' : 'badge-amber'}`}>
                        {pg.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setSelected(pg)
                            setModal('edit')
                          }}
                          title="Edit page"
                        >
                          <Edit2 size={12} /> Edit
                        </button>

                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setSelected(pg)
                            setModal('preview')
                          }}
                          title="Preview page"
                        >
                          <Eye size={12} /> Preview
                        </button>

                        <button
                          className={`btn btn-sm ${pg.status === 'published' ? 'btn-ghost' : 'btn-secondary'}`}
                          onClick={() => handleStatusToggle(pg)}
                          title={pg.status === 'published' ? 'Unpublish page' : 'Publish page'}
                          disabled={actionLoading}
                        >
                          {pg.status === 'published' ? 'Unpublish' : 'Publish'}
                        </button>

                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--red)' }}
                          onClick={() => {
                            setSelected(pg)
                            setModal('delete')
                          }}
                          title="Delete page"
                          disabled={actionLoading}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Modal */}
      <PageEditorModal
        open={modal === 'edit'}
        onClose={() => {
          setModal(null)
          setSelected(null)
        }}
        onSave={handleSavePage}
        initial={selected}
        onPreview={(formState) => {
          setSelected(formState)
          setModal('preview')
        }}
        loading={actionLoading}
      />

      {/* Preview Modal */}
      <PreviewModal
        open={modal === 'preview'}
        onClose={() => {
          setModal(null)
        }}
        page={selected}
        onBackToEdit={(pageState) => {
          setSelected(pageState)
          setModal('edit')
        }}
        onSave={handleSavePage}
        loading={actionLoading}
      />

      {/* Delete Modal */}
      <DeleteModal
        open={modal === 'delete'}
        onClose={() => {
          setModal(null)
          setSelected(null)
        }}
        onConfirm={handleDeletePage}
        page={selected}
        loading={actionLoading}
      />
    </div>
  )
}
