import React, { useCallback, useState } from "react";
import axios from "axios";
import { FaPlus } from "react-icons/fa";

// Props expected:
// showAddModal, setShowAddModal
// newTenant, setNewTenant
// roomsData, setRoomsData, occupiedBeds
// handleDocsChange, docMsg, docFiles, setDocFiles, removeDoc
// handleAddTenantWithDocs
const AddTenantModal = ({
  showAddModal,
  setShowAddModal,
  newTenant,
  setNewTenant,
  roomsData,
  setRoomsData,
  occupiedBeds,
  handleDocsChange,
  docMsg,
  docFiles,
  setDocFiles,
  removeDoc,
  handleAddTenantWithDocs,
}) => {
  // ===== Share + Import handlers =====

  // Link to the page that renders this modal (auto-opens using a query param).
  const buildAddTenantUrl = useCallback(() => {
    // change path if your real route is different
    return `${window.location.origin}/HostelManager/add-data?openAddTenant=1`;
  }, []);

  const handleShareAddTenantModal = useCallback(async () => {
    const url = buildAddTenantUrl();
    const shareData = {
      title: "Add Tenant",
      text: "Open this link to add a tenant (modal opens automatically).",
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        alert("Link copied to clipboard.");
      }
    } catch (err) {
      console.error("Share failed:", err);
      try {
        await navigator.clipboard.writeText(url);
        alert("Could not open share dialog. Link copied to clipboard instead.");
      } catch {
        alert("Could not share or copy. Please copy this link:\n" + url);
      }
    }
  }, [buildAddTenantUrl]);

  const [importingForm, setImportingForm] = useState(false);

  const handleImportLatestForm = async () => {
    if (importingForm) return;
    setImportingForm(true);
    try {
      const phone = (newTenant?.phoneNo || "").trim();

      let res;
      if (phone) {
        // newest first by phone
        res = await axios.get("http://localhost:5000/api/forms", {
          params: { phoneNo: phone, limit: 1, sort: "-createdAt" },
        });
      } else {
        // global latest
        res = await axios.get("http://localhost:5000/api/forms/latest");
      }

      const data = res?.data;
      const form = Array.isArray(data) ? (data[0] || null) : data || null;
      if (!form) {
        alert("No form found to import yet.");
        return;
      }

      // map form -> modal fields
      setNewTenant((prev) => ({
        ...prev,
        srNo: form.srNo ?? prev.srNo ?? "",
        name: form.name ?? prev.name ?? "",
        joiningDate: form.joiningDate ?? prev.joiningDate ?? "",
        depositAmount: form.depositAmount ?? prev.depositAmount ?? "",
        address: form.address ?? prev.address ?? "",
        phoneNo: form.phoneNo ?? prev.phoneNo ?? "",
        relativeAddress: form.relativeAddress ?? prev.relativeAddress ?? "",
        relativeAddress1: form.relativeAddress1 ?? prev.relativeAddress1 ?? "",
        relativeAddress2: form.relativeAddress2 ?? prev.relativeAddress2 ?? "",
        companyAddress: form.companyAddress ?? prev.companyAddress ?? "",
        dateOfJoiningCollege: form.dateOfJoiningCollege ?? prev.dateOfJoiningCollege ?? "",
        dob: form.dob ?? prev.dob ?? "",
        roomNo: form.roomNo ?? prev.roomNo ?? "",
        floorNo: form.floorNo ?? prev.floorNo ?? "",
        bedNo: form.bedNo ?? prev.bedNo ?? "",
        canteen:
          String(form.canteen ?? prev.canteen ?? "no").trim().toLowerCase() === "yes"
            ? "yes"
            : "no",
      }));

      alert("Imported latest form data into this tenant.");
    } catch (err) {
      console.error(err);
      alert("Could not import latest form. Check API routes or network.");
    } finally {
      setImportingForm(false);
    }
  };

  if (!showAddModal) return null;

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable modal-fullscreen-md-down">
        <div className="modal-content">
          {/* Header */}
          <div className="modal-header">
            <h5 className="modal-title">Add New Tenant</h5>
            <button type="button" className="btn-close" onClick={() => setShowAddModal(false)} />
          </div>

          {/* Body */}
          <div className="modal-body">
            {/* Sharable link (copy / open) */}
            <div className="alert alert-light d-flex align-items-center gap-2" role="alert">
              <input type="text" className="form-control" value={buildAddTenantUrl()} readOnly />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(buildAddTenantUrl());
                    alert("Link copied to clipboard.");
                  } catch {
                    alert("Could not copy. Please copy manually.");
                  }
                }}
              >
                Copy
              </button>
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={() => window.open(buildAddTenantUrl(), "_blank", "noopener,noreferrer")}
              >
                Open
              </button>
            </div>

            <div className="container-fluid">
              <div className="row g-3">
                {/* Row 1: Sr No + Name */}
                <div className="col-12 col-md-6">
                  <label className="form-label">Sr No</label>
                  <input type="text" className="form-control" value={newTenant.srNo || ""} readOnly />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newTenant.name || ""}
                    onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                  />
                </div>

                {/* Row 2: Phone + Address */}
                <div className="col-12 col-md-6">
                  <label className="form-label">Phone No</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={newTenant.phoneNo || ""}
                    onChange={(e) => setNewTenant({ ...newTenant, phoneNo: e.target.value })}
                    placeholder="10-digit number"
                  />
                  {newTenant.phoneNo &&
                    !/^\d{10}$/.test(String(newTenant.phoneNo).trim()) && (
                      <small className="text-danger">Enter 10-digit number</small>
                    )}
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Address</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newTenant.address || ""}
                    onChange={(e) => setNewTenant({ ...newTenant, address: e.target.value })}
                    placeholder="House, Street, City"
                  />
                </div>

                {/* Row 3: Joining Date + DOB */}
                <div className="col-12 col-md-6">
                  <label className="form-label">Joining Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={newTenant.joiningDate || ""}
                    onChange={(e) => setNewTenant({ ...newTenant, joiningDate: e.target.value })}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Date of Birth</label>
                  <input
                    type="date"
                    className="form-control"
                    value={newTenant.dob || ""}
                    onChange={(e) => setNewTenant({ ...newTenant, dob: e.target.value })}
                  />
                </div>

                {/* Row 4: Relative Address + Company/College */}
                <div className="col-12 col-md-6">
                  <label className="form-label">Relative Address</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newTenant.relativeAddress || newTenant.RelativeAddress || ""}
                    onChange={(e) => setNewTenant({ ...newTenant, relativeAddress: e.target.value })}
                    placeholder="Optional single-line relative address"
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Company Address / College</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newTenant.companyAddress || ""}
                    onChange={(e) => setNewTenant({ ...newTenant, companyAddress: e.target.value })}
                  />
                </div>

                {/* Relatives Side-by-side */}
                <div className="col-12 col-md-6">
                  <div className="border rounded p-3 h-100">
                    <h6 className="mb-3">Relative 1</h6>
                    <label className="form-label">Relation</label>
                    <select
                      className="form-select mb-2"
                      value={newTenant.relative1Relation || "Self"}
                      onChange={(e) => setNewTenant({ ...newTenant, relative1Relation: e.target.value })}
                    >
                      {["Self", "Sister", "Brother", "Father", "Husband", "Mother"].map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>

                    <label className="form-label">Name</label>
                    <input
                      type="text"
                      className="form-control mb-2"
                      placeholder="Name"
                      value={newTenant.relative1Name || ""}
                      onChange={(e) => setNewTenant({ ...newTenant, relative1Name: e.target.value })}
                    />

                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="Phone"
                      value={newTenant.relative1Phone || ""}
                      onChange={(e) => setNewTenant({ ...newTenant, relative1Phone: e.target.value })}
                    />
                    {newTenant.relative1Phone &&
                      !/^\d{10}$/.test(String(newTenant.relative1Phone).trim()) && (
                        <small className="text-danger">Enter 10-digit number</small>
                      )}
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="border rounded p-3 h-100">
                    <h6 className="mb-3">Relative 2</h6>
                    <label className="form-label">Relation</label>
                    <select
                      className="form-select mb-2"
                      value={newTenant.relative2Relation || "Self"}
                      onChange={(e) => setNewTenant({ ...newTenant, relative2Relation: e.target.value })}
                    >
                      {["Self", "Sister", "Brother", "Father", "Husband", "Mother"].map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>

                    <label className="form-label">Name</label>
                    <input
                      type="text"
                      className="form-control mb-2"
                      placeholder="Name"
                      value={newTenant.relative2Name || ""}
                      onChange={(e) => setNewTenant({ ...newTenant, relative2Name: e.target.value })}
                    />

                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="Phone"
                      value={newTenant.relative2Phone || ""}
                      onChange={(e) => setNewTenant({ ...newTenant, relative2Phone: e.target.value })}
                    />
                    {newTenant.relative2Phone &&
                      !/^\d{10}$/.test(String(newTenant.relative2Phone).trim()) && (
                        <small className="text-danger">Enter 10-digit number</small>
                      )}
                  </div>
                </div>

                {/* Room + Bed */}
                <div className="col-12 col-md-6">
                  <label className="form-label">Room No</label>
                  <select
                    className="form-select"
                    value={newTenant.roomNo || ""}
                    onChange={(e) => {
                      const roomNo = e.target.value;
                      const selectedRoom = roomsData.find((room) => String(room.roomNo) === String(roomNo));
                      setNewTenant((prev) => ({
                        ...prev,
                        roomNo,
                        bedNo: "",
                        floorNo: selectedRoom?.floorNo || "",
                        baseRent: "",
                        rentAmount: "",
                        newBedNo: "",
                        newBedPrice: "",
                        __bedMsg: "",
                        __savingBed: false,
                      }));
                    }}
                  >
                    <option value="">Select Room</option>
                    {roomsData.map((room) => (
                      <option key={room.roomNo} value={room.roomNo}>
                        {room.roomNo} (Floor {room.floorNo})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Bed No</label>
                  <select
                    className="form-select"
                    value={newTenant.bedNo || ""}
                    onChange={(e) => {
                      const bedNo = e.target.value;

                      if (bedNo === "__other__") {
                        setNewTenant((prev) => ({
                          ...prev,
                          bedNo: "__other__",
                          baseRent: "",
                          rentAmount: "",
                          newBedNo: prev.newBedNo || "",
                          newBedPrice: prev.newBedPrice || "",
                          __bedMsg: "",
                          __savingBed: false,
                        }));
                        return;
                      }

                      const selectedRoom = roomsData.find((r) => String(r.roomNo) === String(newTenant.roomNo));
                      const selectedBed = selectedRoom?.beds.find((b) => String(b.bedNo) === String(bedNo));

                      setNewTenant((prev) => ({
                        ...prev,
                        bedNo,
                        baseRent: selectedBed?.price ?? "",
                        rentAmount: selectedBed?.price ?? "",
                        newBedNo: "",
                        newBedPrice: "",
                        __bedMsg: "",
                        __savingBed: false,
                      }));
                    }}
                    disabled={!newTenant.roomNo}
                  >
                    <option value="">{newTenant.roomNo ? "Select Bed" : "Select a Room first"}</option>

                    {roomsData
                      .find((r) => String(r.roomNo) === String(newTenant.roomNo))
                      ?.beds
                      .filter((bed) => !occupiedBeds.has(`${newTenant.roomNo}-${bed.bedNo}`))
                      .map((bed) => (
                        <option key={bed.bedNo} value={bed.bedNo}>
                          {bed.bedNo} - {bed.category || "—"} - ₹{bed.price ?? "—"}
                        </option>
                      ))}

                    {!!newTenant.roomNo && <option value="__other__">Other (add new bed…)</option>}
                  </select>
                </div>

                {/* Inline "Other" Bed */}
                {newTenant.bedNo === "__other__" && (
                  <div className="col-12">
                    <div className="mt-1 p-3 border rounded bg-light">
                      <div className="row g-2">
                        <div className="col-12 col-md-6">
                          <label className="form-label">New Bed No</label>
                          <input
                            className="form-control"
                            value={newTenant.newBedNo || ""}
                            onChange={(e) =>
                              setNewTenant((prev) => ({
                                ...prev,
                                newBedNo: e.target.value,
                                __bedMsg: "",
                              }))
                            }
                            placeholder="e.g., B4"
                          />
                          {!((newTenant.newBedNo || "").trim()) && (
                            <small className="text-danger">Bed No is required</small>
                          )}
                        </div>
                        <div className="col-12 col-md-6">
                          <label className="form-label">
                            Price <span className="text-muted">(optional)</span>
                          </label>
                          <input
                            type="number"
                            className="form-control"
                            value={newTenant.newBedPrice ?? ""}
                            onChange={(e) =>
                              setNewTenant((prev) => ({
                                ...prev,
                                newBedPrice: e.target.value,
                                __bedMsg: "",
                              }))
                            }
                            placeholder="e.g., 3500 (optional)"
                            min="0"
                          />
                          {newTenant.newBedPrice !== "" &&
                            newTenant.newBedPrice != null &&
                            (Number(newTenant.newBedPrice) < 0 || Number.isNaN(Number(newTenant.newBedPrice))) && (
                              <small className="text-danger">Enter a non-negative number</small>
                            )}
                        </div>
                      </div>

                      {newTenant.__bedMsg ? (
                        <div className="mt-2">
                          <small className={newTenant.__bedMsg.startsWith("✔") ? "text-success" : "text-danger"}>
                            {newTenant.__bedMsg}
                          </small>
                        </div>
                      ) : null}

                      <div className="mt-3 d-flex gap-2 flex-wrap">
                        <button
                          type="button"
                          className="btn btn-success"
                          disabled={
                            newTenant.__savingBed ||
                            !((newTenant.newBedNo || "").trim()) ||
                            (newTenant.newBedPrice !== "" &&
                              newTenant.newBedPrice != null &&
                              (Number(newTenant.newBedPrice) < 0 || Number.isNaN(Number(newTenant.newBedPrice))))
                          }
                          onClick={async () => {
                            const roomNo = newTenant.roomNo;
                            const bedNoToAdd = (newTenant.newBedNo || "").trim();
                            const priceStr = newTenant.newBedPrice;

                            const priceProvided = priceStr !== "" && priceStr != null;
                            const priceNum = priceProvided ? Number(priceStr) : null;

                            const roomIdx = roomsData.findIndex((r) => String(r.roomNo) === String(roomNo));
                            if (roomIdx === -1) {
                              setNewTenant((prev) => ({ ...prev, __bedMsg: "Room not found." }));
                              return;
                            }
                            const exists = roomsData[roomIdx].beds?.some(
                              (b) => String(b.bedNo).trim().toLowerCase() === bedNoToAdd.toLowerCase()
                            );
                            if (exists) {
                              setNewTenant((prev) => ({
                                ...prev,
                                __bedMsg: "A bed with this number already exists in this room.",
                              }));
                              return;
                            }

                            try {
                              setNewTenant((prev) => ({
                                ...prev,
                                __savingBed: true,
                                __bedMsg: "",
                              }));

                              const payload = { bedNo: bedNoToAdd };
                              if (priceProvided) payload.price = priceNum;

                              await axios.post(
                                `http://localhost:5000/api/rooms/${encodeURIComponent(roomNo)}/bed`,
                                payload
                              );

                              setRoomsData((prev) => {
                                const copy = [...prev];
                                const r = { ...copy[roomIdx] };
                                r.beds = [...(r.beds || []), { bedNo: bedNoToAdd, ...(priceProvided ? { price: priceNum } : {}) }];
                                copy[roomIdx] = r;
                                return copy;
                              });

                              setNewTenant((prev) => ({
                                ...prev,
                                bedNo: bedNoToAdd,
                                baseRent: priceProvided ? priceNum : "",
                                rentAmount: priceProvided ? priceNum : "",
                                newBedNo: "",
                                newBedPrice: "",
                                __bedMsg: "✔ Bed added successfully",
                                __savingBed: false,
                              }));
                            } catch (err) {
                              console.error(err);
                              setNewTenant((prev) => ({
                                ...prev,
                                __bedMsg: "Could not save the bed. Check network/API route.",
                                __savingBed: false,
                              }));
                            }
                          }}
                        >
                          {newTenant.__savingBed ? "Saving…" : "Add & Save"}
                        </button>

                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => {
                            setNewTenant((prev) => ({
                              ...prev,
                              bedNo: "",
                              newBedNo: "",
                              newBedPrice: "",
                              __bedMsg: "",
                              __savingBed: false,
                            }));
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Base Rent + Rent Amount */}
                <div className="col-12 col-md-6">
                  <label className="form-label">Base Rent Amount (Auto-Filled)</label>
                  <input className="form-control" value={newTenant.baseRent || ""} readOnly />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Rent Amount (Auto-Filled)</label>
                  <input className="form-control" value={newTenant.rentAmount || ""} readOnly />
                </div>

                {/* Deposit + DOJ (Company/College) */}
                <div className="col-12 col-md-6">
                  <label className="form-label">Deposit Amount</label>
                  <input
                    type="number"
                    className="form-control"
                    value={newTenant.depositAmount || ""}
                    onChange={(e) => setNewTenant({ ...newTenant, depositAmount: e.target.value })}
                    min="0"
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Date of Joining College / Company</label>
                  <input
                    type="date"
                    className="form-control"
                    value={newTenant.dateOfJoiningCollege || ""}
                    onChange={(e) => setNewTenant({ ...newTenant, dateOfJoiningCollege: e.target.value })}
                  />
                </div>

                {/* Canteen Option */}
                <div className="col-12 col-md-6">
                  <label className="form-label">Canteen</label>
                  <select
                    className="form-select"
                    value={newTenant.canteen || "no"}
                    onChange={(e) => setNewTenant({ ...newTenant, canteen: e.target.value })}
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>

                {/* Upload Docs */}
                <div className="col-12 col-md-6">
                  <label className="form-label">Upload Documents</label>
                  <input
                    type="file"
                    className="form-control form-control-sm"
                    multiple
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    onChange={handleDocsChange}
                  />
                  {docMsg && <small className="d-block mt-2 text-danger">{docMsg}</small>}
                </div>
                <div className="col-12 col-md-6 d-flex align-items-end">
                  <div className="w-100" />
                </div>

                {/* Doc list */}
                {docFiles.length > 0 && (
                  <div className="col-12">
                    <ul className="mt-2 list-unstyled">
                      {docFiles.map((d, i) => (
                        <li
                          key={i}
                          className="d-flex align-items-center justify-content-between border rounded px-2 py-1 mb-1"
                          style={{ fontSize: "0.9rem" }}
                        >
                          <div className="d-flex flex-column flex-lg-row align-items-lg-center gap-2" style={{ maxWidth: "75%" }}>
                            <span className="text-truncate">
                              {d.file.name} <small className="text-muted">({Math.ceil(d.file.size / 1024)} KB)</small>
                            </span>
                            <select
                              className="form-select form-select-sm"
                              value={d.relation}
                              onChange={(e) => {
                                const copy = [...docFiles];
                                copy[i] = { ...copy[i], relation: e.target.value };
                                setDocFiles(copy);
                              }}
                            >
                              <option value="Self">Self</option>
                              <option value="Father">Father</option>
                              <option value="Mother">Mother</option>
                              <option value="Husband">Husband</option>
                              <option value="Sister">Sister</option>
                              <option value="Brother">Brother</option>
                            </select>
                          </div>
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeDoc(i)}>
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer d-flex flex-wrap gap-2">
            {/* Share + Import */}
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={handleShareAddTenantModal}
              title="Share a link that opens this Add Tenant modal"
            >
              Share Form
            </button>

            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleImportLatestForm}
              title="Import the latest submitted tenant form into this modal"
              disabled={importingForm}
            >
              {importingForm ? "Importing…" : "Import Latest Form"}
            </button>

            <div className="flex-grow-1" />

            <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </button>
            <button
              className="btn"
              onClick={handleAddTenantWithDocs}
              style={{ backgroundColor: "rgb(94, 182, 92)", color: "white" }}
            >
              <FaPlus className="me-2" /> Save Tenant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddTenantModal;
