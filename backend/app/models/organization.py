from app import db
from datetime import datetime


class Organization(db.Model):
    __tablename__ = "organizations"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(300), nullable=False)
    org_type = db.Column(db.String(50), nullable=False)  # supplier, distributor, nonprofit
    description = db.Column(db.Text)
    zip_code = db.Column(db.String(10), nullable=False)
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    contact_email = db.Column(db.String(200))
    capabilities = db.Column(db.JSON, default=list)
    certifications = db.Column(db.JSON, default=list)
    service_radius_miles = db.Column(db.Float, default=100.0)

    # Business identifiers
    naics_codes = db.Column(db.JSON, default=list)  # List of NAICS codes
    uei = db.Column(db.String(20), nullable=True)  # Unique Entity Identifier (SAM.gov)

    # Extended profile
    services_description = db.Column(db.Text, nullable=True)
    past_performance = db.Column(db.JSON, default=list)  # [{contract, agency, value, year, description}]
    annual_revenue = db.Column(db.Float, nullable=True)
    employee_count = db.Column(db.Integer, nullable=True)
    years_in_business = db.Column(db.Integer, nullable=True)
    small_business = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    matches = db.relationship("MatchResult", backref="organization", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "org_type": self.org_type,
            "description": self.description,
            "zip_code": self.zip_code,
            "lat": self.lat,
            "lng": self.lng,
            "contact_email": self.contact_email,
            "capabilities": self.capabilities or [],
            "certifications": self.certifications or [],
            "service_radius_miles": self.service_radius_miles,
            "naics_codes": self.naics_codes or [],
            "uei": self.uei,
            "services_description": self.services_description,
            "past_performance": self.past_performance or [],
            "annual_revenue": self.annual_revenue,
            "employee_count": self.employee_count,
            "years_in_business": self.years_in_business,
            "small_business": self.small_business,
        }
