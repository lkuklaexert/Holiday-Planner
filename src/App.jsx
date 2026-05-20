import React, { useMemo, useState, useEffect } from "react";
import { supabase } from "./supabase";

function Button({ children, onClick, type = "button", variant = "primary", size = "md", className = "", disabled = false, title }) {
  const base = "inline-flex items-center justify-center gap-1 rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-50";
  const sizes = { sm: "px-2 py-1 text-xs", md: "px-3 py-2 text-sm" };
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-700",
    outline: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-100",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
    danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
  };
  return <button type={type} onClick={onClick} disabled={disabled} title={title} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>{children}</button>;
}

function Card({ children }) {
  return <div className="rounded-2xl bg-white shadow-sm">{children}</div>;
}

function CardContent({ children, className = "" }) {
  return <div className={className}>{children}</div>;
}

function Icon({ label }) {
  const symbols = { plus: "+", trash: "🗑", calendar: "📅", users: "👥", pencil: "✎", save: "✓", close: "×" };
  return <span>{symbols[label] || "•"}</span>;
}

const LEAVE_CATEGORIES = {
  STANDARD: "standard_entitlement",
  EXCEPTION: "exception",
};

const EXCEPTION_TYPES = [
  { value: "sick_leave", label: "Sick Leave" },
  { value: "compassionate_leave", label: "Compassionate Leave" },
  { value: "medical_appointment", label: "Medical Appointment" },
  { value: "training", label: "Training" },
  { value: "jury_duty", label: "Jury Duty" },
  { value: "maternity_paternity", label: "Maternity / Paternity" },
  { value: "force_majeure", label: "Force Majeure" },
  { value: "other", label: "Other" },
];

function exceptionLabel(value) {
  return EXCEPTION_TYPES.find((t) => t.value === value)?.label || "Exception";
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
  return booking.leaveCategory === LEAVE_CATEGORIES.STANDARD || !booking.leaveCategory;
}

function bookingDaysForEntitlement(booking, bankHolidayMap) {
  if (!isStandardBooking(booking)) return 0;
  return countWorkingDays(booking.start, booking.end, bankHolidayMap) * Number(booking.dayAmount || 1);
}

function bookingTotalWorkingDays(booking, bankHolidayMap) {
  return countWorkingDays(booking.start, booking.end, bankHolidayMap) * Number(booking.dayAmount || 1);
}

function bookingTypeLabel(booking) {
  return isStandardBooking(booking) ? "Standard Holiday Entitlement" : exceptionLabel(booking.exceptionType);
}

function paymentStatusLabel(booking) {
  return isStandardBooking(booking) ? "Paid" : booking.paymentStatus === "unpaid" ? "Unpaid" : "Paid";
}

