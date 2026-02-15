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

    # Government vs Commercial breakdown
    gov_count = Solicitation.query.filter_by(source_type="government").count()
    com_count = Solicitation.query.filter_by(source_type="commercial").count()

    # Open solicitations
    open_count = Solicitation.query.filter_by(status="open").count()

    # Match quality stats
    avg_match_score = db.session.query(func.avg(MatchResult.score)).scalar() or 0
    high_confidence = MatchResult.query.filter(MatchResult.score >= 80).count()

    # Org type breakdown
    suppliers = Organization.query.filter_by(org_type="supplier").count()
    distributors = Organization.query.filter_by(org_type="distributor").count()
    nonprofits = Organization.query.filter_by(org_type="nonprofit").count()

    return jsonify({
        "total_solicitations": total_solicitations,
        "total_organizations": total_organizations,
        "total_matches": total_matches,
        "avg_need_score": round(float(avg_need), 1),
        "government_count": gov_count,
        "commercial_count": com_count,
        "open_count": open_count,
        "avg_match_score": round(float(avg_match_score), 1),
        "high_confidence_matches": high_confidence,
        "suppliers": suppliers,
        "distributors": distributors,
        "nonprofits": nonprofits,
    })


@dashboard_bp.route("/dashboard/zip-scores", methods=["GET"])
def get_zip_scores():
    scores = ZipNeedScore.query.all()
    return jsonify([z.to_dict() for z in scores])
