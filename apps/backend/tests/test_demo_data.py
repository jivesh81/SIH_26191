"""
Tests for deterministic demo data verification.

Ensures the synthetic Barpeta demo data is consistent and complete.
"""

import pytest
from app.services.data_layer import (
    get_habitations,
    get_sites,
    get_routes,
    get_hazards,
    get_shelters,
    get_population_grid,
    get_infrastructure,
    get_dashboard_stats,
)


class TestDemoDataCompleteness:
    """Verify all demo data loads correctly."""

    def test_habitations_load(self):
        habitations = get_habitations()
        assert len(habitations) == 12  # 12 vulnerable habitations in demo data
        
        for hab in habitations:
            assert hab.id.startswith("hab_")
            assert hab.name
            assert hab.population > 0
            assert 0.0 <= hab.vulnerability_score <= 1.0
            assert isinstance(hab.hazard_exposure, list)
            assert hab.priority_rank is not None
            assert 1 <= hab.priority_rank <= 12

    def test_habitations_unique_ids(self):
        habitations = get_habitations()
        ids = [h.id for h in habitations]
        assert len(ids) == len(set(ids))  # All unique

    def test_habitations_priority_ranks_unique(self):
        habitations = get_habitations()
        ranks = [h.priority_rank for h in habitations if h.priority_rank]
        assert len(ranks) == len(set(ranks))  # All unique

    def test_sites_load(self):
        sites = get_sites()
        assert len(sites) == 6  # 6 relocation sites
        
        for site in sites:
            assert site.id.startswith("site_")
            assert site.name
            assert site.area_sqkm > 0
            assert site.max_capacity > 0
            assert 0.0 <= site.suitability_score <= 1.0
            assert site.elevation_m > 0
            assert site.flood_risk in ["none", "low", "medium", "high"]
            assert site.land_ownership in ["government", "private", "community", "forest"]

    def test_sites_unique_ids(self):
        sites = get_sites()
        ids = [s.id for s in sites]
        assert len(ids) == len(set(ids))

    def test_routes_load(self):
        routes = get_routes()
        assert len(routes) == 26  # 26 evacuation routes (including alternates for high-pop habitations)
        
        for route in routes:
            assert route.id.startswith("route_")
            assert route.name
            assert route.route_type in ["primary", "alternative", "contingency"]
            assert route.length_km > 0
            assert route.travel_time_min > 0
            assert route.capacity_per_hour > 0
            assert route.status in ["open", "congested", "impassable", "under_review"]
            assert isinstance(route.bridge_dependencies, list)

    def test_routes_unique_ids(self):
        routes = get_routes()
        ids = [r.id for r in routes]
        assert len(ids) == len(set(ids))

    def test_hazards_load(self):
        hazards = get_hazards()
        assert len(hazards) == 8  # 8 hazard zones
        
        for hazard in hazards:
            assert hazard.id
            assert hazard.hazard_type in ["flood", "erosion", "storm_surge", "landslide", "earthquake"]
            assert hazard.severity in ["low", "medium", "high", "extreme"]

    def test_hazards_unique_ids(self):
        hazards = get_hazards()
        ids = [h.id for h in hazards]
        assert len(ids) == len(set(ids))

    def test_shelters_load(self):
        shelters = get_shelters()
        assert len(shelters) == 11  # 11 shelters in demo data
        
        for shelter in shelters:
            assert shelter.id.startswith("shelter_")
            assert shelter.name
            assert shelter.shelter_type in [
                "relief_camp", "school", "hospital", 
                "community_center", "cyclone_shelter"
            ]
            assert shelter.capacity > 0
            assert shelter.effective_capacity > 0
            assert shelter.current_occupancy >= 0
            assert shelter.current_occupancy <= shelter.effective_capacity
            assert shelter.elevation_m > 0
            assert shelter.is_active in [True, False]

    def test_shelters_unique_ids(self):
        shelters = get_shelters()
        ids = [s.id for s in shelters]
        assert len(ids) == len(set(ids))

    def test_population_grid_load(self):
        grids = get_population_grid()
        assert len(grids) == 15  # 15 grid cells
        
        for grid in grids:
            assert grid.id.startswith("grid_")
            assert grid.population >= 0
            assert 0.0 <= grid.vulnerability_index <= 1.0
            assert grid.households >= 0

    def test_infrastructure_load(self):
        infra = get_infrastructure()
        assert len(infra) == 11  # 11 infrastructure elements
        
        for item in infra:
            assert item.id
            assert item.infra_type in ["road", "bridge", "culvert", "embankment"]
            assert item.condition in ["good", "fair", "poor", "collapsed"]


