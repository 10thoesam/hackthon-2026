"""
Matchmaker regression tests.

Root cause note:
The original matchmaker returned 0 results because of hard cutoffs —
  1. `if dist > supplier.service_radius_miles * 1.5: continue`
  2. `if cap_score == 0: continue`
These excluded every organization when the seed data had radius 100–200 mi but
distances were often 500+ miles, and capability strings often didn't overlap due
to inconsistent naming.  Fix: removed all hard cutoffs, score everything with a
continuous distance decay (3000 mi normalization), and return top 25 results.
"""
import json
import pytest
from app import create_app, db
from app.models.organization import Organization
from app.models.solicitation import Solicitation
from app.models.zip_need_score import ZipNeedScore
from app.models.emergency_capacity import EmergencyCapacity
from app.models.user import User


@pytest.fixture
def app(tmp_path, monkeypatch):
    db_path = str(tmp_path / "test.db").replace("\\", "/")
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    # Force re-evaluation of config
    import importlib
    import app.config as cfg_mod
    importlib.reload(cfg_mod)

    app = create_app()
    app.config["TESTING"] = True
    with app.app_context():
        _seed_test_data()
        yield app
        db.session.remove()


@pytest.fixture
def client(app):
    return app.test_client()


def _seed_test_data():
    """Minimal seed for matchmaker testing."""
    # ZIP scores
    zips = [
        ZipNeedScore(zip_code="38614", city="Clarksdale", state="MS",
                     lat=34.2, lng=-90.6, population=15000, need_score=82),
        ZipNeedScore(zip_code="72301", city="West Memphis", state="AR",
                     lat=35.1, lng=-90.2, population=25000, need_score=70),
        ZipNeedScore(zip_code="30301", city="Atlanta", state="GA",
                     lat=33.75, lng=-84.39, population=500000, need_score=55),
    ]
    db.session.add_all(zips)
    db.session.commit()

    # Solicitation
    sol = Solicitation(
        title="Emergency Food Supply - MS Delta",
        description="Emergency food supply solicitation for Mississippi Delta region",
        agency="FEMA Region IV",
        categories=["emergency supply", "fresh produce", "cold storage"],
        zip_code="38614", lat=34.2, lng=-90.6,
        status="open", estimated_value=500000,
        source_type="government",
    )
    db.session.add(sol)
    db.session.commit()

    # Supplier
    sup = Organization(
        name="Delta Fresh Foods",
        org_type="supplier",
        zip_code="72301", lat=35.1, lng=-90.2,
        capabilities=["fresh produce", "cold storage", "emergency supply"],
        certifications=["USDA"],
        service_radius_miles=500,
        contact_email="delta@test.com",
    )
    # Distributor (vendor)
    dist = Organization(
        name="MidSouth Logistics",
        org_type="distributor",
        zip_code="30301", lat=33.75, lng=-84.39,
        capabilities=["last mile delivery", "cold storage", "warehouse distribution"],
        certifications=["FEMA vendor"],
        service_radius_miles=1000,
        contact_email="midsouth@test.com",
    )
    # Nonprofit
    ngo = Organization(
        name="Feed the Delta",
        org_type="nonprofit",
        zip_code="38614", lat=34.2, lng=-90.6,
        capabilities=["community nutrition", "mobile food pantry"],
        certifications=["Feeding America"],
        service_radius_miles=200,
        contact_email="feed@test.com",
    )
    db.session.add_all([sup, dist, ngo])
    db.session.commit()

    # Emergency capacity
    cap = EmergencyCapacity(
        organization_id=sup.id,
        supply_type="water",
        item_name="Bottled Water 16oz",
        quantity=5000, unit="cases",
        zip_code="72301", lat=35.1, lng=-90.2,
        service_radius_miles=500,
        status="available",
    )
    db.session.add(cap)
    db.session.commit()


# ─── Supplier Portal ────────────────────────────────────────
class TestSupplierPortal:
    def test_supplier_matches_returns_results(self, client):
        sup = Organization.query.filter_by(org_type="supplier").first()
        res = client.get(f"/api/portal/supplier/{sup.id}/matches")
        assert res.status_code == 200
        data = res.get_json()
        assert data["total_matches"] > 0
        assert len(data["matched_solicitations"]) > 0

    def test_supplier_matches_include_score_fields(self, client):
        sup = Organization.query.filter_by(org_type="supplier").first()
        res = client.get(f"/api/portal/supplier/{sup.id}/matches")
        match = res.get_json()["matched_solicitations"][0]
        assert "match_score" in match
        assert "capability_match" in match
        assert "distance_miles" in match
        assert "need_score" in match
        assert "distributor_partners" in match

    def test_non_supplier_returns_400(self, client):
        dist = Organization.query.filter_by(org_type="distributor").first()
        res = client.get(f"/api/portal/supplier/{dist.id}/matches")
        assert res.status_code == 400


# ─── Distributor (Vendor) Portal ─────────────────────────────
class TestDistributorPortal:
    def test_distributor_matches_returns_results(self, client):
        dist = Organization.query.filter_by(org_type="distributor").first()
        res = client.get(f"/api/portal/distributor/{dist.id}/matches")
        assert res.status_code == 200
        data = res.get_json()
        assert data["total_matches"] > 0

    def test_distributor_matches_include_supplier_partners(self, client):
        dist = Organization.query.filter_by(org_type="distributor").first()
        res = client.get(f"/api/portal/distributor/{dist.id}/matches")
        match = res.get_json()["matched_solicitations"][0]
        assert "supplier_partners" in match
        assert len(match["supplier_partners"]) > 0

    def test_non_distributor_returns_400(self, client):
        sup = Organization.query.filter_by(org_type="supplier").first()
        res = client.get(f"/api/portal/distributor/{sup.id}/matches")
        assert res.status_code == 400


