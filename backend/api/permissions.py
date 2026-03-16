from rest_framework.permissions import BasePermission


def get_employee(user):
    """Get the Employee instance linked to this User, or None."""
    if hasattr(user, 'employee'):
        return user.employee
    return None


def get_role(user):
    """Get the role string for this User."""
    if user.is_superuser:
        return 'Admin'
    emp = get_employee(user)
    return emp.role if emp else None


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and get_role(request.user) == 'Admin'


class IsManagerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        role = get_role(request.user)
        return request.user.is_authenticated and role in ('Admin', 'Manager')


class IsEmployeeUser(BasePermission):
    """Any authenticated user with an Employee profile."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and get_employee(request.user) is not None
