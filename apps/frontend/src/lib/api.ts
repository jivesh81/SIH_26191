const API_BASE = "http://localhost:8000/api/v1";

// =============================================================================
// Types
// =============================================================================

export interface Habitation {
  id: string;
  name: string;
  population: number;
  vulnerability_score: number;
  hazard_exposure: Array<{
    hazard_type: string;
    severity: string;
  }>;
  nearest_shelter_id: string | null;
  nearest_shelter_distance_m: number | null;
  evacuation_route_id: string | null;
  is_accessible: boolean;
  priority_rank: number | null;
  geometry?: any;
  properties?: Record<string, any>;
}

export enum RiskLevel {
  RED_ZONE = "RED_ZONE",
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
}

export interface Site {
  id: string;
  name: string;
  area_sqkm: number;
  max_capacity: number;
  current_allocation: number;
  suitability_score: number;
  elevation_m: number;
  flood_risk: string;
  land_ownership: string;
  infrastructure_ready: boolean;
  water_available: boolean;
  power_available: boolean;
  road_access: boolean;
  available_capacity: number;
  utilization_pct: number;
  geometry?: any;
  properties?: Record<string, any>;
}

export interface Route {
  id: string;
  name: string;
  route_type: string;
  length_km: number;
  travel_time_min: number;
  capacity_per_hour: number;
  current_load: number;
  status: string;
  bridge_dependencies: string[];
  last_assessment: string | null;
  geometry?: any;
  is_feasible: boolean;
  utilization_pct: number;
  properties?: Record<string, any>;
}

export interface RouteFeasibility {
  habitation_id: string;
  site_id: string;
  feasible: boolean;
  distance_km: number | null;
  travel_time_min: number | null;
  reason: string;
  route_used: string | null;
  bottlenecks: string[];
}

export interface OptimizationAssignment {
  habitation_id: string;
  habitation_name?: string;
  assigned_site_id: string;
  assigned_site_name?: string;
  site_id?: string;
  site_name?: string;
  population: number;
  priority_rank?: number | null;
  route_status?: string;
  route_id?: string | null;
  distance_km?: number | null;
  travel_time_min?: number | null;
  site_remaining_capacity?: number;
  households?: number;
}

export interface SiteCapacitySummary {
  site_id: string;
  site_name: string;
  max_capacity: number;
  current_allocation: number;
  allocated_population: number;
  remaining_capacity: number;
  assigned_habitations: string[];
}

export interface InfeasibilityReason {
  constraint: string;
  description: string;
  affected_habitations: string[];
  severity: "warning" | "critical";
  recommendation: string;
}

export interface OptimizationResponse {
  status: string;
  assignments: OptimizationAssignment[];
  total_assigned_population: number;
  total_unmet_population: number;
  site_capacities: Record<string, SiteCapacitySummary>;
  infeasibility_reasons: InfeasibilityReason[];
  computation_time_ms?: number;
  solver_stats?: Record<string, any>;
}

export interface PlanVersion {
  version: number;
  plan_id: string;
  status: string;
  total_assigned_population: number;
  total_unmet_population: number;
  optimization_status: string;
  created_at: string;
  invalidated_at: string | null;
  invalidation_reason: string | null;
  affected_assignments: string[];
  affected_sites: string[];
  affected_routes: string[];
}

export interface BackendPlan {
  version?: number;
  plan_id?: string;
  status?: string;
  plan_status?: string;

  total_assigned_population?: number;
  total_unmet_population?: number;

  optimization_status?: string;

  created_at?: string;
  invalidated_at?: string | null;
  invalidation_reason?: string | null;

  affected_assignments?: string[];
  affected_sites?: string[];
  affected_routes?: string[];

  assignments: Array<{
    habitation_id: string;
    site_id: string;
    households?: number;
    population?: number;
    distance_km?: number;
    travel_time_min?: number;
    [key: string]: any;
  }>;

  unmet_habitations?: string[];

  unmet_priority_count?: number;
  unmet_other_count?: number;

  total_distance_km?: number;

  approval_status?: string;

  last_event?: {
    event_type?: string;
    target_id?: string;
    magnitude?: number;
    [key: string]: any;
  } | null;

  [key: string]: any;
}

export interface ActivePlanResponse {
  plan: BackendPlan;
  all_versions: PlanVersion[];
}

export interface EventTriggerResponse {
  event_id?: string;
  event_type: string;
  timestamp?: string;
  plan_invalidated?: boolean;
  previous_plan?: PlanVersion | null;
  new_plan?: PlanVersion | null;
  message?: string | null;
  [key: string]: any;
}

