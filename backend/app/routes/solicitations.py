from flask import Blueprint, request, jsonify
from app import db
from app.models.solicitation import Solicitation

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

    solicitations = query.order_by(Solicitation.posted_date.desc()).all()
    return jsonify([s.to_dict() for s in solicitations])


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
