# backend/apps/classrooms/admin.py
from django.contrib import admin
from .models import Class, ClassEnrollment, Group, GroupMember


class ClassEnrollmentInline(admin.TabularInline):
    model = ClassEnrollment
    extra = 0
    autocomplete_fields = ["student"]
    readonly_fields = ["enrolled_at"]


class GroupInline(admin.TabularInline):
    model = Group
    extra = 0
    fields = ["group_number", "group_name", "leader"]
    autocomplete_fields = ["leader"]


@admin.register(Class)
class ClassAdmin(admin.ModelAdmin):
    list_display = ("class_name", "teacher", "section", "school_year", "invite_code", "is_active", "created_at")
    list_filter = ("is_active", "school_year", "subject")
    search_fields = ("class_name", "invite_code", "teacher__username")
    autocomplete_fields = ["teacher"]
    readonly_fields = ("created_at", "updated_at")
    inlines = [GroupInline, ClassEnrollmentInline]


class GroupMemberInline(admin.TabularInline):
    model = GroupMember
    extra = 0
    autocomplete_fields = ["student"]
    readonly_fields = ["joined_at"]


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ("group_name", "group_number", "class_obj", "leader", "created_at")
    list_filter = ("class_obj",)
    search_fields = ("group_name", "class_obj__class_name", "leader__username")
    autocomplete_fields = ["class_obj", "leader"]
    readonly_fields = ("created_at",)
    inlines = [GroupMemberInline]


@admin.register(ClassEnrollment)
class ClassEnrollmentAdmin(admin.ModelAdmin):
    list_display = ("student", "class_obj", "enrolled_at")
    list_filter = ("class_obj",)
    search_fields = ("student__username", "class_obj__class_name")
    autocomplete_fields = ["student", "class_obj"]
    readonly_fields = ("enrolled_at",)


@admin.register(GroupMember)
class GroupMemberAdmin(admin.ModelAdmin):
    list_display = ("student", "group", "member_role", "joined_at")
    list_filter = ("group__class_obj",)
    search_fields = ("student__username", "group__group_name")
    autocomplete_fields = ["student", "group"]
    readonly_fields = ("joined_at",)