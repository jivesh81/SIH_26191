"""
Tests for dynamic disaster events and plan invalidation (Step 5).
"""

import pytest
from typing import List

from app.services.events import event_service, EventService, PlanVersion, PlanStatus
from app.services.optimization import run_relocation_optimization
from app.schemas.domain import (
    DisasterEvent,
    EventType,
    PlanStatus as SchemaPlanStatus,
    OptimizationStatus,
)
from app.services.data_layer import get_routes


class TestEventService:
    """Tests for the event service and plan versioning."""
    
    def setup_method(self):
        """Reset event service for each test."""
        # Create a fresh event service for isolation
        self.service = EventService()
    
    def test_create_initial_plan(self):
        """Test creating an initial relocation plan."""
        plan = self.service.create_initial_plan()
        
        assert plan.version == 1
        assert plan.status == PlanStatus.ACTIVE
        assert plan.plan_id is not None
        assert plan.optimization_result is not None
        assert plan.created_at is not None
        
        active = self.service.get_active_plan()
        assert active is plan
    
    def test_get_all_plans(self):
        """Test retrieving all plan versions."""
        self.service.create_initial_plan()
        plans = self.service.get_all_plans()
        
        assert len(plans) == 1
        assert plans[0].version == 1


class TestBridgeCollapseEvent:
    """Tests for bridge collapse event handling."""
    
    def setup_method(self):
        self.service = EventService()
        self.service.create_initial_plan()
    
    def test_bridge_collapse_identifies_affected_routes(self):
        """Test that bridge collapse identifies routes using that bridge."""
        event = DisasterEvent(
            event_type=EventType.BRIDGE_COLLAPSE,
            intensity=1.0,
            affected_area={"min_lng": 91.0, "min_lat": 26.4, "max_lng": 91.2, "max_lat": 26.6},
            duration_hours=720,
            metadata={"bridge_id": "bridge_chaulkhowa"},
        )
        
        # Get routes that use bridge_chaulkhowa
        routes = get_routes()
        chaulkhowa_routes = [r for r in routes if "bridge_chaulkhowa" in r.bridge_dependencies]
        
        assert len(chaulkhowa_routes) > 0
        route_ids = [r.id for r in chaulkhowa_routes]
        assert "route_howly_1" in route_ids
        assert "route_bajali_1" in route_ids
    
    def test_bridge_collapse_invalidates_active_plan(self):
        """Test that bridge collapse invalidates plan when routes are affected."""
        event = DisasterEvent(
            event_type=EventType.BRIDGE_COLLAPSE,
            intensity=1.0,
            affected_area={"min_lng": 91.0, "min_lat": 26.4, "max_lng": 91.2, "max_lat": 26.6},
            duration_hours=720,
            metadata={"bridge_id": "bridge_chaulkhowa"},
        )
        
        result = self.service.trigger_event(event)
        
        assert result["plan_invalidated"] is True
        assert result["previous_plan"] is not None
        assert result["new_plan"] is not None
        
        # Check previous plan is marked invalid
        prev = result["previous_plan"]
        assert prev["status"] == "invalid"
        assert prev["invalidation_reason"] is not None
        assert len(prev["affected_assignments"]) > 0
        assert len(prev["affected_routes"]) > 0
        
        # Check new plan created
        new = result["new_plan"]
        assert new["version"] == 2
        assert new["status"] == "active"
        assert new["plan_id"] != prev["plan_id"]
    
    def test_bridge_collapse_records_invalidation_reason(self):
        """Test that invalidation reason is recorded."""
        event = DisasterEvent(
            event_type=EventType.BRIDGE_COLLAPSE,
            intensity=1.0,
            affected_area={"min_lng": 91.0, "min_lat": 26.4, "max_lng": 91.2, "max_lat": 26.6},
            duration_hours=720,
            metadata={"bridge_id": "bridge_chaulkhowa"},
        )
        
        result = self.service.trigger_event(event)
        
        assert result["previous_plan"]["invalidation_reason"] is not None
        assert "bridge_collapse" in result["previous_plan"]["invalidation_reason"].lower()


