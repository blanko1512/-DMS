# -DMS

A full-stack document-management system for controlled upload, classification, validation, integrity checks, secure sharing, custody history, blockchain proofs, and backup verification.

## Security first

Never commit `backend/.env`, database passwords, Cloudinary credentials, JWT secrets, wallet private keys, RPC credentials, uploaded files, or generated backup/storage data. The repository ignores these paths. Use `backend/.env.example` as the configuration template.

The credentials currently present in any local `.env` file should be rotated before publishing this project.

## Architecture

```text
frontend/  React + TypeScript + Vite UI
backend/   FastAPI API, SQLAlchemy models, PostgreSQL integration
backend/app/routers/     Auth, documents, AI, sharing, custody, blockchain, backups, audit
backend/app/services/    Storage, extraction, classification, validation, integrity, backup services
backend/app/models/      SQLAlchemy database models
backend/app/schemas/     Pydantic request/response contracts
backend/blockchain/      Solidity registry and deployment artifacts
```

The browser uses JWT authentication stored in `sessionStorage` and sends it through the shared `apiRequest`/`authHeaders` helpers. Backend RBAC remains authoritative.

## Implemented workflow

1. Authenticate with password plus OTP.
2. Upload a document with case metadata.
3. Store the file through the configured storage provider and calculate SHA-256.
4. Extract PDF text/OCR and run Ollama classification when requested.
5. Validate required fields and metadata consistency.
6. Search, list, and inspect document details.
7. Detect exact duplicates using SHA-256 only.
8. View document versions and chain-of-custody events.
9. Create and verify blockchain integrity proofs.
10. Create, access, and revoke secure shares.
11. Create backups and run non-destructive restore verification.
12. Record audit events through the backend.

## Requirements

- Windows PowerShell or an equivalent shell
- Python 3.11+
- Node.js 20+
- PostgreSQL 14+
- Optional integrations: Cloudinary, Ollama, local EVM node, PostgreSQL client tools

## Backend setup

```powershell
Set-Location backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env` with local values. Initialize the database using the existing project setup, then run:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend URLs:

- API: http://127.0.0.1:8000
- Swagger UI: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/health
- Database health: http://127.0.0.1:8000/health/db

## Frontend setup

```powershell
Set-Location frontend
npm install
npm run dev
```

The Vite development proxy targets the backend during development. To use another API origin in a production-style build, set `VITE_API_BASE_URL` in the frontend environment.

Useful commands:

```powershell
npm run build
npm run lint
npm run preview
```

## API modules

| Area | Main routes |
| --- | --- |
| Authentication | `/api/auth/login`, `/api/auth/verify-otp`, `/api/auth/me` |
| Documents | `/api/documents`, `/api/documents/upload`, `/api/documents/search` |
| Required fields | `POST /api/documents/{document_id}/validate-required-fields` |
| Metadata consistency | `POST /api/documents/{document_id}/validate-consistency` |
| Exact duplicates | `GET /api/documents/{document_id}/duplicates` |
| Versions | `/api/documents/{document_id}/versions` |
| Sharing | `/api/documents/{document_id}/shares`, `/api/shares/{share_id}` |
| Custody | `GET /api/documents/{document_id}/custody` |
| Blockchain | `GET /api/documents/{document_id}/blockchain-verify` |
| Backup | `POST /api/backups/create`, `POST /api/backups/restore-test` |
| Audit | `GET /api/audit-logs` |

See Swagger at `/docs` for the complete generated contract. Do not add frontend authorization rules that conflict with backend RBAC.

## Configuration

Copy `backend/.env.example` to `backend/.env` and replace every placeholder. Required integrations:

- PostgreSQL: database connection settings
- JWT: signing secret, algorithm, and expiration
- Cloudinary: file storage credentials
- Ollama: local model URL and model name
- Blockchain: RPC URL, contract address, and private key for proof creation

The frontend only needs `VITE_API_BASE_URL` when the API is not served from the default development origin.

## Data and generated files

These are local/runtime artifacts and must stay outside Git:

- `backend/.env`
- `backend/.venv/`
- `backend/storage/`
- `backend/backups/`
- `backend/restore-tests/`
- Python caches and frontend build output

## Validation status

The existing frontend build and TypeScript diagnostics pass. The repository does not currently include an installed pytest runner; do not install test dependencies solely to publish the project. Run the API health checks and frontend build before sharing changes.

## Publishing privately

Create a private repository under the GitHub account `blanko1512`, then configure the remote locally:

```powershell
git init
git add .
git commit -m "Initial DMS application"
git branch -M main
git remote add origin https://github.com/blanko1512/<repository-name>.git
git push -u origin main
```

Review `git status` and `git diff --cached` before pushing. Confirm that `.env`, credentials, storage files, and backups are not staged.
>>>>>>> c14107e (Publish DMS application and documentation)
