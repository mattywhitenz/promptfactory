from flask import render_template, request, jsonify, current_app, redirect, url_for, flash
from app.main import bp
from app.models import Prompt, Analytics, db
from sqlalchemy import func, desc, asc, or_
from flask_login import current_user, login_required
from app import csrf
import pyotp
import qrcode
import base64
from io import BytesIO
from app.auth.forms import TwoFactorSetupForm

@bp.route('/')
def index():
    page = request.args.get('page', 1, type=int)
    search_query = request.args.get('q', '')
    sort_by = request.args.get('sort', '')
    sort_dir = request.args.get('dir', 'desc')
    
    query = Prompt.query
    
    if search_query:
        query = query.filter(Prompt.name.ilike(f'%{search_query}%'))
    
    if sort_by == 'copies':
        print(f"DEBUG: Sort direction: {sort_dir}")
        
        copies_count = db.session.query(
            Analytics.prompt_id,
            db.func.count('*').label('copies_count')
        ).filter(Analytics.action_type == 'copy').group_by(Analytics.prompt_id).subquery()
        
        query = query.outerjoin(copies_count, Prompt.id == copies_count.c.prompt_id)
        
        if sort_dir == 'desc':
            print("DEBUG: Sorting in descending order")
            order_by = copies_count.c.copies_count.desc().nullslast()
        else:
            print("DEBUG: Sorting in ascending order")
            order_by = copies_count.c.copies_count.asc().nullsfirst()
            
        query = query.order_by(order_by)
        
        final_results = query.all()
        print("DEBUG: Final ordering with copy counts:")
        for prompt in final_results:
            copy_count = db.session.query(db.func.count('*')).filter(
                Analytics.prompt_id == prompt.id,
                Analytics.action_type == 'copy'
            ).scalar()
            print(f"Prompt ID: {prompt.id}, Name: {prompt.name}, Copies: {copy_count}")
    
    elif sort_by == 'views':
        view_counts = db.session.query(
            Analytics.prompt_id,
            db.func.count('*').label('view_count')
        ).filter(Analytics.action_type == 'view').group_by(Analytics.prompt_id).subquery()
        
        query = query.outerjoin(view_counts, Prompt.id == view_counts.c.prompt_id)
        order_by = view_counts.c.view_count.desc() if sort_dir == 'desc' else view_counts.c.view_count.asc()
        query = query.order_by(order_by.nullslast())
    
    elif sort_by == 'likes':
        likes_count = db.session.query(
            Analytics.prompt_id,
            db.func.count('*').label('likes_count')
        ).filter(Analytics.action_type == 'like').group_by(Analytics.prompt_id).subquery()
        
        query = query.outerjoin(likes_count, Prompt.id == likes_count.c.prompt_id)
        order_by = likes_count.c.likes_count.desc() if sort_dir == 'desc' else likes_count.c.likes_count.asc()
        query = query.order_by(order_by.nullslast())
    
    elif sort_by == 'name':
        query = query.order_by(Prompt.name.desc() if sort_dir == 'desc' else Prompt.name.asc())
    
    prompts = query.paginate(page=page, per_page=12)
    
    return render_template('index.html', 
                         prompts=prompts,
                         search_query=search_query,
                         sort_by=sort_by,
                         sort_dir=sort_dir)

@bp.route('/prompt/<int:prompt_id>/view', methods=['POST'])
@csrf.exempt
def track_view(prompt_id):
    analytics = Analytics(
        prompt_id=prompt_id,
        action_type='view',
        ip_address=request.remote_addr,
        user_agent=request.user_agent.string,
        user_id=current_user.id if not current_user.is_anonymous else None,
        username=current_user.username if not current_user.is_anonymous else None
    )
    db.session.add(analytics)
    db.session.commit()
    
    # Get updated count
    view_count = Analytics.query.filter_by(prompt_id=prompt_id, action_type='view').count()
    return jsonify({'status': 'success', 'count': view_count})

