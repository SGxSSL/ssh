from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class Approver(BaseModel):
    name: str
    role: str
    level: int


class ApprovalRequest(BaseModel):
    id: str
    vendor_name: str
    amount: float
    approvers: List[Approver]
    status: str = Field("PENDING")  # PENDING | APPROVED | ESCALATED
    submitted_at: datetime
    sla_hours: int
    last_reminder_at: Optional[datetime] = None
    escalation_level: int = 0  # 0 = none, 1 = chair, 2 = finance head


class AuditEntry(BaseModel):
    timestamp: datetime
    approval_id: str
    actor: str
    action: str
    message: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None
