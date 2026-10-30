import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaCheckCircle, FaClock, FaCog, FaDownload, FaInfoCircle, FaRedo, FaSearch, FaTimesCircle, FaUsers } from "react-icons/fa";
import { canteenApi, dateKey, enabledMeals, needsCanteenAttendance } from "./canteenShared";
import "./canteen.css";

function shiftDate(value, days) { const next = new Date(`${value}T12:00:00`); next.setDate(next.getDate() + days); return dateKey(next); }
function shiftMonth(value, months) { const [year, month] = value.split("-").map(Number); const next = new Date(year, month - 1 + months, 1); return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`; }
function csvCell(value) { return `"${String(value ?? "").replace(/"/g, '""')}"`; }
function tenantInitials(name) { return String(name || "").trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "?"; }

function DayTenantCards({ tenants, meals, day, savingCells, onMark }) {
  return <div className="canteen-mobile-cards">
    {tenants.map((tenant) => <article className="canteen-mobile-card" key={tenant._id}>
      <div className="canteen-mobile-card-head">
        <span className="canteen-tenant-avatar">{tenantInitials(tenant.name)}</span>
        <div><strong>{tenant.name}</strong><small>{tenant.phoneNo}</small><span>{[tenant.category, tenant.roomNo && `Room ${tenant.roomNo}`, tenant.bedNo && `Bed ${tenant.bedNo}`].filter(Boolean).join(" · ")}</span></div>
      </div>
      <div className="canteen-mobile-meals">
        {meals.map((meal) => { const saving = Boolean(savingCells[`${tenant._id}:${day}:${meal}`]); return <div className="canteen-mobile-meal" key={meal}><label htmlFor={`canteen-${tenant._id}-${meal}`}>{meal}</label><select id={`canteen-${tenant._id}-${meal}`} className={`canteen-attendance-select ${tenant.attendance?.[meal] || "unmarked"}`} value={tenant.attendance?.[meal] || "unmarked"} disabled={saving} onChange={(event) => onMark(tenant, meal, event.target.value)}><option value="unmarked" disabled>— Select —</option><option value="present">✅ Yes</option><option value="absent">❌ No</option></select>{saving && <small role="status">Saving…</small>}</div>; })}
      </div>
    </article>)}
  </div>;
}

