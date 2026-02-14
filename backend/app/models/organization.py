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
        }
