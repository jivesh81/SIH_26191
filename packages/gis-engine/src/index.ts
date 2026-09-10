// GIS Engine - Core geometry and spatial operations
// Pure TypeScript functions, no external dependencies except @turf/turf

import * as turf from '@turf/turf';
import type {
  Position,
  BoundingBox,
  GeoJSONFeature,
  GeoJSONFeatureCollection,
  AdminBoundaryProperties,
  HazardZoneProperties,
  InfrastructureProperties,
  ShelterProperties,
  PopulationGridProperties,
  VulnerableHabitationProperties,
  RelocationSiteProperties,
  EvacuationRouteProperties,
} from '@aapda-setu/shared-types';

export { turf };

// Coordinate utilities
export function lngLatToPosition(coord: [number, number]): Position {
  return { longitude: coord[0], latitude: coord[1] };
}

export function positionToLngLat(pos: Position): [number, number] {
  return [pos.longitude, pos.latitude];
}

export function calculateBounds(features: GeoJSONFeature[]): BoundingBox {
  const bbox = turf.bbox(turf.featureCollection(features));
  return {
    minLng: bbox[0],
    minLat: bbox[1],
    maxLng: bbox[2],
    maxLat: bbox[3],
  };
}

export function isPointInPolygon(point: Position, polygon: GeoJSONFeature): boolean {
  const pt = turf.point([point.longitude, point.latitude]);
  return turf.booleanPointInPolygon(pt, polygon);
}

export function distanceBetween(p1: Position, p2: Position, units: 'kilometers' | 'meters' = 'kilometers'): number {
  return turf.distance(
    turf.point([p1.longitude, p1.latitude]),
    turf.point([p2.longitude, p2.latitude]),
    { units }
  );
}

// Risk scoring engine
export interface RiskFactors {
  floodRisk: number;        // 0-1
  erosionRisk: number;      // 0-1
  stormSurgeRisk: number;   // 0-1
  landslideRisk: number;    // 0-1
  vulnerabilityIndex: number; // 0-1
  populationDensity: number;  // normalized 0-1
}

export function calculateCompositeRisk(factors: RiskFactors, weights?: Partial<Record<keyof RiskFactors, number>>): number {
  const defaultWeights: Record<keyof RiskFactors, number> = {
    floodRisk: 0.30,
    erosionRisk: 0.15,
    stormSurgeRisk: 0.10,
    landslideRisk: 0.10,
    vulnerabilityIndex: 0.20,
    populationDensity: 0.15,
  };

  const w = { ...defaultWeights, ...weights };
  let score = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(w)) {
    score += factors[key as keyof RiskFactors] * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? score / totalWeight : 0;
}

export function classifyRiskLevel(score: number): 'very_low' | 'low' | 'medium' | 'high' | 'very_high' | 'extreme' {
  if (score >= 0.8) return 'extreme';
  if (score >= 0.6) return 'very_high';
  if (score >= 0.4) return 'high';
  if (score >= 0.25) return 'medium';
  if (score >= 0.1) return 'low';
  return 'very_low';
}

export function identifyRedZones(
  habitations: GeoJSONFeature<VulnerableHabitationProperties>[],
  threshold: number = 0.6
): GeoJSONFeature<VulnerableHabitationProperties>[] {
  return habitations.filter(h => {
    const risk = h.properties.vulnerability_score;
    return risk >= threshold;
  });
}

// Capacity engine
export interface CapacityCalculation {
  nominalCapacity: number;
  effectiveCapacity: number;
  occupancy: number;
  utilizationPct: number;
  buffer: number;
  status: 'adequate' | 'stressed' | 'critical' | 'overflow';
}

export function calculateEffectiveCapacity(shelter: GeoJSONFeature<ShelterProperties>): CapacityCalculation {
  const props = shelter.properties;
  const nominal = props.capacity;
  const effective = props.effective_capacity;
  const occupancy = props.current_occupancy;
  const utilization = effective > 0 ? occupancy / effective : 1;
  const buffer = effective - occupancy;

  let status: CapacityCalculation['status'];
  if (utilization >= 1) status = 'overflow';
  else if (utilization >= 0.8) status = 'critical';
  else if (utilization >= 0.6) status = 'stressed';
  else status = 'adequate';

  return {
    nominalCapacity: nominal,
    effectiveCapacity: effective,
    occupancy,
    utilizationPct: utilization * 100,
    buffer,
    status,
  };
}

export function aggregateCapacity(shelters: GeoJSONFeature<ShelterProperties>[]): {
  totalNominal: number;
  totalEffective: number;
  totalOccupancy: number;
  overallUtilization: number;
  sheltersByStatus: Record<CapacityCalculation['status'], number>;
} {
  const results = shelters.map(calculateEffectiveCapacity);
  const totalNominal = results.reduce((sum, r) => sum + r.nominalCapacity, 0);
  const totalEffective = results.reduce((sum, r) => sum + r.effectiveCapacity, 0);
  const totalOccupancy = results.reduce((sum, r) => sum + r.occupancy, 0);

  const sheltersByStatus: Record<CapacityCalculation['status'], number> = {
    adequate: 0,
    stressed: 0,
    critical: 0,
    overflow: 0,
  };
  results.forEach(r => { sheltersByStatus[r.status]++; });

  return {
    totalNominal,
    totalEffective,
    totalOccupancy,
    overallUtilization: totalEffective > 0 ? (totalOccupancy / totalEffective) * 100 : 0,
    sheltersByStatus,
  };
}

