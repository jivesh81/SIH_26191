"""
Local data layer for Aapda Setu.

This module loads deterministic synthetic demo data from GeoJSON files.
NO DATABASE REQUIRED - runs entirely from local files.
Data is synthetic/demo for Barpeta district, Assam - NOT official government data.
"""

import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from functools import lru_cache

from app.schemas.domain import (
    HabitationResponse,
    SiteResponse,
    RouteResponse,
    HazardResponse,
    ShelterResponse,
    PopulationGridResponse,
    InfrastructureResponse,
    DashboardStats,
    DashboardResponse,
    FeatureCollection,
    Feature,
    DataProvenance,
)


DATA_DIR = Path(__file__).parent.parent.parent.parent.parent / "data" / "barpeta"


def _load_geojson(filename: str) -> FeatureCollection:
    """Load a GeoJSON file and return as FeatureCollection."""
    filepath = DATA_DIR / filename
    if not filepath.exists():
        return FeatureCollection(features=[])
    
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return FeatureCollection(**data)


# Provenance metadata for each dataset
HABITATION_PROVENANCE = DataProvenance(
    dataset_name="vulnerable_habitations",
    source="Synthetic demo data for Barpeta district (SIH 2026 prototype). Village names from Census 2011; population figures approximated from Census 2011/SECC ranges; vulnerability scores synthetic.",
    data_type="synthetic",
    last_updated="2024-03-01",
    confidence_score=0.3,
    methodology="Village locations and names from Census 2011 Barpeta district. Population figures scaled from Census 2011 ranges. Vulnerability scores and hazard exposure synthetically generated for demo.",
    limitations="Population figures are approximate. Hazard exposure not based on actual flood models. Not suitable for operational decisions.",
)

SITE_PROVENANCE = DataProvenance(
    dataset_name="relocation_sites",
    source="Synthetic demo data - candidate relocation sites for Barpeta district.",
    data_type="synthetic",
    last_updated="2024-03-01",
    confidence_score=0.2,
    methodology="Sites placed on elevated ground per SRTM DEM. Capacities and infrastructure readiness synthetically assigned.",
    limitations="Sites are hypothetical. No official land acquisition or suitability assessment performed.",
)

ROUTE_PROVENANCE = DataProvenance(
    dataset_name="evacuation_routes",
    source="Synthetic demo data - evacuation routes for Barpeta district.",
    data_type="synthetic",
    last_updated="2024-03-01",
    confidence_score=0.3,
    methodology="Routes aligned with OSM/Bhuvan road network (NH-31, SH-15, district roads). Bridge dependencies from infrastructure.geojson. Travel times estimated at 40 km/h.",
    limitations="Route geometries simplified. Bridge conditions synthetic. Not verified against actual road conditions.",
)

HAZARD_PROVENANCE = DataProvenance(
    dataset_name="hazard_zones",
    source="Synthetic demo data - flood/erosion hazard zones for Barpeta district.",
    data_type="synthetic",
    last_updated="2024-03-01",
    confidence_score=0.2,
    methodology="Hazard zones placed near major rivers (Beki, Manas, Kaldia) based on historical flood extents from ASDMA reports. Severity levels synthetic.",
    limitations="Not based on CWC/ASDMA official flood zonation maps. Return periods not calibrated.",
)

SHELTER_PROVENANCE = DataProvenance(
    dataset_name="shelters",
    source="Synthetic demo data - relief camps/shelters for Barpeta district.",
    data_type="synthetic",
    last_updated="2024-03-01",
    confidence_score=0.3,
    methodology="Shelter locations based on known relief camp locations from ASDMA. Capacities and facilities synthetically assigned.",
    limitations="Not a complete inventory of actual shelters. Effective capacities are estimates.",
)