class TestCapacityReductionEvent:
    """Tests for shelter capacity reduction event handling."""
    
    def setup_method(self):
        self.service = EventService()
        self.service.create_initial_plan()
    
    def test_capacity_reduction_identifies_affected_sites(self):
        """Test that capacity reduction identifies affected sites."""
        event = DisasterEvent(
            event_type=EventType.CAPACITY_REDUCTION,
            intensity=0.5,
            affected_area={"min_lng": 91.0, "min_lat": 26.2, "max_lng": 91.3, "max_lat": 26.5},
            duration_hours=168,
            metadata={
                "shelter_ids": ["shelter_rc_barpeta", "shelter_rc_howly"],
                "reduction_pct": 50,
            },
        )
        
        result = self.service.trigger_event(event)
        
        # Should identify affected sites
        assert result["plan_invalidated"] is True
        assert result["previous_plan"]["affected_sites"] is not None
        assert len(result["previous_plan"]["affected_sites"]) > 0
    
    def test_capacity_reduction_invalidates_plan(self):
        """Test that capacity reduction invalidates the active plan."""
        event = DisasterEvent(
            event_type=EventType.CAPACITY_REDUCTION,
            intensity=0.5,
            affected_area={"min_lng": 91.0, "min_lat": 26.2, "max_lng": 91.3, "max_lat": 26.5},
            duration_hours=168,
            metadata={
                "shelter_ids": ["shelter_rc_barpeta", "shelter_rc_howly"],
                "reduction_pct": 50,
            },
        )
        
        result = self.service.trigger_event(event)
        
        assert result["plan_invalidated"] is True
        assert result["previous_plan"]["status"] == "invalid"
        assert result["new_plan"]["version"] == 2
    
    def test_capacity_reduction_records_affected_assignments(self):
        """Test that affected assignments are tracked."""
        event = DisasterEvent(
            event_type=EventType.CAPACITY_REDUCTION,
            intensity=0.5,
            affected_area={"min_lng": 91.0, "min_lat": 26.2, "max_lng": 91.3, "max_lat": 26.5},
            duration_hours=168,
            metadata={
                "shelter_ids": ["shelter_rc_barpeta", "shelter_rc_howly"],
                "reduction_pct": 50,
            },
        )
        
        result = self.service.trigger_event(event)
        
        assert len(result["previous_plan"]["affected_assignments"]) > 0
        assert len(result["previous_plan"]["affected_sites"]) > 0


class TestReOptimization:
    """Tests for automatic re-optimization after plan invalidation."""
    
    def setup_method(self):
        self.service = EventService()
        self.service.create_initial_plan()
    
    def test_reoptimization_creates_new_plan_version(self):
        """Test that re-optimization creates a new plan version."""
        initial_version = self.service.get_active_plan().version
        
        event = DisasterEvent(
            event_type=EventType.BRIDGE_COLLAPSE,
            intensity=1.0,
            affected_area={"min_lng": 91.0, "min_lat": 26.4, "max_lng": 91.2, "max_lat": 26.6},
            duration_hours=720,
            metadata={"bridge_id": "bridge_chaulkhowa"},
        )
        
        result = self.service.trigger_event(event)
        
        assert result["new_plan"]["version"] == initial_version + 1
        
        # Verify active plan is now the new one
        active = self.service.get_active_plan()
        assert active.version == initial_version + 1
    
    def test_previous_plan_marked_invalid(self):
        """Test that previous plan is properly marked invalid."""
        event = DisasterEvent(
            event_type=EventType.BRIDGE_COLLAPSE,
            intensity=1.0,
            affected_area={"min_lng": 91.0, "min_lat": 26.4, "max_lng": 91.2, "max_lat": 26.6},
            duration_hours=720,
            metadata={"bridge_id": "bridge_chaulkhowa"},
        )
        
        self.service.trigger_event(event)
        
        all_plans = self.service.get_all_plans()
        assert len(all_plans) == 2
        
        # First plan should be invalid
        assert all_plans[0].status == PlanStatus.INVALID
        assert all_plans[0].invalidated_at is not None
        assert all_plans[0].invalidation_reason is not None
        
        # Second plan should be active
        assert all_plans[1].status == PlanStatus.ACTIVE
    
    def test_new_plan_has_valid_optimization_result(self):
        """Test that new plan has a valid optimization result."""
        event = DisasterEvent(
            event_type=EventType.BRIDGE_COLLAPSE,
            intensity=1.0,
            affected_area={"min_lng": 91.0, "min_lat": 26.4, "max_lng": 91.2, "max_lat": 26.6},
            duration_hours=720,
            metadata={"bridge_id": "bridge_chaulkhowa"},
        )
        
        result = self.service.trigger_event(event)
        
        new_plan = result["new_plan"]
        assert new_plan["optimization_status"] in [
            "optimal", "feasible", "infeasible"
        ]
        assert "total_assigned_population" in new_plan
        assert "total_unmet_population" in new_plan
        assert "created_at" in new_plan


