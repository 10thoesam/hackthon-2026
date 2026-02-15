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

    app.register_blueprint(solicitations_bp, url_prefix="/api")
    app.register_blueprint(organizations_bp, url_prefix="/api")
    app.register_blueprint(matches_bp, url_prefix="/api")
    app.register_blueprint(dashboard_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api")

    with app.app_context():
        from app.models import solicitation, organization, zip_need_score, match_result, user
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

    if migrations:
        with engine.connect() as conn:
            for sql in migrations:
                conn.execute(text(sql))
            conn.commit()
        app.logger.info(f"Ran {len(migrations)} migration(s)")
