import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  apiRequest,
  ApiError,
  authHeaders,
  type AiClassificationResponse,
  type AuditLogEntry,
  type AuthUser,
  type BlockchainVerifyResponse,
  type BackupResponse,
  type BackupRestoreVerificationResponse,
  type CustodyEventResponse,
  type DuplicateCheckResponse,
  type DocumentListItem,
  type DocumentMetadata,
  type DocumentVersionMetadata,
  type RequiredFieldValidationResponse,
  type MetadataValidationResult,
  type ShareAccessResponse,
  type ShareMetadata,
  type LoginChallenge,
  type TokenResponse,
} from './lib/api'

type AuthStep = 'login' | 'otp' | 'authenticated'
type NavItem = { label: string; path: string }

const tokenStorageKey = 'dms.access_token'
const backupMetadataStorageKey = 'dms.last_backup_metadata'
const navigationItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Documents', path: '/documents' },
  { label: 'Upload Document', path: '/documents/upload' },
  { label: 'Cases', path: '/cases' },
  { label: 'Sharing', path: '/sharing' },
  { label: 'Chain of Custody', path: '/custody' },
  { label: 'Audit Logs', path: '/audit-logs' },
  { label: 'Blockchain Integrity', path: '/blockchain' },
  { label: 'Backup & Restore', path: '/backup-restore' },
]

function isProtectedPath(path: string) {
  return path === '/dashboard' || path === '/documents' || path.startsWith('/documents/') || path === '/audit-logs' || path === '/backup-restore'
}

