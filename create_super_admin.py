from app import create_app, db
from app.models import User

app = create_app()

def create_super_admin():
    with app.app_context():
        # Check if user already exists
        if User.query.filter_by(username='matty.white').first():
            print("User matty.white already exists!")
            return
        
        # Create super admin user
        super_admin = User(
            username='matty.white',
            email='matty.white@example.com',
            is_admin=True,
            is_superuser=True
        )
        super_admin.set_password('admin123')
        
        # Add to database
        db.session.add(super_admin)
        db.session.commit()
        print("Super admin user created successfully!")

if __name__ == '__main__':
    create_super_admin()