export interface EventLogEntry {
  event_id?: string;
  event_type: string;
  timestamp?: string;
  metadata?: Record<string, any>;
  result?: Record<string, any>;
  [key: string]: any;
}

export interface EventLogResponse {
  events: EventLogEntry[];
  total: number;
}

export interface DisasterEvent {
  event_type:
    "rainfall" | "bridge_collapse" | "capacity_reduction" | "combined";

  intensity?: number;

  affected_area?: {
    min_lng: number;
    min_lat: number;
    max_lng: number;
    max_lat: number;
  };

  duration_hours?: number;

  metadata?: Record<string, any>;

  [key: string]: any;
}

interface GeoJSONFeature<T = Record<string, any>> {
  type: "Feature";
  geometry?: any;
  properties?: T;
  id?: string | number;
}

interface GeoJSONFeatureCollection<T = Record<string, any>> {
  type: "FeatureCollection";
  features: Array<GeoJSONFeature<T>>;
}

// =============================================================================
// Feature converters
// =============================================================================

function featureToHabitation(feature: GeoJSONFeature): Habitation {
  const p = feature.properties ?? {};

  return {
    id: String(feature.id ?? p.id ?? p.habitation_id ?? ""),

    name: String(
      p.name ??
        p.habitation_name ??
        feature.id ??
        p.habitation_id ??
        "Unknown Habitation",
    ),

    population: Number(p.population ?? p.affected_population ?? 0),

    vulnerability_score: Number(p.vulnerability_score ?? p.risk_score ?? 0),

    hazard_exposure: Array.isArray(p.hazard_exposure) ? p.hazard_exposure : [],

    nearest_shelter_id: p.nearest_shelter_id ?? null,

    nearest_shelter_distance_m: p.nearest_shelter_distance_m ?? null,

    evacuation_route_id: p.evacuation_route_id ?? null,

    is_accessible: p.is_accessible !== false,

    priority_rank: p.priority_rank ?? null,

    geometry: feature.geometry,

    properties: p,
  };
}

function featureToSite(feature: GeoJSONFeature): Site {
  const p = (feature.properties ?? feature) as Record<string, any>;

  return {
    id: String(feature.id ?? p.id ?? p.site_id ?? ""),

    name: String(
      p.name ?? p.site_name ?? feature.id ?? p.site_id ?? "Unknown Site",
    ),

    area_sqkm: Number(p.area_sqkm ?? p.area ?? 0),

    max_capacity: Number(p.max_capacity ?? p.capacity ?? 0),

    current_allocation: Number(p.current_allocation ?? 0),

    suitability_score: Number(p.suitability_score ?? 0),

    elevation_m: Number(p.elevation_m ?? 0),

    flood_risk: String(p.flood_risk ?? "unknown"),

    land_ownership: String(p.land_ownership ?? "unknown"),

    infrastructure_ready: p.infrastructure_ready !== false,

    water_available: p.water_available !== false,

    power_available: p.power_available !== false,

    road_access: p.road_access !== false,

    available_capacity: Number(
      p.available_capacity ??
        p.effective_capacity ??
        Number(p.max_capacity ?? 0) - Number(p.current_allocation ?? 0),
    ),

    utilization_pct: Number(p.utilization_pct ?? 0),

    geometry: feature.geometry,

    properties: p,
  };
}

function featureToRoute(feature: GeoJSONFeature): Route {
  const p = feature.properties ?? {};

  return {
    id: String(feature.id ?? p.id ?? p.route_id ?? ""),

    name: String(
      p.name ?? p.route_name ?? feature.id ?? p.route_id ?? "Unknown Route",
    ),

    route_type: String(p.route_type ?? "road"),

    length_km: Number(p.length_km ?? 0),

    travel_time_min: Number(p.travel_time_min ?? 0),

    capacity_per_hour: Number(p.capacity_per_hour ?? 0),

    current_load: Number(p.current_load ?? 0),

    status: String(p.status ?? "open"),

    bridge_dependencies: Array.isArray(p.bridge_dependencies)
      ? p.bridge_dependencies
      : [],

    last_assessment: p.last_assessment ?? null,

    geometry: feature.geometry,

    is_feasible: p.is_feasible !== false,

    utilization_pct: Number(p.utilization_pct ?? 0),

    properties: p,
  };
}

// =============================================================================
// Error formatting
// =============================================================================

