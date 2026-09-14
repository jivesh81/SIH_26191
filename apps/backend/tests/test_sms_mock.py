"""
Tests for mock SMS service.
"""

import pytest
from pathlib import Path

from app.services.sms import MockSMSService, get_sms_service, SMSLogEntry
from app.services.events import event_service, EventService, PlanStatus
from app.services.optimization import run_relocation_optimization
from app.schemas.domain import EventType, DisasterEvent


class TestMockSMSService:
    """Tests for mock SMS service."""

    def setup_method(self):
        """Clear log before each test."""
        sms = get_sms_service()
        sms.clear_log()

    def test_send_plan_approval_notification(self):
        """Test sending plan approval SMS."""
        sms = get_sms_service()

        assignments = [
            {"habitation_id": "hab_001", "habitation_name": "Bhella Gaon", "assigned_site_id": "site_001", "assigned_site_name": "Barpeta Higher Ground - North", "route_id": "route_mandia_1"},
            {"habitation_id": "hab_002", "habitation_name": "Kalgachia", "assigned_site_id": "site_002", "assigned_site_name": "Howly Elevated Plains", "route_id": "route_chenga_1"},
        ]
        site_names = ["Barpeta Higher Ground - North", "Howly Elevated Plains"]

        entry = sms.send_plan_approval_notification(
            plan_id="test_plan_001",
            plan_version=1,
            assignments=assignments,
            site_names=site_names,
            total_population=3050,
        )

        assert entry.plan_id == "test_plan_001"
        assert entry.plan_version == 1
        assert entry.message_type == "plan_approved"
        assert entry.recipient_count == 2
        assert entry.status == "sent"
        assert "APPROVED" in entry.message_content
        assert "3,050" in entry.message_content

    def test_send_evacuation_orders(self):
        """Test sending per-habitation evacuation orders."""
        sms = get_sms_service()

        assignments = [
            {"habitation_id": "hab_001", "habitation_name": "Bhella Gaon", "assigned_site_id": "site_001", "assigned_site_name": "Barpeta Higher Ground - North", "route_id": "route_mandia_1"},
            {"habitation_id": "hab_002", "habitation_name": "Kalgachia", "assigned_site_id": "site_002", "assigned_site_name": "Howly Elevated Plains", "route_id": "route_chenga_1"},
        ]

        entries = sms.send_evacuation_orders(
            plan_id="test_plan_001",
            plan_version=1,
            assignments=assignments,
        )

        assert len(entries) == 2
        for entry in entries:
            assert entry.message_type == "evacuation_order"
            assert entry.recipient_count == 1
            assert "EVACUATION ORDER" in entry.message_content
            assert entry.status == "sent"

    def test_get_log(self):
        """Test retrieving SMS log."""
        sms = get_sms_service()

        # Send some messages
        sms.send_plan_approval_notification("plan_1", 1, [], [], 1000)
        sms.send_plan_approval_notification("plan_2", 1, [], [], 2000)

        log = sms.get_log()
        assert len(log) == 2

        # Filter by plan
        log_plan1 = sms.get_log(plan_id="plan_1")
        assert len(log_plan1) == 1
        assert log_plan1[0].plan_id == "plan_1"

    def test_log_persistence(self):
        """Test that log persists to file."""
        sms = get_sms_service()
        sms.send_plan_approval_notification("persist_test", 1, [], [], 500)

        # Create new service instance - should load from file
        sms2 = MockSMSService()
        log = sms2.get_log(plan_id="persist_test")
        assert len(log) == 1

    def test_clear_log(self):
        """Test clearing the log."""
        sms = get_sms_service()
        sms.send_plan_approval_notification("clear_test", 1, [], [], 100)
        sms.clear_log()

        log = sms.get_log()
        assert len(log) == 0


class TestEventServicePlanApproval:
    """Tests for plan approval with SMS dispatch."""

    def setup_method(self):
        """Clear SMS log and reset event service."""
        sms = get_sms_service()
        sms.clear_log()
        # Reset event service
        event_service._plan_versions = []
        event_service._active_plan = None
        event_service._event_log = []
        event_service.create_initial_plan()

    def test_plan_approved_triggers_sms(self):
        """Test that plan approval triggers SMS dispatch."""
        active = event_service.get_active_plan()
        assert active is not None

        result = event_service.plan_approved(active.plan_id)

        assert result["success"] is True
        assert result["plan_id"] == active.plan_id
        assert result["plan_version"] == active.version
        assert "sms_notification" in result
        assert result["sms_notification"]["status"] == "sent"
        assert result["evacuation_orders_sent"] == len(active.optimization_result.assignments)

    def test_plan_approved_invalid_plan(self):
        """Test that approving non-existent plan fails."""
        result = event_service.plan_approved("nonexistent_plan")
        assert result["success"] is False
        assert "not found" in result["error"]

    def test_plan_approved_non_active_plan(self):
        """Test that approving non-active plan fails."""
        active = event_service.get_active_plan()
        # Manually set to invalid
        active.status = PlanStatus.INVALID

        result = event_service.plan_approved(active.plan_id)
        assert result["success"] is False
        assert "not active" in result["error"]

    def test_plan_approval_logged_in_sms_service(self):
        """Test that approval creates SMS log entries."""
        sms = get_sms_service()
        sms.clear_log()

        active = event_service.get_active_plan()
        event_service.plan_approved(active.plan_id)

        log = sms.get_log(plan_id=active.plan_id)
        assert len(log) >= 1  # At least plan_approved message

        # Check plan_approved message
        plan_msgs = [e for e in log if e.message_type == "plan_approved"]
        assert len(plan_msgs) == 1

        # Check evacuation orders
        evac_msgs = [e for e in log if e.message_type == "evacuation_order"]
        assert len(evac_msgs) == len(active.optimization_result.assignments)

    def test_no_sms_on_event_trigger(self):
        """Test that SMS is NOT dispatched on event trigger (only on approval)."""
        sms = get_sms_service()
        sms.clear_log()

        # Trigger a bridge collapse event
        event = DisasterEvent(
            event_type=EventType.BRIDGE_COLLAPSE,
            intensity=1.0,
            affected_area={"min_lng": 90.9, "min_lat": 26.3, "max_lng": 91.0, "max_lat": 26.4},
            duration_hours=720,
            metadata={"bridge_id": "bridge_chaulkhowa"},
        )

        event_service.trigger_event(event)

        # SMS log should be empty (no SMS on event, only on approval)
        log = sms.get_log()
        assert len(log) == 0