from flask import render_template, redirect, url_for, flash, request, jsonify, current_app
from flask_login import login_required, current_user
from app import db
from functools import wraps
from app.admin import bp
from app.models import Prompt, Analytics, User
from app.admin.forms import PromptForm, AdminUserForm, EditPromptForm
from datetime import datetime, timedelta
from sqlalchemy import func
import logging
import re
from flask_wtf import FlaskForm

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            flash('You do not have permission to access this page.', 'danger')
            return redirect(url_for('main.index'))
        return f(*args, **kwargs)
    return decorated_function

def super_admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_superuser:
            flash('You do not have permission to access this page.', 'danger')
            return redirect(url_for('main.index'))
        return f(*args, **kwargs)
    return decorated_function

@bp.route('/dashboard')
@login_required
@admin_required
def dashboard():
    # Get current date and format it
    today = datetime.now()
    date_str = today.strftime('%Y-%m-%d')

    # Get analytics data for the past 30 days
    thirty_days_ago = today - timedelta(days=30)
    
    # Get total counts
    if current_user.is_superuser:
        total_prompts = Prompt.query.count()
        recent_prompts = Prompt.query.order_by(Prompt.created_at.desc()).limit(5).all()
    else:
        total_prompts = Prompt.query.filter_by(created_by_id=current_user.id).count()
        recent_prompts = Prompt.query.filter_by(created_by_id=current_user.id).order_by(Prompt.created_at.desc()).limit(5).all()
    
    total_views = Analytics.query.filter_by(action_type='view').count()
    total_copies = Analytics.query.filter_by(action_type='copy').count()
    
    # Get daily statistics
    daily_stats = {}
    analytics = Analytics.query.filter(Analytics.timestamp >= thirty_days_ago).all()
    
    for analytic in analytics:
        date = analytic.timestamp.strftime('%Y-%m-%d')
        if date not in daily_stats:
            daily_stats[date] = {'view': 0, 'copy': 0}
        if analytic.action_type == 'view':
            daily_stats[date]['view'] += 1
        elif analytic.action_type == 'copy':
            daily_stats[date]['copy'] += 1

    return render_template('admin/dashboard.html', 
                         daily_stats=daily_stats,
                         today=date_str,
                         total_prompts=total_prompts,
                         total_views=total_views,
                         total_copies=total_copies,
                         recent_prompts=recent_prompts)

@bp.route('/prompts')
@login_required
@admin_required
def prompts():
    page = request.args.get('page', 1, type=int)
    prompts = Prompt.query.paginate(page=page, per_page=10)
    form = FlaskForm()
    return render_template('admin/prompts.html', prompts=prompts, form=form)

@bp.route('/prompt/new', methods=['GET', 'POST'])
@login_required
@admin_required
def create_prompt():
    form = PromptForm()
    if form.validate_on_submit():
        prompt = Prompt(
            name=form.name.data,
            content=form.content.data,
            description=form.description.data,
            version=form.version.data,
            created_by=current_user
        )
        db.session.add(prompt)
        db.session.commit()
        flash('Prompt created successfully.', 'success')
        return redirect(url_for('admin.prompts'))
    return render_template('admin/prompt_form.html', form=form, title='New Prompt')

@bp.route('/edit_prompt/<int:prompt_id>', methods=['GET', 'POST'])
@login_required
@admin_required
def edit_prompt(prompt_id):
    prompt = Prompt.query.get_or_404(prompt_id)
    form = EditPromptForm(obj=prompt)
    
    if form.validate_on_submit():
        form.populate_obj(prompt)
        db.session.commit()
        flash('Prompt updated successfully.', 'success')
        return redirect(url_for('admin.prompts'))
    
    feedback_history = Analytics.query.filter(
        Analytics.prompt_id == prompt_id,
        Analytics.action_type.in_(['like', 'dislike'])
    ).order_by(Analytics.timestamp.desc()).all()
    
    return render_template('admin/edit_prompt.html', form=form, prompt=prompt, feedback_history=feedback_history)

@bp.route('/delete_prompt', methods=['POST'])
@login_required
@admin_required
def delete_prompt():
    prompt_id = request.form.get('prompt_id')
    prompt = Prompt.query.get_or_404(prompt_id)
    
    # Delete related analytics entries
    Analytics.query.filter_by(prompt_id=prompt_id).delete()
    
    db.session.delete(prompt)
    db.session.commit()
    flash('Prompt deleted successfully.', 'success')
    return redirect(url_for('admin.prompts'))

