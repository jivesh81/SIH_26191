"""
Dynamic Disaster Event Service for Aapda Setu (Prototype).

Handles bridge collapse and shelter capacity reduction events,
plan invalidation, and automatic re-optimization.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import uuid

from app.services.data_layer import (
    get_routes,
    get_sites,
    get_infrastructure,
    RouteResponse,
    SiteResponse,
    InfrastructureResponse,
)
from app.services.optimization import run_relocation_optimization
from app.services.intelligence import get_all_effective_capacities
from app.schemas.domain import (
    EventType,
    OptimizationStatus,
    DisasterEvent,
    RouteStatus,
)


class PlanStatus(str, Enum):
    ACTIVE = "active"
    INVALID = "invalid"
    SUPERSEDED = "superseded"


@dataclass
class PlanVersion:
    """A version of a relocation plan."""
    version: int
    plan_id: str
    status: PlanStatus
    optimization_result: Any  # OptimizationResponse from optimization service
    created_at: datetime
    invalidated_at: Optional[datetime] = None
    invalidation_reason: Optional[str] = None
    affected_assignments: List[str] = field(default_factory=list)
    affected_sites: List[str] = field(default_factory=list)
    affected_routes: List[str] = field(default_factory=list)


class EventService:
    """Manages disaster events and plan versioning."""
    
    def __init__(self):
        self._plan_versions: List[PlanVersion] = []
        self._active_plan: Optional[PlanVersion] = None
        self._event_log: List[Dict[str, Any]] = []
    
    def create_initial_plan(self) -> PlanVersion:
        """Create the initial relocation plan."""
        result = run_relocation_optimization()
        
        plan = PlanVersion(
            version=1,
            plan_id=str(uuid.uuid4())[:8],
            status=PlanStatus.ACTIVE,
            optimization_result=result,
            created_at=datetime.utcnow(),
        )
        
        self._plan_versions.append(plan)
        self._active_plan = plan
        return plan
    
    def get_active_plan(self) -> Optional[PlanVersion]:
        """Get the current active plan."""
        return self._active_plan
    
    def get_all_plans(self) -> List[PlanVersion]:
        """Get all plan versions."""
        return self._plan_versions
    
    def _find_routes_using_bridge(self, bridge_id: str) -> List[RouteResponse]:
        """Find all routes that depend on a specific bridge."""
        routes = get_routes()
        return [r for r in routes if bridge_id in r.bridge_dependencies]
    
    def _apply_bridge_collapse(self, event: DisasterEvent) -> Dict[str, Any]:
        """Apply bridge collapse event - mark affected routes as impassable."""
        bridge_id = event.metadata.get("bridge_id", "bridge_beki")
        
        # Get routes that use this bridge
        affected_routes = self._find_routes_using_bridge(bridge_id)
        
        # In a real system, we'd persist this. For demo, we track it.
        affected_route_ids = [r.id for r in affected_routes]
        
        # Also mark the bridge as collapsed in infrastructure
        infrastructure = get_infrastructure()
        bridge = next((i for i in infrastructure if i.id == bridge_id), None)
        
        return {
            "type": "bridge_collapse",
            "bridge_id": bridge_id,
            "affected_routes": affected_route_ids,
            "bridge_was_collapsed": bridge is not None,
        }
    
    def _apply_capacity_reduction(self, event: DisasterEvent) -> Dict[str, Any]:
        """Apply shelter capacity reduction event."""
        shelter_ids = event.metadata.get("shelter_ids", [])
        reduction_pct = event.metadata.get("reduction_pct", 50)
        
        # For demo, we map shelter_ids to site_ids
        # In practice, sites and shelters are different but for demo
        # we treat sites as having effective capacity that can be reduced
        sites = get_sites()
        site_map = {s.id: s for s in sites}
        
        affected_sites = []
        for shelter_id in shelter_ids:
            # Find matching site (demo mapping)
            # In real system, this would be more complex
            if shelter_id.startswith("shelter_rc_"):
                # Map shelter to site by region
                if "barpeta" in shelter_id:
                    affected_sites.append("site_001")
                elif "howly" in shelter_id:
                    affected_sites.append("site_002")
                elif "mandia" in shelter_id:
                    affected_sites.append("site_004")
                elif "chenga" in shelter_id:
                    affected_sites.append("site_004")
                elif "bajali" in shelter_id:
                    affected_sites.append("site_003")
        
        affected_sites = list(set(affected_sites))
        
        return {
            "type": "capacity_reduction",
            "shelter_ids": shelter_ids,
            "reduction_pct": reduction_pct,
            "affected_sites": affected_sites,
        }
    
    def _check_plan_affected(
        self,
        plan: PlanVersion,
        event_result: Dict[str, Any],
    ) -> tuple[bool, List[str], List[str], List[str]]:
        """Check if an active plan is materially affected by an event."""
        if not plan or plan.status != PlanStatus.ACTIVE:
            return False, [], [], []
        
        affected_assignments = []
        affected_sites = []
        affected_routes = []
        
        if event_result["type"] == "bridge_collapse":
            affected_routes = event_result["affected_routes"]
            # Check if any assignment uses these routes
            for assignment in plan.optimization_result.assignments:
                if assignment.route_id in affected_routes:
                    affected_assignments.append(assignment.habitation_id)
            
            return len(affected_assignments) > 0, affected_assignments, affected_sites, affected_routes
        
        elif event_result["type"] == "capacity_reduction":
            affected_sites = event_result["affected_sites"]
            # Check if any assignment uses these sites
            for assignment in plan.optimization_result.assignments:
                if assignment.assigned_site_id in affected_sites:
                    affected_assignments.append(assignment.habitation_id)
            
            return len(affected_assignments) > 0, affected_assignments, affected_sites, affected_routes
        
        return False, [], [], []
    
    def trigger_event(self, event: DisasterEvent) -> Dict[str, Any]:
        """
        Trigger a disaster event and handle plan invalidation/re-optimization.
        
        Returns:
            Dictionary with event details, invalidation info, and new plan.
        """
        # Log the event
        event_record = {
            "event_id": str(uuid.uuid4())[:8],
            "event_type": event.event_type,
            "timestamp": datetime.utcnow(),
            "metadata": event.metadata,
        }
        
        # Apply the event
        if event.event_type == EventType.BRIDGE_COLLAPSE:
            event_result = self._apply_bridge_collapse(event)
        elif event.event_type == EventType.CAPACITY_REDUCTION:
            event_result = self._apply_capacity_reduction(event)
        else:
            event_result = {"type": event.event_type, "message": "Event type not fully implemented"}
        
        event_record["result"] = event_result
        self._event_log.append(event_record)
        
        # Check if active plan is affected
        active_plan = self.get_active_plan()
        
        if active_plan:
            is_affected, affected_assignments, affected_sites, affected_routes = self._check_plan_affected(
                active_plan, event_result
            )
            
            if is_affected:
                # Invalidate the current plan
                invalidation_reason = (
                    f"Event {event.event_type.value} affected "
                    f"{len(affected_assignments)} assignments, "
                    f"{len(affected_sites)} sites, {len(affected_routes)} routes"
                )
                
                active_plan.status = PlanStatus.INVALID
                active_plan.invalidated_at = datetime.utcnow()
                active_plan.invalidation_reason = invalidation_reason
                active_plan.affected_assignments = affected_assignments
                active_plan.affected_sites = affected_sites
                active_plan.affected_routes = affected_routes
                
                # Run re-optimization
                new_result = run_relocation_optimization()
                
                # Create new plan version
                new_version = len(self._plan_versions) + 1
                new_plan = PlanVersion(
                    version=new_version,
                    plan_id=str(uuid.uuid4())[:8],
                    status=PlanStatus.ACTIVE,
                    optimization_result=new_result,
                    created_at=datetime.utcnow(),
                )
                
                self._plan_versions.append(new_plan)
                self._active_plan = new_plan
                
                return {
                    "event": event_record,
                    "plan_invalidated": True,
                    "previous_plan": {
                        "version": active_plan.version,
                        "plan_id": active_plan.plan_id,
                        "status": active_plan.status.value,
                        "total_assigned_population": active_plan.optimization_result.total_assigned_population,
                        "total_unmet_population": active_plan.optimization_result.total_unmet_population,
                        "optimization_status": active_plan.optimization_result.status.value,
                        "created_at": active_plan.created_at,
                        "invalidated_at": active_plan.invalidated_at,
                        "invalidation_reason": active_plan.invalidation_reason,
                        "affected_assignments": affected_assignments,
                        "affected_sites": affected_sites,
                        "affected_routes": affected_routes,
                    },
                    "new_plan": {
                        "version": new_plan.version,
                        "plan_id": new_plan.plan_id,
                        "status": new_plan.status.value,
                        "total_assigned_population": new_result.total_assigned_population,
                        "total_unmet_population": new_result.total_unmet_population,
                        "optimization_status": new_result.status.value,
                        "created_at": new_plan.created_at,
                        "invalidated_at": None,
                        "invalidation_reason": None,
                        "affected_assignments": [],
                        "affected_sites": [],
                        "affected_routes": [],
                    },
                }
        
        # Plan not affected or no active plan
        return {
            "event": event_record,
            "plan_invalidated": False,
            "previous_plan": None,
            "new_plan": None,
            "message": "No active plan affected by this event",
        }


# Global event service instance
event_service = EventService()