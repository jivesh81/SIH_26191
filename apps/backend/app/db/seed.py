"""
Database seeding script for Aapda Setu demo data.
Loads deterministic Barpeta district GeoJSON data into PostGIS.
"""

import json
import asyncio
from pathlib import Path
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_maker
from app.core.config import settings


DATA_DIR = Path(__file__).parent.parent.parent.parent.parent / "data" / "barpeta"

GEOJSON_FILES = {
    "admin_boundaries": "admin_boundaries.geojson",
    "blocks": "blocks.geojson",
    "hazard_zones": "hazard_zones.geojson",
    "infrastructure": "infrastructure.geojson",
    "shelters": "shelters.geojson",
    "population_grid": "population_grid.geojson",
    "vulnerable_habitations": "vulnerable_habitations.geojson",
    "evacuation_routes": "evacuation_routes.geojson",
    "relocation_sites": "relocation_sites.geojson",
}


async def load_geojson_to_table(session: AsyncSession, table_name: str, geojson_path: Path):
    """Load a GeoJSON file into a PostGIS table."""
    with open(geojson_path) as f:
        data = json.load(f)

    if data["type"] != "FeatureCollection":
        raise ValueError(f"Expected FeatureCollection in {geojson_path}")

    for feature in data["features"]:
        props = feature["properties"]
        geom = feature["geometry"]

        # Convert geometry to WKT for PostGIS
        geom_json = json.dumps(geom)

        # Build insert query
        columns = ["id"] + list(props.keys()) + ["geom"]
        placeholders = [":id"] + [f":{k}" for k in props.keys()] + ["ST_GeomFromGeoJSON(:geom)"]

        query = f"""
            INSERT INTO aapda.{table_name} ({", ".join(columns)})
            VALUES ({", ".join(placeholders)})
            ON CONFLICT (id) DO UPDATE SET
                {", ".join(f"{c} = EXCLUDED.{c}" for c in columns if c != "id")}
        """

        params = {"id": feature.get("id", props.get("id")), "geom": geom_json}
        params.update(props)

        await session.execute(text(query), params)

    await session.commit()
    print(f"Loaded {len(data['features'])} features into {table_name}")


