import { useEffect, useState } from 'react';
import { ActivityItemData, DocumentItemData } from '@/components/dms';
import { INITIAL_DOCUMENTS, DmsDocument, AuditLogRecord, INITIAL_AUDIT_LOGS } from '@/constants/mockData';
import { DmsApi } from './api';

export interface NewDocumentPayload {
  case_id: string;
  original_filename: string;
  document_type: string;
  department: string;
  sensitivity: 'INTERNAL' | 'RESTRICTED' | 'HIGH' | 'TOP_SECRET';
  mime_type?: string;
  file_size?: number;
  sha256_hash: string;
  description?: string;
  uploader?: string;
  uploader_role?: string;
}

// In-memory persistent state for the prototype session
let documentsState: DmsDocument[] = [...INITIAL_DOCUMENTS];
let auditLogsState: AuditLogRecord[] = [...INITIAL_AUDIT_LOGS];
let listeners: Array<() => void> = [];

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.warn('Listener error', e);
    }
  });
}

export const DocumentStore = {
  getDocuments(): DmsDocument[] {
    return [...documentsState];
  },

  getDocumentById(id: string): DmsDocument | undefined {
    return documentsState.find((d) => d.id === id);
  },

  addDocument(payload: NewDocumentPayload): DmsDocument {
    const docId = `doc-${Date.now().toString().slice(-4)}`;
    const randomBlock = 4921900 + Math.floor(Math.random() * 100);
    const randomTx = `0x${Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}`;

    const newDoc: DmsDocument = {
      id: docId,
      case_id: payload.case_id,
      original_filename: payload.original_filename,
      document_type: payload.document_type || 'General Document',
      department: payload.department || 'Investigation Bureau',
      sensitivity: payload.sensitivity || 'HIGH',
      mime_type: payload.mime_type || 'application/pdf',
      file_size: payload.file_size || 1540000,
      sha256_hash: payload.sha256_hash,
      status: 'VERIFIED',
      created_at: new Date().toISOString(),
      uploader: payload.uploader || 'Det. Vance',
      uploader_role: payload.uploader_role || 'Senior Investigator',
      version: 'v1.0',
      blockchain_tx: randomTx,
      block_number: randomBlock,
      summary: payload.description || 'Verified and cryptographically anchored in local evidence ledger.',
    };

    // Prepend to top of list so it shows immediately on Dashboard & Documents
    documentsState = [newDoc, ...documentsState];

    // Add Audit Log
    const newAudit: AuditLogRecord = {
      id: `audit-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      actor: `${newDoc.uploader} (BADGE #8421)`,
      actor_role: 'INVESTIGATOR',
      action: 'DOCUMENT_INGESTED',
      action_category: 'UPLOAD',
      reference: `${newDoc.case_id} / ${newDoc.id}`,
      ip_address: '10.245.18.42',
      status: 'SUCCESS',
      details: `Ingested ${newDoc.original_filename}. SHA-256: ${newDoc.sha256_hash.slice(0, 16)}... anchored to EVM Block #${newDoc.block_number}`,
    };
    auditLogsState = [newAudit, ...auditLogsState];

    notifyListeners();
    return newDoc;
  },

  updateDocument(id: string, updates: Partial<DmsDocument>): DmsDocument | null {
    const idx = documentsState.findIndex((d) => d.id === id);
    if (idx === -1) return null;

    documentsState[idx] = {
      ...documentsState[idx],
      ...updates,
    };
    documentsState = [...documentsState];
    notifyListeners();
    return documentsState[idx];
  },

  deleteDocument(id: string): boolean {
    const prevLen = documentsState.length;
    documentsState = documentsState.filter((d) => d.id !== id);
    if (documentsState.length !== prevLen) {
      notifyListeners();
      return true;
    }
    return false;
  },

  getAuditLogs(): AuditLogRecord[] {
    return [...auditLogsState];
  },

  getRecentActivities(): ActivityItemData[] {
    const activities: ActivityItemData[] = [];
    const topDocs = documentsState.slice(0, 3);

    topDocs.forEach((doc, idx) => {
      activities.push({
        id: `act-doc-${doc.id}`,
        type: 'UPLOAD',
        title: `Ingested: ${doc.original_filename}`,
        description: `Case #${doc.case_id} • SHA-256: ${doc.sha256_hash.slice(0, 12)}...`,
        fromUser: doc.uploader,
        timestamp: 'Just now',
        isLast: idx === topDocs.length - 1,
      });
    });

    activities.push({
      id: 'act-bc-anchor',
      type: 'BLOCKCHAIN',
      title: 'Smart Contract Proof Registered',
      description: 'SHA-256 hash anchored to Ethereum EVM block #4,921,842.',
      timestamp: '35 mins ago',
      isLast: false,
    });

    activities.push({
      id: 'act-custody',
      type: 'TRANSFER',
      title: 'Custody Handover Completed',
      description: 'Case folder #CASE-2026-089 physically transferred & accepted.',
      fromUser: 'Det. Vance',
      toUser: 'Lead Prosecutor',
      timestamp: '1 hour ago',
      isLast: true,
    });

    return activities;
  },

  subscribe(listener: () => void): () => void {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },

  /**
   * Sync with live FastAPI backend if available
   */
  async syncWithBackend(): Promise<boolean> {
    try {
      const res = await DmsApi.listDocuments(50, 0);
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        // Merge backend documents
        const backendDocs: DmsDocument[] = res.data.map((item: any) => ({
          id: item.id,
          case_id: item.case_id || 'CASE-LIVE',
          original_filename: item.original_filename || 'document.pdf',
          document_type: item.document_type || 'Standard',
          department: item.department || 'Investigation',
          sensitivity: item.sensitivity || 'HIGH',
          mime_type: item.mime_type || 'application/pdf',
          file_size: item.file_size || 1024 * 1024,
          sha256_hash: item.sha256_hash || 'hash',
          status: item.status || 'VERIFIED',
          created_at: item.created_at || new Date().toISOString(),
          uploader: item.uploader_name || 'Officer',
          uploader_role: item.uploader_role || 'Investigator',
          version: 'v1.0',
        }));

        // Avoid duplicates
        const existingIds = new Set(documentsState.map((d) => d.id));
        const newOnes = backendDocs.filter((d) => !existingIds.has(d.id));
        if (newOnes.length > 0) {
          documentsState = [...newOnes, ...documentsState];
          notifyListeners();
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
};

/**
 * React Hook for real-time document updates across all screens
 */
export function useDocuments() {
  const [docs, setDocs] = useState<DmsDocument[]>(() => DocumentStore.getDocuments());

  useEffect(() => {
    const unsubscribe = DocumentStore.subscribe(() => {
      setDocs(DocumentStore.getDocuments());
    });
    return unsubscribe;
  }, []);

  return docs;
}

/**
 * Convert DmsDocument into DocumentItemData format for cards
 */
export function toDocumentItem(doc: DmsDocument): DocumentItemData {
  return {
    id: doc.id,
    case_id: doc.case_id,
    original_filename: doc.original_filename,
    document_type: doc.document_type,
    department: doc.department,
    sensitivity: doc.sensitivity,
    mime_type: doc.mime_type,
    file_size: doc.file_size,
    sha256_hash: doc.sha256_hash,
    status: doc.status,
    created_at: doc.created_at,
  };
}
