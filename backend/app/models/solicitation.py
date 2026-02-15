from app import db
from datetime import datetime, date


class Solicitation(db.Model):
    __tablename__ = "solicitations"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(500), nullable=False)
    description = db.Column(db.Text, nullable=False)
    agency = db.Column(db.String(200), nullable=False)
    naics_code = db.Column(db.String(10))
    set_aside_type = db.Column(db.String(100))
    zip_code = db.Column(db.String(10), nullable=False)
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    posted_date = db.Column(db.Date, default=date.today)
    response_deadline = db.Column(db.Date)
    categories = db.Column(db.JSON, default=list)
    estimated_value = db.Column(db.Float)
    status = db.Column(db.String(20), default="open")
    source_type = db.Column(db.String(20), default="government")
    company_name = db.Column(db.String(200), nullable=True)
    company_email = db.Column(db.String(200), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    matches = db.relationship("MatchResult", backref="solicitation", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "agency": self.agency,
            "naics_code": self.naics_code,
            "set_aside_type": self.set_aside_type,
            "zip_code": self.zip_code,
            "lat": self.lat,
            "lng": self.lng,
            "posted_date": self.posted_date.isoformat() if self.posted_date else None,
            "response_deadline": self.response_deadline.isoformat() if self.response_deadline else None,
            "categories": self.categories or [],
            "estimated_value": self.estimated_value,
            "status": self.status,
            "source_type": self.source_type or "government",
            "company_name": self.company_name,
            "company_email": self.company_email,
        }