function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [step, setStep] = useState<AuthStep>(() => (sessionStorage.getItem(tokenStorageKey) ? 'authenticated' : 'login'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [challenge, setChallenge] = useState<LoginChallenge | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    const token = sessionStorage.getItem(tokenStorageKey)
    if (token) void loadCurrentUser(token)
    else if (isProtectedPath(window.location.pathname)) navigate('/')
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function navigate(nextPath: string) {
    if (nextPath === '/audit-logs' && user?.role.toUpperCase() !== 'ADMIN') return
    window.history.pushState({}, '', nextPath)
    setPath(nextPath)
  }

  async function loadCurrentUser(token: string) {
    try {
      const currentUser = await apiRequest<AuthUser>('/api/auth/me', { headers: authHeaders(token) })
      setUser(currentUser)
      setStep('authenticated')
      if (!isProtectedPath(window.location.pathname)) navigate('/dashboard')
    } catch {
      sessionStorage.removeItem(tokenStorageKey)
      setStep('login')
      if (isProtectedPath(window.location.pathname)) navigate('/')
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await apiRequest<LoginChallenge>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      setChallenge(result)
      setPassword('')
      setOtp('')
      setStep('otp')
    } catch (requestError) {
      setError(requestError instanceof ApiError && requestError.status === 401 ? 'Email or password was not accepted.' : 'Sign-in could not be completed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!challenge) return
    setError('')
    setLoading(true)
    try {
      const result = await apiRequest<TokenResponse>('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge_id: challenge.challenge_id, otp }),
      })
      sessionStorage.setItem(tokenStorageKey, result.access_token)
      await loadCurrentUser(result.access_token)
    } catch (requestError) {
      setError(requestError instanceof ApiError && requestError.status === 401 ? getOtpError(requestError.message) : 'Verification could not be completed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    sessionStorage.removeItem(tokenStorageKey)
    sessionStorage.removeItem(backupMetadataStorageKey)
    setUser(null)
    setChallenge(null)
    setEmail('')
    setOtp('')
    setError('')
    setStep('login')
    navigate('/')
  }

  if (step === 'authenticated' && user) {
    if (path === '/documents') return <DocumentsView user={user} onNavigate={navigate} onLogout={logout} />
    if (path === '/documents/upload') return <UploadDocumentView user={user} onNavigate={navigate} onLogout={logout} />
    if (path.startsWith('/documents/')) return <DocumentDetailsView path={path} user={user} onNavigate={navigate} onLogout={logout} />
    if (path === '/audit-logs') return <AuditLogsView user={user} onNavigate={navigate} onLogout={logout} />
    if (path === '/backup-restore') return <BackupRestoreView user={user} onNavigate={navigate} onLogout={logout} />
    return <DashboardView user={user} path={path} onNavigate={navigate} onLogout={logout} />
  }

  return (
    <main className="min-h-screen bg-[#f4f1ea] px-5 py-6 text-[#202b2a] sm:px-8 sm:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-[#d9d5ca] bg-[#fbfaf6] shadow-[0_24px_80px_rgba(43,51,46,0.12)] lg:grid-cols-[1.05fr_0.95fr]">
        <aside className="hidden bg-[#1e5b57] p-12 text-[#f8f5ed] lg:flex lg:flex-col lg:justify-between">
          <Brand light />
          <div>
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-[#e6a27e]">Secure access</p>
            <h1 className="max-w-md text-5xl font-semibold leading-[1.05] tracking-[-0.04em]">A calm front door for sensitive work.</h1>
            <p className="mt-6 max-w-sm text-base leading-7 text-[#c4d7cf]">Sign in to continue to the secure document workspace.</p>
          </div>
          <p className="text-xs text-[#a8c3b9]">Protected DMS environment</p>
        </aside>
        <section className="flex items-center px-6 py-10 sm:px-12 lg:px-16">
          <div className="w-full max-w-md">
            <div className="mb-10 lg:hidden"><Brand /></div>
            {step === 'login' ? <LoginForm email={email} password={password} setEmail={setEmail} setPassword={setPassword} onSubmit={handleLogin} loading={loading} error={error} /> : <OtpForm otp={otp} setOtp={setOtp} onSubmit={handleOtp} onBack={() => { setError(''); setStep('login') }} loading={loading} error={error} />}
          </div>
        </section>
      </div>
    </main>
  )
}

function Brand({ light = false }: { light?: boolean }) {
  return <div className="flex items-center gap-3"><div className={`grid size-10 place-items-center rounded-xl text-sm font-bold ${light ? 'bg-[#f8f5ed] text-[#1e5b57]' : 'bg-[#1e5b57] text-[#f8f5ed]'}`}>D</div><div><p className={`text-sm font-semibold tracking-[0.18em] ${light ? 'text-[#f8f5ed]' : 'text-[#1e5b57]'}`}>DMS</p><p className={`text-xs ${light ? 'text-[#a8c3b9]' : 'text-[#7a8179]'}`}>Secure document workspace</p></div></div>
}

function LoginForm({ email, password, setEmail, setPassword, onSubmit, loading, error }: { email: string; password: string; setEmail: (value: string) => void; setPassword: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; loading: boolean; error: string }) {
  return <div><p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#bd6845]">Welcome back</p><h2 className="text-4xl font-semibold tracking-[-0.04em] text-[#213331]">Sign in to DMS</h2><p className="mt-4 text-sm leading-6 text-[#64706b]">Use your account credentials to begin secure verification.</p><form className="mt-9 space-y-5" onSubmit={onSubmit}><Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="username" placeholder="you@example.com" /><Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" placeholder="Enter your password" />{error && <ErrorMessage message={error} />}<button className="w-full rounded-xl bg-[#1e5b57] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#174945] disabled:cursor-not-allowed disabled:opacity-60" disabled={loading}>{loading ? 'Checking credentials...' : 'Continue'}</button></form></div>
}

function OtpForm({ otp, setOtp, onSubmit, onBack, loading, error }: { otp: string; setOtp: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onBack: () => void; loading: boolean; error: string }) {
  return <div><p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#bd6845]">Second factor</p><h2 className="text-4xl font-semibold tracking-[-0.04em] text-[#213331]">Verify your sign-in</h2><p className="mt-4 text-sm leading-6 text-[#64706b]">Enter the six-digit verification code from your development delivery channel.</p><form className="mt-9 space-y-5" onSubmit={onSubmit}><label className="block"><span className="mb-2 block text-sm font-medium text-[#34413e]">Verification code</span><input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} placeholder="000000" className="w-full rounded-xl border border-[#d8d5ca] bg-white px-4 py-3 text-center font-mono text-2xl tracking-[0.35em] text-[#213331] outline-none transition focus:border-[#1e5b57] focus:ring-4 focus:ring-[#1e5b57]/10" /></label>{error && <ErrorMessage message={error} />}<button className="w-full rounded-xl bg-[#1e5b57] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#174945] disabled:cursor-not-allowed disabled:opacity-60" disabled={loading}>{loading ? 'Verifying...' : 'Verify and continue'}</button><button type="button" onClick={onBack} className="w-full py-2 text-sm font-medium text-[#64706b] hover:text-[#1e5b57]">Use a different account</button></form></div>
}

function DashboardView({ user, path, onNavigate, onLogout }: { user: AuthUser; path: string; onNavigate: (nextPath: string) => void; onLogout: () => void }) {
  const activePath = path === '/dashboard' ? path : '/dashboard'

  return <main className="min-h-screen bg-[#f4f1ea] p-4 text-[#202b2a] sm:p-6"><div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1440px] overflow-hidden rounded-[2rem] border border-[#d9d5ca] bg-[#fbfaf6] shadow-[0_24px_80px_rgba(43,51,46,0.12)] sm:min-h-[calc(100vh-3rem)]"><aside className="hidden w-72 shrink-0 flex-col bg-[#1e5b57] p-6 text-[#f8f5ed] lg:flex"><Brand light /><div className="mt-12"><p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a8c3b9]">Workspace</p><nav className="space-y-1" aria-label="Dashboard navigation">{navigationItems.map((item) => <button key={item.path} type="button" onClick={() => onNavigate(item.path)} className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm transition ${item.path === activePath ? 'bg-[#f8f5ed] font-semibold text-[#1e5b57]' : 'text-[#d2e1db] hover:bg-white/10 hover:text-white'}`}>{item.label}</button>)}</nav></div><div className="mt-auto rounded-2xl border border-white/15 bg-white/10 p-4"><p className="text-xs text-[#a8c3b9]">Current role</p><p className="mt-1 text-sm font-semibold text-white">{user.role}</p></div></aside><div className="flex min-w-0 flex-1 flex-col"><header className="flex items-center justify-between border-b border-[#e4e0d6] px-5 py-5 sm:px-8"><div className="lg:hidden"><Brand /></div><div className="hidden lg:block"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#bd6845]">Secure workspace</p><p className="mt-1 text-sm text-[#7a8179]">Dashboard</p></div><button onClick={onLogout} className="rounded-lg px-3 py-2 text-sm font-medium text-[#64706b] hover:bg-[#eef3ee] hover:text-[#1e5b57]">Sign out</button></header><div className="border-b border-[#e4e0d6] px-5 py-4 lg:hidden"><div className="flex gap-2 overflow-x-auto pb-1" aria-label="Dashboard navigation">{navigationItems.map((item) => <button key={item.path} type="button" onClick={() => onNavigate(item.path)} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs ${item.path === activePath ? 'border-[#1e5b57] bg-[#1e5b57] text-white' : 'border-[#d9d5ca] text-[#64706b]'}`}>{item.label}</button>)}</div></div><section className="flex-1 px-5 py-8 sm:px-8 lg:px-12 lg:py-12"><div className="max-w-4xl"><p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#bd6845]">Authenticated</p><h1 className="text-4xl font-semibold tracking-[-0.04em] text-[#213331] sm:text-5xl">Welcome to your workspace.</h1><p className="mt-4 max-w-2xl text-base leading-7 text-[#64706b]">Your secure DMS foundation is ready. The workspace modules are staged in the navigation and will be added one at a time.</p><div className="mt-10 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-[#dce4dd] bg-[#f1f7f2] p-5"><p className="text-xs uppercase tracking-[0.16em] text-[#6e8177]">Username</p><p className="mt-2 break-all text-lg font-semibold text-[#1e5b57]">{user.username}</p></div><div className="rounded-2xl border border-[#dce4dd] bg-[#f1f7f2] p-5"><p className="text-xs uppercase tracking-[0.16em] text-[#6e8177]">Email</p><p className="mt-2 break-all text-lg font-semibold text-[#1e5b57]">{user.username}</p></div><div className="rounded-2xl border border-[#e0ddd4] bg-white/70 p-5"><p className="text-xs uppercase tracking-[0.16em] text-[#8b918a]">Role</p><p className="mt-2 text-lg font-semibold text-[#bd6845]">{user.role}</p></div><div className="rounded-2xl border border-[#e0ddd4] bg-white/70 p-5"><p className="text-xs uppercase tracking-[0.16em] text-[#8b918a]">Session</p><p className="mt-2 text-lg font-semibold text-[#276653]">Active</p></div></div></div></section></div></div></main>
}

function UploadDocumentView({ user, onNavigate, onLogout }: { user: AuthUser; onNavigate: (nextPath: string) => void; onLogout: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [caseId, setCaseId] = useState('')
  const [documentType, setDocumentType] = useState('')
  const [department, setDepartment] = useState('')
  const [sensitivity, setSensitivity] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploaded, setUploaded] = useState<DocumentMetadata | null>(null)

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] || null)
    setError('')
    setUploaded(null)
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) {
      setError('Select a document file to upload.')
      return
    }
    const allowedMimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
    }
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!allowedMimeTypes[extension] || file.type !== allowedMimeTypes[extension]) {
      setError('The selected file is unsupported or invalid.')
      return
    }
    if (!['ADMIN', 'INVESTIGATOR'].includes(user.role.toUpperCase())) {
      setError('You do not have permission to upload documents.')
      return
    }
    const token = sessionStorage.getItem(tokenStorageKey)
    if (!token) {
      onLogout()
      return
    }
    const formData = new FormData()
    formData.append('file', file)
    formData.append('case_id', caseId.trim())
    if (documentType.trim()) formData.append('document_type', documentType.trim())
    if (department.trim()) formData.append('department', department.trim())
    if (sensitivity.trim()) formData.append('sensitivity', sensitivity.trim())
    if (description.trim()) formData.append('description', description.trim())
    setLoading(true)
    setError('')
    setUploaded(null)
    try {
      const result = await apiRequest<DocumentMetadata>('/api/documents/upload', { method: 'POST', headers: authHeaders(token), body: formData })
      await apiRequest<DocumentListItem[]>('/api/documents', { headers: authHeaders(token) })
      setUploaded(result)
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        onLogout()
        return
      }
      setError(getUploadErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }

  return <main className="min-h-screen bg-[#f4f1ea] p-4 text-[#202b2a] sm:p-6"><div className="mx-auto min-h-[calc(100vh-2rem)] max-w-[1100px] overflow-hidden rounded-[2rem] border border-[#d9d5ca] bg-[#fbfaf6] shadow-[0_24px_80px_rgba(43,51,46,0.12)] sm:min-h-[calc(100vh-3rem)]"><header className="flex items-center justify-between border-b border-[#e4e0d6] px-5 py-5 sm:px-8"><div><Brand /><p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#bd6845]">Secure workspace</p></div><button onClick={onLogout} className="rounded-lg px-3 py-2 text-sm font-medium text-[#64706b] hover:bg-[#eef3ee] hover:text-[#1e5b57]">Sign out</button></header><section className="px-5 py-8 sm:px-8 lg:px-12 lg:py-12"><button type="button" onClick={() => onNavigate('/documents')} className="text-sm font-semibold text-[#1e5b57] hover:text-[#174945]">Back to Documents</button><p className="mt-8 mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#bd6845]">Document intake</p><h1 className="text-4xl font-semibold tracking-[-0.04em] text-[#213331]">Upload Document</h1><p className="mt-3 text-base leading-7 text-[#64706b]">Add a document and its case metadata to the secure workspace.</p><form className="mt-8 space-y-5 rounded-2xl border border-[#e0ddd4] bg-white/70 p-5" onSubmit={handleUpload}><label className="block"><span className="mb-2 block text-sm font-medium text-[#34413e]">Document file</span><input required type="file" accept=".pdf,.docx,.jpg,.jpeg,.png" onChange={handleFileChange} className="block w-full rounded-xl border border-[#d8d5ca] bg-white px-4 py-3 text-sm text-[#213331] file:mr-4 file:rounded-lg file:border-0 file:bg-[#e7f0e8] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#1e5b57]" />{file && <span className="mt-2 block text-xs text-[#64706b]">Selected: {file.name} · {file.type || 'Unknown type'} · {file.size.toLocaleString()} bytes</span>}</label><label className="block"><span className="mb-2 block text-sm font-medium text-[#34413e]">Case ID</span><input required value={caseId} onChange={(event) => setCaseId(event.target.value)} placeholder="Case UUID" className="w-full rounded-xl border border-[#d8d5ca] bg-white px-4 py-3 text-sm text-[#213331] outline-none focus:border-[#1e5b57] focus:ring-4 focus:ring-[#1e5b57]/10" /></label><div className="grid gap-5 sm:grid-cols-2"><UploadField label="Document type" value={documentType} onChange={setDocumentType} /><UploadField label="Department" value={department} onChange={setDepartment} /><UploadField label="Sensitivity" value={sensitivity} onChange={setSensitivity} /></div><label className="block"><span className="mb-2 block text-sm font-medium text-[#34413e]">Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} className="w-full rounded-xl border border-[#d8d5ca] bg-white px-4 py-3 text-sm text-[#213331] outline-none focus:border-[#1e5b57] focus:ring-4 focus:ring-[#1e5b57]/10" /></label>{error && <ErrorMessage message={error} />}<button type="submit" disabled={loading} className="rounded-xl bg-[#1e5b57] px-5 py-3 text-sm font-semibold text-white hover:bg-[#174945] disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Uploading...' : 'Upload Document'}</button></form>{uploaded && <section className="mt-6 rounded-2xl border border-[#b9d8c0] bg-[#e7f0e8] p-5 text-sm text-[#1e5b57]"><p className="font-semibold">Upload complete</p><p className="mt-2">Filename: {uploaded.original_filename}</p><p>Document ID: {uploaded.id}</p><p>Document type: {uploaded.document_type || 'Not specified'}</p><p>Status: {uploaded.status}</p><button type="button" onClick={() => onNavigate('/documents')} className="mt-4 rounded-lg bg-[#1e5b57] px-4 py-2 text-xs font-semibold text-white hover:bg-[#174945]">View Documents</button></section>}</section></div></main>
}

function UploadField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium text-[#34413e]">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-[#d8d5ca] bg-white px-4 py-3 text-sm text-[#213331] outline-none focus:border-[#1e5b57] focus:ring-4 focus:ring-[#1e5b57]/10" /></label>
}

function getUploadErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'Upload failed. Please try again.'
  if (error.status === 400) return 'The selected file is unsupported or invalid.'
  if (error.status === 403) return 'You do not have permission to upload documents.'
  if (error.status === 413) return 'The selected file is too large. The maximum size is 20 MB.'
  if (error.status === 422) return 'Check the case ID and required metadata, then try again.'
  return 'The document could not be uploaded. Please try again.'
}

