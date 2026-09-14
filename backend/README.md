# DMS Backend

Basic FastAPI foundation for the Secure Intelligent Document Management System.

## Run locally

From the `backend` directory:

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

The API is available at `http://127.0.0.1:8000`.

- Health check: `http://127.0.0.1:8000/health`
- PostgreSQL check: `http://127.0.0.1:8000/health/db`
- API docs: `http://127.0.0.1:8000/docs`
