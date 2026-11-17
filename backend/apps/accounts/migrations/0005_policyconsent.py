from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_auditlog"),
    ]

    operations = [
        migrations.CreateModel(
            name="PolicyConsent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("version", models.CharField(max_length=20)),
                ("accepted_at", models.DateTimeField(auto_now_add=True)),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="policy_consents", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-accepted_at"]},
        ),
        migrations.AddConstraint(
            model_name="policyconsent",
            constraint=models.UniqueConstraint(fields=("user", "version"), name="unique_consent_per_user_version"),
        ),
    ]
