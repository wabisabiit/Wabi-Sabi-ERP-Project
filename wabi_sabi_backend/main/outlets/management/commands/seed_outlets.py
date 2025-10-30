from django.core.management.base import BaseCommand
from taskmaster.models import Location
from outlets.models import Outlet

DATA = [
    ("IC",  "Iffco Chowk",        "+91-9998886067", "2025-07-18", True),
    ("KN",  "Krishna Nagar",      "+91-7303479020", "2025-08-03", True),
    ("M3M", "M3M Urbana",         "+91-7333024520", "2025-05-10", True),
    ("RJO", "Rajouri Outside",    "+91-7017402732", "2025-06-20", True),
    ("RJR", "Rajouri Inside",     "+91-7307387070", "2025-08-25", True),
    ("TN",  "Tilak Nagar",        "+91-9998883461", "2025-06-01", True),
    ("UP-AP","UP-AP",             "+91-",           "2025-04-01", True),
    ("UV",  "Udyog Vihar",        "+91-7303467670", "2025-07-05", True),
    ("WS",  "Head Office (WS)",   "+91-",           "2025-04-01", True),
]

class Command(BaseCommand):
    help = "Create or update outlets for existing locations (matches by code)."

    def handle(self, *args, **opts):
        created = updated = 0
        missing = []
        for code, display, phone, date, active in DATA:
            loc = Location.objects.filter(code=code).first()
            if not loc:
                missing.append(code)
                continue
            obj, was_created = Outlet.objects.update_or_create(
                location=loc,
                defaults=dict(display_name=display, contact_no=phone, opening_date=date, active=active)
            )
            created += int(was_created)
            updated += int(not was_created)
        self.stdout.write(self.style.SUCCESS(
            f"Outlets seeded: created={created} updated={updated} missing_locations={missing}"
        ))
