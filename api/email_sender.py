import resend
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

resend.api_key = os.getenv("RESEND_API_KEY")

def send_email(to_email: str, subject: str, body: str) -> dict:
    """Send email using Resend"""
    try:
        params = {
            "from": os.getenv("SENDER_EMAIL", "onboarding@resend.dev"),
            "to": [to_email],
            "subject": subject,
            "text": body
        }
        
        email = resend.Emails.send(params)
        print(f"✅ Email sent successfully! ID: {email['id']}")
        return {"success": True, "id": email['id']}
    
    except Exception as e:
        print(f"❌ Email sending failed: {e}")
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    # Test the email sending
    result = send_email(
        to_email="ritish8885@gmail.com'",
        subject="Test from PitchIQ",
        body="This is a test email from PitchIQ! 🚀"
    )
    print(result)