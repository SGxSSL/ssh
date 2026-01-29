# AI-Powered Approval Orchestration Agent

### Problem Statement
Procurement and internal approvals often stall because reviewers are overloaded or lack visible SLAs. This prototype demonstrates an **Agentic Assistant** that proactively tracks approval lifecycles, issues professional AI-generated reminders, and automatically escalates breaches to higher management.

### The Solution: Gravity-Powered Approvals
Our agent acts as a "Digital Secretary" for the Purchasing Committee:
- **Autonomous Monitoring**: Continuously scans SLA thresholds.
- **AI-Refined Communication**: Uses **Azure OpenAI (GPT-5.2)** to transform raw alerts into professional business messages.
- **Multichannel Reach**: Proactively notifies reviewers via **Microsoft Teams** (and optionally Outlook).
- **Escalation Management**: Automatically routes stagnant requests to Chairs and Finance heads.

### Architecture
```
Backend (FastAPI) <--> Frontend (React + AntD Premium)
      |                              ^
      |                              |
      +-- LangGraph Agent (Logic) ---+ 
      |                              |
  SQLite (DB)                  Teams Webhooks / Azure OpenAI
```

### Tech Stack
- **Frontend**: React, Ant Design (Glassmorphism UI), Axios
- **Backend**: Python, FastAPI, SQLite
- **Intelligence**: Azure OpenAI (GPT-5.2 Deployment)
- **Integrations**: Microsoft Teams (Incoming Webhooks), Outlook (SMTP)
- **State Management**: LangGraph-inspired deterministic execution

### Setup & Installation

#### 1. Backend Setup
```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/Scripts/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt
```

#### 2. Configure Environment
Create a `.env` file in the root directory:
```bash
# Azure OpenAI (Required for AI reminders)
AZURE_OPENAI_API_KEY=your_key
AZURE_OPENAI_ENDPOINT=your_endpoint
AZURE_OPENAI_DEPLOYMENT=gpt-5.2
AZURE_OPENAI_API_VERSION=2024-12-01-preview

# Microsoft Teams
TEAMS_WEBHOOK_URL=your_webhook_url
```

#### 3. Run the Application
```bash
# Start Backend
uvicorn backend.main:app --reload --port 8000

# Start Frontend (in /frontend directory)
npm install
npm start
```

### Role-Based Access (Demo Credentials)
| Role | Username | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Requester** | `requester1` | `pass123` | Submit requests, View personal dashboard |
| **Reviewer** | `reviewer` | `pass123` | Approve items, Invoke Agent, Global view |
| **Finance Head** | `finance` | `pass123` | High-level approvals, Full visibility |

### Key Features
- **Isolated Dashboards**: Requesters only see their own items.
- **SLA Progress Intelligence**: Visual bars transition from Green -> Yellow -> Red in real-time.
- **Agent Audit Trail**: Complete transparency into every AI decision and notification sent.

### Testing SLA Reactivity (Time Travel)
To test the agent's reminders and escalations without waiting days, use this command to backdate all pending requests into a "breached" or "warning" state:

```bash
.venv/Scripts/python backdate_pending.py
```