export interface Position {
  longitude: number;
  latitude: number;
}

export interface BoundingBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export type GeoJSONGeometryType =
  | 'Point'
  | 'MultiPoint'
  | 'LineString'
  | 'MultiLineString'
  | 'Polygon'
  | 'MultiPolygon'
  | 'GeometryCollection';

export interface GeoJSONGeometry {
  type: GeoJSONGeometryType;
  coordinates: number[] | number[][] | number[][][];
  geometries?: GeoJSONGeometry[];
}

export interface GeoJSONFeature<P = Record<string, unknown>, G = GeoJSONGeometry> {
  type: 'Feature';
  id?: string | number;
  geometry: G | null;
  properties: P;
  bbox?: number[];
}

export interface GeoJSONFeatureCollection<P = Record<string, unknown>, G = GeoJSONGeometry> {
  type: 'FeatureCollection';
  features: GeoJSONFeature<P, G>[];
  bbox?: number[];
}

// Domain-specific types
export interface AdminBoundaryProperties {
  id: string;
  name: string;
  level: 'district' | 'block' | 'village';
  parent_id?: string;
  area_sqkm: number;
  population: number;
}

export interface HazardZoneProperties {
  id: string;
  hazard_type: 'flood' | 'erosion' | 'storm_surge' | 'landslide';
  severity: 'low' | 'medium' | 'high' | 'extreme';
  return_period_years?: number;
  source: 'historical' | 'modelled' | 'satellite';
  last_updated: string;
}

export interface InfrastructureProperties {
  id: string;
  infra_type: 'road' | 'bridge' | 'culvert' | 'embankment';
  name?: string;
  condition: 'good' | 'fair' | 'poor' | 'collapsed';
  capacity?: number;
  length_m?: number;
  width_m?: number;
  surface_type?: string;
  clearance_m?: number;
  last_inspection?: string;
}

export interface ShelterProperties {
  id: string;
  name: string;
  shelter_type: 'relief_camp' | 'school' | 'hospital' | 'community_center' | 'cyclone_shelter';
  capacity: number;
  current_occupancy: number;
  effective_capacity: number;
  facilities: string[];
  manager_contact?: string;
  is_active: boolean;
  elevation_m: number;
  flood_level_m?: number;
}

export interface PopulationGridProperties {
  id: string;
  population: number;
  vulnerability_index: number;
  habitation_type: 'rural' | 'urban' | 'tribal' | 'slum';
  households: number;
  female_population: number;
  child_population: number;
  elderly_population: number;
  disabled_population: number;
}

export interface VulnerableHabitationProperties {
  id: string;
  name: string;
  population: number;
  vulnerability_score: number;
  hazard_exposure: HazardZoneProperties[];
  nearest_shelter_id?: string;
  nearest_shelter_distance_m: number;
  evacuation_route_id?: string;
  is_accessible: boolean;
  priority_rank: number;
}

export interface RelocationSiteProperties {
  id: string;
  name: string;
  area_sqkm: number;
  max_capacity: number;
  current_allocation: number;
  suitability_score: number;
  elevation_m: number;
  flood_risk: 'none' | 'low' | 'medium' | 'high';
  land_ownership: 'government' | 'private' | 'community' | 'forest';
  infrastructure_ready: boolean;
  water_available: boolean;
  power_available: boolean;
  road_access: boolean;
}

export interface EvacuationRouteProperties {
  id: string;
  name: string,
  route_type: 'primary' | 'alternative' | 'contingency';
  length_km: number;
  travel_time_min: number;
  capacity_per_hour: number;
  current_load: number;
  status: 'open' | 'congested' | 'impassable' | 'under_review';
  bridge_dependencies: string[];
  last_assessment: string;
}

export interface OptimizationRequest {
  scenario_id: string;
  hazard_event: HazardEvent;
  affected_habitations: string[];
  available_shelters: string[];
  candidate_relocation_sites: string[];
  constraints: OptimizationConstraints;
  objectives: OptimizationObjective[];
}

