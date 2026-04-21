from fastapi import APIRouter
from app.api.v1.endpoints import auth, conversations, webhook, instances, sectors, ws, users, dashboard, audit, quick_replies, contacts, reports, ai

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(conversations.router)
api_router.include_router(webhook.router)
api_router.include_router(instances.router)
api_router.include_router(sectors.router)
api_router.include_router(dashboard.router)
api_router.include_router(audit.router)
api_router.include_router(quick_replies.router)
api_router.include_router(contacts.router)
api_router.include_router(reports.router)
api_router.include_router(ai.router)
api_router.include_router(ws.router)
