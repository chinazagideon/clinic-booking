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


_SLOTS = {
    "slots": [
        {
            "id": f"s{i}",
            "provider": "Dr Ade",
            "start": f"2027-06-15T{9 + i:02d}:00:00Z",
            "end": f"2027-06-15T{9 + i:02d}:30:00Z",
        }
        for i in (1, 2)
    ]
}


async def test_idempotent_replay_returns_identical_response(
    client: httpx.AsyncClient,
) -> None:
    await client.post("/reset", json=_SLOTS)
    body = {"slot_id": "s1", "name": "Ada Obi", "email": "ada@example.com"}
    headers = {"Idempotency-Key": "replay-1"}

    res1 = await client.post("/bookings", json=body, headers=headers)
    # Key order must not matter for body comparison
    reordered = {"email": "ada@example.com", "name": "Ada Obi", "slot_id": "s1"}
    res2 = await client.post("/bookings", json=reordered, headers=headers)

    assert res1.status_code == res2.status_code == 201
    assert res1.json() == res2.json()
    assert res2.headers.get("Idempotent-Replayed") == "true"

    listing = await client.get("/bookings", params={"email": "ada@example.com"})
    assert len(listing.json()["bookings"]) == 1


async def test_same_key_different_name_or_email_returns_422(
    client: httpx.AsyncClient,
) -> None:
    await client.post("/reset", json=_SLOTS)
    body = {"slot_id": "s1", "name": "Ada Obi", "email": "ada@example.com"}
    headers = {"Idempotency-Key": "mismatch-1"}
    assert (await client.post("/bookings", json=body, headers=headers)).status_code == 201

    for changed in (
        {**body, "name": "Someone Else"},
        {**body, "email": "other@example.com"},
    ):
        res = await client.post("/bookings", json=changed, headers=headers)
        assert res.status_code == 422
        assert "error" in res.json()

    # Original body still replays correctly afterwards
    again = await client.post("/bookings", json=body, headers=headers)
    assert again.status_code == 201


async def test_failed_request_replays_same_error_and_mismatch_is_422(
    client: httpx.AsyncClient,
) -> None:
    await client.post("/reset", json=_SLOTS)
    bad = {"slot_id": "missing", "name": "Ada Obi", "email": "ada@example.com"}
    headers = {"Idempotency-Key": "err-1"}

    res1 = await client.post("/bookings", json=bad, headers=headers)
    res2 = await client.post("/bookings", json=bad, headers=headers)
    assert res1.status_code == res2.status_code == 404
    assert res1.json() == res2.json()

    res3 = await client.post(
        "/bookings", json={**bad, "slot_id": "s1"}, headers=headers
    )
    assert res3.status_code == 422


async def test_different_keys_are_independent(client: httpx.AsyncClient) -> None:
    await client.post("/reset", json=_SLOTS)
    body = {"slot_id": "s1", "name": "Ada Obi", "email": "ada@example.com"}
    res1 = await client.post("/bookings", json=body, headers={"Idempotency-Key": "a"})
    res2 = await client.post("/bookings", json=body, headers={"Idempotency-Key": "b"})
    assert res1.status_code == 201
    assert res2.status_code == 409


async def test_oversized_idempotency_key_returns_400(
    client: httpx.AsyncClient,
) -> None:
    await client.post("/reset", json=_SLOTS)
    body = {"slot_id": "s1", "name": "Ada Obi", "email": "ada@example.com"}
    res = await client.post(
        "/bookings", json=body, headers={"Idempotency-Key": "k" * 256}
    )
    assert res.status_code == 400
    assert "error" in res.json()


async def test_concurrent_requests_with_same_key_execute_once(
    client: httpx.AsyncClient,
) -> None:
    import asyncio

    await client.post("/reset", json=_SLOTS)
    body = {"slot_id": "s1", "name": "Ada Obi", "email": "ada@example.com"}
    headers = {"Idempotency-Key": "concurrent-1"}

    responses = await asyncio.gather(
        *[client.post("/bookings", json=body, headers=headers) for _ in range(4)]
    )
    assert {r.status_code for r in responses} == {201}
    assert len({r.json()["id"] for r in responses}) == 1

    listing = await client.get("/bookings", params={"email": "ada@example.com"})
    assert len(listing.json()["bookings"]) == 1
