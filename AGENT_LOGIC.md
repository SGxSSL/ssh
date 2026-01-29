# Agent Decision Logic

### Core Evaluation Cycle
For every **PENDING** or **ESCALATED** request:
1. **Analyze Pending Time**: Calculate `now() - submitted_at`.
2. **SLA Comparison**:
   - `Pending < 50% SLA`: **Silent Monitoring**. No notification.
   - `50% SLA <= Pending <= 100% SLA`: **Proactive Reminder**. Agent generates a professional reminder and notifies the Reviewer.
   - `Pending > 100% SLA`: **Active Escalation**. Agent increments `escalation_level`, updates status to `ESCALATED`, and notifies the next authority.

### Intelligence Layer (Azure OpenAI)
The agent uses a system prompt to act as a **Professional Assistant**.
- **Prompting**: "Rewrite this raw technical alert into a polite but firm professional notification."
- **Benefits**: Improved response rates from human approvers due to the natural language quality.

### Escalation Routing Path
| Level | Name | Recipient Role | Channel |
| :--- | :--- | :--- | :--- |
| **0** | No Escalation | Reviewer | Teams / Outlook |
| **1** | Management Review | Chair | Teams / Outlook |
| **2** | Executive Review | Finance Head | Teams / Outlook |

### Auditability
Every decision follows the "Human in the Loop" principle. 
- The agent only **recommends** and **notifies**.
- Final approval authority remains strictly with the human roles.
- The **Activity Timeline** ensures every notification is timestamped and reviewable.
