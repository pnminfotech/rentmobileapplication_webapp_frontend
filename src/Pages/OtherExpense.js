import React, { useEffect, useMemo, useState } from "react";
import { FaPlus, FaDownload, FaEdit, FaClipboardList, FaRedoAlt } from "react-icons/fa";
import { MdMiscellaneousServices } from "react-icons/md";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import * as XLSX from "xlsx";
import { HiHome } from "react-icons/hi";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import SecurityPinDeleteDialog from "../componenet/SecurityPinDeleteDialog";
import "../Pages/lightbill.css";
import "../componenet/RentTracker.css";

const OtherExpense = ({ embedded = false, propertyScope = null }) => {
  const navigate = useNavigate();
  const scopedRoomNos = (propertyScope?.roomNos || []).map((roomNo) => String(roomNo));
  const scopedOptionLabels = propertyScope?.optionLabels || {};
  const scopedRoomTypeMap = propertyScope?.roomTypeMap || {};
  const scopedRoomNosByType = {
    bed: new Set((propertyScope?.roomNosByType?.bed || []).map((roomNo) => String(roomNo).trim())),
    room: new Set((propertyScope?.roomNosByType?.room || []).map((roomNo) => String(roomNo).trim())),
    shop: new Set((propertyScope?.roomNosByType?.shop || []).map((roomNo) => String(roomNo).trim())),
  };
  const hasRoomScope = scopedRoomNos.length > 0;
  const scopeLabel = propertyScope?.label || "Bed-wise";
  const scopeType = String(propertyScope?.type || "").toLowerCase();
  const shouldSelectUnit = hasRoomScope && scopeType !== "bed";
  const scopeUnitLabel =
    scopeType === "shop" ? "Shop" : scopeType === "mixed" ? "Room / Shop" : "Room";
  const getScopedDisplayLabel = (roomNo) => {
    const key = String(roomNo || "").trim();
    if (!key) return "-";
    return scopedOptionLabels[key] || key;
  };
  const propertyTypeLabels = {
    bed: "Hostel",
    room: "Room",
    shop: "Shop",
  };
  const getRoomNosForPropertyType = (type) => {
    const normalizedType = String(type || "").trim().toLowerCase();
    return Array.from(scopedRoomNosByType[normalizedType] || []);
  };
  const getUnitLabelForPropertyType = (type) => {
    const normalizedType = String(type || "").trim().toLowerCase();
    return normalizedType === "shop" ? "Shop" : "Room";
  };
  const availablePropertyTypes = ["bed", "room", "shop"].filter(
    (type) => type === "bed" || getRoomNosForPropertyType(type).length > 0
  );
  const normalizeExpensePropertyType = (expense = {}) => {
    const explicitType = String(expense?.propertyType || "").trim().toLowerCase();
    if (explicitType === "bed" || explicitType === "room" || explicitType === "shop") {
      return explicitType;
    }

    const roomNo = String(expense?.roomNo || "").trim();
    if (!roomNo) return "bed";

    const isBed = scopedRoomNosByType.bed.has(roomNo);
    const isRoom = scopedRoomNosByType.room.has(roomNo);
    const isShop = scopedRoomNosByType.shop.has(roomNo);

    if (isBed && !isRoom && !isShop) return "bed";
    if (isRoom && !isBed && !isShop) return "room";
    if (isShop && !isBed && !isRoom) return "shop";

    // Prefer hostel for old ambiguous records so they do not leak into other-property tabs.
    if (isBed && (isRoom || isShop)) return "bed";

    return String(scopedRoomTypeMap[roomNo] || "").trim().toLowerCase() || "bed";
  };

  const [otherExpenses, setOtherExpenses] = useState([]);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );

  // Filters
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(0);

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [deletingExpense, setDeletingExpense] = useState(null);

  // New entry
  const [newEntry, setNewEntry] = useState({
    roomNo: "",
    mainAmount: "",
    expenses: [""],
    date: "",
    status: "pending",
  });

  // Edit fields
  const [updatedMainAmount, setUpdatedMainAmount] = useState("");
  const [updatedExpenses, setUpdatedExpenses] = useState("");
  const [updatedDate, setUpdatedDate] = useState("");
  const [updatedStatus, setUpdatedStatus] = useState("");
  const [updatedPropertyType, setUpdatedPropertyType] = useState("bed");
  const [updatedRoomNo, setUpdatedRoomNo] = useState("");

  // Month + Year list
  const months = [
    { value: 0, label: "All Months" },
    { value: 1, label: "Jan" },
    { value: 2, label: "Feb" },
    { value: 3, label: "Mar" },
    { value: 4, label: "Apr" },
    { value: 5, label: "May" },
    { value: 6, label: "Jun" },
    { value: 7, label: "Jul" },
    { value: 8, label: "Aug" },
    { value: 9, label: "Sep" },
    { value: 10, label: "Oct" },
    { value: 11, label: "Nov" },
    { value: 12, label: "Dec" },
  ];

  const years = [];
  for (let y = selectedYear - 2; y <= selectedYear + 2; y++) years.push(y);

  // Load data
  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchExpenses = async () => {
    try {
      const res = await fetch("   https://rentmobile-api.pnminfotech.com/api/other-expense/all");
      const data = await res.json();
      setOtherExpenses(
        Array.isArray(data)
          ? data.map((item) => ({
              ...item,
              propertyType: normalizeExpensePropertyType(item),
            }))
          : []
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered list
  const filteredExpenses = otherExpenses.filter((item) => {
    const propertyType = normalizeExpensePropertyType(item);
    const matchesScope =
      scopeType === "mixed"
        ? propertyType === "room" || propertyType === "shop"
        : propertyType === scopeType;
    const dt = new Date(item.date);
    const matchesYear = dt.getFullYear() === selectedYear;
    const matchesMonth =
      selectedMonth === 0 || dt.getMonth() + 1 === selectedMonth;

    return matchesScope && matchesYear && matchesMonth;
  });

  // Add new expense
  const handleAddExpense = async () => {
    try {
      if (shouldSelectUnit && !String(newEntry.roomNo || "").trim()) {
        return alert(`Select ${scopeUnitLabel}`);
      }
      const propertyType =
        scopeType === "mixed"
          ? String(scopedRoomTypeMap[String(newEntry.roomNo || "").trim()] || "").trim().toLowerCase()
          : scopeType;
      if ((scopeType === "mixed" || scopeType === "room" || scopeType === "shop") && !propertyType) {
        return alert("Select a valid room or shop");
      }
      const payload = {
        roomNo: shouldSelectUnit ? newEntry.roomNo : "",
        propertyType,
        mainAmount: newEntry.mainAmount,
        expenses: newEntry.expenses.filter((e) => e.trim() !== ""),
        date: newEntry.date,
        status: newEntry.status,
      };

      const res = await fetch("   https://rentmobile-api.pnminfotech.com/api/other-expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed");

      alert("Expense Added!");
      setShowAddModal(false);

      setNewEntry({
        roomNo: "",
        mainAmount: "",
        expenses: [""],
        date: "",
        status: "pending",
      });

      fetchExpenses();
    } catch (err) {
      alert(err.message);
    }
  };

  // Edit
  const handleEdit = (exp) => {
    const normalizedPropertyType = normalizeExpensePropertyType(exp);
    setSelectedExpense(exp);

    setUpdatedMainAmount(exp.mainAmount);
    setUpdatedExpenses(exp.expenses?.join(", ") || "");
    setUpdatedDate(exp.date?.slice(0, 10));
    setUpdatedStatus(exp.status);
    setUpdatedPropertyType(normalizedPropertyType);
    setUpdatedRoomNo(exp.roomNo || "");

    setShowEditModal(true);
  };

  const handleUpdateSubmit = async () => {
    try {
      const normalizedPropertyType = String(updatedPropertyType || "").trim().toLowerCase();
      const normalizedRoomNo = String(updatedRoomNo || "").trim();
      if ((normalizedPropertyType === "room" || normalizedPropertyType === "shop") && !normalizedRoomNo) {
        return alert(`Select ${getUnitLabelForPropertyType(normalizedPropertyType)}`);
      }

      const payload = {
        ...selectedExpense,
        roomNo: normalizedPropertyType === "bed" ? "" : normalizedRoomNo,
        propertyType: normalizedPropertyType || normalizeExpensePropertyType(selectedExpense),
        mainAmount: updatedMainAmount,
        expenses: updatedExpenses.split(",").map((e) => e.trim()),
        date: updatedDate,
        status: updatedStatus,
      };

      const res = await fetch(
        `   https://rentmobile-api.pnminfotech.com/api/other-expense/${selectedExpense._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) throw new Error("Update failed");

      alert("Updated Successfully!");
      setShowEditModal(false);
      fetchExpenses();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = (exp) => { if (exp?._id) setDeletingExpense(exp); };
  const deleteExpense = async (securityPin) => {
    await api.delete(`/other-expense/${deletingExpense._id}`, { data: { securityPin } });
    setSelectedExpense(null);
    setShowEditModal(false);
    await fetchExpenses();
  };

  // Excel export
  const downloadExcel = () => {
    const formatted = filteredExpenses.map((item, idx) => ({
      "Sr No.": idx + 1,
      [scopeUnitLabel]: getScopedDisplayLabel(item.roomNo),
      "Main Amount": item.mainAmount,
      Expenses: item.expenses?.join(", ") || "",
      Date: new Date(item.date).toLocaleDateString(),
      Status: item.status,
    }));

    const sheet = XLSX.utils.json_to_sheet(formatted);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "OtherExpenses");
    XLSX.writeFile(book, `OtherExpense-${selectedYear}.xlsx`);
  };

  const handleGoBack = () => {
    navigate("/maindashboard");
  };

  const getExpenseTone = (status = "") => {
    const s = String(status || "").toLowerCase();
    if (s === "paid") return "paid";
    if (s === "pending") return "pend";
    return "due";
  };
  const roomShopExpenseSummary = useMemo(() => {
    return filteredExpenses.reduce(
      (acc, item) => {
        const unitType = normalizeExpensePropertyType(item);
        if (unitType !== "room" && unitType !== "shop") return acc;

        const amount = Number(item?.mainAmount || 0);
        if (!Number.isFinite(amount)) return acc;

        if (unitType === "room") {
          acc.totalRoom += amount;
          if (String(item?.status || "").toLowerCase() !== "paid") {
            acc.pendingRoom += amount;
          }
        }

        if (unitType === "shop") {
          acc.totalShop += amount;
          if (String(item?.status || "").toLowerCase() !== "paid") {
            acc.pendingShop += amount;
          }
        }

        return acc;
      },
      {
        totalRoom: 0,
        totalShop: 0,
        pendingRoom: 0,
        pendingShop: 0,
      }
    );
  }, [filteredExpenses, scopedRoomTypeMap]);
  const hostelExpenseSummary = useMemo(() => {
    return filteredExpenses.reduce(
      (acc, item) => {
        const amount = Number(item?.mainAmount || 0);
        if (!Number.isFinite(amount)) return acc;

        acc.total += amount;
        if (String(item?.status || "").toLowerCase() !== "paid") {
          acc.pending += amount;
        }

        return acc;
      },
      { total: 0, pending: 0 }
    );
  }, [filteredExpenses]);

  const deleteDialog = <SecurityPinDeleteDialog open={Boolean(deletingExpense)} title="Delete expense" description="This will permanently remove the selected expense." onClose={() => setDeletingExpense(null)} onDelete={deleteExpense} />;

  if (isMobile) {
    return (
      <div className="rent-mobile-view other-expense-mobile-view">
        <div className="rent-mobile-shell">
          <section className="rent-mobile-section">
            <div className="rent-mobile-topbar section-text1">
              <button
                type="button"
                className="rent-mobile-leaved-btn"
                onClick={handleGoBack}
              >
                <FaArrowLeft />
                <span>Back</span>
              </button>

              <button type="button" className="rent-mobile-leaved-btn" onClick={fetchExpenses}>
                <FaRedoAlt />
                <span>Refresh</span>
              </button>
            </div>

            <div className="rent-mobile-section-title section-text1">
              <div>
                <h5>{scopeLabel} Other Expenses</h5>
                <div className="rent-mobile-badge">Tap a card to edit</div>
              </div>
              <div className="rent-mobile-badge">
                {filteredExpenses.length} {filteredExpenses.length === 1 ? "item" : "items"}
              </div>
            </div>

            <div className="rent-mobile-actions">
              <select
                className="form-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <select
                className="form-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rent-mobile-tenant-list">
              {filteredExpenses.length === 0 ? (
                <div className="rent-mobile-empty">No data found.</div>
              ) : (
                filteredExpenses.map((item, idx) => {
                  const tone = getExpenseTone(item.status);
                  return (
                    <article
                      key={item._id}
                      className={`rent-mobile-tenant-card rent-mobile-tenant-card--${tone}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleEdit(item)}
                      onKeyDown={(e) => e.key === "Enter" && handleEdit(item)}
                    >
                      <div className="rent-mobile-tenant-core">
                        <div className="rent-mobile-tenant-head">
                          <div className="rent-mobile-tenant-avatar">
                            {(item.expenses?.[0] || "O").charAt(0).toUpperCase()}
                          </div>

                          <div className="rent-mobile-tenant-main text-justify">
                            <div className="rent-mobile-tenant-name">
                              Other Expense #{idx + 1}
                            </div>
                            {item.roomNo && (
                              <div className="rent-mobile-tenant-meta">
                                {scopeUnitLabel}: {getScopedDisplayLabel(item.roomNo)}
                              </div>
                            )}
                            <div className="rent-mobile-tenant-meta">
                              <FaClipboardList className="me-1" />
                              {item.expenses?.join(", ") || "-"}
                            </div>
                            <div className="rent-mobile-tenant-meta">
                              Date:{" "}
                              <span className="lb-highlight-date">
                                {new Date(item.date).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="rent-mobile-tenant-meta">
                              Main Amount:{" "}
                              <span className="lb-highlight-date">
                                ₹{Number(item.mainAmount || 0).toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: "8px" }}>
                          <span className={`rent-status-pill ${tone}`}>
                            {item.status === "paid" ? "Paid" : "Pending"}
                          </span>
                        </div>
                      </div>

                      <div className="rent-mobile-card-actions">
                        <button
                          type="button"
                          className="rent-mobile-action secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(item);
                          }}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="rent-mobile-action warn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <div className="rent-mobile-actionbar" aria-label="Other expense quick actions">
            <button
              type="button"
              className="rent-mobile-actionbar-btn"
              onClick={() => setShowAddModal(true)}
            >
              <span className="rent-mobile-actionbar-icon">
                <FaPlus />
              </span>
              <span>Add</span>
            </button>

            <button type="button" className="rent-mobile-actionbar-btn" onClick={downloadExcel}>
              <span className="rent-mobile-actionbar-icon">
                <FaDownload />
              </span>
              <span>Download</span>
            </button>

            <button
              type="button"
              className="rent-mobile-actionbar-btn"
              onClick={handleGoBack}
            >
              <span className="rent-mobile-actionbar-icon">
                <FaArrowLeft />
              </span>
              <span>Back</span>
            </button>
          </div>

          {showAddModal && (
            <div className="modal d-block" style={{ background: "#00000055" }}>
              <div className="modal-dialog modal-lg">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5>Add Other Expense</h5>
                    <button
                      className="btn-close"
                      onClick={() => setShowAddModal(false)}
                      style={{ padding: "0px", margin: "0px" }}
                    >
                      x
                    </button>
                  </div>

                  <div className="modal-body">
                    {shouldSelectUnit && (
                      <>
                        <label>{scopeUnitLabel} No</label>
                        <select
                          className="form-select mb-2"
                          value={newEntry.roomNo}
                          onChange={(e) =>
                            setNewEntry({ ...newEntry, roomNo: e.target.value })
                          }
                        >
                          <option value="">Select {scopeUnitLabel}</option>
                          {scopedRoomNos.map((roomNo) => (
                            <option key={roomNo} value={roomNo}>
                              {getScopedDisplayLabel(roomNo)}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                    <label>Main Amount</label>
                    <input
                      type="number"
                      className="form-control mb-2"
                      value={newEntry.mainAmount}
                      onChange={(e) =>
                        setNewEntry({ ...newEntry, mainAmount: e.target.value })
                      }
                    />

                    <label>Expenses</label>
                    {newEntry.expenses.map((exp, idx) => (
                      <div key={idx} className="d-flex mb-2">
                        <input
                          type="text"
                          className="form-control"
                          value={exp}
                          placeholder={`Expense ${idx + 1}`}
                          onChange={(e) => {
                            const arr = [...newEntry.expenses];
                            arr[idx] = e.target.value;
                            setNewEntry({ ...newEntry, expenses: arr });
                          }}
                        />

                        <button
                          className="btn btn-danger ms-2"
                          onClick={() => {
                            const arr = newEntry.expenses.filter((_, i) => i !== idx);
                            setNewEntry({ ...newEntry, expenses: arr });
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ))}

                    <button
                      className="btn btn-secondary mb-3"
                      onClick={() =>
                        setNewEntry({
                          ...newEntry,
                          expenses: [...newEntry.expenses, ""],
                        })
                      }
                    >
                      Add Expense
                    </button>

                    <label>Date</label>
                    <input
                      type="date"
                      className="form-control mb-2"
                      value={newEntry.date}
                      onChange={(e) =>
                        setNewEntry({ ...newEntry, date: e.target.value })
                      }
                    />

                    <label>Status</label>
                    <select
                      className="form-select"
                      value={newEntry.status}
                      onChange={(e) =>
                        setNewEntry({
                          ...newEntry,
                          status: e.target.value,
                        })
                      }
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>

                  <div className="modal-footer">
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowAddModal(false)}
                    >
                      Cancel
                    </button>
                    <button className="btn btn-success" onClick={handleAddExpense}>
                      Save Entry
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showEditModal && (
            <div className="modal d-block" style={{ background: "#00000055" }}>
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5>Edit Expense</h5>
                    <button
                      className="btn-close"
                      onClick={() => setShowEditModal(false)}
                    >X</button>
                  </div>

                  <div className="modal-body">
                    {availablePropertyTypes.length > 1 && (
                      <>
                        <label>Expense Scope</label>
                        <select
                          className="form-select mb-2"
                          value={updatedPropertyType}
                          onChange={(e) => {
                            const nextType = e.target.value;
                            setUpdatedPropertyType(nextType);
                            if (nextType === "bed") {
                              setUpdatedRoomNo("");
                            } else {
                              const allowedRoomNos = getRoomNosForPropertyType(nextType);
                              if (!allowedRoomNos.includes(String(updatedRoomNo || "").trim())) {
                                setUpdatedRoomNo("");
                              }
                            }
                          }}
                        >
                          {availablePropertyTypes.map((type) => (
                            <option key={type} value={type}>
                              {propertyTypeLabels[type]}
                            </option>
                          ))}
                        </select>
                      </>
                    )}

                    {(updatedPropertyType === "room" || updatedPropertyType === "shop") && (
                      <>
                        <label>{getUnitLabelForPropertyType(updatedPropertyType)} No</label>
                        <select
                          className="form-select mb-2"
                          value={updatedRoomNo}
                          onChange={(e) => setUpdatedRoomNo(e.target.value)}
                        >
                          <option value="">Select {getUnitLabelForPropertyType(updatedPropertyType)}</option>
                          {getRoomNosForPropertyType(updatedPropertyType).map((roomNo) => (
                            <option key={roomNo} value={roomNo}>
                              {getScopedDisplayLabel(roomNo)}
                            </option>
                          ))}
                        </select>
                      </>
                    )}

                    <label>Status</label>
                    <select
                      className="form-select mb-2"
                      value={updatedStatus}
                      onChange={(e) => setUpdatedStatus(e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                    </select>

                    <label>Main Amount</label>
                    <input
                      type="number"
                      className="form-control mb-2"
                      value={updatedMainAmount}
                      onChange={(e) => setUpdatedMainAmount(e.target.value)}
                    />

                    <label>Expenses (comma separated)</label>
                    <input
                      type="text"
                      className="form-control mb-2"
                      value={updatedExpenses}
                      onChange={(e) => setUpdatedExpenses(e.target.value)}
                    />

                    <label>Date</label>
                    <input
                      type="date"
                      className="form-control mb-2"
                      value={updatedDate}
                      onChange={(e) => setUpdatedDate(e.target.value)}
                    />
                  </div>

                  <div className="modal-footer">
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowEditModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-success"
                      onClick={handleUpdateSubmit}
                    >
                      Save Changes
                    </button>

                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(selectedExpense)}
                    >
                      <FontAwesomeIcon icon={faTrash} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {deleteDialog}
        </div>
      </div>
    );
  }

  return (
    <div className={`p-2 ${embedded ? "" : "container-fluid"}`}>

<div className="d-flex align-items-center justify-content-between gap-2 mb-3">
  {embedded ? (
    <button
      className="btn"
      style={{ backgroundColor: "#2563eb", color: "white", borderRadius: "10px", padding: "8px 18px" }}
      onClick={handleGoBack}
    >
      <FaArrowLeft className="me-1" />
      Back
    </button>
  ) : (
    <div style={{ width: 108 }} />
  )}

  <div className="d-flex justify-content-center align-items-center gap-2 text-center flex-grow-1">
    <div className="section-icon">
      <FaClipboardList />
    </div>
    <div className="section-text">
      {scopeLabel} Maintenance & Other Expenses
    </div>
  </div>

  <div style={{ width: 108 }} />
</div>


      {/* Only show title when full page */}
      {!embedded && <h3 className="fw-bold mb-3">Other Expense</h3>}




      {/* FILTERS */}
      <div className="filter-bar mb-3">
        <select
          className="form-select"
          style={{ width: "120px" }}
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
        >
          {years.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>

        <select
          className="form-select"
          style={{ width: "120px" }}
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        {/* Add Expense Button */}
        <button
          className="btn"
         style={{
    backgroundColor: "rgb(85, 114, 241)",
    color: "white",
  }}
          onClick={() => setShowAddModal(true)}
        >
          <FaPlus className="me-1" />
          Add Expense
        </button>

        {/* Excel Download */}
        <button
          className="btn"
           style={{
    backgroundColor: "rgb(85, 114, 241)",
    color: "white",
  }}
          onClick={downloadExcel}
        >
          <FaDownload className="me-1" />
          Download Excel
        </button>

        {/* Rent & Deposit (Hide when embedded) */}
        {!embedded && (
          <>
            <button
              className="btn"
              style={{ backgroundColor: "#3db7b1", color: "white" }}
              onClick={() => navigate("/NewComponant")}
            >
              <HiHome className="me-1" />
              Rent & Deposit
            </button>

          <button
            className="btn"
            style={{ backgroundColor: "#2563eb", color: "white", borderRadius: "10px", padding: "8px 18px" }}
            onClick={handleGoBack}
          >
              <FaArrowLeft className="me-1" />
              Back
            </button>
          </>
        )}
      </div>

      {scopeType === "bed" && (
        <div className="row g-3 mb-4 justify-content-start">
          <div className="col-12 col-sm-6 col-lg-4 col-xl-3">
            <div className="bg-white border rounded shadow-sm p-3 text-center">
              <h6 className="text-muted mb-1">Total Hostel Expense</h6>
              <h4 className="fw-bold mb-0">
                ₹{Number(hostelExpenseSummary.total || 0).toLocaleString("en-IN")}
              </h4>
            </div>
          </div>
          <div className="col-12 col-sm-6 col-lg-4 col-xl-3">
            <div className="bg-white border rounded shadow-sm p-3 text-center">
              <h6 className="text-muted mb-1">Pending Hostel Expense</h6>
              <h4 className="fw-bold text-danger mb-0">
                ₹{Number(hostelExpenseSummary.pending || 0).toLocaleString("en-IN")}
              </h4>
            </div>
          </div>
        </div>
      )}

      {scopeType === "mixed" && (
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-6 col-xl-3">
            <div className="bg-white border rounded shadow-sm p-3 text-center">
              <h6 className="text-muted mb-1">Total Room Expense</h6>
              <h4 className="fw-bold mb-0">
                ₹{Number(roomShopExpenseSummary.totalRoom || 0).toLocaleString("en-IN")}
              </h4>
            </div>
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <div className="bg-white border rounded shadow-sm p-3 text-center">
              <h6 className="text-muted mb-1">Total Shop Expense</h6>
              <h4 className="fw-bold mb-0">
                ₹{Number(roomShopExpenseSummary.totalShop || 0).toLocaleString("en-IN")}
              </h4>
            </div>
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <div className="bg-white border rounded shadow-sm p-3 text-center">
              <h6 className="text-muted mb-1">Pending Room Expense</h6>
              <h4 className="fw-bold text-danger mb-0">
                ₹{Number(roomShopExpenseSummary.pendingRoom || 0).toLocaleString("en-IN")}
              </h4>
            </div>
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <div className="bg-white border rounded shadow-sm p-3 text-center">
              <h6 className="text-muted mb-1">Pending Shop Expense</h6>
              <h4 className="fw-bold text-danger mb-0">
                ₹{Number(roomShopExpenseSummary.pendingShop || 0).toLocaleString("en-IN")}
              </h4>
            </div>
          </div>
        </div>
      )}

      {/* TABLE */}
    <div className="table-responsive mt-3">
  <div className="light-table-wrapper">
    <table className="table light-bill-table align-middle">

          <thead className="table-light">
            <tr>
              <th>#</th>
              {shouldSelectUnit && <th>{scopeUnitLabel}</th>}
              <th>Date</th>
              <th>Expenses</th>
              <th>Main Amount</th>
              <th>Status</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={shouldSelectUnit ? "7" : "6"} className="text-center">
                  No data found
                </td>
              </tr>
            ) : (
              filteredExpenses.map((item, idx) => (
                <tr key={item._id}>
                  <td>{idx + 1}</td>
                  {shouldSelectUnit && <td>{getScopedDisplayLabel(item.roomNo)}</td>}
                  <td>{new Date(item.date).toLocaleDateString()}</td>
                  <td>{item.expenses?.join(", ") || "-"}</td>
                  <td>₹{item.mainAmount?.toLocaleString()}</td>
                  <td>
                    {item.status === "paid" ? (
                      <span className="badge bg-success">Paid</span>
                    ) : (
                      <span className="badge bg-warning text-dark">
                        Pending
                      </span>
                    )}
                  </td>

                  <td className="text-center">
                    <button
                      className="btn btn-sm btn-outline-primary me-2"
                      onClick={() => handleEdit(item)}
                    >
                      <FaEdit />
                    </button>

                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDelete(item)}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
  </div>
</div>


      {/* ADD MODAL */}
      {showAddModal && (
        <div className="modal d-block" style={{ background: "#00000055" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5>Add Other Expense</h5>
                <button
                  className="btn-close"
                  onClick={() => setShowAddModal(false)} style={{padding:"0px",margin:"0px"} }
                  >
                x
                </button>
              </div>

              <div className="modal-body">
                {shouldSelectUnit && (
                  <>
                    <label>{scopeUnitLabel} No</label>
                    <select
                      className="form-select mb-2"
                      value={newEntry.roomNo}
                      onChange={(e) =>
                        setNewEntry({ ...newEntry, roomNo: e.target.value })
                      }
                    >
                      <option value="">Select {scopeUnitLabel}</option>
                      {scopedRoomNos.map((roomNo) => (
                        <option key={roomNo} value={roomNo}>
                          {getScopedDisplayLabel(roomNo)}
                        </option>
                      ))}
                    </select>
                  </>
                )}
                {/* Main Amount */}
                <label>Main Amount</label>
                <input
                  type="number"
                  className="form-control mb-2"
                  value={newEntry.mainAmount}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, mainAmount: e.target.value })
                  }
                />

                {/* Expenses array input */}
                <label>Expenses</label>
                {newEntry.expenses.map((exp, idx) => (
                  <div key={idx} className="d-flex mb-2">
                    <input
                      type="text"
                      className="form-control"
                      value={exp}
                      placeholder={`Expense ${idx + 1}`}
                      onChange={(e) => {
                        const arr = [...newEntry.expenses];
                        arr[idx] = e.target.value;
                        setNewEntry({ ...newEntry, expenses: arr });
                      }}
                    />

                    <button
                      className="btn btn-danger ms-2"
                      onClick={() => {
                        const arr = newEntry.expenses.filter(
                          (_, i) => i !== idx
                        );
                        setNewEntry({ ...newEntry, expenses: arr });
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}

                <button
                  className="btn btn-secondary mb-3"
                  onClick={() =>
                    setNewEntry({
                      ...newEntry,
                      expenses: [...newEntry.expenses, ""],
                    })
                  }
                >
                  Add Expense
                </button>

                {/* Date */}
                <label>Date</label>
                <input
                  type="date"
                  className="form-control mb-2"
                  value={newEntry.date}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, date: e.target.value })
                  }
                />

                {/* Status */}
                <label>Status</label>
                <select
                  className="form-select"
                  value={newEntry.status}
                  onChange={(e) =>
                    setNewEntry({
                      ...newEntry,
                      status: e.target.value,
                    })
                  }
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button className="btn btn-success" onClick={handleAddExpense}>
                  Save Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="modal d-block" style={{ background: "#00000055" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5>Edit Expense</h5>
                <button
                  className="btn-close"
                  onClick={() => setShowEditModal(false)}
                />
              </div>

              <div className="modal-body">
                <label>Status</label>
                <select
                  className="form-select mb-2"
                  value={updatedStatus}
                  onChange={(e) => setUpdatedStatus(e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>

                <label>Main Amount</label>
                <input
                  type="number"
                  className="form-control mb-2"
                  value={updatedMainAmount}
                  onChange={(e) => setUpdatedMainAmount(e.target.value)}
                />

                <label>Expenses (comma separated)</label>
                <input
                  type="text"
                  className="form-control mb-2"
                  value={updatedExpenses}
                  onChange={(e) => setUpdatedExpenses(e.target.value)}
                />

                <label>Date</label>
                <input
                  type="date"
                  className="form-control mb-2"
                  value={updatedDate}
                  onChange={(e) => setUpdatedDate(e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-success"
                  onClick={handleUpdateSubmit}
                >
                  Save Changes
                </button>

                <button
                  className="btn btn-danger"
                  onClick={() => handleDelete(selectedExpense)}
                >
                  <FontAwesomeIcon icon={faTrash} /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {deleteDialog}
    </div>
  );
};

export default OtherExpense;
