import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Suppliers from "./Suppliers";
import Maintenance from "./Maintenance";
import Record from "./record";
import Sidebar from "./Sidebar";
import { FaWarehouse, FaClipboard, FaDatabase } from "react-icons/fa";

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="dashboard" style={{ display: "flex", background: "#fff" }}>
         <Sidebar />
         <div className="content" style={{ marginLeft: "256px", padding: "20px", flex: 1 }}>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Dashboard Overview</h2>
      <p className="text-gray-600 mb-6">
        Manage your projects, suppliers, and records efficiently. Use the sidebar to navigate or select an option below.
      </p>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="dashboard-card" onClick={() => navigate("/suppliers")}>
          <FaWarehouse className="dashboard-icon" />
          <h3>Suppliers</h3>
          <p>Manage your supplier information.</p>
        </div>

        <div className="dashboard-card" onClick={() => navigate("/maintenance")}>
          <FaClipboard className="dashboard-icon" />
          <h3>Maintenance</h3>
          <p>Track all maintenance and projects.</p>
        </div>

        <div className="dashboard-card" onClick={() => navigate("/record")}>
          <FaDatabase className="dashboard-icon" />
          <h3>Project Records</h3>
          <p>View and manage project data.</p>
        </div>
      </div>

      {/* Routes */}
      <Routes>
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/record" element={<Record />} />
        <Route path="/" element={<></>} />
      </Routes>
    </div>
    </div>
  );
};

export default Dashboard;


// https://chatgpt.com/c/67b85aac-d740-8000-a763-b260fe64bebd
// https://chatgpt.com/c/67b81d39-464c-8000-a74a-ce23392bebe5



// import React, { useState, useEffect } from "react";
// import { useParams } from "react-router-dom";
// import axios from "axios";
// import Sidebar from "./Sidebar";
// import Modal from "react-modal";
// import { PieChart, Pie, Cell, Tooltip } from "recharts";

// const ProjectDashboard = () => {
//   const { id } = useParams();
//   const [project, setProject] = useState(null);
//   const [newEmployee, setNewEmployee] = useState({ name: "",phoneNo:"", roleOrMaterial: "", salaryOrTotalPayment: "" });
//   const [payment, setPayment] = useState({ amount: "", date: "", description:"" });
//   const [selectedEmployee, setSelectedEmployee] = useState(null);
//   const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
//   const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
//   const [isTransactionSidebarOpen, setIsTransactionSidebarOpen] = useState(false);
//   const [transactions, setTransactions] = useState([]);

//   const totalPaid = transactions.reduce((sum, pay) => sum + pay.amount, 0);
//  const remainingSalary = selectedEmployee ? selectedEmployee.salaryOrTotalPayment - totalPaid : 0;  const data = [
//     { name: "Paid", value: totalPaid },
//     { name: "Remaining", value: remainingSalary },
//   ];
//   const COLORS = ["#4CAF50", "#FF5733"];
  

//   useEffect(() => {
//     axios.get(`http://localhost:5000/api/projects/${id}`)
//       .then((res) => setProject(res.data))
//       .catch((err) => console.log(err));
//   }, [id]);

//   const addEmployee = (e) => {
//     e.preventDefault();
//     axios.post(`http://localhost:5000/api/projects/${id}/employees`, newEmployee)
//       .then((res) => {
//         setProject(res.data);
//         setNewEmployee({ name: "", phoneNo:"",  roleOrMaterial: "", salaryOrTotalPayment: "" });
//         setIsEmployeeModalOpen(false);
//       })
//       .catch((err) => console.log(err));
//   };

//   const addPayment = (e) => {
//     e.preventDefault();
//     axios.post(`http://localhost:5000/api/projects/${id}/employees/${selectedEmployee}/payments`, payment)
//       .then((res) => {
//         setProject(res.data);
//         setPayment({ amount: "", date: "" , description:""});
//         setIsPaymentModalOpen(false);
//       })
//       .catch((err) => console.log(err));
//   };

//   const showTransactions = (employee) => {
//     setTransactions(employee.payments);
//     setIsTransactionSidebarOpen(true);
//   };