function formatApiError(status: number, errorBody: any): string {
  const detail = errorBody?.detail;

  // FastAPI validation errors
  if (Array.isArray(detail)) {
    const messages = detail.map((item: any) => {
      if (typeof item === "string") {
        return item;
      }

      const message = item?.msg ?? item?.message;

      const location = Array.isArray(item?.loc) ? item.loc.join(" → ") : "";

      if (message && location) {
        return `${location}: ${message}`;
      }

      if (message) {
        return message;
      }

      try {
        return JSON.stringify(item);
      } catch {
        return String(item);
      }
    });

    return `HTTP ${status}: ${messages.join(" | ")}`;
  }

  // Object detail
  if (detail && typeof detail === "object") {
    try {
      return `HTTP ${status}: ${JSON.stringify(detail)}`;
    } catch {
      return `HTTP ${status}`;
    }
  }

  // String detail
  if (typeof detail === "string" && detail.trim()) {
    return `HTTP ${status}: ${detail}`;
  }

  // Other JSON response
  if (errorBody && typeof errorBody === "object") {
    try {
      return `HTTP ${status}: ${JSON.stringify(errorBody)}`;
    } catch {
      return `HTTP ${status}`;
    }
  }

  return `HTTP ${status}`;
}

// =============================================================================
// Generic fetch helper
// =============================================================================

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      "Content-Type": "application/json",

      ...(options?.headers || {}),
    },

    ...options,
  });

  if (!response.ok) {
    let errorBody: any = null;

    try {
      errorBody = await response.json();
    } catch {
      errorBody = null;
    }

    throw new Error(formatApiError(response.status, errorBody));
  }

  return response.json();
}

// =============================================================================
// API
// =============================================================================

export const api = {
  // ===========================================================================
  // HABITATIONS
  // ===========================================================================

  habitations: {
    list: async (params?: {
      page?: number;
      page_size?: number;
      accessible_only?: boolean;
      min_vulnerability?: number;
    }) => {
      const query = new URLSearchParams();

      if (params?.page !== undefined) {
        query.set("page", String(params.page));
      }

      if (params?.page_size !== undefined) {
        query.set("page_size", String(params.page_size));
      }

      if (params?.accessible_only !== undefined) {
        query.set("accessible_only", String(params.accessible_only));
      }

      if (params?.min_vulnerability !== undefined) {
        query.set("min_vulnerability", String(params.min_vulnerability));
      }

      const data = await fetchJson<{
        habitations: any[];
        total: number;
        page: number;
        page_size: number;
      }>(`/habitations${query.toString() ? `?${query.toString()}` : ""}`);

      const habitations = data.habitations.map(featureToHabitation);

      return {
        habitations,
        features: data.habitations,
        total: data.total,
        page: data.page,
        page_size: data.page_size,
      };
    },

    get: (id: string) => fetchJson<Habitation>(`/habitations/${id}`),
  },

  // ===========================================================================
  // SITES
  // ===========================================================================

  sites: {
    list: async (params?: {
      page?: number;
      page_size?: number;
      available_only?: boolean;
    }) => {
      const query = new URLSearchParams();

      if (params?.page !== undefined) {
        query.set("page", String(params.page));
      }

      if (params?.page_size !== undefined) {
        query.set("page_size", String(params.page_size));
      }

      if (params?.available_only !== undefined) {
        query.set("available_only", String(params.available_only));
      }

      const data = await fetchJson<{
        sites: any[];
        total: number;
        page: number;
        page_size: number;
      }>(`/sites${query.toString() ? `?${query.toString()}` : ""}`);

      const sites = data.sites.map(featureToSite);

      return {
        sites,
        features: data.sites,
        total: data.total,
        page: data.page,
        page_size: data.page_size,
      };
    },

    get: (id: string) => fetchJson<Site>(`/sites/${id}`),
  },

  // ===========================================================================
  // ROUTES
  // ===========================================================================

  routes: {
    list: async (params?: {
      page?: number;
      page_size?: number;
      open_only?: boolean;
      route_type?: string;
    }) => {
      const query = new URLSearchParams();

      if (params?.page !== undefined) {
        query.set("page", String(params.page));
      }

      if (params?.page_size !== undefined) {
        query.set("page_size", String(params.page_size));
      }

      if (params?.open_only !== undefined) {
        query.set("open_only", String(params.open_only));
      }

      if (params?.route_type) {
        query.set("route_type", params.route_type);
      }

      const data = await fetchJson<{
        routes: any[];
        total: number;
        page: number;
        page_size: number;
      }>(`/routes${query.toString() ? `?${query.toString()}` : ""}`);

      const routes = data.routes.map(featureToRoute);

      return {
        routes,
        features: data.routes,
        total: data.total,
        page: data.page,
        page_size: data.page_size,
      };
    },

    get: (id: string) => fetchJson<Route>(`/routes/${id}`),

    feasible: async () => {
      const data = await fetchJson<{
        routes: any[];
        total: number;
        page: number;
        page_size: number;
      }>(`/routes?page=1&page_size=200&open_only=true`);

      return data.routes.map(featureToRoute);
    },
  },

  // ===========================================================================
  // ROUTE FEASIBILITY
  // ===========================================================================

  feasibility: {
    all: async () => {
      const data = await fetchJson<{
        routes: any[];
        total: number;
        page: number;
        page_size: number;
      }>(`/routes?page=1&page_size=200&open_only=false`);

      const routes = data.routes.map(featureToRoute);

      return {
        routes,
        total: routes.length,

        feasible_count: routes.filter((route) => route.is_feasible).length,

        infeasible_count: routes.filter((route) => !route.is_feasible).length,
      };
    },

    fromHabitation: async (habitationId: string) => {
      return {
        routes: [],
        total: 0,
        feasible_count: 0,
        infeasible_count: 0,
        habitation_id: habitationId,
      };
    },

    toSite: async (siteId: string) => {
      return {
        routes: [],
        total: 0,
        feasible_count: 0,
        infeasible_count: 0,
        site_id: siteId,
      };
    },
  },

  // ===========================================================================
  // OPTIMIZATION
  // ===========================================================================

  optimization: {
    run: (body: {
      habitation_ids?: string[];
      site_ids?: string[];
      time_limit_seconds?: number;
    }) =>
      fetchJson<OptimizationResponse>(`/optimization/relocation`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },

  // ===========================================================================
  // PLAN
  // ===========================================================================

  plan: {
    active: async () => {
      const response = await fetchJson<any>(`/plan/active`);

      const rawPlan = response?.plan ?? response;

      const allVersions = Array.isArray(response?.all_versions)
        ? response.all_versions
        : [];

      return {
        plan: rawPlan,

        all_versions: allVersions,
      };
    },

    approve: async (planId?: string) => {
      const options: RequestInit = {
        method: "POST",
      };

      if (planId) {
        options.body = JSON.stringify({
          plan_id: planId,
        });
      }

      return fetchJson<any>(`/plan/approve`, options);
    },
  },

  // ===========================================================================
  // EVENTS
  // ===========================================================================

  events: {
    trigger: async (event: DisasterEvent) => {
      /*
       * Keep this console output temporarily.
       * It lets us verify the exact payload
       * being sent from the dashboard.
       */
      console.log("[Aapda Setu] Disaster event:", event);

      return fetchJson<EventTriggerResponse>(`/events/trigger`, {
        method: "POST",
        body: JSON.stringify(event),
      });
    },

    /*
     * No verified event-log endpoint.
     * Return a safe empty state.
     */
    log: async (): Promise<EventLogResponse> => {
      return {
        events: [],
        total: 0,
      };
    },
  },
};

// =============================================================================
// Health / Readiness
// =============================================================================

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  data_mode: string;
}

