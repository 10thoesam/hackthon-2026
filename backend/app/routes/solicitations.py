from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.solicitation import Solicitation
from app.models.zip_need_score import ZipNeedScore
from datetime import date

solicitations_bp = Blueprint("solicitations", __name__)


@solicitations_bp.route("/solicitations", methods=["GET"])
def list_solicitations():
    query = Solicitation.query

    status = request.args.get("status")
    if status:
        query = query.filter_by(status=status)

    category = request.args.get("category")
    if category:
        query = query.filter(Solicitation.categories.like(f'%"{category}"%'))

    zip_code = request.args.get("zip")
    if zip_code:
        query = query.filter_by(zip_code=zip_code)

    agency = request.args.get("agency")
    if agency:
        query = query.filter(Solicitation.agency.ilike(f"%{agency}%"))

    source_type = request.args.get("source_type")
    if source_type:
        query = query.filter_by(source_type=source_type)

    solicitations = query.order_by(Solicitation.posted_date.desc()).all()
    return jsonify([s.to_dict() for s in solicitations])


@solicitations_bp.route("/solicitations", methods=["POST"])
@jwt_required()
def create_solicitation():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    required = ["title", "description", "company_name", "company_email", "zip_code"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    # Look up lat/lng from zip code
    zip_entry = ZipNeedScore.query.filter_by(zip_code=data["zip_code"]).first()
    if zip_entry:
        lat, lng = zip_entry.lat, zip_entry.lng
    else:
        lat = data.get("lat", 0.0)
        lng = data.get("lng", 0.0)

    # Parse response_deadline if provided
    response_deadline = None
    if data.get("response_deadline"):
        try:
            response_deadline = date.fromisoformat(data["response_deadline"])
        except ValueError:
            return jsonify({"error": "Invalid date format for response_deadline. Use YYYY-MM-DD."}), 400

    user_id = int(get_jwt_identity())

    sol = Solicitation(
        title=data["title"],
        description=data["description"],
        agency=data.get("company_name", ""),
        company_name=data["company_name"],
        company_email=data["company_email"],
        zip_code=data["zip_code"],
        lat=lat,
        lng=lng,
        categories=data.get("categories", []),
        estimated_value=data.get("estimated_value"),
        response_deadline=response_deadline,
        source_type="commercial",
        status="open",
        user_id=user_id,
    )
    db.session.add(sol)
    db.session.commit()
    return jsonify(sol.to_dict()), 201


@solicitations_bp.route("/solicitations/<int:id>", methods=["GET"])
def get_solicitation(id):
    sol = Solicitation.query.get_or_404(id)
    data = sol.to_dict()
    data["matches"] = sorted(
        [m.to_dict() for m in sol.matches],
        key=lambda m: m["score"],
        reverse=True,
    )
    return jsonify(data)


@solicitations_bp.route("/solicitations/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_solicitation(id):
    sol = Solicitation.query.get_or_404(id)
    user_id = int(get_jwt_identity())

    if sol.source_type == "government":
        return jsonify({"error": "Government solicitations cannot be deleted"}), 403
    if sol.user_id != user_id:
        return jsonify({"error": "You can only delete your own solicitations"}), 403

    for match in sol.matches:
        db.session.delete(match)
    db.session.delete(sol)
    db.session.commit()
    return jsonify({"message": "Solicitation deleted"}), 200
