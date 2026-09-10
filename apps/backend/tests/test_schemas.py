"""
Tests for Pydantic schema validation.
"""

import pytest
from pydantic import ValidationError
from datetime import datetime

from app.schemas.domain import (
    HabitationResponse,
    SiteResponse,
    RouteResponse,
    HazardResponse,
    ShelterResponse,
    DashboardStats,
    DisasterEvent,
    OptimizationConstraints,
    OptimizationObjectives,
    OptimizationRequest,
    HazardType,
    HazardSeverity,
    RouteType,
    RouteStatus,
    ShelterType,
    FloodRiskLevel,
    LandOwnership,
    EventType,
    OptimizationStatus,
)


class TestHabitationSchema:
    def test_valid_habitation(self):
        hab = HabitationResponse(
            id="hab_001",
            name="Test Village",
            population=1000,
            vulnerability_score=0.75,
            hazard_exposure=[{"hazard_type": "flood", "severity": "high"}],
            nearest_shelter_id="shelter_001",
            nearest_shelter_distance_m=2000.0,
            evacuation_route_id="route_001",
            is_accessible=True,
            priority_rank=1,
        )
        assert hab.id == "hab_001"
        assert hab.population == 1000
        assert hab.vulnerability_score == 0.75

    def test_invalid_vulnerability_score(self):
        with pytest.raises(ValidationError):
            HabitationResponse(
                id="hab_001",
                name="Test",
                population=1000,
                vulnerability_score=1.5,  # Invalid: > 1.0
                hazard_exposure=[],
                is_accessible=True,
            )

    def test_negative_population(self):
        with pytest.raises(ValidationError):
            HabitationResponse(
                id="hab_001",
                name="Test",
                population=-100,  # Invalid: negative
                vulnerability_score=0.5,
                hazard_exposure=[],
                is_accessible=True,
            )


class TestSiteSchema:
    def test_valid_site(self):
        site = SiteResponse(
            id="site_001",
            name="Test Site",
            area_sqkm=2.5,
            max_capacity=5000,
            current_allocation=1000,
            suitability_score=0.85,
            elevation_m=50.0,
            flood_risk=FloodRiskLevel.LOW,
            land_ownership=LandOwnership.GOVERNMENT,
            infrastructure_ready=True,
            water_available=True,
            power_available=True,
            road_access=True,
        )
        assert site.available_capacity == 4000
        assert site.utilization_pct == 20.0

    def test_site_capacity_properties(self):
        site = SiteResponse(
            id="site_001",
            name="Test",
            area_sqkm=1.0,
            max_capacity=1000,
            current_allocation=1000,  # Full
            suitability_score=0.5,
            elevation_m=50.0,
            flood_risk=FloodRiskLevel.NONE,
            land_ownership=LandOwnership.PRIVATE,
            infrastructure_ready=False,
            water_available=False,
            power_available=False,
            road_access=False,
        )
        assert site.available_capacity == 0
        assert site.utilization_pct == 100.0


class TestRouteSchema:
    def test_valid_route(self):
        route = RouteResponse(
            id="route_001",
            name="Test Route",
            route_type=RouteType.PRIMARY,
            length_km=10.0,
            travel_time_min=20.0,
            capacity_per_hour=500,
            current_load=250,
            status=RouteStatus.OPEN,
            bridge_dependencies=["bridge_001"],
            last_assessment="2024-01-01",
        )
        assert route.utilization_pct == 50.0
        assert route.is_feasible is True

    def test_impassable_route(self):
        route = RouteResponse(
            id="route_002",
            name="Test Route",
            route_type=RouteType.PRIMARY,
            length_km=10.0,
            travel_time_min=20.0,
            capacity_per_hour=500,
            current_load=100,
            status=RouteStatus.IMPASSABLE,
            bridge_dependencies=[],
            last_assessment="2024-01-01",
        )
        assert route.is_feasible is False


class TestHazardSchema:
    def test_valid_hazard(self):
        hazard = HazardResponse(
            id="hazard_001",
            hazard_type=HazardType.FLOOD,
            severity=HazardSeverity.HIGH,
            return_period_years=25,
            source="modelled",
            last_updated="2024-01-15",
        )
        assert hazard.hazard_type == HazardType.FLOOD
        assert hazard.severity == HazardSeverity.HIGH


class TestShelterSchema:
    def test_valid_shelter(self):
        shelter = ShelterResponse(
            id="shelter_001",
            name="Test Shelter",
            shelter_type=ShelterType.RELIEF_CAMP,
            capacity=500,
            current_occupancy=200,
            effective_capacity=450,
            facilities=["water", "sanitation"],
            manager_contact="+91-3665-123XXX",
            is_active=True,
            elevation_m=45.0,
            flood_level_m=40.0,
        )
        assert shelter.available_capacity == 250
        assert shelter.utilization_pct == 44.44444444444444


