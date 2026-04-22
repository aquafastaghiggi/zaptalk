"""
Script de seed: cria o usuário admin e setores iniciais.
Execute UMA vez após subir o servidor:

    cd backend
    python seed.py
"""
import asyncio
from app.db.database import AsyncSessionLocal, init_db
from app.models.user import User, UserRole
from app.models.sector import Sector
from app.core.security import get_password_hash


async def seed():
    await init_db()

    async with AsyncSessionLocal() as db:
        # ── Admin ──────────────────────────────────────────
        admin = User(
            name="Administrador",
            email="admin@zaptalk.com",
            hashed_password=get_password_hash("admin123"),
            role=UserRole.ADMIN,
            must_change_password=True,
            setup_done=False,
            first_login=False,
        )
        db.add(admin)

        # ── Setores padrão ─────────────────────────────────
        for name in ["Suporte", "Vendas", "Financeiro"]:
            db.add(Sector(name=name))

        await db.commit()

    print("✅ Seed concluído!")
    print("   Admin: admin@zaptalk.com / admin123")
    print("   Setores: Suporte, Vendas, Financeiro")
    print()
    print("⚠️  Troque a senha do admin antes de usar em produção!")


if __name__ == "__main__":
    asyncio.run(seed())