//   if (!project) return <h2>Loading...</h2>;

//   return (
//     <div className="dashboard" style={{ display: "flex", background: "#fff" }}>
//       <Sidebar />
//       <div className="content" style={{ marginLeft: "256px", padding: "20px", flex: 1 }}>
//       <p style={{ fontFamily:'"Patua One", serif' , fontWeight:'1000' }}>~{project.description}</p> 
//         <h2 className="dashboard-title">{project.heading} - Dashboard</h2>
//         <div style={{ fontSize:20,   display: 'flex', flexWrap: "wrap"}}>
//           {/* <p style={{ fontFamily: '"Patua One", serif' , fontWeight:'1000' }}>~{project.description}</p>  */}

//         <button onClick={() => setIsEmployeeModalOpen(true)}>Add Employee </button>
//         <button onClick={() => setIsEmployeeModalOpen(true)}>Supplier</button>
//         <button onClick={() => setIsEmployeeModalOpen(true)}>Invoice</button>

//         </div>
// <Modal 
//   isOpen={isEmployeeModalOpen}  
//   onRequestClose={() => setIsEmployeeModalOpen(false)}
//   style={{
//     overlay: {
//       backgroundColor: "rgba(0, 0, 0, 0.5)",
//     },
//     content: {
//       width: "400px",
//       height: "auto",
//       margin: "auto",
//       padding: "20px",
//       borderRadius: "10px",
//       border: "none",
//       boxShadow: "0px 4px 10px rgba(0,0,0,0.1)",
//     }
//   }}
// >
//   <h3>Add Employee</h3>
//   <form onSubmit={addEmployee}>
//     <input type="text" placeholder="Name" value={newEmployee.name} onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })} required />
//     <input type="text" placeholder="Phone No" value={newEmployee.phoneNo} onChange={(e) => setNewEmployee({ ...newEmployee, phoneNo: e.target.value })} required />
//     <input type="text" placeholder="Role / Material" value={newEmployee.roleOrMaterial} onChange={(e) => setNewEmployee({ ...newEmployee, roleOrMaterial: e.target.value })} required />
//     <input type="text" placeholder="salary" value={newEmployee.salaryOrTotalPayment} onChange={(e) => setNewEmployee({ ...newEmployee, salaryOrTotalPayment: e.target.value })} required />  
//     <div style={{display:'flex', justifyContent:"center", marginTop:30}}>
//     <button onClick={() => setIsEmployeeModalOpen(false)}>Close</button>

//     <button type="submit">Add</button>
//     </div>
//   </form>
// </Modal>


//         <h3>Employees</h3>
//         <table>
//           <thead>
//             <tr>
//               <th>Name</th>
//               <th>Phone No.</th>
//               <th>Role/Material</th>
//               <th>Salary</th>
//               <th>Payment History</th>
//               <th>Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {project.employees.map((emp) => (
//               <tr key={emp._id}>
//                 <td>{emp.name}</td>
//                 <td>{emp.phoneNo}</td>
//                 <td>{emp.roleOrMaterial}</td>
//                 <td>{emp.salaryOrTotalPayment}</td>
//                 <td>
//                   <button onClick={() => showTransactions(emp)}>View Transactions</button>
//                 </td>
//                 <td>
//                   <button onClick={() => { setSelectedEmployee(emp._id); setIsPaymentModalOpen(true); }}>Add Payment</button>
//                 </td>
//               </tr>
//             ))}
//             <tr>
//               <td colSpan="3" style={{ fontWeight: "bold" }}>
//                       Total Salary
//               </td>
//               <td style={{ fontWeight: "bold" }}>
//       ₹{project.employees.reduce((total, emp) => total + parseFloat(emp.salaryOrTotalPayment || 0), 0)}
//     </td>
//     <td colSpan="2"></td>

//             </tr>
//           </tbody>
//         </table>

