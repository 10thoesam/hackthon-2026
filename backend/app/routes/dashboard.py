import json
import os
from flask import Blueprint, jsonify
from sqlalchemy import func
from openai import OpenAI
from app import db
from app.models.solicitation import Solicitation
from app.models.organization import Organization
from app.models.zip_need_score import ZipNeedScore
from app.models.match_result import MatchResult

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/dashboard/stats", methods=["GET"])
def get_stats():
    total_solicitations = Solicitation.query.count()
    total_organizations = Organization.query.count()
    total_matches = MatchResult.query.count()
    avg_need = db.session.query(func.avg(ZipNeedScore.need_score)).scalar() or 0

    # Government vs Commercial breakdown
    gov_count = Solicitation.query.filter_by(source_type="government").count()
    com_count = Solicitation.query.filter_by(source_type="commercial").count()

    # Open solicitations
    open_count = Solicitation.query.filter_by(status="open").count()

    # Match quality stats
    avg_match_score = db.session.query(func.avg(MatchResult.score)).scalar() or 0
    high_confidence = MatchResult.query.filter(MatchResult.score >= 80).count()

    # Org type breakdown
    suppliers = Organization.query.filter_by(org_type="supplier").count()
    distributors = Organization.query.filter_by(org_type="distributor").count()
    nonprofits = Organization.query.filter_by(org_type="nonprofit").count()

    # Crisis stats
    critical_zips = ZipNeedScore.query.filter(ZipNeedScore.need_score >= 80).all()
    population_at_risk = sum(z.population or 0 for z in critical_zips)

    all_zips = ZipNeedScore.query.all()
    total_monitored_pop = sum(z.population or 0 for z in all_zips)

    # Coverage gap population
    sol_zips = set(s.zip_code for s in Solicitation.query.with_entities(Solicitation.zip_code).all())
    org_zips = set(o.zip_code for o in Organization.query.with_entities(Organization.zip_code).all())
    covered_zips = sol_zips | org_zips
    underserved_pop = sum(
        z.population or 0 for z in all_zips
        if z.need_score >= 70 and z.zip_code not in covered_zips
    )

    return jsonify({
        "total_solicitations": total_solicitations,
        "total_organizations": total_organizations,
        "total_matches": total_matches,
        "avg_need_score": round(float(avg_need), 1),
        "government_count": gov_count,
        "commercial_count": com_count,
        "open_count": open_count,
        "avg_match_score": round(float(avg_match_score), 1),
        "high_confidence_matches": high_confidence,
        "suppliers": suppliers,
        "distributors": distributors,
        "nonprofits": nonprofits,
        "critical_zones": len(critical_zips),
        "population_at_risk": population_at_risk,
        "total_monitored_population": total_monitored_pop,
        "underserved_population": underserved_pop,
    })


@dashboard_bp.route("/dashboard/zip-scores", methods=["GET"])
def get_zip_scores():
    scores = ZipNeedScore.query.all()
    return jsonify([z.to_dict() for z in scores])


