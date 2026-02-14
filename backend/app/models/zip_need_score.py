from app import db


class ZipNeedScore(db.Model):
    __tablename__ = "zip_need_scores"

    zip_code = db.Column(db.String(10), primary_key=True)
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    state = db.Column(db.String(2))
    city = db.Column(db.String(200))
    food_insecurity_rate = db.Column(db.Float, default=0.0)
    population = db.Column(db.Integer, default=0)
    snap_participation_rate = db.Column(db.Float, default=0.0)
    need_score = db.Column(db.Float, default=0.0)  # 0-100

    def to_dict(self):
        return {
            "zip_code": self.zip_code,
            "lat": self.lat,
            "lng": self.lng,
            "state": self.state,
            "city": self.city,
            "food_insecurity_rate": self.food_insecurity_rate,
            "population": self.population,
            "snap_participation_rate": self.snap_participation_rate,
            "need_score": self.need_score,
        }
