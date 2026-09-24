import React, { useState } from "react";
import { FaLightbulb, FaMoneyBill, FaPlus, FaTrash, FaDownload } from "react-icons/fa";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";


const MeterForm = () => {
  const [isLightBill, setIsLightBill] = useState(true);
  const [lightBillData, setLightBillData] = useState({
    meterNo: "",
    totalReading: "",
    amount: "",
    date: "",
  });
  const [otherExpenseData, setOtherExpenseData] = useState({
    mainAmount: "",
    expenses: [""],
    date: "",
  });

const navigate = useNavigate();
  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleLightBillChange = (e) => {
    setLightBillData({ ...lightBillData, [e.target.name]: e.target.value });
  };

  const handleOtherExpenseChange = (index, value) => {
    const updatedExpenses = [...otherExpenseData.expenses];
    updatedExpenses[index] = value;
    setOtherExpenseData({ ...otherExpenseData, expenses: updatedExpenses });
  };

  const addExpenseField = () => {
    setOtherExpenseData({
      ...otherExpenseData,
      expenses: [...otherExpenseData.expenses, ""],
    });
  };

  const removeExpenseField = (index) => {
    const updatedExpenses = [...otherExpenseData.expenses];
    updatedExpenses.splice(index, 1);
    setOtherExpenseData({ ...otherExpenseData, expenses: updatedExpenses });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const apiUrl = isLightBill
      ? "    http://localhost:8000/api/light-bill"
      : "    http://localhost:8000/api/other-expense";
    const data = isLightBill ? lightBillData : otherExpenseData;

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      alert(result.message || "Form submitted successfully!");
    } catch (error) {
      console.error(error);
      alert("Failed to submit the form.");
    }
  };

  const downloadExcel = async () => {
    const apiUrl = isLightBill
      ? "    http://localhost:8000/api/light-bill/all"
      : "    http://localhost:8000/api/other-expense/all";
  
    try {
      // Fetch data from the backend
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch data.");
      }
  
      const data = await response.json();
  
      // Format data for Excel
      const formattedData = isLightBill
        ? data.map((item) => ({
            "Meter No": item.meterNo,
            "Total Reading": item.totalReading,
            Amount: item.amount,
            Date: item.date,
          }))
        : data.map((item) => ({
            "Main Amount": item.mainAmount,
            Expenses: item.expenses.join(", "),
            Date: item.date,
          }));
  
      // Generate and download Excel file
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      XLSX.writeFile(
        workbook,
        `${isLightBill ? "LightBill" : "OtherExpense"}Data.xlsx`
      );
    } catch (error) {
      console.error("Error downloading Excel file:", error);
      alert("Failed to download Excel file.");
    }
  };
  

  return (
    <div className="container mt-5">
      <div className="d-flex justify-content-center mb-4">
        <button
          className={`btn ${isLightBill ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setIsLightBill(true)}
        >
          <FaLightbulb className="me-2" />
          Light Bill
        </button>
        <button
          className={`btn ${!isLightBill ? "btn-primary" : "btn-outline-primary"} ms-3`}
          onClick={() => setIsLightBill(false)}
        >
          <FaMoneyBill className="me-2" />
          Other Expense
        </button>
      </div>
      <div className="card mx-auto" style={{ maxWidth: "600px" }}>
        <div className="card-body">
          <form onSubmit={handleFormSubmit} className="mx-auto">
            {isLightBill ? (
              <>
                <h3>
                  Light Bill Form <FaLightbulb />
                </h3>
                <div className="mb-3">
                  <label className="form-label fw-bold">Meter No:</label>
                  <input
                    type="text"
                    name="meterNo"
                    className="form-control"
                    value={lightBillData.meterNo}
                    onChange={handleLightBillChange}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold">Total Reading:</label>
                  <input
                    type="number"
                    name="totalReading"
                    className="form-control"
                    value={lightBillData.totalReading}
                    onChange={handleLightBillChange}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold">Amount:</label>
                  <input
                    type="number"
                    name="amount"
                    className="form-control"
                    value={lightBillData.amount}
                    onChange={handleLightBillChange}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold">Date:</label>
                  <input
                    type="date"
                    name="date"
                    className="form-control"
                    value={lightBillData.date}
                    onChange={handleLightBillChange}
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <h3>
                  Other Expense Form <FaMoneyBill />
                </h3>
                <div className="mb-3">
                  <label className="form-label fw-bold">Main Amount:</label>
                  <input
                    type="number"
                    name="mainAmount"
                    className="form-control"
                    value={otherExpenseData.mainAmount}
                    onChange={(e) =>
                      setOtherExpenseData({
                        ...otherExpenseData,
                        mainAmount: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold">Date:</label>
                  <input
                    type="date"
                    name="date"
                    className="form-control"
                    value={otherExpenseData.date}
                    onChange={(e) =>
                      setOtherExpenseData({
                        ...otherExpenseData,
                        date: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <label className="form-label fw-bold">Other Expenses:</label>
                {otherExpenseData.expenses.map((expense, index) => (
                  <div key={index} className="mb-3 d-flex">
                    <input
                      type="text"
                      className="form-control me-2"
                      value={expense}
                      onChange={(e) => handleOtherExpenseChange(index, e.target.value)}
                      required
                    />
                    {index > 0 && (
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => removeExpenseField(index)}
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-success mb-3" onClick={addExpenseField}>
                  <FaPlus /> Add More Expense
                </button>
              </>
            )}
            <div className="d-flex justify-content-between">
              <button type="submit" className="btn btn-primary">
                Submit
              </button>
              <button type="submit" className="btn-warning" onClick={()=>handleNavigation('/add-data')}>
                Back
              </button>
              <button type="button" className="btn btn-secondary" onClick={downloadExcel}>
                <FaDownload className="me-2" />
                Download
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MeterForm;
