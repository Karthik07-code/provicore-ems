from django.contrib import admin

from .models import Employee, LeaveRequest, Task, Attendance

admin.site.register(Employee)
admin.site.register(LeaveRequest)
admin.site.register(Task)
admin.site.register(Attendance)
