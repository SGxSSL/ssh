import sqlite3
from datetime import datetime
from typing import List, Dict, Any, Optional
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "approvals.db")


def _conn():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = _conn()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS approvals (
            id TEXT PRIMARY KEY,
            vendor_name TEXT,
            amount REAL,
            approvers TEXT,
            status TEXT,
            submitted_at TEXT,
            sla_hours INTEGER,
            last_reminder_at TEXT,
            escalation_level INTEGER,
            requester TEXT
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS audit (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            approval_id TEXT,
            actor TEXT,
            action TEXT,
            message TEXT,
            meta TEXT
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password TEXT,
            role TEXT
        )
        """
    )
    # Migration: Ensure requester column exists
    cur.execute("PRAGMA table_info(approvals)")
    columns = [row[1] for row in cur.fetchall()]
    if "requester" not in columns:
        cur.execute("ALTER TABLE approvals ADD COLUMN requester TEXT")

    # Seed default users if not exists
    cur.execute("INSERT OR IGNORE INTO users VALUES ('requester1', 'pass123', 'REQUESTER')")
    cur.execute("INSERT OR IGNORE INTO users VALUES ('requester2', 'pass123', 'REQUESTER')")
    cur.execute("INSERT OR IGNORE INTO users VALUES ('reviewer', 'pass123', 'APPROVER')")
    cur.execute("INSERT OR IGNORE INTO users VALUES ('chair', 'pass123', 'CHAIR')")
    cur.execute("INSERT OR IGNORE INTO users VALUES ('finance', 'pass123', 'FINANCE')")
    
    conn.commit()
    conn.close()


def get_user(username: str) -> Optional[Dict[str, Any]]:
    conn = _conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE username = ?", (username,))
    r = cur.fetchone()
    conn.close()
    if not r:
        return None
    return dict(r)


def save_approval(obj: Dict[str, Any]):
    conn = _conn()
    cur = conn.cursor()
    cur.execute(
        "REPLACE INTO approvals(id, vendor_name, amount, approvers, status, submitted_at, sla_hours, last_reminder_at, escalation_level, requester) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            obj["id"],
            obj["vendor_name"],
            obj["amount"],
            json.dumps(obj["approvers"]),
            obj["status"],
            obj["submitted_at"],
            obj["sla_hours"],
            obj.get("last_reminder_at"),
            obj.get("escalation_level", 0),
            obj.get("requester"),
        ),
    )
    conn.commit()
    conn.close()


def list_approvals(requester_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = _conn()
    cur = conn.cursor()
    if requester_filter:
        cur.execute("SELECT * FROM approvals WHERE requester = ? ORDER BY submitted_at DESC", (requester_filter,))
    else:
        cur.execute("SELECT * FROM approvals ORDER BY submitted_at DESC")
    rows = cur.fetchall()
    conn.close()
    out = []
    for r in rows:
        out.append(
            {
                "id": r["id"],
                "vendor_name": r["vendor_name"],
                "amount": r["amount"],
                "approvers": json.loads(r["approvers"]),
                "status": r["status"],
                "submitted_at": r["submitted_at"],
                "sla_hours": r["sla_hours"],
                "last_reminder_at": r["last_reminder_at"],
                "escalation_level": r["escalation_level"],
                "requester": r["requester"],
            }
        )
    return out


def get_approval(approval_id: str) -> Optional[Dict[str, Any]]:
    conn = _conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM approvals WHERE id = ?", (approval_id,))
    r = cur.fetchone()
    conn.close()
    if not r:
        return None
    return {
        "id": r["id"],
        "vendor_name": r["vendor_name"],
        "amount": r["amount"],
        "approvers": json.loads(r["approvers"]),
        "status": r["status"],
        "submitted_at": r["submitted_at"],
        "sla_hours": r["sla_hours"],
        "last_reminder_at": r["last_reminder_at"],
        "escalation_level": r["escalation_level"],
    }


def log_audit(entry: Dict[str, Any]):
    conn = _conn()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO audit(timestamp, approval_id, actor, action, message, meta) VALUES (?, ?, ?, ?, ?, ?)",
        (
            entry["timestamp"],
            entry["approval_id"],
            entry["actor"],
            entry["action"],
            entry.get("message"),
            json.dumps(entry.get("meta")) if entry.get("meta") else None,
        ),
    )
    conn.commit()
    conn.close()


def list_audit() -> List[Dict[str, Any]]:
    conn = _conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM audit ORDER BY timestamp DESC LIMIT 200")
    rows = cur.fetchall()
    conn.close()
    out = []
    for r in rows:
        out.append(
            {
                "timestamp": r["timestamp"],
                "approval_id": r["approval_id"],
                "actor": r["actor"],
                "action": r["action"],
                "message": r["message"],
                "meta": json.loads(r["meta"]) if r["meta"] else None,
            }
        )
    return out
