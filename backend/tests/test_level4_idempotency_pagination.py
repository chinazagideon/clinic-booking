import httpx


async def test_idempotency_key_replays_and_conflict(client: httpx.AsyncClient) -> None:
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
                    "provider": "Dr Ade",
                    "start": "2027-06-15T10:00:00Z",
                    "end": "2027-06-15T10:30:00Z",
                },
            ]
        },
    )

    body = {"slot_id": "s1", "name": "Ada Obi", "email": "ada@example.com"}
    headers = {"Idempotency-Key": "idem-key-123"}

    res1 = await client.post("/bookings", json=body, headers=headers)
    assert res1.status_code == 201

    res2 = await client.post("/bookings", json=body, headers=headers)
    assert res2.status_code == 201
    assert res2.json()["id"] == res1.json()["id"]

    diff_body = {"slot_id": "s2", "name": "Ada Obi", "email": "ada@example.com"}
    res3 = await client.post("/bookings", json=diff_body, headers=headers)
    assert res3.status_code == 422
    assert "error" in res3.json()


async def test_cursor_pagination_and_case_insensitive_email(
    client: httpx.AsyncClient,
) -> None:
    slots = [
        {
            "id": f"s{i}",
            "provider": "Dr Ade",
            "start": f"2027-06-15T{10 + i:02d}:00:00Z",
            "end": f"2027-06-15T{10 + i:02d}:30:00Z",
        }
        for i in range(5)
    ]
    await client.post("/reset", json={"slots": slots})

    created_ids: list[str] = []
    for i in range(5):
        res = await client.post(
            "/bookings",
            json={"slot_id": f"s{i}", "name": "Ada Obi", "email": "ada@example.com"},
        )
        assert res.status_code == 201
        created_ids.append(res.json()["id"])

    # Fetch with case-insensitive email and limit=2
    page1 = await client.get(
        "/bookings", params={"email": "ADA@EXAMPLE.COM", "limit": 2}
    )
    assert page1.status_code == 200
    data1 = page1.json()
    assert [b["id"] for b in data1["bookings"]] == created_ids[0:2]
    assert data1["next_cursor"] is not None

    page2 = await client.get(
        "/bookings",
        params={
            "email": "ada@example.com",
            "limit": 2,
            "cursor": data1["next_cursor"],
        },
    )
    assert page2.status_code == 200
    data2 = page2.json()
    assert [b["id"] for b in data2["bookings"]] == created_ids[2:4]
    assert data2["next_cursor"] is not None

    page3 = await client.get(
        "/bookings",
        params={
            "email": "ada@example.com",
            "limit": 2,
            "cursor": data2["next_cursor"],
        },
    )
    assert page3.status_code == 200
    data3 = page3.json()
    assert [b["id"] for b in data3["bookings"]] == created_ids[4:5]
    assert data3["next_cursor"] is None


async def test_invalid_limit_returns_400(client: httpx.AsyncClient) -> None:
    res_low = await client.get(
        "/bookings", params={"email": "ada@example.com", "limit": 0}
    )
    assert res_low.status_code == 400
    assert "error" in res_low.json()

    res_high = await client.get(
        "/bookings", params={"email": "ada@example.com", "limit": 51}
    )
    assert res_high.status_code == 400
    assert "error" in res_high.json()
