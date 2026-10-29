from fastapi import APIRouter, Depends

from src.api.v1 import bookings, reset, slots
from src.core.security import verify_api_key

api_router = APIRouter(dependencies=[Depends(verify_api_key)])

api_router.include_router(reset.router)
api_router.include_router(slots.router)
api_router.include_router(bookings.router)