POPULATION_GRID_PROVENANCE = DataProvenance(
    dataset_name="population_grid",
    source="Synthetic demo data - population grid for Barpeta district.",
    data_type="synthetic",
    last_updated="2024-03-01",
    confidence_score=0.2,
    methodology="Grid cells populated using Census 2011 village populations distributed by area. Vulnerability index synthetic.",
    limitations="Grid resolution coarse. Population distribution within villages assumed uniform.",
)

INFRASTRUCTURE_PROVENANCE = DataProvenance(
    dataset_name="infrastructure",
    source="Synthetic demo data - roads, bridges, culverts for Barpeta district.",
    data_type="synthetic",
    last_updated="2024-03-01",
    confidence_score=0.4,
    methodology="Major roads (NH-31, SH-15) from OSM/Bhuvan. Bridge names and locations approximated from known crossings on Beki, Chaulkhowa, Kaldia, Manas rivers. Conditions synthetic.",
    limitations="Bridge names (Beki River Bridge on NH-31, Chaulkhowa Bridge on SH-15, Kaldia River Bridge, Manas River Bridge) are approximations based on known river crossings. Not verified against official PWD/NHAI records.",
)


@lru_cache(maxsize=1)
def get_habitations() -> List[HabitationResponse]:
    """Load vulnerable habitations from GeoJSON."""
    fc = _load_geojson("vulnerable_habitations.geojson")
    habitations = []
    
    for feature in fc.features:
        props = feature.properties
        geom = feature.geometry.model_dump() if feature.geometry else None
        
        hab = HabitationResponse(
            id=props.get("id", ""),
            name=props.get("name", ""),
            population=props.get("population", 0),
            vulnerability_score=props.get("vulnerability_score", 0.0),
            hazard_exposure=props.get("hazard_exposure", []),
            nearest_shelter_id=props.get("nearest_shelter_id"),
            nearest_shelter_distance_m=props.get("nearest_shelter_distance_m"),
            evacuation_route_id=props.get("evacuation_route_id"),
            is_accessible=props.get("is_accessible", True),
            priority_rank=props.get("priority_rank"),
            geometry=geom,
            data_provenance=HABITATION_PROVENANCE,
        )
        habitations.append(hab)
    
    return habitations


@lru_cache(maxsize=1)
def get_sites() -> List[SiteResponse]:
    """Load relocation sites from GeoJSON."""
    fc = _load_geojson("relocation_sites.geojson")
    sites = []
    
    for feature in fc.features:
        props = feature.properties
        geom = feature.geometry.model_dump() if feature.geometry else None
        
        site = SiteResponse(
            id=props.get("id", ""),
            name=props.get("name", ""),
            area_sqkm=props.get("area_sqkm", 0.0),
            max_capacity=props.get("max_capacity", 0),
            current_allocation=props.get("current_allocation", 0),
            suitability_score=props.get("suitability_score", 0.0),
            elevation_m=props.get("elevation_m", 0.0),
            flood_risk=props.get("flood_risk", "none"),
            land_ownership=props.get("land_ownership", "government"),
            infrastructure_ready=props.get("infrastructure_ready", False),
            water_available=props.get("water_available", False),
            power_available=props.get("power_available", False),
            road_access=props.get("road_access", False),
            geometry=geom,
            data_provenance=SITE_PROVENANCE,
        )
        sites.append(site)
    
    return sites


@lru_cache(maxsize=1)
def get_routes() -> List[RouteResponse]:
    """Load evacuation routes from GeoJSON."""
    fc = _load_geojson("evacuation_routes.geojson")
    routes = []
    
    for feature in fc.features:
        props = feature.properties
        geom = feature.geometry.model_dump() if feature.geometry else None
        
        route = RouteResponse(
            id=props.get("id", ""),
            name=props.get("name", ""),
            route_type=props.get("route_type", "primary"),
            length_km=props.get("length_km", 0.0),
            travel_time_min=props.get("travel_time_min", 0.0),
            capacity_per_hour=props.get("capacity_per_hour", 0),
            current_load=props.get("current_load", 0),
            status=props.get("status", "open"),
            bridge_dependencies=props.get("bridge_dependencies", []),
            last_assessment=props.get("last_assessment"),
            geometry=geom,
            data_provenance=ROUTE_PROVENANCE,
        )
        routes.append(route)
    
    return routes