//         <Modal 
//   isOpen={isPaymentModalOpen} 
//   onRequestClose={() => setIsPaymentModalOpen(false)}
//   style={{
//     overlay: {
//       backgroundColor: "rgba(0, 0, 0, 0.5)",
//     },
//     content: {
//       width: "400px",
//       height: "auto",
//       margin: "auto",
//       padding: "20px",
//       borderRadius: "10px",
//       border: "none",
//       boxShadow: "0px 4px 10px rgba(0,0,0,0.1)",
//     }
//   }}
// >
//   <h4>Add Payment</h4>
//   <form onSubmit={addPayment}>
//     <input type="number" placeholder="Amount" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} required />
//     <input type="date" value={payment.date} onChange={(e) => setPayment({ ...payment, date: e.target.value })} required />
//     <input type="text" value={payment.description}  placeholder="description" onChange={(e) => setPayment({ ...payment, description: e.target.value })} required />

//   <div style={{display:'flex', justifyContent:"center", marginTop:30}}>
//   <button type="submit">Pay</button>
//   <button onClick={() => setIsPaymentModalOpen(false)}>Close</button>
//   </div>
//   <hr></hr>
//   </form>

// </Modal>

//       </div>

//       {isTransactionSidebarOpen && (
//   <div
//     className="transaction-sidebar"
//     style={{
//       position: "fixed",
//       right: 0,
//       top: 0,
//       width: "320px",
//       height: "100%",
//       background: "#fff",
//       boxShadow: "-4px 0 10px rgba(0,0,0,0.1)",
//       padding: "20px",
//       overflowY: "auto",
//       display: "flex",
//       flexDirection: "column",
//       borderLeft: "3px solid #4CAF50",
//     }}
//   >
//     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
//       <h3 style={{ fontSize: "20px", color: "#333", fontWeight: "bold" }}>Payment History</h3>
//       <button
//         onClick={() => setIsTransactionSidebarOpen(false)}
//         style={{
//           background: "red",
//           color: "#fff",
//           border: "none",
//           padding: "6px 12px",
//           borderRadius: "5px",
//           cursor: "pointer",
//         }}
//       >
//         Close
//       </button>
//     </div>
    
//  <ul style={{ listStyleType: "none", padding: 0, margin: 0 }}>
//       {transactions.length > 0 ? (
//         transactions.map((pay, index) => (
//           <li
//             key={index}
//             style={{
//               background: "#f1f1f1",
//               padding: "12px",
//               borderRadius: "8px",
//               marginBottom: "10px",
//               justifyContent: "space-between",
//               alignItems: "center",
//               boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
//             }}
//           >
//             <div style={{ display: "flex", justifyContent: "space-between" }}>
//               <p style={{ margin: 0, fontWeight: "900", color: "#333" }}>
//                 - ₹{pay.amount} /
//               </p>
//               <p style={{ color: "rgb(207 164 45)", fontWeight: "400" }}>
//                 {new Date(pay.date).toLocaleDateString()}
//               </p>
//             </div>
//           </li>
//         ))
//       ) : (
//         <p style={{ textAlign: "center", color: "#777", marginTop: "20px" }}>
//           No transactions found.
//         </p>
//       )}
//     </ul>


 
 
//     <hr></hr>
//     <div className="transaction-sidebar">
//     <h3>Payment History for {selectedEmployee?.name}</h3>
    
//     <PieChart width={250} height={250}>
//       <Pie
//         data={data}
//         cx="50%"
//         cy="50%"
//         innerRadius={50}
//         outerRadius={80}
//         fill="#8884d8"
//         dataKey="value"
//       >
//         {data.map((entry, index) => (
//           <Cell key={`cell-${index}`} fill={COLORS[index]} />
//         ))}
//       </Pie>
//       <Tooltip />
//     </PieChart>

//     <h4>Total Salary: ₹{selectedEmployee}</h4>
//     <h4>Paid: ₹{totalPaid}</h4>
//     <h4>Remaining: ₹{remainingSalary}</h4>
//   </div>
//     <h3 style={{ textAlign: "center", color: "#333" }}>
//       Total Paid: ₹{totalPaid}
//     </h3>
//   </div>
// )}

//     </div>
//   );
// };


// export default ProjectDashboard;
