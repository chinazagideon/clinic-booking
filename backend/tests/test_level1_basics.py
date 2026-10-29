import httpx


async def test_reset_and_list_slots_sorted(client: httpx.AsyncClient) -> None:
    slots_payload = {
        "slots": [
            {
                "id": "s2",
                "provider": "Dr Musa",
                "start": "2027-06-15T11:00:00Z",
                "end": "2027-06-15T11:30:00Z",
            },
            {
                "id": "s1",
                "provider": "Dr Ade",
                "start": "2027-06-15T09:00:00Z",
                "end": "2027-06-15T09:30:00Z",
            },
        ]
    }
    res = await client.post("/reset", json=slots_payload)
    assert res.status_code == 200

    list_res = await client.get("/slots")
    assert list_res.status_code == 200
    data = list_res.json()
    assert len(data["slots"]) == 2
    assert data["slots"][0]["id"] == "s1"
    assert data["slots"][0]["available"] is True
    assert data["slots"][1]["id"] == "s2"
    assert data["slots"][1]["available"] is True


async def test_filter_slots_by_provider(client: httpx.AsyncClient) -> None:
    await client.post(
        "/reset",
        json={
            "slots": [
                {
                    "id": "s1",
                    "provider": "Dr Ade",
                    "start": "2027-06-15T09:00:00Z",
                    "end": "2027-06-15T09:30:00Z",
                },
                {
                    "id": "s2",
                    "provider": "Dr Musa",
                    "start": "2027-06-15T10:00:00Z",
                    "end": "2027-06-15T10:30:00Z",
                },
            ]
        },
    )

    res = await client.get("/slots", params={"provider": "Dr Ade"})
    assert res.status_code == 200
    slots = res.json()["slots"]
    assert len(slots) == 1
    assert slots[0]["id"] == "s1"


async def test_create_and_get_booking(client: httpx.AsyncClient) -> None:
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

    book_res = await client.post(
        "/bookings",
        json={"slot_id": "s1", "name": "Ada Obi", "email": "ada@example.com"},
    )
    assert book_res.status_code == 201
    booking = book_res.json()
    assert booking["slot_id"] == "s1"
    assert booking["name"] == "Ada Obi"
    assert booking["email"] == "ada@example.com"
    assert booking["status"] == "confirmed"
    assert "id" in booking
    assert "created_at" in booking

    get_res = await client.get(f"/bookings/{booking['id']}")
    assert get_res.status_code == 200
    assert get_res.json() == booking

    slots_res = await client.get("/slots")
    assert slots_res.json()["slots"][0]["available"] is False


async def test_get_nonexistent_booking_returns_404(client: httpx.AsyncClient) -> None:
    res = await client.get("/bookings/non-existent-id")
    assert res.status_code == 404
    assert "error" in res.json()
