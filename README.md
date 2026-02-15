# FoodMatch MVP

AI-powered matchmaking platform that connects government food distribution solicitations with qualified organizations (suppliers, distributors, and nonprofits).

## What It Does

FoodMatch helps solve food insecurity by intelligently matching government RFPs/solicitations with the best-fit organizations based on:

- **Capability overlap** — matching solicitation categories to organization capabilities
- **Geographic proximity** — prioritizing nearby organizations using haversine distance
- **Community need** — weighting areas with higher food insecurity scores
- **AI evaluation** — GPT-4o-mini scores each match considering certifications, set-asides, and contextual fit

## Tech Stack

**Backend:** Flask, SQLAlchemy, SQLite, OpenAI API
**Frontend:** React 19, Vite, Tailwind CSS, Leaflet maps, Axios

## How Matching Works

1. **Prefilter** — Narrows all organizations to the top 10 candidates by proximity (within 1.5x service radius) and capability overlap
2. **Score** — Each candidate is scored across 4 components:
   | Component | Weight |
   |-----------|--------|
   | Capability Overlap | 30% |
   | Proximity | 20% |
   | Food Insecurity Need Score | 20% |
   | LLM Score (GPT-4o-mini) | 30% |
3. **Composite** — `final = 0.3 * capability + 0.2 * proximity + 0.2 * need + 0.3 * llm`
4. **Results** — Matches are saved and returned sorted by score

If no OpenAI key is configured, a deterministic fallback formula is used instead.

## Getting Started

### Backend

```bash
cd hackthon-2026/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file:
```
OPENAI_API_KEY=sk-your-key-here
```

Seed the database and run:
```bash
python scripts/seed.py
python run.py
```

Backend runs on `http://localhost:5000`.

### Frontend

```bash
cd hackthon-2026/frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` with API proxy to the backend.

## Seeded Data

- **52 ZIP codes** with real US food insecurity metrics (food insecurity rate, SNAP participation, population)
- **28 government solicitations** across agencies like USDA, state departments, and city programs
- **18 organizations** — a mix of suppliers, distributors, and nonprofits across the US

## Project Structure

```
hackthon-2026/
  backend/
    app/
      models/          # Solicitation, Organization, ZipNeedScore, MatchResult
      routes/          # API endpoints (solicitations, organizations, matches, dashboard)
      services/        # Matching algorithm
      config.py
    scripts/
      seed.py          # Database seeding
    run.py
  frontend/
    src/
      pages/           # Dashboard, Solicitations, SolicitationDetail, Organizations
      components/      # MatchCard, ScoreBar, MapView, FilterBar, StatsCard
      utils/api.js     # Axios API client
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/solicitations` | List solicitations (filter by status, agency, category, zip) |
| GET | `/api/solicitations/:id` | Solicitation detail with matches |
| GET | `/api/organizations` | List organizations (filter by type, capability, zip) |
| GET | `/api/organizations/:id` | Organization detail with matches |
| POST | `/api/matches/generate` | Generate matches for a solicitation |
| GET | `/api/matches` | List matches (filter by solicitation_id, organization_id) |
| GET | `/api/dashboard/stats` | Dashboard statistics |
| GET | `/api/dashboard/zip-scores` | ZIP code food insecurity data for mapping |
