# System Design: AI Approval Agent

### Overview
The AI Approval Agent is a proactive middleware layer designed to sit between requesters and approvers. It utilizes an autonomous logic loop to ensure no approval request remains stagnant.

### Architecture
- **Backend (FastAPI)**: Serves as the source of truth, managing the SQLite state (Approvals & Audit Logs) and orchestrating the Agent logic.
- **Frontend (React)**: A high-fidelity dashboard that provides real-time SLA visualization and identifies "Active" vs "Escalated" items.
- **Agent Intelligence**: The core decision loop that evaluates "Pending vs SLA" thresholds and generates contextually relevant notifications.

### Security and RBAC
The system implements a simple but robust Role-Based Access Control model:
1. **Requester**: Can only `CREATE` and `READ` their own items.
2. **Approver Roles** (Reviewer, Chair, Finance): Can `READ` all items and `APPROVE` requests.
3. **Identity Privacy**: Dashboard filtering ensures Requesters cannot see sensitive vendor data from other departments.

### Notification Ecosystem
The agent is designed for multi-channel reach:
- **Microsoft Teams**: Principal notification channel using Adaptive Cards via Webhooks.
- **Outlook**: Secondary channel (SMTP stub) for legacy compatibility.
- **Routing Logic**: Reminders are sent to specific assigned reviewers; escalations move automatically up the management hierarchy.

### AI Implementation (Azure OpenAI)
We use the **GPT-5.2** deployment on Azure OpenAI to provide an "Administrative Intelligence" layer.
- **Input**: Raw approval data (Vendor, Amount, SLA status).
- **Persona**: Professional Administrative Assistant.
- **Output**: Polite, business-ready reminders that encourage action without sounding robotic.

### Data Model
- **Approvals**: Includes a `requester` tag and `escalation_level`.
- **Users**: Multi-role storage with associated `email` addresses for notification routing.
- **Audit**: Tracks not just human actions, but every `agent` decision, providing an "Explainable AI" log.