# ─── Federal Tri-Match ───────────────────────────────────────
class TestFederalTriMatch:
    def test_tri_match_returns_combos(self, client):
        res = client.post("/api/portal/federal/match",
                          json={"destination_zip": "38614",
                                "categories": ["fresh produce", "cold storage"]})
        assert res.status_code == 200
        data = res.get_json()
        assert data["total_combos_evaluated"] > 0
        assert len(data["matches"]) > 0

    def test_tri_match_scores_are_bounded(self, client):
        res = client.post("/api/portal/federal/match",
                          json={"destination_zip": "38614", "categories": []})
        data = res.get_json()
        for combo in data["matches"]:
            assert 0 <= combo["combo_score"] <= 100

    def test_tri_match_unknown_zip_falls_back(self, client):
        res = client.post("/api/portal/federal/match",
                          json={"destination_zip": "99999", "categories": []})
        assert res.status_code == 200
        data = res.get_json()
        assert data["total_combos_evaluated"] > 0

    def test_tri_match_essential_category_filter(self, client):
        res = client.post("/api/portal/federal/match",
                          json={"destination_zip": "38614",
                                "essential_category": "water"})
        assert res.status_code == 200
        data = res.get_json()
        # Should still return combos even with category filter
        assert data["total_combos_evaluated"] > 0

    def test_tri_match_supplier_capacity_included(self, client):
        res = client.post("/api/portal/federal/match",
                          json={"destination_zip": "38614", "categories": []})
        data = res.get_json()
        # At least one combo should have supplier_capacity
        has_capacity = any(len(c.get("supplier_capacity", [])) > 0 for c in data["matches"])
        assert has_capacity

    def test_tri_match_missing_zip_returns_400(self, client):
        res = client.post("/api/portal/federal/match",
                          json={"categories": ["food"]})
        assert res.status_code == 400


# ─── Federal Vendor List ─────────────────────────────────────
class TestFederalVendorList:
    def test_returns_all_vendors(self, client):
        res = client.get("/api/portal/federal/vendors")
        assert res.status_code == 200
        data = res.get_json()
        assert data["total"] == 3

    def test_filter_by_org_type(self, client):
        res = client.get("/api/portal/federal/vendors?org_type=supplier")
        data = res.get_json()
        assert data["total"] == 1
        assert data["vendors"][0]["org_type"] == "supplier"

    def test_filter_by_capability(self, client):
        res = client.get("/api/portal/federal/vendors?capability=cold%20storage")
        data = res.get_json()
        assert data["total"] >= 1


# ─── Emergency Capacity ──────────────────────────────────────
class TestEmergencyCapacity:
    def test_list_capacity(self, client):
        res = client.get("/api/emergency/capacity")
        assert res.status_code == 200
        data = res.get_json()
        assert len(data) > 0

    def test_filter_by_supply_type(self, client):
        res = client.get("/api/emergency/capacity?supply_type=water")
        data = res.get_json()
        assert all(c["supply_type"] == "water" for c in data)

    def test_filter_by_essential_category(self, client):
        res = client.get("/api/emergency/capacity?category=water")
        data = res.get_json()
        assert all(c["supply_type"] == "water" for c in data)

    def test_search_by_item_name(self, client):
        res = client.get("/api/emergency/capacity?search=bottled")
        data = res.get_json()
        assert len(data) > 0
        assert "bottled" in data[0]["item_name"].lower()


# ─── Crisis Dashboard ────────────────────────────────────────
class TestCrisisDashboard:
    def test_dashboard_loads(self, client):
        res = client.get("/api/emergency/crisis-dashboard")
        assert res.status_code == 200
        data = res.get_json()
        assert "regions" in data
        assert "summary" in data
        assert data["summary"]["total_capacity_registrations"] > 0


# ─── Haversine & Capability Overlap (unit) ────────────────────
class TestUtilFunctions:
    def test_haversine_same_point(self):
        from app.routes.portals import haversine
        assert haversine(34.0, -90.0, 34.0, -90.0) == 0.0

    def test_haversine_reasonable_distance(self):
        from app.routes.portals import haversine
        # Clarksdale MS to Atlanta GA ~ 430 miles
        d = haversine(34.2, -90.6, 33.75, -84.39)
        assert 350 < d < 500

    def test_capability_overlap_full(self):
        from app.routes.portals import capability_overlap
        score, overlap = capability_overlap(
            ["cold storage", "fresh produce"],
            ["cold storage", "fresh produce", "other"]
        )
        assert score == 100.0
        assert set(overlap) == {"cold storage", "fresh produce"}

    def test_capability_overlap_partial(self):
        from app.routes.portals import capability_overlap
        score, overlap = capability_overlap(
            ["cold storage", "fresh produce", "delivery"],
            ["cold storage"]
        )
        assert 0 < score < 100

    def test_capability_overlap_none(self):
        from app.routes.portals import capability_overlap
        score, overlap = capability_overlap(["a"], ["b"])
        assert score == 0
        assert overlap == []

    def test_capability_overlap_empty(self):
        from app.routes.portals import capability_overlap
        score, overlap = capability_overlap([], ["b"])
        assert score == 0
