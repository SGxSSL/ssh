# AI-Powered Purchasing Committee Approval Facilitation Agent

Problem statement
- Procurement approvals often stall because reviewers forget, are overloaded, or lack visible SLAs. This prototype demonstrates an agent-driven assistant that tracks approvals, issues reminders, and escalates when SLAs are breached to accelerate decision-making.

Why approvals get delayed
- Human attention is finite: reviewers miss emails or deprioritize approvals.
- Lack of visible SLAs and auditability reduces urgency and accountability.

Solution overview
- An explainable agent monitors pending approvals, issues reminders when an approval reaches 50% of its SLA, and escalates when SLA is breached. All agent actions are recorded in a full audit trail. LLMs are used only to generate reminder/escalation text.

Architecture (ASCII)

Backend (FastAPI) <--> Frontend (React + Ant Design)
      |                              ^
      |                              |
      +-- LangGraph agent (state machine) --+ 
      |                              |
  SQLite (lightweight)          Polling (5s)

Tech stack
- Frontend: React + Ant Design
- Backend: Python + FastAPI
- Agent modeling: LangGraph (state-machine style)
- Data: SQLite (demo/synthetic data)

Setup
- Backend
  - Create a Python 3.10+ venv and install dependencies:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
```

  - (Optional) set `OPENAI_API_KEY` to enable LLM-generated text.

  - Run the backend:

```bash
uvicorn backend.main:app --reload --port 8000
```

- Frontend
  - From `d:/ssh/frontend` run:

```bash
npm install
npm start
```

How to run the demo
1. Start the backend (above).
2. Start the frontend (above). The UI polls the backend every 5 seconds.
3. Click "Create Dummy Approval" to add a synthetic approval.
4. Click "Run Agent" to execute reminders/escalations immediately.
5. Watch the Agent Activity timeline for audit entries.

Sample demo flow
1. Create a dummy approval (SLA 24–72 hours).
2. After time passes (or by running the agent multiple times), when pending ≥ 50% SLA the agent issues a reminder (audit entry).
3. If pending > SLA, the agent escalates and sets status to `ESCALATED` (audit entry).
4. Manual approval is always possible via the UI's Approve button.

Key assumptions & limitations
- Hackathon prototype: not production hardened.
- Notifications are simulated and visible only via audit logs.
- LLM is optional — deterministic templates used when no API key is provided.
- LangGraph is used to model decision logic; a lightweight fallback is present.