class TestDashboardStatsCalculated:
    """Verify dashboard stats are calculated from actual data."""

    def test_total_habitations_matches(self):
        habitations = get_habitations()
        stats = get_dashboard_stats()
        assert stats.total_habitations == len(habitations)

    def test_total_population_matches(self):
        habitations = get_habitations()
        stats = get_dashboard_stats()
        expected_pop = sum(h.population for h in habitations)
        assert stats.total_population == expected_pop

    def test_high_vulnerability_count_matches(self):
        habitations = get_habitations()
        stats = get_dashboard_stats()
        expected_high = sum(1 for h in habitations if h.vulnerability_score >= 0.7)
        assert stats.high_vulnerability_habitations == expected_high

    def test_shelter_stats_match(self):
        shelters = get_shelters()
        active = [s for s in shelters if s.is_active]
        stats = get_dashboard_stats()
        
        assert stats.total_shelters == len(shelters)
        assert stats.active_shelters == len(active)
        assert stats.total_shelter_capacity == sum(s.capacity for s in active)
        assert stats.total_effective_capacity == sum(s.effective_capacity for s in active)
        assert stats.current_total_occupancy == sum(s.current_occupancy for s in active)

    def test_site_stats_match(self):
        sites = get_sites()
        stats = get_dashboard_stats()
        
        assert stats.total_sites == len(sites)
        assert stats.total_site_capacity == sum(s.max_capacity for s in sites)

    def test_route_stats_match(self):
        routes = get_routes()
        stats = get_dashboard_stats()
        
        assert stats.total_routes == len(routes)
        assert stats.open_routes == sum(1 for r in routes if r.status == "open")
        assert stats.impassable_routes == sum(1 for r in routes if r.status == "impassable")

    def test_hazard_stats_match(self):
        hazards = get_hazards()
        stats = get_dashboard_stats()
        
        assert stats.total_hazard_zones == len(hazards)
        assert stats.high_severity_hazards == sum(
            1 for h in hazards if h.severity in ("high", "extreme")
        )

    def test_shelter_utilization_calculated(self):
        stats = get_dashboard_stats()
        if stats.total_effective_capacity > 0:
            expected = (stats.current_total_occupancy / stats.total_effective_capacity) * 100
            assert abs(stats.shelter_utilization_pct - round(expected, 1)) < 0.1


class TestDataRelationships:
    """Verify relationships between data entities."""

    def test_habitation_shelter_references_valid(self):
        habitations = get_habitations()
        shelters = get_shelters()
        shelter_ids = {s.id for s in shelters}
        
        for hab in habitations:
            if hab.nearest_shelter_id:
                assert hab.nearest_shelter_id in shelter_ids, \
                    f"Habitation {hab.id} references unknown shelter {hab.nearest_shelter_id}"

    def test_habitation_route_references_valid(self):
        habitations = get_habitations()
        routes = get_routes()
        route_ids = {r.id for r in routes}
        
        for hab in habitations:
            if hab.evacuation_route_id:
                assert hab.evacuation_route_id in route_ids, \
                    f"Habitation {hab.id} references unknown route {hab.evacuation_route_id}"

    def test_route_bridge_dependencies_valid(self):
        routes = get_routes()
        infra = get_infrastructure()
        # Allow both bridges and culverts in bridge_dependencies
        bridge_and_culvert_ids = {i.id for i in infra if i.infra_type in ("bridge", "culvert")}
        
        for route in routes:
            for dep_id in route.bridge_dependencies:
                assert dep_id in bridge_and_culvert_ids, \
                    f"Route {route.id} references unknown infrastructure {dep_id}"

    def test_all_habitations_have_geometry_or_none(self):
        """Verify geometry handling."""
        habitations = get_habitations()
        for hab in habitations:
            # Geometry is optional in response, but if present should be valid
            if hab.geometry:
                assert hab.geometry["type"] == "Point"
                assert len(hab.geometry["coordinates"]) == 2


class TestDataDeterministic:
    """Verify data is deterministic (same on every load)."""

    def test_habitations_deterministic(self):
        h1 = get_habitations()
        h2 = get_habitations()
        
        # Should be same objects (cached) or equivalent
        assert len(h1) == len(h2)
        for a, b in zip(h1, h2):
            assert a.id == b.id
            assert a.population == b.population
            assert a.vulnerability_score == b.vulnerability_score

    def test_sites_deterministic(self):
        s1 = get_sites()
        s2 = get_sites()
        
        assert len(s1) == len(s2)
        for a, b in zip(s1, s2):
            assert a.id == b.id
            assert a.max_capacity == b.max_capacity
            assert a.suitability_score == b.suitability_score

    def test_routes_deterministic(self):
        r1 = get_routes()
        r2 = get_routes()
        
        assert len(r1) == len(r2)
        for a, b in zip(r1, r2):
            assert a.id == b.id
            assert a.length_km == b.length_km
            assert a.status == b.status

    def test_hazards_deterministic(self):
        h1 = get_hazards()
        h2 = get_hazards()
        
        assert len(h1) == len(h2)
        for a, b in zip(h1, h2):
            assert a.id == b.id
            assert a.hazard_type == b.hazard_type
            assert a.severity == b.severity