import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import json
from typing import List, Tuple
import re
from config import Config

class EmailService:
    def __init__(self):
        self.config = Config.EMAIL_CONFIG
        self.templates = self.load_templates()
    
    def load_templates(self):
        """Load email templates"""
        return {
            'daily_update': self.create_daily_update_template,
            'progress_report': self.create_progress_report_template,
            'weekly_review': self.create_weekly_review_template,
            'urgent': self.create_urgent_template
        }
    
    def send_notification(self, 
                         receiver_email: str, 
                         tasks: List[str], 
                         comments: str,
                         sender_name: str = "Student",
                         notification_type: str = "daily_update") -> Tuple[bool, str]:
        """Send learning notification email"""
        try:
            # Validate email format
            if not self.validate_email_format(receiver_email):
                return False, "Invalid email format"
            
            # Check if there are tasks
            if not tasks or len(tasks) == 0:
                return False, "No tasks provided"
            
            # Get template function
            template_func = self.templates.get(notification_type, self.create_daily_update_template)
            
            # Create email content
            subject, html_body = template_func(
                receiver_email=receiver_email,
                tasks=tasks,
                comments=comments,
                sender_name=sender_name
            )
            
            # Setup email
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.config['sender_email']
            msg['To'] = receiver_email
            
            # Add plain text alternative
            text_content = self.create_text_version(tasks, comments, sender_name)
            msg.attach(MIMEText(text_content, 'plain'))
            msg.attach(MIMEText(html_body, 'html'))
            
            # Send email
            with smtplib.SMTP(self.config['smtp_server'], self.config['smtp_port']) as server:
                server.starttls()
                server.login(self.config['sender_email'], self.config['sender_password'])
                server.send_message(msg)
            
            return True, "Notification sent successfully"
            
        except smtplib.SMTPAuthenticationError:
            return False, "Email authentication failed. Check your credentials."
        except Exception as e:
            return False, f"Failed to send email: {str(e)}"
    
    def validate_email_format(self, email: str) -> bool:
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    def create_daily_update_template(self, **kwargs) -> Tuple[str, str]:
        """Create daily update email template"""
        receiver_email = kwargs['receiver_email']
        tasks = kwargs['tasks']
        comments = kwargs['comments']
        sender_name = kwargs['sender_name']
        
        current_date = datetime.now().strftime("%B %d, %Y")
        current_time = datetime.now().strftime("%I:%M %p")
        
        subject = f"📚 Daily Learning Update - {current_date}"
        
        # Use triple single quotes to avoid escaping issues
        html = f'''
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{
                    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f9f9f9;
                }}
                .header {{
                    background: linear-gradient(135deg, #4A6FA5, #166088);
                    color: white;
                    padding: 30px;
                    border-radius: 10px 10px 0 0;
                    text-align: center;
                }}
                .content {{
                    background: white;
                    padding: 30px;
                    border-radius: 0 0 10px 10px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }}
                .section {{
                    margin-bottom: 25px;
                    padding-bottom: 25px;
                    border-bottom: 1px solid #eee;
                }}
                .section:last-child {{
                    border-bottom: none;
                }}
                .task-list {{
                    list-style: none;
                    padding: 0;
                }}
                .task-item {{
                    background: #f8f9fa;
                    padding: 15px;
                    margin: 10px 0;
                    border-left: 4px solid #4A6FA5;
                    border-radius: 5px;
                }}
                .comments-box {{
                    background: #e3f2fd;
                    padding: 20px;
                    border-radius: 8px;
                    margin: 20px 0;
                }}
                .priority-high {{
                    border-left-color: #e74c3c;
                }}
                .priority-medium {{
                    border-left-color: #f39c12;
                }}
                .priority-low {{
                    border-left-color: #27ae60;
                }}
                .stats {{
                    display: flex;
                    justify-content: space-around;
                    background: #f1f8ff;
                    padding: 20px;
                    border-radius: 8px;
                    margin: 20px 0;
                }}
                .stat-item {{
                    text-align: center;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                    color: #666;
                    font-size: 14px;
                }}
                @media (max-width: 600px) {{
                    body {{
                        padding: 10px;
                    }}
                    .header, .content {{
                        padding: 20px;
                    }}
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📚 Learning Progress Update</h1>
                <p>{current_date} • {current_time}</p>
            </div>
            
            <div class="content">
                <div class="section">
                    <h2>Hello from {sender_name}</h2>
                    <p>Here's today's learning progress update:</p>
                </div>
                
                <div class="section">
                    <h3>📋 Tasks for Today ({len(tasks)} total)</h3>
                    <ul class="task-list">
        '''
        
        # Add tasks with priority indicators
        for i, task in enumerate(tasks):
            priority = "high" if i < 3 else "medium" if i < 6 else "low"
            html += f'<li class="task-item priority-{priority}">'
            html += f'<strong>Task {i+1}:</strong> {task}'
            html += '</li>'
        
        html += f'''
                    </ul>
                </div>
        '''
        
        if comments:
            html += f'''
                <div class="section">
                    <h3>💭 Comments & Questions</h3>
                    <div class="comments-box">
                        {comments}
                    </div>
                </div>
            '''
        
        html += f'''
                <div class="section">
                    <div class="stats">
                        <div class="stat-item">
                            <h4>{len(tasks)}</h4>
                            <p>Total Tasks</p>
                        </div>
                        <div class="stat-item">
                            <h4>{min(3, len(tasks))}</h4>
                            <p>Recommended Focus</p>
                        </div>
                        <div class="stat-item">
                            <h4>{len(tasks)//3 + 1}</h4>
                            <p>Estimated Days</p>
                        </div>
                    </div>
                </div>
                
                <div class="section">
                    <h3>🎯 Recommended Action</h3>
                    <p>Focus on completing 2-3 high priority tasks today. Break them into smaller, manageable steps if needed.</p>
                </div>
                
                <div class="footer">
                    <p>This is an automated notification from Learning Progress Notifier</p>
                    <p>Sent on {current_date} at {current_time}</p>
                    <p><small>You can reply to this email for direct communication</small></p>
                </div>
            </div>
        </body>
        </html>
        '''
        
        return subject, html
    
    def create_progress_report_template(self, **kwargs):
        """Create progress report template"""
        subject = f"📊 Learning Progress Report - {datetime.now().strftime('%B %d, %Y')}"
        html = self.create_daily_update_template(**kwargs)[1]
        return subject, html
    
    def create_weekly_review_template(self, **kwargs):
        """Create weekly review template"""
        subject = f"📈 Weekly Learning Review - Week {datetime.now().strftime('%U')}"
        html = self.create_daily_update_template(**kwargs)[1]
        return subject, html
    
    def create_urgent_template(self, **kwargs):
        """Create urgent notification template"""
        subject = f"🚨 URGENT: Learning Priority Update"
        html = self.create_daily_update_template(**kwargs)[1]
        return subject, html
    
    def create_text_version(self, tasks: List[str], comments: str, sender_name: str) -> str:
        """Create plain text version of email"""
        text = f"""Learning Progress Update from {sender_name}
        
Date: {datetime.now().strftime('%B %d, %Y')}
Time: {datetime.now().strftime('%I:%M %p')}

TASKS TO COMPLETE:
{chr(10).join([f'{i+1}. {task}' for i, task in enumerate(tasks)])}

"""
        
        if comments:
            text += f"COMMENTS/QUESTIONS:\n{comments}\n\n"
        
        text += f"""
RECOMMENDATION: Focus on completing 2-3 high priority tasks today.

Total tasks: {len(tasks)}
Estimated completion: {len(tasks)//3 + 1} days

---
This is an automated notification from Learning Progress Notifier
"""
        
        return text