function BackupRestoreView({ user, onNavigate, onLogout }: { user: AuthUser; onNavigate: (nextPath: string) => void; onLogout: () => void }) {
  const [backup, setBackup] = useState<Omit<BackupResponse, 'backup_path'> | null>(() => {
    const stored = sessionStorage.getItem(backupMetadataStorageKey)
    if (!stored) return null
    try {
      return JSON.parse(stored) as Omit<BackupResponse, 'backup_path'>
    } catch {
      sessionStorage.removeItem(backupMetadataStorageKey)
      return null
    }
  })
  const [restoreResult, setRestoreResult] = useState<BackupRestoreVerificationResponse | null>(null)
  const [backupFile, setBackupFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [restoreLoading, setRestoreLoading] = useState(false)

  async function createBackup() {
    const token = sessionStorage.getItem(tokenStorageKey)
    if (!token) {
      onLogout()
      return
    }
    setCreateLoading(true)
    setError('')
    try {
      const result = await apiRequest<BackupResponse>('/api/backups/create', { method: 'POST', headers: authHeaders(token) })
      const { backup_path: _backupPath, ...safeResult } = result
      setBackup(safeResult)
      sessionStorage.setItem(backupMetadataStorageKey, JSON.stringify(safeResult))
      setRestoreResult(null)
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        onLogout()
        return
      }
      setError(getBackupErrorMessage(requestError))
    } finally {
      setCreateLoading(false)
    }
  }

  async function verifyBackup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!backupFile) {
      setError('Select a backup ZIP file to verify.')
      return
    }
    const token = sessionStorage.getItem(tokenStorageKey)
    if (!token) {
      onLogout()
      return
    }
    setRestoreLoading(true)
    setError('')
    const formData = new FormData()
    formData.append('backup', backupFile)
    try {
      const result = await apiRequest<BackupRestoreVerificationResponse>('/api/backups/restore-test', { method: 'POST', headers: authHeaders(token), body: formData })
      setRestoreResult(result)
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        onLogout()
        return
      }
      setError(getBackupErrorMessage(requestError))
    } finally {
      setRestoreLoading(false)
    }
  }

  return <main className="min-h-screen bg-[#f4f1ea] p-4 text-[#202b2a] sm:p-6"><div className="mx-auto min-h-[calc(100vh-2rem)] max-w-[1100px] overflow-hidden rounded-[2rem] border border-[#d9d5ca] bg-[#fbfaf6] shadow-[0_24px_80px_rgba(43,51,46,0.12)] sm:min-h-[calc(100vh-3rem)]"><header className="flex items-center justify-between border-b border-[#e4e0d6] px-5 py-5 sm:px-8"><div><Brand /><p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#bd6845]">Secure workspace</p></div><button onClick={onLogout} className="rounded-lg px-3 py-2 text-sm font-medium text-[#64706b] hover:bg-[#eef3ee] hover:text-[#1e5b57]">Sign out</button></header><section className="px-5 py-8 sm:px-8 lg:px-12 lg:py-12"><button type="button" onClick={() => onNavigate('/dashboard')} className="text-sm font-semibold text-[#1e5b57] hover:text-[#174945]">Back to Dashboard</button><p className="mt-8 mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#bd6845]">Preservation controls</p><h1 className="text-4xl font-semibold tracking-[-0.04em] text-[#213331]">Backup &amp; Restore</h1><p className="mt-3 max-w-2xl text-base leading-7 text-[#64706b]">Backups provide recovery and preservation of system data. Backup verification does not by itself establish document authenticity, authorship, legal validity, or admissibility.</p>{error && <div className="mt-6"><ErrorMessage message={error} /></div>}<div className="mt-8 grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border border-[#dce4dd] bg-[#f1f7f2] p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#bd6845]">Create backup</p><p className="mt-2 text-sm leading-6 text-[#64706b]">Create a verified application backup. Only authorized backend roles can complete this operation.</p><button type="button" onClick={createBackup} disabled={createLoading || restoreLoading} className="mt-5 rounded-lg bg-[#1e5b57] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#174945] disabled:cursor-not-allowed disabled:opacity-60">{createLoading ? 'Creating backup...' : 'Create Backup'}</button>{backup ? <span className="mt-5 block space-y-1 rounded-lg border border-[#b9d8c0] bg-white/70 p-3 text-xs leading-5 text-[#1e5b57]"><span className="block font-semibold">Backup status: {backup.status}</span><span className="block break-all">Backup identifier: {backup.backup_filename}</span><span className="block">Created: {new Date(backup.created_at).toLocaleString()}</span><span className="block">Files: {backup.documents_backed_up} documents, {backup.versions_backed_up} versions</span><span className="block">Database backup: {backup.database_backup ? 'Included' : 'Not included'}</span><span className="block">Integrity verified: {backup.integrity_verified ? 'Yes' : 'No'}</span></span> : <span className="mt-5 block text-sm text-[#64706b]">No backup is currently available.</span>}</section><section className="rounded-2xl border border-[#d8d5ca] bg-white/70 p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#bd6845]">Restore verification</p><p className="mt-2 text-sm leading-6 text-[#64706b]">Run a non-destructive temporary restore test against an existing backup ZIP.</p><form className="mt-5 space-y-3" onSubmit={verifyBackup}><input required type="file" accept=".zip,application/zip" onChange={(event) => setBackupFile(event.target.files?.[0] || null)} className="block w-full rounded-lg border border-[#d8d5ca] bg-white px-3 py-2 text-xs text-[#213331] file:mr-3 file:rounded-md file:border-0 file:bg-[#e7f0e8] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#1e5b57]" /><button type="submit" disabled={restoreLoading || createLoading} className="rounded-lg bg-[#e7f0e8] px-4 py-2.5 text-xs font-semibold text-[#1e5b57] hover:bg-[#d7e8da] disabled:cursor-not-allowed disabled:opacity-60">{restoreLoading ? 'Verifying backup...' : 'Verify Backup / Restore Test'}</button></form>{restoreResult ? <span className={`mt-5 block space-y-1 rounded-lg border p-3 text-xs leading-5 ${restoreResult.status === 'SUCCESS' && restoreResult.backup_valid && restoreResult.database_restored ? 'border-[#b9d8c0] bg-[#e7f0e8] text-[#1e5b57]' : 'border-[#e7c9bc] bg-[#fff5f0] text-[#a04e36]'}`}><span className="block font-semibold">{restoreResult.status === 'SUCCESS' && restoreResult.backup_valid ? (restoreResult.database_restored ? 'RESTORE VERIFIED' : 'BACKUP VALID') : 'FAILED'}</span><span className="block">Backup valid: {restoreResult.backup_valid ? 'Yes' : 'No'}</span><span className="block">Temporary restore verified: {restoreResult.database_restored ? 'Yes' : 'No'}</span><span className="block">Documents extracted: {restoreResult.documents_extracted}</span><span className="block">Versions verified: {restoreResult.versions_verified}</span><span className="block">Integrity verified: {restoreResult.integrity_verified ? 'Yes' : 'No'}</span><span className="block">Database counts match: {restoreResult.database_counts_match ? 'Yes' : 'No'}</span><span className="block">Cloudinary modified: {restoreResult.cloudinary_modified ? 'Yes' : 'No'}</span>{restoreResult.error && <span className="block">Verification result: {restoreResult.error}</span>}</span> : <span className="mt-5 block text-sm text-[#64706b]">No restore verification has been run.</span>}</section></div><p className="mt-6 text-xs text-[#7a8179]">Signed-in role: {user.role}</p></section></div></main>
}

function getBackupErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'The backup operation could not be completed. Please try again.'
  if (error.status === 403) return 'You do not have permission to manage backups.'
  if (error.status === 404) return 'No backup is currently available.'
  if (error.status === 422) return 'The backup could not be verified. Check the selected backup file.'
  if (error.status === 500 || error.status === 502) return 'The backup service is currently unavailable. Please try again.'
  return 'The backup operation could not be completed. Please try again.'
}

