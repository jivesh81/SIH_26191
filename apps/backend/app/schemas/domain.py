"""
Core domain schemas for Aapda Setu.

These schemas represent the core domain entities and are designed to be
extensible for future milestones. All data is synthetic/demo data for
Barpeta district, Assam - NOT official government data.
"""

from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from enum import Enum


# =============================================================================
# Enums
# =============================================================================

class HazardType(str, Enum):
    FLOOD = "flood"
    EROSION = "erosion"
    STORM_SURGE = "storm_surge"
    LANDSLIDE = "landslide"
    EARTHQUAKE = "earthquake"


class HazardSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    EXTREME = "extreme"


class InfrastructureType(str, Enum):
    ROAD = "road"
    BRIDGE = "bridge"
    CULVERT = "culvert"
    EMBANKMENT = "embankment"


class InfrastructureCondition(str, Enum):
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    COLLAPSED = "collapsed"


class ShelterType(str, Enum):
    RELIEF_CAMP = "relief_camp"
    SCHOOL = "school"
    HOSPITAL = "hospital"
    COMMUNITY_CENTER = "community_center"
    CYCLONE_SHELTER = "cyclone_shelter"


class RouteType(str, Enum):
    PRIMARY = "primary"
    ALTERNATIVE = "alternative"
    CONTINGENCY = "contingency"


class RouteStatus(str, Enum):
    OPEN = "open"
    CONGESTED = "congested"
    IMPASSABLE = "impassable"
    UNDER_REVIEW = "under_review"


class FloodRiskLevel(str, Enum):
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class LandOwnership(str, Enum):
    GOVERNMENT = "government"
    PRIVATE = "private"
    COMMUNITY = "community"
    FOREST = "forest"


class HabitationType(str, Enum):
    RURAL = "rural"
    URBAN = "urban"
    TRIBAL = "tribal"
    SLUM = "slum"


class EventType(str, Enum):
    RAINFALL = "rainfall"
    BRIDGE_COLLAPSE = "bridge_collapse"
    CAPACITY_REDUCTION = "capacity_reduction"
    COMBINED = "combined"


class OptimizationStatus(str, Enum):
    OPTIMAL = "optimal"
    FEASIBLE = "feasible"
    INFEASIBLE = "infeasible"
    TIMEOUT = "timeout"
    UNKNOWN = "unknown"


class ApprovalStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class AuditAction(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    APPROVE = "approve"
    REJECT = "reject"
    SIMULATE = "simulate"
    OPTIMIZE = "optimize"


class ActorRole(str, Enum):
    SYSTEM = "system"
    ANALYST = "analyst"
    APPROVER = "approver"
    ADMIN = "admin"


class ResourceType(str, Enum):
    PLAN = "plan"
    SCENARIO = "scenario"
    OPTIMIZATION = "optimization"
    SIMULATION = "simulation"
    APPROVAL = "approval"


class ConstraintType(str, Enum):
    MAX_TRAVEL_TIME = "max_travel_time"
    MIN_CAPACITY_BUFFER = "min_capacity_buffer"
    MAX_RELOCATION_DISTANCE = "max_relocation_distance"
    BRIDGE_CLOSURE_PENALTY = "bridge_closure_penalty"
    CAPACITY_UTILIZATION_LIMIT = "capacity_utilization_limit"


class ObjectiveType(str, Enum):
    MINIMIZE_TRAVEL_TIME = "minimize_travel_time"
    MAXIMIZE_SAFETY = "maximize_safety"
    MINIMIZE_COST = "minimize_cost"
    BALANCE_LOAD = "balance_load"


# =============================================================================
# Base Schemas
# =============================================================================

class GeometryBase(BaseModel):
    """Base geometry schema - GeoJSON compatible."""
    type: str
    coordinates: List[Any]


class PointGeometry(GeometryBase):
    type: Literal["Point"]
    coordinates: List[float]  # [longitude, latitude]


class LineStringGeometry(GeometryBase):
    type: Literal["LineString"]
    coordinates: List[List[float]]


class PolygonGeometry(GeometryBase):
    type: Literal["Polygon"]
    coordinates: List[List[List[float]]]


class MultiPolygonGeometry(GeometryBase):
    type: Literal["MultiPolygon"]
    coordinates: List[List[List[List[float]]]]


# =============================================================================
# Feature Properties
# =============================================================================

class AdminBoundaryProperties(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    id: str
    name: str
    level: Literal["district", "block", "village"]
    parent_id: Optional[str] = None
    area_sqkm: Optional[float] = None
    population: Optional[int] = None


class HazardZoneProperties(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    id: str
    hazard_type: HazardType
    severity: HazardSeverity
    return_period_years: Optional[int] = None
    source: Optional[str] = None
    last_updated: Optional[str] = None


class InfrastructureProperties(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    id: str
    infra_type: InfrastructureType
    name: Optional[str] = None
    condition: InfrastructureCondition
    capacity: Optional[int] = None
    length_m: Optional[float] = None
    width_m: Optional[float] = None
    surface_type: Optional[str] = None
    clearance_m: Optional[float] = None
    last_inspection: Optional[str] = None


class ShelterProperties(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    id: str
    name: str
    shelter_type: ShelterType
    capacity: int
    current_occupancy: int = 0
    effective_capacity: int
    facilities: List[str] = Field(default_factory=list)
    manager_contact: Optional[str] = None
    is_active: bool = True
    elevation_m: float
    flood_level_m: Optional[float] = None


class PopulationGridProperties(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    id: str
    population: int = 0
    vulnerability_index: float = 0.0
    habitation_type: Optional[HabitationType] = None
    households: int = 0
    female_population: int = 0
    child_population: int = 0
    elderly_population: int = 0
    disabled_population: int = 0


class VulnerableHabitationProperties(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    id: str
    name: str
    population: int
    vulnerability_score: float = Field(ge=0.0, le=1.0)
    hazard_exposure: List[Dict[str, Any]] = Field(default_factory=list)
    nearest_shelter_id: Optional[str] = None
    nearest_shelter_distance_m: Optional[float] = None
    evacuation_route_id: Optional[str] = None
    is_accessible: bool = True
    priority_rank: Optional[int] = None


class EvacuationRouteProperties(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    id: str
    name: str
    route_type: RouteType
    length_km: float
    travel_time_min: float
    capacity_per_hour: int
    current_load: int = 0
    status: RouteStatus = RouteStatus.OPEN
    bridge_dependencies: List[str] = Field(default_factory=list)
    last_assessment: Optional[str] = None


class RelocationSiteProperties(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    id: str
    name: str
    area_sqkm: float
    max_capacity: int
    current_allocation: int = 0
    suitability_score: float = Field(ge=0.0, le=1.0)
    elevation_m: float
    flood_risk: FloodRiskLevel
    land_ownership: LandOwnership
    infrastructure_ready: bool = False
    water_available: bool = False
    power_available: bool = False
    road_access: bool = False


# =============================================================================
# Feature & FeatureCollection
# =============================================================================

class Feature(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    type: Literal["Feature"] = "Feature"
    id: Optional[str] = None
    geometry: Optional[GeometryBase] = None
    properties: Dict[str, Any]
    bbox: Optional[List[float]] = None


class FeatureCollection(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: List[Feature]
    bbox: Optional[List[float]] = None


# =============================================================================
# API Response Schemas
# =============================================================================

class HabitationResponse(BaseModel):
    """Response schema for habitation data."""
    id: str
    name: str
    population: int
    vulnerability_score: float
    hazard_exposure: List[Dict[str, Any]]
    nearest_shelter_id: Optional[str]
    nearest_shelter_distance_m: Optional[float]
    evacuation_route_id: Optional[str]
    is_accessible: bool
    priority_rank: Optional[int]
    geometry: Optional[Dict[str, Any]] = None


class SiteResponse(BaseModel):
    """Response schema for relocation site data."""
    id: str
    name: str
    area_sqkm: float
    max_capacity: int
    current_allocation: int
    suitability_score: float
    elevation_m: float
    flood_risk: FloodRiskLevel
    land_ownership: LandOwnership
    infrastructure_ready: bool
    water_available: bool
    power_available: bool
    road_access: bool
    geometry: Optional[Dict[str, Any]] = None
    
    @property
    def available_capacity(self) -> int:
        return self.max_capacity - self.current_allocation
    
    @property
    def utilization_pct(self) -> float:
        if self.max_capacity == 0:
            return 0.0
        return (self.current_allocation / self.max_capacity) * 100


class RouteResponse(BaseModel):
    """Response schema for evacuation route data."""
    id: str
    name: str
    route_type: RouteType
    length_km: float
    travel_time_min: float
    capacity_per_hour: int
    current_load: int
    status: RouteStatus
    bridge_dependencies: List[str]
    last_assessment: Optional[str]
    geometry: Optional[Dict[str, Any]] = None
    
    @property
    def utilization_pct(self) -> float:
        if self.capacity_per_hour == 0:
            return 0.0
        return (self.current_load / self.capacity_per_hour) * 100
    
    @property
    def is_feasible(self) -> bool:
        return self.status == RouteStatus.OPEN


class HazardResponse(BaseModel):
    """Response schema for hazard zone data."""
    id: str
    hazard_type: HazardType
    severity: HazardSeverity
    return_period_years: Optional[int]
    source: Optional[str]
    last_updated: Optional[str]
    geometry: Optional[Dict[str, Any]] = None


class ShelterResponse(BaseModel):
    """Response schema for shelter data."""
    id: str
    name: str
    shelter_type: ShelterType
    capacity: int
    current_occupancy: int
    effective_capacity: int
    facilities: List[str]
    manager_contact: Optional[str]
    is_active: bool
    elevation_m: float
    flood_level_m: Optional[float]
    geometry: Optional[Dict[str, Any]] = None
    
    @property
    def available_capacity(self) -> int:
        return self.effective_capacity - self.current_occupancy
    
    @property
    def utilization_pct(self) -> float:
        if self.effective_capacity == 0:
            return 0.0
        return (self.current_occupancy / self.effective_capacity) * 100


class PopulationGridResponse(BaseModel):
    """Response schema for population grid data."""
    id: str
    population: int
    vulnerability_index: float
    habitation_type: Optional[HabitationType]
    households: int
    female_population: int
    child_population: int
    elderly_population: int
    disabled_population: int
    geometry: Optional[Dict[str, Any]] = None


class InfrastructureResponse(BaseModel):
    """Response schema for infrastructure data."""
    id: str
    infra_type: InfrastructureType
    name: Optional[str]
    condition: InfrastructureCondition
    capacity: Optional[int]
    length_m: Optional[float]
    width_m: Optional[float]
    surface_type: Optional[str]
    clearance_m: Optional[float]
    last_inspection: Optional[str]
    geometry: Optional[Dict[str, Any]] = None


# =============================================================================
# Dashboard & Statistics
# =============================================================================

class DashboardStats(BaseModel):
    """Dashboard statistics calculated from demo data."""
    total_habitations: int
    total_population: int
    high_vulnerability_habitations: int  # vulnerability_score >= 0.7
    total_shelters: int
    active_shelters: int
    total_shelter_capacity: int
    total_effective_capacity: int
    current_total_occupancy: int
    shelter_utilization_pct: float
    total_sites: int
    total_site_capacity: int
    total_routes: int
    open_routes: int
    impassable_routes: int
    total_hazard_zones: int
    high_severity_hazards: int
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    data_source: str = "synthetic_demo_data_barpeta"


class DashboardResponse(BaseModel):
    stats: DashboardStats
    metadata: Dict[str, Any] = Field(default_factory=dict)


# =============================================================================
# Disaster Event & Simulation
# =============================================================================

class DisasterEvent(BaseModel):
    """Disaster event for simulation."""
    event_type: EventType
    intensity: float = Field(ge=0.0, le=1.0)
    affected_area: Dict[str, float]  # bbox: min_lng, min_lat, max_lng, max_lat
    duration_hours: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SimulationRequest(BaseModel):
    scenario_name: str
    base_plan_id: Optional[str] = None
    events: List[DisasterEvent]
    auto_reoptimize: bool = True


class SimulationResult(BaseModel):
    simulation_id: str
    original_plan_id: Optional[str]
    new_plan_id: Optional[str]
    events_applied: List[DisasterEvent]
    plan_invalidated: bool
    reoptimization_triggered: bool
    new_optimization_result: Optional[Dict[str, Any]] = None
    impact_assessment: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# =============================================================================
# Optimization
# =============================================================================

class OptimizationConstraints(BaseModel):
    max_travel_time_min: float = 120.0
    min_shelter_capacity_buffer: float = 0.1
    max_relocation_distance_km: float = 50.0
    bridge_closure_penalty: float = 1000.0
    capacity_utilization_limit: float = 0.9
    priority_weights: Dict[str, float] = Field(default_factory=dict)


class OptimizationObjectives(BaseModel):
    minimize_travel_time: float = 1.0
    maximize_safety: float = 1.0
    minimize_cost: float = 0.5
    balance_load: float = 0.3


class OptimizationRequest(BaseModel):
    scenario_id: str
    hazard_event: Optional[DisasterEvent] = None
    affected_habitations: List[str] = Field(default_factory=list)
    available_shelters: List[str] = Field(default_factory=list)
    candidate_relocation_sites: List[str] = Field(default_factory=list)
    constraints: OptimizationConstraints = Field(default_factory=OptimizationConstraints)
    objectives: OptimizationObjectives = Field(default_factory=OptimizationObjectives)


class Assignment(BaseModel):
    habitation_id: str
    shelter_id: str
    relocation_site_id: Optional[str] = None
    population_assigned: int
    travel_time_min: float
    route_id: str
    priority: int


class RouteAssignment(BaseModel):
    route_id: str
    habitation_ids: List[str]
    total_population: int
    estimated_time_min: float
    bottleneck_bridges: List[str]


class InfeasibilityReason(BaseModel):
    constraint: str
    description: str
    affected_habitations: List[str]
    severity: Literal["warning", "critical"]
    recommendation: str


class OptimizationResult(BaseModel):
    solution_id: str
    status: OptimizationStatus
    objective_value: float
    assignments: List[Assignment]
    route_assignments: List[RouteAssignment]
    relocation_assignments: Dict[str, str] = Field(default_factory=dict)
    unassigned_habitations: List[str] = Field(default_factory=list)
    infeasibility_reasons: List[InfeasibilityReason] = Field(default_factory=list)
    computation_time_ms: float
    solver_stats: Dict[str, Any] = Field(default_factory=dict)


# =============================================================================
# Audit & Approval
# =============================================================================

class AuditEntry(BaseModel):
    id: str
    timestamp: datetime
    actor: str
    actor_role: ActorRole
    action: AuditAction
    resource_type: ResourceType
    resource_id: str
    changes: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ApprovalWorkflow(BaseModel):
    id: str
    plan_id: str
    status: ApprovalStatus
    submitted_by: Optional[str] = None
    submitted_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    decision: Optional[Literal["approved", "rejected"]] = None
    comments: Optional[str] = None
    required_approvers: List[str] = Field(default_factory=list)
    current_approver_index: int = 0
    expiry_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# =============================================================================
# Explainability
# =============================================================================

class RiskAssessment(BaseModel):
    habitation_risks: List[Dict[str, Any]]
    red_zones: List[str]
    methodology: str


class CapacityAnalysis(BaseModel):
    shelter_utilization: List[Dict[str, Any]]
    total_capacity: int
    total_demand: int
    shortfall: int


class RouteAnalysis(BaseModel):
    route_feasibility: List[Dict[str, Any]]
    critical_bridges: List[str]


class OptimizationRationale(BaseModel):
    objective_contributions: Dict[str, float]
    constraint_slack: Dict[str, float]
    alternative_solutions: List[Dict[str, Any]]


class SensitivityAnalysis(BaseModel):
    parameter_impacts: List[Dict[str, Any]]


class ExplainabilityReport(BaseModel):
    plan_id: str
    generated_at: datetime
    risk_assessment: RiskAssessment
    capacity_analysis: CapacityAnalysis
    route_analysis: RouteAnalysis
    optimization_rationale: OptimizationRationale
    sensitivity_analysis: SensitivityAnalysis


# =============================================================================
# Core Intelligence (Prototype)
# =============================================================================

class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    RED_ZONE = "RED_ZONE"


class RiskFactors(BaseModel):
    """Individual risk factor contributions."""
    vulnerability_score: float
    flood_exposure: float
    erosion_exposure: float
    storm_surge_exposure: float
    population_factor: float
    accessibility_factor: float


class RiskAssessmentResponse(BaseModel):
    """Risk assessment for a single habitation."""
    habitation_id: str
    habitation_name: str
    total_score: float
    risk_level: RiskLevel
    factors: RiskFactors
    explanation: str


class RiskAssessmentListResponse(BaseModel):
    assessments: List[RiskAssessmentResponse]
    total: int
    red_zone_count: int
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int


class CapacityConstraintResponse(BaseModel):
    """Individual capacity constraint."""
    name: str
    available: int
    is_limiting: bool = False


class EffectiveCapacityResponse(BaseModel):
    """Effective capacity calculation result."""
    site_id: str
    site_name: str
    physical_capacity: int
    effective_capacity: int
    limiting_constraint: str
    constraints: List[CapacityConstraintResponse]
    explanation: str


class EffectiveCapacityListResponse(BaseModel):
    capacities: List[EffectiveCapacityResponse]
    total: int


class RouteFeasibilityResponse(BaseModel):
    """Route feasibility result."""
    habitation_id: str
    site_id: str
    feasible: bool
    distance_km: Optional[float] = None
    travel_time_min: Optional[float] = None
    reason: str
    route_used: Optional[str] = None
    bottlenecks: List[str] = Field(default_factory=list)


class RouteFeasibilityListResponse(BaseModel):
    routes: List[RouteFeasibilityResponse]
    total: int
    feasible_count: int
    infeasible_count: int


class ExplainabilityReport(BaseModel):
    plan_id: str
    generated_at: datetime
    risk_assessment: RiskAssessment
    capacity_analysis: CapacityAnalysis
    route_analysis: RouteAnalysis
    optimization_rationale: OptimizationRationale
    sensitivity_analysis: SensitivityAnalysis


# =============================================================================
# List Response Wrappers
# =============================================================================

class HabitationListResponse(BaseModel):
    habitations: List[HabitationResponse]
    total: int
    page: int = 1
    page_size: int = 50


class SiteListResponse(BaseModel):
    sites: List[SiteResponse]
    total: int
    page: int = 1
    page_size: int = 50


class RouteListResponse(BaseModel):
    routes: List[RouteResponse]
    total: int
    page: int = 1
    page_size: int = 50


class HazardListResponse(BaseModel):
    hazards: List[HazardResponse]
    total: int
    page: int = 1
    page_size: int = 50


class ShelterListResponse(BaseModel):
    shelters: List[ShelterResponse]
    total: int
    page: int = 1
    page_size: int = 50


class EventListResponse(BaseModel):
    events: List[DisasterEvent]
    total: int