class TestEventTriggerAPI:
    """Tests for the event trigger API endpoint."""
    
    def setup_method(self):
        self.service = EventService()
        self.service.create_initial_plan()
    
    def test_trigger_event_returns_correct_structure(self):
        """Test that trigger_event returns all required fields."""
        event = DisasterEvent(
            event_type=EventType.BRIDGE_COLLAPSE,
            intensity=1.0,
            affected_area={"min_lng": 90.9, "min_lat": 26.3, "max_lng": 91.0, "max_lat": 26.4},
            duration_hours=720,
            metadata={"bridge_id": "bridge_beki"},
        )
        
        result = self.service.trigger_event(event)
        
        assert "event" in result
        assert "event_id" in result["event"]
        assert "event_type" in result["event"]
        assert "timestamp" in result["event"]
        assert "plan_invalidated" in result
        assert "previous_plan" in result
        assert "new_plan" in result
    
    def test_multiple_events_create_multiple_versions(self):
        """Test that multiple events create sequential plan versions."""
        # First event
        event1 = DisasterEvent(
            event_type=EventType.BRIDGE_COLLAPSE,
            intensity=1.0,
            affected_area={"min_lng": 91.0, "min_lat": 26.4, "max_lng": 91.2, "max_lat": 26.6},
            duration_hours=720,
            metadata={"bridge_id": "bridge_chaulkhowa"},
        )
        self.service.trigger_event(event1)
        
        # Second event
        event2 = DisasterEvent(
            event_type=EventType.CAPACITY_REDUCTION,
            intensity=0.5,
            affected_area={"min_lng": 91.0, "min_lat": 26.2, "max_lng": 91.3, "max_lat": 26.5},
            duration_hours=168,
            metadata={"shelter_ids": ["shelter_rc_barpeta"], "reduction_pct": 50},
        )
        result2 = self.service.trigger_event(event2)
        
        assert result2["new_plan"]["version"] == 3
        
        all_plans = self.service.get_all_plans()
        assert len(all_plans) == 3
        
        # Check statuses
        assert all_plans[0].status == PlanStatus.INVALID
        assert all_plans[1].status == PlanStatus.INVALID
        assert all_plans[2].status == PlanStatus.ACTIVE


