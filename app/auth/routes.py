from flask import render_template, redirect, url_for, flash, request, session
from flask_login import login_user, logout_user, login_required, current_user
from app import db
from app.auth import bp
from app.auth.forms import LoginForm, TwoFactorForm, ChangePasswordForm, TwoFactorSetupForm
from app.models import User
import pyotp
import os
import pyqrcode
import png
from io import BytesIO
import base64

@bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('main.index'))
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user is None or not user.check_password(form.password.data):
            flash('Invalid username or password', 'danger')
            return redirect(url_for('auth.login'))
        
        if user.two_factor_enabled:
            session['user_id'] = user.id
            return redirect(url_for('auth.two_factor'))
        
        login_user(user, remember=form.remember_me.data)
        
        if user.first_login:
            return redirect(url_for('auth.change_password'))
            
        next_page = request.args.get('next')
        if not next_page or url_parse(next_page).netloc != '':
            next_page = url_for('main.index')
        return redirect(next_page)
    return render_template('auth/login.html', title='Sign In', form=form)

@bp.route('/two-factor', methods=['GET', 'POST'])
def two_factor():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    form = TwoFactorForm()
    if form.validate_on_submit():
        user = User.query.get(session['user_id'])
        totp = pyotp.TOTP(user.two_factor_secret)
        
        if totp.verify(form.token.data):
            login_user(user)
            session.pop('user_id', None)
            
            if user.first_login:
                return redirect(url_for('auth.change_password'))
                
            next_page = request.args.get('next')
            if not next_page or url_parse(next_page).netloc != '':
                next_page = url_for('main.index')
            return redirect(next_page)
        
        flash('Invalid 2FA token', 'danger')
        return redirect(url_for('auth.two_factor'))
        
    return render_template('auth/two_factor.html', form=form)

@bp.route('/change-password', methods=['GET', 'POST'])
@login_required
def change_password():
    form = ChangePasswordForm()
    if form.validate_on_submit():
        if not current_user.check_password(form.current_password.data):
            flash('Current password is incorrect', 'danger')
            return redirect(url_for('auth.change_password'))
            
        current_user.set_password(form.password.data)
        current_user.first_login = False
        db.session.commit()
        flash('Your password has been changed', 'success')
        return redirect(url_for('main.index'))
    return render_template('auth/change_password.html', form=form)

@bp.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out.', 'success')
    return redirect(url_for('main.index'))

@bp.route('/setup_2fa', methods=['GET', 'POST'])
@login_required
def setup_2fa():
    if current_user.two_factor_enabled:
        flash('2FA is already enabled for your account.', 'warning')
        return redirect(url_for('main.index'))
    
    form = TwoFactorSetupForm()
    
    if request.method == 'GET':
        if not current_user.two_factor_secret:
            current_user.two_factor_secret = pyotp.random_base32()
            db.session.commit()
            
        totp = pyotp.TOTP(current_user.two_factor_secret)
        qr_code_url = pyqrcode.create(totp.provisioning_uri(
            current_user.email, 
            issuer_name="Prompt Library"
        ))
        
        buffer = BytesIO()
        qr_code_url.svg(buffer, scale=5)
        buffer.seek(0)
        qr_code_data = base64.b64encode(buffer.getvalue()).decode()
        
        return render_template('auth/setup_2fa.html', 
                             form=form,
                             qr_code_url=f"data:image/svg+xml;base64,{qr_code_data}",
                             secret=current_user.two_factor_secret)
    
    if form.validate_on_submit():
        totp = pyotp.TOTP(current_user.two_factor_secret)
        if totp.verify(form.code.data):
            current_user.two_factor_enabled = True
            db.session.commit()
            flash('Two-factor authentication has been enabled.', 'success')
            return redirect(url_for('main.index'))
        else:
            flash('Invalid verification code.', 'danger')
            
    return render_template('auth/setup_2fa.html', 
                         form=form,
                         qr_code_url=qr_code_url,
                         secret=current_user.two_factor_secret)

@bp.route('/password_reset/<token>', methods=['GET', 'POST'])
def password_reset(token):
    # If this route exists, rename it to password_reset
    ...