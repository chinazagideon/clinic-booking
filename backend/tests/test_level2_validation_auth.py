import httpx
import pytest


async def test_missing_or_wrong_api_key_returns_401(client: httpx.AsyncClient) -> None:
    res_wrong = await client.get("/slots", headers={"X-API-Key": "wrong-key"})
    assert res_wrong.status_code == 401
    assert "error" in res_wrong.json()

    res_empty = await client.get("/slots", headers={"X-API-Key": ""})
    assert res_empty.status_code == 401
    assert "error" in res_empty.json()


@pytest.mark.parametrize(
    "payload",
    [
        {"name": "Ada Obi", "email": "ada@example.com"},
        {"slot_id": "", "name": "Ada Obi", "email": "ada@example.com"},
        {"slot_id": "   ", "name": "Ada Obi", "email": "ada@example.com"},
        {"slot_id": "s1", "email": "ada@example.com"},
        {"slot_id": "s1", "name": "", "email": "ada@example.com"},
        {"slot_id": "s1", "name": "   ", "email": "ada@example.com"},
        {"slot_id": "s1", "name": "Ada Obi"},
        {"slot_id": "s1", "name": "Ada Obi", "email": ""},
        {"slot_id": "s1", "name": "Ada Obi", "email": "not-an-email"},
        {"slot_id": "s1", "name": "Ada Obi", "email": "ada@invalid"},
    ],
)
async def test_invalid_booking_fields_return_400(
    client: httpx.AsyncClient, payload: dict[str, str]
) -> None:
    await client.post(
        "/reset",
        json={
            "slots": [
                {
                    "id": "s1",
                    "provider": "Dr Ade",
                    "start": "2027-06-15T09:00:00Z",
                    "end": "2027-06-15T09:30:00Z",
                }
            ]
        },
    )

    res = await client.post("/bookings", json=payload)
    assert res.status_code == 400
    assert "error" in res.json()


async def test_booking_nonexistent_slot_returns_404(client: httpx.AsyncClient) -> None:
    await client.post("/reset", json={"slots": []})

    res = await client.post(
        "/bookings",
        json={"slot_id": "missing", "name": "Ada Obi", "email": "ada@example.com"},
    )
    assert res.status_code == 404
    assert "error" in res.json()


async def test_booking_past_slot_returns_400(client: httpx.AsyncClient) -> None:
    await client.post(
        "/reset",
        json={
            "slots": [
                {
                    "id": "past_slot",
                    "provider": "Dr Ade",
                    "start": "2020-01-01T09:00:00Z",
                    "end": "2020-01-01T09:30:00Z",
                }
            ]
        },
    )

    res = await client.post(
        "/bookings",
        json={"slot_id": "past_slot", "name": "Ada Obi", "email": "ada@example.com"},
    )
    assert res.status_code == 400
    assert "error" in res.json()


async def test_trim_and_lowercase_normalization(client: httpx.AsyncClient) -> None:
    await client.post(
        "/reset",
        json={
            "slots": [
                {
                    "id": "s1",
                    "provider": "Dr Ade",
                    "start": "2027-06-15T09:00:00Z",
                    "end": "2027-06-15T09:30:00Z",
                }
            ]
        },
    )

    res = await client.post(
        "/bookings",
        json={
            "slot_id": "s1",
            "name": "  Ada Obi  ",
            "email": "  ADA.OBI@Example.COM  ",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Ada Obi"
    assert data["email"] == "ada.obi@example.com"
