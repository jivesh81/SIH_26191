"""
Mock SMS/Telecom Notification Service for Aapda Setu.

Simulates SMS dispatch after human approval of relocation plans.
Logs all messages to in-memory list + optional JSON file.
No actual telecom integration - for demo/prototype only.
"""

import json
import uuid
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any

from app.schemas.domain import OptimizationStatus


LOG_PATH = Path(__file__).parent.parent / "ml" / "sms_log.json"


@dataclass
class SMSLogEntry:
    """Single SMS dispatch log entry."""
    id: str
    plan_id: str
    plan_version: int
    message_type: str  # "plan_approved", "evacuation_order", "route_change"
    recipient_count: int
    message_template: str
    message_content: str
    status: str  # "queued", "sent", "delivered", "failed"
    created_at: str
    sent_at: Optional[str] = None
    delivered_at: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class MockSMSService:
    """Mock SMS service for demo purposes."""

    def __init__(self):
        self._log: List[SMSLogEntry] = []
        self._load_log()

    def _load_log(self):
        """Load existing log from JSON file."""
        if LOG_PATH.exists():
            try:
                with open(LOG_PATH, "r") as f:
                    data = json.load(f)
                    self._log = [SMSLogEntry(**entry) for entry in data]
            except Exception:
                self._log = []

    def _save_log(self):
        """Persist log to JSON file."""
        try:
            LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
            with open(LOG_PATH, "w") as f:
                json.dump([asdict(entry) for entry in self._log], f, indent=2)
        except Exception:
            pass  # Non-critical for demo

    def _generate_plan_approved_message(self, plan_version: int, assigned_pop: int, site_names: List[str]) -> str:
        """Generate SMS content for plan approval notification."""
        sites_str = ", ".join(site_names[:3])
        if len(site_names) > 3:
            sites_str += f" and {len(site_names) - 3} more"
        return (
            f"AAPDA SETU ALERT: Relocation Plan v{plan_version} APPROVED. "
            f"{assigned_pop:,} people assigned to {sites_str}. "
            f"Evacuation teams activated. Follow official instructions."
        )

    def _generate_evacuation_message(self, habitation_name: str, site_name: str, route_name: str) -> str:
        """Generate SMS content for specific habitation evacuation order."""
        return (
            f"EVACUATION ORDER: {habitation_name} -> {site_name} via {route_name}. "
            f"Move immediately. Aapda Setu."
        )

    def send_plan_approval_notification(
        self,
        plan_id: str,
        plan_version: int,
        assignments: List[Dict],
        site_names: List[str],
        total_population: int,
    ) -> SMSLogEntry:
        """
        Send SMS notification after human approval of relocation plan.

        This is the ONLY authorized SMS dispatch path per SIH requirements.
        """
        entry = SMSLogEntry(
            id=str(uuid.uuid4())[:8],
            plan_id=plan_id,
            plan_version=plan_version,
            message_type="plan_approved",
            recipient_count=len(assignments),  # One per habitation contact
            message_template="plan_approved_v1",
            message_content=self._generate_plan_approved_message(
                plan_version, total_population, site_names
            ),
            status="sent",  # Mock: instantly "sent"
            created_at=datetime.utcnow().isoformat() + "Z",
            sent_at=datetime.utcnow().isoformat() + "Z",
            delivered_at=datetime.utcnow().isoformat() + "Z",
            metadata={
                "habitation_ids": [a.get("habitation_id") for a in assignments],
                "site_ids": list(set(a.get("assigned_site_id") for a in assignments)),
                "data_source": "synthetic_demo",
                "note": "Mock SMS - no actual telecom integration",
            },
        )

        self._log.append(entry)
        self._save_log()
        return entry

    def send_evacuation_orders(
        self,
        plan_id: str,
        plan_version: int,
        assignments: List[Dict],
    ) -> List[SMSLogEntry]:
        """Send per-habitation evacuation order SMS (mock)."""
        entries = []
        for a in assignments:
            entry = SMSLogEntry(
                id=str(uuid.uuid4())[:8],
                plan_id=plan_id,
                plan_version=plan_version,
                message_type="evacuation_order",
                recipient_count=1,
                message_template="evacuation_order_v1",
                message_content=self._generate_evacuation_message(
                    a.get("habitation_name", "Unknown"),
                    a.get("assigned_site_name", "Unknown"),
                    a.get("route_id", "designated route"),
                ),
                status="sent",
                created_at=datetime.utcnow().isoformat() + "Z",
                sent_at=datetime.utcnow().isoformat() + "Z",
                delivered_at=datetime.utcnow().isoformat() + "Z",
                metadata={
                    "habitation_id": a.get("habitation_id"),
                    "site_id": a.get("assigned_site_id"),
                    "data_source": "synthetic_demo",
                },
            )
            self._log.append(entry)
            entries.append(entry)

        self._save_log()
        return entries

    def get_log(self, plan_id: Optional[str] = None, limit: int = 100) -> List[SMSLogEntry]:
        """Get SMS log, optionally filtered by plan."""
        log = self._log
        if plan_id:
            log = [e for e in log if e.plan_id == plan_id]
        return log[-limit:]

    def get_log_for_plan(self, plan_id: str) -> List[SMSLogEntry]:
        """Get all SMS entries for a specific plan."""
        return [e for e in self._log if e.plan_id == plan_id]

    def clear_log(self):
        """Clear the log (for testing)."""
        self._log = []
        self._save_log()


# Global instance
_sms_service: Optional[MockSMSService] = None


def get_sms_service() -> MockSMSService:
    """Get or create the global SMS service instance."""
    global _sms_service
    if _sms_service is None:
        _sms_service = MockSMSService()
    return _sms_service