import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create or update demo admin user for local JWT login."

    def handle(self, *args, **options):
        username = os.getenv("DEMO_ADMIN_USERNAME", "admin")
        password = os.getenv("DEMO_ADMIN_PASSWORD", "admin123")
        email = os.getenv("DEMO_ADMIN_EMAIL", "admin@example.com")

        user_model = get_user_model()
        user, created = user_model.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
                "is_staff": True,
                "is_superuser": True,
            },
        )

        user.is_staff = True
        user.is_superuser = True
        user.email = email
        user.set_password(password)
        user.save()

        action = "created" if created else "updated"
        self.stdout.write(self.style.SUCCESS(f"Demo admin user {action}: {username}"))
