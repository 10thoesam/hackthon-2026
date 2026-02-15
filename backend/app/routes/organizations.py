from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.organization import Organization
from app.models.zip_need_score import ZipNeedScore
from app.models.user import User

organizations_bp = Blueprint("organizations", __name__)


@organizations_bp.route("/organizations", methods=["GET"])
def list_organizations():
    query = Organization.query

    org_type = request.args.get("type")
    if org_type:
        query = query.filter_by(org_type=org_type)

    capability = request.args.get("capability")
    if capability:
        query = query.filter(Organization.capabilities.like(f'%"{capability}"%'))

    zip_code = request.args.get("zip")
    if zip_code:
        query = query.filter_by(zip_code=zip_code)

    orgs = query.order_by(Organization.name).all()
    return jsonify([o.to_dict() for o in orgs])


@organizations_bp.route("/organizations", methods=["POST"])
@jwt_required()
def create_organization():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    required = ["name", "org_type", "zip_code", "contact_email"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    if data["org_type"] not in ("supplier", "distributor", "nonprofit"):
        return jsonify({"error": "org_type must be supplier, distributor, or nonprofit"}), 400

    # Look up lat/lng from zip code
    zip_entry = ZipNeedScore.query.filter_by(zip_code=data["zip_code"]).first()
    if zip_entry:
        lat, lng = zip_entry.lat, zip_entry.lng
    else:
        lat = data.get("lat", 0.0)
        lng = data.get("lng", 0.0)

    org = Organization(
        name=data["name"],
        org_type=data["org_type"],
        description=data.get("description", ""),
        zip_code=data["zip_code"],
        lat=lat,
        lng=lng,
        contact_email=data["contact_email"],
        capabilities=data.get("capabilities", []),
        certifications=data.get("certifications", []),
        service_radius_miles=data.get("service_radius_miles", 100.0),
    )
    db.session.add(org)
    db.session.commit()

    # Link the org to the current user
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user:
        user.organization_id = org.id
        db.session.commit()

    return jsonify(org.to_dict()), 201


@organizations_bp.route("/organizations/<int:id>", methods=["GET"])
def get_organization(id):
    org = Organization.query.get_or_404(id)
    data = org.to_dict()
    data["matches"] = sorted(
        [m.to_dict() for m in org.matches],
        key=lambda m: m["score"],
        reverse=True,
    )
    return jsonify(data)
