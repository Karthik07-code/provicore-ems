from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.contrib.auth import authenticate
from django.utils import timezone
from django.db.models import Count, Q
from django.db.models.functions import TruncMonth
from decimal import Decimal
import datetime
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Employee, LeaveRequest, Task, Attendance, ActivityLog
from .serializers import (
    EmployeeSerializer, LeaveRequestSerializer,
    TaskSerializer, AttendanceSerializer, LoginSerializer,
    ActivityLogSerializer
)
from .permissions import get_role, get_employee

from django.shortcuts import render

def index(request):
    return render(request, "index.html")

# ── Helpers ──────────────────────────────────────────────────────

def _get_request_role(request):
    return get_role(request.user)


def _get_request_employee(request):
    return get_employee(request.user)

def log_activity(user, action):
    ActivityLog.objects.create(user=user, action=action)


# ── Login ────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = authenticate(
            username=serializer.validated_data['username'],
            password=serializer.validated_data['password']
        )
        if user:
            refresh = RefreshToken.for_user(user)
            role = get_role(user)
            emp = get_employee(user)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'name': emp.name if emp else user.username,
                    'role': role,
                    'employee_id': emp.id if emp else None,
                }
            })
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── Dashboard & Analytics ────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    role = _get_request_role(request)
    emp = _get_request_employee(request)
    today = timezone.now().date()

    if role == 'Employee' and emp:
        stats = {
            'my_tasks': Task.objects.filter(assigned_employee=emp, status__in=['Pending', 'In Progress']).count(),
            'my_leave_requests': LeaveRequest.objects.filter(employee=emp, status='Pending').count(),
            'my_attendance': Attendance.objects.filter(employee=emp, date=today).exists(),
        }
    elif role == 'Manager' and emp:
        dept_employees = Employee.objects.filter(department=emp.department)
        stats = {
            'team_members': dept_employees.count(),
            'pending_tasks': Task.objects.filter(assigned_employee__department=emp.department, status='Pending').count(),
            'leave_requests': LeaveRequest.objects.filter(employee__department=emp.department, status='Pending').count(),
        }
    else:
        # Admin
        stats = {
            'total_employees': Employee.objects.count(),
            'total_managers': Employee.objects.filter(role='Manager').count(),
            'pending_leaves': LeaveRequest.objects.filter(status='Pending').count(),
            'active_tasks': Task.objects.filter(status__in=['Pending', 'In Progress']).count(),
            'employees_present_today': Attendance.objects.filter(date=today, check_in_time__isnull=False).count(),
        }

    stats['role'] = role
    return Response(stats)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def analytics_data(request):
    role = _get_request_role(request)
    if role != 'Admin':
         return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
         
    # Employees per department
    dept_stats = Employee.objects.values('department').annotate(count=Count('id'))
    
    # Task completion rate
    total_tasks = Task.objects.count()
    completed_tasks = Task.objects.filter(status='Completed').count()
    
    # Leaves per month
    leave_stats = LeaveRequest.objects.annotate(month=TruncMonth('start_date')).values('month').annotate(count=Count('id')).order_by('month')
    
    return Response({
        'employees_by_department': list(dept_stats),
        'task_completion': {
            'total': total_tasks,
            'completed': completed_tasks,
            'pending': Task.objects.filter(status='Pending').count(),
            'in_progress': Task.objects.filter(status='In Progress').count()
        },
        'leaves_by_month': [{'month': l['month'].strftime('%b %Y'), 'count': l['count']} for l in leave_stats if l['month']]
    })


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        role = _get_request_role(self.request)
        if role == 'Admin':
            return ActivityLog.objects.all()[:50]
        return ActivityLog.objects.none()


# ── Employees ────────────────────────────────────────────────────

class EmployeeViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        role = _get_request_role(self.request)
        emp = _get_request_employee(self.request)

        if role == 'Admin':
            qs = Employee.objects.all()
        elif role == 'Manager' and emp:
            qs = Employee.objects.filter(department=emp.department)
        elif emp:
            qs = Employee.objects.filter(id=emp.id)
        else:
            qs = Employee.objects.none()

        search = self.request.query_params.get('search')
        department = self.request.query_params.get('department')

        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(department__icontains=search))
        if department:
            qs = qs.filter(department=department)

        return qs


    def create(self, request, *args, **kwargs):
        role = _get_request_role(request)
        if role != 'Admin':
            return Response({'error': 'Only admins can create employees'}, status=status.HTTP_403_FORBIDDEN)
        response = super().create(request, *args, **kwargs)
        if response.status_code == 201:
            log_activity(request.user, f"Added employee {response.data.get('name')}")
        return response

    def update(self, request, *args, **kwargs):
        role = _get_request_role(request)
        if role != 'Admin':
            return Response({'error': 'Only admins can update employees'}, status=status.HTTP_403_FORBIDDEN)
        response = super().update(request, *args, **kwargs)
        if response.status_code == 200:
            log_activity(request.user, f"Updated employee {response.data.get('name')}")
        return response

    def destroy(self, request, *args, **kwargs):
        role = _get_request_role(request)
        if role != 'Admin':
            return Response({'error': 'Only admins can delete employees'}, status=status.HTTP_403_FORBIDDEN)
        emp_name = self.get_object().name
        response = super().destroy(request, *args, **kwargs)
        if response.status_code == 204:
            log_activity(request.user, f"Deleted employee {emp_name}")
        return response


# ── Leave Requests ───────────────────────────────────────────────

class LeaveRequestViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        role = _get_request_role(self.request)
        emp = _get_request_employee(self.request)

        if role == 'Admin':
            qs = LeaveRequest.objects.all()
        elif role == 'Manager' and emp:
            qs = LeaveRequest.objects.filter(employee__department=emp.department)
        elif emp:
            qs = LeaveRequest.objects.filter(employee=emp)
        else:
            qs = LeaveRequest.objects.none()

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        if response.status_code == 201:
            log_activity(request.user, f"Requested {response.data.get('leave_type')} leave")
        return response

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        role = _get_request_role(request)
        if role == 'Employee':
            return Response({'error': 'Employees cannot approve/reject leaves'}, status=status.HTTP_403_FORBIDDEN)
        leave = self.get_object()
        new_status = request.data.get('status')
        if new_status not in ['Approved', 'Rejected']:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        leave.status = new_status
        leave.save()
        log_activity(request.user, f"{new_status} leave for {leave.employee.name}")
        return Response(LeaveRequestSerializer(leave).data)


# ── Tasks ────────────────────────────────────────────────────────

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        role = _get_request_role(self.request)
        emp = _get_request_employee(self.request)

        if role == 'Admin':
            qs = Task.objects.all()
        elif role == 'Manager' and emp:
            qs = Task.objects.filter(assigned_employee__department=emp.department)
        elif emp:
            qs = Task.objects.filter(assigned_employee=emp)
        else:
            qs = Task.objects.none()
            
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def create(self, request, *args, **kwargs):
        role = _get_request_role(request)
        if role == 'Employee':
            return Response({'error': 'Employees cannot create tasks'}, status=status.HTTP_403_FORBIDDEN)
        response = super().create(request, *args, **kwargs)
        if response.status_code == 201:
            emp = Employee.objects.get(id=response.data.get('assigned_employee'))
            log_activity(request.user, f"Assigned task '{response.data.get('title')}' to {emp.name}")
        return response

    def update(self, request, *args, **kwargs):
        role = _get_request_role(request)
        if role == 'Employee':
            # Employees can only update status via PATCH
            allowed_fields = {'status'}
            if request.method == 'PUT' or set(request.data.keys()) - allowed_fields:
                return Response({'error': 'Employees can only update task status'}, status=status.HTTP_403_FORBIDDEN)
        obj = self.get_object()
        old_status = obj.status
        response = super().update(request, *args, **kwargs)
        if response.status_code == 200 and old_status != response.data.get('status'):
            log_activity(request.user, f"Updated task '{obj.title}' status to {response.data.get('status')}")
        return response

    def partial_update(self, request, *args, **kwargs):
        role = _get_request_role(request)
        if role == 'Employee':
            allowed_fields = {'status'}
            if set(request.data.keys()) - allowed_fields:
                return Response({'error': 'Employees can only update task status'}, status=status.HTTP_403_FORBIDDEN)
        obj = self.get_object()
        old_status = obj.status
        response = super().partial_update(request, *args, **kwargs)
        if response.status_code == 200 and old_status != response.data.get('status'):
             log_activity(request.user, f"Updated task '{obj.title}' status to {response.data.get('status')}")
        return response


# ── Attendance ───────────────────────────────────────────────────

class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        role = _get_request_role(self.request)
        emp = _get_request_employee(self.request)

        if role == 'Admin':
            return Attendance.objects.all()
        elif role == 'Manager' and emp:
            return Attendance.objects.filter(employee__department=emp.department)
        elif emp:
            return Attendance.objects.filter(employee=emp)
        return Attendance.objects.none()

    @action(detail=False, methods=['post'])
    def check_in(self, request):
        role = _get_request_role(request)
        emp = _get_request_employee(request)
        employee_id = request.data.get('employee')

        # Employees can only check in themselves
        if role == 'Employee' and emp:
            employee_id = emp.id

        today = timezone.now().date()
        now = timezone.now().time()

        attendance, created = Attendance.objects.get_or_create(
            employee_id=employee_id,
            date=today,
            defaults={'check_in_time': now}
        )
        if not created:
            if attendance.check_in_time:
                return Response({'error': 'Already checked in today'}, status=status.HTTP_400_BAD_REQUEST)
            attendance.check_in_time = now
            attendance.save()
            
        log_activity(request.user, f"Checked in")

        return Response(AttendanceSerializer(attendance).data)

    @action(detail=False, methods=['post'])
    def check_out(self, request):
        role = _get_request_role(request)
        emp = _get_request_employee(request)
        employee_id = request.data.get('employee')

        # Employees can only check out themselves
        if role == 'Employee' and emp:
            employee_id = emp.id

        today = timezone.now().date()
        now = timezone.now().time()

        try:
            attendance = Attendance.objects.get(employee_id=employee_id, date=today)
        except Attendance.DoesNotExist:
            return Response({'error': 'No check-in found for today'}, status=status.HTTP_400_BAD_REQUEST)

        if attendance.check_out_time:
            return Response({'error': 'Already checked out today'}, status=status.HTTP_400_BAD_REQUEST)

        attendance.check_out_time = now
        
        # Calculate total hours
        if attendance.check_in_time and now:
            check_in_dt = datetime.datetime.combine(today, attendance.check_in_time)
            check_out_dt = datetime.datetime.combine(today, now)
            duration = check_out_dt - check_in_dt
            attendance.total_hours = Decimal(duration.total_seconds() / 3600.0).quantize(Decimal('0.01'))
            
        attendance.save()
        log_activity(request.user, f"Checked out")
        
        return Response(AttendanceSerializer(attendance).data)
