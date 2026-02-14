from app import db
from datetime import datetime


class MatchResult(db.Model):
    __tablename__ = "match_results"

    id = db.Column(db.Integer, primary_key=True)
    solicitation_id = db.Column(db.Integer, db.ForeignKey("solicitations.id"), nullable=False)
    organization_id = db.Column(db.Integer, db.ForeignKey("organizations.id"), nullable=False)
    score = db.Column(db.Float, default=0.0)  # composite 0-100
    explanation = db.Column(db.Text)
    capability_overlap = db.Column(db.Float, default=0.0)
    distance_miles = db.Column(db.Float, default=0.0)
    need_score_component = db.Column(db.Float, default=0.0)
    llm_score = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "solicitation_id": self.solicitation_id,
            "organization_id": self.organization_id,
            "score": round(self.score, 1),
            "explanation": self.explanation,
            "capability_overlap": round(self.capability_overlap, 1),
            "distance_miles": round(self.distance_miles, 1),
            "need_score_component": round(self.need_score_component, 1),
            "llm_score": round(self.llm_score, 1),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "organization": self.organization.to_dict() if self.organization else None,
            "solicitation": self.solicitation.to_dict() if self.solicitation else None,
        }
