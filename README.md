# Aapda Setu

**SIH 2026 Disaster Management Decision Support System**

Aapda Setu is a decision-support system for disaster management in Barpeta district, Assam. It provides hazard-based red-zone identification, vulnerable habitation prioritization, safer relocation-site assessment, effective shelter carrying capacity, route feasibility analysis, and constraint-based relocation optimization using OR-Tools CP-SAT.

## Core Principle

> **AI estimates risk. Optimization decides the feasible plan. Human authorities approve the action.**

## Architecture

```
aapda-setu/
├── apps/
│   ├── frontend/          # Next.js 14 + TypeScript + MapLibre GL
│   └── backend/           # FastAPI + Python 3.11+
├── packages/
│   ├── shared-types/      # TypeScript/Python shared types
│   ├── gis-engine/        # Pure TS geometry + risk/capacity/route engines
│   └── optimizer/         # OR-Tools CP-SAT wrapper
├── data/
│   ├── barpeta/           # Deterministic GeoJSON demo data
│   └── seeds/             # Database seed scripts
├── docker-compose.yml     # Local dev stack (PostGIS + Redis)
└── turbo.json             # Turborepo config
```

## Features

1. **Hazard-based Red-Zone Identification** - Flood, erosion, storm surge zones with severity levels
2. **Vulnerable Habitation Prioritization** - Composite risk scoring with population vulnerability
3. **Safer Relocation-Site Assessment** - Elevation, flood risk, infrastructure readiness scoring
4. **Effective Shelter Carrying Capacity** - Nominal vs effective capacity with real-time utilization
5. **Route Feasibility** - Graph-based routing with bridge dependency tracking
6. **Constraint-Based Relocation Optimization** - OR-Tools CP-SAT with multi-objective optimization
7. **Dynamic Plan Invalidation & Re-optimization** - Event-driven plan updates
8. **Explicit Infeasibility Detection** - Constraint violation analysis with recommendations
9. **Explainable Decisions** - Risk, capacity, route, optimization rationale, sensitivity analysis
10. **Human Approval Workflow** - Multi-level approval with audit trail

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker & Docker Compose
- npm 10+

### 1. Start Infrastructure

```bash
npm run db:up
```

This starts:
- PostgreSQL 16 + PostGIS 3.4 on port 5432
- Redis 7 on port 6379

### 2. Install Dependencies

```bash
# Frontend
cd apps/frontend && npm install

# Backend
cd apps/backend && pip install -r requirements.txt
```

### 3. Seed Database

```bash
cd apps/backend && python -m app.db.seed
```

### 4. Run Development Servers

```bash
# Terminal 1: Frontend (port 3000)
npm run dev --filter=@aapda-setu/frontend

# Terminal 2: Backend (port 8000)
cd apps/backend && uvicorn app.main:app --reload --port 8000
```

### 5. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/v1
- API Docs: http://localhost:8000/api/v1/docs

## Demo Data

The system includes deterministic demo data for Barpeta district:

- **8 blocks** with boundaries and population
- **8 hazard zones** (flood high/medium/low, erosion, storm surge)
- **11 infrastructure elements** (roads, bridges, culverts)
- **12 shelters** (relief camps, schools, hospitals, community centers)
- **15 population grid cells** with vulnerability indices
- **12 vulnerable habitations** with priority rankings
- **11 evacuation routes** with bridge dependencies
- **6 relocation sites** with suitability scores

All data is deterministic for reproducible SIH demonstrations.

## Development Commands

```bash
# Run all dev servers
npm run dev

# Build all packages
npm run build

# Lint all packages
npm run lint

# Typecheck all packages
npm run typecheck

# Run tests
npm run test

# Database management
npm run db:up      # Start PostGIS + Redis
npm run db:down    # Stop containers
npm run db:logs    # View logs
npm run db:reset   # Reset database (destroys data)
```

## Project Structure Details

### Frontend (Next.js 14 App Router)

```
apps/frontend/src/
├── app/                    # App Router pages
├── components/
│   ├── ui/                # Reusable UI components
│   ├── map/               # MapLibre components
│   └── panels/            # Sidebar panels
├── lib/                   # Utilities, API clients
├── hooks/                 # Custom React hooks
├── store/                 # Zustand state management
└── types/                 # Frontend-specific types
```

### Backend (FastAPI)

```
apps/backend/app/
├── api/v1/                # API routes
├── core/                  # Config, security
├── db/                    # Database session, migrations
├── models/                # SQLAlchemy models
├── schemas/               # Pydantic schemas
├── services/              # Business logic
└── optimization/          # OR-Tools integration
```

### Shared Types

TypeScript types shared between frontend and backend for:
- GeoJSON feature properties
- Optimization requests/responses
- Simulation events
- Audit/approval workflows

### GIS Engine (Pure TypeScript)

Pure functions for:
- Risk scoring (composite hazard + vulnerability)
- Capacity calculations (nominal vs effective)
- Route feasibility (graph-based with bridge tracking)
- Spatial queries (nearest shelter, accessible routes)

### Optimizer (Python OR-Tools)

CP-SAT model with:
- Decision variables: habitation→shelter, habitation→route, habitation→relocation_site
- Constraints: capacity, travel time, bridge status, relocation limits
- Objectives: minimize travel time, maximize safety, balance load, minimize cost
- Infeasibility analysis with actionable recommendations

## API Endpoints (Planned)

```
GET    /api/v1/health                    # Health check
GET    /api/v1/geo/admin-boundaries      # Administrative boundaries
GET    /api/v1/geo/hazard-zones          # Hazard zones
GET    /api/v1/geo/infrastructure        # Roads, bridges, culverts
GET    /api/v1/geo/shelters              # Shelters with capacity
GET    /api/v1/geo/habitations           # Vulnerable habitations
GET    /api/v1/geo/routes                # Evacuation routes
GET    /api/v1/geo/relocation-sites      # Relocation sites
POST   /api/v1/optimize                  # Run relocation optimization
POST   /api/v1/simulate                  # Run event simulation
GET    /api/v1/audit/log                 # Audit trail
POST   /api/v1/approval/submit           # Submit plan for approval
POST   /api/v1/approval/review           # Review/approve/reject
```

## Environment Variables

See `.env.example` for all configuration options.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `SECRET_KEY` - JWT signing key (32+ chars for production)
- `ORTOOLS_TIME_LIMIT_SECONDS` - Solver time limit

## Testing

```bash
# Frontend tests
cd apps/frontend && npm test

# Backend tests
cd apps/backend && pytest

# All tests
npm run test
```

## Deployment

### Docker (Production)

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Manual

1. Build frontend: `npm run build --filter=@aapda-setu/frontend`
2. Install backend deps: `pip install -r requirements.txt`
3. Run migrations: `alembic upgrade head`
4. Start services with process manager (systemd, supervisor, etc.)

## Contributing

1. Follow the existing code style (run `npm run lint` and `npm run typecheck`)
2. Write tests for new functionality
3. Keep demo data deterministic
4. Separate real integrations from simulated data
5. Never expose API keys or secrets

## License

SIH 2026 Project - Internal Use