"""
LangGraph-based agent for SLA checks, reminders, and escalations.
"""
from datetime import datetime
import os
import requests
from typing import Dict, Any
from .notifications import NotificationManager
from . import data

try:
    import langgraph as lg
    LANGGRAPH_AVAILABLE = True
except Exception:
    LANGGRAPH_AVAILABLE = False

try:
    from openai import AzureOpenAI
    AZURE_AVAILABLE = True
except ImportError:
    AZURE_AVAILABLE = False

def generate_llm_text(prompt: str) -> str:
    """Generate text using Azure OpenAI if configured, otherwise return the template prompt."""
    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT")
    version = os.getenv("AZURE_OPENAI_API_VERSION")

    if not all([api_key, endpoint, deployment, version]) or not AZURE_AVAILABLE:
        # Falls back to standard prompt template if Azure is not configured
        return prompt

    try:
        client = AzureOpenAI(
            api_key=api_key,
            api_version=version,
            azure_endpoint=endpoint
        )

        response = client.chat.completions.create(
            model=deployment,
            messages=[
                {"role": "system", "content": "You are a professional administrative assistant for a purchasing committee. Your job is to rewrite raw technical status alerts into polite but firm professional notifications."},
                {"role": "user", "content": f"Please rewrite this notification into a professional message: {prompt}"}
            ],
            max_completion_tokens=500,
            temperature=0.7
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"⚠️ Azure OpenAI Error: {e}")
        return prompt

def _build_prompt_for_reminder(approval: Dict[str, Any]) -> str:
    return (
        f"Reminder: Approval {approval['id']} for vendor {approval['vendor_name']} "
        f"(${approval['amount']}) is approaching SLA (submitted {approval['submitted_at']}). "
        "Please review and approve if ready."
    )

def _build_prompt_for_escalation(approval: Dict[str, Any]) -> str:
    return (
        f"Escalation: Approval {approval['id']} for {approval['vendor_name']} "
        f"(${approval['amount']}) has breached SLA (submitted {approval['submitted_at']}). "
        "Please escalate to the next authority with necessary context."
    )

def _get_recipient_for_escalation(level: int) -> str:
    """Helper to find the email for a specific escalation level."""
    role_map = {0: "reviewer", 1: "chair", 2: "finance"}
    user = data.get_user(role_map.get(level, "reviewer"))
    return user["email"] if user else "admin@example.com"

class SimpleLangGraph:
    def __init__(self):
        pass

    def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        pending = state["pending_hours"]
        sla = state["sla_hours"]
        result = {"action": "no_action", "message": None}
        if pending < 0.5 * sla:
            return result
        
        if 0.5 * sla <= pending <= sla:
            prompt = _build_prompt_for_reminder(state["approval_raw"])
            text = generate_llm_text(prompt)
            
            # NOTIFY
            NotificationManager.notify_all(
                title=f"📅 SLA Reminder: {state['approval_raw']['vendor_name']}",
                message=text,
                recipient_email=_get_recipient_for_escalation(0)
            )

            result["action"] = "send_reminder"
            result["message"] = text
            return result
            
        if pending > sla:
            prompt = _build_prompt_for_escalation(state["approval_raw"])
            text = generate_llm_text(prompt)
            
            # NOTIFY
            current_level = state.get("escalation_level", 0)
            next_level = min(2, current_level + 1)
            NotificationManager.notify_all(
                title=f"🚨 SLA BREACH: {state['approval_raw']['vendor_name']}",
                message=text,
                recipient_email=_get_recipient_for_escalation(next_level)
            )

            result["action"] = "escalate"
            result["message"] = text
            return result
            
        return result

def run_once(approval: Dict[str, Any], now: datetime) -> Dict[str, Any]:
    submitted = datetime.fromisoformat(approval["submitted_at"])
    pending = (now - submitted).total_seconds() / 3600.0
    state = {
        "approval_id": approval["id"],
        "pending_hours": pending,
        "sla_hours": approval["sla_hours"],
        "escalation_level": approval.get("escalation_level", 0),
        "approval_raw": approval,
    }

    if LANGGRAPH_AVAILABLE:
        try:
            sm = SimpleLangGraph()
            return sm.run(state)
        except Exception:
            sm = SimpleLangGraph()
            return sm.run(state)
    else:
        sm = SimpleLangGraph()
        return sm.run(state)
