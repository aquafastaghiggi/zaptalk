from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    connect_args={"check_same_thread": False},  # necessário para SQLite
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db():
    """Cria todas as tabelas ao iniciar a aplicação."""
    async with engine.begin() as conn:
        from app.models import user, sector, contact, conversation, message, conversation_note, conversation_tag, conversation_transfer, audit_log, quick_reply  # noqa
        await conn.run_sync(Base.metadata.create_all)
        await _ensure_sqlite_conversation_priority(conn)
        await _ensure_sqlite_conversation_pin(conn)
        await _ensure_sqlite_conversation_first_response(conn)


async def _ensure_sqlite_conversation_priority(conn):
    if not engine.url.drivername.startswith("sqlite"):
        return

    result = await conn.execute(text("PRAGMA table_info(conversations)"))
    columns = {row[1] for row in result.fetchall()}
    if "priority" not in columns:
        await conn.execute(
            text(
                "ALTER TABLE conversations "
                "ADD COLUMN priority INTEGER NOT NULL DEFAULT 0"
            )
        )


async def _ensure_sqlite_conversation_first_response(conn):
    if not engine.url.drivername.startswith("sqlite"):
        return

    result = await conn.execute(text("PRAGMA table_info(conversations)"))
    columns = {row[1] for row in result.fetchall()}
    if "first_response_at" not in columns:
        await conn.execute(
            text(
                "ALTER TABLE conversations "
                "ADD COLUMN first_response_at DATETIME"
            )
        )


async def _ensure_sqlite_conversation_pin(conn):
    if not engine.url.drivername.startswith("sqlite"):
        return

    result = await conn.execute(text("PRAGMA table_info(conversations)"))
    columns = {row[1] for row in result.fetchall()}
    if "is_pinned" not in columns:
        await conn.execute(
            text(
                "ALTER TABLE conversations "
                "ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT 0"
            )
        )