export default function IrishHolidayPlanner() {
  const [session, setSession] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");
const [loginPassword, setLoginPassword] = useState("");
const [loginError, setLoginError] = useState("");
  

useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
  });

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session);
  });

  return () => subscription.unsubscribe();
}, []);
  
  const currentYear = new Date().getFullYear();
  const defaultCurrentDate = toISO(new Date());

  const [year, setYear] = useState(currentYear);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [newName, setNewName] = useState("");
  const [newEntitlement, setNewEntitlement] = useState(25);
  const [holidayStart, setHolidayStart] = useState(defaultCurrentDate);
  const [holidayEnd, setHolidayEnd] = useState(defaultCurrentDate);
  const [leaveCategory, setLeaveCategory] = useState(LEAVE_CATEGORIES.STANDARD);
  const [exceptionType, setExceptionType] = useState("sick_leave");
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [holidayNotes, setHolidayNotes] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEntitlement, setEditEntitlement] = useState(25);

  const bankHolidayMap = useMemo(() => getIrishBankHolidays(Number(year)), [year]);
  const yearDays = useMemo(() => getDaysInYear(Number(year)), [year]);
  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId) || employees[0];

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");
  
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
  
    if (error) setLoginError(error.message);
  }

  async function handleResetPassword() {
    setLoginError("");
  
    if (!loginEmail) {
      setLoginError("Please enter your email first.");
      return;
    }
  
    const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, {
      redirectTo: window.location.origin,
    });
  
    if (error) {
      setLoginError(error.message);
      return;
    }
  
    alert("Password reset email sent. Please check your inbox.");
  }
  
  async function handleSetNewPassword(e) {
    e.preventDefault();
    setLoginError("");
  
    const { error } = await supabase.auth.updateUser({
      password: loginPassword,
    });
  
    if (error) {
      setLoginError(error.message);
      return;
    }
  
    alert("Password updated successfully.");
    setLoginPassword("");
  }

  async function loadEmployees() {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("name", { ascending: true });

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

        return {
          ...employee,
          holidays: (holidays || []).map((h) => ({
            id: h.id,
            start: h.start_date,
            end: h.end_date,
            leaveCategory: h.leave_category,
            exceptionType: h.exception_type,
            paymentStatus: h.payment_status,
            notes: h.notes,
            dayAmount: Number(h.day_amount || 1),
          })),
        };
      })
    );

    setEmployees(employeesWithHolidays);

    if (employeesWithHolidays.length > 0) {
      setSelectedEmployeeId((current) => current || employeesWithHolidays[0].id);
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("planner-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "employees" }, loadEmployees)
      .on("postgres_changes", { event: "*", schema: "public", table: "holiday_bookings" }, loadEmployees)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  async function addEmployee() {
    const name = newName.trim();
    if (!name) return;

    const { error } = await supabase.from("employees").insert({
      name,
      entitlement: Number(newEntitlement) || 0,
    });

    if (error) {
      console.error("Add employee error:", error);
      alert(error.message);
      return;
    }

    setNewName("");
    setNewEntitlement(25);
    await loadEmployees();
  }

  async function deleteEmployee(id) {
    const { error } = await supabase.from("employees").delete().eq("id", id);

    if (error) {
      console.error("Delete employee error:", error);
      alert(error.message);
      return;
    }

    if (selectedEmployeeId === id) setSelectedEmployeeId("");
    await loadEmployees();
  }

  function startEdit(employee) {
    setEditingId(employee.id);
    setEditName(employee.name);
    setEditEntitlement(employee.entitlement);
  }

  async function saveEdit(id) {
    const { error } = await supabase
      .from("employees")
      .update({
        name: editName.trim(),
        entitlement: Number(editEntitlement) || 0,
      })
      .eq("id", id);

    if (error) {
      console.error("Save employee error:", error);
      alert(error.message);
      return;
    }

    setEditingId(null);
    await loadEmployees();
  }

  function resetHolidayPickerToCurrentMonth() {
    const current = toISO(new Date());
    setHolidayStart(current);
    setHolidayEnd(current);
    setLeaveCategory(LEAVE_CATEGORIES.STANDARD);
    setExceptionType("sick_leave");
    setPaymentStatus("paid");
    setHolidayNotes("");
  }

  async function addHoliday() {
    if (!selectedEmployee || !holidayStart || !holidayEnd) return;
    if (fromISO(holidayEnd) < fromISO(holidayStart)) return;

    const { error } = await supabase.from("holiday_bookings").insert({
      employee_id: selectedEmployee.id,
      start_date: holidayStart,
      end_date: holidayEnd,
      day_amount: dayAmount,
      leave_category: leaveCategory,
      exception_type: leaveCategory === LEAVE_CATEGORIES.EXCEPTION ? exceptionType : null,
      payment_status: leaveCategory === LEAVE_CATEGORIES.EXCEPTION ? paymentStatus : "paid",
      notes: holidayNotes.trim(),
    });

    if (error) {
      console.error("Add booking error:", error);
      alert(error.message);
      return;
    }

    resetHolidayPickerToCurrentMonth();
    await loadEmployees();
    setDayAmount(1);
  }

  async function deleteHoliday(employeeId, holidayId) {
    const { error } = await supabase.from("holiday_bookings").delete().eq("id", holidayId);

    if (error) {
      console.error("Delete booking error:", error);
      alert(error.message);
      return;
    }

    await loadEmployees();
  }

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonth = new Date().getMonth();

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <form onSubmit={handleLogin} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
          <h1 className="mb-4 text-2xl font-bold text-center">
            Employee Holiday Planner
          </h1>
  
          <div className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              required
            />
  
            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              required
            />
  
            {loginError && (
              <p className="text-sm text-red-600">{loginError}</p>
            )}
  
            <button
              type="submit"
              className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white"
            >
              Log in
            </button>
            <button
  type="button"
  onClick={handleResetPassword}
  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800"
>
  Reset password
</button>
          </div>
        </form>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Irish Employee Holiday Planner</h1>
            <p className="text-sm text-slate-600">Shared planner with entitlement holidays, exceptions, paid/unpaid status and remaining balance.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
  <Button
    variant="outline"
    onClick={async () => {
      await supabase.auth.signOut();
    }}
  >
    Log out
  </Button>

  <form onSubmit={handleSetNewPassword} className="flex items-center gap-2">
    <input
      type="password"
      placeholder="New password"
      value={loginPassword}
      onChange={(e) => setLoginPassword(e.target.value)}
      className="rounded-xl border px-3 py-2 text-sm"
      required
    />

    <button
      type="submit"
      className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white"
    >
      Change Password
    </button>
  </form>

  <Icon label="calendar" />
  <label className="text-sm font-medium">Year</label>
  <input
    type="number"
    value={year}
    onChange={(e) => setYear(Number(e.target.value))}
    className="w-28 rounded-xl border px-3 py-2 text-sm"
  />
</div>

          </div>

        <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-2">
                  <Icon label="users" />
                  <h2 className="font-semibold">Employees</h2>
                </div>

                <div className="grid grid-cols-[1fr_90px_auto] gap-2">
                  <input placeholder="Employee name" value={newName} onChange={(e) => setNewName(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" />
                  <input type="number" value={newEntitlement} onChange={(e) => setNewEntitlement(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" />
                  <Button onClick={addEmployee}><Icon label="plus" /></Button>
                </div>

                <div className="space-y-2">
                  {employees.map((employee) => {
                    const standardUsed = usedDays(employee);
                    const exceptions = exceptionDays(employee);
                    const remaining = employee.entitlement - standardUsed;
                    const isSelected = selectedEmployeeId === employee.id;

                    return (
                      <div key={employee.id} className={`rounded-2xl border p-3 ${isSelected ? "border-slate-900 bg-slate-100" : "bg-white"}`}>
                        {editingId === employee.id ? (
                          <div className="space-y-2">
                            <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm" />
                            <input type="number" value={editEntitlement} onChange={(e) => setEditEntitlement(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm" />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => saveEdit(employee.id)}><Icon label="save" />Save</Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><Icon label="close" />Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button onClick={() => setSelectedEmployeeId(employee.id)} className="w-full text-left">
                              <p className="font-semibold">{employee.name}</p>
                              <p className="text-xs text-slate-600">Entitlement: {employee.entitlement} | Standard used: {standardUsed} | Remaining: {remaining}</p>
                              <p className="text-xs text-slate-600">Exception days recorded: {exceptions}</p>
                            </button>
                            <div className="mt-3 flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => startEdit(employee)}><Icon label="pencil" />Edit</Button>
                              <Button size="sm" variant="danger" onClick={() => deleteEmployee(employee.id)}><Icon label="trash" />Delete</Button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 p-4">
                <h2 className="font-semibold">Add leave / holiday</h2>

                <select value={selectedEmployeeId || ""} onChange={(e) => setSelectedEmployeeId(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm">
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-600">Start</label>
                    <input type="date" value={holidayStart} onChange={(e) => setHolidayStart(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">End</label>
                    <input type="date" value={holidayEnd} onChange={(e) => setHolidayEnd(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm" />
                  </div>
                </div>
                <div>
  <label className="text-xs text-slate-600">Day amount</label>
  <select
    value={dayAmount}
    onChange={(e) => setDayAmount(Number(e.target.value))}
    className="w-full rounded-xl border px-3 py-2 text-sm"
  >
    <option value={1}>Full day</option>
    <option value={0.5}>Half day</option>
  </select>
</div>

                <div>
                  <label className="text-xs text-slate-600">Leave category</label>
                  <select value={leaveCategory} onChange={(e) => setLeaveCategory(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm">
                    <option value={LEAVE_CATEGORIES.STANDARD}>Standard Holiday Entitlement</option>
                    <option value={LEAVE_CATEGORIES.EXCEPTION}>Exception</option>
                  </select>
                </div>

                {leaveCategory === LEAVE_CATEGORIES.EXCEPTION && (
                  <>
                    <div>
                      <label className="text-xs text-slate-600">Exception type</label>
                      <select value={exceptionType} onChange={(e) => setExceptionType(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm">
                        {EXCEPTION_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-slate-600">Paid status</label>
                      <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm">
                        <option value="paid">Paid</option>
                        <option value="unpaid">Unpaid</option>
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label className="text-xs text-slate-600">Notes</label>
                  <textarea value={holidayNotes} onChange={(e) => setHolidayNotes(e.target.value)} className="min-h-[70px] w-full rounded-xl border px-3 py-2 text-sm" placeholder="Optional note" />
                </div>

                <Button onClick={addHoliday} className="w-full" disabled={!selectedEmployee}>Add booking</Button>
              </CardContent>
            </Card>

            {selectedEmployee && (
              <Card>
                <CardContent className="space-y-3 p-4">
                  <h2 className="font-semibold">Booked leave: {selectedEmployee.name}</h2>

                  {selectedEmployee.holidays.length === 0 ? (
                    <p className="text-sm text-slate-500">No bookings yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedEmployee.holidays.map((h) => (
                        <div key={h.id} className="rounded-xl border bg-white p-2 text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium">{h.start} to {h.end} ({bookingTotalWorkingDays(h, bankHolidayMap)} working days)</p>
                              <p className="text-xs text-slate-600">Type: {bookingTypeLabel(h)} | Paid status: {paymentStatusLabel(h)} | Deducted: {bookingDaysForEntitlement(h, bankHolidayMap)}</p>
                              {h.notes && <p className="mt-1 text-xs text-slate-500">Note: {h.notes}</p>}
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => deleteHoliday(selectedEmployee.id, h.id)}><Icon label="trash" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="flex flex-wrap gap-3 border-b p-4 text-xs">
              <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Weekday</span>
              <span className="rounded-full bg-slate-200 px-3 py-1">Weekend</span>
              <span className="rounded-full bg-amber-200 px-3 py-1">Irish bank holiday</span>
              <span className="rounded-full bg-emerald-200 px-3 py-1">Standard holiday</span>
              <span className="rounded-full bg-sky-200 px-3 py-1">Exception</span>
            </div>

            <div className="overflow-auto" ref={(el) => {
              if (el && !el.dataset.scrolled) {
                const approxColumnWidth = 34;
                const staticColumnsWidth = 490;
                el.scrollLeft = staticColumnsWidth + (currentMonth * 31 * approxColumnWidth);
                el.dataset.scrolled = "true";
              }
            }}>
              <table className="min-w-full border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-white shadow-sm">
                  <tr>
                    <th className="sticky left-0 z-20 min-w-[180px] bg-white p-2 text-left">Employee</th>
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
                  {employees.map((employee) => {
                    const standardUsed = usedDays(employee);
                    const exceptions = exceptionDays(employee);
                    const remaining = employee.entitlement - standardUsed;
                    const employeeHolidayMap = holidayDayMap.get(employee.id) || new Map();

                    return (
                      <tr key={employee.id} className="border-t">
                        <td className="sticky left-0 z-10 bg-white p-2 font-semibold">{employee.name}</td>
                        <td className="p-2 text-center">{employee.entitlement}</td>
                        <td className="p-2 text-center">{standardUsed}</td>
                        <td className="p-2 text-center">{exceptions}</td>
                        <td className={`p-2 text-center font-semibold ${remaining < 0 ? "text-red-600" : "text-slate-900"}`}>{remaining}</td>

                        {yearDays.map((date) => {
                          const iso = toISO(date);
                          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                          const bankName = bankHolidayMap.get(iso);
                          const booking = employeeHolidayMap.get(iso);

                          let cls = "bg-white";
                          let mark = "";

                          if (isWeekend) cls = "bg-slate-200";
                          if (bankName) { cls = "bg-amber-200"; mark = "BH"; }
                          if (booking) {
                            cls = isStandardBooking(booking) ? "bg-emerald-200" : "bg-sky-200";
                            mark = isStandardBooking(booking) ? "H" : "E";
                          }

                          return (
                            <td key={iso} className={`h-8 border-l text-center ${cls}`} title={`${employee.name} | ${iso}`}>
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
      </div>
    </div>
  );
}