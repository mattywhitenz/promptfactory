from app import create_app, db
from app.models import User

def update_admin_status():
    app = create_app()
    with app.app_context():
        user = User.query.filter_by(username='matty.white').first()
        if user:
            user.is_admin = True
            user.is_superuser = True
            db.session.commit()
            print(f'Updated user {user.username}:')
            print(f'Is admin: {user.is_admin}')
            print(f'Is superuser: {user.is_superuser}')
        else:
            print('User matty.white not found')

if __name__ == '__main__':
    update_admin_status()