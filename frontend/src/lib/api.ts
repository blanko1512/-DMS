const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL

export const apiBaseUrl = configuredApiBaseUrl || 'http://127.0.0.1:8000'

export type AuthUser = {
  user_id: string
  username: string
  role: string
  is_active: boolean
}

export type LoginChallenge = {
  status: 'OTP_REQUIRED'
  challenge_id: string
  message: string
}

export type TokenResponse = {
  access_token: string
  token_type: string
  expires_in: number
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const requestUrl = import.meta.env.DEV ? path : `${apiBaseUrl}${path}`
  const response = await fetch(requestUrl, options)
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const payload = (await response.json()) as { detail?: string }
      if (payload.detail) message = payload.detail
    } catch {
      // Keep the status-based message when the server returns no JSON body.
    }
    throw new ApiError(message, response.status)
  }
  return response.json() as Promise<T>
}

export function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` }
}

export type DocumentMetadata = {
  id: string
  case_id: string
  original_filename: string
  storage_provider: string
  description: string | null
  document_type: string | null
  department: string | null
  sensitivity: string | null
  mime_type: string | null
  file_size: number | null
  sha256_hash: string | null
  status: string
  uploaded_by: string
  created_at: string
  updated_at: string
}

export type DocumentListItem = Pick<
  DocumentMetadata,
  | 'id'
  | 'case_id'
  | 'original_filename'
  | 'document_type'
  | 'department'
  | 'sensitivity'
  | 'mime_type'
  | 'file_size'
  | 'status'
  | 'created_at'
>

export type DuplicateDocument = {
  document_id: string
  original_filename: string
  case_id: string
  document_type: string | null
  created_at: string
  sha256_hash: string
  status?: string
}

export type DuplicateCheckResponse = {
  document_id: string
  sha256_hash: string | null
  duplicate_count: number
  duplicates: DuplicateDocument[]
  warnings?: string[]
  detection_method?: string
}

export type DocumentVersionMetadata = {
  id: string
  document_id: string
  version_number: number
  original_filename: string
  sha256_hash: string | null
  file_size: number | null
  mime_type: string | null
  uploaded_by: string
  change_reason: string | null
  status: string
  created_at: string
  is_latest: boolean
}

export type ShareMetadata = {
  share_id: string
  document_id: string
  sender_user_id: string
  recipient_user_id: string
  permission: 'VIEW' | 'DOWNLOAD'
  purpose: string
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED'
  created_at: string
  expires_at: string
  revoked_at: string | null
}

export type ShareAccessResponse = {
  share_id: string
  document_id: string
  permission: 'VIEW' | 'DOWNLOAD'
  status: 'ACTIVE'
  can_download: boolean
  access_url: string | null
  expires_at: string
}

export type CustodyEventResponse = {
  event_id: string
  transfer_id: string
  document_id: string
  from_user_id: string | null
  to_user_id: string | null
  event: string
  status: 'PENDING' | 'RECEIVED'
  timestamp: string
  reason: string | null
  notes: string | null
  version_id: string | null
}

export type BlockchainVerifyResponse = {
  document_id: string
  version_id: string | null
  integrity_status: string
  current_sha256: string
  blockchain_proof: string | null
  transaction_hash: string | null
  network: string | null
  recorded_at?: string | null
}

export type BackupResponse = {
  status: string
  backup_filename: string
  backup_path: string
  database_backup: boolean
  documents_backed_up: number
  versions_backed_up: number
  integrity_verified: boolean
  created_at: string
}

export type BackupRestoreVerificationResponse = {
  status: string
  backup_valid: boolean
  database_restored: boolean
  database_name: string | null
  documents_extracted: number
  versions_verified: number
  integrity_verified: boolean
  database_counts_match: boolean
  database_counts: Record<string, number | null>
  cloudinary_modified: boolean
  error: string | null
}

export type AiClassificationResponse = {
  document_type: string
  confidence: number
  fields: Record<string, unknown>
  missing_fields: string[]
  warnings: string[]
}

export type RequiredFieldValidationResponse = {
  document_type: string
  validation_status: string
  required_fields: string[]
  present_fields: string[]
  missing_fields: string[]
  warnings: string[]
}

export type MetadataCheck = {
  field: string
  metadata_value: string | null
  ai_value: string | string[] | null
  status: 'MATCH' | 'MISMATCH' | 'NOT_AVAILABLE'
}

export type MetadataValidationResult = {
  document_id: string
  overall_status: 'CONSISTENT' | 'INCONSISTENT' | 'NOT_APPLICABLE'
  checks: MetadataCheck[]
  warnings: string[]
}

export type AuditLogEntry = {
  id: string
  user_id: string | null
  action: string
  resource_type: string | null
  resource_id: string | null
  result: string | null
  timestamp: string
  details: string | null
}