from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from app import db, login_manager

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    is_admin = db.Column(db.Boolean, default=False)
    is_superuser = db.Column(db.Boolean, default=False)
    first_login = db.Column(db.Boolean, default=True)
    two_factor_secret = db.Column(db.String(32))
    two_factor_enabled = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    active = db.Column(db.Boolean, default=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def is_active(self):
        return self.active

@login_manager.user_loader
def load_user(id):
    return User.query.get(int(id))

class Prompt(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text)
    version = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    updated_by_id = db.Column(db.Integer, db.ForeignKey('user.id'))

    created_by = db.relationship(
        'User',
        foreign_keys=[created_by_id],
        backref=db.backref('created_prompts', lazy=True)
    )
    
    updated_by = db.relationship(
        'User',
        foreign_keys=[updated_by_id],
        backref=db.backref('updated_prompts', lazy=True)
    )

    def __init__(self, *args, **kwargs):
        super(Prompt, self).__init__(*args, **kwargs)
        if not self.created_at:
            self.created_at = datetime.utcnow()
        self.updated_at = self.created_at

    def can_edit(self, user):
        return user.is_superuser or self.created_by_id == user.id

class Analytics(db.Model):
    __tablename__ = 'analytics'
    
    id = db.Column(db.Integer, primary_key=True)
    prompt_id = db.Column(db.Integer, db.ForeignKey('prompt.id'), nullable=False)
    action_type = db.Column(db.String(20), nullable=False)  # 'view', 'copy', 'like', 'dislike'
    search_term = db.Column(db.String(200), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(200), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    comment = db.Column(db.Text, nullable=True)
    prompt_version = db.Column(db.String(50), nullable=True)
    username = db.Column(db.String(64), nullable=True)

    prompt = db.relationship('Prompt', backref=db.backref('analytics', lazy=True))
    user = db.relationship('User', backref=db.backref('analytics', lazy=True))

    @staticmethod
    def add_view(prompt_id, search_term=None, ip_address=None, user_agent=None, user_id=None):
        analytics = Analytics(
            prompt_id=prompt_id,
            action_type='view',
            search_term=search_term,
            ip_address=ip_address,
            user_agent=user_agent,
            user_id=user_id
        )
        db.session.add(analytics)
        db.session.commit()
    
    @staticmethod
    def add_copy(prompt_id, ip_address=None, user_agent=None, user_id=None):
        analytics = Analytics(
            prompt_id=prompt_id,
            action_type='copy',
            ip_address=ip_address,
            user_agent=user_agent,
            user_id=user_id
        )
        db.session.add(analytics)
        db.session.commit()