// Route feasibility engine
export interface RouteFeasibilityResult {
  routeId: string;
  isFeasible: boolean;
  travelTimeMin: number;
  distanceKm: number;
  bottlenecks: string[];
  capacityUtilization: number;
  blockedSegments: string[];
  bridgeStatus: Array<{ bridgeId: string; status: 'open' | 'congested' | 'impassable' }>;
}

export function assessRouteFeasibility(
  route: GeoJSONFeature<EvacuationRouteProperties>,
  shelters: GeoJSONFeature<ShelterProperties>[],
  infrastructure: GeoJSONFeature<InfrastructureProperties>[],
  populationLoad: number
): RouteFeasibilityResult {
  const props = route.properties;
  const bridges = infrastructure.filter(f => f.properties.infra_type === 'bridge');

  const bridgeStatus = bridges.map(b => ({
    bridgeId: b.properties.id,
    status: b.properties.condition === 'collapsed' ? 'impassable' :
            b.properties.condition === 'poor' ? 'congested' : 'open' as const,
  }));

  const impassableBridges = bridgeStatus.filter(b => b.status === 'impassable').length;
  const congestedBridges = bridgeStatus.filter(b => b.status === 'congested').length;

  const isFeasible = impassableBridges === 0;
  const travelTime = isFeasible
    ? props.travel_time_min * (1 + congestedBridges * 0.3)
    : Infinity;

  const bottlenecks = bridgeStatus
    .filter(b => b.status !== 'open')
    .map(b => b.bridgeId);

  const capacityUtilization = props.capacity_per_hour > 0
    ? populationLoad / props.capacity_per_hour
    : 1;

  return {
    routeId: props.id,
    isFeasible,
    travelTimeMin: travelTime,
    distanceKm: props.length_km,
    bottlenecks,
    capacityUtilization,
    blockedSegments: impassableBridges > 0 ? ['bridge_closure'] : [],
    bridgeStatus,
  };
}

// Spatial join utilities
export function findNearestShelter(
  habitation: GeoJSONFeature<VulnerableHabitationProperties>,
  shelters: GeoJSONFeature<ShelterProperties>[]
): { shelter: GeoJSONFeature<ShelterProperties>; distanceKm: number } | null {
  if (shelters.length === 0) return null;

  const habPoint = turf.point([
    habitation.geometry!.coordinates[0],
    habitation.geometry!.coordinates[1],
  ]);

  let nearest = shelters[0];
  let minDist = Infinity;

  for (const shelter of shelters) {
    const shelterPoint = turf.point([
      shelter.geometry!.coordinates[0],
      shelter.geometry!.coordinates[1],
    ]);
    const dist = turf.distance(habPoint, shelterPoint, { units: 'kilometers' });
    if (dist < minDist) {
      minDist = dist;
      nearest = shelter;
    }
  }

  return { shelter: nearest, distanceKm: minDist };
}

export function findAccessibleRoutes(
  habitation: GeoJSONFeature<VulnerableHabitationProperties>,
  routes: GeoJSONFeature<EvacuationRouteProperties>[],
  maxDistanceKm: number = 50
): GeoJSONFeature<EvacuationRouteProperties>[] {
  const habPoint = turf.point([
    habitation.geometry!.coordinates[0],
    habitation.geometry!.coordinates[1],
  ]);

  return routes.filter(route => {
    if (route.properties.status === 'impassable') return false;

    const routeLine = route.geometry!;
    const nearestPoint = turf.nearestPointOnLine(routeLine, habPoint);
    const dist = turf.distance(habPoint, nearestPoint, { units: 'kilometers' });

    return dist <= maxDistanceKm;
  });
}

// Grid operations
export function createPopulationGrid(
  bounds: BoundingBox,
  cellSizeKm: number = 1
): GeoJSONFeatureCollection<PopulationGridProperties> {
  const grid = turf.squareGrid(
    [bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat],
    cellSizeKm,
    { units: 'kilometers', mask: turf.bboxPolygon([bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat]) }
  );

  return {
    type: 'FeatureCollection',
    features: grid.features.map((cell, idx) => ({
      ...cell,
      id: `grid_${idx}`,
      properties: {
        id: `grid_${idx}`,
        population: 0,
        vulnerability_index: 0,
        habitation_type: 'rural',
        households: 0,
        female_population: 0,
        child_population: 0,
        elderly_population: 0,
        disabled_population: 0,
      },
    })),
  };
}

// Validation
export function validateGeoJSONFeature<T>(feature: unknown): feature is GeoJSONFeature<T> {
  if (!feature || typeof feature !== 'object') return false;
  const f = feature as Record<string, unknown>;
  return f.type === 'Feature' &&
         f.geometry !== null &&
         f.geometry !== undefined &&
         typeof f.properties === 'object';
}

export function validateFeatureCollection<T>(fc: unknown): fc is GeoJSONFeatureCollection<T> {
  if (!fc || typeof fc !== 'object') return false;
  const f = fc as Record<string, unknown>;
  return f.type === 'FeatureCollection' && Array.isArray(f.features);
}