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
        from app.models import user, sector, contact, conversation, message, conversation_note, conversation_tag, conversation_transfer, audit_log, quick_reply, password_reset_token, invite_token, access_request  # noqa
        await conn.run_sync(Base.metadata.create_all)
        await _ensure_sqlite_user_onboarding_fields(conn)
        await _ensure_sqlite_conversation_priority(conn)
        await _ensure_sqlite_conversation_pin(conn)
        await _ensure_sqlite_conversation_first_response(conn)
        await _ensure_sqlite_contact_crm_fields(conn)
        await _ensure_sqlite_sector_triage_fields(conn)


async def _ensure_sqlite_user_onboarding_fields(conn):
    if not engine.url.drivername.startswith("sqlite"):
        return

    result = await conn.execute(text("PRAGMA table_info(users)"))
    columns = {row[1] for row in result.fetchall()}
    if "must_change_password" not in columns:
        await conn.execute(
            text(
                "ALTER TABLE users "
                "ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT 0"
            )
        )
    if "setup_done" not in columns:
        await conn.execute(
            text(
                "ALTER TABLE users "
                "ADD COLUMN setup_done BOOLEAN NOT NULL DEFAULT 0"
            )
        )
    if "first_login" not in columns:
        await conn.execute(
            text(
                "ALTER TABLE users "
                "ADD COLUMN first_login BOOLEAN NOT NULL DEFAULT 1"
            )
        )


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


async def _ensure_sqlite_contact_crm_fields(conn):
    if not engine.url.drivername.startswith("sqlite"):
        return

    result = await conn.execute(text("PRAGMA table_info(contacts)"))
    columns = {row[1] for row in result.fetchall()}
    if "company" not in columns:
        await conn.execute(text("ALTER TABLE contacts ADD COLUMN company VARCHAR(120)"))
    if "origin" not in columns:
        await conn.execute(text("ALTER TABLE contacts ADD COLUMN origin VARCHAR(80)"))
    if "stage" not in columns:
        await conn.execute(text("ALTER TABLE contacts ADD COLUMN stage VARCHAR(50)"))
    if "responsible_user_id" not in columns:
        await conn.execute(text("ALTER TABLE contacts ADD COLUMN responsible_user_id VARCHAR"))


async def _ensure_sqlite_sector_triage_fields(conn):
    if not engine.url.drivername.startswith("sqlite"):
        return

    result = await conn.execute(text("PRAGMA table_info(sectors)"))
    columns = {row[1] for row in result.fetchall()}
    if "routing_keywords" not in columns:
        await conn.execute(text("ALTER TABLE sectors ADD COLUMN routing_keywords VARCHAR(500)"))
