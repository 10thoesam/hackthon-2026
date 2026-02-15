from flask import Blueprint, request, jsonify
from app.services.prediction_model import (
    predict_food_insecurity,
    find_surplus_shortage_matches,
    get_waste_reduction_stats,
)

predictions_bp = Blueprint("predictions", __name__)


@predictions_bp.route("/predictions/food-insecurity", methods=["GET"])
def food_insecurity_predictions():
    """ML model predictions for food insecurity across all monitored zones."""
    predictions = predict_food_insecurity()

    # Optional filter by severity
    severity = request.args.get("severity")
    if severity:
        predictions = [p for p in predictions if p["severity"] == severity]

    # Optional filter by state
    state = request.args.get("state")
    if state:
        predictions = [p for p in predictions if p["state"] == state.upper()]

    # Summary stats
    critical = [p for p in predictions if p["severity"] == "critical"]
    high = [p for p in predictions if p["severity"] == "high"]
    total_at_risk = sum(p["population"] for p in critical + high)

    return jsonify({
        "predictions": predictions,
        "summary": {
            "total_zones": len(predictions),
            "critical": len(critical),
            "high": len(high),
            "elevated": len([p for p in predictions if p["severity"] == "elevated"]),
            "moderate": len([p for p in predictions if p["severity"] == "moderate"]),
            "total_population_at_risk": total_at_risk,
            "coverage_gaps": len([p for p in predictions if p["coverage_status"] == "gap"]),
        },
    })


@predictions_bp.route("/predictions/surplus-matching", methods=["GET"])
def surplus_matching():
    """Match surplus vendors to shortage areas to prevent waste."""
    matches = find_surplus_shortage_matches()
    return jsonify({
        "matches": matches,
        "total_shortage_areas": len(matches),
        "total_matched": len([m for m in matches if m["matched_suppliers"]]),
    })


@predictions_bp.route("/predictions/waste-reduction", methods=["GET"])
def waste_reduction():
    """Waste reduction score and stats."""
    stats = get_waste_reduction_stats()
    return jsonify(stats)