@dashboard_bp.route("/dashboard/crisis-forecast", methods=["GET"])
def crisis_forecast():
    """AI-powered crisis forecast analyzing current food security data."""
    # Gather data for the AI
    zips = ZipNeedScore.query.order_by(ZipNeedScore.need_score.desc()).all()
    critical = [z for z in zips if z.need_score >= 75]
    solicitations = Solicitation.query.filter_by(status="open").all()
    orgs = Organization.query.all()

    sol_zips = set(s.zip_code for s in solicitations)
    org_zips = set(o.zip_code for o in orgs)

    gap_areas = [z for z in critical if z.zip_code not in sol_zips and z.zip_code not in org_zips]
    total_at_risk = sum(z.population or 0 for z in critical)

    # Build region summaries
    regions = {}
    for z in zips:
        state = z.state or "Unknown"
        if state not in regions:
            regions[state] = {"cities": [], "max_need": 0, "total_pop": 0, "avg_insecurity": []}
        regions[state]["cities"].append(z.city)
        regions[state]["max_need"] = max(regions[state]["max_need"], z.need_score)
        regions[state]["total_pop"] += z.population or 0
        regions[state]["avg_insecurity"].append(z.food_insecurity_rate or 0)

    for state in regions:
        rates = regions[state]["avg_insecurity"]
        regions[state]["avg_insecurity"] = round(sum(rates) / len(rates) * 100, 1) if rates else 0

    # Sort by max need
    top_regions = sorted(regions.items(), key=lambda x: x[1]["max_need"], reverse=True)[:8]

    region_summary = "\n".join(
        f"- {state}: {data['max_need']} max need score, {data['avg_insecurity']}% avg food insecurity, "
        f"pop {data['total_pop']:,}, cities: {', '.join(data['cities'][:3])}"
        for state, data in top_regions
    )

    gap_summary = "\n".join(
        f"- {z.city}, {z.state} (ZIP {z.zip_code}): need score {z.need_score}, "
        f"food insecurity {z.food_insecurity_rate * 100:.0f}%, pop {z.population:,}"
        for z in gap_areas[:6]
    )

    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        return jsonify(_fallback_forecast(critical, gap_areas, total_at_risk, top_regions))

    client = OpenAI(api_key=api_key)
    prompt = f"""You are FoodMatch Crisis AI, analyzing real-time food security data for the United States.
Generate a crisis threat assessment based on this data. Be urgent, specific, and actionable.

DATA SNAPSHOT:
- Monitoring {len(zips)} zones across the US
- {len(critical)} critical zones (need score 75+)
- {total_at_risk:,} people in critical food insecurity zones
- {len(solicitations)} active food supply contracts
- {len(orgs)} registered response organizations
- {len(gap_areas)} critical areas with ZERO coverage (no contracts or organizations)

TOP RISK REGIONS:
{region_summary}

UNCOVERED CRITICAL ZONES:
{gap_summary}

Respond in JSON format:
{{
  "threat_level": "SEVERE" or "HIGH" or "ELEVATED" or "MODERATE",
  "headline": "<urgent 10-15 word headline about the current food security crisis>",
  "situation_summary": "<2-3 sentence overview of current food security threats>",
  "predictions": [
    {{
      "region": "<state or city name>",
      "risk": "critical" or "high" or "moderate",
      "prediction": "<1-2 sentence specific prediction about worsening conditions>",
      "recommended_action": "<specific action to take>"
    }}
  ],
  "immediate_actions": ["<action 1>", "<action 2>", "<action 3>"],
  "estimated_impact": "<sentence about how many people are affected>"
}}

Include 3-4 predictions. Be specific about locations and numbers. Frame this as a crisis response briefing."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=800,
        )
        content = response.choices[0].message.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        parsed = json.loads(content)
        return jsonify(parsed)
    except Exception:
        return jsonify(_fallback_forecast(critical, gap_areas, total_at_risk, top_regions))


def _fallback_forecast(critical, gap_areas, total_at_risk, top_regions):
    """Deterministic fallback when OpenAI is unavailable."""
    threat = "SEVERE" if len(critical) >= 10 else "HIGH" if len(critical) >= 5 else "ELEVATED"

    predictions = []
    for state, data in top_regions[:4]:
        risk = "critical" if data["max_need"] >= 85 else "high" if data["max_need"] >= 75 else "moderate"
        predictions.append({
            "region": f"{', '.join(data['cities'][:2])}, {state}",
            "risk": risk,
            "prediction": f"Food insecurity rate of {data['avg_insecurity']}% with need score {data['max_need']} "
                          f"indicates worsening conditions for {data['total_pop']:,} residents.",
            "recommended_action": f"Deploy emergency food distribution and activate supply chain contracts in {state}."
        })

    return {
        "threat_level": threat,
        "headline": f"{len(critical)} Critical Zones Identified — {total_at_risk:,} Americans at Risk",
        "situation_summary": (
            f"Analysis of {len(critical)} critical food insecurity zones reveals {total_at_risk:,} people "
            f"facing immediate food access challenges. {len(gap_areas)} high-need areas have zero active "
            f"contracts or response organizations, creating dangerous coverage gaps."
        ),
        "predictions": predictions,
        "immediate_actions": [
            f"Activate emergency contracts in {len(gap_areas)} uncovered critical zones",
            "Deploy mobile food distribution to highest-need ZIP codes",
            "Engage commercial partners for rapid supply chain expansion",
        ],
        "estimated_impact": f"Approximately {total_at_risk:,} people across {len(critical)} zones require immediate food security intervention.",
    }
