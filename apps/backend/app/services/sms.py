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

from app.core.config import settings
from app.services.sms_providers import create_sms_provider
from app.schemas.domain import OptimizationStatus


LOG_PATH = Path(__file__).parent.parent / "ml" / "sms_log.json"


def _get_demo_recipients() -> List[str]:
    """Get demo recipients from settings (dynamic for testing)."""
    from app.core.config import settings
    recipients_str = settings.SMS_DEMO_RECIPIENTS
    if not recipients_str:
        return []
    recipients = []
    for r in recipients_str.split(","):
        r = r.strip()
        if r and not r.startswith("+"):
            r = "+91" + r
        recipients.append(r)
    return recipients


def _get_recipient_mode() -> str:
    """Determine recipient counting mode based on demo recipients count."""
    recipients = _get_demo_recipients()
    # If only 1 demo recipient configured, use legacy per-assignment mode
    # If multiple demo recipients configured, use new per-recipient mode
    return "assignment" if len(recipients) <= 1 else "demo"


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


class SMSService:
    """SMS service that uses the configured provider and demo recipients."""

    def __init__(self):
        self._log: List[SMSLogEntry] = []
        self._load_log()

    def _get_provider(self):
        """Get the current SMS provider (dynamic for testing)."""
        return create_sms_provider()

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
            f"AAPDA SETU DEMO ALERT: Relocation Plan v{plan_version} APPROVED. "
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
        Sends ONE SMS per assignment (not per demo recipient).
        """
        recipients = _get_demo_recipients()
        provider = self._get_provider()

        # Send one SMS per assignment
        provider_message_ids = []
        for assignment in assignments:
            # Generate message specific to this assignment
            habitation_name = assignment.get("habitation_name", "Unknown")
            assigned_site_name = assignment.get("assigned_site_name", "Unknown")
            message_content = (
                f"AAPDA SETU DEMO ALERT: Relocation Plan v{plan_version} APPROVED. "
                f"{habitation_name} -> {assigned_site_name}. "
                f"Evacuation teams activated. Follow official instructions."
            )

            # Send to first demo recipient (or configured primary contact)
            if recipients:
                to_number = recipients[0]
            else:
                to_number = settings.SMS_TWILIO_FROM_NUMBER or "+919999999999"

            result = provider.send_sms(
                to_number=to_number,
                from_number=settings.SMS_TWILIO_FROM_NUMBER or "+919999999999",
                body=message_content,
            )
            if result.message_id:
                provider_message_ids.append(result.message_id)

        entry = SMSLogEntry(
            id=str(uuid.uuid4())[:8],
            plan_id=plan_id,
            plan_version=plan_version,
            message_type="plan_approved",
            recipient_count=len(assignments),
            message_template="plan_approved_v1",
            message_content=self._generate_plan_approved_message(
                plan_version, total_population, site_names
            ),
            status="sent",
            created_at=datetime.utcnow().isoformat() + "Z",
            sent_at=datetime.utcnow().isoformat() + "Z",
            delivered_at=datetime.utcnow().isoformat() + "Z",
            metadata={
                "habitation_ids": [a.get("habitation_id") for a in assignments],
                "site_ids": list(set(a.get("assigned_site_id") for a in assignments)),
                "data_source": "synthetic_demo",
                "note": "Mock SMS - no actual telecom integration",
                "provider": provider.get_provider_name(),
                "provider_message_ids": provider_message_ids,
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
        """Send per-habitation evacuation order SMS (one SMS per assignment)."""
        recipients = _get_demo_recipients()
        provider = self._get_provider()

        # Send one SMS per assignment
        entries = []
        for a in assignments:
            message_content = self._generate_evacuation_message(
                a.get("habitation_name", "Unknown"),
                a.get("assigned_site_name", "Unknown"),
                a.get("route_id", "designated route"),
            )

            # Send to first demo recipient (or configured primary contact)
            if recipients:
                to_number = recipients[0]
            else:
                to_number = settings.SMS_TWILIO_FROM_NUMBER or "+919999999999"

            result = provider.send_sms(
                to_number=to_number,
                from_number=settings.SMS_TWILIO_FROM_NUMBER or "+919999999999",
                body=message_content,
            )
            provider_message_ids = [result.message_id] if result.message_id else []

            entry = SMSLogEntry(
                id=str(uuid.uuid4())[:8],
                plan_id=plan_id,
                plan_version=plan_version,
                message_type="evacuation_order",
                recipient_count=1,
                message_template="evacuation_order_v1",
                message_content=message_content,
                status="sent",
                created_at=datetime.utcnow().isoformat() + "Z",
                sent_at=datetime.utcnow().isoformat() + "Z",
                delivered_at=datetime.utcnow().isoformat() + "Z",
                metadata={
                    "habitation_id": a.get("habitation_id"),
                    "site_id": a.get("assigned_site_id"),
                    "data_source": "synthetic_demo",
                    "provider": provider.get_provider_name(),
                    "provider_message_ids": provider_message_ids,
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


# Backward compatibility
MockSMSService = SMSService


# Global instance
_sms_service: Optional[SMSService] = None


def get_sms_service() -> SMSService:
    """Get or create the global SMS service instance."""
    global _sms_service
    if _sms_service is None:
        _sms_service = SMSService()
    return _sms_service