function MonthRecord({ tenants, selectedId, onSelect, dates, meals, records, summary, loading, onOpenDay }) {
  return <div className="canteen-month-view">
    <label className="canteen-month-tenant" htmlFor="canteen-month-tenant">Tenant
      <select id="canteen-month-tenant" value={selectedId} onChange={(event) => onSelect(event.target.value)} disabled={!tenants.length}>
        {tenants.length ? tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} · {tenant.category} · Room {tenant.roomNo}{tenant.bedNo ? ` · Bed ${tenant.bedNo}` : ""}</option>) : <option value="">No tenant records</option>}
      </select>
    </label>
    {loading ? <p>Loading month…</p> : !selectedId ? <p className="canteen-empty">No canteen records found for this month and filter.</p> : <>
      <div className="canteen-month-summary"><span>Present: <strong>{summary.present}</strong></span><span>Absent: <strong>{summary.absent}</strong></span><span>Unmarked: <strong>{summary.unmarked}</strong></span></div>
      <div className="canteen-table-wrap"><table className="canteen-table"><thead><tr><th>Date</th>{meals.map((meal) => <th key={meal}>{meal[0].toUpperCase() + meal.slice(1)}</th>)}</tr></thead><tbody>
        {dates.map((date) => <tr key={date}><td><button type="button" className="canteen-day-link" onClick={() => onOpenDay(date)}>{new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</button></td>{meals.map((meal) => { const status = records.get(`${date}:${meal}`) || "unmarked"; return <td key={meal}><span className={`canteen-status ${status}`}>{status === "present" ? "✅ Yes" : status === "absent" ? "❌ No" : "—"}</span></td>; })}</tr>)}
      </tbody></table></div>
      <div className="canteen-mobile-cards canteen-mobile-month-cards">{dates.map((date) => <article className="canteen-mobile-card" key={date}><button type="button" className="canteen-day-link" onClick={() => onOpenDay(date)}>{new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</button><div className="canteen-mobile-meals">{meals.map((meal) => { const status = records.get(`${date}:${meal}`) || "unmarked"; return <div className="canteen-mobile-meal" key={meal}><span>{meal}</span><span className={`canteen-status ${status}`}>{status === "present" ? "✅ Yes" : status === "absent" ? "❌ No" : "—"}</span></div>; })}</div></article>)}</div>
    </>}
  </div>;
}

export default function CanteenAttendance() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [day, setDay] = useState(() => dateKey(new Date()));
  const [view, setView] = useState("day");
  const [month, setMonth] = useState(() => dateKey(new Date()).slice(0, 7));
  const [monthRows, setMonthRows] = useState([]);
  const [monthLoading, setMonthLoading] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const dayRef = useRef(day);
  dayRef.current = day;
  const [rows, setRows] = useState([]);
  const [property, setProperty] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingCells, setSavingCells] = useState({});
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { let active = true; canteenApi.settings().then((result) => { if (active) { if (!result.enabled) { navigate("/profile", { replace: true }); return; } setSettings(result); } }).catch((err) => { if (active) { if (err.response?.status === 403) navigate("/profile", { replace: true }); else setError(err.response?.data?.message || "Unable to load canteen settings."); } }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [navigate]);
  const allowedMeals = useMemo(() => enabledMeals(settings), [settings]);
  const load = useCallback(async () => {
    if (!needsCanteenAttendance(settings) || !allowedMeals.length) return;
    setLoading(true); setError("");
    try {
      const results = await Promise.all(allowedMeals.map((meal) => canteenApi.attendance(day, meal)));
      const byTenant = new Map();
      results.forEach((result, index) => {
        (Array.isArray(result.rows) ? result.rows : []).forEach((row) => {
          const key = String(row._id);
          const current = byTenant.get(key) || { ...row, attendance: {} };
          current.attendance[allowedMeals[index]] = row.status || "unmarked";
          byTenant.set(key, current);
        });
      });
      setRows([...byTenant.values()]);
    }
    catch (err) { setError(err.response?.data?.message || "Unable to load canteen attendance."); }
    finally { setLoading(false); }
  }, [settings, allowedMeals, day]);
  useEffect(() => { load(); }, [load]);
  const loadMonth = useCallback(async () => {
    if (view !== "month" || !needsCanteenAttendance(settings)) return;
    setMonthLoading(true); setError("");
    try {
      const [year, number] = month.split("-").map(Number);
      const result = await canteenApi.range(`${month}-01`, dateKey(new Date(year, number, 0)));
      setMonthRows(Array.isArray(result.rows) ? result.rows : []);
    } catch (err) { setError(err.response?.data?.message || "Unable to load monthly attendance."); }
    finally { setMonthLoading(false); }
  }, [month, settings, view]);
  useEffect(() => { loadMonth(); }, [loadMonth]);

  const properties = useMemo(() => [...new Set([...rows, ...monthRows].map((row) => String(row.category || "").trim()).filter(Boolean))].sort(), [rows, monthRows]);
  const propertyRows = useMemo(() => property === "all" ? rows : rows.filter((row) => row.category === property), [rows, property]);
  const visible = useMemo(() => propertyRows.filter((row) => [row.name, row.phoneNo, row.category, row.floorNo, row.roomNo, row.bedNo].some((value) => String(value || "").toLowerCase().includes(query.toLowerCase().trim()))), [propertyRows, query]);
  const summary = useMemo(() => {
    const statuses = propertyRows.flatMap((row) => allowedMeals.map((meal) => row.attendance?.[meal] || "unmarked"));
    return { tenants: propertyRows.length, present: statuses.filter((status) => status === "present").length, absent: statuses.filter((status) => status === "absent").length, unmarked: statuses.filter((status) => status === "unmarked").length };
  }, [propertyRows, allowedMeals]);
  const monthTenants = useMemo(() => {
    const tenants = new Map();
    [...rows.map((row) => ({ tenantId: row._id, tenantName: row.name, ...row })), ...monthRows].forEach((row) => {
      const id = String(row.tenantId || row._id || "");
      if (id && (row.tenantName || row.name)) tenants.set(id, { id, name: row.tenantName || row.name, phoneNo: row.phoneNo || "", category: row.category || "", roomNo: row.roomNo || "", bedNo: row.bedNo || "" });
    });
    return [...tenants.values()].filter((tenant) => (property === "all" || tenant.category === property) && [tenant.name, tenant.phoneNo, tenant.category, tenant.roomNo, tenant.bedNo].some((value) => String(value || "").toLowerCase().includes(query.toLowerCase().trim()))).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, monthRows, property, query]);
  const activeTenantId = monthTenants.some((tenant) => tenant.id === selectedTenantId) ? selectedTenantId : monthTenants[0]?.id || "";
  const monthDays = useMemo(() => { const [year, number] = month.split("-").map(Number); return Array.from({ length: new Date(year, number, 0).getDate() }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`); }, [month]);
  const tenantMonthRecords = useMemo(() => {
    const byDay = new Map();
    monthRows.filter((row) => String(row.tenantId) === activeTenantId && allowedMeals.includes(row.meal)).forEach((row) => byDay.set(`${row.dateKey}:${row.meal}`, row.status));
    return byDay;
  }, [monthRows, activeTenantId, allowedMeals]);
  const monthSummary = useMemo(() => {
    const values = [...tenantMonthRecords.values()];
    return { present: values.filter((value) => value === "present").length, absent: values.filter((value) => value === "absent").length, unmarked: monthDays.length * allowedMeals.length - values.length };
  }, [tenantMonthRecords, monthDays, allowedMeals]);

  async function markOne(row, meal, status) {
    const cellKey = `${row._id}:${day}:${meal}`;
    if (savingCells[cellKey]) return;
    const previousStatus = row.attendance?.[meal] || "unmarked";
    setError("");
    setSavingCells((current) => ({ ...current, [cellKey]: true }));
    setRows((current) => current.map((item) => item._id === row._id ? { ...item, attendance: { ...item.attendance, [meal]: status } } : item));
    try { await canteenApi.mark({ tenantId: row._id, dateKey: day, meal, status }); }
    catch (err) {
      if (dayRef.current === day) setRows((current) => current.map((item) => item._id === row._id ? { ...item, attendance: { ...item.attendance, [meal]: previousStatus } } : item));
      setError(err.response?.data?.message || `Unable to save ${meal} attendance for ${row.name}.`);
    }
    finally { setSavingCells((current) => { const next = { ...current }; delete next[cellKey]; return next; }); }
  }
  async function exportCsv() {
    setExporting(true); setError("");
    try {
      const exportMonth = view === "month" ? month : day.slice(0, 7);
      const start = `${exportMonth}-01`;
      const end = dateKey(new Date(Number(exportMonth.slice(0, 4)), Number(exportMonth.slice(5, 7)), 0));
      const result = await canteenApi.range(start, end);
      const data = (result.rows || []).filter((row) => property === "all" || row.category === property);
      const mealColumns = ["breakfast", "lunch", "dinner"].filter((meal) => allowedMeals.includes(meal) || data.some((row) => row.meal === meal));
      const byTenantDate = new Map();
      data.forEach((row) => {
        const key = `${row.dateKey}:${row.tenantId || row.phoneNo || row.tenantName}`;
        if (!byTenantDate.has(key)) byTenantDate.set(key, {
          date: row.dateKey,
          tenant: row.tenantName,
          phone: row.phoneNo,
          property: row.category,
          room: row.roomNo,
          bed: row.bedNo,
          meals: {},
        });
        byTenantDate.get(key).meals[row.meal] = row.status;
      });
      const header = ["Date", "Tenant", "Phone", "Property", "Room", "Bed", ...mealColumns.map((meal) => meal[0].toUpperCase() + meal.slice(1))];
      const grouped = [...byTenantDate.values()].sort((a, b) => b.date.localeCompare(a.date) || String(a.tenant).localeCompare(String(b.tenant)));
      const csv = [header, ...grouped.map((row) => [row.date, row.tenant, row.phone, row.property, row.room, row.bed, ...mealColumns.map((meal) => row.meals[meal] || "")])].map((line) => line.map(csvCell).join(",")).join("\r\n");
      const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a"); link.href = url; link.download = `canteen-attendance-${exportMonth}.csv`; link.click(); URL.revokeObjectURL(url);
    } catch (err) { setError(err.response?.data?.message || "Unable to export attendance."); }
    finally { setExporting(false); }
  }

  return <main className="canteen-page canteen-attendance-page"><div className="canteen-header"><button type="button" className="canteen-back" onClick={() => navigate("/admin")}><FaArrowLeft /> Back</button><div><span className="canteen-eyebrow">CANTEEN MANAGEMENT</span><h1>Meal attendance</h1><p>Mark meals for tenants with canteen service.</p></div><button type="button" className="canteen-back" onClick={() => navigate("/canteen-settings")}><FaCog /> Meal settings</button></div>
    {!loading && settings && !needsCanteenAttendance(settings) ? <section className="canteen-panel"><h2>Attendance is not required</h2><p>Choose per-meal pricing or attendance day wise billing in meal settings to mark attendance.</p><button type="button" className="canteen-primary" onClick={() => navigate("/canteen-settings")}>Open meal settings</button></section> : <section className="canteen-panel">
      <div className="canteen-view-switch" role="group" aria-label="Attendance view">
        <button type="button" className={view === "day" ? "selected" : ""} onClick={() => setView("day")}>Day</button>
        <button type="button" className={view === "month" ? "selected" : ""} onClick={() => { setMonth(day.slice(0, 7)); setView("month"); }}>Month</button>
      </div>
      <div className="canteen-toolbar">
        <div className="canteen-date">
          <button type="button" onClick={() => view === "day" ? setDay(shiftDate(day, -1)) : setMonth(shiftMonth(month, -1))} aria-label={view === "day" ? "Previous day" : "Previous month"}>‹</button>
          {view === "day" ? <input type="date" value={day} onChange={(event) => { if (event.target.value) setDay(event.target.value); }} aria-label="Attendance date" /> : <input type="month" value={month} onChange={(event) => { if (event.target.value) setMonth(event.target.value); }} aria-label="Attendance month" />}
          <button type="button" onClick={() => view === "day" ? setDay(shiftDate(day, 1)) : setMonth(shiftMonth(month, 1))} aria-label={view === "day" ? "Next day" : "Next month"}>›</button>
        </div>
        <select value={property} onChange={(event) => setProperty(event.target.value)} aria-label="Property"><option value="all">All properties</option>{properties.map((value) => <option key={value}>{value}</option>)}</select>
        <div className="canteen-search"><FaSearch aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, phone, room or bed" aria-label="Search tenants" /></div>
        <button type="button" className="canteen-back" onClick={view === "day" ? load : loadMonth}><FaRedo /> Refresh</button>
        <div className="canteen-actions"><button type="button" className="canteen-back" disabled={exporting} onClick={exportCsv}><FaDownload aria-hidden="true" /> {exporting ? "Exporting…" : "Export month CSV"}</button></div>
      </div>
      {view === "day" && <div className="canteen-summary">{Object.entries(summary).map(([key, value]) => <div className={`canteen-summary-card ${key}`} key={key}><span className="canteen-summary-icon">{key === "tenants" ? <FaUsers /> : key === "present" ? <FaCheckCircle /> : key === "absent" ? <FaTimesCircle /> : <FaClock />}</span><span className="canteen-summary-copy"><span>{key}</span><strong>{value}</strong></span></div>)}</div>}
      {view === "day" && <div className="canteen-attendance-actions"><p className="canteen-summary-note"><FaInfoCircle aria-hidden="true" /> Attendance totals count meal selections for the selected date and property.</p></div>}
      {error && <p role="alert" className="canteen-error">{error}</p>}
      {view === "month" ? <MonthRecord tenants={monthTenants} selectedId={activeTenantId} onSelect={setSelectedTenantId} dates={monthDays} meals={allowedMeals} records={tenantMonthRecords} summary={monthSummary} loading={monthLoading} onOpenDay={(date) => { setDay(date); setView("day"); }} /> : loading ? <p>Loading attendance…</p> : !visible.length ? <p className="canteen-empty">No canteen tenants found for this date and filter. For a tenant added before this update, open their record, select Canteen: Yes, and save it.</p> : <div className="canteen-table-wrap"><table className="canteen-table"><thead><tr><th>Tenant</th><th>Property / unit</th>{allowedMeals.map((meal) => <th key={meal}>{meal[0].toUpperCase() + meal.slice(1)}</th>)}</tr></thead><tbody>{visible.map((row) => <tr key={row._id}><td><div className="canteen-tenant-cell"><span className="canteen-tenant-avatar">{tenantInitials(row.name)}</span><span><strong>{row.name}</strong><small>{row.phoneNo}</small></span></div></td><td>{[row.category, row.roomNo && `Room ${row.roomNo}`, row.bedNo && `Bed ${row.bedNo}`].filter(Boolean).join(" · ")}</td>{allowedMeals.map((meal) => { const savingCell = Boolean(savingCells[`${row._id}:${day}:${meal}`]); return <td key={meal}><select className={`canteen-attendance-select ${row.attendance?.[meal] || "unmarked"}`} aria-label={`${meal} attendance for ${row.name}`} value={row.attendance?.[meal] || "unmarked"} disabled={savingCell} onChange={(event) => markOne(row, meal, event.target.value)}><option value="unmarked" disabled>— Select —</option><option value="present">✅ Yes</option><option value="absent">❌ No</option></select>{savingCell && <small role="status" className="canteen-saving">Saving…</small>}</td>; })}</tr>)}</tbody></table></div>}
      {view === "day" && !loading && visible.length > 0 && <DayTenantCards tenants={visible} meals={allowedMeals} day={day} savingCells={savingCells} onMark={markOne} />}
    </section>}
  </main>;
}
