"""Portal APIs — tailored views for suppliers, distributors, and federal/nonprofit clients."""
import math
from flask import Blueprint, request, jsonify
from app import db
from app.models.organization import Organization
from app.models.solicitation import Solicitation
from app.models.zip_need_score import ZipNeedScore
from app.models.emergency_capacity import EmergencyCapacity

portals_bp = Blueprint("portals", __name__)


def haversine(lat1, lng1, lat2, lng2):
    R = 3959
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlng / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


def capability_overlap(list_a, list_b):
    if not list_a or not list_b:
        return 0, []
    set_a = set(c.lower().strip() for c in list_a)
    set_b = set(c.lower().strip() for c in list_b)
    overlap = set_a & set_b
    score = (len(overlap) / max(len(set_a), 1)) * 100 if set_a else 0
    return round(score, 1), list(overlap)


# ─── SUPPLIER PORTAL ───────────────────────────────────────────
@portals_bp.route("/portal/supplier/<int:org_id>/matches", methods=["GET"])
def supplier_matches(org_id):
    """For a supplier: find solicitations that match them + distributors to partner with."""
    supplier = Organization.query.get_or_404(org_id)
    if supplier.org_type != "supplier":
        return jsonify({"error": "Organization is not a supplier"}), 400

    solicitations = Solicitation.query.filter_by(status="open").all()
    distributors = Organization.query.filter_by(org_type="distributor").all()

    # Match solicitations to this supplier
    sol_matches = []
    for sol in solicitations:
        dist = haversine(supplier.lat, supplier.lng, sol.lat, sol.lng)
        if dist > supplier.service_radius_miles * 1.5:
            continue
        cap_score, overlapping = capability_overlap(sol.categories, supplier.capabilities)
        if cap_score == 0:
            continue

        # Find distributors that can bridge supplier → solicitation
        dist_partners = []
        for d in distributors:
            d_to_sol = haversine(d.lat, d.lng, sol.lat, sol.lng)
            d_to_sup = haversine(d.lat, d.lng, supplier.lat, supplier.lng)
            if d_to_sol <= d.service_radius_miles and d_to_sup <= d.service_radius_miles:
                d_cap, d_overlap = capability_overlap(sol.categories, d.capabilities)
                dist_partners.append({
                    "distributor": d.to_dict(),
                    "distance_to_solicitation": round(d_to_sol, 1),
                    "distance_to_supplier": round(d_to_sup, 1),
                    "capability_match": d_cap,
                    "overlapping_capabilities": d_overlap,
                })
        dist_partners.sort(key=lambda x: x["capability_match"], reverse=True)

        need = ZipNeedScore.query.filter_by(zip_code=sol.zip_code).first()
        need_score = need.need_score if need else 50

        composite = cap_score * 0.4 + max(0, (1 - dist / 500)) * 100 * 0.3 + need_score * 0.3
        sol_matches.append({
            "solicitation": sol.to_dict(),
            "match_score": round(min(100, composite), 1),
            "capability_match": cap_score,
            "overlapping_capabilities": overlapping,
            "distance_miles": round(dist, 1),
            "need_score": need_score,
            "distributor_partners": dist_partners[:5],
        })

    sol_matches.sort(key=lambda x: x["match_score"], reverse=True)

    return jsonify({
        "supplier": supplier.to_dict(),
        "matched_solicitations": sol_matches,
        "total_matches": len(sol_matches),
    })


# ─── DISTRIBUTOR PORTAL ────────────────────────────────────────
@portals_bp.route("/portal/distributor/<int:org_id>/matches", methods=["GET"])
def distributor_matches(org_id):
    """For a distributor: find solicitations + suppliers to partner with."""
    distributor = Organization.query.get_or_404(org_id)
    if distributor.org_type != "distributor":
        return jsonify({"error": "Organization is not a distributor"}), 400

    solicitations = Solicitation.query.filter_by(status="open").all()
    suppliers = Organization.query.filter_by(org_type="supplier").all()

    sol_matches = []
    for sol in solicitations:
        dist = haversine(distributor.lat, distributor.lng, sol.lat, sol.lng)
        if dist > distributor.service_radius_miles * 1.5:
            continue
        cap_score, overlapping = capability_overlap(sol.categories, distributor.capabilities)
        if cap_score == 0:
            continue

        # Find suppliers that can provide goods for this solicitation
        sup_partners = []
        for s in suppliers:
            s_to_dist = haversine(s.lat, s.lng, distributor.lat, distributor.lng)
            if s_to_dist <= s.service_radius_miles:
                s_cap, s_overlap = capability_overlap(sol.categories, s.capabilities)
                if s_cap > 0:
                    # Check if supplier has pre-registered capacity
                    caps = EmergencyCapacity.query.filter_by(
                        organization_id=s.id, status="available"
                    ).all()
                    sup_partners.append({
                        "supplier": s.to_dict(),
                        "distance_to_distributor": round(s_to_dist, 1),
                        "capability_match": s_cap,
                        "overlapping_capabilities": s_overlap,
                        "pre_registered_capacity": len(caps),
                    })
            sup_partners.sort(key=lambda x: x["capability_match"], reverse=True)

        need = ZipNeedScore.query.filter_by(zip_code=sol.zip_code).first()
        need_score = need.need_score if need else 50

        composite = cap_score * 0.4 + max(0, (1 - dist / 500)) * 100 * 0.3 + need_score * 0.3
        sol_matches.append({
            "solicitation": sol.to_dict(),
            "match_score": round(min(100, composite), 1),
            "capability_match": cap_score,
            "overlapping_capabilities": overlapping,
            "distance_miles": round(dist, 1),
            "need_score": need_score,
            "supplier_partners": sup_partners[:5],
        })

    sol_matches.sort(key=lambda x: x["match_score"], reverse=True)

    return jsonify({
        "distributor": distributor.to_dict(),
        "matched_solicitations": sol_matches,
        "total_matches": len(sol_matches),
    })


