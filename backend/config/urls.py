#backend/config/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/', include('apps.accounts.urls')),
    path("api/classrooms/", include("apps.classrooms.urls")),
    path("api/quests/", include("apps.quests.urls")),
    path("api/assignments/", include("apps.assignments.urls")),
    path("api/rewards/", include("apps.rewards.urls")),
    path("api/submissions/", include("apps.submissions.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/dashboard/", include("apps.core.urls")),
    path("api/core/", include("apps.core.urls")),
    
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    # This is for development only. In production, you should serve media files through a proper web server.
    # This static() line only works while DEBUG = True — fine for now since that's your current dev setup, but worth remembering this needs a different approach (nginx/cloud storage) once you deploy for real.
