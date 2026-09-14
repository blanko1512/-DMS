from fastapi import FastAPI, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.database import engine
from app.routers.documents import router as documents_router
from app.routers.ai import router as ai_router
from app.routers.shares import router as shares_router
from app.routers.custody import router as custody_router
from app.routers.blockchain import router as blockchain_router
from app.routers.backups import router as backups_router
from app.routers.auth import router as auth_router
from app.routers.audit_logs import router as audit_logs_router

app = FastAPI(
    title="Secure Intelligent Document Management System API",
    version="0.1.0",
)

app.include_router(documents_router)
app.include_router(ai_router)
app.include_router(shares_router)
app.include_router(custody_router)
app.include_router(blockchain_router)
app.include_router(backups_router)
app.include_router(auth_router)
app.include_router(audit_logs_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/health/db")
def database_health_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except SQLAlchemyError as error:
        raise HTTPException(
            status_code=503,
            detail="PostgreSQL connection failed. Check the database and .env settings.",
        ) from error