@bp.route('/analytics')
@login_required
@admin_required
def analytics():
    page = request.args.get('page', 1, type=int)
    filter_type = request.args.get('filter', '')
    
    # Base query
    query = Analytics.query
    
    # Apply time filters
    if filter_type:
        today = datetime.now().date()
        if filter_type == 'today':
            query = query.filter(db.func.date(Analytics.timestamp) == today)
        elif filter_type == 'week':
            week_ago = today - timedelta(days=7)
            query = query.filter(Analytics.timestamp >= week_ago)
        elif filter_type == 'month':
            month_ago = today - timedelta(days=30)
            query = query.filter(Analytics.timestamp >= month_ago)
    
    # Get analytics with pagination
    analytics = query.order_by(Analytics.timestamp.desc()).paginate(page=page, per_page=20)
    
    # Calculate summary statistics
    total_views = Analytics.query.filter_by(action_type='view').count()
    total_copies = Analytics.query.filter_by(action_type='copy').count()
    total_likes = Analytics.query.filter_by(action_type='like').count()
    
    # Calculate conversion rate (copies/views * 100)
    conversion_rate = (total_copies / total_views * 100) if total_views > 0 else 0
    
    return render_template('admin/analytics.html',
                         analytics=analytics,
                         total_views=total_views,
                         total_copies=total_copies,
                         total_likes=total_likes,
                         conversion_rate=conversion_rate)

@bp.route('/manage_admins')
@login_required
@admin_required
def manage_admins():
    if not current_user.is_superuser:
        flash('You do not have permission to manage admins.', 'error')
        return redirect(url_for('admin.dashboard'))
    
    admins = User.query.filter_by(is_admin=True).all()
    return render_template('admin/manage_admins.html', admins=admins)

@bp.route('/admin/new', methods=['GET', 'POST'])
@login_required
@super_admin_required
def create_admin():
    form = AdminUserForm()
    if form.validate_on_submit():
        user = User(
            username=form.username.data,
            email=form.email.data,
            is_admin=True,
            is_super_admin=form.is_super_admin.data
        )
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.commit()
        flash('Admin user created successfully.', 'success')
        return redirect(url_for('admin.manage_admins'))
    return render_template('admin/admin_form.html', form=form, title='New Admin')

@bp.route('/admin/<int:user_id>/role', methods=['POST'])
@login_required
@super_admin_required
def update_role(user_id):
    user = User.query.get_or_404(user_id)
    if user.id == current_user.id:
        flash('You cannot change your own role.', 'danger')
        return redirect(url_for('admin.manage_admins'))
    
    role = request.form.get('role')
    user.is_super_admin = (role == 'super_admin')
    db.session.commit()
    flash(f'Role updated for {user.username}', 'success')
    return redirect(url_for('admin.manage_admins'))

@bp.route('/admin/<int:user_id>/toggle-status', methods=['POST'])
@login_required
@super_admin_required
def toggle_status(user_id):
    user = User.query.get_or_404(user_id)
    if user.id == current_user.id:
        flash('You cannot change your own account status.', 'danger')
        return redirect(url_for('admin.manage_admins'))
    
    status = request.form.get('status')
    user.active = (status == 'active')
    db.session.commit()
    flash(f'Status updated for {user.username}', 'success')
    return redirect(url_for('admin.manage_admins'))

@bp.route('/admin/<int:user_id>/admin-reset-password', methods=['POST'])
@login_required
@super_admin_required
def admin_reset_password(user_id):
    user = User.query.get_or_404(user_id)
    if user.id == current_user.id:
        flash('Use the change password option to change your own password.', 'danger')
        return redirect(url_for('admin.manage_admins'))
    
    new_password = request.form.get('new_password')
    confirm_password = request.form.get('confirm_password')
    
    if not new_password or not confirm_password:
        flash('Both password fields are required.', 'danger')
        return redirect(url_for('admin.manage_admins'))
    
    if new_password != confirm_password:
        flash('Passwords do not match.', 'danger')
        return redirect(url_for('admin.manage_admins'))
    
    user.set_password(new_password)
    user.first_login = True  # Force password change on next login
    db.session.commit()
    flash(f'Password reset for {user.username}', 'success')
    return redirect(url_for('admin.manage_admins'))

