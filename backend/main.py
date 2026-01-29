from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from uuid import uuid4
from datetime import datetime, timezone
import random
import json

from . import data
from .models import ApprovalRequest, Approver
from .agent_langgraph import run_once

app = FastAPI(title="AI Purchasing Committee - Prototype")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


data.init_db()


def now_iso():
    return datetime.now(timezone.utc).isoformat()


@app.post("/approvals")
def create_dummy_approval():
    """Create a synthetic approval request for demo purposes."""
    aid = str(uuid4())
    vendors = ["Acme Supplies", "Global Widgets", "NorthTech", "Zenith Services"]
    vendor = random.choice(vendors)
    amount = round(random.uniform(500, 50000), 2)
    approvers = [
        {"name": "Alice", "role": "Reviewer", "level": 1},
        {"name": "Bob", "role": "Chair", "level": 2},
    ]
    sla = random.choice([24, 48, 72])
    obj = {
        "id": aid,
        "vendor_name": vendor,
        "amount": amount,
        "approvers": approvers,
        "status": "PENDING",
        "submitted_at": now_iso(),
        "sla_hours": sla,
        "last_reminder_at": None,
        "escalation_level": 0,
    }
    data.save_approval(obj)
    data.log_audit({
        "timestamp": now_iso(),
        "approval_id": aid,
        "actor": "system",
        "action": "created",
        "message": f"Dummy approval created for {vendor} ${amount}",
    })
    return obj


@app.get("/approvals")
def list_all_approvals():
    return data.list_approvals()


@app.post("/approvals/{approval_id}/approve")
def mark_approved(approval_id: str):
    a = data.get_approval(approval_id)
    if not a:
        raise HTTPException(status_code=404, detail="Approval not found")
    a["status"] = "APPROVED"
    data.save_approval(a)
    data.log_audit({
        "timestamp": now_iso(),
        "approval_id": approval_id,
        "actor": "user",
        "action": "approved",
        "message": "Marked approved via API",
    })
    return {"ok": True}


@app.post("/agent/run")
def run_agent():
    """Run the LangGraph-driven agent logic against pending approvals.

    Behavior:
    - If pending < 50% SLA -> no action
    - If pending >= 50% SLA -> generate reminder
    - If pending > SLA -> escalate
    Each action is recorded in the audit log.
    """
    approvals = data.list_approvals()
    now = datetime.now(timezone.utc)
    actions = []
    for a in approvals:
        if a["status"] != "PENDING":
            continue
        res = run_once(a, now)
        if res["action"] == "no_action":
            # nothing to do
            continue
        if res["action"] == "send_reminder":
            # record reminder and update last_reminder_at
            a["last_reminder_at"] = now.isoformat()
            data.save_approval(a)
            data.log_audit({
                "timestamp": now.isoformat(),
                "approval_id": a["id"],
                "actor": "agent",
                "action": "reminder",
                "message": res.get("message"),
            })
            actions.append({"id": a["id"], "action": "reminder"})
        if res["action"] == "escalate":
            # escalate: increment escalation_level and set status to ESCALATED
            a["escalation_level"] = min(2, a.get("escalation_level", 0) + 1)
            a["status"] = "ESCALATED"
            data.save_approval(a)
            data.log_audit({
                "timestamp": now.isoformat(),
                "approval_id": a["id"],
                "actor": "agent",
                "action": "escalation",
                "message": res.get("message"),
                "meta": {"escalation_level": a["escalation_level"]},
            })
            actions.append({"id": a["id"], "action": "escalation"})
    return {"actions": actions}


@app.get("/audit")
def get_audit():
    return data.list_audit()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
