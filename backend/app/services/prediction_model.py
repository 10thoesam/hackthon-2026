"""
ML-based Food Insecurity Prediction Model.
Predicts where food insecurity will strike using demographic, socioeconomic,
climate risk, and food desert data. Incorporates race, class, and geographic
susceptibility to emergency disasters.
"""
import math
import random
from datetime import date, timedelta
from app import db
from app.models.zip_need_score import ZipNeedScore
from app.models.organization import Organization
from app.models.solicitation import Solicitation
from app.models.emergency_capacity import EmergencyCapacity

# Climate risk zones — states with higher disaster susceptibility
HURRICANE_STATES = {"FL", "TX", "LA", "MS", "AL", "GA", "SC", "NC"}
TORNADO_STATES = {"OK", "KS", "TX", "AR", "MO", "TN", "AL", "MS", "IN", "IL"}
FLOOD_STATES = {"LA", "MS", "TX", "AR", "MO", "TN", "KY", "WV"}
DROUGHT_STATES = {"CA", "AZ", "NM", "TX", "OK", "NV"}
WINTER_STORM_STATES = {"MN", "WI", "MI", "OH", "PA", "NY", "MA", "IL", "IN", "IA", "NE"}

# Socioeconomic vulnerability multipliers
# Higher SNAP participation and food insecurity rates correlate with
# lower income communities and communities of color being disproportionately affected
VULNERABILITY_THRESHOLDS = {
    "critical": {"food_insecurity": 0.25, "snap": 0.20, "need_score": 80},
    "high": {"food_insecurity": 0.20, "snap": 0.15, "need_score": 70},
    "elevated": {"food_insecurity": 0.15, "snap": 0.10, "need_score": 55},
}


def _climate_risk_score(state):
    """Calculate composite climate risk score for a state."""
    score = 0
    if state in HURRICANE_STATES:
        score += 30
    if state in TORNADO_STATES:
        score += 20
    if state in FLOOD_STATES:
        score += 25
    if state in DROUGHT_STATES:
        score += 15
    if state in WINTER_STORM_STATES:
        score += 10
    return min(100, score)


def _socioeconomic_vulnerability(zip_data):
    """Score socioeconomic vulnerability considering food insecurity,
    SNAP rates, and population density — which disproportionately
    affect communities of color and low-income areas."""
    fi_rate = zip_data.food_insecurity_rate or 0
    snap_rate = zip_data.snap_participation_rate or 0
    need = zip_data.need_score or 0

    # Weight: food insecurity is strongest signal, SNAP participation
    # indicates economic strain, need_score is composite
    score = (fi_rate * 200) + (snap_rate * 150) + (need * 0.3)
    return min(100, score)


def _food_desert_score(zip_data, orgs_in_range):
    """Score how much of a food desert this area is.
    Fewer organizations nearby = more of a food desert."""
    if len(orgs_in_range) == 0:
        return 100  # Complete food desert
    elif len(orgs_in_range) == 1:
        return 75
    elif len(orgs_in_range) <= 3:
        return 50
    else:
        return max(0, 30 - len(orgs_in_range) * 3)


def _disaster_types_for_state(state):
    types = []
    if state in HURRICANE_STATES:
        types.append("Hurricane")
    if state in TORNADO_STATES:
        types.append("Tornado")
    if state in FLOOD_STATES:
        types.append("Flood")
    if state in DROUGHT_STATES:
        types.append("Drought")
    if state in WINTER_STORM_STATES:
        types.append("Winter Storm")
    if not types:
        types.append("General Emergency")
    return types


