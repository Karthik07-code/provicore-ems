# ProviCore EMS

ProviCore EMS is a full-stack employee management platform built with React and Django REST Framework. It helps organizations manage employees, track tasks, approve leave requests, monitor attendance, and analyze workforce activity through role-based dashboards.

## Features

- **Role-Based Access Control (RBAC)**: Distinct permissions for `Admin`, `Manager`, and `Employee`.
- **Dynamic Dashboards**: Role-specific statistics, recent activity timelines, and progress bars.
- **Analytics & Reporting**: Visually engaging charts using `Recharts` for department distribution, task completion rates, and leave trends.
- **Employee Directory**: Advanced table with search, department filtering, profile modals, and UI Avatars integration.
- **Task Management (Kanban Board)**: Drag-and-drop style columns (Pending, In Progress, Completed), Priority badges, and deadline tracking.
- **Leave Management**: Submit, approve, or reject leave requests with status-colored indicators.
- **Attendance Tracking**: Clock-in and clock-out functionality with real-time hours calculation.
- **Modern UI**: Clean SaaS enterprise design with responsive sidebars, robust CSS animations, and light aesthetic styling.

---

## Tech Stack

### Frontend
- **React.js** (Functional Components + Hooks)
- **Vite** (Build Tool)
- **Axios** (API Requests)
- **Recharts** (Data Visualization)
- **date-fns** (Date Formatting)
- **React Icons** & Vanilla **CSS**

### Backend
- **Django** & **Django REST Framework (DRF)**
- **SQLite** (Default Database)
- **Simple JWT** (Authentication)
- **django-cors-headers** (CORS management)

---

## Getting Started

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
python manage.py makemigrations api
python manage.py migrate

# Seed initial demo data (This also creates demo users)
python manage.py seed_data

# Start the server
python manage.py runserver
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The React app will typically be running on `http://localhost:5173`.

---

## Demo Credentials

The `seed_data` script provisions the following accounts for testing:

- **Admin**: Username: `admin` | Password: `admin123`
- **Manager**: Username: `manager` | Password: `manager123`
- **Employee**: Username: `employee` | Password: `employee123`

---

## Project Structure

### Backend
- `api/models.py`: Defines Employee, Task, LeaveRequest, Attendance, and ActivityLog models.
- `api/views.py`: API endpoints for CRUD operations and specialized logic like Analytics and logging.
- `api/urls.py`: URL routing mappings.
- `api/management/commands/seed_data.py`: Populate script for fresh installations.

### Frontend
- `src/pages/`: Contains main views (`Dashboard.jsx`, `Employees.jsx`, `Tasks.jsx`, etc.).
- `src/components/`: Reusable components (e.g., `Layout.jsx`, `ProtectedRoute.jsx`).
- `src/context/`: State management (`AuthContext.jsx`).
- `src/index.css`: Global styling using variable-based thematic CSS.

---

## License
MIT License. Feel free to use this as a robust portfolio piece or customize it for real-world HR use cases.
