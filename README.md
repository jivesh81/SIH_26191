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

The demo runs entirely from local synthetic GeoJSON files — **no Postgres, Redis, or Docker required** for the demo mode.

### Prerequisites

- Node.js 20+
- Python 3.11+
- npm 10+

### 1. Install Dependencies

```bash
# Frontend
cd apps/frontend && npm install

# Backend
cd apps/backend && pip install -r requirements.txt
```

### 2. Run Development Servers

```bash
# Terminal 1: Frontend (port 3000)
npm run dev --filter=@aapda-setu/frontend

# Terminal 2: Backend (port 8000)
cd apps/backend && uvicorn app.main:app --reload --port 8000
```

### 3. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/v1
- API Docs: http://localhost:8000/api/v1/docs

The running application reports `"data_mode": "local_synthetic_demo"` — no database or Redis needed.

### Optional: Full Stack with Infrastructure

For production-like development with PostGIS + Redis:

```bash
# Start infrastructure (PostgreSQL 16 + PostGIS 3.4, Redis 7)
npm run db:up

# Seed database (when using Postgres)
cd apps/backend && python -m app.db.seed

# Run with infrastructure
npm run dev
```

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

## API Endpoints

All endpoints are served under `/api/v1/` prefix.

### Health & Dashboard

```
GET    /api/v1/health                    # Health check
GET    /api/v1/dashboard                 # Dashboard statistics
```

### Habitations

```
GET    /api/v1/habitations               # List all vulnerable habitations (paginated)
GET    /api/v1/habitations/{habitation_id}  # Get habitation by ID
GET    /api/v1/habitations/high-vulnerability  # Get high vulnerability habitations
```

### Relocation Sites

```
GET    /api/v1/sites                     # List all relocation sites (paginated)
GET    /api/v1/sites/{site_id}           # Get site by ID
```

### Evacuation Routes

```
GET    /api/v1/routes                    # List all evacuation routes (paginated)
GET    /api/v1/routes/{route_id}         # Get route by ID
GET    /api/v1/routes/feasible           # Get feasible (open) routes
```

### Hazards

```
GET    /api/v1/hazards                   # List all hazard zones (paginated)
GET    /api/v1/hazards/{hazard_id}       # Get hazard zone by ID
```

### Shelters

```
GET    /api/v1/shelters                  # List all shelters (paginated)
GET    /api/v1/shelters/{shelter_id}     # Get shelter by ID
```

### Events

```
GET    /api/v1/events                    # List example disaster events
```

### Core Intelligence - Risk

```
GET    /api/v1/intelligence/risk                    # Risk assessments for all habitations
GET    /api/v1/intelligence/risk/red-zone           # All RED_ZONE habitations
GET    /api/v1/intelligence/risk/{habitation_id}    # Risk assessment for one habitation
```

### Core Intelligence - ML Predictive Risk

```
POST   /api/v1/intelligence/risk/predict            # ML-enhanced risk prediction for one habitation
POST   /api/v1/intelligence/risk/predict/batch      # ML-enhanced risk predictions for all habitations
```

### Core Intelligence - Effective Capacity

```
GET    /api/v1/intelligence/capacity                # Effective capacities for all sites
GET    /api/v1/intelligence/capacity/{site_id}      # Effective capacity for one site
```

### Core Intelligence - Route Feasibility

```
GET    /api/v1/intelligence/route/feasibility                    # All habitation-site route feasibility
GET    /api/v1/intelligence/route/feasibility/habitation/{habitation_id}  # Routes from one habitation
GET    /api/v1/intelligence/route/feasibility/site/{site_id}           # Routes to one site
```

### Relocation Optimization

```
POST   /api/v1/optimization/relocation    # Run relocation optimization (CP-SAT)
```

### Dynamic Events & Plan Versioning

```
POST   /api/v1/events/trigger             # Trigger disaster event
GET    /api/v1/events                     # Get event log
GET    /api/v1/plan/active                # Get active relocation plan
```

### Plan Approval & SMS Dispatch

```
POST   /api/v1/plan/approve               # Approve plan & trigger SMS
GET    /api/v1/notifications/sms-log      # Get SMS dispatch log
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