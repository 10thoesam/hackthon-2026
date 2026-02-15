from app import db
from datetime import datetime


class EmergencyCapacity(db.Model):
    __tablename__ = "emergency_capacities"

    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey("organizations.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    # Capacity details
    supply_type = db.Column(db.String(50), nullable=False)  # water, non_perishable, fresh_produce, medical_nutrition, shelf_stable, baby_formula
    item_name = db.Column(db.String(200), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit = db.Column(db.String(50), default="units")  # units, lbs, pallets, cases, gallons
    unit_cost = db.Column(db.Float, default=0.0)

    # Availability
    available_date = db.Column(db.Date, nullable=True)
    expiry_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(20), default="available")  # available, reserved, deployed, expired

    # Location
    zip_code = db.Column(db.String(10), nullable=False)
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    service_radius_miles = db.Column(db.Float, default=200.0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    organization = db.relationship("Organization", backref="emergency_capacities")

    def to_dict(self):
        return {
            "id": self.id,
            "organization_id": self.organization_id,
            "organization": self.organization.to_dict() if self.organization else None,
            "user_id": self.user_id,
            "supply_type": self.supply_type,
            "item_name": self.item_name,
            "quantity": self.quantity,
            "unit": self.unit,
            "unit_cost": self.unit_cost,
            "available_date": self.available_date.isoformat() if self.available_date else None,
            "expiry_date": self.expiry_date.isoformat() if self.expiry_date else None,
            "status": self.status,
            "zip_code": self.zip_code,
            "lat": self.lat,
            "lng": self.lng,
            "service_radius_miles": self.service_radius_miles,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
