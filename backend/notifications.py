import os
import smtplib
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

class NotificationManager:
    """
    Handles outbound notifications for the Approval Agent.
    Supports Microsoft Teams (Webhooks) and Outlook (SMTP).
    """

    @staticmethod
    def send_teams_message(title, message):
        """Sends a message to a Microsoft Teams channel via Webhook."""
        webhook_url = os.getenv("TEAMS_WEBHOOK_URL")
        if not webhook_url:
            print("⚠️ [Teams Mock]: Webhook URL not set. Notification skipped.")
            return False

        payload = {
            "type": "message",
            "attachments": [
                {
                    "contentType": "application/vnd.microsoft.card.adaptive",
                    "content": {
                        "type": "AdaptiveCard",
                        "body": [
                            {"type": "TextBlock", "text": title, "weight": "bolder", "size": "medium"},
                            {"type": "TextBlock", "text": message, "wrap": True}
                        ],
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                        "version": "1.0"
                    }
                }
            ]
        }

        try:
            # Note: verify=False is used to bypass SSL certificate issues common in hackathon environments.
            # In a production environment, you should ensure local certificates are correctly configured.
            import urllib3
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
            
            response = requests.post(webhook_url, json=payload, timeout=5, verify=False)
            response.raise_for_status()
            print(f"✅ Teams notification sent: {title}")
            return True
        except Exception as e:
            print(f"❌ Failed to send Teams notification: {e}")
            return False

    @staticmethod
    def send_outlook_email(recipient, subject, body):
        """Sends an email via Outlook SMTP."""
        smtp_server = os.getenv("SMTP_SERVER", "smtp.office365.com")
        smtp_port = int(os.getenv("SMTP_PORT", 587))
        sender_email = os.getenv("OUTLOOK_EMAIL")
        sender_password = os.getenv("OUTLOOK_PASSWORD")

        if not sender_email or not sender_password:
            print(f"⚠️ [Outlook Mock]: Credentials not set. Email to {recipient} skipped.")
            return False

        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = recipient
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        try:
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(sender_email, sender_password)
            server.send_message(msg)
            server.quit()
            print(f"✅ Outlook email sent to {recipient}: {subject}")
            return True
        except Exception as e:
            print(f"❌ Failed to send Outlook email: {e}")
            return False

    @classmethod
    def notify_all(cls, title, message, recipient_email=None):
        """Helper to send to all configured channels."""
        print(f"\n📣 [AGENT NOTIFICATION]: {title}")
        print(f"📄 {message}\n")
        
        # 1. Notify via Teams
        cls.send_teams_message(title, message)
        
        # 2. Notify via Outlook (Temporarily disabled)
        # if recipient_email:
        #     cls.send_outlook_email(recipient_email, title, message)
