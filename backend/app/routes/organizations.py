from flask import Blueprint, request, jsonify
from app import db
from app.models.organization import Organization

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
