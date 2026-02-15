import math
import random
from flask import Blueprint, request, jsonify
from app import db
from app.models.organization import Organization
from app.models.emergency_capacity import EmergencyCapacity
from app.models.zip_need_score import ZipNeedScore

rfq_bp = Blueprint("rfq", __name__)


def haversine(lat1, lng1, lat2, lng2):
    R = 3959
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


# Base cost estimates per unit by supply type
BASE_COSTS = {
    "water": {"unit": "gallon", "cost": 1.50, "weight_lbs": 8.34},
    "non_perishable": {"unit": "meal", "cost": 4.50, "weight_lbs": 1.5},
    "fresh_produce": {"unit": "lb", "cost": 2.80, "weight_lbs": 1.0},
    "canned_goods": {"unit": "can", "cost": 2.00, "weight_lbs": 1.0},
    "baby_formula": {"unit": "can", "cost": 18.00, "weight_lbs": 1.5},
    "medical_nutrition": {"unit": "unit", "cost": 12.00, "weight_lbs": 1.0},
    "shelf_stable": {"unit": "unit", "cost": 3.50, "weight_lbs": 1.2},
    "grains_cereals": {"unit": "lb", "cost": 1.80, "weight_lbs": 1.0},
    "protein": {"unit": "lb", "cost": 5.50, "weight_lbs": 1.0},
    "dairy": {"unit": "unit", "cost": 4.00, "weight_lbs": 2.0},
    "hygiene_supplies": {"unit": "kit", "cost": 8.00, "weight_lbs": 3.0},
}

# Market rate transport data
TRUCK_TYPES = {
    "dry_van": {"capacity_lbs": 44000, "cost_per_mile_loaded": 2.85, "cost_per_mile_empty": 1.60, "daily_rate": 850},
    "reefer": {"capacity_lbs": 42000, "cost_per_mile_loaded": 3.45, "cost_per_mile_empty": 1.90, "daily_rate": 1100},
    "flatbed": {"capacity_lbs": 48000, "cost_per_mile_loaded": 3.15, "cost_per_mile_empty": 1.75, "daily_rate": 950},
    "ltl": {"capacity_lbs": 15000, "cost_per_mile_loaded": 1.95, "cost_per_mile_empty": 0.0, "daily_rate": 0},
}

# Fuel surcharge (% of base rate)
FUEL_SURCHARGE_RATE = 0.18


def calculate_transport_cost(distance_miles, total_weight_lbs, needs_refrigeration=False):
    """Calculate transport cost based on market rates: mileage, weight, truck capacity, routes."""
    if needs_refrigeration:
        truck = TRUCK_TYPES["reefer"]
    elif total_weight_lbs > 15000:
        truck = TRUCK_TYPES["dry_van"]
    else:
        truck = TRUCK_TYPES["ltl"]

    # Number of trucks needed
    trucks_needed = max(1, math.ceil(total_weight_lbs / truck["capacity_lbs"]))

    # Base mileage cost
    mileage_cost = distance_miles * truck["cost_per_mile_loaded"] * trucks_needed

    # Fuel surcharge
    fuel_surcharge = mileage_cost * FUEL_SURCHARGE_RATE

    # Weight surcharge for heavy loads (over 80% capacity)
    weight_ratio = total_weight_lbs / (truck["capacity_lbs"] * trucks_needed)
    weight_surcharge = mileage_cost * 0.05 if weight_ratio > 0.8 else 0

    # Daily rate for multi-day routes
    est_days = max(1, math.ceil(distance_miles / 450))
    daily_cost = truck["daily_rate"] * est_days * trucks_needed if truck["daily_rate"] > 0 else 0

    total = mileage_cost + fuel_surcharge + weight_surcharge + daily_cost

    return {
        "base_mileage_cost": round(mileage_cost, 2),
        "fuel_surcharge": round(fuel_surcharge, 2),
        "weight_surcharge": round(weight_surcharge, 2),
        "daily_rate_cost": round(daily_cost, 2),
        "total_transport": round(total, 2),
        "trucks_needed": trucks_needed,
        "truck_type": "Reefer" if needs_refrigeration else ("Dry Van" if total_weight_lbs > 15000 else "LTL"),
        "estimated_transit_days": est_days,
        "cost_per_mile": round(total / max(1, distance_miles), 2),
        "cost_per_lb": round(total / max(1, total_weight_lbs), 2),
    }


