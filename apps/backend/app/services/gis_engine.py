"""
Python GIS Engine for Aapda Setu.

Provides core geometry and spatial operations equivalent to the TypeScript gis-engine.
Uses shapely, geopandas, and networkx for road-network-aware distance calculations.
"""

from typing import List, Dict, Any, Optional, Tuple, Set
from dataclasses import dataclass
import math

from shapely.geometry import Point, LineString, Polygon, MultiPolygon, shape, mapping
from shapely.ops import nearest_points, transform
from shapely import distance as shapely_distance
import geopandas as gpd
import networkx as nx
from pyproj import Transformer


# Coordinate reference systems
WGS84 = "EPSG:4326"  # Geographic (lat/lon)
UTM_46N = "EPSG:32646"  # Projected for Assam region (meters)

# Transformer for distance calculations in meters
_transformer_to_utm = Transformer.from_crs(WGS84, UTM_46N, always_xy=True)
_transformer_to_wgs = Transformer.from_crs(UTM_46N, WGS84, always_xy=True)


def lnglat_to_point(lng: float, lat: float) -> Point:
    """Create a Shapely Point from longitude/latitude."""
    return Point(lng, lat)


def point_to_lnglat(point: Point) -> Tuple[float, float]:
    """Extract (lng, lat) from a Shapely Point."""
    return (point.x, point.y)


def calculate_bounds(geometries: List[Dict[str, Any]]) -> Dict[str, float]:
    """Calculate bounding box from a list of GeoJSON geometries."""
    all_coords = []
    for geom in geometries:
        coords = _extract_coords_from_geojson(geom)
        all_coords.extend(coords)
    
    if not all_coords:
        return {"minLng": 0, "minLat": 0, "maxLng": 0, "maxLat": 0}
    
    lngs = [c[0] for c in all_coords]
    lats = [c[1] for c in all_coords]
    
    return {
        "minLng": min(lngs),
        "minLat": min(lats),
        "maxLng": max(lngs),
        "maxLat": max(lats),
    }


def _extract_coords_from_geojson(geom: Dict[str, Any]) -> List[Tuple[float, float]]:
    """Extract all coordinates from a GeoJSON geometry."""
    coords = []
    geom_type = geom.get("type")
    geom_coords = geom.get("coordinates", [])
    
    if geom_type == "Point":
        coords.append(tuple(geom_coords))
    elif geom_type == "LineString":
        coords.extend([tuple(c) for c in geom_coords])
    elif geom_type == "Polygon":
        for ring in geom_coords:
            coords.extend([tuple(c) for c in ring])
    elif geom_type == "MultiPolygon":
        for polygon in geom_coords:
            for ring in polygon:
                coords.extend([tuple(c) for c in ring])
    
    return coords


def is_point_in_polygon(point: Point, polygon_geom: Dict[str, Any]) -> bool:
    """Check if a point is inside a polygon geometry."""
    try:
        polygon = shape(polygon_geom)
        return polygon.contains(point)
    except Exception:
        return False


def distance_meters(point1: Point, point2: Point) -> float:
    """
    Calculate distance between two points in meters using UTM projection.
    More accurate than haversine for regional distances.
    """
    # Transform to UTM for accurate meter-based distance
    x1, y1 = _transformer_to_utm.transform(point1.x, point1.y)
    x2, y2 = _transformer_to_utm.transform(point2.x, point2.y)
    return math.hypot(x2 - x1, y2 - y1)


