import math
import json
import os
from openai import OpenAI
from app import db
from app.models.solicitation import Solicitation
from app.models.organization import Organization
from app.models.zip_need_score import ZipNeedScore
from app.models.match_result import MatchResult


def haversine(lat1, lng1, lat2, lng2):
    R = 3959  # Earth radius in miles
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def capability_overlap_score(sol_categories, org_capabilities):
    if not sol_categories or not org_capabilities:
        return 0.0
    sol_set = set(c.lower().strip() for c in sol_categories)
    org_set = set(c.lower().strip() for c in org_capabilities)
    if not sol_set:
        return 0.0
    overlap = len(sol_set & org_set)
    return (overlap / len(sol_set)) * 100


def proximity_score(distance, max_distance=500):
    if distance >= max_distance:
        return 0.0
    return max(0, (1 - distance / max_distance)) * 100


def get_need_score(zip_code):
    zns = ZipNeedScore.query.filter_by(zip_code=zip_code).first()
    return zns.need_score if zns else 50.0


def prefilter_candidates(solicitation):
    orgs = Organization.query.all()
    candidates = []
    for org in orgs:
        dist = haversine(solicitation.lat, solicitation.lng, org.lat, org.lng)
        if dist <= org.service_radius_miles * 1.5:  # generous filter
            cap = capability_overlap_score(solicitation.categories, org.capabilities)
            candidates.append({"org": org, "distance": dist, "capability_overlap": cap})
    # Sort by capability overlap descending, take top 10
    candidates.sort(key=lambda x: x["capability_overlap"], reverse=True)
    return candidates[:10]


def llm_score_match(solicitation, org, distance, need_score):
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        # Return a deterministic fallback score if no API key
        return fallback_score(solicitation, org, distance, need_score)

    client = OpenAI(api_key=api_key)
    prompt = f"""Score this match between a government food solicitation and an organization from 0-100.
Provide your response as JSON: {{"score": <number>, "explanation": "<2-3 sentences>"}}

Solicitation:
- Title: {solicitation.title}
- Description: {solicitation.description}
- Agency: {solicitation.agency}
- Categories: {', '.join(solicitation.categories or [])}
- Set-aside: {solicitation.set_aside_type or 'None'}

Organization:
- Name: {org.name}
- Type: {org.org_type}
- Capabilities: {', '.join(org.capabilities or [])}
- Certifications: {', '.join(org.certifications or [])}
- Description: {org.description or 'N/A'}

Context:
- Distance: {distance:.0f} miles
- ZIP food insecurity need score: {need_score:.0f}/100

Consider: capability alignment, certifications relevant to set-asides, proximity, and community need."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=200,
        )
        content = response.choices[0].message.content.strip()
        # Try to parse JSON from response
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        parsed = json.loads(content)
        return {
            "score": min(100, max(0, float(parsed.get("score", 50)))),
            "explanation": parsed.get("explanation", ""),
        }
    except Exception:
        return fallback_score(solicitation, org, distance, need_score)


def fallback_score(solicitation, org, distance, need_score):
    cap = capability_overlap_score(solicitation.categories, org.capabilities)
    prox = proximity_score(distance)
    base = cap * 0.5 + prox * 0.3 + need_score * 0.2
    score = min(100, max(0, base))

    overlapping = set(c.lower() for c in (solicitation.categories or [])) & set(c.lower() for c in (org.capabilities or []))
    explanation = f"{org.name} has {len(overlapping)} overlapping capabilities"
    if overlapping:
        explanation += f" ({', '.join(list(overlapping)[:3])})"
    explanation += f". Located {distance:.0f} miles away."
    if need_score > 70:
        explanation += f" This area has high food insecurity (need score: {need_score:.0f}/100)."

    return {"score": score, "explanation": explanation}


def generate_matches(solicitation_id):
    solicitation = Solicitation.query.get(solicitation_id)
    if not solicitation:
        return {"error": "Solicitation not found"}

    # Clear existing matches for this solicitation
    MatchResult.query.filter_by(solicitation_id=solicitation_id).delete()

    candidates = prefilter_candidates(solicitation)
    need = get_need_score(solicitation.zip_code)

    results = []
    for c in candidates:
        org = c["org"]
        dist = c["distance"]
        cap_score = c["capability_overlap"]

        llm_result = llm_score_match(solicitation, org, dist, need)

        prox = proximity_score(dist)
        composite = (
            0.3 * cap_score
            + 0.2 * prox
            + 0.2 * need
            + 0.3 * llm_result["score"]
        )

        match = MatchResult(
            solicitation_id=solicitation_id,
            organization_id=org.id,
            score=composite,
            explanation=llm_result["explanation"],
            capability_overlap=cap_score,
            distance_miles=dist,
            need_score_component=need,
            llm_score=llm_result["score"],
        )
        db.session.add(match)
        results.append(match)

    db.session.commit()
    results.sort(key=lambda m: m.score, reverse=True)
    return [m.to_dict() for m in results]