function AuditLogsView({ user, onNavigate, onLogout }: { user: AuthUser; onNavigate: (nextPath: string) => void; onLogout: () => void }) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAuditLogs() {
      if (user.role.toUpperCase() !== 'ADMIN') {
        setError('You are not authorized to view audit logs.')
        setLoading(false)
        return
      }
      const token = sessionStorage.getItem(tokenStorageKey)
      if (!token) {
        onLogout()
        return
      }
      try {
        const result = await apiRequest<AuditLogEntry[]>('/api/audit-logs?skip=0&limit=100', { headers: authHeaders(token) })
        setEntries(Array.isArray(result) ? result : [])
      } catch (requestError) {
        if (requestError instanceof ApiError && requestError.status === 401) {
          onLogout()
          return
        }
        setError(requestError instanceof ApiError && requestError.status === 403 ? 'You are not authorized to view audit logs.' : 'Audit logs could not be loaded. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    void loadAuditLogs()
  }, [])

  return <main className="min-h-screen bg-[#f4f1ea] p-4 text-[#202b2a] sm:p-6"><div className="mx-auto min-h-[calc(100vh-2rem)] max-w-[1440px] overflow-hidden rounded-[2rem] border border-[#d9d5ca] bg-[#fbfaf6] shadow-[0_24px_80px_rgba(43,51,46,0.12)] sm:min-h-[calc(100vh-3rem)]"><header className="flex items-center justify-between border-b border-[#e4e0d6] px-5 py-5 sm:px-8"><div><Brand /><p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#bd6845]">Secure workspace</p></div><button onClick={onLogout} className="rounded-lg px-3 py-2 text-sm font-medium text-[#64706b] hover:bg-[#eef3ee] hover:text-[#1e5b57]">Sign out</button></header><section className="px-5 py-8 sm:px-8 lg:px-12 lg:py-12"><button type="button" onClick={() => onNavigate('/dashboard')} className="text-sm font-semibold text-[#1e5b57] hover:text-[#174945]">Back to Dashboard</button><p className="mt-8 mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#bd6845]">Application record</p><h1 className="text-4xl font-semibold tracking-[-0.04em] text-[#213331]">Audit Logs</h1><p className="mt-3 text-base leading-7 text-[#64706b]">Review application-recorded activity across the secure workspace.</p>{loading ? <div className="mt-8 rounded-2xl border border-[#e0ddd4] bg-white/70 p-6 text-sm text-[#64706b]">Loading audit logs...</div> : error ? <div className="mt-8"><ErrorMessage message={error} /></div> : entries.length === 0 ? <div className="mt-8 rounded-2xl border border-[#e0ddd4] bg-white/70 p-6 text-sm text-[#64706b]">No audit events are currently available.</div> : <div className="mt-8 overflow-hidden rounded-2xl border border-[#e0ddd4] bg-white/80"><div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="border-b border-[#e0ddd4] bg-[#f1f7f2] text-xs uppercase tracking-[0.12em] text-[#6e8177]"><tr><th className="px-5 py-4 font-semibold">Timestamp</th><th className="px-5 py-4 font-semibold">Event</th><th className="px-5 py-4 font-semibold">Result</th><th className="px-5 py-4 font-semibold">Document ID</th><th className="px-5 py-4 font-semibold">User ID</th><th className="px-5 py-4 font-semibold">Details</th></tr></thead><tbody className="divide-y divide-[#eeeae1]">{entries.map((entry) => <tr key={entry.id} className="text-[#34413e]"><td className="whitespace-nowrap px-5 py-4">{new Date(entry.timestamp).toLocaleString()}</td><td className="px-5 py-4 font-semibold text-[#213331]">{entry.action}</td><td className="px-5 py-4">{entry.result || 'Not specified'}</td><td className="px-5 py-4 font-mono text-xs">{entry.resource_type === 'document' ? entry.resource_id || 'Not specified' : 'Not specified'}</td><td className="px-5 py-4 font-mono text-xs">{entry.user_id || 'System'}</td><td className="max-w-md break-words px-5 py-4 text-xs text-[#64706b]">{entry.details || 'No details recorded'}</td></tr>)}</tbody></table></div></div>}</section></div></main>
}

function DocumentsView({ user, onNavigate, onLogout }: { user: AuthUser; onNavigate: (nextPath: string) => void; onLogout: () => void }) {
  const [documents, setDocuments] = useState<DocumentListItem[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [caseId, setCaseId] = useState('')
  const [documentType, setDocumentType] = useState('')
  const [department, setDepartment] = useState('')
  const [status, setStatus] = useState('')

  async function loadDocuments(path = '/api/documents') {
    const token = sessionStorage.getItem(tokenStorageKey)
    if (!token) {
      onLogout()
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await apiRequest<DocumentListItem[]>(path, { headers: authHeaders(token) })
      setDocuments(Array.isArray(result) ? result : [])
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        onLogout()
        return
      }
      setError('Documents could not be loaded. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDocuments()
  }, [])

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const params = new URLSearchParams()
    const values = Array.from(event.currentTarget.querySelectorAll('input'), (input) => input.value.trim())
    const filters = [['q', values[0]], ['case_id', values[1]], ['document_type', values[2]], ['department', values[3]], ['status', values[4]]]
    filters.forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    void loadDocuments(`/api/documents/search?${params.toString()}`)
  }

  function clearSearch() {
    setQ('')
    setCaseId('')
    setDocumentType('')
    setDepartment('')
    setStatus('')
    void loadDocuments()
  }

  useEffect(() => {
    const rows = Array.from(document.querySelectorAll<HTMLTableRowElement>('tbody tr'))
    const handlers = rows.map((row, index) => {
      const item = documents[index]
      if (!item) return null
      const openDetails = () => onNavigate(`/documents/${encodeURIComponent(item.id)}`)
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openDetails()
        }
      }
      row.classList.add('cursor-pointer', 'hover:bg-[#f1f7f2]')
      row.setAttribute('tabindex', '0')
      row.setAttribute('aria-label', `Open ${item.original_filename}`)
      row.addEventListener('click', openDetails)
      row.addEventListener('keydown', handleKeyDown)
      return { row, openDetails, handleKeyDown }
    })
    return () => handlers.forEach((handler) => {
      if (!handler) return
      handler.row.removeEventListener('click', handler.openDetails)
      handler.row.removeEventListener('keydown', handler.handleKeyDown)
    })
  }, [documents, onNavigate])

  function formatDate(value: string) {
    return new Date(value).toLocaleString()
  }

  return <main className="min-h-screen bg-[#f4f1ea] p-4 text-[#202b2a] sm:p-6"><div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1440px] overflow-hidden rounded-[2rem] border border-[#d9d5ca] bg-[#fbfaf6] shadow-[0_24px_80px_rgba(43,51,46,0.12)] sm:min-h-[calc(100vh-3rem)]"><aside className="hidden w-72 shrink-0 flex-col bg-[#1e5b57] p-6 text-[#f8f5ed] lg:flex"><Brand light /><nav className="mt-12 space-y-1" aria-label="Dashboard navigation">{navigationItems.map((item) => <button key={item.path} type="button" onClick={() => onNavigate(item.path)} className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm transition ${item.path === '/documents' ? 'bg-[#f8f5ed] font-semibold text-[#1e5b57]' : 'text-[#d2e1db] hover:bg-white/10 hover:text-white'}`}>{item.label}</button>)}</nav><div className="mt-auto rounded-2xl border border-white/15 bg-white/10 p-4"><p className="text-xs text-[#a8c3b9]">Current role</p><p className="mt-1 text-sm font-semibold text-white">{user.role}</p></div></aside><div className="flex min-w-0 flex-1 flex-col"><header className="flex items-center justify-between border-b border-[#e4e0d6] px-5 py-5 sm:px-8"><div className="lg:hidden"><Brand /></div><div className="hidden lg:block"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#bd6845]">Secure workspace</p><p className="mt-1 text-sm text-[#7a8179]">Documents</p></div><button onClick={onLogout} className="rounded-lg px-3 py-2 text-sm font-medium text-[#64706b] hover:bg-[#eef3ee] hover:text-[#1e5b57]">Sign out</button></header><section className="flex-1 px-5 py-8 sm:px-8 lg:px-12 lg:py-12"><div className="max-w-6xl"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#bd6845]">Document register</p><h1 className="text-4xl font-semibold tracking-[-0.04em] text-[#213331]">Documents</h1><p className="mt-3 text-base leading-7 text-[#64706b]">Manage and review stored case documents.</p><form onSubmit={handleSearch} className="mt-8 rounded-2xl border border-[#e0ddd4] bg-white/70 p-5"><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"><label className="block lg:col-span-3"><span className="mb-2 block text-sm font-medium text-[#34413e]">Search documents</span><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search filename, case ID, document type..." className="w-full rounded-xl border border-[#d8d5ca] bg-white px-4 py-3 text-sm text-[#213331] outline-none focus:border-[#1e5b57] focus:ring-4 focus:ring-[#1e5b57]/10" /></label><label className="block"><span className="mb-2 block text-sm font-medium text-[#34413e]">Case ID</span><input value={caseId} onChange={(event) => setCaseId(event.target.value)} className="w-full rounded-xl border border-[#d8d5ca] bg-white px-4 py-3 text-sm text-[#213331] outline-none focus:border-[#1e5b57] focus:ring-4 focus:ring-[#1e5b57]/10" /></label><label className="block"><span className="mb-2 block text-sm font-medium text-[#34413e]">Document type</span><input value={documentType} onChange={(event) => setDocumentType(event.target.value)} className="w-full rounded-xl border border-[#d8d5ca] bg-white px-4 py-3 text-sm text-[#213331] outline-none focus:border-[#1e5b57] focus:ring-4 focus:ring-[#1e5b57]/10" /></label><label className="block"><span className="mb-2 block text-sm font-medium text-[#34413e]">Department</span><input value={department} onChange={(event) => setDepartment(event.target.value)} className="w-full rounded-xl border border-[#d8d5ca] bg-white px-4 py-3 text-sm text-[#213331] outline-none focus:border-[#1e5b57] focus:ring-4 focus:ring-[#1e5b57]/10" /></label><label className="block"><span className="mb-2 block text-sm font-medium text-[#34413e]">Status</span><input value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded-xl border border-[#d8d5ca] bg-white px-4 py-3 text-sm text-[#213331] outline-none focus:border-[#1e5b57] focus:ring-4 focus:ring-[#1e5b57]/10" /></label></div><div className="mt-5 flex flex-wrap gap-3"><button type="submit" className="rounded-xl bg-[#1e5b57] px-5 py-3 text-sm font-semibold text-white hover:bg-[#174945] disabled:opacity-60" disabled={loading}>Search</button><button type="button" onClick={clearSearch} className="rounded-xl border border-[#cbd8cf] px-5 py-3 text-sm font-semibold text-[#1e5b57] hover:bg-[#eef3ee]" disabled={loading}>Clear</button></div></form>{loading ? <div className="mt-8 rounded-2xl border border-[#e0ddd4] bg-white/70 p-6 text-sm text-[#64706b]">Loading documents...</div> : error ? <div className="mt-8"><ErrorMessage message={error} /></div> : documents.length === 0 ? <div className="mt-8 rounded-2xl border border-[#e0ddd4] bg-white/70 p-6 text-sm text-[#64706b]">No documents found.</div> : <div className="mt-8 overflow-hidden rounded-2xl border border-[#e0ddd4] bg-white/80"><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="border-b border-[#e0ddd4] bg-[#f1f7f2] text-xs uppercase tracking-[0.12em] text-[#6e8177]"><tr><th className="px-5 py-4 font-semibold">Filename</th><th className="px-5 py-4 font-semibold">Document type</th><th className="px-5 py-4 font-semibold">Case ID</th><th className="px-5 py-4 font-semibold">Department</th><th className="px-5 py-4 font-semibold">Sensitivity</th><th className="px-5 py-4 font-semibold">Status</th><th className="px-5 py-4 font-semibold">Created</th></tr></thead><tbody className="divide-y divide-[#eeeae1]">{documents.map((item) => <tr key={item.id} className="text-[#34413e]"><td className="px-5 py-4 font-medium text-[#213331]">{item.original_filename}</td><td className="px-5 py-4">{item.document_type || 'Not specified'}</td><td className="px-5 py-4 font-mono text-xs">{item.case_id}</td><td className="px-5 py-4">{item.department || 'Not specified'}</td><td className="px-5 py-4">{item.sensitivity || 'Not specified'}</td><td className="px-5 py-4"><span className="rounded-full bg-[#e7f0e8] px-2.5 py-1 text-xs font-semibold text-[#1e5b57]">{item.status}</span></td><td className="px-5 py-4 whitespace-nowrap">{formatDate(item.created_at)}</td></tr>)}</tbody></table></div></div>}</div></section></div></div></main>
}

