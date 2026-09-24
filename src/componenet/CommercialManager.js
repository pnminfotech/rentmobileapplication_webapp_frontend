import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaEdit, FaStore, FaTrash } from "react-icons/fa";
import { API_BASE } from "../api";
import "../Pages/RoomManager.css";

const apiUrl = `${API_BASE}/commercial-units`;

const EMPTY_FORM = {
  category: "",
  buildingName: "",
  floorNo: "",
  unitType: "room",
  unitNo: "",
  price: "",
};

export default function CommercialManager() {
  const navigate = useNavigate();
  const [units, setUnits] = useState([]);
  const [search, setSearch] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [priceEditTarget, setPriceEditTarget] = useState({
    unitId: "",
    unitNo: "",
    buildingName: "",
    unitType: "room",
    price: "",
  });
  const [deleteTarget, setDeleteTarget] = useState({
    unitId: "",
    unitNo: "",
    buildingName: "",
    unitType: "room",
    password: "",
  });

  const fetchUnits = async () => {
    try {
      const res = await axios.get(apiUrl);
      setUnits(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch commercial units:", err);
      alert("Failed to load commercial rooms and shops.");
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const buildingOptions = useMemo(
    () =>
      Array.from(new Set(units.map((unit) => String(unit.buildingName || "").trim()).filter(Boolean))),
    [units]
  );

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLowerCase();
    return units.filter((unit) => {
      if (buildingFilter && String(unit.buildingName || "") !== buildingFilter) return false;
      if (typeFilter !== "all" && String(unit.unitType || "") !== typeFilter) return false;
      if (!q) return true;

      return [
        unit.category,
        unit.buildingName,
        unit.floorNo,
        unit.unitNo,
        unit.unitType,
      ]
        .map((value) => String(value || "").toLowerCase())
        .some((value) => value.includes(q));
    });
  }, [units, search, buildingFilter, typeFilter]);

  const groupedUnits = useMemo(() => {
    return filteredUnits.reduce((acc, unit) => {
      const key = String(unit.buildingName || "Unknown Building").trim() || "Unknown Building";
      if (!acc[key]) acc[key] = [];
      acc[key].push(unit);
      return acc;
    }, {});
  }, [filteredUnits]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.category.trim() || !form.buildingName.trim() || !form.unitNo.trim()) {
      alert("Category, Building Name and Room/Shop No are required.");
      return;
    }

    const payload = {
      category: form.category.trim(),
      buildingName: form.buildingName.trim(),
      floorNo: form.floorNo.trim(),
      unitType: form.unitType,
      unitNo: form.unitNo.trim(),
      price: form.price === "" ? "" : Number(form.price),
    };

    try {
      setSaving(true);
      if (editingId) {
        await axios.put(`${apiUrl}/${editingId}`, payload);
      } else {
        await axios.post(apiUrl, payload);
      }
      setForm(EMPTY_FORM);
      setEditingId("");
      await fetchUnits();
    } catch (err) {
      console.error("Failed to save commercial unit:", err);
      alert(err.response?.data?.message || "Failed to save commercial unit.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (unit) => {
    setEditingId(unit._id);
    setForm({
      category: unit.category || "",
      buildingName: unit.buildingName || "",
      floorNo: unit.floorNo || "",
      unitType: unit.unitType || "room",
      unitNo: unit.unitNo || "",
      price: unit.price ?? "",
    });
  };

  const openDeleteModal = (unit) => {
    setDeleteTarget({
      unitId: unit._id,
      unitNo: unit.unitNo || "",
      buildingName: unit.buildingName || "",
      unitType: unit.unitType || "room",
      password: "",
    });
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (deleteTarget.password !== "987654") {
      alert("Invalid password.");
      return;
    }

    try {
      await axios.delete(`${apiUrl}/${deleteTarget.unitId}`);
      setDeleteModalOpen(false);
      await fetchUnits();
    } catch (err) {
      console.error("Failed to delete commercial unit:", err);
      alert(err.response?.data?.message || "Failed to delete commercial unit.");
    }
  };

  const openPriceModal = (unit) => {
    setPriceEditTarget({
      unitId: unit._id,
      unitNo: unit.unitNo || "",
      buildingName: unit.buildingName || "",
      unitType: unit.unitType || "room",
      price: unit.price ?? "",
    });
    setPriceModalOpen(true);
  };

  const saveUnitPrice = async () => {
    const nextPrice =
      priceEditTarget.price === "" || priceEditTarget.price == null
        ? ""
        : Number(priceEditTarget.price);

    if (nextPrice !== "" && (Number.isNaN(nextPrice) || nextPrice < 0)) {
      alert("Please enter a valid price.");
      return;
    }

    try {
      await axios.put(`${apiUrl}/${priceEditTarget.unitId}`, { price: nextPrice });
      setPriceModalOpen(false);
      await fetchUnits();
    } catch (err) {
      console.error("Failed to update commercial price:", err);
      alert(err.response?.data?.message || "Failed to update price.");
    }
  };

  const totalRooms = units.filter((unit) => unit.unitType === "room").length;
  const totalShops = units.filter((unit) => unit.unitType === "shop").length;

  return (
    <div
      className="container-fluid px-3 px-md-4 py-3"
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      <div className="d-none d-md-block">
        <div className="card border-0 mb-3" style={{ background: "transparent" }}>
          <div className="card-body p-0">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn me-2"
                  style={{ backgroundColor: "#5f7dfc", color: "white" }}
                  onClick={() => navigate(-1)}
                >
                  <FaArrowLeft className="me-1" />
                  Back
                </button>
              </div>

              <div className="me-md-auto d-flex align-items-center gap-2">
                <h4 className="fw-bold mb-0 d-none d-md-block">Manage Commercial Units</h4>
                <span className="badge bg-light text-dark border d-none d-md-inline">
                  Rooms &amp; Shops
                </span>
              </div>

              <div className="ms-md-auto flex-grow-1" style={{ maxWidth: 420 }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search room / shop / floor / category / building"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-12 col-lg-6">
            <div className="bg-white border rounded-3 shadow-sm p-3 h-100">
              <h6 className="text-muted mb-2">
                {editingId ? "Edit Commercial Unit" : "Quick Add Commercial Unit"}
              </h6>

              <form onSubmit={handleSubmit} className="d-grid" style={{ gap: "8px" }}>
                <input
                  className="form-control form-control-sm"
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="Category (e.g., Market)"
                />

                <input
                  className="form-control form-control-sm"
                  value={form.buildingName}
                  onChange={(e) => setForm((prev) => ({ ...prev, buildingName: e.target.value }))}
                  placeholder="Building Name (e.g., Plaza 1)"
                />

                <input
                  className="form-control form-control-sm"
                  value={form.floorNo}
                  onChange={(e) => setForm((prev) => ({ ...prev, floorNo: e.target.value }))}
                  placeholder="Floor No (e.g., Ground, 1st)"
                />

                <select
                  className="form-select form-select-sm"
                  value={form.unitType}
                  onChange={(e) => setForm((prev) => ({ ...prev, unitType: e.target.value }))}
                >
                  <option value="room">Commercial Room</option>
                  <option value="shop">Shop</option>
                </select>

                <input
                  className="form-control form-control-sm"
                  value={form.unitNo}
                  onChange={(e) => setForm((prev) => ({ ...prev, unitNo: e.target.value }))}
                  placeholder={form.unitType === "shop" ? "Shop No (e.g., S-01)" : "Room No (e.g., 101)"}
                />

                <input
                  type="number"
                  min="0"
                  className="form-control form-control-sm"
                  value={form.price}
                  onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                  placeholder="Monthly Rent (Rs.)"
                />

                <div className="d-flex gap-2">
                  <button
                    className="btn btn-sm px-3 text-white"
                    style={{ backgroundColor: "#5f7dfc" }}
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : editingId ? "Update" : "Add"}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => {
                        setEditingId("");
                        setForm(EMPTY_FORM);
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          <div className="col-6 col-md-6 col-lg-3">
            <div className="bg-white border rounded-3 shadow-sm p-3 h-100 d-flex align-items-center">
              <div
                className="rounded-circle d-inline-flex justify-content-center align-items-center me-3"
                style={{ width: 42, height: 42, background: "#eef5ff" }}
              >
                <FaStore />
              </div>
              <div>
                <div className="text-muted small">Commercial Rooms</div>
                <div className="fw-bold fs-4">{totalRooms}</div>
              </div>
            </div>
          </div>

          <div className="col-6 col-md-6 col-lg-3">
            <div className="bg-white border rounded-3 shadow-sm p-3 h-100 d-flex align-items-center">
              <div
                className="rounded-circle d-inline-flex justify-content-center align-items-center me-3"
                style={{ width: 42, height: 42, background: "#eefaf4" }}
              >
                <FaStore />
              </div>
              <div>
                <div className="text-muted small">Shops</div>
                <div className="fw-bold fs-4">{totalShops}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card shadow-sm">
          <div className="card-body">
            <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 w-100">
              <div
                className="d-flex flex-wrap align-items-center gap-2 flex-shrink-0"
                style={{ minWidth: 260 }}
              >
                <label className="form-label mb-0 me-2">Building</label>
                <div className="badge text-bg-light border text-capitalize">
                  Commercial
                </div>
                <select
                  className="form-select form-select-sm"
                  value={buildingFilter}
                  onChange={(e) => setBuildingFilter(e.target.value)}
                >
                  <option value="">All Buildings</option>
                  {buildingOptions.map((building) => (
                    <option key={building} value={building}>
                      {building}
                    </option>
                  ))}
                </select>
              </div>

              <h5 className="fw-bold mb-0 text-center flex-grow-1 d-none d-md-block">
                Commercial Rooms &amp; Shops
              </h5>

              <div className="d-flex gap-2 flex-shrink-0">
                <select
                  className="form-select form-select-sm"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="room">Rooms</option>
                  <option value="shop">Shops</option>
                </select>
              </div>
            </div>

            {!filteredUnits.length && (
              <div className="text-center text-muted py-4">No commercial units found.</div>
            )}

            {!!filteredUnits.length && (
              <div className="d-grid gap-3">
                {Object.entries(groupedUnits).map(([buildingName, buildingUnits]) => (
                  <div key={buildingName} className="border rounded p-3">
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                      <div>
                        <div className="fw-semibold">{buildingName}</div>
                        <div className="small text-muted">
                          {buildingUnits[0]?.category || "-"} • {buildingUnits.length} units
                        </div>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-bordered table-sm align-middle mb-0">
                        <thead>
                          <tr className="fw-semibold text-secondary">
                            <th style={{ whiteSpace: "nowrap" }}>Unit No</th>
                            <th style={{ whiteSpace: "nowrap" }}>Floor</th>
                            <th style={{ whiteSpace: "nowrap" }}>Type</th>
                            <th style={{ whiteSpace: "nowrap" }}>Category</th>
                            <th style={{ whiteSpace: "nowrap" }}>Rent</th>
                            <th style={{ whiteSpace: "nowrap" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {buildingUnits.map((unit) => (
                            <tr key={unit._id}>
                              <td className="fw-semibold">
                                <span
                                  className="roomNoPill"
                                  style={{ "--bg": "rgba(95, 125, 252, 0.14)", "--fg": "#2f3fb8" }}
                                >
                                  {unit.unitNo}
                                </span>
                              </td>
                              <td>{unit.floorNo || "-"}</td>
                              <td className="text-capitalize">{unit.unitType}</td>
                              <td>{unit.category || "-"}</td>
                              <td>
                                {unit.price != null ? `₹${Number(unit.price).toLocaleString("en-IN")}` : "-"}
                              </td>
                              <td>
                                <div className="d-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => openPriceModal(unit)}
                          >
                            Edit Price
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleEdit(unit)}
                          >
                            <FaEdit />
                                  </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => openDeleteModal(unit)}
                          >
                            <FaTrash />
                          </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {priceModalOpen && (
        <div
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "12px",
            zIndex: 9999,
          }}
          onClick={() => setPriceModalOpen(false)}
        >
          <div
            className="modal-content"
            style={{ width: "100%", maxWidth: "520px", borderRadius: "14px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header bg-white">
              <h6 className="modal-title mb-0">
                Edit Price - {priceEditTarget.unitType === "shop" ? "Shop" : "Room"}{" "}
                {priceEditTarget.unitNo} - {priceEditTarget.buildingName || "-"}
              </h6>
              <button
                type="button"
                className="btn-close p-0"
                onClick={() => setPriceModalOpen(false)}
              >
                x
              </button>
            </div>

            <div className="modal-body">
              <label className="form-label mb-2">Price</label>
              <div className="input-group">
                <span className="input-group-text">₹</span>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  value={priceEditTarget.price}
                  onChange={(e) =>
                    setPriceEditTarget((prev) => ({ ...prev, price: e.target.value }))
                  }
                  placeholder="Enter monthly rent"
                />
              </div>
            </div>

            <div className="modal-footer d-grid gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPriceModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-warning"
                onClick={saveUnitPrice}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "12px",
            zIndex: 9999,
          }}
          onClick={() => setDeleteModalOpen(false)}
        >
          <div
            className="modal-content"
            style={{ width: "100%", maxWidth: "520px", borderRadius: "14px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header bg-white">
              <h6 className="modal-title mb-0">
                Delete {deleteTarget.unitType === "shop" ? "Shop" : "Room"} - {deleteTarget.unitNo}
              </h6>
              <button
                type="button"
                className="btn-close p-0"
                onClick={() => setDeleteModalOpen(false)}
              >
                x
              </button>
            </div>

            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label mb-2">Building</label>
                <input
                  className="form-control"
                  value={deleteTarget.buildingName}
                  readOnly
                />
              </div>

              <div className="mb-3">
                <label className="form-label mb-2">Password (required to delete)</label>
                <input
                  type="password"
                  className="form-control"
                  value={deleteTarget.password}
                  onChange={(e) =>
                    setDeleteTarget((prev) => ({ ...prev, password: e.target.value }))
                  }
                  placeholder="Enter password"
                />
              </div>

              <div className="alert alert-warning small mt-2 mb-0">
                This will permanently remove the selected {deleteTarget.unitType === "shop" ? "shop" : "room"}.
              </div>
            </div>

            <div className="modal-footer d-grid gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
              >
                Delete {deleteTarget.unitType === "shop" ? "Shop" : "Room"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
