import React, { useEffect, useState } from "react";
import { api } from "../api";
import "../Pages/lightbill.css";
import "../componenet/RentTracker.css";
import { FaArrowLeft, FaEdit, FaPlus, FaRedoAlt } from "react-icons/fa";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
export default function StaffExpenses({ embedded = false, openAddModal = false, onModalOpened }) {
  const navigate = useNavigate();

const apiUrl = (process.env.REACT_APP_API_URL || "   http://localhost:8000/api/")
  .replace(/\/?$/, "/"); // ✅ always ends with /


  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );

  const [monthFilter, setMonthFilter] = useState(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${m}`; // YYYY-MM
  });

  const [showExpensesModal, setShowExpensesModal] = useState(false);
const [editId, setEditId] = useState(null);
const [isEditMode, setIsEditMode] = useState(false);

  const [expensesForm, setExpensesForm] = useState({
    type: "Employee",
    name: "",
    month: "",
    amount: "",
    notes: "",
  });

const fetchExpenses = async () => {
  try {
    setLoading(true);

    // ✅ your backend GET is /all
    const res = await api.get("/staff-expenses/all");

    const list = (res.data || []).map((x) => ({
      ...x,
      month: x.date ? String(x.date).slice(0, 7) : "", // "YYYY-MM"
    }));

    // ✅ filter using monthFilter
    const filtered = list.filter((x) => x.month === monthFilter);

    setItems(filtered);
  } catch (err) {
    console.error("Fetch staff expenses error:", err);
    setItems([]);
  } finally {
    setLoading(false);
  }
};
const handleEdit = (item) => {
  setIsEditMode(true);
  setEditId(item._id);

  setExpensesForm({
    type: item.type,
    name: item.name,
    month: item.month,
    amount: item.amount,
    notes: item.notes || "",
  });

  setShowExpensesModal(true);
};

const handleDelete = (item) => {
  deleteExpense(item._id);
};

  const openAddExpenseModal = () => {
    setExpensesForm((p) => ({ ...p, month: monthFilter || "" }));
    setShowExpensesModal(true);
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/maindashboard");
  };


  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthFilter]);


  useEffect(() => {
  if (openAddModal) {
    // auto set month in modal and open it
    setExpensesForm((p) => ({ ...p, month: monthFilter || "" }));
    setShowExpensesModal(true);

    // reset trigger in parent so it doesn't reopen again
    onModalOpened?.();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [openAddModal]);

const saveExpense = async () => {
  try {
    if (!expensesForm.month) return alert("Please select Month");
    if (!expensesForm.type) return alert("Please select Expense Type");
    if (!expensesForm.name?.trim()) return alert("Please enter Name");
    if (!expensesForm.amount || Number(expensesForm.amount) <= 0)
      return alert("Please enter Amount");

    const payload = {
      type: expensesForm.type,
      name: expensesForm.name.trim(),
      month: expensesForm.month,
      amount: Number(expensesForm.amount),
      notes: expensesForm.notes || "",
      status: "pending",
      date: `${expensesForm.month}-01`,
    };

    if (isEditMode) {
      // ✅ EDIT (same as Expenses)
      await api.put(`/staff-expenses/${editId}`, payload);
    } else {
      // ✅ ADD
      await api.post("/staff-expenses", payload);
    }

    setShowExpensesModal(false);
    setIsEditMode(false);
    setEditId(null);

    setExpensesForm({
      type: "Employee",
      name: "",
      month: "",
      amount: "",
      notes: "",
    });

    fetchExpenses();
  } catch (err) {
    console.error("Save staff expense error:", err);
    alert(err?.response?.data?.message || "Failed to save expense");
  }
};


  const deleteExpense = async (id) => {
    if (!window.confirm("Delete this expense?")) return;
    try {
      await api.delete(`/staff-expenses/${id}`);
      fetchExpenses();
    } catch (err) {
      console.error("Delete staff expense error:", err);
      alert(err?.response?.data?.message || "Failed to delete expense");
    }
  };

  const total = items.reduce((sum, x) => sum + (Number(x.amount) || 0), 0);

  if (isMobile) {
    return (
      <div className="rent-mobile-view">
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
                <h5>Staff Expenses</h5>
                <div className="rent-mobile-badge">Tap an item to edit</div>
              </div>
              <div className="rent-mobile-badge">
                {items.length} {items.length === 1 ? "item" : "items"}
              </div>
            </div>

            <div className="rent-mobile-actions">
              <input
                type="month"
                className="form-select"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
              />

              <button type="button" className="rent-mobile-action primary addstaff" onClick={openAddExpenseModal}>
                <FaPlus className="me-1" />
                Add Expense
              </button>
            </div>

            <div className="rent-mobile-tenant-list">
              {loading ? (
                <div className="rent-mobile-empty">Loading...</div>
              ) : items.length === 0 ? (
                <div className="rent-mobile-empty">No expenses found for {monthFilter}</div>
              ) : (
                items.map((x) => (
                  <article
                    key={x._id}
                    className="rent-mobile-tenant-card rent-mobile-tenant-card--pend"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleEdit(x)}
                    onKeyDown={(e) => e.key === "Enter" && handleEdit(x)}
                  >
                    <div className="rent-mobile-tenant-core">
                      <div className="rent-mobile-tenant-head">
                        <div className="rent-mobile-tenant-avatar">
                          {(x.name || x.type || "S").charAt(0).toUpperCase()}
                        </div>

                        <div className="rent-mobile-tenant-main text-justify">
                          <div className="rent-mobile-tenant-name">{x.name || "-"}</div>
                          <div className="rent-mobile-tenant-meta">{x.type || "-"}</div>
                          <div className="rent-mobile-tenant-meta">
                            Month: <span className="lb-highlight-date">{x.month || "-"}</span>
                          </div>
                          <div className="rent-mobile-tenant-meta">
                            Amount:{" "}
                            <span className="lb-highlight-date">
                              ₹{Number(x.amount || 0).toLocaleString("en-IN")}
                            </span>
                          </div>
                          {x.notes ? <div className="rent-mobile-tenant-meta">{x.notes}</div> : null}
                        </div>
                      </div>
                    </div>

                    <div className="rent-mobile-card-actions">
                      <button
                        type="button"
                        className="rent-mobile-action secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(x);
                        }}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="rent-mobile-action warn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(x);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <div className="rent-mobile-actionbar" aria-label="Staff expense quick actions">
            <button type="button" className="rent-mobile-actionbar-btn" onClick={openAddExpenseModal}>
              <span className="rent-mobile-actionbar-icon">
                <FaPlus />
              </span>
              <span>Add</span>
            </button>

            <button type="button" className="rent-mobile-actionbar-btn" onClick={fetchExpenses}>
              <span className="rent-mobile-actionbar-icon">
                <FaRedoAlt />
              </span>
              <span>Refresh</span>
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

          {showExpensesModal && (
            <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)" }}>
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      {isEditMode ? "Edit Expense" : "Add Staff Expense"}
                    </h5>

                    <button
                      className="btn-close p-0"
                      onClick={() => setShowExpensesModal(false)}
                    >
                      x
                    </button>
                  </div>

                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Expense Type</label>
                      <select
                        className="form-select"
                        value={expensesForm.type}
                        onChange={(e) =>
                          setExpensesForm((prev) => ({ ...prev, type: e.target.value }))
                        }
                      >
                        <option value="Employee">Employee Salary</option>
                        <option value="Cleaning Lady">Maushi</option>
                        <option value="Security">Security</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Name (Employee / Cleaning Lady)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Sunita (Cleaning Lady)"
                        value={expensesForm.name}
                        onChange={(e) =>
                          setExpensesForm((prev) => ({ ...prev, name: e.target.value }))
                        }
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Month</label>
                      <input
                        type="month"
                        className="form-control"
                        value={expensesForm.month}
                        onChange={(e) =>
                          setExpensesForm((prev) => ({ ...prev, month: e.target.value }))
                        }
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Amount (₹)</label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        value={expensesForm.amount}
                        onChange={(e) =>
                          setExpensesForm((prev) => ({ ...prev, amount: e.target.value }))
                        }
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Notes / Details</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        placeholder="e.g. Monthly salary, extra cleaning on weekend, etc."
                        value={expensesForm.notes}
                        onChange={(e) =>
                          setExpensesForm((prev) => ({ ...prev, notes: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowExpensesModal(false);
                        setIsEditMode(false);
                        setEditId(null);
                      }}
                    >
                      Cancel
                    </button>

                    <button className="btn btn-primary" onClick={saveExpense}>
                      {isEditMode ? "Save Changes" : "Save Expense"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>

        <div className="d-flex justify-content-center align-items-center gap-2 mb-3">
  <div className="section-icon">👷</div>
  <div className="section-text">Staff Expenses</div>
</div>

  <div className="filter-bar mb-3">
  <input
    type="month"
    className="form-select"
    value={monthFilter}
    onChange={(e) => setMonthFilter(e.target.value)}
  />

  <button
    className="btn"
   style={{
    backgroundColor: "rgb(85, 114, 241)",
    color: "white",
  }}
    onClick={() => {
      setExpensesForm((p) => ({ ...p, month: monthFilter || "" }));
      setShowExpensesModal(true);
    }}
  >
    + Add Expense
  </button>
</div>


   <div className="mb-3 fw-semibold text-primary">
  Total: ₹{Number(total).toLocaleString("en-IN")}
</div>

<div className="table-responsive">
  <div className="light-table-wrapper">
    <table className="table light-bill-table align-middle">

          <thead>
            <tr>
              <th style={{ whiteSpace: "nowrap" }}>Type</th>
              <th style={{ minWidth: 220 }}>Name</th>
              <th style={{ whiteSpace: "nowrap" }}>Month</th>
              <th style={{ whiteSpace: "nowrap" }}>Amount</th>
              <th style={{ minWidth: 260 }}>Notes</th>
              <th style={{ whiteSpace: "nowrap" }}>Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-4">
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-4 text-muted">
                  No expenses found for {monthFilter}
                </td>
              </tr>
            ) : (
              items.map((x) => (
                <tr key={x._id}>
                  <td>{x.type}</td>
                  <td className="fw-semibold">{x.name}</td>
                  <td>{x.month}</td>
                  <td className="fw-semibold">
                    ₹{Number(x.amount).toLocaleString("en-IN")}
                  </td>
                  <td>{x.notes || "-"}</td>
                 <td className="text-center">
  <button
    className="btn btn-sm btn-outline-primary me-2"
    onClick={() => handleEdit(x)}
  >
    <FaEdit />
  </button>

  <button
    className="btn btn-sm btn-outline-danger"
    onClick={() => handleDelete(x)}
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

      {/* ================= MODAL ================= */}
      {showExpensesModal && (
        <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
              <h5 className="modal-title">
  {isEditMode ? "Edit Expense" : "Add Staff Expense"}
</h5>

                <button
                  className="btn-close p-0"
                  onClick={() => setShowExpensesModal(false)}
                >
                  x
                </button>
              </div>

              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Expense Type</label>
                  <select
                    className="form-select"
                    value={expensesForm.type}
                    onChange={(e) =>
                      setExpensesForm((prev) => ({ ...prev, type: e.target.value }))
                    }
                  >
                    <option value="Employee">Employee Salary</option>
                    <option value="Cleaning Lady">Maushi</option>
                    <option value="Security">Security</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">Name (Employee / Cleaning Lady)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Sunita (Cleaning Lady)"
                    value={expensesForm.name}
                    onChange={(e) =>
                      setExpensesForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Month</label>
                  <input
                    type="month"
                    className="form-control"
                    value={expensesForm.month}
                    onChange={(e) =>
                      setExpensesForm((prev) => ({ ...prev, month: e.target.value }))
                    }
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Amount (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    value={expensesForm.amount}
                    onChange={(e) =>
                      setExpensesForm((prev) => ({ ...prev, amount: e.target.value }))
                    }
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Notes / Details</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="e.g. Monthly salary, extra cleaning on weekend, etc."
                    value={expensesForm.notes}
                    onChange={(e) =>
                      setExpensesForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="modal-footer">
              <button
  className="btn btn-secondary"
  onClick={() => {
    setShowExpensesModal(false);
    setIsEditMode(false);
    setEditId(null);
  }}
>
  Cancel
</button>

               <button className="btn btn-primary" onClick={saveExpense}>
  {isEditMode ? "Save Changes" : "Save Expense"}
</button>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}   
