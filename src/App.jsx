import React, { useMemo, useState, useEffect } from "react";
import { supabase } from "./supabase";
import Button from "./components/common/Button";
import { Card, CardContent } from "./components/common/Card";
import Icon from "./components/common/Icon";
import ConfirmDialog from "./components/common/ConfirmDialog";
import Toast from "./components/common/Toast";
import { useToast } from "./components/common/ToastProvider";
import ExcelJS from "exceljs";
import { login, resetPassword, updatePassword } from "./features/auth/authService";
import AuthGate from "./app/AuthGate";
import {
  AuthPage,
  ProfileMenu,
} from "./features/auth";



const LEAVE_CATEGORIES = {
  STANDARD: "standard_entitlement",
  EXCEPTION: "exception",
};

const LEAVE_TYPES = [
  { value: "annual_leave", label: "Annual Leave", deductsEntitlement: true },

  { value: "compassionate_leave", label: "Compassionate Leave", deductsEntitlement: false },
  { value: "force_majeure", label: "Force Majeure", deductsEntitlement: false },
  { value: "jury_service", label: "Jury Service", deductsEntitlement: false },

  { value: "maternity_leave", label: "Maternity Leave", deductsEntitlement: false },
  { value: "paternity_leave", label: "Paternity Leave", deductsEntitlement: false },
  { value: "parental_leave", label: "Parental Leave", deductsEntitlement: false },
  { value: "adoption_leave", label: "Adoption Leave", deductsEntitlement: false },
  { value: "parents_leave", label: "Parent's Leave", deductsEntitlement: false },

  { value: "sickness_certified", label: "Sickness Certified", deductsEntitlement: false },
  { value: "sickness_uncertified", label: "Sickness Uncertified", deductsEntitlement: false },
  { value: "statutory_sick_leave", label: "Statutory Sick Leave", deductsEntitlement: false },

  { value: "study_leave", label: "Study Leave", deductsEntitlement: false },
  { value: "bereavement_leave", label: "Bereavement Leave", deductsEntitlement: false },

  { value: "suspension", label: "Suspension", deductsEntitlement: false },
  { value: "garden_leave", label: "Garden Leave", deductsEntitlement: false },
  { value: "other_unpaid", label: "Other Unpaid", deductsEntitlement: false },

  { value: "remote_working_abroad", label: "Remote Working (Abroad)", deductsEntitlement: false },
];

function leaveTypeLabel(value) {
  return LEAVE_TYPES.find((t) => t.value === value)?.label || "Leave";
}

function leaveTypeDeductsEntitlement(value) {
  return LEAVE_TYPES.find((t) => t.value === value)?.deductsEntitlement || false;
}

function pad(n) { return String(n).padStart(2, "0"); }
function toISO(date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
function fromISO(iso) { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); }
function addDays(date, days) { const copy = new Date(date); copy.setDate(copy.getDate() + days); return copy; }

