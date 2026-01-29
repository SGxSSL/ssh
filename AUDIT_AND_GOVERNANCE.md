# Audit and Governance

What events are logged
- Creation of approvals (actor: system)
- Manual approvals (actor: user)
- Agent reminders (actor: agent)
- Agent escalations (actor: agent)

Why audit trail matters for procurement
- Traceability: shows who did what and when.
- Accountability: escalations and reminders are recorded so managers can review follow-up actions.
- Compliance: procurement processes often require evidence of attempted follow-ups and approvals.

Example audit entries
- { timestamp, approval_id, actor: 'system', action: 'created', message }
- { timestamp, approval_id, actor: 'agent', action: 'reminder', message }
- { timestamp, approval_id, actor: 'agent', action: 'escalation', message, meta: { escalation_level }}

Compliance & governance benefits
- Provides a lightweight record to justify decisions made during procurement.
- Makes the agent's actions explainable for audits and post-mortems.
