"""Seed script to populate initial users, cases, and documents in DMS PostgreSQL database."""

import uuid
from datetime import datetime, timezone
from app.database import Base, SessionLocal, engine
from app.models.user import User
from app.models.case import Case
from app.models.document import Document
from app.models.document_version import DocumentVersion
from app.models.chain_of_custody import ChainOfCustody
from app.models.audit_log import AuditLog
from app.services.auth_service import hash_password

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Create or get test users
        users = [
            ("Det. Vance", "investigator@dms.internal", "SecretPass@2026", "INVESTIGATOR"),
            ("Chief Proctor", "admin@dms.internal", "SecretPass@2026", "ADMIN"),
            ("Dr. Evans", "forensic@dms.internal", "SecretPass@2026", "FORENSIC_OFFICER"),
            ("Officer Davis", "viewer@dms.internal", "SecretPass@2026", "VIEWER"),
        ]

        user_map = {}
        for name, email, password, role in users:
            u = db.query(User).filter(User.email == email).first()
            if not u:
                u = User(
                    name=name,
                    email=email,
                    password_hash=hash_password(password),
                    role=role,
                    is_active=True,
                )
                db.add(u)
                db.flush()
                print(f"Created user: {email} ({role})")
            user_map[email] = u

        db.commit()

        # 2. Create sample cases
        admin_user = user_map["admin@dms.internal"]
        investigator_user = user_map["investigator@dms.internal"]

        sample_cases = [
            ("CASE-2026-089", "Financial Cyber Fraud & Ledger Breach", "Cyber Crimes Division"),
            ("CASE-2026-074", "High Profile Witness Deposition Registry", "Legal Prosecution"),
            ("CASE-2026-062", "Critical Infrastructure Intrusion FIR", "Cyber Security Cell"),
        ]

        case_map = {}
        for case_num, title, dept in sample_cases:
            c = db.query(Case).filter(Case.case_number == case_num).first()
            if not c:
                c = Case(
                    case_number=case_num,
                    title=title,
                    department=dept,
                    status="open",
                    created_by=admin_user.id,
                )
                db.add(c)
                db.flush()
                print(f"Created case: {case_num}")
            case_map[case_num] = c

        db.commit()

        # 3. Create sample documents
        sample_docs = [
            (
                "Forensic_Audit_Report_Q3.pdf",
                case_map["CASE-2026-089"].id,
                "Audit Report",
                "Financial Crimes Division",
                "HIGH",
                "application/pdf",
                2450000,
                "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
                "SEALED",
                "Comprehensive forensic analysis of ledger anomalies.",
            ),
            (
                "Witness_Deposition_Transcript.docx",
                case_map["CASE-2026-074"].id,
                "Deposition",
                "Legal Prosecution",
                "RESTRICTED",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                894000,
                "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
                "VERIFIED",
                "Sworn testimony of key witness recorded under judicial seal.",
            ),
            (
                "First_Information_Report_FIR_2026_04.pdf",
                case_map["CASE-2026-062"].id,
                "First Information Report (FIR)",
                "Cyber Security Cell",
                "HIGH",
                "application/pdf",
                1520000,
                "3a88c2114d77ee09923315af1287c2b4e8832a67e5bb9910d55e88fa2901cce1",
                "VERIFIED",
                "First information report registered for infrastructure breach.",
            ),
        ]

        for (
            filename,
            cid,
            dtype,
            dept,
            sens,
            mime,
            size,
            sha,
            status,
            desc,
        ) in sample_docs:
            d = db.query(Document).filter(Document.original_filename == filename).first()
            if not d:
                d = Document(
                    case_id=cid,
                    original_filename=filename,
                    storage_path=f"local://{filename}",
                    storage_provider="local",
                    description=desc,
                    document_type=dtype,
                    department=dept,
                    sensitivity=sens,
                    mime_type=mime,
                    file_size=size,
                    sha256_hash=sha,
                    status=status,
                    uploaded_by=investigator_user.id,
                )
                db.add(d)
                db.flush()

                # Version 1
                v = DocumentVersion(
                    document_id=d.id,
                    version_number=1,
                    storage_path=d.storage_path,
                    storage_provider="local",
                    sha256_hash=sha,
                    created_by=investigator_user.id,
                    change_reason="Initial ingestion",
                    original_filename=filename,
                    file_size=size,
                    mime_type=mime,
                    status=status,
                )
                db.add(v)

                # Custody record
                custody = ChainOfCustody(
                    document_id=d.id,
                    action="INGESTION",
                    performed_by=investigator_user.id,
                    timestamp=datetime.now(timezone.utc),
                    status="COMPLETED",
                    reason="Official evidence preservation",
                )
                db.add(custody)

                # Audit log
                audit = AuditLog(
                    actor_id=investigator_user.id,
                    action="DOCUMENT_UPLOADED",
                    resource_type="document",
                    resource_id=str(d.id),
                    result="SUCCESS",
                    document_id=d.id,
                )
                db.add(audit)
                print(f"Created document: {filename}")

        db.commit()
        print("Database successfully seeded with realistic DMS data!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