class TestEventLog:
    """Tests for event logging."""
    
    def setup_method(self):
        self.service = EventService()
        self.service.create_initial_plan()
    
    def test_events_are_logged(self):
        """Test that triggered events are logged."""
        event = DisasterEvent(
            event_type=EventType.BRIDGE_COLLAPSE,
            intensity=1.0,
            affected_area={"min_lng": 90.9, "min_lat": 26.3, "max_lng": 91.0, "max_lat": 26.4},
            duration_hours=720,
            metadata={"bridge_id": "bridge_beki"},
        )
        
        self.service.trigger_event(event)
        
        assert len(self.service._event_log) == 1
        log_entry = self.service._event_log[0]
        assert "event_id" in log_entry
        assert log_entry["event_type"] == EventType.BRIDGE_COLLAPSE
        assert "result" in log_entry
    
    def test_multiple_events_logged(self):
        """Test that multiple events are all logged."""
        event1 = DisasterEvent(
            event_type=EventType.BRIDGE_COLLAPSE,
            intensity=1.0,
            affected_area={"min_lng": 90.9, "min_lat": 26.3, "max_lng": 91.0, "max_lat": 26.4},
            duration_hours=720,
            metadata={"bridge_id": "bridge_beki"},
        )
        event2 = DisasterEvent(
            event_type=EventType.CAPACITY_REDUCTION,
            intensity=0.5,
            affected_area={"min_lng": 91.0, "min_lat": 26.2, "max_lng": 91.3, "max_lat": 26.5},
            duration_hours=168,
            metadata={"shelter_ids": ["shelter_rc_barpeta"], "reduction_pct": 50},
        )
        
        self.service.trigger_event(event1)
        self.service.trigger_event(event2)
        
        assert len(self.service._event_log) == 2


class TestPlanVersioning:
    """Tests for plan versioning and history."""
    
    def setup_method(self):
        self.service = EventService()
        self.service.create_initial_plan()
    
    def test_plan_versions_are_tracked(self):
        """Test that all plan versions are tracked."""
        event = DisasterEvent(
            event_type=EventType.BRIDGE_COLLAPSE,
            intensity=1.0,
            affected_area={"min_lng": 91.0, "min_lat": 26.4, "max_lng": 91.2, "max_lat": 26.6},
            duration_hours=720,
            metadata={"bridge_id": "bridge_chaulkhowa"},
        )
        
        self.service.trigger_event(event)
        
        plans = self.service.get_all_plans()
        assert len(plans) == 2
        
        # Version 1: initial, now invalid
        assert plans[0].version == 1
        assert plans[0].status == PlanStatus.INVALID
        
        # Version 2: new, active
        assert plans[1].version == 2
        assert plans[1].status == PlanStatus.ACTIVE
    
    def test_active_plan_updated(self):
        """Test that active plan reference is updated."""
        event = DisasterEvent(
            event_type=EventType.BRIDGE_COLLAPSE,
            intensity=1.0,
            affected_area={"min_lng": 91.0, "min_lat": 26.4, "max_lng": 91.2, "max_lat": 26.6},
            duration_hours=720,
            metadata={"bridge_id": "bridge_chaulkhowa"},
        )
        
        old_active = self.service.get_active_plan()
        self.service.trigger_event(event)
        new_active = self.service.get_active_plan()
        
        assert new_active is not old_active
        assert new_active.version == 2


class TestEventSchema:
    """Test that event and plan schemas work correctly."""
    
    def test_disaster_event_schema(self):
        """Test DisasterEvent schema validation."""
        event = DisasterEvent(
            event_type=EventType.BRIDGE_COLLAPSE,
            intensity=1.0,
            affected_area={"min_lng": 90.9, "min_lat": 26.3, "max_lng": 91.0, "max_lat": 26.4},
            duration_hours=720,
            metadata={"bridge_id": "bridge_beki"},
        )
        
        assert event.event_type == EventType.BRIDGE_COLLAPSE
        assert event.metadata["bridge_id"] == "bridge_beki"
    
    def test_capacity_reduction_event_schema(self):
        """Test capacity reduction event schema."""
        event = DisasterEvent(
            event_type=EventType.CAPACITY_REDUCTION,
            intensity=0.5,
            affected_area={"min_lng": 91.0, "min_lat": 26.2, "max_lng": 91.3, "max_lat": 26.5},
            duration_hours=168,
            metadata={"shelter_ids": ["shelter_rc_barpeta"], "reduction_pct": 50},
        )
        
        assert event.event_type == EventType.CAPACITY_REDUCTION
        assert event.metadata["reduction_pct"] == 50