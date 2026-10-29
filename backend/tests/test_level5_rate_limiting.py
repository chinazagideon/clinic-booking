import httpx


async def test_rate_limiting_per_email(client: httpx.AsyncClient) -> None:
    slots = [
        {
            "id": f"s{i}",
            "provider": "Dr Ade",
            "start": f"2027-06-15T{10 + i:02d}:00:00Z",
            "end": f"2027-06-15T{10 + i:02d}:30:00Z",
        }
        for i in range(10)
    ]
    await client.post("/reset", json={"slots": slots})

    # 3 valid bookings + 2 failed attempts (404 slot) = 5 attempts for ada@example.com
    for i in range(3):
        res = await client.post(
            "/bookings",
            json={"slot_id": f"s{i}", "name": "Ada Obi", "email": "ada@example.com"},
        )
        assert res.status_code == 201

    for _ in range(2):
        res = await client.post(
            "/bookings",
            json={
                "slot_id": "nonexistent",
                "name": "Ada Obi",
                "email": "ada@example.com",
            },
        )
        assert res.status_code == 404

    # 6th attempt for ada@example.com must return 429 with Retry-After in whole seconds
    res_6th = await client.post(
        "/bookings",
        json={"slot_id": "s3", "name": "Ada Obi", "email": "ada@example.com"},
    )
    assert res_6th.status_code == 429
    assert "error" in res_6th.json()
    assert "Retry-After" in res_6th.headers
    retry_after = int(res_6th.headers["Retry-After"])
    assert 1 <= retry_after <= 60

    # Other email is unaffected
    res_other = await client.post(
        "/bookings",
        json={"slot_id": "s3", "name": "Bola Cole", "email": "bola@example.com"},
    )
    assert res_other.status_code == 201
