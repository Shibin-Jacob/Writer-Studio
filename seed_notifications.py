from backend.database import SessionLocal
from backend.models.models import User, Notification

db = SessionLocal()
user = db.query(User).first()
if user:
    notif1 = Notification(
        user_id=user.id,
        title="Welcome to Writer Studio!",
        message="We are glad to have you here. Start by creating your first story.",
        type="system"
    )
    notif2 = Notification(
        user_id=user.id,
        title="Settings Updated",
        message="Your profile settings were successfully updated.",
        type="info",
        is_read=True
    )
    db.add(notif1)
    db.add(notif2)
    db.commit()
    print("Notifications seeded successfully.")
else:
    print("No users found to seed notifications.")
db.close()
