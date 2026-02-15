import math
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


@rfq_bp.route("/rfq/estimate", methods=["POST"])
def generate_rfq():
    """Generate a sample RFQ with estimated cost using supplier and distributor data.
    For federal users and nonprofits to compare with contractors."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400

    dest_zip = data.get("destination_zip")
    items = data.get("items", [])  # [{"supply_type": "water", "quantity": 1000}, ...]

    if not dest_zip or not items:
        return jsonify({"error": "destination_zip and items are required"}), 400

    # Look up destination
    zip_entry = ZipNeedScore.query.filter_by(zip_code=dest_zip).first()
    dest_lat = zip_entry.lat if zip_entry else float(data.get("lat", 0))
    dest_lng = zip_entry.lng if zip_entry else float(data.get("lng", 0))
    dest_city = zip_entry.city if zip_entry else "Unknown"
    dest_state = zip_entry.state if zip_entry else "Unknown"

    # Find eligible suppliers and distributors
    suppliers = Organization.query.filter(
        Organization.org_type.in_(["supplier", "distributor"])
    ).all()

    # Find existing emergency capacity for these items
    supply_types_needed = [i["supply_type"] for i in items if i.get("supply_type")]
    capacities = EmergencyCapacity.query.filter(
        EmergencyCapacity.supply_type.in_(supply_types_needed),
        EmergencyCapacity.status == "available",
    ).all() if supply_types_needed else []

    # Build line items
    line_items = []
    subtotal = 0
    for item in items:
        st = item.get("supply_type", "non_perishable")
        qty = int(item.get("quantity", 0))
        base = BASE_COSTS.get(st, BASE_COSTS["non_perishable"])

        unit_cost = base["cost"]
        total_cost = unit_cost * qty
        weight = base["weight_lbs"] * qty

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

    # Find best suppliers for each item and create vendor comparisons
    vendor_quotes = []
    for supplier in suppliers:
        dist = haversine(dest_lat, dest_lng, supplier.lat, supplier.lng)
        if dist > supplier.service_radius_miles * 1.5:
            continue

        # Transport cost estimate: $2.50/mile for first 100 miles, $1.50/mile after
        if dist <= 100:
            transport_cost = dist * 2.50
        else:
            transport_cost = 100 * 2.50 + (dist - 100) * 1.50

        total_weight = sum(li["weight_lbs"] for li in line_items)
        # Per-lb transport adjustment
        transport_per_lb = transport_cost / max(1, total_weight) if total_weight > 0 else 0

        # Check if supplier has pre-registered capacity
        supplier_caps = [c for c in capacities if c.organization_id == supplier.id]
        has_inventory = len(supplier_caps) > 0
        inventory_discount = 0.05 if has_inventory else 0  # 5% discount if already stocked

        # Capability match score
        cap_match = 0
        for item in items:
            st = item.get("supply_type", "")
            if st.replace("_", " ") in [c.lower() for c in (supplier.capabilities or [])]:
                cap_match += 1
            # Also check partial matches
            for cap in (supplier.capabilities or []):
                if st.replace("_", " ") in cap.lower() or cap.lower() in st.replace("_", " "):
                    cap_match += 0.5

        supplier_subtotal = subtotal * (1 - inventory_discount)
        total_estimate = supplier_subtotal + transport_cost

        vendor_quotes.append({
            "organization": supplier.to_dict(),
            "distance_miles": round(dist, 1),
            "transport_cost": round(transport_cost, 2),
            "supply_cost": round(supplier_subtotal, 2),
            "total_estimate": round(total_estimate, 2),
            "has_pre_registered_inventory": has_inventory,
            "inventory_items": [c.to_dict() for c in supplier_caps],
            "capability_match": round(cap_match, 1),
            "certifications": supplier.certifications or [],
            "estimated_delivery_days": max(1, int(dist / 200) + 1),
        })

    vendor_quotes.sort(key=lambda v: v["total_estimate"])

    # Build the sample RFQ document
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
        "vendor_quotes": vendor_quotes[:10],
        "total_vendors_evaluated": len(vendor_quotes),
        "best_value": vendor_quotes[0] if vendor_quotes else None,
        "fastest_delivery": min(vendor_quotes, key=lambda v: v["estimated_delivery_days"]) if vendor_quotes else None,
        "need_score": zip_entry.need_score if zip_entry else None,
    }

    return jsonify(rfq)


@rfq_bp.route("/rfq/supply-costs", methods=["GET"])
def supply_costs():
    """Return base cost estimates for all supply types."""
    return jsonify(BASE_COSTS)