@rfq_bp.route("/rfq/estimate", methods=["POST"])
def generate_rfq():
    """Generate sample RFQ with per-vendor quotes based on market rate data.
    Each company shows different prices based on their stock, distance, and capabilities."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400

    dest_zip = data.get("destination_zip")
    items = data.get("items", [])

    if not dest_zip or not items:
        return jsonify({"error": "destination_zip and items are required"}), 400

    zip_entry = ZipNeedScore.query.filter_by(zip_code=dest_zip).first()
    dest_lat = zip_entry.lat if zip_entry else float(data.get("lat", 0))
    dest_lng = zip_entry.lng if zip_entry else float(data.get("lng", 0))
    dest_city = zip_entry.city if zip_entry else "Unknown"
    dest_state = zip_entry.state if zip_entry else "Unknown"

    # Build line items with weight
    line_items = []
    subtotal = 0
    total_weight = 0
    needs_refrigeration = False
    for item in items:
        st = item.get("supply_type", "non_perishable")
        qty = int(item.get("quantity", 0))
        base = BASE_COSTS.get(st, BASE_COSTS["non_perishable"])
        unit_cost = base["cost"]
        total_cost = unit_cost * qty
        weight = base["weight_lbs"] * qty
        total_weight += weight
        if st in ("fresh_produce", "dairy", "protein"):
            needs_refrigeration = True

        line_items.append({
            "supply_type": st,
            "description": item.get("description", st.replace("_", " ").title()),
            "quantity": qty,
            "unit": base["unit"],
            "unit_cost": unit_cost,
            "total_cost": round(total_cost, 2),
            "weight_lbs": round(weight, 1),
        })
        subtotal += total_cost

    # Get all suppliers and distributors
    suppliers = Organization.query.filter_by(org_type="supplier").all()
    distributors = Organization.query.filter_by(org_type="distributor").all()

    # Pre-registered capacity
    supply_types_needed = [i["supply_type"] for i in items if i.get("supply_type")]
    capacities = EmergencyCapacity.query.filter(
        EmergencyCapacity.supply_type.in_(supply_types_needed),
        EmergencyCapacity.status == "available",
    ).all() if supply_types_needed else []

    # Build SUPPLIER quotes — each has different pricing
    supplier_quotes = []
    for s in suppliers:
        dist = haversine(dest_lat, dest_lng, s.lat, s.lng)
        if dist > s.service_radius_miles * 1.5:
            continue

        # Each supplier has unique pricing multiplier based on their profile
        random.seed(hash(s.name + dest_zip))
        price_factor = 0.85 + random.random() * 0.35  # 0.85x to 1.20x of base

        # Per-item pricing for this supplier
        item_quotes = []
        supplier_total = 0
        for li in line_items:
            st = li["supply_type"]
            # Check if supplier has this item in stock
            sup_caps = [c for c in capacities if c.organization_id == s.id and c.supply_type == st]
            in_stock = len(sup_caps) > 0
            stock_qty = sum(c.quantity for c in sup_caps) if in_stock else 0

            # Price varies per supplier: base * factor, discounted if in-stock
            unit_price = round(li["unit_cost"] * price_factor * (0.92 if in_stock else 1.0), 2)
            item_total = round(unit_price * li["quantity"], 2)
            supplier_total += item_total

            item_quotes.append({
                "supply_type": st,
                "description": li["description"],
                "quantity": li["quantity"],
                "unit": li["unit"],
                "unit_price": unit_price,
                "line_total": item_total,
                "in_stock": in_stock,
                "stock_available": stock_qty,
                "weight_lbs": li["weight_lbs"],
            })

        # Capability match
        cap_count = 0
        for item in items:
            st = item.get("supply_type", "").replace("_", " ")
            for cap in (s.capabilities or []):
                if st in cap.lower() or cap.lower() in st:
                    cap_count += 1
                    break

        supplier_quotes.append({
            "organization": s.to_dict(),
            "role": "supplier",
            "distance_miles": round(dist, 1),
            "item_quotes": item_quotes,
            "supply_subtotal": round(supplier_total, 2),
            "capability_match_pct": round((cap_count / max(1, len(items))) * 100, 1),
            "has_inventory": any(iq["in_stock"] for iq in item_quotes),
            "certifications": s.certifications or [],
            "estimated_lead_days": max(1, int(dist / 300) + 1),
        })

    supplier_quotes.sort(key=lambda v: v["supply_subtotal"])

    # Build DISTRIBUTOR quotes — transport pricing based on market rates
    distributor_quotes = []
    for d in distributors:
        dist = haversine(dest_lat, dest_lng, d.lat, d.lng)
        if dist > d.service_radius_miles * 1.5:
            continue

        # Each distributor has fleet efficiency factor
        random.seed(hash(d.name + dest_zip))
        efficiency = 0.90 + random.random() * 0.25  # 0.90x to 1.15x

        transport = calculate_transport_cost(dist, total_weight, needs_refrigeration)

        # Apply distributor efficiency factor
        adjusted_transport = round(transport["total_transport"] * efficiency, 2)

        # Handling fee (per-lb fee for loading/unloading/warehousing)
        handling_fee = round(total_weight * (0.08 + random.random() * 0.06), 2)  # $0.08-$0.14/lb

        # Distributor markup on goods (if they source too)
        markup_pct = round(3 + random.random() * 8, 1)  # 3-11% markup

        total_distributor_cost = adjusted_transport + handling_fee

        distributor_quotes.append({
            "organization": d.to_dict(),
            "role": "distributor",
            "distance_miles": round(dist, 1),
            "transport_breakdown": {
                "base_mileage": transport["base_mileage_cost"],
                "fuel_surcharge": transport["fuel_surcharge"],
                "weight_surcharge": transport["weight_surcharge"],
                "daily_rate": transport["daily_rate_cost"],
                "total_transport": adjusted_transport,
            },
            "handling_fee": handling_fee,
            "total_logistics_cost": round(total_distributor_cost, 2),
            "trucks_needed": transport["trucks_needed"],
            "truck_type": transport["truck_type"],
            "estimated_transit_days": transport["estimated_transit_days"],
            "cost_per_mile": round(adjusted_transport / max(1, dist), 2),
            "cost_per_lb": round(total_distributor_cost / max(1, total_weight), 2),
            "markup_pct": markup_pct,
            "certifications": d.certifications or [],
            "fleet_type": transport["truck_type"],
        })

    distributor_quotes.sort(key=lambda v: v["total_logistics_cost"])

    # Build combo comparisons (supplier + distributor pairs)
    combos = []
    for sq in supplier_quotes[:8]:
        for dq in distributor_quotes[:8]:
            s_to_d = haversine(sq["organization"]["lat"], sq["organization"]["lng"],
                               dq["organization"]["lat"], dq["organization"]["lng"])
            combo_total = sq["supply_subtotal"] + dq["total_logistics_cost"]
            combos.append({
                "supplier": {"name": sq["organization"]["name"], "uei": sq["organization"].get("uei"),
                             "supply_cost": sq["supply_subtotal"], "distance": sq["distance_miles"],
                             "has_inventory": sq["has_inventory"], "lead_days": sq["estimated_lead_days"]},
                "distributor": {"name": dq["organization"]["name"], "uei": dq["organization"].get("uei"),
                                "logistics_cost": dq["total_logistics_cost"], "distance": dq["distance_miles"],
                                "transit_days": dq["estimated_transit_days"], "trucks": dq["trucks_needed"]},
                "total_cost": round(combo_total, 2),
                "total_delivery_days": sq["estimated_lead_days"] + dq["estimated_transit_days"],
                "route_distance": round(s_to_d + dq["distance_miles"], 1),
            })
    combos.sort(key=lambda c: c["total_cost"])

    rfq = {
        "rfq_number": f"FM-RFQ-{dest_zip}-{len(items):02d}",
        "title": f"Emergency Food Supply RFQ — {dest_city}, {dest_state}",
        "destination": {
            "zip_code": dest_zip,
            "city": dest_city,
            "state": dest_state,
            "lat": dest_lat,
            "lng": dest_lng,
        },
        "line_items": line_items,
        "subtotal": round(subtotal, 2),
        "total_weight_lbs": round(total_weight, 1),
        "needs_refrigeration": needs_refrigeration,
        "market_data": {
            "fuel_surcharge_rate": f"{FUEL_SURCHARGE_RATE * 100}%",
            "truck_types": TRUCK_TYPES,
        },
        "supplier_quotes": supplier_quotes[:10],
        "distributor_quotes": distributor_quotes[:10],
        "combo_rankings": combos[:15],
        "total_suppliers_evaluated": len(supplier_quotes),
        "total_distributors_evaluated": len(distributor_quotes),
        "best_supplier": supplier_quotes[0] if supplier_quotes else None,
        "best_distributor": distributor_quotes[0] if distributor_quotes else None,
        "best_combo": combos[0] if combos else None,
        "need_score": zip_entry.need_score if zip_entry else None,
    }

    return jsonify(rfq)


@rfq_bp.route("/rfq/supply-costs", methods=["GET"])
def supply_costs():
    """Return base cost estimates for all supply types."""
    return jsonify(BASE_COSTS)
