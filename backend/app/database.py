import os

from dotenv import load_dotenv
from sqlalchemy import URL, create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv()


configured_database_url = os.getenv("DATABASE_URL", "").strip()
is_render = os.getenv("RENDER", "").lower() == "true"
local_hosts = {"localhost", "127.0.0.1", "10.0.2.2"}
if configured_database_url:
    database_url = configured_database_url
    if database_url.startswith("postgres://"):
        database_url = "postgresql+psycopg://" + database_url.removeprefix("postgres://")
    elif database_url.startswith("postgresql://"):
        database_url = "postgresql+psycopg://" + database_url.removeprefix("postgresql://")
    if is_render and (make_url(database_url).host or "").lower() in local_hosts:
        raise RuntimeError("Render DATABASE_URL must not point to a local database host.")
else:
    postgres_host = os.getenv("POSTGRES_HOST", "localhost").strip()
    if is_render and (not postgres_host or postgres_host.lower() in local_hosts):
        raise RuntimeError("Set DATABASE_URL or a remote POSTGRES_HOST on Render.")
    database_url = URL.create(
        drivername="postgresql+psycopg",
        username=os.getenv("POSTGRES_USER", "postgres"),
        password=os.getenv("POSTGRES_PASSWORD", ""),
        host=postgres_host,
        port=int(os.getenv("POSTGRES_PORT", "5432")),
        database=os.getenv("POSTGRES_DB", "dms_db"),
    )

engine = create_engine(database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
