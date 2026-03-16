from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'employees', views.EmployeeViewSet, basename='employee')
router.register(r'leaves', views.LeaveRequestViewSet, basename='leaverequest')
router.register(r'tasks', views.TaskViewSet, basename='task')
router.register(r'attendance', views.AttendanceViewSet, basename='attendance')
router.register(r'activity-logs', views.ActivityLogViewSet, basename='activitylog')


urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('dashboard/', views.dashboard_stats, name='dashboard-stats'),
    path('analytics/', views.analytics_data, name='analytics-data'),
    path('attendance/check-in/', views.AttendanceViewSet.as_view({'post': 'check_in'}), name='attendance-check-in'),
    path('attendance/check-out/', views.AttendanceViewSet.as_view({'post': 'check_out'}), name='attendance-check-out'),
    path('', include(router.urls)),
]
