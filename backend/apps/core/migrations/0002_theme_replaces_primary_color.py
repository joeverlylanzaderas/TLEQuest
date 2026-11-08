from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.RemoveField(model_name="systemsettings", name="primary_color"),
        migrations.AddField(
            model_name="systemsettings",
            name="theme",
            field=models.CharField(
                choices=[("default", "TLEQuest Default"), ("school", "School Blue")],
                default="default",
                max_length=20,
            ),
        ),
    ]