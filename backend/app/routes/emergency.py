from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from app import db
from app.models.emergency_capacity import EmergencyCapacity
from app.models.organization import Organization
from app.models.zip_need_score import ZipNeedScore
from app.models.user import User
from datetime import date

emergency_bp = Blueprint("emergency", __name__)

SUPPLY_TYPES = [
    "water", "non_perishable", "fresh_produce", "canned_goods",
    "baby_formula", "medical_nutrition", "shelf_stable", "grains_cereals",
    "protein", "dairy", "hygiene_supplies",
]


@emergency_bp.route("/emergency/capacity", methods=["GET"])
def list_capacity():
    """List all available emergency capacity, optionally filtered."""
    query = EmergencyCapacity.query.filter_by(status="available")

    supply_type = request.args.get("supply_type")
    if supply_type:
        query = query.filter_by(supply_type=supply_type)

    zip_code = request.args.get("zip_code")
    if zip_code:
        query = query.filter_by(zip_code=zip_code)

    state = request.args.get("state")
    if state:
        # Join with ZipNeedScore to filter by state
        zip_codes = [z.zip_code for z in ZipNeedScore.query.filter_by(state=state).all()]
        if zip_codes:
            query = query.filter(EmergencyCapacity.zip_code.in_(zip_codes))

    items = query.order_by(EmergencyCapacity.created_at.desc()).all()
    return jsonify([i.to_dict() for i in items])


@emergency_bp.route("/emergency/capacity", methods=["POST"])
@jwt_required()
def register_capacity():
    """Supplier registers emergency capacity before disaster hits."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400

    required = ["organization_id", "supply_type", "item_name", "quantity", "zip_code"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing: {', '.join(missing)}"}), 400

    if data["supply_type"] not in SUPPLY_TYPES:
        return jsonify({"error": f"Invalid supply_type. Must be one of: {', '.join(SUPPLY_TYPES)}"}), 400

    org = Organization.query.get(data["organization_id"])
    if not org:
        return jsonify({"error": "Organization not found"}), 404

    # Look up lat/lng from zip
    zip_entry = ZipNeedScore.query.filter_by(zip_code=data["zip_code"]).first()
    lat = zip_entry.lat if zip_entry else data.get("lat", 0.0)
    lng = zip_entry.lng if zip_entry else data.get("lng", 0.0)

    user_id = int(get_jwt_identity())

    available_date = None
    if data.get("available_date"):
        try:
            available_date = date.fromisoformat(data["available_date"])
        except ValueError:
            pass

    expiry_date = None
    if data.get("expiry_date"):
        try:
            expiry_date = date.fromisoformat(data["expiry_date"])
        except ValueError:
            pass

    cap = EmergencyCapacity(
        organization_id=data["organization_id"],
        user_id=user_id,
        supply_type=data["supply_type"],
        item_name=data["item_name"],
        quantity=int(data["quantity"]),
        unit=data.get("unit", "units"),
        unit_cost=float(data.get("unit_cost", 0)),
        available_date=available_date,
        expiry_date=expiry_date,
        zip_code=data["zip_code"],
        lat=lat,
        lng=lng,
        service_radius_miles=float(data.get("service_radius_miles", 200)),
    )
    db.session.add(cap)
    db.session.commit()
    return jsonify(cap.to_dict()), 201


@emergency_bp.route("/emergency/capacity/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_capacity(id):
    cap = EmergencyCapacity.query.get_or_404(id)
    user_id = int(get_jwt_identity())
    current_user = User.query.get(user_id)
    if not current_user.is_admin and cap.user_id != user_id:
        return jsonify({"error": "Not authorized"}), 403
    db.session.delete(cap)
    db.session.commit()
    return jsonify({"message": "Capacity removed"})


@emergency_bp.route("/emergency/crisis-dashboard", methods=["GET"])
def crisis_dashboard():
    """Crisis activation dashboard showing available capacity by region."""
    all_zips = ZipNeedScore.query.all()
    all_capacity = EmergencyCapacity.query.filter_by(status="available").all()
    orgs = Organization.query.all()

    # Group capacity by state
    zip_to_state = {z.zip_code: z.state for z in all_zips}
    zip_to_city = {z.zip_code: z.city for z in all_zips}

    regions = {}
    for z in all_zips:
        st = z.state or "Unknown"
        if st not in regions:
            regions[st] = {
                "state": st,
                "total_population": 0,
                "avg_need_score": [],
                "critical_zips": 0,
                "capacity_items": [],
                "organizations": [],
                "cities": [],
            }
        regions[st]["total_population"] += z.population or 0
        regions[st]["avg_need_score"].append(z.need_score)
        regions[st]["cities"].append(z.city)
        if z.need_score >= 75:
            regions[st]["critical_zips"] += 1

    # Add capacity to regions
    for cap in all_capacity:
        st = zip_to_state.get(cap.zip_code, "Unknown")
        if st in regions:
            regions[st]["capacity_items"].append({
                "supply_type": cap.supply_type,
                "item_name": cap.item_name,
                "quantity": cap.quantity,
                "unit": cap.unit,
                "org_name": cap.organization.name if cap.organization else "Unknown",
            })

    # Add orgs to regions
    for org in orgs:
        st = zip_to_state.get(org.zip_code, "Unknown")
        if st in regions:
            regions[st]["organizations"].append({
                "name": org.name,
                "type": org.org_type,
                "capabilities": org.capabilities or [],
            })

    # Finalize averages
    result = []
    for st, data in regions.items():
        scores = data["avg_need_score"]
        data["avg_need_score"] = round(sum(scores) / len(scores), 1) if scores else 0
        data["cities"] = list(set(data["cities"]))[:5]
        result.append(data)

    result.sort(key=lambda r: r["avg_need_score"], reverse=True)

    # Summary stats
    total_capacity_items = len(all_capacity)
    total_quantity = sum(c.quantity for c in all_capacity)
    by_type = {}
    for c in all_capacity:
        if c.supply_type not in by_type:
            by_type[c.supply_type] = 0
        by_type[c.supply_type] += c.quantity

    return jsonify({
        "regions": result,
        "summary": {
            "total_capacity_registrations": total_capacity_items,
            "total_quantity": total_quantity,
            "by_supply_type": by_type,
            "total_organizations": len(orgs),
            "critical_regions": sum(1 for r in result if r["avg_need_score"] >= 70),
        },
    })


@emergency_bp.route("/emergency/supply-types", methods=["GET"])
def get_supply_types():
    return jsonify(SUPPLY_TYPES)
