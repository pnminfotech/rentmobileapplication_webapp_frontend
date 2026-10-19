import React, { useEffect, useState } from 'react';
import { FaPlus, FaDownload, FaSync } from "react-icons/fa";
import * as XLSX from 'xlsx';
import { useNavigate } from "react-router-dom";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { FaEdit} from "react-icons/fa";

import { faTrash } from "@fortawesome/free-solid-svg-icons";


const MaintenanceManager = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showFirstHalf, setShowFirstHalf] = useState(true);
  const [activeTab, setActiveTab] = useState('light');
  const [lightBills, setLightBills] = useState([]);
  const [otherExpenses, setOtherExpenses] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

 const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [updatedAmount, setUpdatedAmount] = useState('');
  const [updatedDate, setUpdatedDate] = useState('');



  const [lightForm, setLightForm] = useState({
    roomNo: "",
    meterNo: "",
    totalReading: "",
    amount: "",
    date: "",
  });

  const [expenseForm, setExpenseForm] = useState({
    roomNo: "",
    mainAmount: "",
    expenses: [""],
    date: "",
  });

  const [selectedMonth, setSelectedMonth] = useState('');

  // Months calculation (Jan - Dec)
  const months = Array.from({ length: 12 }, (_, i) =>
    new Date(selectedYear, i).toLocaleString('default', { month: 'short' }) + '-' + String(selectedYear).slice(-2)
  );

  const visibleMonths = showFirstHalf ? months.slice(0, 6) : months.slice(6, 12);

  const getMonthYear = (dateString) => {
    const date = new Date(dateString);
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${month}-${year}`;
  };
 const navigate = useNavigate();
  const handleNavigation = (path) => {
    navigate(path);
  };
  const getMonthwiseSummary = (dataList) => {
    const summary = {};
    dataList.forEach((item) => {
      const month = getMonthYear(item.date);
      if (!summary[month]) {
        summary[month] = [];
      }
      summary[month].push(item);
    });
    return summary;
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    const url =
      activeTab === 'light'
        ? '    https://rentmobile-api.pnminfotech.com/api/light-bill/all'
        : '    https://rentmobile-api.pnminfotech.com/api/other-expense/all';

    try {
      const res = await fetch(url);
      const data = await res.json();
      activeTab === 'light' ? setLightBills(data) : setOtherExpenses(data);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };
  // Submit handler
 const handleSubmit = async () => {
  try {
    const url = activeTab === 'light'
      ? '    https://rentmobile-api.pnminfotech.com/api/light-bill'
      : '    https://rentmobile-api.pnminfotech.com/api/other-expense';

    const body = activeTab === 'light' ? lightForm : expenseForm;

    // Basic validation: no empty fields allowed
    if (Object.values(body).some(val => typeof val === 'string' && val.trim() === '')) {
      alert('Please fill all fields');
      return;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const result = await res.json();

    if (res.ok) {
      alert('Entry added successfully');
      fetchData(); // refresh list
      setShowAddModal(false);
      // reset forms
      setLightForm({ roomNo: '', meterNo: '', totalReading: '', amount: '', date: '' });
      setExpenseForm({ roomNo: '', mainAmount: '', expenses: [''], date: '' });
    } else {
      alert(result.message || 'Something went wrong');
    }
  } catch (err) {
    console.error('Submit error:', err);
  }
};


  const downloadExcel = () => {
    const data = activeTab === 'light' ? lightBills : otherExpenses;
    const formatted = data.map((item, idx) =>
      activeTab === 'light'
        ? {
            'Sr No.': idx + 1,
            'Room No': item.roomNo,
            'Meter No': item.meterNo,
            'Total Reading': item.totalReading,
            Amount: item.amount,
            Date: new Date(item.date).toLocaleDateString(),
          }
        : {
            'Sr No.': idx + 1,
            'Room No': item.roomNo,
            'Main Amount': item.mainAmount,
            Expenses: item.expenses?.join(', ') || '',
            Date: new Date(item.date).toLocaleDateString(),
          }
    );
    const sheet = XLSX.utils.json_to_sheet(formatted);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, activeTab === 'light' ? 'LightBills' : 'OtherExpenses');
    XLSX.writeFile(book, `${activeTab}-data-${selectedYear}.xlsx`);
  };

  // Filtered bills based on selectedMonth
  const filteredBills = (activeTab === 'light' ? lightBills : otherExpenses).filter(item => {
    const monthYear = getMonthYear(item.date);
    return monthYear === selectedMonth || selectedMonth === '';
  });


  const handleEdit = (bill) => {
    setSelectedBill(bill);
    setUpdatedAmount(bill.amount);
    setUpdatedDate(bill.date?.slice(0, 10));
    setShowEditModal(true);
  };
  const handleUpdateSubmit = async () => {
    try {
      const res = await fetch(`    https://rentmobile-api.pnminfotech.com/api/light-bill/${selectedBill._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedBill,
          amount: updatedAmount,
          date: updatedDate,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Update failed");

      alert("Bill updated!");
      setShowEditModal(false);
      fetchData(); // Refresh data
    } catch (err) {
      alert("Failed to update: " + err.message);
    }
  };


