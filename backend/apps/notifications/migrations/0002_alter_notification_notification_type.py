from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='notification',
            name='notification_type',
            field=models.CharField(choices=[('new_submission', 'New Submission'), ('quest_assigned', 'Quest Assigned'), ('submission_feedback', 'Submission Feedback'), ('student_enrolled', 'Student Enrolled')], max_length=30),
        ),
    ]
