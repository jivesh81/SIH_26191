const API_BASE = 'http://localhost:8000';

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
  geometry?: {
    type: string;
    coordinates: number[];
  };
  properties?: Record<string, any>;
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
  severity: 'warning' | 'critical';
  recommendation: string;
}

export interface OptimizationResponse {
  status: string;
  assignments: OptimizationAssignment[];
  total_assigned_population: number;
  total_unmet_population: number;
  site_capacities: Record<
    string,
    SiteCapacitySummary
  >;
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

/*
 * Matches the ACTUAL backend /plan response:
 *
 * plan_status
 * assignments
 * unmet_habitations
 * unmet_priority_count
 * unmet_other_count
 * total_distance_km
 * approval_status
 * last_event
 */
export interface BackendPlanResponse {
  plan_status: string;

  assignments: Array<{
    habitation_id: string;
    site_id: string;
    households?: number;
    distance_km?: number;
    travel_time_min?: number;
  }>;

  unmet_habitations: string[];

  unmet_priority_count: number;

  unmet_other_count: number;

  total_distance_km: number;

  approval_status: string;

  last_event?: {
    event_type?: string;
    target_id?: string;
    magnitude?: number;
  } | null;
}

export interface ActivePlanResponse {
  plan: any;
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
  | 'rainfall'
  | 'bridge_collapse'
  | 'capacity_reduction'
  | 'combined';

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

interface GeoJSONFeature<
  T = Record<string, any>
> {
  type: 'Feature';
  geometry?: any;
  properties?: T;
  id?: string;
}

interface GeoJSONFeatureCollection<
  T = Record<string, any>
> {
  type: 'FeatureCollection';
  features: Array<
    GeoJSONFeature<T>
  >;
}

function featureToHabitation(
  feature: GeoJSONFeature
): Habitation {
  const p =
    feature.properties ?? {};

  return {
    id: String(
      feature.id ??
      p.id ??
      p.habitation_id ??
      ''
    ),

    name: String(
      p.name ??
      p.habitation_name ??
      feature.id ??
      p.habitation_id ??
      'Unknown Habitation'
    ),

    population: Number(
      p.population ??
      p.affected_population ??
      0
    ),

    vulnerability_score: Number(
      p.vulnerability_score ??
      p.risk_score ??
      0
    ),

    hazard_exposure:
      Array.isArray(
        p.hazard_exposure
      )
        ? p.hazard_exposure
        : [],

    nearest_shelter_id:
      p.nearest_shelter_id ??
      null,

    nearest_shelter_distance_m:
      p.nearest_shelter_distance_m ??
      null,

    evacuation_route_id:
      p.evacuation_route_id ??
      null,

    is_accessible:
      p.is_accessible !== false,

    priority_rank:
      p.priority_rank ?? null,

    geometry:
      feature.geometry,

    properties: p,
  };
}

function featureToSite(
  feature: GeoJSONFeature
): Site {
  const p =
    feature.properties ?? {};

  return {
    id: String(
      feature.id ??
      p.id ??
      p.site_id ??
      ''
    ),

    name: String(
      p.name ??
      p.site_name ??
      feature.id ??
      p.site_id ??
      'Unknown Site'
    ),

    area_sqkm: Number(
      p.area_sqkm ??
      p.area ??
      0
    ),

    max_capacity: Number(
      p.max_capacity ??
      p.capacity ??
      0
    ),

    current_allocation: Number(
      p.current_allocation ?? 0
    ),

    suitability_score: Number(
      p.suitability_score ?? 0
    ),

    elevation_m: Number(
      p.elevation_m ?? 0
    ),

    flood_risk: String(
      p.flood_risk ??
      'unknown'
    ),

    land_ownership: String(
      p.land_ownership ??
      'unknown'
    ),

    infrastructure_ready:
      p.infrastructure_ready !== false,

    water_available:
      p.water_available !== false,

    power_available:
      p.power_available !== false,

    road_access:
      p.road_access !== false,

    available_capacity: Number(
      p.available_capacity ??
      p.effective_capacity ??
      0
    ),

    utilization_pct: Number(
      p.utilization_pct ?? 0
    ),

    geometry:
      feature.geometry,

    properties: p,
  };
}

function featureToRoute(
  feature: GeoJSONFeature
): Route {
  const p =
    feature.properties ?? {};

  return {
    id: String(
      feature.id ??
      p.id ??
      p.route_id ??
      ''
    ),

    name: String(
      p.name ??
      p.route_name ??
      feature.id ??
      'Unknown Route'
    ),

    route_type: String(
      p.route_type ??
      'road'
    ),

    length_km: Number(
      p.length_km ?? 0
    ),

    travel_time_min: Number(
      p.travel_time_min ?? 0
    ),

    capacity_per_hour: Number(
      p.capacity_per_hour ?? 0
    ),

    current_load: Number(
      p.current_load ?? 0
    ),

    status: String(
      p.status ?? 'open'
    ),

    bridge_dependencies:
      Array.isArray(
        p.bridge_dependencies
      )
        ? p.bridge_dependencies
        : [],

    last_assessment:
      p.last_assessment ?? null,

    geometry:
      feature.geometry,

    is_feasible:
      p.is_feasible !== false,

    utilization_pct: Number(
      p.utilization_pct ?? 0
    ),

    properties: p,
  };
}

async function fetchJson<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response =
    await fetch(
      `${API_BASE}${url}`,
      {
        headers: {
          'Content-Type':
            'application/json',
        },
        ...options,
      }
    );

