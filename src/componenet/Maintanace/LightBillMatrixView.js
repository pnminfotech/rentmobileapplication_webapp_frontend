import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// import { FaRupeeSign } from 'react-icons/fa';
import {
  FaTachometerAlt,
  FaRupeeSign,
  FaUserNurse,
  FaBolt,
} from "react-icons/fa";

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const LightBillMatrixView = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [newEntry, setNewEntry] = useState({
    type: "meter",
    name: "",
    roomNo: "",
    meterNo: "",
    totalReading: "",
    amount: "",
    salary: "",
    customLabel: "",
    status: "pending",
    month: "",
    year: new Date().getFullYear(),
  });
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const res = await fetch("    http://localhost:8000/api/light-bill/all");
    const json = await res.json();
    setData(json);
  };
  const handleAdd = async () => {
    const name =
      newEntry.type === "meter"
        ? newEntry.meterNo
        : newEntry.type === "maushi"
        ? "Maushi"
        : newEntry.customLabel;

    if (!name) {
      alert("Name is required.");
      return;
    }

    const monthNumber = months.indexOf(newEntry.month) + 1;

    // Prevent invalid month like "2025-00-01"
    if (monthNumber < 1 || monthNumber > 12) {
      alert("Please select a valid month.");
      return;
    }

    const formattedDate = `${newEntry.year}-${String(monthNumber).padStart(
      2,
      "0"
    )}-01`;

    const payload = {
      type: newEntry.type,
      name,
      roomNo: newEntry.roomNo || "",
      meterNo: newEntry.meterNo || "",
      totalReading: newEntry.totalReading || "",
      amount: newEntry.amount || "",
      salary: newEntry.salary || "",
      customLabel: newEntry.customLabel || "",
      status: newEntry.status,
      date: formattedDate,
    };

    const res = await fetch("    http://localhost:8000/api/light-bill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      alert("Entry saved");
      setNewEntry({
        type: "meter",
        name: "",
        roomNo: "",
        meterNo: "",
        totalReading: "",
        amount: "",
        salary: "",
        customLabel: "",
        status: "pending",
        month: "",
        year: new Date().getFullYear(),
      });
      fetchAll();
    } else {
      alert("Failed to save");
    }
  };

  const groupData = () => {
    const matrix = {};

    data.forEach((item) => {
      const rowKey = item.name || item.meterNo || item.customLabel || "Unknown";
      const date = new Date(item.date);
      const month = months[date.getMonth()];

      if (!matrix[rowKey]) matrix[rowKey] = {};
      matrix[rowKey][month] = item;
    });

    return matrix;
  };

  const matrix = groupData();

  return (
    <div className="container py-4">
      <button type="button" className="btn btn-outline-primary mb-3" onClick={() => navigate("/admin")}>← Back</button>
      <h2 className="mb-4">Light Bill Monthly Matrix</h2>
      <button
        className="btn btn-success w-100"
        onClick={() => setShowModal(true)}
      >
        Add Entry
      </button>

      <div
        className=" d-flex align-items-center gap-3 justify-content-end text-danger fw-bold"
        style={{ fontSize: "0.7rem", color: "#6c757d" }}
      >
        <strong>*Legend:</strong>
        <span className="text-secondary">
          <FaBolt style={{ color: "#e37727" }} /> = Light Bill Amount
        </span>
        <span className="text-secondary">
          {" "}
          <FaTachometerAlt className="text-success" />= Reading (Units)
        </span>
        {/* <span><FaUserNurse /> = Maushi Salary</span> */}
      </div>

      <table className="table table-bordered mt-0">
        <thead>
          <tr>
            <th>Name</th>
            {months.map((month) => (
              <th key={month}>{month}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(matrix).map(([name, values]) => (
            <tr key={name}>
              <td>
                <strong>{name}</strong>
              </td>
              {months.map((month) => (
                <td key={month}>
                  {values[month] ? (
                    values[month].type === "maushi" ? (
                      <>
                        {/* <FaRupeeSign className="me-1" /> */}₹{" "}
                        {values[month].salary}
                        <br />
                        {/* <small className="text-muted">
            <FaUserNurse className="me-1" /> Salary
          </small> */}
                      </>
                    ) : values[month].type === "meter" ? (
                      <>
                        <FaBolt style={{ color: "#e37727" }} /> ₹
                        {values[month].amount}
                        <br />
                        <small className="text-muted">
                          <FaTachometerAlt className="me-1 text-success" />
                          {values[month].totalReading}
                        </small>
                      </>
                    ) : (
                      <>
                        <FaRupeeSign className="me-1" />
                        {values[month].amount}
                      </>
                    )
                  ) : (
                    "-"
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      







      {showModal && (
  <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
    <div className="modal-dialog modal-lg">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Add Light Bill Entry</h5>
          <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
        </div>
        <div className="modal-body">
        <div className="row ">
        <div className="col-md-6">
          <label>Type</label>
          <select
            className="form-select" style={{marginTop: '10px', marginBottom: '10px'}}
            value={newEntry.type}
            onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value })}
          >
            <option value="meter">Meter</option>
            <option value="maushi">Maushi</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {newEntry.type === "meter" && (
          <>
            <div className="col-md-6">
              <label>Meter No</label>
              <input
                className="form-control" 
                value={newEntry.meterNo}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, meterNo: e.target.value })
                }
              />
            </div>
            <div className="col-md-6">
              <label>Reading</label>
              <input
                className="form-control"
                type="number"
                value={newEntry.totalReading}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, totalReading: e.target.value })
                }
              />
            </div>
            <div className="col-md-6">
              <label>Amount</label>
              <input
                className="form-control"
                type="number"
                value={newEntry.amount}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, amount: e.target.value })
                }
              />
            </div>
          </>
        )}

        {newEntry.type === "maushi" && (
          <div className="col-md-6">
            <label>Salary</label>
            <input
              className="form-control"
              type="number"
              value={newEntry.salary}
              onChange={(e) =>
                setNewEntry({ ...newEntry, salary: e.target.value })
              }
            />
          </div>
        )}

        {newEntry.type === "custom" && (
          <>
            <div className="col-md-6">
              <label>Label</label>
              <input
                className="form-control"
                value={newEntry.customLabel}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, customLabel: e.target.value })
                }
              />
            </div>
            <div className="col-md-6">
              <label>Amount</label>
              <input
                className="form-control"
                type="number"
                value={newEntry.amount}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, amount: e.target.value })
                }
              />
            </div>
          </>
        )}

        <div className="col-md-6">
          <label>Month</label>
          <select
            className="form-select" style={{marginTop: '10px', marginBottom: '10px'}}
            value={newEntry.month}
            onChange={(e) =>
              setNewEntry({ ...newEntry, month: e.target.value })
            }
          >
            <option value="">Select</option>
            {months.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-6">
          <label>Year</label>
          <input
            className="form-control"
            type="number"
            value={newEntry.year}
            onChange={(e) => setNewEntry({ ...newEntry, year: e.target.value })}
          />
        </div>

        {/* <div className="col-md-6">
          <button
            className="btn btn-success w-100"
            onClick={() => setShowModal(true)}
          >
            Add Entry
          </button>
        </div> */}
      </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-success" onClick={handleAdd}>Save Entry</button>
        </div>
      </div>
    </div>
  </div>
)}

    </div>
  );
};

export default LightBillMatrixView;
