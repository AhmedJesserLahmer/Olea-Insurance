from olea_common.models import ChatHistory


def test_chat_answer_is_returned_and_saved(client, demo_headers, fake_rag, db):
    res = client.post("/rag", json={"question": "What is FC-003?"}, headers=demo_headers)
    assert res.status_code == 200
    assert res.json() == {"response": "Answer to: What is FC-003?"}

    row = db.query(ChatHistory).filter(ChatHistory.event_id.isnot(None)).one()
    assert row.user_message == "What is FC-003?"
    assert row.user_id is not None


def test_chat_reports_unavailable_pipeline(client, demo_headers, monkeypatch):
    import sys
    import types

    broken = types.ModuleType("olea_rag.rag_model")

    def fail(*_args, **_kwargs):
        raise RuntimeError("Pinecone not configured")

    broken.RAG_Solution = fail
    monkeypatch.setitem(sys.modules, "olea_rag.rag_model", broken)

    res = client.post("/rag", json={"question": "hi"}, headers=demo_headers)
    assert res.status_code == 500
    assert "RAG service unavailable" in res.json()["detail"]