@lru_cache(maxsize=1)
def get_hazards() -> List[HazardResponse]:
    """Load hazard zones from GeoJSON."""
    fc = _load_geojson("hazard_zones.geojson")
    hazards = []
    
    for feature in fc.features:
        props = feature.properties
        geom = feature.geometry.model_dump() if feature.geometry else None
        
        hazard = HazardResponse(
            id=props.get("id", ""),
            hazard_type=props.get("hazard_type", "flood"),
            severity=props.get("severity", "low"),
            return_period_years=props.get("return_period_years"),
            source=props.get("source"),
            last_updated=props.get("last_updated"),
            geometry=geom,
            data_provenance=HAZARD_PROVENANCE,
        )
        hazards.append(hazard)
    
    return hazards


@lru_cache(maxsize=1)
def get_shelters() -> List[ShelterResponse]:
    """Load shelters from GeoJSON."""
    fc = _load_geojson("shelters.geojson")
    shelters = []
    
    for feature in fc.features:
        props = feature.properties
        geom = feature.geometry.model_dump() if feature.geometry else None
        
        shelter = ShelterResponse(
            id=props.get("id", ""),
            name=props.get("name", ""),
            shelter_type=props.get("shelter_type", "relief_camp"),
            capacity=props.get("capacity", 0),
            current_occupancy=props.get("current_occupancy", 0),
            effective_capacity=props.get("effective_capacity", 0),
            facilities=props.get("facilities", []),
            manager_contact=props.get("manager_contact"),
            is_active=props.get("is_active", True),
            elevation_m=props.get("elevation_m", 0.0),
            flood_level_m=props.get("flood_level_m"),
            geometry=geom,
            data_provenance=SHELTER_PROVENANCE,
        )
        shelters.append(shelter)
    
    return shelters


@lru_cache(maxsize=1)
def get_population_grid() -> List[PopulationGridResponse]:
    """Load population grid from GeoJSON."""
    fc = _load_geojson("population_grid.geojson")
    grids = []
    
    for feature in fc.features:
        props = feature.properties
        geom = feature.geometry.model_dump() if feature.geometry else None
        
        grid = PopulationGridResponse(
            id=props.get("id", ""),
            population=props.get("population", 0),
            vulnerability_index=props.get("vulnerability_index", 0.0),
            habitation_type=props.get("habitation_type"),
            households=props.get("households", 0),
            female_population=props.get("female_population", 0),
            child_population=props.get("child_population", 0),
            elderly_population=props.get("elderly_population", 0),
            disabled_population=props.get("disabled_population", 0),
            geometry=geom,
            data_provenance=POPULATION_GRID_PROVENANCE,
        )
        grids.append(grid)
    
    return grids


@lru_cache(maxsize=1)
def get_infrastructure() -> List[InfrastructureResponse]:
    """Load infrastructure from GeoJSON."""
    fc = _load_geojson("infrastructure.geojson")
    infra = []
    
    for feature in fc.features:
        props = feature.properties
        geom = feature.geometry.model_dump() if feature.geometry else None
        
        item = InfrastructureResponse(
            id=props.get("id", ""),
            infra_type=props.get("infra_type", "road"),
            name=props.get("name"),
            condition=props.get("condition", "good"),
            capacity=props.get("capacity"),
            length_m=props.get("length_m"),
            width_m=props.get("width_m"),
            surface_type=props.get("surface_type"),
            clearance_m=props.get("clearance_m"),
            last_inspection=props.get("last_inspection"),
            geometry=geom,
            data_provenance=INFRASTRUCTURE_PROVENANCE,
        )
        infra.append(item)
    
    return infra


