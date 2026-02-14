from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv

load_dotenv()

db = SQLAlchemy()


def create_app():
    app = Flask(__name__)
    app.config.from_object("app.config.Config")
    CORS(app)
    db.init_app(app)

    from app.routes.solicitations import solicitations_bp
    from app.routes.organizations import organizations_bp
    from app.routes.matches import matches_bp
    from app.routes.dashboard import dashboard_bp

    app.register_blueprint(solicitations_bp, url_prefix="/api")
    app.register_blueprint(organizations_bp, url_prefix="/api")
    app.register_blueprint(matches_bp, url_prefix="/api")
    app.register_blueprint(dashboard_bp, url_prefix="/api")

    with app.app_context():
        from app.models import solicitation, organization, zip_need_score, match_result
        db.create_all()

    return app
