from functools import wraps
from flask import request, abort, current_app
import re
from datetime import datetime, timedelta
from flask_login import current_user
import bleach
import html
from werkzeug.urls import url_parse

def sanitize_input(text):
    """Sanitize user input to prevent XSS attacks"""
    return bleach.clean(text, strip=True)

def validate_url(url):
    """Validate URL to prevent open redirect vulnerabilities"""
    result = url_parse(url)
    return not result.netloc and result.path

def rate_limit(max_requests=100, window=timedelta(minutes=1)):
    """Rate limiting decorator"""
    def decorator(f):
        requests = {}
        @wraps(f)
        def wrapped(*args, **kwargs):
            now = datetime.now()
            ip = request.remote_addr
            
            # Clean old requests
            requests[ip] = [req_time for req_time in requests.get(ip, [])
                          if now - req_time < window]
            
            if len(requests.get(ip, [])) >= max_requests:
                abort(429)  # Too Many Requests
                
            requests.setdefault(ip, []).append(now)
            return f(*args, **kwargs)
        return wrapped
    return decorator

def validate_prompt_content(content):
    """Validate prompt content for security"""
    # Remove potentially dangerous HTML
    content = bleach.clean(content, 
                         tags=['p', 'br', 'strong', 'em', 'u', 'code', 'pre'],
                         attributes={},
                         strip=True)
    return content

def check_content_security(response):
    """Add security headers to response"""
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' cdn.jsdelivr.net; img-src 'self' data:;"
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return response

def validate_password_strength(password):
    """Validate password strength"""
    if len(password) < 12:
        return False, "Password must be at least 12 characters long"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one special character"
    return True, "Password meets strength requirements"