import random
from datetime import datetime, date, timedelta, time
from decimal import Decimal
from django.utils import timezone
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import Employee, LeaveRequest, Task, Attendance, ActivityLog


class Command(BaseCommand):
    help = 'Seeds the database with sample data'

    def handle(self, *args, **options):
        self.stdout.write('Seeding database...')

        # Clean existing data to avoid duplicates with new fields
        # Optional: We just get_or_create or recreate
        ActivityLog.objects.all().delete()
        Attendance.objects.all().delete()
        Task.objects.all().delete()
        LeaveRequest.objects.all().delete()
        Employee.objects.all().delete()
        User.objects.filter(username__in=['admin', 'manager', 'employee']).delete()
        
        # ── Users & Linked Employees ─────────────────────────────
        users_data = [
            {
                'username': 'admin', 'email': 'admin@company.com', 'password': 'admin123',
                'is_superuser': True, 'is_staff': True,
                'emp': {'name': 'Admin User', 'department': 'HR', 'role': 'Admin', 'designation': 'System Administrator', 'phone': '9367799723'},
            },
            {
                'username': 'manager', 'email': 'manager@company.com', 'password': 'manager123',
                'is_superuser': False, 'is_staff': False,
                'emp': {'name': 'Abishek', 'department': 'Engineering', 'role': 'Manager', 'designation': 'Engineering Manager', 'phone': '9367799777'},
            },
            {
                'username': 'employee', 'email': 'employee@company.com', 'password': 'employee123',
                'is_superuser': False, 'is_staff': False,
                'emp': {'name': 'Pradeep Kumar', 'department': 'Engineering', 'role': 'Employee', 'designation': 'Frontend Developer', 'phone': '9367799881'},
            },
        ]

        linked_employees = []
        user_objects = {}
        for ud in users_data:
            user, created = User.objects.get_or_create(
                username=ud['username'],
                defaults={
                    'email': ud['email'],
                    'is_superuser': ud['is_superuser'],
                    'is_staff': ud['is_staff'],
                }
            )
            if created:
                user.set_password(ud['password'])
                user.save()
                self.stdout.write(self.style.SUCCESS(f"  ✓ User: {ud['username']} / {ud['password']}"))
            
            user_objects[ud['username']] = user

            emp, emp_created = Employee.objects.get_or_create(
                email=ud['email'],
                defaults={
                    'user': user,
                    'name': ud['emp']['name'],
                    'department': ud['emp']['department'],
                    'role': ud['emp']['role'],
                    'designation': ud['emp']['designation'],
                    'phone': ud['emp']['phone'],
                    'status': 'Active',
                    'joining_date': date.today() - timedelta(days=random.randint(60, 365)),
                }
            )
            if not emp.user:
                emp.user = user
                emp.phone = ud['emp']['phone']
                emp.status = 'Active'
                emp.save()
            linked_employees.append(emp)

        # ── Additional Employees ──────────────────────────────────
        employees_data = [
            {'name': 'Arjun Mehta', 'email': 'arjun@company.com', 'department': 'Engineering', 'role': 'Employee', 'designation': 'Senior Developer', 'phone': '9367799733'},
            {'name': 'Sneha Patel', 'email': 'sneha@company.com', 'department': 'HR', 'role': 'Employee', 'designation': 'HR Executive', 'phone': '776779965'},
            {'name': 'Vikram Singh', 'email': 'vikram@company.com', 'department': 'Sales', 'role': 'Employee', 'designation': 'Sales Lead', 'phone': '8867799733'},
            {'name': 'Ananya Gupta', 'email': 'ananya@company.com', 'department': 'Finance', 'role': 'Employee', 'designation': 'Accountant', 'phone': '936779767'},
            {'name': 'Karan Joshi', 'email': 'karan@company.com', 'department': 'Engineering', 'role': 'Employee', 'designation': 'Backend Developer', 'phone': '6267799750'},
            {'name': 'Deepika Reddy', 'email': 'deepika@company.com', 'department': 'Operations', 'role': 'Manager', 'designation': 'Operations Manager', 'phone': '876779983'},
        ]

        employees = list(linked_employees)
        for data in employees_data:
            emp, created = Employee.objects.get_or_create(
                email=data['email'],
                defaults={
                    'name': data['name'],
                    'department': data['department'],
                    'role': data['role'],
                    'designation': data['designation'],
                    'phone': data['phone'],
                    'status': random.choices(['Active', 'Inactive'], weights=[9, 1])[0],
                    'joining_date': date.today() - timedelta(days=random.randint(30, 365)),
                }
            )
            if not created:
                 emp.phone = data['phone']
                 emp.save()
            if emp not in employees:
                employees.append(emp)

        # ── Leave Requests ────────────────────────────────────────
        leave_types = ['Sick', 'Casual', 'Annual']
        statuses = ['Pending', 'Approved', 'Rejected']
        
        LeaveRequest.objects.all().delete()
        for emp in employees[:8]:
            LeaveRequest.objects.create(
                employee=emp,
                leave_type=random.choice(leave_types),
                start_date=date.today() + timedelta(days=random.randint(-15, 15)),
                end_date=date.today() + timedelta(days=random.randint(16, 30)),
                reason=f'{emp.name} requested time off.',
                status=random.choice(statuses),
            )

        # ── Tasks ─────────────────────────────────────────────────
        task_titles = [
            ('Build REST API', 'Implement CRUD endpoints for employee module'),
            ('Design Dashboard UI', 'Create mockups for the admin dashboard'),
            ('Write Unit Tests', 'Add test coverage for authentication module'),
            ('Deploy to Staging', 'Set up CI/CD pipeline and deploy'),
            ('Database Optimization', 'Index slow queries and optimize joins'),
            ('Code Review', 'Review pull requests from the team'),
            ('Client Onboarding', 'Setup new client accounts'),
            ('Quarterly Report', 'Prepare Q3 financial report'),
        ]
        task_statuses = ['Pending', 'In Progress', 'Completed']
        priorities = ['Low', 'Medium', 'High']
        
        Task.objects.all().delete()
        for title, desc in task_titles:
            Task.objects.create(
                title=title,
                description=desc,
                assigned_employee=random.choice(employees),
                status=random.choice(task_statuses),
                priority=random.choice(priorities),
                deadline=date.today() + timedelta(days=random.randint(-5, 15)),
            )

        # ── Attendance ────────────────────────────────────────────
        Attendance.objects.all().delete()
        today = date.today()
        # Create attendance for past 5 days for a few employees
        for i in range(5):
            entry_date = today - timedelta(days=i)
            # Skip weekends implicitly if we want, but random is fine
            for emp in employees[:6]:
                # 80% chance they showed up
                if random.random() < 0.8:
                    check_in = time(9, random.randint(0, 30))
                    # 90% chance they checked out if they checked in
                    checked_out = random.random() < 0.9 and entry_date != today
                    check_out = time(17, random.randint(0, 59)) if checked_out else None
                    
                    total_hours = None
                    if check_out:
                         in_dt = datetime.combine(entry_date, check_in)
                         out_dt = datetime.combine(entry_date, check_out)
                         duration = out_dt - in_dt
                         total_hours = Decimal(duration.total_seconds() / 3600.0).quantize(Decimal('0.01'))

                    Attendance.objects.create(
                        employee=emp,
                        date=entry_date,
                        check_in_time=check_in,
                        check_out_time=check_out,
                        total_hours=total_hours
                    )

        # ── Activity Logs ─────────────────────────────────────────
        ActivityLog.objects.all().delete()
        admin_user = user_objects.get('admin')
        manager_user = user_objects.get('manager')
        emp_user = user_objects.get('employee')

        logs = [
            (admin_user, "System initialized and seeded"),
            (admin_user, "Added employee Arjun Mehta"),
            (manager_user, "Assigned task 'Build REST API' to Priya Sharma"),
            (emp_user, "Requested Annual leave"),
            (manager_user, "Approved leave for Priya Sharma"),
            (admin_user, "Updated task 'Deploy to Staging' status"),
            (emp_user, "Checked in"),
        ]
        
        # We need to simulate past timestamps, which is tricky with auto_now_add.
        # So we create and update.
        for i, (u, action) in enumerate(logs):
            log = ActivityLog.objects.create(user=u, action=action)
            log.timestamp = timezone.now() - timedelta(hours=i*2)
            log.save(update_fields=['timestamp'])

        self.stdout.write(self.style.SUCCESS('Database seeded successfully! ✨'))
