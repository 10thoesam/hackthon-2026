from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

load_dotenv()

db = SQLAlchemy()
jwt = JWTManager()


def create_app():
    app = Flask(__name__)
    app.config.from_object("app.config.Config")
    CORS(app)
    db.init_app(app)
    jwt.init_app(app)

    from app.routes.solicitations import solicitations_bp
    from app.routes.organizations import organizations_bp
    from app.routes.matches import matches_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.auth import auth_bp
    from app.routes.emergency import emergency_bp
    from app.routes.predictions import predictions_bp
    from app.routes.rfq import rfq_bp
    from app.routes.portals import portals_bp

    app.register_blueprint(solicitations_bp, url_prefix="/api")
    app.register_blueprint(organizations_bp, url_prefix="/api")
    app.register_blueprint(matches_bp, url_prefix="/api")
    app.register_blueprint(dashboard_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(emergency_bp, url_prefix="/api")
    app.register_blueprint(predictions_bp, url_prefix="/api")
    app.register_blueprint(rfq_bp, url_prefix="/api")
    app.register_blueprint(portals_bp, url_prefix="/api")

    with app.app_context():
        from app.models import solicitation, organization, zip_need_score, match_result, user
        from app.models import emergency_capacity, waste_reduction
        db.create_all()
        _run_migrations(app)

    return app


def _run_migrations(app):
    """Add columns that db.create_all() won't add to existing tables."""
    from sqlalchemy import text, inspect
    engine = db.engine
    inspector = inspect(engine)

    # Solicitations table migrations
    sol_cols = {c["name"] for c in inspector.get_columns("solicitations")}
    migrations = []
    if "source_type" not in sol_cols:
        migrations.append("ALTER TABLE solicitations ADD COLUMN source_type VARCHAR(20) DEFAULT 'government'")
    if "company_name" not in sol_cols:
        migrations.append("ALTER TABLE solicitations ADD COLUMN company_name VARCHAR(200)")
    if "company_email" not in sol_cols:
        migrations.append("ALTER TABLE solicitations ADD COLUMN company_email VARCHAR(200)")
    if "user_id" not in sol_cols:
        migrations.append("ALTER TABLE solicitations ADD COLUMN user_id INTEGER REFERENCES users(id)")

    # Users table migrations
    user_cols = {c["name"] for c in inspector.get_columns("users")}
    if "is_admin" not in user_cols:
        migrations.append("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE")

    # Organizations table migrations
    org_cols = {c["name"] for c in inspector.get_columns("organizations")}
    if "naics_codes" not in org_cols:
        migrations.append("ALTER TABLE organizations ADD COLUMN naics_codes JSON")
    if "uei" not in org_cols:
        migrations.append("ALTER TABLE organizations ADD COLUMN uei VARCHAR(20)")
    if "services_description" not in org_cols:
        migrations.append("ALTER TABLE organizations ADD COLUMN services_description TEXT")
    if "past_performance" not in org_cols:
        migrations.append("ALTER TABLE organizations ADD COLUMN past_performance JSON")
    if "annual_revenue" not in org_cols:
        migrations.append("ALTER TABLE organizations ADD COLUMN annual_revenue FLOAT")
    if "employee_count" not in org_cols:
        migrations.append("ALTER TABLE organizations ADD COLUMN employee_count INTEGER")
    if "years_in_business" not in org_cols:
        migrations.append("ALTER TABLE organizations ADD COLUMN years_in_business INTEGER")
    if "small_business" not in org_cols:
        migrations.append("ALTER TABLE organizations ADD COLUMN small_business BOOLEAN DEFAULT FALSE")

    if migrations:
        with engine.connect() as conn:
            for sql in migrations:
                conn.execute(text(sql))
            conn.commit()
        app.logger.info(f"Ran {len(migrations)} migration(s)")
