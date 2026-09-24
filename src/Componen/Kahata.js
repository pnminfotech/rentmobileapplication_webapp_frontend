import React, { useState, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import {Package, Truck,Factory , Store , ShoppingCart   ,Download ,  Trash2, Edit, CornerRightUp, NotebookText, User, List, FilePlus } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { FaSearch, FaMoneyBillWave } from "react-icons/fa";
import jsPDF from "jspdf";
import "jspdf-autotable";

const API_BASE_URL = "    http://localhost:8000/api/maintenance"; // Update this if backend is deployed

const Kahata = () => {
    const [schemas, setSchemas] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [newSchema, setNewSchema] = useState("");
    const [selectedMonth, setSelectedMonth] = useState("");
    const [selectedSchema, setSelectedSchema] = useState(null);
    const [showSchemas , setShowSchemas] = useState(false);
    const [userName, setUserName] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [amountFilter, setAmountFilter] = useState("");
    const [editData, setEditData] = useState(null);
     // Transaction States
     const [dateName , setDateName]= useState("")
     const [personName, setPersonName] = useState("");
     const [phoneNo, setPhoneNo] = useState("");
     const [work, setWork] = useState("");
     const [amount, setAmount] = useState("");
     const [gAmt, setGAmt] = useState(""); 
     const [rAmt, setRAmt] = useState("");
 
     const [totalAmount, setTotalAmount] = useState(0);
     const [showModal, setShowModal] = useState(false);
//    const [activeSection, setActiveSection] = useState(null);

// const toggleSection = (section) => {
//     setActiveSection(activeSection === section ? null : section);
// };

     useEffect(() => {
        const fetchUserName = async () => {
            try {
                const token = localStorage.getItem("authToken");
                if (!token) return;

                const response = await axios.get("    http://localhost:8000/api/user", {
                    headers: { Authorization: `Bearer ${token}` },
                });

                setUserName(response.data.username);
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        };

        fetchUserName();
    }, []);
    // Fetch Schemas on Load
    useEffect(() => {
        fetchSchemas();
    }, []);

    const filteredTransactions = selectedSchema ? selectedSchema.transactions.filter((transaction) => {
        const matchesSearch = transaction.personName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesAmount = amountFilter === "" || transaction.rAmt <= parseFloat(amountFilter);
        return matchesSearch && matchesAmount;
    }) : [];
    const totalAmount1 = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalGiven = filteredTransactions.reduce((sum, t) => sum + t.gAmt, 0);
    const totalRemain = filteredTransactions.reduce((sum, t) => sum + t.rAmt, 0);
    const pendingAmount = totalAmount1 - totalGiven;
    const getStatus = () => {
       if (totalGiven < totalRemain && totalAmount1 > totalRemain) {
           return "Ongoing";
       } else if (totalGiven === totalRemain && totalAmount1 > totalRemain) {
           return "Partially Completed";
       } else if (totalRemain === 0 && totalGiven >= totalAmount1) {
           return "Completed";
       } else {
           return "Pending";
       }
   };


   const handleEdit = (transaction) => {
    setEditData(transaction);
  };
  
  const handleChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const handleAmountChange = (e) => {
    const { name, value } = e.target;
    let updatedData = { ...editData, [name]: value };

    if (name === "gAmt") {
        updatedData.rAmt = editData.tAmt - value; // Update remaining amount
    } else if (name === "rAmt") {
        updatedData.gAmt = editData.tAmt - value; // Update given amount
    }

    setEditData(updatedData);
};
  
const handleSubmit = async () => {
    console.log("Sending data:", editData);
    try {
        const response =  await axios.put(`    http://localhost:8000/api/maintenance/transactions/update/${editData._id}`, editData);

        console.log("Response:", response.data);
        alert("Transaction Updated Successfully");
        window.location.reload(); // Refresh data
    } catch (error) {
        console.error("Error updating transaction:", error);
        alert("Error updating transaction");
    }
};
const handleDownloadPDF = () => {
  const doc = new jsPDF();
  const dates = filteredTransactions.map((t) => new Date(t.dateName));
  const minDate = new Date(Math.min(...dates)).toLocaleDateString();
  const maxDate = new Date(Math.max(...dates)).toLocaleDateString();
  
  // Title
  doc.setFontSize(16);
  doc.text(`Invoice - ${selectedSchema.schemaName}`, 14, 10, "center");
  doc.text("Account Statement", 105, 20, null, null, "center");
  doc.setFontSize(12);
  doc.text(`Period: ${minDate} - ${maxDate}`, 105, 28, null, null, "center");

    // Table Headers
    const tableColumn = ["Date", "Person", "Work", " Total", "Given", "Remain"];
    const tableRows = filteredTransactions.map((t) => [
        new Date(t.dateName).toLocaleDateString(),
        t.personName.toUpperCase(),
        t.work,
        `${t.amount}`,
        `${t.gAmt || 0}`,
        `${t.rAmt || 0}`,
    ]);

    // Add Table
    doc.autoTable({
        startY: 30,
        head: [tableColumn],
        body: tableRows,
        theme: "grid",
    });


  // Grand Total Row
  const finalY = doc.lastAutoTable.finalY + 5;
  doc.autoTable({
    startY: finalY,
    body: [`Grand Total: ₹${totalAmount1}`, 14, doc.lastAutoTable.finalY + 10],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  // Save the PDF
  doc.save("Invoice.pdf");
};
    const fetchSchemas = async () => {
        try {
            const response = await axios.get(API_BASE_URL);
            setSchemas(response.data);
        } catch (error) {
            console.error("Error fetching schemas:", error);
        }
    };

    const addSchema = async () => {
        if (!newSchema || !selectedMonth) {
            alert("Enter valid schema name and month!");
            return;
        }
        try {
            await axios.post(`${API_BASE_URL}/create`, {
                schemaName: newSchema,
                month: selectedMonth,
            });
            fetchSchemas();
            setNewSchema("");
            setSelectedMonth("");
            setShowForm(false);
        } catch (error) {
            console.error("Error adding schema:", error);
        }
    };

    const selectSchema = async (schema) => {
        setSelectedSchema(schema);
        fetchTotal(schema.schemaName);
    };

    const fetchTotal = async (schemaName) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/total/${schemaName}`);
            setTotalAmount(response.data.total);
        } catch (error) {
            console.error("Error fetching total:", error);
        }
    };
    const addTransaction = async () => {
        if (!selectedSchema || !dateName || !personName || !phoneNo || !work || !amount) {
            alert("Enter valid details!");
            return;
        }
    
        try {
            const payload = {
                dateName,
                personName,
                phoneNo,
                work,
                amount: parseFloat(amount),
                gAmt: gAmt ? parseFloat(gAmt) : null,
                rAmt: rAmt ? parseFloat(rAmt) : null,
            };
    
            await axios.post(`${API_BASE_URL}/add-transaction/${selectedSchema.schemaName}`, payload);
            fetchSchemas();
            fetchTotal(selectedSchema.schemaName);
    
            // Reset Form Fields
            setDateName(""); setPersonName(""); setPhoneNo(""); setWork(""); setAmount("");
            setGAmt(""); setRAmt("");
            setShowModal(false);
        } catch (error) {
            console.error("Error adding transaction:", error);
        }
    };
    
    const deleteSchema = async (schemaName) => {
        try {
            await axios.delete(`${API_BASE_URL}/delete/${schemaName}`);
            fetchSchemas();
            setSelectedSchema(null);
            setTotalAmount(0);
        } catch (error) {
            console.error("Error deleting schema:", error);
        }
    };

    const deleteTransaction = async (schemaName, transactionId) => {
        try {
            await axios.delete(`${API_BASE_URL}/delete-transaction/${schemaName}/${transactionId}`);
            fetchSchemas();
            fetchTotal(schemaName);
        } catch (error) {
            console.error("Error deleting transaction:", error);
        }
    };
    const pieData = [
        { name: "Total ₹", value: filteredTransactions.reduce((sum, t) => sum + t.amount, 0), color: "#28a745",  },
        { name: "Given ₹", value: filteredTransactions.reduce((sum, t) => sum + t.gAmt, 0), color: "#ffc107" },
        { name: "Remaining ₹", value: filteredTransactions.reduce((sum, t) => sum + t.rAmt, 0), color: "#dc3545" }
    ];

    return (
        <div className="d-flex container-fluid mt-4">
              {/* Sidebar */}
            <div className="bg-dark text-white p-4" style={{ width: "250px", height: "200vh" }}>
                <h4><User size={24} className="me-2" /> Welcome,  {userName || "Guest"}!</h4>
                <hr />
                <h5>Ledger Management</h5>
                <br/>
                <button className="btn btn-outline-light w-100 mb-3" onClick={() => setShowForm(!showForm)}>
    <FilePlus size={20}  className={`me-2 transition ${showForm ? "rotate-90" : ""}`}  />Add Maintenance Header
</button>


<button 
        className="btn btn-outline-light w-100 mb-3" 
       
    >
        <ShoppingCart size={20} className="me-2" />
        Suppliers
    </button>
 
              
                <button className="btn btn-outline-light w-100 mb-3" onClick={() => setShowSchemas(!showSchemas)}>
                    <List size={20} className="me-2" /> View All Schemas
                </button>
               
                {showSchemas && (
                    <div className="list-group mb-3 mt-2">
                        {schemas.map((schema, index) => (
                            <div key={index} className="d-flex justify-content-between align-items-center">
                               <button
                                    className={`btn btn-link ${selectedSchema?.schemaName === schema.schemaName ? "fw-bold" : ""}`}
                                    onClick={() => selectSchema(schema)}
                                    style={{ fontWeight: "500", color: selectedSchema?.schemaName === schema.schemaName ? "#198754" : "grey", textTransform: "uppercase", textDecoration: 'none' }}
                                ><CornerRightUp  size={24} />
                                    {schema.schemaName.toUpperCase()}
                                     {/* - [{schema.month.toUpperCase()}] */}
                                </button>
                                
                            </div>
                        ))}
                    </div>  )}
            </div>

            <div className="flex-grow-1 p-4">
            <h2 className="text-center mb-4" style={{fontFamily: "'Pacifico', cursive" 
}}><NotebookText size={34} color="black" />

            Expense Vault</h2>
<h5>Your Digital Ledger for Smart Money Management!</h5>

{showForm && (
    <div className="card p-3 mb-3">
        <div className="row">
            <div className="col-md-5">
                <input type="text" className="form-control" placeholder="Maintainance Header"
                    value={newSchema} onChange={(e) => setNewSchema(e.target.value)} />
            </div>
            <div className="col-md-4">
                <input type="text" className="form-control" placeholder="Choose Month (e.g. January)"
                    value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
            </div>
            <div className="col-md-3">
                <button className="btn btn-primary w-100" onClick={addSchema}>Create Maintainance</button>
            </div>
        </div>
    </div>
)}


 {selectedSchema && (
    <div className="card p-3">
        <h4 className="mb-3">Transactions for {selectedSchema.schemaName}</h4>

        <button className="btn btn-success w-100 mb-3" onClick={() => setShowModal(true)}>
            Add Transaction
        </button>
        <hr></hr>
        <div className="d-flex gap-2 mb-3">
            {/* Search by Name */}
            <div className="input-group" style={{ width: 287}}>
                
                <span className="input-group-text ms-2" style={{ borderRadius: '17px 0px 0px 17px' }}>
                    <FaSearch />
                </span>
                <input
                    type="text"
                    className="form-control me-4"
                    placeholder="Search by Name"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)} // ✅ This triggers re-render
                />
            </div>

            {/* Filter by Amount */}
            <div className="input-group" style={{ width: 287}}>
                <span className="input-group-text ms-2" style={{ borderRadius: '17px 0px 0px 17px' }}>
                    <FaMoneyBillWave />
                </span>
                <input
                    type="number"
                    className="form-control me-4"
                    placeholder="Filter by ₹ Remain (<=)"
                    value={amountFilter}
                    onChange={(e) => setAmountFilter(e.target.value)} // ✅ This also triggers re-render
                />
            </div>
            <button className="btn mt-2" style={{ width: 287, height:36, backgroundColor:' #e5e2e2'}} onClick={handleDownloadPDF}>
            <Download className="me-2" size={20} /> Download
            </button>
        </div>
    
        <table className="table">
            <thead>
                <tr style={{ border: '1px solid black' }}>
                    <th style={{ border: '1px solid black' }}>Date</th>
                    <th style={{ border: '1px solid black' }}>Person</th>
                    {/* <th style={{ border: '1px solid black' }}>Phone No</th> */}
                    <th style={{ border: '1px solid black' }}>Work</th>
                    <th style={{ border: '1px solid black' }}>₹ Total</th>
                    <th style={{ border: '1px solid black' }}>Given</th>
                    <th style={{ border: '1px solid black' }}> Remain</th>
                    <th style={{ border: '1px solid black' }}>Action</th>
                </tr>
            </thead>
            <tbody>
                {filteredTransactions.map((transaction, index) => ( // ✅ Use filteredTransactions here
                    <tr key={index}>
                        <td style={{ border: '1px solid black' }}>
                            {new Date(transaction.dateName).toISOString().split("T")[0].split("-").reverse().join("-")}
                        </td>
                        <td style={{ border: '1px solid black', fontWeight: 600 }}>
                            {transaction.personName.toUpperCase()}
                        </td>
                        {/* <td style={{ border: '1px solid black' }}>{transaction.phoneNo}</td> */}
                        <td style={{ border: '1px solid black' }}>{transaction.work}</td>
                        <td style={{ border: '1px solid black', fontWeight: 'bold',color:'green' }}>₹{transaction.amount}</td>
                        <td style={{ border: '1px solid black', fontWeight: '200' }}>₹{transaction.gAmt || 0}</td>
                        <td style={{ border: '1px solid black',  fontWeight: 'bold',color:'red' }}>₹{transaction.rAmt || 0}</td>
                        <td style={{ border: '1px solid black' }}>
                            <button className="btn btn-danger btn-sm me-1" onClick={() => alert("Delete Transaction Logic")}>
                            <Trash2 size={18} />
                            </button>
                            <button className="btn btn-success btn-sm"  onClick={() => handleEdit(transaction)}>
                            <Edit size={18} />
                            </button>
                        </td>
                    </tr>
                    
                    
                ))}
                <tr>
                        <td>
                           
                        </td>
                        <td></td>
                        {/* <td></td> */}
                        <td></td>
                        <td style={{ border: '1px solid black', fontWeight: 'bold',color:'green' }} >₹{filteredTransactions.reduce((sum, t) => sum + t.amount, 0)}</td>
                        <td style={{ border: '1px solid black' }} >₹ {filteredTransactions.reduce((sum, t) => sum + t.gAmt, 0)}</td>
                        <td style={{ border: '1px solid black', fontWeight: 'bold',color:'red'  }} >₹ {filteredTransactions.reduce((sum, t) => sum + t.rAmt, 0)}</td>
                        <td style={{ border: '1px solid black' }} >
                            
                        </td>
                    </tr>
                    
            </tbody>
            
        </table>
        
        <div className="d-flex  mt-4">
    <PieChart width={300} height={300}>
        <Pie 
            data={pieData} 
            cx="50%" 
            cy="50%" 
            outerRadius={100} 
            fill="#8884d8" 
            dataKey="value"
            label
        >
            {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
        </Pie>
        <Tooltip />
        <Legend />
    </PieChart>
<div style={{display: 'flex', flexDirection: 'row'}}>
<div
            style={{
                display: "flex",
                marginLeft: "1rem",
                marginTop: "1rem",
                height: "142px",
                minWidth: "160px",
                background: "rgb(255, 244, 243)",
                padding: "1rem",
                borderRadius: "12px",
                flexDirection: "column",
                alignItems: "start",
                justifyContent: "center",
            }}
        >
            <h4 style={{ wordBreak: "break-word", color: "red", fontWeight: "bold" }}>₹{totalGiven}</h4>
            <h4 style={{ wordBreak: "break-word", color: "black"}}>Amount Given</h4>
        </div>

        {/* Amount Remaining */}
        <div
            style={{
                display: "flex",
                marginLeft: "1rem",
                marginTop: "1rem",
                height: "142px",
                minWidth: "160px",
                background: "rgb(230, 244, 242)",
                padding: "1rem",
                borderRadius: "12px",
                flexDirection: "column",
                alignItems: "start",
                justifyContent: "center",
            }}
        >
            <h4 style={{ wordBreak: "break-word", color: "green", fontWeight: "bold"  }}>₹{totalRemain}</h4>
            <h4 style={{ wordBreak: "break-word", color: "black" }}>Amount Remaining</h4>
        </div>

        {/* Total Amount */}
        <div
            style={{
                display: "flex",
                marginLeft: "1rem",
                marginTop: "1rem",
                height: "142px",
                minWidth: "160px",
                background: "rgb(243, 244, 245)",
                padding: "1rem",
                borderRadius: "12px",
                flexDirection: "column",
                alignItems: "start",
                justifyContent: "center",
            }}
        >
            <h4 style={{ wordBreak: "break-word", color: "red", fontWeight: "bold"  }}>₹{totalAmount1}</h4>
            <h4 style={{ wordBreak: "break-word", color: "black" }}>Total Amount</h4>
        </div>
        {/* Status */}
        <div
            style={{
                display: "flex",
                marginLeft: "1rem",
                marginTop: "1rem",
                height: "142px",
                minWidth: "160px",
                background: "#e6e6fa",
                padding: "1rem",
                borderRadius: "12px",
                flexDirection: "column",
                alignItems: "start",
                justifyContent: "center",
            }}
        >
            <h4 style={{ wordBreak: "break-word", fontWeight: "bold", color: "#333" }}>Status:</h4>
            <h4 style={{ wordBreak: "break-word", color: getStatus() === "Completed" ? "green" : "black" }}>
                {getStatus()}
            </h4>
            {getStatus() === "Completed" && (
                <button className="btn btn-primary mt-2" onClick={handleDownloadPDF}>
                    <Download size={18} className="me-1" />
                    Download Invoice
                </button>
            )}
        </div>


    </div>

</div>

        {/* <div className="mt-3 text-end">
            <h5>Total: ₹{filteredTransactions.reduce((sum, t) => sum + t.amount, 0)}</h5>
        </div> */}
    </div>
)}
            </div>

            {editData && (
  <div className="modal" style={{ 
    position: "fixed", 
    top: 0, 
    left: 0, 
    width: "100vw", 
    height: "auto", 
    background: "rgba(0, 0, 0, 0.5)", 
    display: "flex", 
    justifyContent: "center", 
    alignItems: "center" 
  }}>
    <div className="modal-content">
      <h3>Edit Transaction</h3>
      <label>Date:</label>
      <input type="date" name="dateName" value={editData.dateName} onChange={handleChange} />

      <label>Person Name:</label>
      <input type="text" name="personName" value={editData.personName} onChange={handleChange} />

      <label>Phone No:</label>
      <input type="text" name="phoneNo" value={editData.phoneNo} onChange={handleChange} />

      <label>Work:</label>
      <input type="text" name="work" value={editData.work} onChange={handleChange} />

      <label>Total Amount:</label>
      <input type="number" name="tAmt" value={editData.tAmt} onChange={handleChange} />

      <label>Given Amount:</label>
      <input type="number" name="gAmt" value={editData.gAmt} onChange={handleAmountChange} />

      <label>Remaining Amount:</label>
      <input type="number" name="rAmt" value={editData.rAmt} onChange={handleAmountChange} />

      <button onClick={handleSubmit} style={{ marginRight: "10px" }}>Save</button>
        <button onClick={() => setEditData(null)}>Cancel</button>
    </div>
  </div>
)}




            {/* Modal for Adding Transaction */}
            {showModal && (
                <div className="modal show d-block" tabIndex="-1">
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Add Transaction</h5>
                                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                            </div>
                              {/* Search & Filter Section */}
                   
                            <div className="modal-body">
                            <input type="date" className="form-control mb-2" placeholder="Enter DAte" value={dateName} onChange={(e) => setDateName(e.target.value)} />
                                <input type="text" className="form-control mb-2" placeholder="Person Name" value={personName} onChange={(e) => setPersonName(e.target.value)} />
                                <input type="text" className="form-control mb-2" placeholder="Phone No" value={phoneNo} onChange={(e) => setPhoneNo(e.target.value)} />
                                <input type="text" className="form-control mb-2" placeholder="Work" value={work} onChange={(e) => setWork(e.target.value)} />
                                {/* <input type="number" className="form-control mb-2" placeholder="Total Amount" value={amount} onChange={(e) => setAmount(e.target.value)} /> */}
                                <input
    type="number"
    className="form-control mb-2"
    placeholder="Total Amount"
    value={amount}
    onChange={(e) => {
        const value = e.target.value;
        setAmount(value);
        if (gAmt) setRAmt(value - gAmt);
        if (rAmt) setGAmt(value - rAmt);
    }}
/>
<input
    type="number"
    className="form-control mb-2"
    placeholder="Given Amount"
    value={gAmt}
    onChange={(e) => {
        const value = e.target.value;
        setGAmt(value);
        setRAmt(amount - value);
    }}
/>
<input
    type="number"
    className="form-control mb-2"
    placeholder="Remaining Amount"
    value={rAmt}
    onChange={(e) => {
        const value = e.target.value;
        setRAmt(value);
        setGAmt(amount - value);
    }}
/>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Close</button>
                                <button type="button" className="btn btn-primary" onClick={addTransaction}>Save Transaction</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        // </div>
    );
};

export default Kahata;

{/* <div className="col-md-10">
          <div className="row">
         
            <div className="col-md-5 p-3 border-end">
              <h4>Add Supplier</h4>
              <form>
                <div className="mb-3">
                  <label className="form-label">Supplier Name</label>
                  <input type="text" className="form-control" placeholder="Enter Name" />
                </div>
                <div className="mb-3">
                  <label className="form-label">Amount</label>
                  <input type="number" className="form-control" placeholder="Enter Amount" />
                </div>
                <button type="submit" className="btn btn-primary w-100">Submit</button>
              </form>
            </div>

            <div className="col-md-7 p-3">
              <h4>Supplier Transactions</h4>
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Transaction</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>John Doe</td>
                    <td>Credit</td>
                    <td>₹5000</td>
                  </tr>
                  <tr>
                    <td>Jane Smith</td>
                    <td>Debit</td>
                    <td>₹3000</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div> */}