function getEasterSunday(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, mm = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * mm + 114) / 31), day = ((h + l - 7 * mm + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function firstMondayOfMonth(year, monthIndex) {
  const d = new Date(year, monthIndex, 1);
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  return d;
}

function lastMondayOfMonth(year, monthIndex) {
  const d = new Date(year, monthIndex + 1, 0);
  while (d.getDay() !== 1) d.setDate(d.getDate() - 1);
  return d;
}

function nextMondayIfWeekend(date) {
  const d = new Date(date);
  if (d.getDay() === 6) return addDays(d, 2);
  if (d.getDay() === 0) return addDays(d, 1);
  return d;
}

function getIrishBankHolidays(year) {
  const easter = getEasterSunday(year);
  const holidays = [
    { date: nextMondayIfWeekend(new Date(year, 0, 1)), name: "New Year’s Day" },
    { date: firstMondayOfMonth(year, 1), name: "St Brigid’s Day" },
    { date: nextMondayIfWeekend(new Date(year, 2, 17)), name: "St Patrick’s Day" },
    { date: addDays(easter, 1), name: "Easter Monday" },
    { date: firstMondayOfMonth(year, 4), name: "May Bank Holiday" },
    { date: firstMondayOfMonth(year, 5), name: "June Bank Holiday" },
    { date: firstMondayOfMonth(year, 7), name: "August Bank Holiday" },
    { date: lastMondayOfMonth(year, 9), name: "October Bank Holiday" },
    { date: nextMondayIfWeekend(new Date(year, 11, 25)), name: "Christmas Day" },
    { date: nextMondayIfWeekend(new Date(year, 11, 26)), name: "St Stephen’s Day" },
  ];

  const used = new Map();
  holidays.forEach((h) => {
    let d = new Date(h.date);
    while (used.has(toISO(d))) d = addDays(d, 1);
    used.set(toISO(d), h.name);
  });
  return used;
}

function getDaysInYear(year) {
  const days = [];
  let d = new Date(year, 0, 1);
  while (d.getFullYear() === year) {
    days.push(new Date(d));
    d = addDays(d, 1);
  }
  return days;
}

function isWorkingDay(date, bankHolidayMap) {
  const day = date.getDay();
  return day !== 0 && day !== 6 && !bankHolidayMap.has(toISO(date));
}

function countWorkingDays(startISO, endISO, bankHolidayMap) {
  if (!startISO || !endISO) return 0;
  let start = fromISO(startISO);
  const end = fromISO(endISO);
  if (end < start) return 0;

  let count = 0;
  while (start <= end) {
    if (isWorkingDay(start, bankHolidayMap)) count += 1;
    start = addDays(start, 1);
  }
  return count;
}

function isStandardBooking(booking) {
  return leaveTypeDeductsEntitlement(booking.leaveCategory);
}

function bookingDaysForEntitlement(booking, bankHolidayMap) {
  if (!isStandardBooking(booking)) return 0;
  return countWorkingDays(booking.start, booking.end, bankHolidayMap) * Number(booking.dayAmount || 1);
}

function bookingTotalWorkingDays(booking, bankHolidayMap) {
  return countWorkingDays(booking.start, booking.end, bankHolidayMap) * Number(booking.dayAmount || 1);
}

function bookingTypeLabel(booking) {
  return leaveTypeLabel(booking.leaveCategory);
}

function paymentStatusLabel(booking) {
  return isStandardBooking(booking) ? "Paid" : booking.paymentStatus === "unpaid" ? "Unpaid" : "Paid";
}

function leaveTypeColorClass(booking) {
  switch (booking.leaveCategory) {
    case "annual_leave":
      return "bg-emerald-200";

    case "sickness_certified":
      return "bg-red-200";

    case "sickness_uncertified":
      return "bg-orange-200";

    case "statutory_sick_leave":
      return "bg-rose-200";

    case "compassionate_leave":
    case "bereavement_leave":
      return "bg-purple-200";

    case "jury_service":
      return "bg-indigo-200";

    case "maternity_leave":
    case "paternity_leave":
    case "parental_leave":
    case "adoption_leave":
    case "parents_leave":
      return "bg-pink-200";

    case "study_leave":
      return "bg-cyan-200";

    case "force_majeure":
      return "bg-yellow-200";

    case "suspension":
    case "garden_leave":
    case "other_unpaid":
      return "bg-slate-300";

    case "remote_working_abroad":
      return "bg-blue-200";

    default:
      return "bg-sky-200";
  }
}

export default function IrishHolidayPlanner() {
  const currentYear = new Date().getFullYear();
  const defaultCurrentDate = toISO(new Date());

  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState("viewer");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [employeeError, setEmployeeError] = useState("");
  const [employeeSuccess, setEmployeeSuccess] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  // Stores the outcome of the latest employee import operation
  const [employeeImportResult, setEmployeeImportResult] = useState({
    imported: 0,
    skipped: 0,
    errors: [],
  });
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [holidayWindowFilter, setHolidayWindowFilter] = useState(false);
  const [nameSort, setNameSort] = useState("az");
  const [activeView, setActiveView] = useState("planner");
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingLeaveTypeFilter, setBookingLeaveTypeFilter] = useState("all");
  const [bookingDateStatusFilter, setBookingDateStatusFilter] = useState("all");
  const [bookingPaidStatusFilter, setBookingPaidStatusFilter] = useState("all");
  const [editingBooking, setEditingBooking] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const { showToast } = useToast();

  const [year, setYear] = useState(currentYear);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newStaffNumber, setNewStaffNumber] = useState("");
  const [newDepartmentIds, setNewDepartmentIds] = useState([]);
  const [newEntitlement, setNewEntitlement] = useState(25);

  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [editingDepartmentId, setEditingDepartmentId] = useState(null);
  const [editingDepartmentName, setEditingDepartmentName] = useState("");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [holidayStart, setHolidayStart] = useState(defaultCurrentDate);
  const [holidayEnd, setHolidayEnd] = useState(defaultCurrentDate);
  const [dayAmount, setDayAmount] = useState(1);
  const [leaveCategory, setLeaveCategory] = useState("annual_leave");
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [holidayNotes, setHolidayNotes] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editStaffNumber, setEditStaffNumber] = useState("");
  const [editDepartmentId, setEditDepartmentId] = useState("");
  const [editDepartmentIds, setEditDepartmentIds] = useState([]);
  const [editEntitlement, setEditEntitlement] = useState(25);


  const bankHolidayMap = useMemo(() => getIrishBankHolidays(Number(year)), [year]);
  const yearDays = useMemo(() => getDaysInYear(Number(year)), [year]);
  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId) || employees[0];
  const editingEmployee = employees.find((employee) => employee.id === editingId);
  const isAdmin = userRole === "admin";
  const isManager = userRole === "manager";
  const canManagePeople = isAdmin || isManager;
  const canManageBookings = isAdmin || isManager;
  const canManageDepartments = isAdmin;

  // Keep users on an allowed page if their role changes after login
  useEffect(() => {
    if (activeView === "employees" && !canManagePeople) {
      setActiveView("planner");
    }

    if (activeView === "departments" && !canManageDepartments) {
      setActiveView("planner");
    }

    if (activeView === "bookings" && !canManageBookings) {
      setActiveView("planner");
    }
  }, [activeView, canManagePeople, canManageDepartments, canManageBookings]);

  // Active employees are used in planner, bookings and dashboard calculations
  const activeEmployees = employees.filter((employee) => employee.active !== false);

  // Inactive employees are hidden from normal planning but visible to admins/managers
  const inactiveEmployees = employees.filter((employee) => employee.active === false);

  // Employee search is limited to active employees in the main employee list
  const filteredActiveEmployees = activeEmployees.filter((employee) => {
    const searchText = `${employeeFullName(employee)} ${employee.staff_number || ""} ${employeeDepartmentNames(employee)}`.toLowerCase();

    return searchText.includes(employeeSearch.toLowerCase());
  });


  const visibleEmployees = useMemo(() => {
    return activeEmployees
      .filter((employee) => {
        // Department filter
        if (
          departmentFilter !== "all" &&
          !employeeHasDepartment(employee, departmentFilter)
        ) {
          return false;
        }

        // Upcoming holiday filter
        if (holidayWindowFilter) {
          const today = new Date();
          const future = addDays(today, 30);

          const hasUpcomingHoliday = employee.holidays.some((holiday) => {
            const holidayStart = fromISO(holiday.start);
            const holidayEnd = fromISO(holiday.end);

            return holidayStart <= future && holidayEnd >= today;
          });

          if (!hasUpcomingHoliday) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const nameA = employeeFullName(a).toLowerCase();
        const nameB = employeeFullName(b).toLowerCase();

        if (nameSort === "za") {
          return nameB.localeCompare(nameA);
        }

        return nameA.localeCompare(nameB);
      });
  }, [activeEmployees, departmentFilter, nameSort, holidayWindowFilter, departments]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      loadUserRole(session.user.id);
      loadDepartments();
      loadEmployees();
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel("planner-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "employees" }, loadEmployees)
      .on("postgres_changes", { event: "*", schema: "public", table: "holiday_bookings" }, loadEmployees)
      .on("postgres_changes", { event: "*", schema: "public", table: "departments" }, () => {
        loadDepartments();
        loadEmployees();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  function employeeFullName(employee) {
    const full = `${employee.first_name || ""} ${employee.last_name || ""}`.trim();
    return full || employee.name || "Unnamed Employee";
  }

  function departmentName(id) {
    return departments.find((d) => d.id === id)?.name || "No department";
  }

  function employeeDepartmentNames(employee) {
    // Show all departments assigned to an employee
    const departmentIds = employee.departmentIds?.length
      ? employee.departmentIds
      : employee.department_id
        ? [employee.department_id]
        : [];

    if (departmentIds.length === 0) return "No department";

    return departmentIds
      .map((id) => departmentName(id))
      .join(", ");
  }

  function employeeHasDepartment(employee, departmentId) {
    // Department filters should match any department assigned to the employee
    const departmentIds = employee.departmentIds?.length
      ? employee.departmentIds
      : employee.department_id
        ? [employee.department_id]
        : [];

    return departmentIds.includes(departmentId);
  }

  function departmentBadgeClass(departmentNameValue) {
    // Keep department colours consistent across the employee table
    const name = departmentNameValue.toLowerCase();

    if (name.includes("admin")) return "bg-purple-100 text-purple-800 ring-purple-200";
    if (name.includes("management")) return "bg-indigo-100 text-indigo-800 ring-indigo-200";
    if (name.includes("logistics")) return "bg-blue-100 text-blue-800 ring-blue-200";
    if (name.includes("goods")) return "bg-emerald-100 text-emerald-800 ring-emerald-200";
    if (name.includes("returns")) return "bg-orange-100 text-orange-800 ring-orange-200";
    if (name.includes("stock")) return "bg-amber-100 text-amber-800 ring-amber-200";
    if (name.includes("dispatch")) return "bg-cyan-100 text-cyan-800 ring-cyan-200";
    if (name.includes("eir")) return "bg-pink-100 text-pink-800 ring-pink-200";

    return "bg-slate-100 text-slate-700 ring-slate-200";
  }

  function DepartmentBadges({ employee }) {
    // Display multiple departments as compact badges for easier scanning
    const departmentIds = employee.departmentIds?.length
      ? employee.departmentIds
      : employee.department_id
        ? [employee.department_id]
        : [];

    if (departmentIds.length === 0) {
      return <span className="text-xs text-slate-500">No department</span>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {departmentIds.map((id) => (
          <span
            key={id}
            className={`rounded-full px-2 py-1 text-xs font-medium ring-1 ${departmentBadgeClass(departmentName(id))}`}
          >
            {departmentName(id)}
          </span>
        ))}
      </div>
    );
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");

    const { error } = await login(loginEmail, loginPassword);

    if (error) setLoginError(error.message);
  }

  async function handleResetPassword() {
    setLoginError("");

    if (!loginEmail) {
      setLoginError("Please enter your email first.");
      return;
    }

    const { error } = await resetPassword(loginEmail);

    if (error) {
      setLoginError(error.message);
      return;
    }

    showToast("Password reset email sent. Please check your inbox.", "success");
  }

  async function handleSetNewPassword(e) {
    e.preventDefault();
    setLoginError("");

    if (!newPassword || !confirmNewPassword) {
      showToast("Please enter and confirm your new password.", "error");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showToast("New passwords do not match.", "error");
      return;
    }

    const { error } = await updatePassword(newPassword);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    showToast("Password updated successfully.", "success");

    setNewPassword("");
    setConfirmNewPassword("");
    setIsChangePasswordOpen(false);
  }

  async function loadUserRole(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("User role load error:", error);
      setUserRole("viewer");
      return;
    }

    setUserRole(data?.role || "viewer");
  }

  async function loadDepartments() {
    const { data, error } = await supabase
      .from("departments")
      .select("*")
      .eq("active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Departments load error:", error);
      return;
    }

    setDepartments(data || []);

    if (newDepartmentIds.length === 0 && data?.length > 0) {
      setNewDepartmentIds([data[0].id]);
    }
  }

  async function loadEmployees() {
    // Load all employees so active and inactive lists can be shown separately
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("last_name", { ascending: true });

    if (error) {
      console.error("Employees load error:", error);
      return;
    }

    const employeesWithHolidays = await Promise.all(
      (data || []).map(async (employee) => {
        const { data: holidays, error: holidayError } = await supabase
          .from("holiday_bookings")
          .select("*")
          .eq("employee_id", employee.id)
          .order("start_date", { ascending: true });

        if (holidayError) console.error("Holiday load error:", holidayError);

        const { data: employeeDepartments, error: employeeDepartmentsError } = await supabase
          .from("employee_departments")
          .select("department_id")
          .eq("employee_id", employee.id);

        if (employeeDepartmentsError) {
          console.error("Employee departments load error:", employeeDepartmentsError);
        }

        return {
          ...employee,
          active: employee.active !== false,

          // Employees can belong to multiple departments
          departmentIds: (employeeDepartments || []).map((item) => item.department_id),

          holidays: (holidays || []).map((h) => ({
            id: h.id,
            start: h.start_date,
            end: h.end_date,
            leaveCategory:
              h.leave_category === "standard_entitlement"
                ? "annual_leave"
                : h.exception_type || h.leave_category,
            exceptionType: h.exception_type,
            paymentStatus: h.payment_status,
            notes: h.notes,
            dayAmount: Number(h.day_amount || 1),
          })),
        };
      })
    );

    setEmployees(employeesWithHolidays);

    const activeEmployees = employeesWithHolidays.filter(
      (employee) => employee.active !== false
    );

    if (activeEmployees.length > 0) {
      setSelectedEmployeeId((current) => current || activeEmployees[0].id);
    }
  }


  const holidayDayMap = useMemo(() => {
    const map = new Map();

    employees.forEach((employee) => {
      employee.holidays.forEach((holiday) => {
        let d = fromISO(holiday.start);
        const end = fromISO(holiday.end);

        while (d <= end) {
          const iso = toISO(d);
          if (isWorkingDay(d, bankHolidayMap)) {
            if (!map.has(employee.id)) map.set(employee.id, new Map());
            map.get(employee.id).set(iso, holiday);
          }
          d = addDays(d, 1);
        }
      });
    });

    return map;
  }, [employees, bankHolidayMap]);

  function usedDays(employee) {
    return employee.holidays.reduce((sum, h) => sum + bookingDaysForEntitlement(h, bankHolidayMap), 0);
  }

  function exceptionDays(employee) {
    return employee.holidays.reduce((sum, h) => sum + (isStandardBooking(h) ? 0 : bookingTotalWorkingDays(h, bankHolidayMap)), 0);
  }

  function leaveTypeDays(employee, leaveType, bankHolidayMap) {
    return employee.holidays.reduce((sum, holiday) => {
      if (holiday.leaveCategory !== leaveType) return sum;

      return (
        sum +
        bookingTotalWorkingDays(
          holiday,
          bankHolidayMap
        )
      );
    }, 0);
  }

  async function addDepartment() {
    // Only admins can create or restore departments.
    if (!isAdmin) return;

    const name = newDepartmentName.trim();

    if (!name) {
      showToast("Department name is required.", "error");
      return;
    }

    const activeDuplicate = departments.some(
      (department) => department.name.trim().toLowerCase() === name.toLowerCase()
    );

    if (activeDuplicate) {
      showToast("A department with this name already exists.", "error");
      return;
    }

    const { data: existingDepartments, error: lookupError } = await supabase
      .from("departments")
      .select("id, name, active")
      .ilike("name", name)
      .limit(1);

    if (lookupError) {
      showToast("Unable to check department name. Please try again.", "error");
      return;
    }

    const existingDepartment = existingDepartments?.[0];

    if (existingDepartment && existingDepartment.active === false) {
      const { error } = await supabase
        .from("departments")
        .update({ active: true, name })
        .eq("id", existingDepartment.id);

      if (error) {
        showToast("Unable to restore this department. Please try again.", "error");
        return;
      }

      setNewDepartmentName("");
      showToast(`Department "${name}" has been restored successfully.`, "success");
      await loadDepartments();
      return;
    }

    const { error } = await supabase.from("departments").insert({ name });

    if (error) {
      showToast("A department with this name already exists.", "error");
      return;
    }

    setNewDepartmentName("");
    showToast(`Department "${name}" has been added successfully.`, "success");
    await loadDepartments();
  }

  function startEditDepartment(department) {
    setEditingDepartmentId(department.id);
    setEditingDepartmentName(department.name);
  }

  async function saveDepartmentEdit(id) {
    if (!isAdmin) return;

    const name = editingDepartmentName.trim();

    if (!name) {
      showToast("Department name is required.", "error");
      return;
    }

    const duplicateDepartment = departments.some(
      (department) =>
        department.id !== id &&
        department.name.trim().toLowerCase() === name.toLowerCase()
    );

    if (duplicateDepartment) {
      showToast("Another active department already has this name.", "error");
      return;
    }

    const { error } = await supabase
      .from("departments")
      .update({ name })
      .eq("id", id);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    showToast(`Department "${name}" has been updated successfully.`, "success");

    setEditingDepartmentId(null);
    setEditingDepartmentName("");

    await loadDepartments();
  }

  function requestDeleteDepartment(department) {
    // Ask for confirmation before removing a department from active use
    setConfirmAction({
      title: "Remove Department",
      message: `Are you sure you want to remove ${department.name}? Existing employee history will remain unchanged.`,
      confirmText: "Remove",
      onConfirm: () => deleteDepartment(department.id),
    });
  }

  async function deleteDepartment(id) {
    // Departments are soft deleted so historical employee records remain valid
    if (!isAdmin) return;
    const { error } = await supabase
      .from("departments")
      .update({ active: false })
      .eq("id", id);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    const department = departments.find((item) => item.id === id);

    showToast(
      `Department "${department?.name || "Department"}" has been removed successfully.`,
      "success"
    );

    await loadDepartments();
  }

  async function downloadEmployeeImportTemplate() {
    // Provide a standard import template so employee data matches required fields
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Employees");

    worksheet.columns = [
      { header: "First Name", key: "firstName", width: 20 },
      { header: "Last Name", key: "lastName", width: 20 },
      { header: "Staff Number", key: "staffNumber", width: 15 },
      { header: "Department", key: "department", width: 25 },
      { header: "Entitlement", key: "entitlement", width: 15 },
    ];

    // Example row showing how to assign multiple departments
    worksheet.addRow({
      firstName: "John",
      lastName: "Smith",
      staffNumber: "1001",
      department: "Logistics, Returns",
      entitlement: 25,
    });

    worksheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "employee-import-template.xlsx";
    link.click();

    window.URL.revokeObjectURL(url);
  }

  async function importEmployeesFromExcel(event) {
    // Import valid employees only; invalid rows are skipped and reported to the user
    if (!canManagePeople) return;

    const file = event.target.files?.[0];
    if (!file) return;

    setEmployeeImportResult({
      imported: 0,
      skipped: 0,
      errors: [],
    });

    try {
      const workbook = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();

      await workbook.xlsx.load(buffer);

      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        setEmployeeImportResult({
          imported: 0,
          skipped: 0,
          errors: ["Import failed: no worksheet found."],
        });
        event.target.value = "";
        return;
      }

      const headers = {};

      worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers[String(cell.text).trim().toLowerCase()] = colNumber;
      });

      const requiredHeaders = [
        "first name",
        "last name",
        "staff number",
        "department",
        "entitlement",
      ];

      const missingHeaders = requiredHeaders.filter((header) => !headers[header]);

      if (missingHeaders.length > 0) {
        setEmployeeImportResult({
          imported: 0,
          skipped: 0,
          errors: [`Import failed: missing columns - ${missingHeaders.join(", ")}.`],
        });
        event.target.value = "";
        return;
      }

      const existingStaffNumbers = new Set(
        employees
          .map((employee) => String(employee.staff_number || "").trim())
          .filter(Boolean)
      );

      const fileStaffNumbers = new Set();

      const departmentByName = new Map(
        departments.map((department) => [
          department.name.trim().toLowerCase(),
          department.id,
        ])
      );

      const rowsToInsert = [];
      const skippedRows = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const firstName = String(row.getCell(headers["first name"]).text || "").trim();
        const lastName = String(row.getCell(headers["last name"]).text || "").trim();
        const staffNumber = String(row.getCell(headers["staff number"]).text || "").trim();
        const departmentCell = String(row.getCell(headers["department"]).text || "").trim();
        const entitlementRaw = String(row.getCell(headers["entitlement"]).text || "").trim();
        const entitlementValue = Number(entitlementRaw);

        const departmentNames = departmentCell
          .split(",")
          .map((department) => department.trim())
          .filter(Boolean);

        if (!firstName || !lastName || !staffNumber || departmentNames.length === 0 || !entitlementRaw) {
          skippedRows.push(`Row ${rowNumber}: missing required field.`);
          return;
        }

        if (!/^[0-9]{1,10}$/.test(staffNumber)) {
          skippedRows.push(`Row ${rowNumber}: staff number must be up to 10 digits.`);
          return;
        }

        if (existingStaffNumbers.has(staffNumber)) {
          skippedRows.push(`Row ${rowNumber}: staff number already exists.`);
          return;
        }

        if (fileStaffNumbers.has(staffNumber)) {
          skippedRows.push(`Row ${rowNumber}: duplicate staff number in import file.`);
          return;
        }

        if (!Number.isFinite(entitlementValue) || entitlementValue < 0) {
          skippedRows.push(`Row ${rowNumber}: entitlement must be a valid number.`);
          return;
        }

        const departmentIds = [];

        for (const departmentName of departmentNames) {
          const departmentId = departmentByName.get(departmentName.toLowerCase());

          if (!departmentId) {
            skippedRows.push(`Row ${rowNumber}: department "${departmentName}" does not exist.`);
            return;
          }

          if (!departmentIds.includes(departmentId)) {
            departmentIds.push(departmentId);
          }
        }

        fileStaffNumbers.add(staffNumber);

        rowsToInsert.push({
          first_name: firstName,
          last_name: lastName,
          name: `${firstName} ${lastName}`.trim(),
          staff_number: staffNumber,

          // Keep first department on employees table during migration
          department_id: departmentIds[0],

          entitlement: entitlementValue,
          active: true,
          departmentIds,
        });
      });

      if (rowsToInsert.length === 0) {
        setEmployeeImportResult({
          imported: 0,
          skipped: skippedRows.length,
          errors: skippedRows,
        });
        event.target.value = "";
        return;
      }

      const employeeRowsToInsert = rowsToInsert.map(({ departmentIds, ...employee }) => employee);

      const { data: insertedEmployees, error } = await supabase
        .from("employees")
        .insert(employeeRowsToInsert)
        .select("id, staff_number");

      if (error) {
        setEmployeeImportResult({
          imported: 0,
          skipped: rowsToInsert.length + skippedRows.length,
          errors: [`Import failed: ${error.message}`],
        });
        event.target.value = "";
        return;
      }

      const insertedEmployeeByStaffNumber = new Map(
        (insertedEmployees || []).map((employee) => [
          String(employee.staff_number),
          employee.id,
        ])
      );

      const departmentLinks = rowsToInsert.flatMap((employee) => {
        const employeeId = insertedEmployeeByStaffNumber.get(String(employee.staff_number));

        if (!employeeId) return [];

        return employee.departmentIds.map((departmentId) => ({
          employee_id: employeeId,
          department_id: departmentId,
        }));
      });

      if (departmentLinks.length > 0) {
        // Create one department assignment row per imported department
        const { error: departmentLinkError } = await supabase
          .from("employee_departments")
          .insert(departmentLinks);

        if (departmentLinkError) {
          setEmployeeImportResult({
            imported: insertedEmployees?.length || 0,
            skipped: skippedRows.length,
            errors: [`Department link import failed: ${departmentLinkError.message}`],
          });
          event.target.value = "";
          return;
        }
      }

      await loadEmployees();

      setEmployeeImportResult({
        imported: insertedEmployees?.length || 0,
        skipped: skippedRows.length,
        errors: skippedRows,
      });

      event.target.value = "";
    } catch (error) {
      setEmployeeImportResult({
        imported: 0,
        skipped: 0,
        errors: [`Import failed: ${error.message}`],
      });

      event.target.value = "";
    }
  }


  async function addEmployee() {
    // Admins and managers can create employee records
    if (!canManagePeople) return;
    const firstName = newFirstName.trim();
    const lastName = newLastName.trim();
    const staffNumber = newStaffNumber.trim();

    if (!firstName || !lastName || !staffNumber || newDepartmentIds.length === 0) {
      setEmployeeError("First name, last name, staff number and department are required.");
      return;
    }

    setEmployeeError("");
    setEmployeeSuccess("");

    if (staffNumber && !/^[0-9]{1,10}$/.test(staffNumber)) {
      alert("Staff number must be up to 10 digits only.");
      return;
    }

    const fullName = `${firstName} ${lastName}`.trim();

    const { data: insertedEmployees, error } = await supabase
      .from("employees")
      .insert({
        first_name: firstName,
        last_name: lastName,
        name: fullName,
        staff_number: staffNumber || null,

        // Keep primary department for backwards compatibility during migration
        department_id: newDepartmentIds[0] || null,

        entitlement: Number(newEntitlement) || 0,
        active: true,
      })
      .select("id");

    if (error) {
      showToast(error.message, "error");
      return;
    }

    const insertedEmployeeId = insertedEmployees?.[0]?.id;

    if (insertedEmployeeId) {
      // Store all department assignments in the join table
      const { error: departmentLinkError } = await supabase
        .from("employee_departments")
        .insert(
          newDepartmentIds.map((departmentId) => ({
            employee_id: insertedEmployeeId,
            department_id: departmentId,
          }))
        );

      if (departmentLinkError) {
        alert(departmentLinkError.message);
        return;
      }
    }

    setNewFirstName("");
    setNewLastName("");
    setNewStaffNumber("");
    setNewDepartmentIds(departments[0]?.id ? [departments[0].id] : []);
    setNewEntitlement(25);
    showToast(`${fullName} has been added successfully.`, "success");
    await loadEmployees();
  }

  function requestDeactivateEmployee(employee) {
    // Ask for confirmation before hiding an employee from active views
    setConfirmAction({
      title: "Deactivate Employee",
      message: `Are you sure you want to deactivate ${employeeFullName(employee)}? They will move to the inactive employees list.`,
      confirmText: "Deactivate",
      onConfirm: () => deactivateEmployee(employee.id),
    });
  }

  async function deactivateEmployee(id) {
    // Managers deactivate employees instead of deleting historical records
    if (!canManagePeople) return;
    const { error } = await supabase
      .from("employees")
      .update({ active: false })
      .eq("id", id);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    const employee = employees.find((item) => item.id === id);

    if (selectedEmployeeId === id) setSelectedEmployeeId("");

    showToast(`${employee ? employeeFullName(employee) : "Employee"} has been deactivated.`, "success");
    await loadEmployees();
  }

  function requestReactivateEmployee(employee) {
    // Ask for confirmation before returning an employee to active views
    setConfirmAction({
      title: "Reactivate Employee",
      message: `Are you sure you want to reactivate ${employeeFullName(employee)}? They will appear in active employee lists again.`,
      confirmText: "Reactivate",
      confirmVariant: "primary",
      onConfirm: () => reactivateEmployee(employee.id),
    });
  }

  async function reactivateEmployee(id) {
    // Admins and managers can restore inactive employees when they return
    if (!canManagePeople) return;

    const { error } = await supabase
      .from("employees")
      .update({ active: true })
      .eq("id", id);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    const employee = employees.find((item) => item.id === id);

    showToast(`${employee ? employeeFullName(employee) : "Employee"} has been reactivated.`, "success");
    await loadEmployees();
  }

  function requestDeleteEmployee(employee) {
    // Ask for confirmation before permanently deleting an employee
    setConfirmAction({
      title: "Delete Employee",
      message: `Are you sure you want to permanently delete ${employeeFullName(employee)}? This cannot be undone.`,
      confirmText: "Delete",
      onConfirm: () => deleteEmployee(employee.id),
    });
  }

  async function deleteEmployee(id) {
    // Permanent deletion is restricted to admins
    if (!isAdmin) return;
    const { error } = await supabase.from("employees").delete().eq("id", id);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    const employee = employees.find((item) => item.id === id);

    if (selectedEmployeeId === id) setSelectedEmployeeId("");

    showToast(`${employee ? employeeFullName(employee) : "Employee"} has been deleted.`, "success");
    await loadEmployees();
  }

  function startEdit(employee) {
    // Open employee edit mode with current details and department assignments
    setEditingId(employee.id);
    setEditFirstName(employee.first_name || "");
    setEditLastName(employee.last_name || "");
    setEditStaffNumber(employee.staff_number || "");
    setEditDepartmentId(employee.department_id || "");
    setEditDepartmentIds(
      employee.departmentIds?.length
        ? employee.departmentIds
        : employee.department_id
          ? [employee.department_id]
          : []
    );
    setEditEntitlement(employee.entitlement);
  }

  async function saveEdit(id) {
    // Admins and managers can update employee details and department assignments
    if (!canManagePeople) return;

    if (editStaffNumber && !/^[0-9]{1,10}$/.test(editStaffNumber)) {
      alert("Staff number must be up to 10 digits only.");
      return;
    }

    if (editDepartmentIds.length === 0) {
      alert("Please select at least one department.");
      return;
    }

    const duplicateStaffNumber = employees.some(
      (employee) =>
        employee.id !== id &&
        String(employee.staff_number || "").trim() === editStaffNumber.trim()
    );

    if (duplicateStaffNumber) {
      alert("Another employee already has this staff number.");
      return;
    }

    const firstName = editFirstName.trim();
    const lastName = editLastName.trim();

    const { error } = await supabase
      .from("employees")
      .update({
        first_name: firstName,
        last_name: lastName,
        name: `${firstName} ${lastName}`.trim(),
        staff_number: editStaffNumber.trim() || null,

        // Keep primary department for backwards compatibility during migration
        department_id: editDepartmentIds[0] || null,

        entitlement: Number(editEntitlement) || 0,
      })
      .eq("id", id);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    const { error: deleteDepartmentLinksError } = await supabase
      .from("employee_departments")
      .delete()
      .eq("employee_id", id);

    if (deleteDepartmentLinksError) {
      alert(deleteDepartmentLinksError.message);
      return;
    }

    const { error: insertDepartmentLinksError } = await supabase
      .from("employee_departments")
      .insert(
        editDepartmentIds.map((departmentId) => ({
          employee_id: id,
          department_id: departmentId,
        }))
      );

    if (insertDepartmentLinksError) {
      alert(insertDepartmentLinksError.message);
      return;
    }

    showToast(`${firstName} ${lastName} has been updated successfully.`, "success");
    setEditingId(null);
    await loadEmployees();
  }

  /**
 * Determines whether the proposed booking overlaps an existing booking
 * for the same employee.
 *
 * When editing an existing booking, that booking is ignored so users
 * can update it without triggering a false positive.
 */
  function hasOverlappingBooking(
    employee,
    startDate,
    endDate,
    bookingIdToIgnore = null
  ) {
    if (!employee) return false;

    const proposedStart = fromISO(startDate);
    const proposedEnd = fromISO(endDate);

    return employee.holidays.some((holiday) => {
      if (holiday.id === bookingIdToIgnore) {
        return false;
      }

      const existingStart = fromISO(holiday.start);
      const existingEnd = fromISO(holiday.end);

      return proposedStart <= existingEnd && proposedEnd >= existingStart;
    });
  }

  function resetHolidayPickerToCurrentMonth() {
    const current = toISO(new Date());
    setHolidayStart(current);
    setHolidayEnd(current);
    setDayAmount(1);
    setLeaveCategory("annual_leave");
    setPaymentStatus("paid");
    setHolidayNotes("");
  }

  async function addHoliday() {
    // Viewers can see the planner but cannot create bookings
    if (!canManageBookings) return;
    if (!selectedEmployee || !holidayStart || !holidayEnd) return;

    if (fromISO(holidayEnd) < fromISO(holidayStart)) {
      showToast("End date cannot be before start date.", "error");
      return;
    }

    if (hasOverlappingBooking(selectedEmployee, holidayStart, holidayEnd)) {
      showToast(
        "This employee already has a booking that overlaps these dates. Please choose different dates.",
        "error"
      );
      return;
    }

    const { error } = await supabase.from("holiday_bookings").insert({
      employee_id: selectedEmployee.id,
      start_date: holidayStart,
      end_date: holidayEnd,
      day_amount: dayAmount,
      leave_category: leaveCategory,
      exception_type: null,
      payment_status: paymentStatus,
      notes: holidayNotes.trim(),
    });

    if (error) {
      showToast(error.message, "error");
      return;
    }

    showToast("Holiday booking added successfully.", "success");

    resetHolidayPickerToCurrentMonth();
    await loadEmployees();
  }

  async function updateHoliday() {
    // Admins and managers can edit bookings, including past bookings
    if (!canManageBookings) return;
    if (!editingBooking) return;

    const employeeBeingEdited = employees.find(
      (employee) => employee.id === editingBooking.employeeId
    );

    if (fromISO(holidayEnd) < fromISO(holidayStart)) {
      showToast("End date cannot be before start date.", "error");
      return;
    }

    if (
      hasOverlappingBooking(
        employeeBeingEdited,
        holidayStart,
        holidayEnd,
        editingBooking.bookingId
      )
    ) {
      showToast(
        "This employee already has a booking that overlaps these dates. Please choose different dates.",
        "error"
      );
      return;
    }

    const { error } = await supabase
      .from("holiday_bookings")
      .update({
        start_date: holidayStart,
        end_date: holidayEnd,
        leave_category: leaveCategory,
        payment_status: paymentStatus,
        notes: holidayNotes,
        day_amount: dayAmount,
      })
      .eq("id", editingBooking.bookingId);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    showToast("Holiday booking updated successfully.", "success");

    setEditingBooking(null);

    await loadEmployees();
  }

  async function deleteHoliday(employeeId, holidayId) {
    // Booking deletion is restricted to admins and managers
    if (!canManageBookings) return;
    const { error } = await supabase.from("holiday_bookings").delete().eq("id", holidayId);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    showToast("Holiday booking deleted successfully.", "success");

    await loadEmployees();
  }

  function requestDeleteHoliday(employee, holiday) {
    // Reuse the shared confirmation flow so all destructive actions behave consistently.
    setConfirmAction({
      title: "Delete Booking",
      message: `Are you sure you want to delete this ${bookingTypeLabel(holiday)} booking for ${employeeFullName(employee)} from ${holiday.start} to ${holiday.end}? This cannot be undone.`,
      confirmText: "Delete",
      onConfirm: () => deleteHoliday(employee.id, holiday.id),
    });
  }

  async function exportBookingsToExcel() {
    // Build an Excel workbook in the browser for booking reporting
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Bookings");

    worksheet.columns = [
      { header: "Employee", key: "employee", width: 25 },
      { header: "Staff Number", key: "staffNumber", width: 15 },
      { header: "Department", key: "department", width: 20 },
      { header: "Leave Type", key: "leaveType", width: 25 },
      { header: "Start", key: "start", width: 15 },
      { header: "End", key: "end", width: 15 },
      { header: "Days", key: "days", width: 10 },
      { header: "Paid", key: "paid", width: 12 },
      { header: "Notes", key: "notes", width: 35 },
    ];

    employees.forEach((employee) => {
      employee.holidays.forEach((holiday) => {
        worksheet.addRow({
          employee: employeeFullName(employee),
          staffNumber: employee.staff_number || "",
          department: employeeDepartmentNames(employee),
          leaveType: bookingTypeLabel(holiday),
          start: holiday.start,
          end: holiday.end,
          days: bookingTotalWorkingDays(holiday, bankHolidayMap),
          paid: paymentStatusLabel(holiday),
          notes: holiday.notes || "",
        });
      });
    });

    worksheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `holiday-bookings-${year}.xlsx`;
    link.click();

    window.URL.revokeObjectURL(url);
  }


  function startEditBooking(employee, holiday) {
    setSelectedEmployeeId(employee.id);

    setHolidayStart(holiday.start);
    setHolidayEnd(holiday.end);

    setLeaveCategory(holiday.leaveCategory);

    setPaymentStatus(
      holiday.paymentStatus || "paid"
    );

    setHolidayNotes(
      holiday.notes || ""
    );

    setDayAmount(
      holiday.dayAmount || 1
    );

    setEditingBooking({
      employeeId: employee.id,
      bookingId: holiday.id,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonth = new Date().getMonth();
  const todayISO = toISO(new Date());


  const totalEmployees = activeEmployees.length;

  const currentlyOnLeave = employees.filter((employee) =>
    employee.holidays.some((holiday) => {
      return holiday.start <= todayISO && holiday.end >= todayISO;
    })
  ).length;

  const currentlyOnSickLeave = employees.filter((employee) =>
    employee.holidays.some((holiday) => {
      return (
        holiday.start <= todayISO &&
        holiday.end >= todayISO &&
        (
          holiday.leaveCategory === "sickness_certified" ||
          holiday.leaveCategory === "sickness_uncertified" ||
          holiday.leaveCategory === "statutory_sick_leave"
        )
      );
    })
  ).length;

  const next30Days = addDays(new Date(), 30);
  const next30DaysISO = toISO(next30Days);

  const upcomingBookings30Days = employees.reduce((sum, employee) => {
    return (
      sum +
      employee.holidays.filter((holiday) => {
        return holiday.start <= next30DaysISO && holiday.end >= todayISO;
      }).length
    );
  }, 0);

  const annualLeaveDaysBooked = employees.reduce((sum, employee) => {
    return (
      sum +
      employee.holidays.reduce((holidaySum, holiday) => {
        if (holiday.leaveCategory !== "annual_leave") return holidaySum;
        return holidaySum + bookingTotalWorkingDays(holiday, bankHolidayMap);
      }, 0)
    );
  }, 0);

  function scrollCalendarToToday() {
    const el = document.getElementById("calendar-scroll-container");
    if (!el) return;

    const today = new Date();
    const startOfYear = new Date(Number(year), 0, 1);
    const dayIndex = Math.floor((today - startOfYear) / (24 * 60 * 60 * 1000));

    const approxColumnWidth = 35;
    const staticColumnsWidth = 368;

    el.scrollLeft = Math.max(
      0,
      (dayIndex * approxColumnWidth) + 370
    );
  }

  return (
    <AuthGate
      session={session}
      authFallback={
        <AuthPage
          loginEmail={loginEmail}
          loginPassword={loginPassword}
          loginError={loginError}
          setLoginEmail={setLoginEmail}
          setLoginPassword={setLoginPassword}
          handleLogin={handleLogin}
          handleResetPassword={handleResetPassword}
        />
      }
    >
      <div className="min-h-screen bg-slate-50 p-4 text-slate-900">
        <div className="mx-auto max-w-[1600px] space-y-4">
          <div className="flex flex-wrap gap-2 rounded-2xl bg-white p-3 shadow-sm">
            <Button
              variant={activeView === "planner" ? "primary" : "outline"}
              onClick={() => setActiveView("planner")}
            >
              Planner
            </Button>

            {canManagePeople && (
              <Button
                variant={activeView === "employees" ? "primary" : "outline"}
                onClick={() => setActiveView("employees")}
              >
                Employees
              </Button>
            )}

            {canManageDepartments && (
              <Button
                variant={activeView === "departments" ? "primary" : "outline"}
                onClick={() => setActiveView("departments")}
              >
                Departments
              </Button>
            )}

            {canManageBookings && (
              <Button
                variant={activeView === "bookings" ? "primary" : "outline"}
                onClick={() => setActiveView("bookings")}
              >
                Bookings
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Irish Employee Holiday Planner</h1>
              <p className="text-sm text-slate-600">Shared planner with entitlement holidays, exceptions, paid/unpaid status and remaining balance.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">

              <ProfileMenu
                email={session?.user?.email}
                isProfileMenuOpen={isProfileMenuOpen}
                setIsProfileMenuOpen={setIsProfileMenuOpen}
                isChangePasswordOpen={isChangePasswordOpen}
                setIsChangePasswordOpen={setIsChangePasswordOpen}
                newPassword={newPassword}
                confirmNewPassword={confirmNewPassword}
                setNewPassword={setNewPassword}
                setConfirmNewPassword={setConfirmNewPassword}
                onChangePasswordSubmit={handleSetNewPassword}
                onLogout={async () => {
                  setIsProfileMenuOpen(false);
                  await supabase.auth.signOut();
                }}
              />

              <Icon label="calendar" />

              <label className="text-sm font-medium">
                Year
              </label>

              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-28 rounded-xl border px-3 py-2 text-sm"
              />
            </div>
          </div>
          {activeView === "employees" && (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center gap-2">
                    <Icon label="users" />
                    <h2 className="font-semibold">Employees</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="First name" value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" />
                    <input placeholder="Last name" value={newLastName} onChange={(e) => setNewLastName(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" />
                    <input placeholder="Staff no. max 10 digits" value={newStaffNumber} onChange={(e) => setNewStaffNumber(e.target.value.replace(/\D/g, "").slice(0, 10))} className="rounded-xl border px-3 py-2 text-sm" />
                    <input type="number" value={newEntitlement} onChange={(e) => setNewEntitlement(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" />
                  </div>

                  <div className="rounded-xl border p-3">
                    <p className="mb-2 text-sm font-medium">Departments</p>

                    <div className="grid gap-2 md:grid-cols-3">
                      {departments.map((department) => (
                        <label key={department.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={newDepartmentIds.includes(department.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewDepartmentIds([...newDepartmentIds, department.id]);
                              } else {
                                setNewDepartmentIds(
                                  newDepartmentIds.filter((id) => id !== department.id)
                                );
                              }
                            }}
                          />
                          {department.name}
                        </label>
                      ))}
                    </div>
                  </div>
                  {employeeError && (
                    <p className="text-sm text-red-600">
                      {employeeError}
                    </p>
                  )}
                  {employeeSuccess && (
                    <p className="text-sm text-emerald-600">
                      {employeeSuccess}
                    </p>
                  )}

                  <Button onClick={addEmployee} className="w-full"><Icon label="plus" /> Add employee</Button>

                  <div className="rounded-xl border bg-slate-50 p-3">
                    <label className="mb-2 block text-sm font-medium">
                      Import employees from Excel
                    </label>
                    <Button variant="outline" onClick={downloadEmployeeImportTemplate} className="mb-2">
                      Download template
                    </Button>

                    <input
                      type="file"
                      accept=".xlsx"
                      onChange={importEmployeesFromExcel}
                      className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
                    />

                    {(employeeImportResult.imported > 0 ||
                      employeeImportResult.skipped > 0) && (
                        <div className="mt-3 rounded-xl border bg-white p-4 shadow-sm">
                          <h3 className="mb-3 font-semibold">
                            Employee Import Results
                          </h3>

                          <div className="mb-4 grid grid-cols-2 gap-3">
                            <div className="rounded-lg bg-emerald-50 p-3">
                              <div className="text-xs uppercase text-emerald-700">
                                Imported
                              </div>

                              <div className="text-2xl font-bold text-emerald-700">
                                {employeeImportResult.imported}
                              </div>
                            </div>

                            <div className="rounded-lg bg-amber-50 p-3">
                              <div className="text-xs uppercase text-amber-700">
                                Skipped
                              </div>

                              <div className="text-2xl font-bold text-amber-700">
                                {employeeImportResult.skipped}
                              </div>
                            </div>
                          </div>

                          {employeeImportResult.errors.length > 0 && (
                            <>
                              <h4 className="mb-2 font-medium text-red-600">
                                Issues Found
                              </h4>

                              <div className="max-h-56 overflow-y-auto rounded-lg border bg-slate-50 p-3">
                                {employeeImportResult.errors.map((error, index) => (
                                  <div
                                    key={index}
                                    className="mb-2 text-sm text-slate-700"
                                  >
                                    • {error}
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                  </div>
                  <input
                    type="text"
                    placeholder="Search employees by name, staff number or department..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                  />

                  <div className="overflow-auto rounded-xl border">
                    <table className="min-w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b bg-slate-100">
                          <th className="p-2 text-left">Employee</th>
                          <th className="p-2 text-left">Department</th>
                          <th className="w-16 p-2 text-center">Ent.</th>
                          <th className="w-16 p-2 text-center">Used</th>
                          <th className="w-16 p-2 text-center">Remain</th>
                          <th className="w-20 p-2 text-center">Exceptions</th>
                          <th className="w-16 p-2 text-center">Sick</th>
                          <th className="p-2 text-center">Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredActiveEmployees.map((employee) => {
                          const standardUsed = usedDays(employee);
                          const exceptions = exceptionDays(employee);
                          const remaining = employee.entitlement - standardUsed;
                          const isSelected = selectedEmployeeId === employee.id;
                          const sickDays =
                            leaveTypeDays(employee, "sickness_certified", bankHolidayMap) +
                            leaveTypeDays(employee, "sickness_uncertified", bankHolidayMap) +
                            leaveTypeDays(employee, "statutory_sick_leave", bankHolidayMap);

                          return (
                            <React.Fragment key={employee.id}>
                              <tr className={`border-b ${isSelected ? "bg-slate-100" : "bg-white"}`}>
                                <td className="p-2">
                                  <button onClick={() => setSelectedEmployeeId(employee.id)} className="text-left">
                                    <p className="font-semibold">{employeeFullName(employee)}</p>
                                    <p className="text-xs text-slate-500">
                                      Staff No: {employee.staff_number || "-"}
                                    </p>
                                  </button>
                                </td>

                                <td className="p-2">
                                  <DepartmentBadges employee={employee} />
                                </td>
                                <td className="w-16 p-2 text-center">{employee.entitlement}</td>
                                <td className="w-16 p-2 text-center">{standardUsed}</td>
                                <td className={`w-16 p-2 text-center font-semibold ${remaining < 0 ? "text-red-600" : ""}`}>
                                  {remaining}
                                </td>
                                <td className="w-20 p-2 text-center">{exceptions}</td>
                                <td className="w-16 p-2 text-center">{sickDays}</td>

                                <td className="p-2 text-center">
                                  <div className="flex justify-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => startEdit(employee)}
                                    >
                                      <Icon label="pencil" /> Edit
                                    </Button>

                                    {/* Both admins and managers can deactivate employees */}
                                    <Button
                                      size="sm"
                                      variant="danger"
                                      onClick={() => requestDeactivateEmployee(employee)}
                                    >
                                      Deactivate
                                    </Button>

                                    {/* Permanent deletion remains admin-only */}
                                    {isAdmin && (
                                      <Button
                                        size="sm"
                                        variant="danger"
                                        onClick={() => requestDeleteEmployee(employee)}
                                      >
                                        <Icon label="trash" /> Delete
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>


                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {canManagePeople && inactiveEmployees.length > 0 && (
                    <div className="mt-6 space-y-2">
                      <h3 className="font-semibold text-slate-700">Inactive Employees</h3>

                      {inactiveEmployees.map((employee) => (
                        <div key={employee.id} className="flex items-center justify-between rounded-xl border bg-slate-50 p-3 text-sm">
                          <div>
                            <p className="font-semibold text-slate-700">{employeeFullName(employee)}</p>
                            <p className="text-xs text-slate-500">
                              Staff No: {employee.staff_number || "-"} | Dept: {employeeDepartmentNames(employee)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-700">
                              Inactive
                            </span>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => requestReactivateEmployee(employee)}
                            >
                              Reactivate
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </CardContent>
              </Card>
            </div>
          )}

          {activeView === "departments" && (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-3 p-4">
                  <h2 className="font-semibold">Departments Admin</h2>
                  <div className="flex gap-2">
                    <input placeholder="New department" value={newDepartmentName} onChange={(e) => setNewDepartmentName(e.target.value)} className="flex-1 rounded-xl border px-3 py-2 text-sm" />
                    <Button onClick={addDepartment}>Add</Button>
                  </div>
                  <div className="space-y-1">
                    {departments.map((d) => (
                      <div key={d.id} className="flex items-center justify-between gap-2 rounded-xl border p-2 text-sm">
                        {editingDepartmentId === d.id ? (
                          <>
                            <input
                              value={editingDepartmentName}
                              onChange={(e) => setEditingDepartmentName(e.target.value)}
                              className="flex-1 rounded-xl border px-3 py-2 text-sm"
                              autoFocus
                            />

                            <Button size="sm" onClick={() => saveDepartmentEdit(d.id)}>
                              Save
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingDepartmentId(null);
                                setEditingDepartmentName("");
                              }}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1">{d.name}</span>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditDepartment(d)}
                            >
                              Edit
                            </Button>

                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => requestDeleteDepartment(d)}
                            >
                              Remove
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeView === "bookings" && (
            <div className="space-y-4">

              <Card>
                <CardContent className="space-y-3 p-4">
                  <h2 className="font-semibold">Add leave / holiday</h2>

                  <select value={selectedEmployeeId || ""} onChange={(e) => setSelectedEmployeeId(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm">
                    {employees.map((e) => <option key={e.id} value={e.id}>{employeeFullName(e)}</option>)}
                  </select>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-slate-600">Start</label>
                      <input type="date" value={holidayStart} onChange={(e) => setHolidayStart(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600">End</label>
                      <input type="date" value={holidayEnd} onChange={(e) => setHolidayEnd(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600">Amount</label>
                      <select value={dayAmount} onChange={(e) => setDayAmount(Number(e.target.value))} className="w-full rounded-xl border px-3 py-2 text-sm">
                        <option value={1}>Full day</option>
                        <option value={0.5}>Half day</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-600">Leave category</label>
                    <select
                      value={leaveCategory}
                      onChange={(e) => setLeaveCategory(e.target.value)}
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                    >
                      {LEAVE_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-600">Paid status</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                    >
                      <option value="paid">Paid</option>
                      <option value="unpaid">Unpaid</option>
                    </select>
                  </div>

                  <textarea value={holidayNotes} onChange={(e) => setHolidayNotes(e.target.value)} className="min-h-[70px] w-full rounded-xl border px-3 py-2 text-sm" placeholder="Optional note" />
                  <Button
                    onClick={editingBooking ? updateHoliday : addHoliday}
                    className="w-full"
                    disabled={!selectedEmployee}
                  >
                    {editingBooking ? "Update booking" : "Add booking"}
                  </Button>

                  {editingBooking && (
                    <Button
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => {
                        setEditingBooking(null);
                      }}
                    >
                      Cancel edit
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <h2 className="font-semibold">All Bookings</h2>

                    <Button variant="outline" onClick={exportBookingsToExcel}>
                      Export to Excel
                    </Button>
                  </div>
                  <div className="mb-4 grid gap-2 md:grid-cols-[1fr_200px_200px_200px_200px]">
                    <input
                      type="text"
                      placeholder="Search employee..."
                      value={bookingSearch}
                      onChange={(e) => setBookingSearch(e.target.value)}
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                    />

                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                    >
                      <option value="all">All departments</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={bookingLeaveTypeFilter}
                      onChange={(e) => setBookingLeaveTypeFilter(e.target.value)}
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                    >
                      <option value="all">All leave types</option>

                      {LEAVE_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={bookingDateStatusFilter}
                      onChange={(e) => setBookingDateStatusFilter(e.target.value)}
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                    >
                      <option value="all">All dates</option>
                      <option value="current">Currently on leave</option>
                      <option value="future">Future bookings</option>
                      <option value="past">Past bookings</option>
                    </select>
                    <select
                      value={bookingPaidStatusFilter}
                      onChange={(e) => setBookingPaidStatusFilter(e.target.value)}
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                    >
                      <option value="all">All paid statuses</option>
                      <option value="paid">Paid</option>
                      <option value="unpaid">Unpaid</option>
                    </select>
                  </div>
                  <div className="overflow-auto">
                    <table className="min-w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b bg-slate-100">
                          <th className="p-2 text-left">Employee</th>
                          <th className="p-2 text-left">Department</th>
                          <th className="p-2 text-left">Start</th>
                          <th className="p-2 text-left">End</th>
                          <th className="p-2 text-center">Days</th>
                          <th className="p-2 text-left">Type</th>
                          <th className="p-2 text-left">Paid</th>
                          <th className="p-2 text-left">Notes</th>
                          <th className="p-2 text-center">Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {employees
                          .filter((employee) => {
                            const matchesSearch = employeeFullName(employee)
                              .toLowerCase()
                              .includes(bookingSearch.toLowerCase());

                            const matchesDepartment =
                              departmentFilter === "all" ||
                              employeeHasDepartment(employee, departmentFilter)

                            return matchesSearch && matchesDepartment;

                          })
                          .flatMap((employee) =>
                            employee.holidays
                              .filter((holiday) => {
                                const today = new Date();
                                const holidayStart = fromISO(holiday.start);
                                const holidayEnd = fromISO(holiday.end);

                                const matchesLeaveType =
                                  bookingLeaveTypeFilter === "all" ||
                                  holiday.leaveCategory === bookingLeaveTypeFilter;

                                const matchesDateStatus =
                                  bookingDateStatusFilter === "all" ||
                                  (bookingDateStatusFilter === "current" &&
                                    holidayStart <= today &&
                                    holidayEnd >= today) ||
                                  (bookingDateStatusFilter === "future" &&
                                    holidayStart > today) ||
                                  (bookingDateStatusFilter === "past" &&
                                    holidayEnd < today);

                                const matchesPaidStatus =
                                  bookingPaidStatusFilter === "all" ||
                                  holiday.paymentStatus === bookingPaidStatusFilter;

                                return matchesLeaveType && matchesDateStatus && matchesPaidStatus;
                              })
                              .map((holiday) => (
                                <tr key={holiday.id} className="border-b">
                                  <td className="p-2">
                                    {employeeFullName(employee)}
                                  </td>

                                  <td className="p-2">
                                    {employeeDepartmentNames(employee)}
                                  </td>

                                  <td className="p-2">
                                    {holiday.start}
                                  </td>

                                  <td className="p-2">
                                    {holiday.end}
                                  </td>

                                  <td className="p-2 text-center">
                                    {bookingTotalWorkingDays(
                                      holiday,
                                      bankHolidayMap
                                    )}
                                  </td>

                                  <td className="p-2">
                                    {bookingTypeLabel(holiday)}
                                  </td>

                                  <td className="p-2">
                                    {paymentStatusLabel(holiday)}
                                  </td>

                                  <td className="p-2">
                                    {holiday.notes || "-"}
                                  </td>

                                  <td className="p-2 text-center">
                                    <div className="flex justify-center gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => startEditBooking(employee, holiday)}
                                      >
                                        Edit
                                      </Button>

                                      <Button
                                        size="sm"
                                        variant="danger"
                                        onClick={() => requestDeleteHoliday(employee, holiday)}
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                          )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {activeView === "planner" && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500">Employees</p>
                    <p className="text-2xl font-bold">{totalEmployees}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500">Currently on Leave</p>
                    <p className="text-2xl font-bold">{currentlyOnLeave}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500">Currently Sick</p>
                    <p className="text-2xl font-bold">{currentlyOnSickLeave}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500">Bookings Next 30 Days</p>
                    <p className="text-2xl font-bold">{upcomingBookings30Days}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500">Annual Leave Days Booked</p>
                    <p className="text-2xl font-bold">{annualLeaveDaysBooked}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <div className="flex flex-wrap items-center gap-3 border-b p-4 text-sm">
                  <label className="font-medium">Department</label>

                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="rounded-xl border px-3 py-2 text-sm"
                  >
                    <option value="all">All departments</option>

                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>

                  <label className="font-medium">Sort</label>

                  <select
                    value={nameSort}
                    onChange={(e) => setNameSort(e.target.value)}
                    className="rounded-xl border px-3 py-2 text-sm"
                  >
                    <option value="az">Name A → Z</option>
                    <option value="za">Name Z → A</option>
                  </select>
                  <label className="flex items-center gap-2 font-medium">
                    <input
                      type="checkbox"
                      checked={holidayWindowFilter}
                      onChange={(e) => {
                        setHolidayWindowFilter(e.target.checked);

                        if (e.target.checked) {
                          setTimeout(scrollCalendarToToday, 50);
                        }
                      }}
                    />

                    Upcoming holidays (30 days)
                  </label>
                </div>
                <div className="flex flex-wrap gap-3 border-b p-4 text-xs">
                  <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Weekday</span>
                  <span className="rounded-full bg-slate-200 px-3 py-1">Weekend</span>
                  <span className="rounded-full bg-amber-200 px-3 py-1">Irish bank holiday</span>
                  <span className="rounded-full bg-emerald-200 px-3 py-1">Annual Leave</span>
                  <span className="rounded-full bg-red-200 px-3 py-1">Certified Sick</span>
                  <span className="rounded-full bg-orange-200 px-3 py-1">Uncertified Sick</span>
                  <span className="rounded-full bg-purple-200 px-3 py-1">Compassionate / Bereavement</span>
                  <span className="rounded-full bg-indigo-200 px-3 py-1">Jury Service</span>
                  <span className="rounded-full bg-pink-200 px-3 py-1">Family Leave</span>
                  <span className="rounded-full bg-sky-200 px-3 py-1">Other Leave</span>
                </div>

                <div id="calendar-scroll-container" className="overflow-auto" ref={(el) => {
                  if (el && !el.dataset.scrolled && !holidayWindowFilter) {
                    const approxColumnWidth = 34;
                    const staticColumnsWidth = 490;
                    el.scrollLeft = staticColumnsWidth + (currentMonth * 31 * approxColumnWidth);
                    el.dataset.scrolled = "true";
                  }
                }}>
                  <table className="min-w-full border-collapse text-xs">
                    <thead className="sticky top-0 z-10 bg-white shadow-sm">
                      <tr>
                        <th className="sticky left-0 z-20 min-w-[220px] bg-white p-2 text-left">Employee</th>
                        <th className="min-w-[90px] p-2 text-center">Staff No.</th>
                        <th className="min-w-[110px] p-2 text-center">Dept.</th>
                        <th className="min-w-[70px] p-2 text-center">Ent.</th>
                        <th className="min-w-[90px] p-2 text-center">Std Used</th>
                        <th className="min-w-[70px] p-2 text-center">Except.</th>
                        <th className="min-w-[80px] p-2 text-center">Remain</th>

                        {yearDays.map((date) => (
                          <th key={toISO(date)} className="min-w-[34px] border-l p-1 text-center font-medium">
                            <div>{date.getDate()}</div>
                            <div className="text-[10px] text-slate-500">{months[date.getMonth()]}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {visibleEmployees.map((employee) => {
                        const standardUsed = usedDays(employee);
                        const exceptions = exceptionDays(employee);
                        const remaining = employee.entitlement - standardUsed;
                        const employeeHolidayMap = holidayDayMap.get(employee.id) || new Map();

                        return (
                          <tr key={employee.id} className="border-t">
                            <td className="sticky left-0 z-10 bg-white p-2 font-semibold">{employeeFullName(employee)}</td>
                            <td className="p-2 text-center">{employee.staff_number || "-"}</td>
                            <td className="p-2 text-center">{employeeDepartmentNames(employee)}</td>
                            <td className="p-2 text-center">{employee.entitlement}</td>
                            <td className="p-2 text-center">{standardUsed}</td>
                            <td className="p-2 text-center">{exceptions}</td>
                            <td className={`p-2 text-center font-semibold ${remaining < 0 ? "text-red-600" : "text-slate-900"}`}>{remaining}</td>

                            {yearDays.map((date) => {
                              const iso = toISO(date);
                              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                              const bankName = bankHolidayMap.get(iso);
                              const booking = employeeHolidayMap.get(iso);
                              const isToday = iso === toISO(new Date());

                              let cls = "bg-white";
                              let mark = "";

                              if (isWeekend) cls = "bg-slate-200";
                              if (bankName) { cls = "bg-amber-200"; mark = "BH"; }
                              if (booking) {
                                cls = leaveTypeColorClass(booking);
                                mark = Number(booking.dayAmount) === 0.5 ? "½" : isStandardBooking(booking) ? "H" : "L";
                              }

                              return (
                                <td
                                  key={iso}
                                  className={`h-8 border-l text-center ${isToday ? "bg-orange-100 font-bold" : cls}`}
                                  title={`${employeeFullName(employee)} | ${iso}`}
                                >
                                  {mark}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          <ConfirmDialog
            open={Boolean(confirmAction)}
            title={confirmAction?.title || ""}
            message={confirmAction?.message || ""}
            confirmText={confirmAction?.confirmText || "Confirm"}
            confirmVariant={confirmAction?.confirmVariant || "danger"}
            onCancel={() => setConfirmAction(null)}
            onConfirm={() => {
              confirmAction?.onConfirm();
              setConfirmAction(null);
            }}
          />

          {editingEmployee && (
            <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
              <div className="h-full w-full max-w-2xl overflow-auto bg-white p-5 shadow-xl">
                {(() => {
                  const standardUsed = usedDays(editingEmployee);
                  const exceptions = exceptionDays(editingEmployee);
                  const remaining = Number(editingEmployee.entitlement || 0) - standardUsed;
                  const sickDays =
                    leaveTypeDays(editingEmployee, "sickness_certified", bankHolidayMap) +
                    leaveTypeDays(editingEmployee, "sickness_uncertified", bankHolidayMap) +
                    leaveTypeDays(editingEmployee, "statutory_sick_leave", bankHolidayMap);

                  const entitlement = Number(editingEmployee.entitlement || 0);
                  const usedPercentage =
                    entitlement > 0
                      ? Math.min(100, Math.round((standardUsed / entitlement) * 100))
                      : 0;

                  return (
                    <>
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <div>
                              <h2 className="text-2xl font-bold tracking-tight">
                                {editingEmployee.first_name} {editingEmployee.last_name}
                              </h2>

                              <p className="text-sm text-slate-500">
                                Staff No. {editingEmployee.staff_number} • Employee Profile
                              </p>
                            </div>

                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
                              Active
                            </span>
                          </div>
                          <p className="text-sm text-slate-500">
                            Staff No. {editingEmployee.staff_number} • Employee Profile
                          </p>
                        </div>

                      </div>

                      {/* Profile summary keeps key HR information visible before editing employee details. */}
                      <div className="mb-5 rounded-2xl border bg-slate-50 p-4">
                        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">


                        </div>

                        <div className="mb-4">
                          <p className="mb-2 text-xs font-medium uppercase text-slate-500">
                            Departments
                          </p>

                          <DepartmentBadges employee={editingEmployee} />
                        </div>

                        <div className="mb-5 rounded-xl bg-white p-4 shadow-sm">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-700">
                              Leave balance used
                            </p>

                            <p className="text-sm font-semibold text-slate-700">
                              {usedPercentage}%
                            </p>
                          </div>

                          <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full rounded-full ${usedPercentage >= 90
                                ? "bg-red-500"
                                : usedPercentage >= 70
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                                }`}
                              style={{ width: `${usedPercentage}%` }}
                            />
                          </div>

                          <p className="mt-2 text-xs text-slate-500">
                            {standardUsed} of {entitlement} annual leave days used.
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                          <div className="rounded-xl bg-white p-3 shadow-sm">
                            <p className="text-xs text-slate-500">Entitlement</p>
                            <p className="text-xl font-bold">{editingEmployee.entitlement}</p>
                          </div>

                          <div className="rounded-xl bg-white p-3 shadow-sm">
                            <p className="text-xs text-slate-500">Used</p>
                            <p
                              className={`text-xl font-bold ${standardUsed > 0 ? "text-amber-600" : "text-slate-900"
                                }`}
                            >
                              {standardUsed}
                            </p>
                          </div>

                          <div className="rounded-xl bg-white p-3 shadow-sm">
                            <p className="text-xs text-slate-500">Remaining</p>
                            <p className={`text-xl font-bold ${remaining < 0 ? "text-red-600" : "text-emerald-700"}`}>
                              {remaining}
                            </p>
                          </div>

                          <div className="rounded-xl bg-white p-3 shadow-sm">
                            <p className="text-xs text-slate-500">Exceptions</p>
                            <p
                              className={`text-xl font-bold ${exceptions > 0 ? "text-sky-600" : "text-slate-900"
                                }`}
                            >
                              {exceptions}
                            </p>
                          </div>

                          <div className="rounded-xl bg-white p-3 shadow-sm">
                            <p className="text-xs text-slate-500">Sick</p>
                            <p
                              className={`text-xl font-bold ${sickDays > 0 ? "text-red-600" : "text-slate-900"
                                }`}
                            >
                              {sickDays}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Side panel provides more space for employee fields without expanding the table */}
                      <div className="space-y-3">
                        <input
                          value={editFirstName}
                          onChange={(e) => setEditFirstName(e.target.value)}
                          className="w-full rounded-xl border px-3 py-2 text-sm"
                          placeholder="First name"
                        />

                        <input
                          value={editLastName}
                          onChange={(e) => setEditLastName(e.target.value)}
                          className="w-full rounded-xl border px-3 py-2 text-sm"
                          placeholder="Last name"
                        />

                        <input
                          value={editStaffNumber}
                          onChange={(e) =>
                            setEditStaffNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
                          }
                          className="w-full rounded-xl border px-3 py-2 text-sm"
                          placeholder="Staff number"
                        />

                        <input
                          type="number"
                          value={editEntitlement}
                          onChange={(e) => setEditEntitlement(e.target.value)}
                          className="w-full rounded-xl border px-3 py-2 text-sm"
                          placeholder="Entitlement"
                        />

                        <div className="rounded-xl border p-3">
                          <p className="mb-2 text-sm font-medium">Departments</p>

                          <div className="grid gap-2 md:grid-cols-2">
                            {departments.map((department) => (
                              <label key={department.id} className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={editDepartmentIds.includes(department.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEditDepartmentIds([...editDepartmentIds, department.id]);
                                    } else {
                                      setEditDepartmentIds(
                                        editDepartmentIds.filter((id) => id !== department.id)
                                      );
                                    }
                                  }}
                                />
                                {department.name}
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Leave history provides HR with a quick overview without leaving the employee profile. */}
                        <div className="rounded-xl border">
                          <div className="border-b bg-slate-50 px-4 py-3">
                            <h3 className="font-semibold">Leave History</h3>
                          </div>

                          {editingEmployee.holidays.length === 0 ? (
                            <div className="p-4 text-sm text-slate-500">
                              No leave records found.
                            </div>
                          ) : (
                            <div className="max-h-64 overflow-y-auto">
                              {editingEmployee.holidays
                                .slice()
                                .sort((a, b) => b.start.localeCompare(a.start))
                                .map((holiday) => (
                                  <div
                                    key={holiday.id}
                                    className="border-b px-4 py-3 last:border-b-0"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">
                                        {bookingTypeLabel(holiday)}
                                      </span>

                                      <span className="text-sm text-slate-500">
                                        {bookingTotalWorkingDays(holiday, bankHolidayMap)} day(s)
                                      </span>
                                    </div>

                                    <div className="mt-1 text-sm text-slate-600">
                                      {holiday.start} → {holiday.end}
                                    </div>

                                    {holiday.notes && (
                                      <div className="mt-2 text-xs text-slate-500">
                                        {holiday.notes}
                                      </div>
                                    )}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button onClick={() => saveEdit(editingEmployee.id)}>
                            Save Changes
                          </Button>

                          <Button variant="outline" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setEditingId(null)}
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}


          {activeView === "planner" && (
            <Card>
              <CardContent className="p-4">
                <h2 className="mb-2 font-semibold">Irish bank holidays included for {year}</h2>
                <div className="grid gap-2 text-sm md:grid-cols-2 lg:grid-cols-3">
                  {[...bankHolidayMap.entries()].sort().map(([date, name]) => (
                    <div key={date} className="rounded-xl bg-amber-100 px-3 py-2">
                      <span className="font-medium">{date}</span> — {name}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AuthGate>
  );
}