export interface HazardEvent {
  event_type: 'rainfall' | 'bridge_collapse' | 'capacity_reduction' | 'combined';
  intensity: number;
  affected_area: BoundingBox;
  duration_hours: number;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface OptimizationConstraints {
  max_travel_time_min: number;
  min_shelter_capacity_buffer: number;
  max_relocation_distance_km: number;
  bridge_closure_penalty: number;
  capacity_utilization_limit: number;
  priority_weights: Record<string, number>;
}

export interface OptimizationObjective {
  name: 'minimize_travel_time' | 'maximize_safety' | 'minimize_cost' | 'balance_load';
  weight: number;
  direction: 'minimize' | 'maximize';
}

export interface OptimizationResult {
  solution_id: string;
  status: 'optimal' | 'feasible' | 'infeasible' | 'timeout';
  objective_value: number;
  assignments: Assignment[];
  routes: RouteAssignment[];
  unassigned_habitations: string[];
  infeasibility_reasons?: InfeasibilityReason[];
  computation_time_ms: number;
  solver_stats: Record<string, unknown>;
}

export interface Assignment {
  habitation_id: string;
  shelter_id: string;
  relocation_site_id?: string;
  population_assigned: number;
  travel_time_min: number;
  route_id: string;
  priority: number;
}

export interface RouteAssignment {
  route_id: string;
  habitation_ids: string[];
  total_population: number;
  estimated_time_min: number;
  bottleneck_bridges: string[];
}

export interface InfeasibilityReason {
  constraint: string;
  description: string;
  affected_habitations: string[];
  severity: 'warning' | 'critical';
  recommendation: string;
}

export interface SimulationRequest {
  scenario_name: string;
  base_plan_id?: string;
  events: HazardEvent[];
  auto_reoptimize: boolean;
}

export interface SimulationResult {
  simulation_id: string;
  original_plan_id?: string;
  new_plan_id?: string;
  events_applied: HazardEvent[];
  plan_invalidated: boolean.
  reoptimization_triggered: boolean;
  new_optimization_result?: OptimizationResult;
  impact_assessment: ImpactAssessment;
}

export interface ImpactAssessment {
  additional_population_at_risk: number;
  shelters_over_capacity: string[];
  routes_blocked: string[];
  bridges_affected: string[];
  capacity_shortfall: number;
  estimated_casualties_if_no_action: number;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  actor_role: 'system' | 'analyst' | 'approver' | 'admin';
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'simulate' | 'optimize';
  resource_type: 'plan' | 'scenario' | 'optimization' | 'simulation' | 'approval';
  resource_id: string.
  changes: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface ApprovalWorkflow {
  id: string;
  plan_id: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'expired';
  submitted_by: string;
  submitted_at: string.
  reviewed_by?: string.
  reviewed_at?: string.
  decision?: 'approved' | 'rejected'.
  comments?: string.
  required_approvers: string[];
  current_approver_index: number;
  expiry_at: string.
}

export interface ExplainabilityReport {
  plan_id: string.
  generated_at: string.
  risk_assessment: RiskAssessment.
  capacity_analysis: CapacityAnalysis.
  route_analysis: RouteAnalysis.
  optimization_rationale: OptimizationRationale.
  sensitivity_analysis: SensitivityAnalysis.
}

export interface RiskAssessment {
  habitation_risks: Array<{
    habitation_id: string.
    composite_risk_score: number.
    hazard_components: Record<string, number>.
    vulnerability_components: Record<string, number>.
  }>.
  red_zones: string[].
  methodology: string.
}

export interface CapacityAnalysis {
  shelter_utilization: Array<{
    shelter_id: string.
    nominal_capacity: number.
    effective_capacity: number.
    current_occupancy: number.
    utilization_pct: number.
    buffer: number.
  }>.
  total_capacity: number.
  total_demand: number.
  shortfall: number.
}

export interface RouteAnalysis {
  route_feasibility: Array<{
    route_id: string.
    is_feasible: boolean.
    bottlenecks: string[].
    travel_time_min: number.
    capacity_utilization: number.
  }>.
  critical_bridges: string[].
}

export interface OptimizationRationale {
  objective_contributions: Record<string, number>.
  constraint_slack: Record<string, number>.
  alternative_solutions: Array<{
    description: string.
    objective_delta: number.
    constraint_changes: Record<string, number>.
  }>.
}

export interface SensitivityAnalysis {
  parameter_impacts: Array<{
    parameter: string.
    baseline_value: number.
    tested_range: [number, number].
    objective_sensitivity: number.
    feasibility_impact: 'none' | 'low' | 'medium' | 'high'.
  }>.
}