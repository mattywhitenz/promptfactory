from flask_wtf import FlaskForm
from wtforms import StringField, TextAreaField, SubmitField, PasswordField, BooleanField
from wtforms.validators import DataRequired, Length, Email

class PromptForm(FlaskForm):
    name = StringField('Name', validators=[DataRequired(), Length(max=200)])
    content = TextAreaField('Content', validators=[DataRequired()])
    description = TextAreaField('Description', validators=[DataRequired()])
    version = StringField('Version', validators=[DataRequired(), Length(max=50)])
    submit = SubmitField('Submit')

class AdminUserForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired(), Length(max=64)])
    email = StringField('Email', validators=[DataRequired(), Email(), Length(max=120)])
    password = PasswordField('Password', validators=[DataRequired()])
    is_superuser = BooleanField('Super Admin')
    submit = SubmitField('Submit')

class EditPromptForm(FlaskForm):
    name = StringField('Name', validators=[DataRequired(), Length(min=1, max=200)])
    description = TextAreaField('Description', validators=[DataRequired()])
    content = TextAreaField('Content', validators=[DataRequired()])
    version = StringField('Version', validators=[DataRequired()])
    submit = SubmitField('Update Prompt')