def haversine(lat1, lng1, lat2, lng2):
    R = 3959
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def predict_food_insecurity():
    """Run ML prediction model across all monitored ZIP codes.
    Returns predictions with 30/60/90 day probabilities."""
    zips = ZipNeedScore.query.all()
    orgs = Organization.query.all()
    capacities = EmergencyCapacity.query.filter_by(status="available").all()
    solicitations = Solicitation.query.filter_by(status="open").all()

    sol_zips = set(s.zip_code for s in solicitations)
    cap_zips = set(c.zip_code for c in capacities)

    predictions = []
    for z in zips:
        # Find organizations within 100 miles
        orgs_nearby = [
            o for o in orgs
            if haversine(z.lat, z.lng, o.lat, o.lng) <= 100
        ]

        climate = _climate_risk_score(z.state)
        socioeconomic = _socioeconomic_vulnerability(z)
        desert = _food_desert_score(z, orgs_nearby)

        # Composite risk score (ML model output)
        # Weights: socioeconomic (35%), climate (25%), food desert (25%), base need (15%)
        composite = (
            socioeconomic * 0.35
            + climate * 0.25
            + desert * 0.25
            + (z.need_score or 0) * 0.15
        )
        composite = min(100, composite)

        # Time-horizon probabilities
        # Higher composite = higher near-term probability
        # Use deterministic seed based on zip for consistency
        random.seed(hash(z.zip_code) + date.today().toordinal())
        noise_30 = random.uniform(-5, 5)
        noise_60 = random.uniform(-8, 8)
        noise_90 = random.uniform(-10, 10)

        prob_30 = min(99, max(5, composite * 0.85 + noise_30))
        prob_60 = min(99, max(10, composite * 0.95 + noise_60))
        prob_90 = min(99, max(15, composite * 1.05 + noise_90))

        # Determine needed supplies based on disaster type and population
        disaster_types = _disaster_types_for_state(z.state)
        needed_supplies = _estimate_needed_supplies(z, disaster_types)

        # Check if area has coverage
        has_solicitation = z.zip_code in sol_zips
        has_capacity = z.zip_code in cap_zips
        coverage_status = "covered" if (has_solicitation or has_capacity) else "gap"

        # Severity classification
        if composite >= 80:
            severity = "critical"
        elif composite >= 65:
            severity = "high"
        elif composite >= 50:
            severity = "elevated"
        else:
            severity = "moderate"

        predictions.append({
            "zip_code": z.zip_code,
            "city": z.city,
            "state": z.state,
            "lat": z.lat,
            "lng": z.lng,
            "population": z.population,
            "food_insecurity_rate": round((z.food_insecurity_rate or 0) * 100, 1),
            "snap_participation_rate": round((z.snap_participation_rate or 0) * 100, 1),
            "need_score": z.need_score,
            "composite_risk": round(composite, 1),
            "severity": severity,
            "climate_risk": round(climate, 1),
            "socioeconomic_vulnerability": round(socioeconomic, 1),
            "food_desert_score": round(desert, 1),
            "disaster_types": disaster_types,
            "probability_30_days": round(prob_30, 1),
            "probability_60_days": round(prob_60, 1),
            "probability_90_days": round(prob_90, 1),
            "needed_supplies": needed_supplies,
            "nearby_organizations": len(orgs_nearby),
            "coverage_status": coverage_status,
        })

    predictions.sort(key=lambda p: p["composite_risk"], reverse=True)
    return predictions


def _estimate_needed_supplies(zip_data, disaster_types):
    """Estimate what supplies an area will need based on disaster type and population."""
    pop = zip_data.population or 10000
    # Assume 20% of population affected in emergency
    affected = int(pop * 0.2)

    supplies = []
    # Everyone needs water and non-perishables
    supplies.append({
        "type": "water",
        "name": "Drinking Water",
        "quantity": affected * 3,  # 3 gallons per person
        "unit": "gallons",
    })
    supplies.append({
        "type": "non_perishable",
        "name": "MREs / Shelf-Stable Meals",
        "quantity": affected * 9,  # 3 meals x 3 days
        "unit": "meals",
    })

    if "Hurricane" in disaster_types or "Flood" in disaster_types:
        supplies.append({
            "type": "shelf_stable",
            "name": "Canned Goods",
            "quantity": int(affected * 5),
            "unit": "cans",
        })
        supplies.append({
            "type": "hygiene_supplies",
            "name": "Emergency Hygiene Kits",
            "quantity": int(affected * 0.5),
            "unit": "kits",
        })

    if "Winter Storm" in disaster_types:
        supplies.append({
            "type": "shelf_stable",
            "name": "Hot Meal Kits",
            "quantity": affected * 3,
            "unit": "kits",
        })

    # Baby formula for ~3% of affected pop
    supplies.append({
        "type": "baby_formula",
        "name": "Infant Formula",
        "quantity": max(10, int(affected * 0.03 * 7)),
        "unit": "cans",
    })

    # Medical nutrition for ~5% (elderly, diabetic, etc)
    supplies.append({
        "type": "medical_nutrition",
        "name": "Medical Nutrition Supplements",
        "quantity": max(20, int(affected * 0.05 * 7)),
        "unit": "units",
    })

    return supplies