# ─── FEDERAL / NONPROFIT PORTAL ────────────────────────────────
@portals_bp.route("/portal/federal/vendors", methods=["GET"])
def federal_vendor_list():
    """Full vendor directory with NAICS, UEI, past performance for federal comparison."""
    org_type = request.args.get("org_type")  # supplier, distributor, or None for all
    naics = request.args.get("naics")
    capability = request.args.get("capability")
    small_business = request.args.get("small_business")

    query = Organization.query
    if org_type:
        query = query.filter_by(org_type=org_type)
    if small_business == "true":
        query = query.filter_by(small_business=True)

    vendors = query.all()

    # Filter by NAICS if provided
    if naics:
        vendors = [v for v in vendors if naics in (v.naics_codes or [])]

    # Filter by capability
    if capability:
        cap_lower = capability.lower()
        vendors = [
            v for v in vendors
            if any(cap_lower in c.lower() for c in (v.capabilities or []))
        ]

    return jsonify({
        "vendors": [v.to_dict() for v in vendors],
        "total": len(vendors),
    })


@portals_bp.route("/portal/federal/match", methods=["POST"])
def federal_tri_match():
    """Tri-party matching: given a destination ZIP and supply needs,
    find the best supplier + distributor combo and generate a sample RFQ."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400

    dest_zip = data.get("destination_zip")
    categories = data.get("categories", [])
    if not dest_zip:
        return jsonify({"error": "destination_zip required"}), 400

    zip_entry = ZipNeedScore.query.filter_by(zip_code=dest_zip).first()
    dest_lat = zip_entry.lat if zip_entry else 0
    dest_lng = zip_entry.lng if zip_entry else 0
    need_score = zip_entry.need_score if zip_entry else 50

    suppliers = Organization.query.filter_by(org_type="supplier").all()
    distributors = Organization.query.filter_by(org_type="distributor").all()

    combos = []
    for s in suppliers:
        s_dist = haversine(dest_lat, dest_lng, s.lat, s.lng)
        if s_dist > s.service_radius_miles * 1.5:
            continue
        s_cap, s_overlap = capability_overlap(categories, s.capabilities)
        if s_cap == 0:
            continue

        for d in distributors:
            d_dist = haversine(dest_lat, dest_lng, d.lat, d.lng)
            d_to_s = haversine(d.lat, d.lng, s.lat, s.lng)
            if d_dist > d.service_radius_miles * 1.5:
                continue
            d_cap, d_overlap = capability_overlap(categories, d.capabilities)

            # Combo score
            combo_score = (
                s_cap * 0.3 + d_cap * 0.2 +
                max(0, (1 - s_dist / 500)) * 100 * 0.15 +
                max(0, (1 - d_dist / 500)) * 100 * 0.15 +
                need_score * 0.2
            )

            # Estimate costs
            transport_cost = d_dist * 2.0 + d_to_s * 1.5
            past_perf_score = min(100, len(s.past_performance or []) * 25 + len(d.past_performance or []) * 25)

            combos.append({
                "supplier": s.to_dict(),
                "distributor": d.to_dict(),
                "combo_score": round(min(100, combo_score), 1),
                "supplier_capability_match": s_cap,
                "distributor_capability_match": d_cap,
                "supplier_distance": round(s_dist, 1),
                "distributor_distance": round(d_dist, 1),
                "supplier_to_distributor_distance": round(d_to_s, 1),
                "estimated_transport_cost": round(transport_cost, 2),
                "past_performance_score": past_perf_score,
                "combined_certifications": list(set(
                    (s.certifications or []) + (d.certifications or [])
                )),
            })

    combos.sort(key=lambda x: x["combo_score"], reverse=True)

    return jsonify({
        "destination": {
            "zip_code": dest_zip,
            "city": zip_entry.city if zip_entry else None,
            "state": zip_entry.state if zip_entry else None,
            "need_score": need_score,
        },
        "categories": categories,
        "matches": combos[:15],
        "total_combos_evaluated": len(combos),
    })
