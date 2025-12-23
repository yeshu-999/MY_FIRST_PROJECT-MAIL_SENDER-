import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask Configuration
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # Email Configuration
    EMAIL_CONFIG = {
        'smtp_server': os.getenv('SMTP_SERVER', 'smtp.gmail.com'),
        'smtp_port': int(os.getenv('SMTP_PORT', 587)),
        'sender_email': os.getenv('SENDER_EMAIL', ''),
        'sender_password': os.getenv('SENDER_PASSWORD', ''),
        'default_subject': 'Learning Progress Update'
    }
    
    # App settings
    APP_NAME = os.getenv('APP_NAME', "Learning Progress Notifier")
    APP_VERSION = os.getenv('APP_VERSION', "1.0.0")
    
    # Database settings (if you add database later)
    DATABASE_URI = os.getenv('DATABASE_URI', 'sqlite:///learning_notifier.db')