def get_dashboard_stats() -> DashboardStats:
    """Calculate dashboard statistics from actual demo data."""
    habitations = get_habitations()
    shelters = get_shelters()
    sites = get_sites()
    routes = get_routes()
    hazards = get_hazards()
    
    total_population = sum(h.population for h in habitations)
    high_vuln = sum(1 for h in habitations if h.vulnerability_score >= 0.7)
    
    active_shelters = [s for s in shelters if s.is_active]
    total_capacity = sum(s.capacity for s in active_shelters)
    total_effective = sum(s.effective_capacity for s in active_shelters)
    current_occupancy = sum(s.current_occupancy for s in active_shelters)
    
    utilization = (current_occupancy / total_effective * 100) if total_effective > 0 else 0.0
    
    open_routes = sum(1 for r in routes if r.status == "open")
    impassable_routes = sum(1 for r in routes if r.status == "impassable")
    
    high_hazards = sum(1 for h in hazards if h.severity in ("high", "extreme"))
    
    return DashboardStats(
        total_habitations=len(habitations),
        total_population=total_population,
        high_vulnerability_habitations=high_vuln,
        total_shelters=len(shelters),
        active_shelters=len(active_shelters),
        total_shelter_capacity=total_capacity,
        total_effective_capacity=total_effective,
        current_total_occupancy=current_occupancy,
        shelter_utilization_pct=round(utilization, 1),
        total_sites=len(sites),
        total_site_capacity=sum(s.max_capacity for s in sites),
        total_routes=len(routes),
        open_routes=open_routes,
        impassable_routes=impassable_routes,
        total_hazard_zones=len(hazards),
        high_severity_hazards=high_hazards,
    )


def get_dashboard() -> DashboardResponse:
    """Get complete dashboard response."""
    stats = get_dashboard_stats()
    return DashboardResponse(
        stats=stats,
        metadata={
            "data_source": "synthetic_demo_data_barpeta",
            "district": "Barpeta",
            "state": "Assam",
            "note": "All data is synthetic/demo data for SIH 2026 demonstration. NOT official government data.",
        }
    )


# Convenience functions for filtering

def get_habitation_by_id(habitation_id: str) -> Optional[HabitationResponse]:
    """Get a single habitation by ID."""
    for h in get_habitations():
        if h.id == habitation_id:
            return h
    return None


def get_site_by_id(site_id: str) -> Optional[SiteResponse]:
    """Get a single site by ID."""
    for s in get_sites():
        if s.id == site_id:
            return s
    return None


def get_route_by_id(route_id: str) -> Optional[RouteResponse]:
    """Get a single route by ID."""
    for r in get_routes():
        if r.id == route_id:
            return r
    return None


def get_hazard_by_id(hazard_id: str) -> Optional[HazardResponse]:
    """Get a single hazard by ID."""
    for h in get_hazards():
        if h.id == hazard_id:
            return h
    return None


def get_shelter_by_id(shelter_id: str) -> Optional[ShelterResponse]:
    """Get a single shelter by ID."""
    for s in get_shelters():
        if s.id == shelter_id:
            return s
    return None


def get_accessible_habitations() -> List[HabitationResponse]:
    """Get only accessible habitations."""
    return [h for h in get_habitations() if h.is_accessible]


def get_high_vulnerability_habitations(threshold: float = 0.7) -> List[HabitationResponse]:
    """Get habitations with vulnerability score >= threshold."""
    return [h for h in get_habitations() if h.vulnerability_score >= threshold]


def get_open_routes() -> List[RouteResponse]:
    """Get only open routes."""
    return [r for r in get_routes() if r.status == "open"]


def get_active_shelters() -> List[ShelterResponse]:
    """Get only active shelters."""
    return [s for s in get_shelters() if s.is_active]


def get_available_sites() -> List[SiteResponse]:
    """Get sites with available capacity."""
    return [s for s in get_sites() if s.available_capacity > 0]