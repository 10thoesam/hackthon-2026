from flask import Blueprint, request, jsonify
from app.models.match_result import MatchResult
from app.services.matching import generate_matches

matches_bp = Blueprint("matches", __name__)


@matches_bp.route("/matches/generate", methods=["POST"])
def trigger_matching():
    data = request.get_json()
    solicitation_id = data.get("solicitation_id")
    if not solicitation_id:
        return jsonify({"error": "solicitation_id required"}), 400

    results = generate_matches(solicitation_id)
    if isinstance(results, dict) and "error" in results:
        return jsonify(results), 404

    return jsonify(results)


@matches_bp.route("/matches", methods=["GET"])
def list_matches():
    sol_id = request.args.get("solicitation_id")
    org_id = request.args.get("organization_id")

    query = MatchResult.query

    if sol_id:
        query = query.filter_by(solicitation_id=int(sol_id))
    if org_id:
        query = query.filter_by(organization_id=int(org_id))

    matches = query.order_by(MatchResult.score.desc()).all()
    return jsonify([m.to_dict() for m in matches])