class TestDashboardStats:
    def test_dashboard_stats(self):
        stats = DashboardStats(
            total_habitations=12,
            total_population=20000,
            high_vulnerability_habitations=5,
            total_shelters=10,
            active_shelters=8,
            total_shelter_capacity=3000,
            total_effective_capacity=2700,
            current_total_occupancy=1000,
            shelter_utilization_pct=37.0,
            total_sites=6,
            total_site_capacity=20000,
            total_routes=11,
            open_routes=10,
            impassable_routes=1,
            total_hazard_zones=8,
            high_severity_hazards=3,
        )
        assert stats.total_habitations == 12
        assert stats.shelter_utilization_pct == 37.0


class TestDisasterEvent:
    def test_valid_rainfall_event(self):
        event = DisasterEvent(
            event_type=EventType.RAINFALL,
            intensity=0.8,
            affected_area={
                "min_lng": 90.5,
                "min_lat": 26.1,
                "max_lng": 91.5,
                "max_lat": 26.8,
            },
            duration_hours=48,
            metadata={"rainfall_mm": 250},
        )
        assert event.event_type == EventType.RAINFALL
        assert event.intensity == 0.8

    def test_invalid_intensity(self):
        with pytest.raises(ValidationError):
            DisasterEvent(
                event_type=EventType.RAINFALL,
                intensity=1.5,  # Invalid: > 1.0
                affected_area={"min_lng": 90.5, "min_lat": 26.1, "max_lng": 91.5, "max_lat": 26.8},
                duration_hours=48,
            )

    def test_bridge_collapse_event(self):
        event = DisasterEvent(
            event_type=EventType.BRIDGE_COLLAPSE,
            intensity=1.0,
            affected_area={"min_lng": 90.9, "min_lat": 26.3, "max_lng": 91.0, "max_lat": 26.4},
            duration_hours=720,
            metadata={"bridge_id": "bridge_beki"},
        )
        assert event.event_type == EventType.BRIDGE_COLLAPSE


class TestOptimizationSchemas:
    def test_optimization_constraints_defaults(self):
        constraints = OptimizationConstraints()
        assert constraints.max_travel_time_min == 120.0
        assert constraints.min_shelter_capacity_buffer == 0.1
        assert constraints.capacity_utilization_limit == 0.9

    def test_optimization_objectives_defaults(self):
        objectives = OptimizationObjectives()
        assert objectives.minimize_travel_time == 1.0
        assert objectives.maximize_safety == 1.0
        assert objectives.minimize_cost == 0.5
        assert objectives.balance_load == 0.3

    def test_optimization_request(self):
        request = OptimizationRequest(
            scenario_id="scenario_001",
            affected_habitations=["hab_001", "hab_002"],
            available_shelters=["shelter_001"],
            candidate_relocation_sites=["site_001"],
        )
        assert request.scenario_id == "scenario_001"
        assert len(request.affected_habitations) == 2


class TestEnums:
    def test_hazard_type_enum(self):
        assert HazardType.FLOOD == "flood"
        assert HazardType.EROSION == "erosion"
        assert HazardType.STORM_SURGE == "storm_surge"

    def test_hazard_severity_enum(self):
        assert HazardSeverity.LOW == "low"
        assert HazardSeverity.MEDIUM == "medium"
        assert HazardSeverity.HIGH == "high"
        assert HazardSeverity.EXTREME == "extreme"

    def test_route_type_enum(self):
        assert RouteType.PRIMARY == "primary"
        assert RouteType.ALTERNATIVE == "alternative"
        assert RouteType.CONTINGENCY == "contingency"

    def test_route_status_enum(self):
        assert RouteStatus.OPEN == "open"
        assert RouteStatus.CONGESTED == "congested"
        assert RouteStatus.IMPASSABLE == "impassable"

    def test_shelter_type_enum(self):
        assert ShelterType.RELIEF_CAMP == "relief_camp"
        assert ShelterType.SCHOOL == "school"
        assert ShelterType.HOSPITAL == "hospital"

    def test_event_type_enum(self):
        assert EventType.RAINFALL == "rainfall"
        assert EventType.BRIDGE_COLLAPSE == "bridge_collapse"
        assert EventType.CAPACITY_REDUCTION == "capacity_reduction"

    def test_optimization_status_enum(self):
        assert OptimizationStatus.OPTIMAL == "optimal"
        assert OptimizationStatus.FEASIBLE == "feasible"
        assert OptimizationStatus.INFEASIBLE == "infeasible"