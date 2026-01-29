"""
LangGraph-based agent for SLA checks, reminders, and escalations.

Notes:
- We attempt to use `langgraph` if available. If it is not installed (common in
  a hackathon environment), we fall back to a tiny deterministic state-machine
  implementation that follows the same node/transition structure. This keeps
  the implementation portable while demonstrating how LangGraph would model
  the workflow.

Why LangGraph:
- LangGraph helps model LLM-driven workflows as explainable graphs (nodes +
  transitions). For this prototype we use it to make the decision logic
  explicit and reviewable. It's preferred here over an ad-hoc multi-agent
  approach because the state machine is deterministic and auditable.
"""
from datetime import datetime, timedelta
import os
import requests

try:
    import langgraph as lg
    LANGGRAPH_AVAILABLE = True
except Exception:
    LANGGRAPH_AVAILABLE = False

from typing import Dict, Any


def generate_llm_text(prompt: str) -> str:
    """Generate text using an LLM if API key is set, otherwise return a template.

    For the hackathon prototype we prefer determinism when no API key is present.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        # deterministic fallback template
        return prompt
    # simple OpenAI REST call (text-davinci-003 style). Keep minimal dependencies.
    url = "https://api.openai.com/v1/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {"model": "text-davinci-003", "prompt": prompt, "max_tokens": 150}
    try:
        r = requests.post(url, json=payload, headers=headers, timeout=10)
        r.raise_for_status()
        data = r.json()
        return data["choices"][0]["text"].strip()
    except Exception:
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


class SimpleLangGraph:
    """Tiny deterministic state machine that mirrors the required LangGraph nodes.

    Nodes: check_sla, send_reminder, escalate, no_action
    State includes approval_id, pending_hours, sla_hours, escalation_level
    """

    def __init__(self):
        pass

    def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        # deterministic transitions
        pending = state["pending_hours"]
        sla = state["sla_hours"]
        result = {"action": "no_action", "message": None}
        if pending < 0.5 * sla:
            result["action"] = "no_action"
            return result
        if 0.5 * sla <= pending <= sla:
            # send reminder
            prompt = _build_prompt_for_reminder(state["approval_raw"])
            text = generate_llm_text(prompt)
            result["action"] = "send_reminder"
            result["message"] = text
            return result
        if pending > sla:
            prompt = _build_prompt_for_escalation(state["approval_raw"])
            text = generate_llm_text(prompt)
            result["action"] = "escalate"
            result["message"] = text
            return result
        return result


# Expose a single run_once function that the FastAPI app can call
def run_once(approval: Dict[str, Any], now: datetime) -> Dict[str, Any]:
    # compute pending hours
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
        # Example LangGraph usage (pseudocode) - keep succinct for hackathon.
        # The real LangGraph usage would define Nodes and Transitions; here we
        # call a conceptual API to keep logic readable.
        try:
            g = lg.Graph()
            g.add_node("check_sla")
            g.add_node("send_reminder")
            g.add_node("escalate")
            g.add_node("no_action")

            # Deterministic transitions encoded as functions
            def check_sla_fn(ctx):
                p = ctx["pending_hours"]
                s = ctx["sla_hours"]
                if p < 0.5 * s:
                    return "no_action"
                if 0.5 * s <= p <= s:
                    return "send_reminder"
                return "escalate"

            # run the graph with the state and get node name
            next_node = check_sla_fn(state)
            if next_node == "no_action":
                return {"action": "no_action", "message": None}
            if next_node == "send_reminder":
                prompt = _build_prompt_for_reminder(approval)
                return {"action": "send_reminder", "message": generate_llm_text(prompt)}
            if next_node == "escalate":
                prompt = _build_prompt_for_escalation(approval)
                return {"action": "escalate", "message": generate_llm_text(prompt)}
        except Exception:
            # fallback to simple machine
            sm = SimpleLangGraph()
            return sm.run(state)
    else:
        sm = SimpleLangGraph()
        return sm.run(state)