export interface ReadinessResponse {
  status: string;
  service: string;
}

export async function getHealth() {
  return fetchJson<HealthResponse>("/health");
}

export async function getReadiness() {
  return fetchJson<ReadinessResponse>("/ready");
}

export async function getApiHealth() {
  return fetchJson<HealthResponse>("/health");
}

// =============================================================================
// Convenience functions
// =============================================================================

export async function runOptimization(body: {
  habitation_ids?: string[];
  site_ids?: string[];
  time_limit_seconds?: number;
}) {
  return api.optimization.run(body);
}

export async function triggerEvent(event: DisasterEvent) {
  return api.events.trigger(event);
}

export async function getActivePlan() {
  return api.plan.active();
}

export async function approvePlan(planId?: string) {
  return api.plan.approve(planId);
}

export async function getEventLog() {
  return api.events.log();
}

export async function getHabitations(params?: { accessible_only?: boolean }) {
  return api.habitations.list({
    ...params,
    page_size: 100,
  });
}

export async function getSites(params?: { available_only?: boolean }) {
  return api.sites.list({
    ...params,
    page_size: 100,
  });
}

export async function getRoutes(params?: { open_only?: boolean }) {
  return api.routes.list({
    ...params,
    page_size: 100,
  });
}

// =============================================================================
// Route Feasibility
// =============================================================================

export interface RouteFeasibilityRequest {
  habitation_id: string;
  site_id: string;
}