async def create_tables(session: AsyncSession):
    """Create the required tables if they don't exist."""
    tables_sql = [
        # Admin boundaries
        """
        CREATE TABLE IF NOT EXISTS aapda.admin_boundaries (
            id VARCHAR PRIMARY KEY,
            name VARCHAR NOT NULL,
            level VARCHAR NOT NULL,
            parent_id VARCHAR,
            area_sqkm FLOAT,
            population INTEGER,
            geom GEOMETRY(GEOMETRY, 4326)
        );
        CREATE INDEX IF NOT EXISTS idx_admin_boundaries_geom ON aapda.admin_boundaries USING GIST (geom);
        """,
        # Hazard zones
        """
        CREATE TABLE IF NOT EXISTS aapda.hazard_zones (
            id VARCHAR PRIMARY KEY,
            hazard_type VARCHAR NOT NULL,
            severity VARCHAR NOT NULL,
            return_period_years INTEGER,
            source VARCHAR,
            last_updated DATE,
            geom GEOMETRY(GEOMETRY, 4326)
        );
        CREATE INDEX IF NOT EXISTS idx_hazard_zones_geom ON aapda.hazard_zones USING GIST (geom);
        """,
        # Infrastructure
        """
        CREATE TABLE IF NOT EXISTS aapda.infrastructure (
            id VARCHAR PRIMARY KEY,
            infra_type VARCHAR NOT NULL,
            name VARCHAR,
            condition VARCHAR NOT NULL,
            capacity INTEGER,
            length_m FLOAT,
            width_m FLOAT,
            surface_type VARCHAR,
            clearance_m FLOAT,
            last_inspection DATE,
            geom GEOMETRY(GEOMETRY, 4326)
        );
        CREATE INDEX IF NOT EXISTS idx_infrastructure_geom ON aapda.infrastructure USING GIST (geom);
        """,
        # Shelters
        """
        CREATE TABLE IF NOT EXISTS aapda.shelters (
            id VARCHAR PRIMARY KEY,
            name VARCHAR NOT NULL,
            shelter_type VARCHAR NOT NULL,
            capacity INTEGER NOT NULL,
            current_occupancy INTEGER DEFAULT 0,
            effective_capacity INTEGER NOT NULL,
            facilities TEXT[],
            manager_contact VARCHAR,
            is_active BOOLEAN DEFAULT TRUE,
            elevation_m FLOAT,
            flood_level_m FLOAT,
            geom GEOMETRY(POINT, 4326)
        );
        CREATE INDEX IF NOT EXISTS idx_shelters_geom ON aapda.shelters USING GIST (geom);
        """,
        # Population grid
        """
        CREATE TABLE IF NOT EXISTS aapda.population_grid (
            id VARCHAR PRIMARY KEY,
            population INTEGER DEFAULT 0,
            vulnerability_index FLOAT DEFAULT 0,
            habitation_type VARCHAR,
            households INTEGER DEFAULT 0,
            female_population INTEGER DEFAULT 0,
            child_population INTEGER DEFAULT 0,
            elderly_population INTEGER DEFAULT 0,
            disabled_population INTEGER DEFAULT 0,
            geom GEOMETRY(POLYGON, 4326)
        );
        CREATE INDEX IF NOT EXISTS idx_population_grid_geom ON aapda.population_grid USING GIST (geom);
        """,
        # Vulnerable habitations
        """
        CREATE TABLE IF NOT EXISTS aapda.vulnerable_habitations (
            id VARCHAR PRIMARY KEY,
            name VARCHAR NOT NULL,
            population INTEGER NOT NULL,
            vulnerability_score FLOAT NOT NULL,
            hazard_exposure JSONB,
            nearest_shelter_id VARCHAR,
            nearest_shelter_distance_m FLOAT,
            evacuation_route_id VARCHAR,
            is_accessible BOOLEAN DEFAULT TRUE,
            priority_rank INTEGER,
            geom GEOMETRY(POINT, 4326)
        );
        CREATE INDEX IF NOT EXISTS idx_vulnerable_habitations_geom ON aapda.vulnerable_habitations USING GIST (geom);
        """,
        # Evacuation routes
        """
        CREATE TABLE IF NOT EXISTS aapda.evacuation_routes (
            id VARCHAR PRIMARY KEY,
            name VARCHAR NOT NULL,
            route_type VARCHAR NOT NULL,
            length_km FLOAT,
            travel_time_min FLOAT,
            capacity_per_hour INTEGER,
            current_load INTEGER DEFAULT 0,
            status VARCHAR DEFAULT 'open',
            bridge_dependencies TEXT[],
            last_assessment DATE,
            geom GEOMETRY(LINESTRING, 4326)
        );
        CREATE INDEX IF NOT EXISTS idx_evacuation_routes_geom ON aapda.evacuation_routes USING GIST (geom);
        """,
        # Relocation sites
        """
        CREATE TABLE IF NOT EXISTS aapda.relocation_sites (
            id VARCHAR PRIMARY KEY,
            name VARCHAR NOT NULL,
            area_sqkm FLOAT,
            max_capacity INTEGER,
            current_allocation INTEGER DEFAULT 0,
            suitability_score FLOAT,
            elevation_m FLOAT,
            flood_risk VARCHAR,
            land_ownership VARCHAR,
            infrastructure_ready BOOLEAN DEFAULT FALSE,
            water_available BOOLEAN DEFAULT FALSE,
            power_available BOOLEAN DEFAULT FALSE,
            road_access BOOLEAN DEFAULT FALSE,
            geom GEOMETRY(POLYGON, 4326)
        );
        CREATE INDEX IF NOT EXISTS idx_relocation_sites_geom ON aapda.relocation_sites USING GIST (geom);
        """,
        # Optimization plans
        """
        CREATE TABLE IF NOT EXISTS aapda.optimization_plans (
            id VARCHAR PRIMARY KEY,
            scenario_id VARCHAR NOT NULL,
            status VARCHAR DEFAULT 'draft',
            objective_value FLOAT,
            assignments JSONB,
            route_assignments JSONB,
            relocation_assignments JSONB,
            unassigned_habitations TEXT[],
            infeasibility_reasons JSONB,
            computation_time_ms FLOAT,
            solver_stats JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """,
        # Audit trail
        """
        CREATE TABLE IF NOT EXISTS audit.audit_log (
            id BIGSERIAL PRIMARY KEY,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            actor VARCHAR NOT NULL,
            actor_role VARCHAR NOT NULL,
            action VARCHAR NOT NULL,
            resource_type VARCHAR NOT NULL,
            resource_id VARCHAR NOT NULL,
            changes JSONB,
            metadata JSONB
        );
        CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit.audit_log (resource_type, resource_id);
        CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit.audit_log (timestamp DESC);
        """,
        # Approval workflows
        """
        CREATE TABLE IF NOT EXISTS aapda.approval_workflows (
            id VARCHAR PRIMARY KEY,
            plan_id VARCHAR NOT NULL,
            status VARCHAR DEFAULT 'draft',
            submitted_by VARCHAR,
            submitted_at TIMESTAMP WITH TIME ZONE,
            reviewed_by VARCHAR,
            reviewed_at TIMESTAMP WITH TIME ZONE,
            decision VARCHAR,
            comments TEXT,
            required_approvers TEXT[],
            current_approver_index INTEGER DEFAULT 0,
            expiry_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """,
    ]

    for sql in tables_sql:
        await session.execute(text(sql))
    await session.commit()
    print("Tables created/verified")


async def seed_database():
    """Main seeding function."""
    async with async_session_maker() as session:
        await create_tables(session)

        for table_name, filename in GEOJSON_FILES.items():
            geojson_path = DATA_DIR / filename
            if geojson_path.exists():
                await load_geojson_to_table(session, table_name, geojson_path)
            else:
                print(f"Warning: {geojson_path} not found, skipping")

        print("Database seeding completed!")


if __name__ == "__main__":
    asyncio.run(seed_database())