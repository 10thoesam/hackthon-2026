from app import db
from datetime import datetime


class WasteReduction(db.Model):
    __tablename__ = "waste_reductions"

    id = db.Column(db.Integer, primary_key=True)
    source_org_id = db.Column(db.Integer, db.ForeignKey("organizations.id"), nullable=True)
    dest_org_id = db.Column(db.Integer, db.ForeignKey("organizations.id"), nullable=True)

    supply_type = db.Column(db.String(50), nullable=False)
    item_name = db.Column(db.String(200), nullable=False)
    quantity_rescued = db.Column(db.Integer, default=0)
    unit = db.Column(db.String(50), default="lbs")
    estimated_value = db.Column(db.Float, default=0.0)

    source_zip = db.Column(db.String(10))
    dest_zip = db.Column(db.String(10))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    source_org = db.relationship("Organization", foreign_keys=[source_org_id], backref="waste_sourced")
    dest_org = db.relationship("Organization", foreign_keys=[dest_org_id], backref="waste_received")

    def to_dict(self):
        return {
            "id": self.id,
            "source_org": self.source_org.to_dict() if self.source_org else None,
            "dest_org": self.dest_org.to_dict() if self.dest_org else None,
            "supply_type": self.supply_type,
            "item_name": self.item_name,
            "quantity_rescued": self.quantity_rescued,
            "unit": self.unit,
            "estimated_value": self.estimated_value,
            "source_zip": self.source_zip,
            "dest_zip": self.dest_zip,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
