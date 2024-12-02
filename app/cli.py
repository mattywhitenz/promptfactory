import click
from flask.cli import with_appcontext
from app import db
from app.models import User
from werkzeug.security import generate_password_hash

@click.command('reset-admin')
@with_appcontext
def reset_admin_command():
    """Reset the admin account."""
    # Delete existing admin if exists
    User.query.filter_by(username='admin').delete()
    db.session.commit()
    
    # Create new admin
    admin = User(
        username='admin',
        email='admin@example.com',
        is_admin=True,
        is_superuser=True,
        two_factor_enabled=False
    )
    admin.set_password('admin')  # Default password is 'admin'
    
    db.session.add(admin)
    db.session.commit()
    
    click.echo('Admin account has been reset! Username: admin, Password: admin')

def init_app(app):
    app.cli.add_command(reset_admin_command) 