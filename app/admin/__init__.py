from flask import Blueprint

bp = Blueprint('admin', __name__, url_prefix='/admin')

# Import routes first, then super_admin to avoid conflicts
from app.admin import routes, super_admin