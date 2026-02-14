from flask import Blueprint, jsonify
from sqlalchemy import func
from app import db
from app.models.solicitation import Solicitation
from app.models.organization import Organization
from app.models.zip_need_score import ZipNeedScore
from app.models.match_result import MatchResult

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/dashboard/stats", methods=["GET"])
def get_stats():
    total_solicitations = Solicitation.query.count()
    total_organizations = Organization.query.count()
    total_matches = MatchResult.query.count()
    avg_need = db.session.query(func.avg(ZipNeedScore.need_score)).scalar() or 0

    return jsonify({
        "total_solicitations": total_solicitations,
        "total_organizations": total_organizations,
        "total_matches": total_matches,
        "avg_need_score": round(float(avg_need), 1),
    })


@dashboard_bp.route("/dashboard/zip-scores", methods=["GET"])
def get_zip_scores():
    scores = ZipNeedScore.query.all()
    return jsonify([z.to_dict() for z in scores])
