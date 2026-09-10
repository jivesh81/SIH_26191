-- Aapda Setu Database Initialization
-- Run once on first container startup

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder;

-- Create schemas
CREATE SCHEMA IF NOT EXISTS aapda;
CREATE SCHEMA IF NOT EXISTS audit;

-- Grant permissions
GRANT ALL ON SCHEMA aapda TO aapda;
GRANT ALL ON SCHEMA audit TO aapda;
GRANT ALL ON SCHEMA public TO aapda;

-- Set search path
ALTER DATABASE aapda_setu SET search_path = aapda, public;

-- Core tables will be created via SQLAlchemy migrations
-- This file only ensures extensions and schemas exist