export interface RouteFeasibilityResponse {
  habitation_id: string;
  site_id: string;
  feasible: boolean;
  distance_km: number | null;
  travel_time_min: number | null;
  reason: string;
  route_used: string | null;
  bottlenecks: string[];
}

export interface RouteFeasibilityListResponse {
  routes: RouteFeasibilityResponse[];
  total: number;
  feasible_count: number;
  infeasible_count: number;
}

export async function checkRouteFeasibility(
  habitationId: string,
  siteId: string,
) {
  return fetchJson<RouteFeasibilityResponse>(
    `/intelligence/route/feasibility/habitation/${habitationId}?site_id=${siteId}`,
  );
}

export async function checkAllRoutesFromHabitation(habitationId: string) {
  return fetchJson<RouteFeasibilityListResponse>(
    `/intelligence/route/feasibility/habitation/${habitationId}`,
  );
}

export async function checkAllRoutesToSite(siteId: string) {
  return fetchJson<RouteFeasibilityListResponse>(
    `/intelligence/route/feasibility/site/${siteId}`,
  );
}

export async function getAllRouteFeasibility() {
  return api.feasibility.all();
}

// =============================================================================
// ML Predictive Risk
// =============================================================================

export interface PredictedRiskRequest {
  habitation_id: string;
  weather?: Record<string, number>;
}

export interface PredictedRiskResponse {
  habitation_id: string;
  habitation_name: string;
  deterministic_risk_level: string;
  ml_risk_level: string;
  final_risk_level: string;
  ml_probabilities: Record<string, number>;
  explanation: string;
  data_source: string;
  ml_model: string;
}

export interface PredictedRiskListResponse {
  predictions: PredictedRiskResponse[];
  total: number;
}

// =============================================================================
// Risk Assessment (Deterministic)
// =============================================================================

export interface RiskAssessmentResponse {
  habitation_id: string;
  habitation_name: string;
  total_score: number;
  risk_level: string;
  factors: {
    vulnerability_score: number;
    flood_exposure: number;
    erosion_exposure: number;
    storm_surge_exposure: number;
    population_factor: number;
    accessibility_factor: number;
  };
  explanation: string;
}

export interface RiskAssessmentListResponse {
  assessments: RiskAssessmentResponse[];
  total: number;
  red_zone_count: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
}

export async function getRiskAssessments() {
  return fetchJson<RiskAssessmentListResponse>("/intelligence/risk");
}

export async function getRiskAssessment(habitationId: string) {
  return fetchJson<RiskAssessmentResponse>(
    `/intelligence/risk/${habitationId}`,
  );
}

export async function getRedZoneHabitations() {
  return fetchJson<RiskAssessmentResponse[]>("/intelligence/risk/red-zone");
}

export async function predictRisk(request: PredictedRiskRequest) {
  return fetchJson<PredictedRiskResponse>(`/intelligence/risk/predict`, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function predictRiskBatch(weather?: Record<string, number>) {
  const query = weather
    ? `?${new URLSearchParams(
        Object.entries(weather).map(([key, value]) => [key, String(value)]),
      ).toString()}`
    : "";

  return fetchJson<PredictedRiskListResponse>(
    `/intelligence/risk/predict/batch${query}`,
  );
}

// =============================================================================
// SMS / Notification Log
// =============================================================================

export interface SMSLogEntry {
  id: string;
  plan_id: string;
  plan_version: number;
  message_type: string;
  recipient_count: number;
  message_template: string;
  message_content: string;
  status: string;
  created_at: string;
  sent_at?: string;
  delivered_at?: string;
  metadata?: Record<string, any>;
}

export interface SMSLogResponse {
  entries: SMSLogEntry[];
  total: number;
}

export async function getSMSLog(planId?: string, limit: number = 100) {
  const query = new URLSearchParams();

  if (planId) {
    query.set("plan_id", planId);
  }

  query.set("limit", String(limit));

  return fetchJson<SMSLogResponse>(
    `/notifications/sms-log?${query.toString()}`,
  );
}

// =============================================================================
// Plan Approval + SMS
// =============================================================================

export interface PlanApprovalRequest {
  plan_id: string;
}

export interface PlanApprovalResponse {
  success: boolean;
  plan_id?: string;
  plan_version?: number;

  sms_notification?: {
    id: string;
    status: string;
    message_type: string;
    recipient_count: number;
    sent_at: string;
  };

  evacuation_orders_sent?: number;

  error?: string;
}

export async function approvePlanAndNotify(request: PlanApprovalRequest) {
  return fetchJson<PlanApprovalResponse>(`/plan/approve`, {
    method: "POST",
    body: JSON.stringify(request),
  });
}
