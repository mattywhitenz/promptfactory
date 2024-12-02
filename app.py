from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)

@app.route('/track-view/<int:prompt_id>', methods=['POST'])
def track_view(prompt_id):
    analytics = Analytics(
        prompt_id=prompt_id,
        action_type='view',
        ip_address=request.remote_addr,
        user_agent=request.user_agent.string,
        user_id=current_user.id if not current_user.is_anonymous else None
    )
    db.session.add(analytics)
    db.session.commit()
    
    # Get updated count
    view_count = Analytics.query.filter_by(prompt_id=prompt_id, action_type='view').count()
    return jsonify({'status': 'success', 'count': view_count})

@app.route('/track-copy/<int:prompt_id>', methods=['POST'])
def track_copy(prompt_id):
    analytics = Analytics(
        prompt_id=prompt_id,
        action_type='copy',
        ip_address=request.remote_addr,
        user_agent=request.user_agent.string,
        user_id=current_user.id if not current_user.is_anonymous else None
    )
    db.session.add(analytics)
    db.session.commit()
    
    # Get updated count
    copy_count = Analytics.query.filter_by(prompt_id=prompt_id, action_type='copy').count()
    return jsonify({'status': 'success', 'count': copy_count}) 

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080) 