@bp.route('/prompt/<int:prompt_id>')
def prompt_detail(prompt_id):
    prompt = Prompt.query.get_or_404(prompt_id)
    stats = {
        'views': Analytics.query.filter_by(prompt_id=prompt_id, action_type='view').count(),
        'copies': Analytics.query.filter_by(prompt_id=prompt_id, action_type='copy').count(),
        'likes': Analytics.query.filter_by(prompt_id=prompt_id, action_type='like').count(),
        'dislikes': Analytics.query.filter_by(prompt_id=prompt_id, action_type='dislike').count()
    }
    
    # Get feedback history for admins
    feedback_history = None
    if current_user.is_authenticated and current_user.is_admin:
        feedback_history = Analytics.query.filter(
            Analytics.prompt_id == prompt_id,
            Analytics.action_type.in_(['like', 'dislike'])
        ).order_by(Analytics.timestamp.desc()).all()
    
    return render_template('prompt_detail.html', 
                         prompt=prompt, 
                         stats=stats,
                         feedback_history=feedback_history)

@bp.route('/prompt/<int:prompt_id>/copy', methods=['POST'])
@csrf.exempt
def track_copy(prompt_id):
    analytics = Analytics(
        prompt_id=prompt_id,
        action_type='copy',
        ip_address=request.remote_addr,
        user_agent=request.user_agent.string,
        user_id=current_user.id if not current_user.is_anonymous else None,
        username=current_user.username if not current_user.is_anonymous else None
    )
    db.session.add(analytics)
    db.session.commit()
    
    # Get updated count
    copy_count = Analytics.query.filter_by(prompt_id=prompt_id, action_type='copy').count()
    return jsonify({'status': 'success', 'count': copy_count})

@bp.route('/prompt/<int:prompt_id>/rate', methods=['POST'])
def rate_prompt(prompt_id):
    action = request.form.get('action')
    if action not in ['like', 'dislike']:
        return jsonify({'error': 'Invalid action'}), 400

    analytics = Analytics(
        prompt_id=prompt_id,
        action_type=action,
        ip_address=request.remote_addr,
        user_agent=request.user_agent.string,
        user_id=current_user.id if not current_user.is_anonymous else None,
        username=current_user.username if not current_user.is_anonymous else None
    )
    db.session.add(analytics)
    db.session.commit()
    
    return redirect(url_for('main.prompt_detail', prompt_id=prompt_id))

def generate_qr_code(secret):
    # Create the provisioning URI for the QR code
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        current_user.email,
        issuer_name="Prompt Library"
    )

    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(provisioning_uri)
    qr.make(fit=True)
    
    # Create QR code image
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64 for displaying in HTML
    buffered = BytesIO()
    img.save(buffered)
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    return f"data:image/png;base64,{img_str}"

@bp.route('/setup_2fa')
@login_required
def setup_2fa():
    if current_user.two_factor_enabled:
        flash('2FA is already enabled for your account.', 'warning')
        return redirect(url_for('main.index'))
    
    # Create the form instance
    form = TwoFactorSetupForm()
    
    # Generate new secret if one doesn't exist
    if not current_user.two_factor_secret:
        current_user.two_factor_secret = pyotp.random_base32()
        db.session.commit()
    
    qr_code_url = generate_qr_code(current_user.two_factor_secret)
    return render_template('setup_2fa.html', 
                         form=form, 
                         qr_code_url=qr_code_url, 
                         secret=current_user.two_factor_secret)

@bp.route('/feedback/<int:prompt_id>', methods=['POST'])
@login_required
def submit_feedback(prompt_id):
    data = request.get_json()
    feedback_type = data.get('type')
    
    if feedback_type not in ['like', 'dislike']:
        return jsonify({'status': 'error', 'message': 'Invalid feedback type'}), 400
        
    analytics = Analytics(
        prompt_id=prompt_id,
        action_type=feedback_type,
        user_id=current_user.id,
        ip_address=request.remote_addr,
        user_agent=request.user_agent.string
    )
    
    db.session.add(analytics)
    db.session.commit()
    
    # Get updated count
    count = Analytics.query.filter_by(
        prompt_id=prompt_id, 
        action_type=feedback_type
    ).count()
    
    return jsonify({
        'status': 'success',
        'count': count
    })
