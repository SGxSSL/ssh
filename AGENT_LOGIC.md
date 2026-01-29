# Agent Logic

Agent decision rules
- If pending time < 50% SLA → no action.
- If pending time ≥ 50% SLA and ≤ SLA → generate reminder.
- If pending time > SLA → escalate.

Reminder thresholds
- Trigger reminder when pending >= 50% of SLA hours.
- The agent records `last_reminder_at` when a reminder is sent.

Escalation levels
- Level 0: no escalation.
- Level 1: Chair notified.
- Level 2: Finance head notified.

Example scenarios
- On-time approval:
  - Submitted 2 hours ago with SLA 24 hours → no action.
- Reminder triggered:
  - Submitted 12 hours ago with SLA 24 hours → agent generates reminder text and logs an audit entry.
- SLA breach escalation:
  - Submitted 25 hours ago with SLA 24 hours → agent escalates, sets status to `ESCALATED`, increments `escalation_level`, and logs an audit entry.

Pseudocode of agent loop

```
for approval in approvals:
    if approval.status != 'PENDING':
        continue
    pending = now - approval.submitted_at (hours)
    if pending < 0.5 * approval.sla_hours:
        continue
    if 0.5 * approval.sla_hours <= pending <= approval.sla_hours:
        message = LLM.generate(reminder_prompt)
        approval.last_reminder_at = now
        audit.log(approval.id, 'reminder', message)
    if pending > approval.sla_hours:
        message = LLM.generate(escalation_prompt)
        approval.escalation_level = min(2, approval.escalation_level + 1)
        approval.status = 'ESCALATED'
        audit.log(approval.id, 'escalation', message)

```