@bp.route('/admin/<int:user_id>/delete', methods=['POST'])
@login_required
@admin_required
def delete_admin(user_id):
    if not current_user.is_superuser:
        flash('Permission denied.', 'danger')
        return redirect(url_for('admin.manage_admins'))
    
    user = User.query.get_or_404(user_id)
    if user.id == current_user.id:
        flash('You cannot delete your own account.', 'danger')
        return redirect(url_for('admin.manage_admins'))
    
    username = user.username
    db.session.delete(user)
    db.session.commit()
    flash(f'User {username} has been deleted.', 'success')
    return redirect(url_for('admin.manage_admins'))

@bp.route('/admin/<int:user_id>/update-email', methods=['POST'])
@login_required
@admin_required
def update_email(user_id):
    user = User.query.get_or_404(user_id)
    
    # Only super admins can edit other users' emails
    if user.id != current_user.id and not current_user.is_super_admin:
        flash('You do not have permission to edit other users\' emails.', 'danger')
        return redirect(url_for('admin.manage_admins'))
    
    new_email = request.form.get('email', '').strip()
    
    # Validate email format
    if not re.match(r"[^@]+@[^@]+\.[^@]+", new_email):
        flash('Invalid email format.', 'danger')
        return redirect(url_for('admin.manage_admins'))
    
    # Check if email is already taken by another user
    existing_user = User.query.filter(User.email == new_email, User.id != user_id).first()
    if existing_user:
        flash('This email is already in use.', 'danger')
        return redirect(url_for('admin.manage_admins'))
    
    # Update email
    user.email = new_email
    db.session.commit()
    flash('Email updated successfully.', 'success')
    return redirect(url_for('admin.manage_admins'))

@bp.route('/toggle_admin_role/<int:user_id>', methods=['POST'])
@login_required
@admin_required
def toggle_admin_role(user_id):
    if not current_user.is_superuser:
        flash('Permission denied.', 'danger')
        return redirect(url_for('admin.manage_admins'))
    
    user = User.query.get_or_404(user_id)
    if user.id == current_user.id:
        flash('You cannot modify your own role.', 'danger')
        return redirect(url_for('admin.manage_admins'))
    
    user.is_superuser = not user.is_superuser
    db.session.commit()
    flash(f'Role updated for {user.username}', 'success')
    return redirect(url_for('admin.manage_admins'))

@bp.route('/reset_2fa/<int:user_id>', methods=['POST'])
@login_required
@admin_required
def reset_2fa(user_id):
    if not current_user.is_superuser:
        flash('Permission denied.', 'danger')
        return redirect(url_for('admin.manage_admins'))
    
    user = User.query.get_or_404(user_id)
    user.two_factor_enabled = False
    user.two_factor_secret = None
    db.session.commit()
    flash(f'2FA has been reset for {user.username}', 'success')
    return redirect(url_for('admin.manage_admins'))

@bp.route('/toggle_active/<int:user_id>', methods=['POST'])
@login_required
@admin_required
def toggle_active(user_id):
    if not current_user.is_superuser:
        flash('Permission denied.', 'danger')
        return redirect(url_for('admin.manage_admins'))
    
    user = User.query.get_or_404(user_id)
    if user.id == current_user.id:
        flash('You cannot modify your own active status.', 'danger')
        return redirect(url_for('admin.manage_admins'))
    
    user.active = not user.active
    db.session.commit()
    status = "activated" if user.active else "deactivated"
    flash(f'User {user.username} has been {status}.', 'success')
    return redirect(url_for('admin.manage_admins'))

@bp.route('/reset_password/<int:user_id>', methods=['POST'])
@login_required
@admin_required
def reset_password(user_id):
    if not current_user.is_superuser:
        flash('Permission denied.', 'danger')
        return redirect(url_for('admin.manage_admins'))
    
    user = User.query.get_or_404(user_id)
    new_password = 'defaultpassword'  # Set a default password or generate one
    user.set_password(new_password)
    db.session.commit()
    flash(f'Password for {user.username} has been reset to "{new_password}".', 'success')
    return redirect(url_for('admin.manage_admins'))