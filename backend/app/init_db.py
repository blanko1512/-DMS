from sqlalchemy import inspect, text

from app.database import Base, SessionLocal, engine
from app import models
from app.models.document import Document
from app.models.document_version import DocumentVersion
from app.services.version_service import create_initial_version


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    document_columns = {column["name"] for column in inspect(engine).get_columns("documents")}
    version_columns = {column["name"] for column in inspect(engine).get_columns("document_versions")}
    transfer_columns = {column["name"] for column in inspect(engine).get_columns("document_transfers")}
    custody_columns = {column["name"] for column in inspect(engine).get_columns("chain_of_custody")}
    blockchain_columns = {column["name"] for column in inspect(engine).get_columns("blockchain_records")}
    audit_columns = {column["name"] for column in inspect(engine).get_columns("audit_logs")}
    document_migrations = {
        "description": "ALTER TABLE documents ADD COLUMN description TEXT",
        "storage_provider": "ALTER TABLE documents ADD COLUMN storage_provider VARCHAR(50) NOT NULL DEFAULT 'local'",
        "cloudinary_public_id": "ALTER TABLE documents ADD COLUMN cloudinary_public_id VARCHAR(1000)",
        "cloudinary_resource_type": "ALTER TABLE documents ADD COLUMN cloudinary_resource_type VARCHAR(50)",
        "cloudinary_version": "ALTER TABLE documents ADD COLUMN cloudinary_version INTEGER",
    }
    version_migrations = {
        "version_original_filename": "ALTER TABLE document_versions ADD COLUMN original_filename VARCHAR(255) NOT NULL DEFAULT 'legacy-document'",
        "version_file_size": "ALTER TABLE document_versions ADD COLUMN file_size INTEGER",
        "version_mime_type": "ALTER TABLE document_versions ADD COLUMN mime_type VARCHAR(150)",
        "version_status": "ALTER TABLE document_versions ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'PENDING_VALIDATION'",
    }
    transfer_migrations = {
        "permission": "ALTER TABLE document_transfers ADD COLUMN permission VARCHAR(20) NOT NULL DEFAULT 'VIEW'",
        "revoked_at": "ALTER TABLE document_transfers ADD COLUMN revoked_at TIMESTAMP WITH TIME ZONE",
    }
    custody_migrations = {
        "status": "ALTER TABLE chain_of_custody ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'PENDING'",
        "reason": "ALTER TABLE chain_of_custody ADD COLUMN reason VARCHAR(500)",
        "related_transfer_id": "ALTER TABLE chain_of_custody ADD COLUMN related_transfer_id UUID",
        "version_id": "ALTER TABLE chain_of_custody ADD COLUMN version_id UUID",
    }
    blockchain_migrations = {
        "version_id": "ALTER TABLE blockchain_records ADD COLUMN version_id UUID",
        "proof_hash": "ALTER TABLE blockchain_records ADD COLUMN proof_hash VARCHAR(66) NOT NULL DEFAULT '0x'",
        "verification_status": "ALTER TABLE blockchain_records ADD COLUMN verification_status VARCHAR(50) NOT NULL DEFAULT 'ANCHORED'",
    }
    audit_migrations = {
        "resource_type": "ALTER TABLE audit_logs ADD COLUMN resource_type VARCHAR(50)",
        "resource_id": "ALTER TABLE audit_logs ADD COLUMN resource_id VARCHAR(100)",
        "result": "ALTER TABLE audit_logs ADD COLUMN result VARCHAR(30)",
    }
    with engine.begin() as connection:
        for column, statement in document_migrations.items():
            if column not in document_columns:
                connection.execute(text(statement))
                print(f"Added documents.{column} column.")
        for column, statement in version_migrations.items():
            actual_column = statement.split(" ADD COLUMN ", 1)[1].split(" ", 1)[0]
            if actual_column not in version_columns:
                connection.execute(text(statement))
                print(f"Added document_versions.{actual_column} column.")
        for column, statement in transfer_migrations.items():
            if column not in transfer_columns:
                connection.execute(text(statement))
                print(f"Added document_transfers.{column} column.")
        for column, statement in custody_migrations.items():
            if column not in custody_columns:
                connection.execute(text(statement))
                print(f"Added chain_of_custody.{column} column.")
        for column, statement in blockchain_migrations.items():
            if column not in blockchain_columns:
                connection.execute(text(statement))
                print(f"Added blockchain_records.{column} column.")
        for column, statement in audit_migrations.items():
            if column not in audit_columns:
                connection.execute(text(statement))
                print(f"Added audit_logs.{column} column.")
    db = SessionLocal()
    try:
        for document in db.query(Document).all():
            if not db.query(DocumentVersion).filter(DocumentVersion.document_id == document.id).first():
                create_initial_version(db, document)
        db.commit()
    finally:
        db.close()
    print("Database tables created or already existed.")
    print("Tables:", ", ".join(sorted(Base.metadata.tables)))