//  const handleEdit = (bill) => {
//   const updatedAmount = prompt("Enter updated amount:", bill.amount);
//   if (updatedAmount === null) return;

//   const updatedDate = prompt("Enter updated date (YYYY-MM-DD):", bill.date?.slice(0, 10));
//   if (updatedDate === null) return;

//   fetch(`    https://rentmobile-api.pnminfotech.com/api/light-bill/${bill._id}`, {
//     method: 'PUT',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({
//       ...bill,
//       amount: updatedAmount,
//       date: updatedDate
//     }),
//   })
//     .then(res => res.json())
//     .then(() => {
//       alert("Bill updated!");
//       fetchData();
//     })
//     .catch(err => {
//       console.error(err);
//       alert("Failed to update.");
//     });
// };

const handleDelete = async (bill) => {
  // Ask for confirmation before deleting
  if (window.confirm("Are you sure you want to delete this light bill?")) {
    try {
      // Make the DELETE request to the backend
      const response = await fetch(`    https://rentmobile-api.pnminfotech.com/api/light-bill/${bill._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Delete failed");
      }

      // Display success message
      alert(result.message || "Light Bill deleted successfully");
      
      // Optionally, refresh the list of light bills
      fetchData(); // Replace with your data fetching function
    } catch (err) {
      // Display error message if delete failed
      alert("Delete failed: " + err.message);
      console.error(err);
    }
  }
};





  return (
    <div className="m-4" style={{ fontFamily: 'Century Gothic', fontSize: 13 }}>
      <h4 className="mb-4">Maintenance Manager</h4>
      <div className="d-flex align-items-center mb-3">
        <label className="me-2 fw-bold">Select Year:</label>
        <select className="form-select w-auto" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}  >
          {[2024, 2025, 2026, 2027, 2028].map((year) => (
            <option key={year}>{year}</option>
          ))}
        </select>
        <select
          className="form-select w-auto ms-3"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          <option value="">All Reacords</option>
          {visibleMonths.map((month, idx) => (
            <option key={idx} value={month}>
              {month}
            </option>
          ))}
        </select>
        <button className="btn  ms-3" style={styles.btnPrimary} onClick={() => setShowFirstHalf(!showFirstHalf)}>
          {showFirstHalf ? 'Show Jul-Dec' : 'Show Jan-Jun'}
        </button>
        <button className="btn  ms-3" style={styles.btnPrimary} onClick={downloadExcel}>
          <FaDownload className="me-2" /> Download
        </button>
        <button  className="btn ms-3"
  style={activeTab === 'light' ? styles.btnPrimaryActive : styles.btnPrimary} onClick={() => setActiveTab('light')}>
          Light Bill
        </button>
        <button className="btn ms-3"
  style={activeTab === 'other' ? styles.btnPrimaryActive : styles.btnPrimary} onClick={() => setActiveTab('other')}>
          Other Expense
        </button>
        <button className="btn  ms-3" style={styles.btnPrimary} onClick={() => setShowAddModal(true)}>
          <FaPlus className="me-1" /> Add
        </button>
        <button className="btn  ms-3" style={styles.btnPrimary} onClick={() => handleNavigation("/add-data")}>
          <FaPlus className="me-1" /> Back
        </button>

         
      </div>
 {/* Add Modal */}
{showAddModal && (
  <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
    <div className="modal-dialog">
      <div className="modal-content p-3">
        <h5>{activeTab === 'light' ? 'Add Light Bill' : 'Add Other Expense'}</h5>
        <div className="modal-body">
          <input
            type="text"
            className="form-control mb-2"
            placeholder="Room No"
            value={activeTab === 'light' ? lightForm.roomNo : expenseForm.roomNo}
            onChange={(e) =>
              activeTab === 'light'
                ? setLightForm({ ...lightForm, roomNo: e.target.value })
                : setExpenseForm({ ...expenseForm, roomNo: e.target.value })
            }
          />
          {activeTab === 'light' && (
            <>
              <input
                type="text"
                className="form-control mb-2"
                placeholder="Meter No"
                value={lightForm.meterNo}
                onChange={(e) => setLightForm({ ...lightForm, meterNo: e.target.value })}
              />
              <input
                type="text"
                className="form-control mb-2"
                placeholder="Total Reading"
                value={lightForm.totalReading}
                onChange={(e) => setLightForm({ ...lightForm, totalReading: e.target.value })}
              />
            </>
          )}
          <input
            type="text"
            className="form-control mb-2"
            placeholder={activeTab === 'light' ? 'Amount' : 'Main Amount'}
            value={activeTab === 'light' ? lightForm.amount : expenseForm.mainAmount}
            onChange={(e) =>
              activeTab === 'light'
                ? setLightForm({ ...lightForm, amount: e.target.value })
                : setExpenseForm({ ...expenseForm, mainAmount: e.target.value })
            }
          />
          <input
            type="date"
            className="form-control mb-2"
            value={activeTab === 'light' ? lightForm.date : expenseForm.date}
            onChange={(e) =>
              activeTab === 'light'
                ? setLightForm({ ...lightForm, date: e.target.value })
                : setExpenseForm({ ...expenseForm, date: e.target.value })
            }
          />

          {/* ADD THIS FOR EXPENSES INPUTS WHEN OTHER TAB IS ACTIVE */}
          {activeTab === 'other' && (
            <>
              <label className="mt-3 mb-1">Expenses:</label>
              {expenseForm.expenses.map((expense, index) => (
                <div key={index} className="d-flex mb-2">
                  <input
                    type="text"
                    className="form-control"
                    placeholder={`Expense ${index + 1}`}
                    value={expense}
                    onChange={(e) => {
                      const newExpenses = [...expenseForm.expenses];
                      newExpenses[index] = e.target.value;
                      setExpenseForm({ ...expenseForm, expenses: newExpenses });
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-danger ms-2"
                    onClick={() => {
                      const newExpenses = expenseForm.expenses.filter((_, i) => i !== index);
                      setExpenseForm({ ...expenseForm, expenses: newExpenses });
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setExpenseForm({ ...expenseForm, expenses: [...expenseForm.expenses, ''] })}
              >
                Add Expense
              </button>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            Submit
          </button>
        </div>
      </div>
    </div>
  </div>
)}

      {/* Month Dropdown */}
      {/* <div className="mb-3">
        <select
          className="form-select"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          <option value="">All Reacords</option>
          {visibleMonths.map((month, idx) => (
            <option key={idx} value={month}>
              {month}
            </option>
          ))}
        </select>
      </div> */}
{showEditModal && (
  <div style={{
    position: 'fixed',
    top: '10%',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'white',
    padding: '20px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    zIndex: 999,
    boxShadow: '0px 2px 10px rgba(0,0,0,0.2)'
  }}>
    <h3>Edit Light Bill</h3>
    <div style={{ marginBottom: '10px' }}>
      <label>Amount: </label>
      <input
        type="number"
        value={updatedAmount}
        onChange={(e) => setUpdatedAmount(e.target.value)}
      />
    </div>
    <div style={{ marginBottom: '10px' }}>
      <label>Date: </label>
      <input
        type="date"
        value={updatedDate}
        onChange={(e) => setUpdatedDate(e.target.value)}
      />
    </div>
    
    <button onClick={() => setShowEditModal(false)} style={{ marginLeft: '10px' }}>Cancel</button>

    <button onClick={handleUpdateSubmit}>Update</button>
  </div>
)}

   {showEditModal && (
  <div style={{
    position: 'fixed',
    top: '10%',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'white',
    padding: '20px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    zIndex: 999,
    boxShadow: '0px 2px 10px rgba(0,0,0,0.2)'
  }}>
    <h3>Edit Light Bill</h3>

    <div style={{ marginBottom: '10px' }}>
      <label>Amount: </label>
      <input
        type="number"
        value={updatedAmount}
        onChange={(e) => setUpdatedAmount(e.target.value)}
      />
    </div>

    <div style={{ marginBottom: '10px' }}>
      <label>Date: </label>
      <input
        type="date"
        value={updatedDate}
        onChange={(e) => setUpdatedDate(e.target.value)}
      />
    </div>
 <button
      onClick={() => setShowEditModal(false)}
      style={{
        marginLeft: '10px',
        backgroundColor: '#6c757d',
        color: 'white',
        padding: '6px 12px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    >
      Cancel
    </button>
    <button
      onClick={handleUpdateSubmit}
      style={{
        backgroundColor: '#e54273',
        color: 'white',
        padding: '6px 12px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    >
      Update
    </button>

   
  </div>
)}



      <div className="table-responsive">
        <table className="table table-bordered table-striped" style={{border:"2px solid black"}}>
          <thead>
            <tr>
              {activeTab === 'light' ? (
                <>
                  <th style={{backgroundColor: "#c77c88", color: "white"}}>Room No</th>
                  <th style={{backgroundColor: "#c77c88", color: "white"}}>Meter No</th>
                  <th style={{backgroundColor: "#c77c88", color: "white"}}>Total Reading</th>
                  <th style={{backgroundColor: "#c77c88", color: "white"}} >Amount</th>
                  <th style={{backgroundColor: "#c77c88", color: "white"}}>Date</th>
                  <th style={{backgroundColor: "#c77c88", color: "white"}}>Edit/Delete</th>
                  
                </>
              ) : (
                <>
                  <th style={{backgroundColor: "#c77c88", color: "white"}}>Room No</th>
                  <th style={{backgroundColor: "#c77c88", color: "white"}}>Main Amount</th>
                  <th style={{backgroundColor: "#c77c88", color: "white"}}>Expenses</th>
                  <th style={{backgroundColor: "#c77c88", color: "white"}}>Date</th>
                  {/* <th>action</th> */}
                </>
              )}
            </tr>
          </thead>
          <tbody style={{border:"black"}}>
            {filteredBills.map((item, idx) => (
              <tr key={idx}>
                {activeTab === 'light' ? (
                  <>
                    <td>{item.roomNo}</td>
                    <td>{item.meterNo}</td>
                    <td>{item.totalReading}</td>
                    <td>{item.amount}</td>
                    <td>{new Date(item.date).toLocaleDateString()}</td>
                    <td>
  {/* <button className="btn btn-sm btn-warning" onClick={() => handleEdit(item)}>Edit</button> */}
<button
        className="btn"
        style={{fontSize:'15px' , color:'green', padding:10}}
       onClick={() => handleEdit(item)} >
        <FaEdit />
      </button>
      <button
        className="btn"
        style={{fontSize:'15px' , color:'red',padding:10}}
       onClick={() => handleDelete(item)}>
        <FontAwesomeIcon icon={faTrash} />
      </button>

  {/* <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item)}>Delete</button> */}


</td>

                  </>
                ) : (
                  <>
                    <td>{item.roomNo}</td>
                    <td>{item.mainAmount}</td>
                    <td>{item.expenses?.join(', ')}</td>
                    <td>{new Date(item.date).toLocaleDateString()}</td>
                    {/* <td>
  <button className="btn btn-sm btn-warning" onClick={() => handleEdit(item)}>Edit</button>
</td> */}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
const styles = {
  btnPrimary: {
    backgroundColor: '#f7e5e5',
    color: '#000',
    borderColor: '#e54273',
    border: '1px solid #f7e5e5',
  },
  btnPrimaryActive: {
    backgroundColor: '#c77c88',
    color: '#000',
    borderColor: '#e54273',
    border: '1px solid #c77c88',
  },
};

export default MaintenanceManager;