function DocumentDetailsView({ path, user, onNavigate, onLogout }: { path: string; user: AuthUser; onNavigate: (nextPath: string) => void; onLogout: () => void }) {
  const [document, setDocument] = useState<DocumentMetadata | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [verification, setVerification] = useState<BlockchainVerifyResponse | null>(null)
  const [verificationError, setVerificationError] = useState('')
  const [verificationLoading, setVerificationLoading] = useState(false)
  const [aiResult, setAiResult] = useState<AiClassificationResponse | null>(null)
  const [aiError, setAiError] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [duplicateResult, setDuplicateResult] = useState<DuplicateCheckResponse | null>(null)
  const [duplicateError, setDuplicateError] = useState('')
  const [duplicateLoading, setDuplicateLoading] = useState(false)
  const [versions, setVersions] = useState<DocumentVersionMetadata[]>([])
  const [versionsError, setVersionsError] = useState('')
  const [versionsLoading, setVersionsLoading] = useState(true)
  const [shares, setShares] = useState<ShareMetadata[]>([])
  const [shareError, setShareError] = useState('')
  const [sharesLoading, setSharesLoading] = useState(true)
  const [createShareLoading, setCreateShareLoading] = useState(false)
  const [accessShareLoading, setAccessShareLoading] = useState<string | null>(null)
  const [revokeShareLoading, setRevokeShareLoading] = useState<string | null>(null)
  const [shareAccess, setShareAccess] = useState<Record<string, ShareAccessResponse>>({})
  const [recipientUserId, setRecipientUserId] = useState('')
  const [sharePermission, setSharePermission] = useState<'VIEW' | 'DOWNLOAD'>('VIEW')
  const [sharePurpose, setSharePurpose] = useState('')
  const [shareExpiresAt, setShareExpiresAt] = useState(() => new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16))
  const [custodyEvents, setCustodyEvents] = useState<CustodyEventResponse[]>([])
  const [custodyError, setCustodyError] = useState('')
  const [custodyLoading, setCustodyLoading] = useState(true)
  const [requiredFieldResult, setRequiredFieldResult] = useState<RequiredFieldValidationResponse | null>(null)
  const [requiredFieldError, setRequiredFieldError] = useState('')
  const [requiredFieldLoading, setRequiredFieldLoading] = useState(false)
  const [metadataValidationResult, setMetadataValidationResult] = useState<MetadataValidationResult | null>(null)
  const [metadataValidationError, setMetadataValidationError] = useState('')
  const [metadataValidationLoading, setMetadataValidationLoading] = useState(false)
  let documentId = ''

  try {
    documentId = decodeURIComponent(path.slice('/documents/'.length)).trim()
  } catch {
    documentId = ''
  }

  useEffect(() => {
    async function loadDetails() {
      if (!documentId) {
        setError('A valid document ID is required.')
        setLoading(false)
        return
      }
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(documentId)) {
        setError('Document ID is not valid.')
        setLoading(false)
        return
      }
      const token = sessionStorage.getItem(tokenStorageKey)
      if (!token) {
        onLogout()
        return
      }
      try {
        const result = await apiRequest<DocumentMetadata>(`/api/documents/${encodeURIComponent(documentId)}`, { headers: authHeaders(token) })
        setDocument(result)
        try {
          const versionResult = await apiRequest<DocumentVersionMetadata[]>(`/api/documents/${encodeURIComponent(documentId)}/versions`, { headers: authHeaders(token) })
          setVersions(Array.isArray(versionResult) ? versionResult : [])
        } catch (requestError) {
          if (requestError instanceof ApiError && requestError.status === 401) {
            onLogout()
            return
          }
          if (requestError instanceof ApiError && requestError.status === 403) setVersionsError('You do not have permission to view document versions.')
          else if (requestError instanceof ApiError && requestError.status === 404) setVersionsError('Document versions were not found.')
          else setVersionsError('Document versions could not be loaded. Please try again.')
        } finally {
          setVersionsLoading(false)
        }
        try {
          const shareResult = await apiRequest<ShareMetadata[]>(`/api/documents/${encodeURIComponent(documentId)}/shares`, { headers: authHeaders(token) })
          setShares(Array.isArray(shareResult) ? shareResult : [])
        } catch (requestError) {
          if (requestError instanceof ApiError && requestError.status === 401) {
            onLogout()
            return
          }
          if (requestError instanceof ApiError && requestError.status === 403) setShareError('You do not have permission to view document shares.')
          else if (requestError instanceof ApiError && requestError.status === 404) setShareError('Document shares were not found.')
          else setShareError('Document shares could not be loaded. Please try again.')
        } finally {
          setSharesLoading(false)
        }
        try {
          const custodyResult = await apiRequest<CustodyEventResponse[]>(`/api/documents/${encodeURIComponent(documentId)}/custody`, { headers: authHeaders(token) })
          setCustodyEvents(Array.isArray(custodyResult) ? custodyResult : [])
        } catch (requestError) {
          if (requestError instanceof ApiError && requestError.status === 401) {
            onLogout()
            return
          }
          if (requestError instanceof ApiError && requestError.status === 403) setCustodyError('You do not have permission to view chain-of-custody events.')
          else if (requestError instanceof ApiError && requestError.status === 404) setCustodyError('Document not found.')
          else if (requestError instanceof ApiError && requestError.status === 422) setCustodyError('Document ID is not valid.')
          else setCustodyError('Chain-of-custody events could not be loaded. Please try again.')
        } finally {
          setCustodyLoading(false)
        }
      } catch (requestError) {
        if (requestError instanceof ApiError && requestError.status === 401) {
          onLogout()
          return
        }
        setError(requestError instanceof ApiError && requestError.status === 404 ? 'Document not found.' : 'Document details could not be loaded. Check the document ID and try again.')
        setVersionsLoading(false)
        setSharesLoading(false)
        setCustodyLoading(false)
      } finally {
        setLoading(false)
      }
    }

    void loadDetails()
  }, [])

  async function verifyIntegrity() {
    const token = sessionStorage.getItem(tokenStorageKey)
    if (!token) {
      onLogout()
      return
    }
    setVerificationLoading(true)
    setVerificationError('')
    try {
      const result = await apiRequest<BlockchainVerifyResponse>(`/api/documents/${encodeURIComponent(documentId)}/blockchain-verify`, { headers: authHeaders(token) })
      setVerification(result)
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        onLogout()
        return
      }
      if (requestError instanceof ApiError && requestError.status === 403) setVerificationError('You do not have permission to verify blockchain integrity.')
      else if (requestError instanceof ApiError && requestError.status === 404) setVerificationError('Document not found.')
      else if (requestError instanceof ApiError && requestError.status === 422) setVerificationError('Document ID is not valid.')
      else if (requestError instanceof ApiError && requestError.status === 502) setVerificationError('Blockchain verification service is currently unavailable.')
      else setVerificationError('Blockchain integrity verification could not be completed. Please try again.')
    } finally {
      setVerificationLoading(false)
    }
  }

  async function analyzeDocument() {
    const token = sessionStorage.getItem(tokenStorageKey)
    if (!token) {
      onLogout()
      return
    }
    setAiLoading(true)
    setAiError('')
    try {
      const result = await apiRequest<AiClassificationResponse>(`/api/ai/classify/${encodeURIComponent(documentId)}`, { method: 'POST', headers: authHeaders(token) })
      setAiResult(result)
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        onLogout()
        return
      }
      if (requestError instanceof ApiError && requestError.status === 403) setAiError('You do not have permission to analyze documents.')
      else if (requestError instanceof ApiError && requestError.status === 404) setAiError('Document not found.')
      else if (requestError instanceof ApiError && requestError.status === 422) setAiError('Document does not contain enough readable text for AI analysis.')
      else if (requestError instanceof ApiError && requestError.status === 503) setAiError('AI analysis is temporarily unavailable. Please try again.')
      else setAiError('AI analysis could not be completed. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }

  async function checkDuplicates() {
    if (!documentId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(documentId)) {
      setDuplicateError('Document ID is not valid.')
      return
    }
    const token = sessionStorage.getItem(tokenStorageKey)
    if (!token) {
      onLogout()
      return
    }
    setDuplicateLoading(true)
    setDuplicateError('')
    setDuplicateResult(null)
    try {
      const result = await apiRequest<DuplicateCheckResponse>(`/api/documents/${encodeURIComponent(documentId)}/duplicates`, { headers: authHeaders(token) })
      setDuplicateResult(result)
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        onLogout()
        return
      }
      if (requestError instanceof ApiError && requestError.status === 403) setDuplicateError('You do not have permission to check document duplicates.')
      else if (requestError instanceof ApiError && requestError.status === 404) setDuplicateError('Document not found.')
      else if (requestError instanceof ApiError && requestError.status === 422) setDuplicateError('Document ID is not valid.')
      else setDuplicateError('Duplicate detection could not be completed. Please try again.')
    } finally {
      setDuplicateLoading(false)
    }
  }

  async function validateRequiredFields() {
    const token = sessionStorage.getItem(tokenStorageKey)
    if (!token) {
      onLogout()
      return
    }
    setRequiredFieldLoading(true)
    setRequiredFieldError('')
    setRequiredFieldResult(null)
    try {
      const result = await apiRequest<RequiredFieldValidationResponse>(`/api/documents/${encodeURIComponent(documentId)}/validate-required-fields`, { method: 'POST', headers: authHeaders(token) })
      setRequiredFieldResult(result)
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        onLogout()
        return
      }
      if (requestError instanceof ApiError && requestError.status === 403) setRequiredFieldError('You do not have permission to validate required fields.')
      else if (requestError instanceof ApiError && requestError.status === 404) setRequiredFieldError('Document not found.')
      else if (requestError instanceof ApiError && requestError.status === 422) setRequiredFieldError('Classify this document before validating required fields.')
      else setRequiredFieldError('Required-field validation could not be completed. Please try again.')
    } finally {
      setRequiredFieldLoading(false)
    }
  }

  async function checkMetadataConsistency() {
    const token = sessionStorage.getItem(tokenStorageKey)
    if (!token) {
      onLogout()
      return
    }
    setMetadataValidationLoading(true)
    setMetadataValidationError('')
    setMetadataValidationResult(null)
    try {
      const result = await apiRequest<MetadataValidationResult>(`/api/documents/${encodeURIComponent(documentId)}/validate-consistency`, { method: 'POST', headers: authHeaders(token) })
      setMetadataValidationResult(result)
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        onLogout()
        return
      }
      if (requestError instanceof ApiError && requestError.status === 403) setMetadataValidationError('You do not have permission to check metadata consistency.')
      else if (requestError instanceof ApiError && requestError.status === 404) setMetadataValidationError('Document not found.')
      else if (requestError instanceof ApiError && requestError.status === 422) setMetadataValidationError('Classify this document before checking metadata consistency.')
      else setMetadataValidationError('Metadata consistency checking could not be completed. Please try again.')
    } finally {
      setMetadataValidationLoading(false)
    }
  }

  async function createShare() {
    const token = sessionStorage.getItem(tokenStorageKey)
    if (!token) {
      onLogout()
      return
    }
    setCreateShareLoading(true)
    setShareError('')
    try {
      const result = await apiRequest<ShareMetadata>(`/api/documents/${encodeURIComponent(documentId)}/shares`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_user_id: recipientUserId.trim(), permission: sharePermission, purpose: sharePurpose.trim(), expires_at: new Date(shareExpiresAt).toISOString() }),
      })
      setShares((current) => [...current, result])
      setRecipientUserId('')
      setSharePurpose('')
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        onLogout()
        return
      }
      if (requestError instanceof ApiError && requestError.status === 403) setShareError('You do not have permission to create shares.')
      else if (requestError instanceof ApiError && requestError.status === 404) setShareError('The document or recipient user was not found.')
      else if (requestError instanceof ApiError && requestError.status === 422) setShareError('Check the recipient ID, purpose, and future expiration time.')
      else setShareError('The secure share could not be created. Please try again.')
    } finally {
      setCreateShareLoading(false)
    }
  }

  async function accessShare(shareId: string) {
    const token = sessionStorage.getItem(tokenStorageKey)
    if (!token) {
      onLogout()
      return
    }
    setAccessShareLoading(shareId)
    setShareError('')
    try {
      const result = await apiRequest<ShareAccessResponse>(`/api/shares/${encodeURIComponent(shareId)}/access`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessing_user_id: user.user_id }),
      })
      setShareAccess((current) => ({ ...current, [shareId]: result }))
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        onLogout()
        return
      }
      if (requestError instanceof ApiError && requestError.status === 403) setShareError('This share cannot be accessed by the current user.')
      else if (requestError instanceof ApiError && requestError.status === 404) setShareError('Share not found.')
      else if (requestError instanceof ApiError && requestError.status === 410) setShareError('This share has expired and cannot be accessed.')
      else setShareError('Share access could not be completed. Please try again.')
    } finally {
      setAccessShareLoading(null)
    }
  }

  async function revokeShare(shareId: string) {
    const token = sessionStorage.getItem(tokenStorageKey)
    if (!token) {
      onLogout()
      return
    }
    setRevokeShareLoading(shareId)
    setShareError('')
    try {
      const result = await apiRequest<ShareMetadata>(`/api/shares/${encodeURIComponent(shareId)}/revoke`, { method: 'POST', headers: authHeaders(token) })
      setShares((current) => current.map((share) => share.share_id === shareId ? result : share))
      setShareAccess((current) => { const next = { ...current }; delete next[shareId]; return next })
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        onLogout()
        return
      }
      if (requestError instanceof ApiError && requestError.status === 403) setShareError('You do not have permission to revoke shares.')
      else if (requestError instanceof ApiError && requestError.status === 404) setShareError('Share not found.')
      else setShareError('The share could not be revoked. Please try again.')
    } finally {
      setRevokeShareLoading(null)
    }
  }

  function displayAiValue(value: unknown) {
    if (value === null || value === undefined || value === '') return 'Not found'
    if (Array.isArray(value)) return value.length ? value.join(', ') : 'None'
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  const verificationStatus = verification?.integrity_status.toUpperCase()
  const verificationMessage = verificationStatus === 'VERIFIED'
    ? 'The current document SHA-256 matches the anchored blockchain proof.'
    : verificationStatus === 'MISMATCH'
      ? 'Integrity mismatch detected. The current document hash differs from the anchored blockchain proof. Human investigation is required.'
      : verificationStatus === 'NOT_ANCHORED'
        ? 'No blockchain proof is available for this document.'
        : verificationStatus
          ? `Verification returned status: ${verificationStatus}.`
          : ''
  const duplicateStatus = duplicateResult ? (duplicateResult.duplicate_count > 0 ? 'DUPLICATE' : 'UNIQUE') : ''
  const fields: Array<[string, ReactNode]> = document ? [
    ['ID', document.id],
    ['Case ID', document.case_id],
    ['Original filename', document.original_filename],
    ['Document type', document.document_type || 'Not specified'],
    ['Department', document.department || 'Not specified'],
    ['Sensitivity', document.sensitivity || 'Not specified'],
    ['MIME type', document.mime_type || 'Not specified'],
    ['File size', document.file_size === null ? 'Not specified' : `${document.file_size.toLocaleString()} bytes`],
    ['SHA-256 hash', document.sha256_hash || 'Not specified'],
    ['Status', document.status],
    ['Uploaded by', document.uploaded_by],
    ['Created at', new Date(document.created_at).toLocaleString()],
    ['Updated at', new Date(document.updated_at).toLocaleString()],
    ['Blockchain Integrity', <span key="blockchain-integrity" className="block space-y-3"><span className="block text-xs leading-5 text-[#64706b]">Blockchain verification confirms whether the document hash matches the hash previously anchored on the configured blockchain network. It does not by itself establish authenticity, authorship, legal validity, or admissibility.</span><button type="button" onClick={verifyIntegrity} disabled={verificationLoading} className="rounded-lg bg-[#1e5b57] px-3 py-2 text-xs font-semibold text-white hover:bg-[#174945] disabled:cursor-not-allowed disabled:opacity-60">{verificationLoading ? 'Verifying blockchain integrity...' : 'Verify Blockchain Integrity'}</button>{verificationError && <span role="alert" className="block text-xs font-medium text-[#a04e36]">{verificationError}</span>}{verification && <span className={`block rounded-lg border px-3 py-2 text-xs leading-5 ${verificationStatus === 'VERIFIED' ? 'border-[#b9d8c0] bg-[#e7f0e8] text-[#1e5b57]' : verificationStatus === 'MISMATCH' ? 'border-[#e7c9bc] bg-[#fff5f0] text-[#a04e36]' : 'border-[#d8d5ca] bg-white text-[#64706b]'}`}><span className="block font-semibold">{verificationStatus}</span><span className="mt-1 block">{verificationMessage}</span><span className="mt-2 block break-all">Current SHA-256: {verification.current_sha256}</span>{verification.blockchain_proof && <span className="block break-all">Blockchain proof: {verification.blockchain_proof}</span>}{verification.network && <span className="block">Network: {verification.network}</span>}{verification.transaction_hash && <span className="block break-all">Transaction hash: {verification.transaction_hash}</span>}{verification.version_id && <span className="block break-all">Version ID: {verification.version_id}</span>}{verification.recorded_at && <span className="block">Recorded at: {new Date(verification.recorded_at).toLocaleString()}</span>}</span>}</span>],
    ['Duplicate detection', <span key="duplicate-detection" className="block space-y-3">
      <button type="button" onClick={checkDuplicates} disabled={duplicateLoading} className="rounded-lg bg-[#1e5b57] px-3 py-2 text-xs font-semibold text-white hover:bg-[#174945] disabled:cursor-not-allowed disabled:opacity-60">
        {duplicateLoading ? 'Checking duplicates...' : 'Check Duplicates'}
      </button>
      {duplicateError && <span role="alert" className="block rounded-lg border border-[#e7c9bc] bg-[#fff5f0] px-3 py-2 text-xs font-medium leading-5 text-[#a04e36]">{duplicateError}</span>}
      {duplicateResult && <span className={`block rounded-lg border px-3 py-3 text-xs leading-5 ${duplicateStatus === 'DUPLICATE' ? 'border-[#e7c9bc] bg-[#fff5f0] text-[#7c3f2d]' : 'border-[#b9d8c0] bg-[#e7f0e8] text-[#1e5b57]'}`}>
        <span className="block font-semibold">{duplicateStatus}</span>
        <span className="block">Detection method: {duplicateResult.detection_method || 'SHA-256 exact match'}</span>
        <span className="block">Duplicate count: {duplicateResult.duplicate_count}</span>
        {duplicateResult.warnings && duplicateResult.warnings.length > 0 && <span className="mt-2 block"><span className="block font-semibold">Warnings</span><span className="block pl-4">{duplicateResult.warnings.map((warning) => <span key={warning} className="block">{warning}</span>)}</span></span>}
        {duplicateResult.duplicates.length > 0 && <span className="mt-3 block space-y-3"><span className="block font-semibold">Matching documents</span>{duplicateResult.duplicates.map((match) => <span key={match.document_id} className="block rounded-lg border border-current/20 bg-white/60 p-3"><span className="block"><span className="font-semibold">Document ID:</span> <span className="break-all">{match.document_id}</span></span><span className="block"><span className="font-semibold">Original filename:</span> {match.original_filename}</span><span className="block"><span className="font-semibold">Uploaded:</span> {new Date(match.created_at).toLocaleString()}</span><span className="block"><span className="font-semibold">Status:</span> {match.status || 'Not provided by API'}</span></span>)}</span>}
      </span>}
    </span>],
    ['Required-field validation', <span key="required-field-validation" className="block space-y-3"><button type="button" onClick={validateRequiredFields} disabled={requiredFieldLoading} className="rounded-lg bg-[#1e5b57] px-3 py-2 text-xs font-semibold text-white hover:bg-[#174945] disabled:cursor-not-allowed disabled:opacity-60">{requiredFieldLoading ? 'Validating...' : 'Validate Required Fields'}</button>{requiredFieldError && <span role="alert" className="block rounded-lg border border-[#e7c9bc] bg-[#fff5f0] px-3 py-2 text-xs font-medium leading-5 text-[#a04e36]">{requiredFieldError}</span>}{requiredFieldResult && <span className={`block rounded-lg border px-3 py-3 text-xs leading-5 ${requiredFieldResult.validation_status === 'COMPLETE' ? 'border-[#b9d8c0] bg-[#e7f0e8] text-[#1e5b57]' : requiredFieldResult.validation_status === 'INCOMPLETE' ? 'border-[#e7c9bc] bg-[#fff5f0] text-[#7c3f2d]' : 'border-[#d8d5ca] bg-white text-[#64706b]'}`}><span className="block font-semibold">{requiredFieldResult.validation_status === 'COMPLETE' ? 'Validation passed' : requiredFieldResult.validation_status === 'INCOMPLETE' ? 'Required fields are missing' : requiredFieldResult.validation_status === 'NOT_APPLICABLE' ? 'Required-field validation does not apply to this document.' : requiredFieldResult.validation_status}</span><span className="block">Document type: {requiredFieldResult.document_type || 'Not found'}</span><span className="block">Validation status: {requiredFieldResult.validation_status || 'Not found'}</span><span className="mt-2 block">Required fields: {requiredFieldResult.required_fields.length ? requiredFieldResult.required_fields.join(', ') : 'None'}</span><span className="block">Present fields: {requiredFieldResult.present_fields.length ? requiredFieldResult.present_fields.join(', ') : 'None'}</span><span className="block">Missing fields: {requiredFieldResult.missing_fields.length ? requiredFieldResult.missing_fields.join(', ') : 'None'}</span>{requiredFieldResult.warnings.length > 0 && <span className="mt-2 block"><span className="block font-semibold">Warnings</span><span className="block">{requiredFieldResult.warnings.join(' ')}</span></span>}</span>}</span>],
    ['Metadata consistency', <span key="metadata-consistency" className="block space-y-3"><button type="button" onClick={checkMetadataConsistency} disabled={metadataValidationLoading} className="rounded-lg bg-[#1e5b57] px-3 py-2 text-xs font-semibold text-white hover:bg-[#174945] disabled:cursor-not-allowed disabled:opacity-60">{metadataValidationLoading ? 'Checking consistency...' : 'Check Metadata Consistency'}</button>{metadataValidationError && <span role="alert" className="block rounded-lg border border-[#e7c9bc] bg-[#fff5f0] px-3 py-2 text-xs font-medium leading-5 text-[#a04e36]">{metadataValidationError}</span>}{metadataValidationResult && <span className={`block rounded-lg border px-3 py-3 text-xs leading-5 ${metadataValidationResult.overall_status === 'CONSISTENT' ? 'border-[#b9d8c0] bg-[#e7f0e8] text-[#1e5b57]' : metadataValidationResult.overall_status === 'INCONSISTENT' ? 'border-[#e7c9bc] bg-[#fff5f0] text-[#7c3f2d]' : 'border-[#d8d5ca] bg-white text-[#64706b]'}`}><span className="block font-semibold">{metadataValidationResult.overall_status === 'CONSISTENT' ? 'Metadata values match' : metadataValidationResult.overall_status === 'INCONSISTENT' ? 'Possible metadata mismatch. Human review is recommended.' : 'No comparable metadata field was available.'}</span><span className="block">Overall status: {metadataValidationResult.overall_status}</span>{metadataValidationResult.checks.length > 0 ? <span className="mt-2 block space-y-2">{metadataValidationResult.checks.map((check) => <span key={check.field} className="block rounded-lg border border-current/20 bg-white/60 p-2"><span className="block font-semibold">Field: {check.field}</span><span className="block">Status: {check.status === 'MATCH' ? 'MATCH - values match.' : check.status === 'MISMATCH' ? 'MISMATCH - possible metadata inconsistency.' : 'NOT_AVAILABLE - comparison could not be performed because a value was unavailable.'}</span><span className="block">Metadata value: {check.metadata_value || 'Not available'}</span><span className="block">AI value: {Array.isArray(check.ai_value) ? (check.ai_value.length ? check.ai_value.join(', ') : 'Not available') : check.ai_value || 'Not available'}</span></span>)}</span> : <span className="mt-2 block">Checks: None</span>}{metadataValidationResult.warnings.length > 0 ? <span className="mt-2 block"><span className="block font-semibold">Warnings</span><span className="block">{metadataValidationResult.warnings.join(' ')}</span></span> : <span className="mt-2 block">Warnings: None</span>}</span>}</span>],
    ['Document Versions', <span key="document-versions" className="block space-y-3">
      <span className="block text-xs text-[#64706b]">Older versions are preserved in this read-only history.</span>
      {versionsLoading && <span className="block text-sm text-[#64706b]">Loading versions...</span>}
      {!versionsLoading && versionsError && <span role="alert" className="block rounded-lg border border-[#e7c9bc] bg-[#fff5f0] px-3 py-2 text-xs font-medium leading-5 text-[#a04e36]">{versionsError}</span>}
      {!versionsLoading && !versionsError && versions.length === 0 && <span className="block rounded-lg border border-[#e0ddd4] bg-white/70 px-3 py-2 text-sm text-[#64706b]">No versions available.</span>}
      {!versionsLoading && !versionsError && versions.length > 0 && <span className="block space-y-3">{versions.map((version) => <span key={version.id} className="block rounded-lg border border-[#d8d5ca] bg-white/70 p-3 text-xs leading-5"><span className="block font-semibold text-[#213331]">Version {version.version_number}{version.is_latest && <span className="ml-2 inline-block rounded-full bg-[#e7f0e8] px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-[#1e5b57]">Latest version</span>}</span><span className="block">SHA-256: {version.sha256_hash || 'Not available'}</span><span className="block">File size: {version.file_size === null ? 'Not specified' : `${version.file_size.toLocaleString()} bytes`}</span><span className="block">Uploaded: {new Date(version.created_at).toLocaleString()}</span><span className="block">Status: {version.status}</span>{version.mime_type && <span className="block">MIME type: {version.mime_type}</span>}{version.change_reason && <span className="block">Change reason: {version.change_reason}</span>}</span>)}</span>}
    </span>],
    ['Secure Sharing', <span key="secure-sharing" className="block space-y-3">
      <span className="block text-xs text-[#64706b]">Create and manage authenticated shares for this document.</span>
      <span className="block space-y-2 rounded-lg border border-[#d8d5ca] bg-white/70 p-3">
        <span className="block text-xs font-semibold text-[#213331]">Create Secure Share</span>
        <input aria-label="Recipient user ID" value={recipientUserId} onChange={(event) => setRecipientUserId(event.target.value)} placeholder="Recipient user ID" className="block w-full rounded-lg border border-[#d8d5ca] bg-white px-3 py-2 text-xs text-[#213331]" />
        <select aria-label="Share permission" value={sharePermission} onChange={(event) => setSharePermission(event.target.value as 'VIEW' | 'DOWNLOAD')} className="block w-full rounded-lg border border-[#d8d5ca] bg-white px-3 py-2 text-xs text-[#213331]"><option value="VIEW">VIEW</option><option value="DOWNLOAD">DOWNLOAD</option></select>
        <input aria-label="Share purpose" value={sharePurpose} onChange={(event) => setSharePurpose(event.target.value)} placeholder="Purpose" maxLength={500} className="block w-full rounded-lg border border-[#d8d5ca] bg-white px-3 py-2 text-xs text-[#213331]" />
        <input aria-label="Share expiration" type="datetime-local" value={shareExpiresAt} onChange={(event) => setShareExpiresAt(event.target.value)} className="block w-full rounded-lg border border-[#d8d5ca] bg-white px-3 py-2 text-xs text-[#213331]" />
        <button type="button" onClick={createShare} disabled={createShareLoading} className="rounded-lg bg-[#1e5b57] px-3 py-2 text-xs font-semibold text-white hover:bg-[#174945] disabled:cursor-not-allowed disabled:opacity-60">{createShareLoading ? 'Creating share...' : 'Create Secure Share'}</button>
      </span>
      {sharesLoading && <span className="block text-sm text-[#64706b]">Loading share details...</span>}
      {!sharesLoading && shares.length === 0 && <span className="block text-sm text-[#64706b]">No secure shares created.</span>}
      {!sharesLoading && shares.length > 0 && <span className="block space-y-2">{shares.map((share) => <span key={share.share_id} className="block rounded-lg border border-[#d8d5ca] bg-white/70 p-3 text-xs leading-5"><span className="block break-all font-semibold text-[#213331]">Share ID: {share.share_id}</span><span className="block">Permission: {share.permission}</span><span className="block">Purpose: {share.purpose}</span><span className="block">Status: {share.status}</span><span className="block">Expires: {new Date(share.expires_at).toLocaleString()}</span><span className="block">Download: {share.permission === 'DOWNLOAD' && share.status === 'ACTIVE' ? 'Allowed when active' : 'Not allowed'}</span><span className="mt-2 block space-x-2">{share.status === 'ACTIVE' && <><button type="button" onClick={() => accessShare(share.share_id)} disabled={accessShareLoading === share.share_id || revokeShareLoading === share.share_id} className="rounded-lg bg-[#e7f0e8] px-3 py-2 text-xs font-semibold text-[#1e5b57] disabled:cursor-not-allowed disabled:opacity-60">{accessShareLoading === share.share_id ? 'Accessing...' : 'Test Access'}</button><button type="button" onClick={() => revokeShare(share.share_id)} disabled={revokeShareLoading === share.share_id || accessShareLoading === share.share_id} className="rounded-lg bg-[#fff5f0] px-3 py-2 text-xs font-semibold text-[#a04e36] disabled:cursor-not-allowed disabled:opacity-60">{revokeShareLoading === share.share_id ? 'Revoking...' : 'Revoke Share'}</button></>}{shareAccess[share.share_id] && <span className="mt-2 block rounded-lg border border-[#b9d8c0] bg-[#e7f0e8] px-3 py-2 text-[#1e5b57]">Access active. Download: {shareAccess[share.share_id].can_download ? 'Allowed' : 'Not allowed for VIEW shares.'}</span>}</span></span>)}</span>}
      {shareError && <span role="alert" className="block rounded-lg border border-[#e7c9bc] bg-[#fff5f0] px-3 py-2 text-xs font-medium leading-5 text-[#a04e36]">{shareError}</span>}
    </span>],
    ['Chain of Custody', <span key="chain-of-custody" className="block space-y-3">
      <span className="block text-xs leading-5 text-[#64706b]">Chain of custody records application-level document transfer events. It does not by itself establish physical possession or legal admissibility.</span>
      {custodyLoading && <span className="block text-sm text-[#64706b]">Loading chain of custody...</span>}
      {!custodyLoading && custodyError && <span role="alert" className="block rounded-lg border border-[#e7c9bc] bg-[#fff5f0] px-3 py-2 text-xs font-medium leading-5 text-[#a04e36]">{custodyError}</span>}
      {!custodyLoading && !custodyError && custodyEvents.length === 0 && <span className="block rounded-lg border border-[#e0ddd4] bg-white/70 px-3 py-2 text-sm text-[#64706b]">No chain-of-custody events recorded.</span>}
      {!custodyLoading && !custodyError && custodyEvents.length > 0 && <span className="block space-y-3">{custodyEvents.map((event, index) => <span key={event.event_id} className="block rounded-lg border border-[#d8d5ca] bg-white/70 p-3 text-xs leading-5"><span className="block font-semibold text-[#213331]">{index + 1}. {event.event}</span><span className="block">Status: {event.status}</span>{event.from_user_id && <span className="block break-all">From: {event.from_user_id}</span>}{event.to_user_id && <span className="block break-all">To: {event.to_user_id}</span>}{event.reason && <span className="block">Reason: {event.reason}</span>}{event.notes && <span className="block">Notes: {event.notes}</span>}<span className="block">Time: {new Date(event.timestamp).toLocaleString()}</span>{event.version_id && <span className="block break-all">Version ID: {event.version_id}</span>}</span>)}</span>}
    </span>],
  ] : []

  return <main className="min-h-screen bg-[#f4f1ea] p-4 text-[#202b2a] sm:p-6"><div className="mx-auto min-h-[calc(100vh-2rem)] max-w-[1100px] overflow-hidden rounded-[2rem] border border-[#d9d5ca] bg-[#fbfaf6] shadow-[0_24px_80px_rgba(43,51,46,0.12)] sm:min-h-[calc(100vh-3rem)]"><header className="flex items-center justify-between border-b border-[#e4e0d6] px-5 py-5 sm:px-8"><div><Brand /><p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#bd6845]">Secure workspace</p></div><button onClick={onLogout} className="rounded-lg px-3 py-2 text-sm font-medium text-[#64706b] hover:bg-[#eef3ee] hover:text-[#1e5b57]">Sign out</button></header><section className="px-5 py-8 sm:px-8 lg:px-12 lg:py-12"><button type="button" onClick={() => onNavigate('/documents')} className="text-sm font-semibold text-[#1e5b57] hover:text-[#174945]">Back to Documents</button><p className="mt-8 mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#bd6845]">Document metadata</p><h1 className="text-4xl font-semibold tracking-[-0.04em] text-[#213331]">Document details</h1>{loading ? <div className="mt-8 rounded-2xl border border-[#e0ddd4] bg-white/70 p-6 text-sm text-[#64706b]">Loading document details...</div> : error ? <div className="mt-8"><ErrorMessage message={error} /></div> : <><section className="mt-8 rounded-2xl border border-[#dce4dd] bg-[#f1f7f2] p-5"><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{fields.map(([label, value]) => <div key={label}><p className="text-xs text-[#7a8179]">{label}</p><p className="mt-1 break-words text-sm font-medium text-[#213331]">{value}</p></div>)}</div></section><section className="mt-6 rounded-2xl border border-[#d8d5ca] bg-white/70 p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#bd6845]">AI Analysis</p><p className="mt-2 text-sm leading-6 text-[#64706b]">AI-assisted document classification and information extraction. This result does not determine authenticity, legal validity, or admissibility.</p><button type="button" onClick={analyzeDocument} disabled={aiLoading} className="mt-4 rounded-xl bg-[#1e5b57] px-5 py-3 text-sm font-semibold text-white hover:bg-[#174945] disabled:cursor-not-allowed disabled:opacity-60">{aiLoading ? 'Analyzing document...' : 'AI Analyze Document'}</button>{aiError && <div className="mt-4"><ErrorMessage message={aiError} /></div>}{aiResult && <div className="mt-6 space-y-5 rounded-xl border border-[#dce4dd] bg-[#f1f7f2] p-5"><div><p className="text-xs text-[#7a8179]">Document Type</p><p className="mt-1 text-sm font-semibold text-[#213331]">{displayAiValue(aiResult.document_type)}</p></div><div><p className="text-xs text-[#7a8179]">Confidence</p><p className="mt-1 text-sm font-semibold text-[#213331]">{displayAiValue(aiResult.confidence)}</p></div><div><p className="text-xs text-[#7a8179]">Extracted Fields</p><div className="mt-2 grid gap-3 sm:grid-cols-2">{Object.entries(aiResult.fields).map(([key, value]) => <div key={key}><p className="text-xs text-[#7a8179]">{key}</p><p className="mt-1 break-words text-sm text-[#213331]">{displayAiValue(value)}</p></div>)}</div></div><div><p className="text-xs text-[#7a8179]">Missing Fields</p><p className="mt-1 text-sm text-[#213331]">{displayAiValue(aiResult.missing_fields)}</p></div><div><p className="text-xs text-[#7a8179]">Warnings</p>{aiResult.warnings.length ? <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-[#a04e36]">{aiResult.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul> : <p className="mt-1 text-sm text-[#213331]">None</p>}</div></div>}</section></>}</section></div></main>
}

function Field({ label, type, value, onChange, autoComplete, placeholder }: { label: string; type: string; value: string; onChange: (value: string) => void; autoComplete: string; placeholder: string }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium text-[#34413e]">{label}</span><input required type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} placeholder={placeholder} className="w-full rounded-xl border border-[#d8d5ca] bg-white px-4 py-3 text-sm text-[#213331] outline-none transition placeholder:text-[#a0a49e] focus:border-[#1e5b57] focus:ring-4 focus:ring-[#1e5b57]/10" /></label>
}

function ErrorMessage({ message }: { message: string }) {
  return <p role="alert" className="rounded-xl border border-[#e7c9bc] bg-[#fff5f0] px-4 py-3 text-sm text-[#a04e36]">{message}</p>
}

function getOtpError(message: string) {
  if (message === 'OTP expired.') return 'This code has expired. Start again to request a new code.'
  if (message === 'OTP already used.') return 'This code has already been used. Start again to request a new code.'
  return 'That verification code was not accepted. Check it and try again.'
}

export default App