def distance_km(point1: Point, point2: Point) -> float:
    """Calculate distance between two points in kilometers."""
    return distance_meters(point1, point2) / 1000.0


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance using haversine formula (fallback)."""
    R = 6371.0
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c


@dataclass
class RiskFactors:
    """Risk factors for composite risk scoring."""
    flood_risk: float = 0.0
    erosion_risk: float = 0.0
    storm_surge_risk: float = 0.0
    landslide_risk: float = 0.0
    vulnerability_index: float = 0.0
    population_density: float = 0.0


def calculate_composite_risk(
    factors: RiskFactors,
    weights: Optional[Dict[str, float]] = None
) -> float:
    """Calculate composite risk score from weighted factors."""
    default_weights = {
        "flood_risk": 0.30,
        "erosion_risk": 0.15,
        "storm_surge_risk": 0.10,
        "landslide_risk": 0.10,
        "vulnerability_index": 0.20,
        "population_density": 0.15,
    }
    w = {**default_weights, **(weights or {})}
    
    score = 0.0
    total_weight = 0.0
    for key, weight in w.items():
        value = getattr(factors, key, 0.0)
        score += value * weight
        total_weight += weight
    
    return score / total_weight if total_weight > 0 else 0.0


def classify_risk_level(score: float) -> str:
    """Classify risk score into level."""
    if score >= 0.8:
        return "extreme"
    elif score >= 0.6:
        return "very_high"
    elif score >= 0.4:
        return "high"
    elif score >= 0.25:
        return "medium"
    elif score >= 0.1:
        return "low"
    return "very_low"


@dataclass
class CapacityCalculation:
    """Capacity calculation result for a shelter/site."""
    nominal_capacity: int
    effective_capacity: int
    occupancy: int
    utilization_pct: float
    buffer: int
    status: str  # 'adequate' | 'stressed' | 'critical' | 'overflow'


def calculate_effective_capacity(
    nominal: int,
    occupancy: int,
    constraints: Dict[str, float]
) -> CapacityCalculation:
    """
    Calculate effective capacity based on constraint multipliers.
    
    constraints: dict of constraint_name -> multiplier (0.0 to 1.0)
    """
    effective = nominal
    for multiplier in constraints.values():
        effective = min(effective, int(nominal * multiplier))
    
    utilization = occupancy / effective if effective > 0 else 1.0
    buffer = effective - occupancy
    
    if utilization >= 1.0:
        status = "overflow"
    elif utilization >= 0.8:
        status = "critical"
    elif utilization >= 0.6:
        status = "stressed"
    else:
        status = "adequate"
    
    return CapacityCalculation(
        nominal_capacity=nominal,
        effective_capacity=effective,
        occupancy=occupancy,
        utilization_pct=utilization * 100,
        buffer=buffer,
        status=status,
    )


@dataclass
class RouteFeasibilityResult:
    """Route feasibility assessment result."""
    route_id: str
    is_feasible: bool
    travel_time_min: float
    distance_km: float
    bottlenecks: List[str]
    capacity_utilization: float
    blocked_segments: List[str]
    bridge_status: List[Dict[str, str]]


class RoadNetworkGraph:
    """
    Road network graph for routing and distance calculations.
    
    Builds a graph from LineString geometries representing roads,
    with nodes at intersections and endpoints, edges weighted by distance.
    """
    
    def __init__(self):
        self.graph = nx.Graph()
        self.node_coords: Dict[int, Tuple[float, float]] = {}
        self._next_node_id = 0
    
    def add_road(
        self,
        road_id: str,
        coordinates: List[Tuple[float, float]],
        properties: Optional[Dict[str, Any]] = None,
    ):
        """Add a road LineString to the network graph."""
        if len(coordinates) < 2:
            return
        
        props = properties or {}
        road_type = props.get("road_type", "unknown")
        speed_kmh = self._estimate_speed(road_type)
        
        # Create nodes for each coordinate
        node_ids = []
        for lng, lat in coordinates:
            point = Point(lng, lat)
            # Check if node already exists nearby (within 10m)
            existing_id = self._find_nearby_node(point, tolerance_m=10)
            if existing_id is not None:
                node_ids.append(existing_id)
            else:
                node_id = self._next_node_id
                self._next_node_id += 1
                self.graph.add_node(node_id)
                self.node_coords[node_id] = (lng, lat)
                node_ids.append(node_id)
        
        # Add edges between consecutive nodes
        for i in range(len(node_ids) - 1):
            u, v = node_ids[i], node_ids[i + 1]
            coord_u = self.node_coords[u]
            coord_v = self.node_coords[v]
            
            point_u = Point(coord_u)
            point_v = Point(coord_v)
            dist_km = distance_km(point_u, point_v)
            travel_time = (dist_km / speed_kmh) * 60 if speed_kmh > 0 else float('inf')
            
            # Add edge with travel time as weight
            if self.graph.has_edge(u, v):
                # Keep the better (faster) edge
                existing_time = self.graph[u][v].get("travel_time", float('inf'))
                if travel_time < existing_time:
                    self.graph[u][v].update({
                        "road_id": road_id,
                        "distance_km": dist_km,
                        "travel_time": travel_time,
                        "speed_kmh": speed_kmh,
                    })
            else:
                self.graph.add_edge(u, v, 
                    road_id=road_id,
                    distance_km=dist_km,
                    travel_time=travel_time,
                    speed_kmh=speed_kmh,
                )
    
    def _estimate_speed(self, road_type: str) -> float:
        """Estimate speed in km/h based on road type."""
        speeds = {
            "national_highway": 80,
            "nh": 80,
            "state_highway": 60,
            "sh": 60,
            "district_road": 40,
            "rural": 30,
            "gravel": 20,
            "unknown": 40,
        }
        return speeds.get(road_type.lower(), 40)
    
    def _find_nearby_node(self, point: Point, tolerance_m: float = 10) -> Optional[int]:
        """Find existing node within tolerance distance."""
        for node_id, (lng, lat) in self.node_coords.items():
            existing = Point(lng, lat)
            if distance_meters(point, existing) * 1000 <= tolerance_m:
                return node_id
        return None
    
    def shortest_path(
        self,
        origin: Point,
        destination: Point,
        weight: str = "travel_time",
    ) -> Optional[Dict[str, Any]]:
        """
        Find shortest path between two points using the road network.
        
        Returns dict with path nodes, total distance, travel time, and geometry.
        """
        # Find nearest nodes to origin and destination
        origin_node = self._find_nearest_node(origin)
        dest_node = self._find_nearest_node(destination)
        
        if origin_node is None or dest_node is None:
            return None
        
        if not nx.has_path(self.graph, origin_node, dest_node):
            return None
        
        try:
            path_nodes = nx.shortest_path(
                self.graph, origin_node, dest_node, weight=weight
            )
        except nx.NetworkXNoPath:
            return None
        
        # Calculate totals
        total_distance = 0.0
        total_time = 0.0
        path_coords = []
        
        for i in range(len(path_nodes) - 1):
            u, v = path_nodes[i], path_nodes[i + 1]
            edge = self.graph[u][v]
            total_distance += edge.get("distance_km", 0)
            total_time += edge.get("travel_time", 0)
            
            if i == 0:
                path_coords.append(self.node_coords[u])
            path_coords.append(self.node_coords[v])
        
        return {
            "nodes": path_nodes,
            "coordinates": path_coords,
            "distance_km": total_distance,
            "travel_time_min": total_time,
            "geometry": {
                "type": "LineString",
                "coordinates": path_coords,
            },
        }
    
    def _find_nearest_node(self, point: Point) -> Optional[int]:
        """Find the graph node nearest to a point."""
        if not self.node_coords:
            return None
        
        nearest_id = None
        min_dist = float('inf')
        
        for node_id, (lng, lat) in self.node_coords.items():
            node_point = Point(lng, lat)
            dist = distance_meters(point, node_point)
            if dist < min_dist:
                min_dist = dist
                nearest_id = node_id
        
        return nearest_id
    
    def find_accessible_nodes(
        self,
        origin: Point,
        max_travel_time_min: float = 120,
    ) -> Dict[int, float]:
        """Find all nodes reachable within max travel time from origin."""
        origin_node = self._find_nearest_node(origin)
        if origin_node is None:
            return {}
        
        lengths = nx.single_source_dijkstra_path_length(
            self.graph, origin_node, cutoff=max_travel_time_min, weight="travel_time"
        )
        return lengths


def build_road_network(roads_geojson: List[Dict[str, Any]]) -> RoadNetworkGraph:
    """Build a road network graph from a list of road GeoJSON features."""
    network = RoadNetworkGraph()
    for road in roads_geojson:
        geom = road.get("geometry")
        props = road.get("properties", {})
        if geom and geom.get("type") == "LineString":
            coords = geom.get("coordinates", [])
            network.add_road(road.get("id", "unknown"), coords, props)
    return network


def assess_route_feasibility(
    route_geom: Dict[str, Any],
    network: RoadNetworkGraph,
    shelters: List[Dict[str, Any]],
    infrastructure: List[Dict[str, Any]],
    population_load: int,
) -> RouteFeasibilityResult:
    """
    Assess route feasibility using the road network graph.
    
    Checks bridge conditions, capacity, and calculates actual travel time.
    """
    props = route_geom.get("properties", {})
    route_id = props.get("id", "unknown")
    
    # Get bridges on this route
    bridges = [i for i in infrastructure if i.get("properties", {}).get("infra_type") == "bridge"]
    
    bridge_status = []
    impassable_bridges = 0
    congested_bridges = 0
    
    for bridge in bridges:
        b_props = bridge.get("properties", {})
        b_id = b_props.get("id")
        b_condition = b_props.get("condition", "good")
        
        status = "open"
        if b_condition == "collapsed":
            status = "impassable"
            impassable_bridges += 1
        elif b_condition == "poor":
            status = "congested"
            congested_bridges += 1
        
        bridge_status.append({"bridge_id": b_id, "status": status})
    
    is_feasible = impassable_bridges == 0
    
    # Calculate travel time using network if available
    coords = route_geom.get("geometry", {}).get("coordinates", [])
    if coords and len(coords) >= 2:
        start = Point(coords[0])
        end = Point(coords[-1])
        path = network.shortest_path(start, end)
        if path:
            travel_time = path["travel_time_min"]
            distance = path["distance_km"]
        else:
            # Fallback to straight-line
            distance = distance_km(start, end)
            travel_time = (distance / 40) * 60  # 40 km/h estimate
    else:
        distance = props.get("length_km", 0)
        travel_time = props.get("travel_time_min", 0)
    
    if is_feasible and congested_bridges > 0:
        travel_time *= (1 + congested_bridges * 0.3)
    
    bottlenecks = [b["bridge_id"] for b in bridge_status if b["status"] != "open"]
    
    capacity_util = props.get("capacity_per_hour", 1)
    if capacity_util > 0:
        capacity_utilization = population_load / capacity_util
    else:
        capacity_utilization = 1.0
    
    return RouteFeasibilityResult(
        route_id=route_id,
        is_feasible=is_feasible,
        travel_time_min=round(travel_time, 1),
        distance_km=round(distance, 1),
        bottlenecks=bottlenecks,
        capacity_utilization=round(capacity_utilization, 2),
        blocked_segments=["bridge_closure"] if impassable_bridges > 0 else [],
        bridge_status=bridge_status,
    )


def find_nearest_shelter(
    habitation_point: Point,
    shelters: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """Find the nearest shelter to a habitation using road network distance."""
    # For now, use straight-line distance as approximation
    # In production, would use road network graph
    nearest = None
    min_dist = float('inf')
    
    for shelter in shelters:
        geom = shelter.get("geometry")
        if not geom:
            continue
        coords = geom.get("coordinates", [])
        if not coords:
            continue
        shelter_point = Point(coords[0], coords[1]) if isinstance(coords[0], (int, float)) else Point(coords)
        dist = distance_km(habitation_point, shelter_point)
        if dist < min_dist:
            min_dist = dist
            nearest = shelter
    
    if nearest:
        return {"shelter": nearest, "distance_km": min_dist}
    return None


def create_population_grid(
    bounds: Dict[str, float],
    cell_size_km: float = 1.0,
) -> List[Dict[str, Any]]:
    """Create a regular grid of polygons covering the bounds."""
    min_lng, min_lat = bounds["minLng"], bounds["minLat"]
    max_lng, max_lat = bounds["maxLng"], bounds["maxLat"]
    
    # Approximate degrees per km at this latitude
    lat_mid = (min_lat + max_lat) / 2
    km_per_deg_lat = 111.0
    km_per_deg_lng = 111.0 * math.cos(math.radians(lat_mid))
    
    cell_lat = cell_size_km / km_per_deg_lat
    cell_lng = cell_size_km / km_per_deg_lng
    
    grid = []
    lat = min_lat
    cell_id = 0
    while lat < max_lat:
        lng = min_lng
        while lng < max_lng:
            polygon = Polygon([
                (lng, lat),
                (lng + cell_lng, lat),
                (lng + cell_lng, lat + cell_lat),
                (lng, lat + cell_lat),
                (lng, lat),
            ])
            grid.append({
                "id": f"grid_{cell_id}",
                "type": "Feature",
                "geometry": mapping(polygon),
                "properties": {
                    "id": f"grid_{cell_id}",
                    "population": 0,
                    "vulnerability_index": 0.0,
                    "habitation_type": "rural",
                    "households": 0,
                    "female_population": 0,
                    "child_population": 0,
                    "elderly_population": 0,
                    "disabled_population": 0,
                }
            })
            cell_id += 1
            lng += cell_lng
        lat += cell_lat
    
    return grid


def validate_geojson_feature(feature: Dict[str, Any]) -> bool:
    """Validate a GeoJSON Feature."""
    if not feature or not isinstance(feature, dict):
        return False
    return (
        feature.get("type") == "Feature" and
        feature.get("geometry") is not None and
        isinstance(feature.get("properties"), dict)
    )


def validate_feature_collection(fc: Dict[str, Any]) -> bool:
    """Validate a GeoJSON FeatureCollection."""
    if not fc or not isinstance(fc, dict):
        return False
    return (
        fc.get("type") == "FeatureCollection" and
        isinstance(fc.get("features"), list)
    )