  if (!response.ok) {
    const error =
      await response
        .json()
        .catch(() => ({
          detail:
            `HTTP ${response.status}`,
        }));

    throw new Error(
      error.detail ||
      `HTTP ${response.status}`
    );
  }

  return response.json();
}

export const api = {
  habitations: {
    list: async (
      params?: {
        page?: number;
        page_size?: number;
        accessible_only?: boolean;
        min_vulnerability?: number;
      }
    ) => {
      const query =
        new URLSearchParams();

      if (
        params?.page !== undefined
      ) {
        query.set(
          'page',
          String(params.page)
        );
      }

      if (
        params?.page_size !== undefined
      ) {
        query.set(
          'page_size',
          String(params.page_size)
        );
      }

      if (
        params?.accessible_only !==
        undefined
      ) {
        query.set(
          'accessible_only',
          String(
            params.accessible_only
          )
        );
      }

      if (
        params?.min_vulnerability !==
        undefined
      ) {
        query.set(
          'min_vulnerability',
          String(
            params.min_vulnerability
          )
        );
      }

      const data =
        await fetchJson<
          GeoJSONFeatureCollection
        >(
          `/habitations${query.toString()
            ? `?${query.toString()}`
            : ''
          }`
        );

      const habitations =
        data.features.map(
          featureToHabitation
        );

      return {
        habitations,
        features:
          data.features,
        total:
          habitations.length,
        page:
          params?.page ?? 1,
        page_size:
          params?.page_size ??
          habitations.length,
      };
    },

    get: (id: string) =>
      fetchJson<Habitation>(
        `/habitations/${id}`
      ),
  },

  sites: {
    list: async (
      params?: {
        page?: number;
        page_size?: number;
        available_only?: boolean;
      }
    ) => {
      const query =
        new URLSearchParams();

      if (
        params?.page !== undefined
      ) {
        query.set(
          'page',
          String(params.page)
        );
      }

      if (
        params?.page_size !== undefined
      ) {
        query.set(
          'page_size',
          String(params.page_size)
        );
      }

      if (
        params?.available_only !==
        undefined
      ) {
        query.set(
          'available_only',
          String(
            params.available_only
          )
        );
      }

      const data =
        await fetchJson<
          GeoJSONFeatureCollection
        >(
          `/sites${query.toString()
            ? `?${query.toString()}`
            : ''
          }`
        );

      const sites =
        data.features.map(
          featureToSite
        );

      return {
        sites,
        features:
          data.features,
        total:
          sites.length,
        page:
          params?.page ?? 1,
        page_size:
          params?.page_size ??
          sites.length,
      };
    },

    get: (id: string) =>
      fetchJson<Site>(
        `/sites/${id}`
      ),
  },

  routes: {
    list: async (
      params?: {
        page?: number;
        page_size?: number;
        open_only?: boolean;
        route_type?: string;
      }
    ) => {
      const query =
        new URLSearchParams();

      if (
        params?.page !== undefined
      ) {
        query.set(
          'page',
          String(params.page)
        );
      }

      if (
        params?.page_size !== undefined
      ) {
        query.set(
          'page_size',
          String(params.page_size)
        );
      }

      if (
        params?.open_only !==
        undefined
      ) {
        query.set(
          'open_only',
          String(params.open_only)
        );
      }

      if (params?.route_type) {
        query.set(
          'route_type',
          params.route_type
        );
      }

      const data =
        await fetchJson<
          GeoJSONFeatureCollection
        >(
          `/roads${query.toString()
            ? `?${query.toString()}`
            : ''
          }`
        );

      const routes =
        data.features.map(
          featureToRoute
        );

      return {
        routes,
        features:
          data.features,
        total:
          routes.length,
        page:
          params?.page ?? 1,
        page_size:
          params?.page_size ??
          routes.length,
      };
    },

    get: (id: string) =>
      fetchJson<Route>(
        `/roads/${id}`
      ),

    feasible: () =>
      fetchJson<Route[]>(
        `/roads/feasible`
      ),
  },

  feasibility: {
    all: async () => {
      const data =
        await fetchJson<any>(
          `/roads`
        );

      const routes =
        Array.isArray(data)
          ? data
          : data?.features ?? [];

      return {
        routes,
        total:
          routes.length,
        feasible_count:
          routes.length,
        infeasible_count: 0,
      };
    },

    fromHabitation: async (
      habitationId: string
    ) => ({
      routes: [],
      total: 0,
      feasible_count: 0,
      infeasible_count: 0,
      habitation_id:
        habitationId,
    }),

    toSite: async (
      siteId: string
    ) => ({
      routes: [],
      total: 0,
      feasible_count: 0,
      infeasible_count: 0,
      site_id: siteId,
    }),
  },

  optimization: {
    run: (
      body: {
        habitation_ids?: string[];
        site_ids?: string[];
        time_limit_seconds?: number;
      }
    ) =>
      fetchJson<OptimizationResponse>(
        `/optimization/relocation`,
        {
          method: 'POST',
          body:
            JSON.stringify(body),
        }
      ),
  },

  plan: {
    /*
     * Backend exposes /plan.
     */
    active: async () => {
      const backendPlan =
        await fetchJson<
          BackendPlanResponse
        >(`/plan`);

      const assignedPopulation =
        backendPlan.assignments.reduce(
          (
            sum,
            assignment
          ) =>
            sum +
            Number(
              assignment.households ??
              0
            ),
          0
        );

      const unmetPopulation =
        backendPlan
          .unmet_habitations
          .length;

      return {
        plan: {
          version: 1,

          plan_id:
            'current',

          status:
            backendPlan.plan_status ??
            'UNKNOWN',

          total_assigned_population:
            assignedPopulation,

          total_unmet_population:
            unmetPopulation,

          optimization_status:
            backendPlan.plan_status ??
            'UNKNOWN',

          created_at:
            new Date().toISOString(),

          invalidated_at:
            null,

          invalidation_reason:
            null,

          affected_assignments:
            [],

          affected_sites: [],

          affected_routes: [],

          assignments:
            backendPlan.assignments,

          approval_status:
            backendPlan.approval_status,

          total_distance_km:
            backendPlan.total_distance_km,

          unmet_habitations:
            backendPlan
              .unmet_habitations,

          unmet_priority_count:
            backendPlan
              .unmet_priority_count,

          unmet_other_count:
            backendPlan
              .unmet_other_count,

          last_event:
            backendPlan.last_event ??
            null,
        },

        all_versions: [],
      };
    },

    /*
     * Human authority approval.
     *
     * Backend endpoint:
     * POST /plan/approve
     */
    approve: async () => {
      return fetchJson<any>(
        `/plan/approve`,
        {
          method: 'POST',
        }
      );
    },
  },

  events: {
    /*
     * Current backend exposes
     * /simulate-event.
     */
    trigger: (
      event: DisasterEvent
    ) =>
      fetchJson<EventTriggerResponse>(
        `/simulate-event`,
        {
          method: 'POST',
          body:
            JSON.stringify(event),
        }
      ),

    log: async () => {
      /*
       * No /events route in the
       * currently verified backend.
       */
      return {
        events: [],
        total: 0,
      };
    },
  },
};

export async function runOptimization(
  body: {
    habitation_ids?: string[];
    site_ids?: string[];
    time_limit_seconds?: number;
  }
) {
  return api.optimization.run(
    body
  );
}

export async function triggerEvent(
  event: DisasterEvent
) {
  return api.events.trigger(
    event
  );
}

export async function getActivePlan() {
  return api.plan.active();
}

export async function approvePlan() {
  return api.plan.approve();
}

export async function getEventLog() {
  return api.events.log();
}

export async function getHabitations(
  params?: {
    accessible_only?: boolean;
  }
) {
  return api.habitations.list({
    ...params,
    page_size: 100,
  });
}

export async function getSites(
  params?: {
    available_only?: boolean;
  }
) {
  return api.sites.list({
    ...params,
    page_size: 100,
  });
}

export async function getRoutes(
  params?: {
    open_only?: boolean;
  }
) {
  return api.routes.list({
    ...params,
    page_size: 100,
  });
}

export async function getAllRouteFeasibility() {
  return api.feasibility.all();
}