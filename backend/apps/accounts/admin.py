from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.http import HttpResponseRedirect
from .models import User, UserProfile
from django.contrib import messages
from django.shortcuts import render
from django.urls import path
from .utils import generate_simple_password, blacklist_all_tokens_for_user


class UserAdmin(BaseUserAdmin):
    model = User
    list_display = ('username', 'role', "is_active", 'is_staff', 'is_active')
    list_filter = ('role', 'is_staff', 'is_active')
    search_fields = ("username", "profile__first_name", "profile__last_name")
    ordering = ('username',)
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Permissions', {'fields': ('role', 'is_staff', 'is_active', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('date_joined', 'updated_at')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'role', 'password1', 'password2', 'is_staff', 'is_active')}
        ),
    )
    readonly_fields = ("date_joined", "updated_at")
    actions = ["reset_password_action"]
    
    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path(
                "<int:user_id>/confirm-reset-password/",
                self.admin_site.admin_view(self.confirm_reset_password),
                name="accounts_user_confirm_reset_password",
            ),
        ]
        return custom + urls
    
    def reset_password_action(self, request, queryset):
        if queryset.count() != 1:
            self.message_user(request, "Select exactly one user to reset.", level=messages.ERROR)
            return
        user = queryset.first()
        return HttpResponseRedirect(f"{user.id}/confirm-reset-password/")

    reset_password_action.short_description = "Reset password for selected user"
    
    def confirm_reset_password(self, request, user_id):
        user = User.objects.get(pk=user_id)

        if request.method == "POST":
            new_password = generate_simple_password()
            user.set_password(new_password)
            user.save()
            blacklist_all_tokens_for_user(user)
            self.message_user(
                request,
                f"Password reset for {user.username}. New password: {new_password} "
                f"— write this down now, it won't be shown again.",
                level=messages.SUCCESS,
            )
            return HttpResponseRedirect("../../")

        return render(request, "admin/confirm_reset_password.html", {"user_obj": user})
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related("profile")
    
    
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "first_name", "last_name", "email", "school", "grade_level")
    search_fields = ("user__username", "first_name", "last_name", "email")


admin.site.register(User, UserAdmin)
admin.site.register(UserProfile, UserProfileAdmin)