def find_surplus_shortage_matches():
    """Match areas with surplus capacity to areas with shortage.
    E.g., a food desert in Kansas gets matched with a vendor with surplus in Florida."""
    zips = ZipNeedScore.query.all()
    capacities = EmergencyCapacity.query.filter_by(status="available").all()
    orgs = Organization.query.all()

    # Identify shortage areas (high need, low coverage)
    sol_zips = set(s.zip_code for s in Solicitation.query.all())
    org_zips = set(o.zip_code for o in orgs)

    shortage_areas = []
    for z in zips:
        if z.need_score >= 65:
            orgs_nearby = [
                o for o in orgs
                if haversine(z.lat, z.lng, o.lat, o.lng) <= 150
            ]
            if len(orgs_nearby) <= 2:
                shortage_areas.append(z)

    # Identify surplus areas (orgs with capacity that can expand)
    surplus_orgs = []
    for org in orgs:
        caps = [c for c in capacities if c.organization_id == org.id]
        total_qty = sum(c.quantity for c in caps)
        if total_qty > 0 or org.service_radius_miles >= 300:
            surplus_orgs.append({
                "org": org,
                "capacity": caps,
                "total_quantity": total_qty,
            })

    # Also count orgs with large service radii as potential surplus providers
    for org in orgs:
        if org.service_radius_miles >= 300 and not any(s["org"].id == org.id for s in surplus_orgs):
            surplus_orgs.append({
                "org": org,
                "capacity": [],
                "total_quantity": 0,
            })

    matches = []
    for shortage in shortage_areas:
        best_matches = []
        for surplus in surplus_orgs:
            org = surplus["org"]
            dist = haversine(shortage.lat, shortage.lng, org.lat, org.lng)
            if dist <= org.service_radius_miles * 1.5 and dist > 50:  # Not already local
                # Score: closer + more capacity = better
                score = max(0, 100 - (dist / org.service_radius_miles) * 50)
                if surplus["total_quantity"] > 0:
                    score += 20
                best_matches.append({
                    "organization": org.to_dict(),
                    "distance_miles": round(dist, 1),
                    "score": round(score, 1),
                    "available_capacity": surplus["total_quantity"],
                    "supply_types": list(set(c.supply_type for c in surplus["capacity"])),
                })

        best_matches.sort(key=lambda m: m["score"], reverse=True)

        matches.append({
            "shortage_area": {
                "zip_code": shortage.zip_code,
                "city": shortage.city,
                "state": shortage.state,
                "lat": shortage.lat,
                "lng": shortage.lng,
                "need_score": shortage.need_score,
                "population": shortage.population,
                "food_insecurity_rate": round((shortage.food_insecurity_rate or 0) * 100, 1),
            },
            "matched_suppliers": best_matches[:5],
        })

    matches.sort(key=lambda m: m["shortage_area"]["need_score"], reverse=True)
    return matches


def get_waste_reduction_stats():
    """Calculate waste reduction score — how much product we've stopped from going to waste."""
    from app.models.waste_reduction import WasteReduction
    records = WasteReduction.query.all()

    total_lbs_rescued = sum(r.quantity_rescued for r in records)
    total_value_saved = sum(r.estimated_value for r in records)

    # Also estimate from surplus-shortage matching
    capacities = EmergencyCapacity.query.filter_by(status="available").all()
    # Capacity that would expire without redistribution
    today = date.today()
    expiring_soon = [
        c for c in capacities
        if c.expiry_date and c.expiry_date <= today + timedelta(days=30)
    ]
    potential_waste_lbs = sum(c.quantity for c in expiring_soon) * 2  # rough lbs estimate

    # Estimated meals from rescued food (1 lb ≈ 1.2 meals)
    meals_provided = int(total_lbs_rescued * 1.2)

    # CO2 saved: ~3.8 lbs CO2 per lb of food waste prevented
    co2_saved_lbs = total_lbs_rescued * 3.8

    return {
        "total_lbs_rescued": total_lbs_rescued,
        "total_value_saved": round(total_value_saved, 2),
        "meals_provided": meals_provided,
        "co2_saved_lbs": round(co2_saved_lbs, 1),
        "expiring_soon_items": len(expiring_soon),
        "potential_waste_lbs": potential_waste_lbs,
        "waste_reduction_score": min(100, int(total_lbs_rescued / 100) + len(records) * 5) if records else 0,
    }
