import { Card, CardContent } from "../../components/common/Card";

export default function PlannerPage({
  totalEmployees,
  currentlyOnLeave,
  currentlyOnSickLeave,
  upcomingBookings30Days,
  annualLeaveDaysBooked,
  departmentFilter,
  setDepartmentFilter,
  departments,
  nameSort,
  setNameSort,
  holidayWindowFilter,
  setHolidayWindowFilter,
  scrollCalendarToToday,
  currentMonth,
  yearDays,
  toISO,
  months,
  visibleEmployees,
  usedDays,
  exceptionDays,
  holidayDayMap,
  employeeFullName,
  employeeDepartmentNames,
  bankHolidayMap,
  leaveTypeColorClass,
  isStandardBooking,
  year,
}) {
  return (
    <section className="space-y-4">
      {/* Planner content moved from App.jsx without changing behaviour. */}
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Employees</p><p className="text-2xl font-bold">{totalEmployees}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Currently on Leave</p><p className="text-2xl font-bold">{currentlyOnLeave}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Currently Sick</p><p className="text-2xl font-bold">{currentlyOnSickLeave}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Bookings Next 30 Days</p><p className="text-2xl font-bold">{upcomingBookings30Days}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Annual Leave Days Booked</p><p className="text-2xl font-bold">{annualLeaveDaysBooked}</p></CardContent></Card>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b p-4 text-sm">
            <label className="font-medium">Department</label>
            <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="rounded-xl border px-3 py-2 text-sm">
              <option value="all">All departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>

            <label className="font-medium">Sort</label>
            <select value={nameSort} onChange={(e) => setNameSort(e.target.value)} className="rounded-xl border px-3 py-2 text-sm">
              <option value="az">Name A → Z</option>
              <option value="za">Name Z → A</option>
            </select>

            <label className="flex items-center gap-2 font-medium">
              <input
                type="checkbox"
                checked={holidayWindowFilter}
                onChange={(e) => {
                  setHolidayWindowFilter(e.target.checked);
                  if (e.target.checked) setTimeout(scrollCalendarToToday, 50);
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

          <div
            id="calendar-scroll-container"
            className="overflow-auto"
            ref={(el) => {
              if (el && !el.dataset.scrolled && !holidayWindowFilter) {
                const approxColumnWidth = 34;
                const staticColumnsWidth = 490;
                el.scrollLeft = staticColumnsWidth + currentMonth * 31 * approxColumnWidth;
                el.dataset.scrolled = "true";
              }
            }}
          >
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
                        if (bankName) {
                          cls = "bg-amber-200";
                          mark = "BH";
                        }
                        if (booking) {
                          cls = leaveTypeColorClass(booking);
                          mark = Number(booking.dayAmount) === 0.5 ? "½" : isStandardBooking(booking) ? "H" : "L";
                        }

                        return (
                          <td key={iso} className={`h-8 border-l text-center ${isToday ? "bg-orange-100 font-bold" : cls}`} title={`${employeeFullName(employee)} | ${iso}`}>
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
    </section>
  );
}