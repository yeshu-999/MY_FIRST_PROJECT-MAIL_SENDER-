from flask import Flask, render_template, request, jsonify, session
from flask_socketio import SocketIO, emit
from datetime import datetime
import json
import os
import threading
from typing import List, Optional
from email_service import EmailService
from config import Config

app = Flask(__name__)
app.config.from_object(Config)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Initialize services
email_service = EmailService()

# Store active sessions
active_sessions = {}

@app.route('/')
def index():
    """Render the main interface"""
    return render_template('index.html',
                          app_name=Config.APP_NAME,
                          app_version=Config.APP_VERSION)

@app.route('/api/send-notification', methods=['POST'])
def send_notification():
    """API endpoint to send learning notifications"""
    try:
        data = request.json
        
        # Validate required fields
        if not data.get('receiver_email'):
            return jsonify({
                'success': False,
                'message': 'Receiver email is required'
            }), 400
        
        if not data.get('tasks') or len(data.get('tasks', [])) == 0:
            return jsonify({
                'success': False,
                'message': 'At least one task is required'
            }), 400
        
        # Extract data
        receiver_email = data['receiver_email']
        tasks = data['tasks']
        comments = data.get('comments', '')
        sender_name = data.get('sender_name', 'Student')
        notification_type = data.get('notification_type', 'daily_update')
        
        # Validate email format
        if '@' not in receiver_email or '.' not in receiver_email:
            return jsonify({
                'success': False,
                'message': 'Invalid email format'
            }), 400
        
        # Create notification in background
        def send_in_background():
            try:
                success, message = email_service.send_notification(
                    receiver_email=receiver_email,
                    tasks=tasks,
                    comments=comments,
                    sender_name=sender_name,
                    notification_type=notification_type
                )
                
                # Send real-time update via WebSocket
                socketio.emit('notification_status', {
                    'success': success,
                    'message': message,
                    'receiver': receiver_email,
                    'timestamp': datetime.now().isoformat(),
                    'tasks_sent': len(tasks),
                    'type': notification_type
                })
                
                # Log the activity
                log_activity({
                    'action': 'notification_sent',
                    'success': success,
                    'receiver': receiver_email,
                    'tasks_count': len(tasks),
                    'timestamp': datetime.now().isoformat()
                })
                
            except Exception as e:
                socketio.emit('notification_status', {
                    'success': False,
                    'message': f'Error: {str(e)}',
                    'timestamp': datetime.now().isoformat()
                })
        
        # Start background thread
        thread = threading.Thread(target=send_in_background)
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'success': True,
            'message': 'Notification is being processed',
            'data': {
                'receiver': receiver_email,
                'tasks_count': len(tasks),
                'timestamp': datetime.now().isoformat()
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}'
        }), 500

@app.route('/api/save-draft', methods=['POST'])
def save_draft():
    """Save notification as draft"""
    try:
        data = request.json
        session_id = data.get('session_id', 'default')
        
        active_sessions[session_id] = {
            'data': data,
            'last_saved': datetime.now().isoformat()
        }
        
        return jsonify({
            'success': True,
            'message': 'Draft saved successfully',
            'session_id': session_id
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error saving draft: {str(e)}'
        }), 500

@app.route('/api/load-draft/<session_id>', methods=['GET'])
def load_draft(session_id):
    """Load saved draft"""
    draft = active_sessions.get(session_id)
    if draft:
        return jsonify({
            'success': True,
            'data': draft['data']
        })
    return jsonify({
        'success': False,
        'message': 'No draft found'
    }), 404

@app.route('/api/validate-email', methods=['POST'])
def validate_email():
    """Validate email format"""
    email = request.json.get('email', '')
    
    # Simple email validation
    import re
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    
    if re.match(pattern, email):
        return jsonify({'valid': True})
    else:
        return jsonify({'valid': False})

@socketio.on('connect')
def handle_connect():
    """Handle WebSocket connection"""
    client_id = request.sid
    emit('connection_established', {
        'message': 'Connected to Learning Notifier',
        'timestamp': datetime.now().isoformat()
    })
    print(f'Client connected: {client_id}')

@socketio.on('disconnect')
def handle_disconnect():
    """Handle WebSocket disconnection"""
    client_id = request.sid
    print(f'Client disconnected: {client_id}')

@socketio.on('send_message')
def handle_realtime_message(data):
    """Handle real-time chat messages (for collaboration)"""
    message = data.get('message', '')
    sender = data.get('sender', 'Anonymous')
    
    if message:
        emit('new_message', {
            'message': message,
            'sender': sender,
            'timestamp': datetime.now().strftime('%H:%M'),
            'type': 'chat'
        }, broadcast=True)

def log_activity(activity_data):
    """Log application activity"""
    log_file = 'activity_log.json'
    
    try:
        logs = []
        if os.path.exists(log_file):
            with open(log_file, 'r') as f:
                logs = json.load(f)
        
        logs.append(activity_data)
        
        # Keep only last 100 logs
        if len(logs) > 100:
            logs = logs[-100:]
        
        with open(log_file, 'w') as f:
            json.dump(logs, f, indent=2)
            
    except Exception as e:
        print(f'Error logging activity: {e}')

@app.route('/api/activity-logs', methods=['GET'])
def get_activity_logs():
    """Get recent activity logs"""
    try:
        log_file = 'activity_log.json'
        if os.path.exists(log_file):
            with open(log_file, 'r') as f:
                logs = json.load(f)
            return jsonify({
                'success': True,
                'logs': logs[-20:]  # Last 20 logs
            })
        return jsonify({'success': True, 'logs': []})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    print(f"🚀 Starting {Config.APP_NAME} v{Config.APP_VERSION}...")
    print(f"🌐 Open: http://localhost:5000")
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)