from fastapi import APIRouter, Depends, Query, status

from src.api.deps import get_slot_service
from src.models.schemas.slot import SlotListResponse
from src.services.slot_service import SlotService

router = APIRouter(tags=["Slots"])


@router.get(
    "/slots",
    response_model=SlotListResponse,
    status_code=status.HTTP_200_OK,
    summary="List appointment slots with real-time availability",
    response_description="Array of clinic slots sorted chronologically",
    responses={
        200: {
            "description": "Successfully retrieved slots with current booking availability.",
        },
        401: {
            "description": "Missing or invalid X-API-Key header.",
            "content": {
                "application/json": {
                    "example": {"error": "Missing or invalid API key"}
                }
            },
        },
    },
)
async def list_slots(
    provider: str | None = Query(
        default=None,
        description="Filter slots by exact provider name (e.g., 'Dr Ade'). Omit to list slots across all practitioners.",
        examples=["Dr Ade"],
    ),
    service: SlotService = Depends(get_slot_service),
) -> SlotListResponse:
    """Retrieve appointment slots sorted by earliest start time first.

    ### How to leverage this endpoint:
    Call this endpoint before presenting scheduling options to patients.

    - **Availability Flag**: Each slot contains an `available` boolean (`true` if open, `false` if already reserved by a confirmed booking).
    - **Chronological Sorting**: Slots are returned in ascending chronological order (`start` ASC, `id` ASC).
    - **Provider Filtering**: Provide `?provider=<name>` to retrieve slots tailored to a specific doctor or clinic practitioner.

    #### Required Headers:
    - `X-API-Key`: Your configured clinic API secret key.

    #### Example cURL:
    ```bash
    curl -X GET "http://localhost:8000/slots?provider=Dr%20Ade" \\
      -H "X-API-Key: secret123"
    ```
    """
    return await service.list_slots(provider=provider)
