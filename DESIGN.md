# Design: AI-Powered Purchasing Committee Approval Facilitation Agent

High-level system design
- Backend (FastAPI) manages approvals and an audit log (SQLite). An agent (modeled with LangGraph) evaluates pending approvals and takes actions.
- Frontend (React + Ant Design) displays approvals, SLA timers, and an Agent Activity timeline. The frontend polls the backend for near-real-time updates.

Agent responsibilities
- Periodically evaluate pending approvals.
- Generate reminders when pending >= 50% SLA.
- Escalate when pending > SLA, incrementing escalation level and marking status as `ESCALATED`.
- Log every action to the audit trail.

Approval lifecycle states
- PENDING: initial state while awaiting approvals.
- APPROVED: final state set by a human action.
- ESCALATED: set by the agent when SLA is breached.

SLA & escalation strategy
- SLA measured in hours from `submitted_at`.
- Reminder threshold: 50% of SLA.
- Escalation threshold: > SLA.
- Escalation levels: 0 (none) -> 1 (chair) -> 2 (finance head).

Why AI (LLM) is used and where it is NOT used
- Used only to create human-friendly reminder and escalation messages (templating + LLM).
- Not used to approve requests or perform autonomous decisions — humans retain final authority.

Data model explanation
- `ApprovalRequest`: id, vendor_name, amount, approvers[], status, submitted_at, sla_hours, last_reminder_at, escalation_level.
- `AuditEntry`: timestamp, approval_id, actor, action, message, meta.

Frontend component design
- Dashboard: AntD Table showing vendor, amount, status (color-coded), SLA, pending hours, escalation level, actions (Approve).
- Agent Activity: AntD Timeline showing audit entries in reverse chronological order.
- Controls: Buttons to create dummy approvals and manually run the agent.
