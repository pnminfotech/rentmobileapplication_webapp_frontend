import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Sidebar from "./Sidebar";
import Modal from "react-modal";
import TransactionHistory from "./TransactionHistory";
import EditPaymentModal from "./EditPaymentModal";
import "../Pages/khata.css";
// import { FaEye, FaWallet } from "react-icons/fa";
import {
  Eye,
  Pencil,
  Plus,
  Trash2,
  Phone,
  User,
  Store,
  Briefcase,
  DollarSign,
} from "lucide-react";

const ProjectDashboard = (projectId) => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    phoneNo: "",
    roleOrMaterial: "",
    salaryOrTotalPayment: "",
  });
  const [payment, setPayment] = useState({
    amount: "",
    date: "",
    description: "",
  });
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isTransactionSidebarOpen, setIsTransactionSidebarOpen] =
    useState(false);
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [isExistingSupplier, setIsExistingSupplier] = useState(true);
  const [supplierId, setSupplierId] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [selectedPayments, setSelectedPayments] = useState([]);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [currentTransactions, setCurrentTransactions] = useState([]);
  // const [selectedType, setSelectedType] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  // const [amount, setAmount] = useState("");
  // const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  // const [loading, setLoading] = useState(false);
  const [transactionModalData, setTransactionModalData] = useState(null);
  const [editModalData, setEditModalData] = useState(null);
  const [editType, setEditType] = useState(""); // "employee" or "supplier"
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [supplierData, setSupplierData] = useState({
    supplierId: "",
    name: "",
    phoneNo: "",
    materials: [{ name: "", payments: [{ amount: "", description: "" }] }],
  });
  const [newSupplier, setNewSupplier] = useState({
    supplierId: "",
    name: "",
    phoneNo: "",
    materials: [],
  });

  // Fetch project details (employees & suppliers)
  useEffect(() => {
    axios
      .get(`    http://localhost:8000/api/projects/${id}`)
      .then((res) => setProject(res.data))
      .catch((err) => console.log(err));
  }, [id]);
  useEffect(() => {
    axios
      .get(`h    http://localhost:8000/api/suppliers`)
      .then((res) => {
        console.log("✅ Fetched Suppliers:", res.data);
        setSuppliers(res.data || []);
      })
      .catch((err) => {
        console.error("❌ Error fetching suppliers:", err);
      });
  }, [id]);

  // Handle material change
  const handleMaterialChange = (index, field, value) => {
    const updatedMaterials = [...supplierData.materials];
    updatedMaterials[index][field] = value;
    setSupplierData({ ...supplierData, materials: updatedMaterials });
  };

  const handlePaymentChange = (matIndex, payIndex, field, value) => {
    const updatedMaterials = [...supplierData.materials];
    updatedMaterials[matIndex].payments[payIndex][field] = value;
    setSupplierData({ ...supplierData, materials: updatedMaterials });
  };

  // const addPayment1 = (matIndex) => {
  //   setSupplierData((prevData) => {
  //     const updatedMaterials = [...prevData.materials];
  //     updatedMaterials[matIndex].payments.push({ amount: "", description: "" });
  //     return { ...prevData, materials: updatedMaterials };
  //   });
  // };
  const openModal = (type, item, material = null) => {
    console.log(
      "Opening Modal with Type:",
      type,
      "Item:",
      item,
      "Material:",
      material
    );

    if (type === "supplier" && (!material || !material._id)) {
      console.error("Material ID is missing in openModal:", material);
      alert("Error: Material ID is missing!");
      return;
    }

    setSelectedType(type);
    setSelectedItem(item);
    setSelectedMaterial(
      material ? { ...material, materialId: material._id } : null
    );
    setModalOpen(true);
  };

  // Close Modal
  const closeModal = () => {
    setModalOpen(false);
    setSelectedType(null);
    setSelectedItem(null);
    setSelectedMaterial(null);
    setAmount("");
    setDescription("");
    setSelectedPayment(null);
  };

  const openModalP = (type, payment) => {
    setSelectedType(type);
    setSelectedPayment(payment);
    setAmount(payment.amount);
    setDescription(payment.description);
    setDate(payment.date?.split("T")[0] || ""); // Extract YYYY-MM-DD for input
    setModalOpen(true);
  };

  const handlePaymentSubmit = async () => {
    if (!amount || !description) {
      alert("Please enter both amount and description.");
      return;
    }

    setLoading(true);
    try {
      const paymentData = { amount: parseFloat(amount), description };
      let apiUrl = "";

      if (selectedType === "employee") {
        if (!selectedItem?._id) {
          console.error("Employee ID is missing:", selectedItem);
          alert("Error: Employee ID is missing!");
          return;
        }
        apiUrl = `h    http://localhost:8000/api/projectEmpayment/${project._id}/employees/${selectedItem._id}/payments`;
      } else if (selectedType === "supplier") {
        if (!selectedMaterial?.materialId || !selectedItem?.supplierId) {
          console.error(
            "Supplier or Material ID missing:",
            selectedMaterial,
            selectedItem
          );
          alert("Error: Supplier or Material ID is missing!");
          return;
        }
        apiUrl = `h    http://localhost:8000/api/projectSpayment/${project._id}/suppliers/${selectedItem.supplierId}/materials/${selectedMaterial.materialId}/payments`;
      }

      console.log("Submitting payment to:", apiUrl, "with data:", paymentData);
      const response = await axios.post(apiUrl, paymentData);

      console.log("Payment successful:", response.data);
      alert("Payment added successfully!");
      window.location.reload();
    } catch (error) {
      console.error("Error adding payment:", error);
      alert("Failed to add payment. Check console for details.");
    }
    setLoading(false);
    closeModal();
  };

  // Submit data to backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submitting Supplier Data for Project ID:", id, supplierData); // Debugging

    if (!id || !supplierData.supplierId) {
      console.error("❌ Error: Project ID or Supplier ID is missing.");
      return;
    }
    try {
      const response = await axios.post(
        `h    http://localhost:8000/api/suppliers/projects/${id}/suppliers`,
        supplierData
      );
      console.log("✅ Supplier added successfully:", response.data);
      setIsSupplierModalOpen(false);
    } catch (error) {
      console.error(
        "❌ Error adding supplier:",
        error.response?.data || error.message
      );
    }
  };

  const handleSubmitSupplier = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `    http://localhost:8000/api/projects/add-supplier/${projectId}`,
        suppliers
      );
      alert("Supplier added successfully!");

      // Ensure the function is defined before calling it
    } catch (error) {
      console.error("Error adding supplier:", error);
      alert("Failed to add supplier.");
    }
  };
  const addEmployee = (e) => {
    e.preventDefault();
    axios
      .post(
        `    http://localhost:8000/api/projects/${id}/employees`,
        newEmployee
      )
      .then((res) => {
        setProject(res.data);
        setNewEmployee({
          name: "",
          phoneNo: "",
          roleOrMaterial: "",
          salaryOrTotalPayment: "",
        });
        setIsEmployeeModalOpen(false);
      })
      .catch((err) => console.log(err));
  };

  const handleSupplierChange = (event) => {
    const selectedName = event.target.value;
    setSelectedSupplier(selectedName);

    const selected = suppliers.find((sup) => sup.name === selectedName);
    if (selected) {
      setPhoneNo(selected.phoneNo);
      setSupplierId(selected._id);
      setSupplierData((prevData) => ({
        ...prevData,
        supplierId: selected._id,
        name: selected.name,
        phoneNo: selected.phoneNo,
      }));
    } else {
      setPhoneNo("");
      setSupplierId("");
      setSupplierData((prevData) => ({
        ...prevData,
        supplierId: "",
        name: "",
        phoneNo: "",
      }));
    }
  };

  const addPayment = (matIndex) => {
    setSupplierData((prevData) => {
      const updatedMaterials = [...prevData.materials];
      updatedMaterials[matIndex].payments.push({ amount: "", description: "" });
      return { ...prevData, materials: updatedMaterials };
    });
  };

  // const showTransactions = (employee) => {
  //   setTransactions(employee.payments);
  //   setIsTransactionSidebarOpen(true);
  // };
  const openSidebar = (payments) => {
    if (payments && payments.length > 0) {
      setSelectedPayments(payments);
      setIsTransactionSidebarOpen(true);
    }
  };
  // const openTransactionModal = (transactions) => {
  //   if (transactions && transactions.length > 0) {
  //     setCurrentTransactions(transactions);
  //     setIsTransactionModalOpen(true);
  //   }
  // };

  const openTransactionModal = (transactions) => {
    setTransactionModalData(transactions);
  };

  const openEditModal = (type, paymentData) => {
    setEditType(type);
    setEditModalData(paymentData);
    setIsEditModalOpen(true);
  };

  const closeSidebar = () => {
    setIsTransactionSidebarOpen(false);
    setSelectedPayments([]);
  };

  const addMaterialPayment = async () => {
    console.log("Received projectId:", projectId, "supplierId:", supplierId); // Debugging

    const response = await fetch(
      `h    http://localhost:8000/api/projects/${projectId}/suppliers/${supplierId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount, description }),
      }
    );
  };

  const handleNewSupplierChange = (e) => {
    setNewSupplier({ ...newSupplier, [e.target.name]: e.target.value });
  };

  const addNewMaterialField = () => {
    setNewSupplier({
      ...newSupplier,
      materials: [...newSupplier.materials, { name: "" }],
    });
  };

  const handleNewMaterialChange = (index, value) => {
    const updatedMaterials = [...newSupplier.materials];
    updatedMaterials[index].name = value;
    setNewSupplier({ ...newSupplier, materials: updatedMaterials });
  };

  const updatePayment = async (type, payment, updatedData) => {
    try {
      const endpoint =
        type === "employee"
          ? `h    http://localhost:8000/api/project/${payment.projectId}/employee/${payment.employeeId}/payment/${payment._id}`
          : `h    http://localhost:8000/api/project/${payment.projectId}/supplier/${payment.supplierId}/material/${payment.materialId}/payment/${payment._id}`;

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) throw new Error("Failed to update payment");

      console.log("Payment updated successfully");
    } catch (error) {
      console.error("Error updating payment:", error);
    }
  };

  // const fetchSuppliers = async () => {
  //   try {
  //     const response = await axios.get(`${API_BASE_URL}/projects/${projectId}`);
  //     setSuppliers(response.data.suppliers || []);
  //   } catch (error) {
  //     console.error("Error fetching suppliers:", error);
  //   }
  // };

  // const handleDeleteMaterial = async (supplierId, materialId) => {
  //   if (window.confirm("Are you sure you want to delete this material?")) {
  //     try {
  //       await deleteMaterial(projectId, supplierId, materialId);
  //       fetchSuppliers(); // Refresh the supplier list after deletion
  //     } catch (error) {
  //       alert("Failed to delete material");
  //     }
  //   }
  // };

  const handlePaymentUpdate = async () => {
    if (!selectedPayment) return;

    setLoading(true);
    await updatePayment(selectedType, selectedPayment, {
      amount,
      description,
      date,
    });
    setLoading(false);
    closeModal();
  };

  if (!project) return <h2>Loading...</h2>;

  return (
    <div className="" style={{ display: "flex", background: "#fff" }}>
      <Sidebar />
      <div
        className="content"
        style={{ marginLeft: "206px", padding: "20px", flex: 1 }}
      >
        <p style={{ fontFamily: '"Patua One", serif', fontWeight: "1000" }}>
          ~{project.description}
        </p>
        <h2 className="dashboard-title">{project.heading} - Dashboard</h2>
        <div style={{ fontSize: 20, display: "flex", flexWrap: "wrap" }}>
          <button onClick={() => setIsEmployeeModalOpen(true)}>
            Add Employee{" "}
          </button>
          <button onClick={() => setIsSupplierModalOpen(true)}>
            Add Supplier{" "}
          </button>
          <button onClick={() => setIsEmployeeModalOpen(true)}>Invoice </button>
        </div>

        {/* <h2>Employees</h2> */}
        <table border="1" cellPadding="10">
          <thead>
            <tr>
              <th>Employee</th>

              <th>Role / Sal</th>
              {/* <th>Salary</th> */}
              <th>Payment History</th>
              <th>Actions</th>
              {/* <th>Edit</th> */}
            </tr>
          </thead>
          <tbody>
            {project?.employees?.map((emp) => (
              <tr key={emp._id}>
                <td>
                  {" "}
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 500,
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                    }}
                  >
                    <p
                      style={{ display: "flex", alignItems: "center", gap: 5 }}
                    >
                      <User size={24} />
                      {emp.name}
                    </p>
                    <p
                      style={{ display: "flex", alignItems: "center", gap: 5 }}
                    >
                      <Phone size={24} />
                      {emp.phoneNo}
                    </p>
                  </div>
                </td>
                {/* <td>{emp.phoneNo}</td> */}
                <td>
                  {" "}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontWeight: "bold",
                    }}
                  >
                    <Briefcase size={16} /> {emp.roleOrMaterial}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 14,
                      color: "green",
                    }}
                  >
                    <DollarSign size={16} /> {emp.salaryOrTotalPayment}
                  </div>
                </td>
                {/* <td>{emp.salaryOrTotalPayment}</td> */}
                <td>
                  <button
                    onClick={() => openTransactionModal(emp.payments || [])}
                  >
                    View Transactions
                  </button>
                </td>
                <td>
                  <button onClick={() => openEditModal("employee", emp)}>
                    Add Payment
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan="2" style={{ fontWeight: "bold" }}>
                Total Salary
              </td>
              <td style={{ fontWeight: "bold" }}>
                ₹
                {project.employees.reduce(
                  (total, emp) =>
                    total + parseFloat(emp.salaryOrTotalPayment || 0),
                  0
                )}
              </td>
              <td colSpan="1"></td>
            </tr>
          </tbody>
        </table>

        {/* Supplier Table */}
        {/* <h2>Suppliers</h2> */}
        <table border="1" cellPadding="10">
          <thead>
            <tr>
              <th>Suppliers</th>

              <th>Role/Sal</th>
              {/* <th>Salary</th> */}
              <th>Materials</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {project?.suppliers?.length > 0 ? (
              project.suppliers.map((supplier) => (
                <React.Fragment key={supplier.supplierId}>
                  <tr>
                    <td>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 500,
                          display: "flex",
                          flexDirection: "column",
                          gap: 1,
                        }}
                      >
                        <p
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <Store size={24} /> {supplier.name}
                        </p>
                        <p
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <Phone size={24} /> {supplier.phoneNo}
                        </p>
                      </div>{" "}
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          fontWeight: "bold",
                        }}
                      >
                        <Briefcase size={16} /> Engineer
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: 14,
                          color: "green",
                        }}
                      >
                        <DollarSign size={16} /> 00000
                      </div>
                    </td>

                    <td colSpan="2">
                      <table style={{ width: "100%" }}>
                        <tbody>
                          {supplier.materials?.length > 0 ? (
                            supplier.materials.map((mat, index) => (
                              <tr key={index}>
                                <td>{mat.name}</td>
                                <td>
                                  <button
                                    onClick={() =>
                                      openTransactionModal(mat.payments || [])
                                    }
                                  >
                                    <Eye size={24} />
                                  </button>
                                  {/* <td>
                          <button onClick={() => openEditModal("supplier", mat)}>
                            Edit Payment
                          </button>
                        </td> */}
                                  {/* <button
                                    onClick={() =>
                                      openModal("supplier", mat.payments[0])
                                    }
                                    disabled={!mat.payments?.length}
                                  >
                                    <Pencil size={24} />
                                  </button> */}
                                </td>
                                <td>
                                  <button
                                    onClick={() => {
                                      console.log("Clicked Material:", mat); // Debugging log
                                      openModal("supplier", supplier, mat);
                                    }}
                                  >
                                    <Plus size={24} />
                                  </button>
                                  {/* <button onClick={() => handleDeleteMaterial(supplier.supplierId, material._id)}>
                                    <Trash2 size={24} />
                                  </button> */}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="2">No Materials</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan="4">No Suppliers Found</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Payment Modal for */}
        {/* {modalOpen && (
          <div className="modal">
            <div className="modal-content">
              <h2>
                {selectedType === "employee"
                  ? `Add Payment for ${selectedItem?.name}`
                  : `Add Payment for ${selectedItem?.name} - ${selectedMaterial?.name}`}
              </h2>
              <label>Amount:</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
              />
              <label>Description:</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description"
              />
              <div className="modal-actions">
                <button onClick={handlePaymentSubmit} disabled={loading}>
                  {loading ? "Processing..." : "Submit"}
                </button>
                <button onClick={closeModal}>Cancel</button>
              </div>
            </div>
          </div>
        )} */}

        {/*  */}
        {/* Payment Add sup/Emp Modal */}
        {/* {modalOpen && (
          <div className="modal">
            <div className="modal-content">
              <h2>Edit Payment</h2>
              <label>Amount:</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
              />

              <label>Description:</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description"
              />

              <label>Date:</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />

              <div className="modal-actions">
                <button onClick={handlePaymentUpdate} disabled={loading}>
                  {loading ? "Updating..." : "Save"}
                </button>
                <button onClick={closeModal}>Cancel</button>
              </div>
            </div>
          </div>
        )} */}

        {/* Modal Styles */}
        <style jsx>{`
          .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .modal-content {
            background: white;
            padding: 20px;
            border-radius: 8px;
            width: 300px;
            text-align: center;
          }
          .modal-actions {
            margin-top: 10px;
            display: flex;
            justify-content: space-around;
          }
          input {
            width: 100%;
            margin-bottom: 10px;
            padding: 5px;
          }
        `}</style>
        <Modal
          isOpen={isTransactionSidebarOpen}
          onRequestClose={closeSidebar}
          style={{
            overlay: { backgroundColor: "rgba(0, 0, 0, 0.5)" },
            content: {
              width: "450px",
              height: "auto",
              margin: "auto",
              padding: "20px",
              borderRadius: "10px",
              border: "none",
              boxShadow: "0px 4px 10px rgba(0,0,0,0.1)",
            },
          }}
        >
          <div className="sidebar-header">
            <h3>Payment History12</h3>
            <button onClick={closeSidebar} className="close-btn">
              Close
            </button>
          </div>

          {selectedPayments && selectedPayments.length > 0 ? (
            <ul className="transaction-list">
              {selectedPayments.map((pay) => (
                <li key={pay._id} className="transaction-item">
                  <div className="transaction-details">
                    <p className="amount">
                      ₹{pay.amount} - {pay.description || "N/A"}{" "}
                    </p>
                    {/* <p className="description">
                      <strong>Description:</strong> {pay.description || "N/A"}
                    </p> */}
                    <p className="date">
                      <strong>Date:</strong>{" "}
                      {pay.date
                        ? new Date(pay.date).toLocaleDateString()
                        : "Unknown"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-transactions">No transactions found.</p>
          )}
        </Modal>

        <Modal
          isOpen={isPaymentModalOpen}
          onRequestClose={() => setIsPaymentModalOpen(false)}
          style={{
            overlay: { backgroundColor: "rgba(0, 0, 0, 0.5)" },
            content: {
              width: "400px",
              height: "auto",
              margin: "auto",
              padding: "20px",
              borderRadius: "10px",
              border: "none",
              boxShadow: "0px 4px 10px rgba(0,0,0,0.1)",
            },
          }}
        >
          <h4>Add Payment</h4>
          <form onSubmit={addMaterialPayment}>
            <input
              type="number"
              placeholder="Amount"
              value={payment.amount}
              onChange={(e) =>
                setPayment({ ...payment, amount: e.target.value })
              }
              required
            />
            <input
              type="date"
              value={payment.date}
              onChange={(e) => setPayment({ ...payment, date: e.target.value })}
              required
            />
            <input
              type="text"
              value={payment.description}
              placeholder="description"
              onChange={(e) =>
                setPayment({ ...payment, description: e.target.value })
              }
              required
            />

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 30,
              }}
            >
              <button type="submit">Pay</button>
              <button onClick={() => setIsPaymentModalOpen(false)}>
                Close
              </button>
            </div>
            <hr></hr>
          </form>
        </Modal>
        {/* TO Add Su[ppliers]  */}
        <Modal
          isOpen={isSupplierModalOpen}
          onRequestClose={() => setIsSupplierModalOpen(false)}
          style={{
            overlay: { backgroundColor: "rgba(0, 0, 0, 0.5)" },
            content: {
              width: "450px",
              height: "auto",
              margin: "auto",
              padding: "20px",
              borderRadius: "10px",
              border: "none",
              boxShadow: "0px 4px 10px rgba(0,0,0,0.1)",
            },
          }}
        >
          <h3>Add Supplier</h3>
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              marginBottom: "10px",
            }}
          >
            <button
              onClick={() => setIsExistingSupplier(true)}
              className={isExistingSupplier ? "active" : ""}
            >
              Existing Supplier
            </button>
            <button
              onClick={() => setIsExistingSupplier(false)}
              className={!isExistingSupplier ? "active" : ""}
            >
              New Supplier
            </button>
          </div>

          {isExistingSupplier ? (
            // ✅ Form for selecting an existing supplier
            <form onSubmit={handleSubmit}>
              <label>Supplier Name:</label>
              <select value={selectedSupplier} onChange={handleSupplierChange}>
                <option value="">-- Select Supplier --</option>
                {suppliers.map((supplier) => (
                  <option key={supplier._id} value={supplier.name}>
                    {supplier.name}
                  </option>
                ))}
              </select>

              <label>Phone No.:</label>
              <input type="text" value={supplierData.phoneNo} readOnly />

              <label>Supplier ID:</label>
              <input type="text" value={supplierData.supplierId} readOnly />

              <h4>Materials</h4>
              {supplierData.materials.map((mat, matIndex) => (
                <div key={matIndex}>
                  <label>Material Name:</label>
                  <input
                    type="text"
                    value={mat.name}
                    onChange={(e) =>
                      handleMaterialChange(matIndex, "name", e.target.value)
                    }
                    required
                  />

                  <h5>Payments</h5>
                  {mat.payments.map((pay, payIndex) => (
                    <div key={payIndex}>
                      <label>Amount:</label>
                      <input
                        type="number"
                        value={pay.amount}
                        onChange={(e) =>
                          handlePaymentChange(
                            matIndex,
                            payIndex,
                            "amount",
                            e.target.value
                          )
                        }
                        required
                      />

                      <label>Description:</label>
                      <input
                        type="text"
                        value={pay.description}
                        onChange={(e) =>
                          handlePaymentChange(
                            matIndex,
                            payIndex,
                            "description",
                            e.target.value
                          )
                        }
                        required
                      />
                    </div>
                  ))}
                  <button type="button" onClick={() => addPayment(matIndex)}>
                    + Add Payment
                  </button>
                </div>
              ))}
              <button type="button" onClick={addMaterialPayment}>
                + Add Material
              </button>
              <button type="submit">Submit</button>
            </form>
          ) : (
            // ✅ Form for adding a new supplier
            <div className="modal-content">
              <h2>Add New Supplier</h2>
              <form onSubmit={handleSubmitSupplier}>
                <label>Supplier ID:</label>
                <input
                  type="text"
                  name="supplierId"
                  value={newSupplier.supplierId}
                  onChange={handleNewSupplierChange}
                  required
                />

                <label>Name:</label>
                <input
                  type="text"
                  name="name"
                  value={newSupplier.name}
                  onChange={handleNewSupplierChange}
                  required
                />

                <label>Phone No:</label>
                <input
                  type="text"
                  name="phoneNo"
                  value={newSupplier.phoneNo}
                  onChange={handleNewSupplierChange}
                  required
                />

                <label>Materials:</label>
                {newSupplier.materials.map((material, index) => (
                  <div key={index}>
                    <input
                      type="text"
                      placeholder="Material Name"
                      value={material.name}
                      onChange={(e) =>
                        handleNewMaterialChange(index, e.target.value)
                      }
                    />
                  </div>
                ))}
                <button type="button" onClick={addNewMaterialField}>
                  + Add More Materials
                </button>

                <button type="submit">Submit</button>
              </form>
            </div>
          )}
          <button
            onClick={() => setIsSupplierModalOpen(false)}
            style={{ marginTop: "10px", background: "red", color: "white" }}
          >
            Close
          </button>
        </Modal>
        {/* TO Add Employee */}
        <Modal
          isOpen={isEmployeeModalOpen}
          onRequestClose={() => setIsEmployeeModalOpen(false)}
          style={{
            overlay: { backgroundColor: "rgba(0, 0, 0, 0.5)" },
            content: {
              width: "400px",
              height: "auto",
              margin: "auto",
              padding: "20px",
              borderRadius: "10px",
              border: "none",
              boxShadow: "0px 4px 10px rgba(0,0,0,0.1)",
            },
          }}
        >
          <h3>Add Employee</h3>
          <form onSubmit={addEmployee}>
            <input
              type="text"
              placeholder="Name"
              value={newEmployee.name}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, name: e.target.value })
              }
              required
            />
            <input
              type="text"
              placeholder="Phone No"
              value={newEmployee.phoneNo}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, phoneNo: e.target.value })
              }
              required
            />
            <input
              type="text"
              placeholder="Role / Material"
              value={newEmployee.roleOrMaterial}
              onChange={(e) =>
                setNewEmployee({
                  ...newEmployee,
                  roleOrMaterial: e.target.value,
                })
              }
              required
            />
            <input
              type="text"
              placeholder="salary"
              value={newEmployee.salaryOrTotalPayment}
              onChange={(e) =>
                setNewEmployee({
                  ...newEmployee,
                  salaryOrTotalPayment: e.target.value,
                })
              }
              required
            />
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 30,
              }}
            >
              <button onClick={() => setIsEmployeeModalOpen(false)}>
                Close
              </button>
              <button type="submit">Add</button>
            </div>
          </form>
        </Modal>
        {/* {isTransactionModalOpen && (
  <TransactionHistory
    transactions={currentTransactions}
    onClose={() => setIsTransactionModalOpen(false)}
    onEdit={(txn) => console.log("Edit", txn)}
    onDelete={(txnId) => console.log("Delete", txnId)}
  />
)} */}

        {/* Edit Payment Modal */}
        <EditPaymentModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          paymentData={editModalData}
          type={editType}
          projectId={project._id}
        />
        {/* Transaction History Modal */}
        {transactionModalData && (
          <TransactionHistory
            transactions={transactionModalData}
            onClose={() => setTransactionModalData(null)}
            onEdit={(txn) => openEditModal("employee", txn)}
            onDelete={(txnId) => console.log("Delete Transaction", txnId)}
          />
        )}
      </div>
    </div>
  );
};

export default ProjectDashboard;

//  <h3>Suppliers</h3>
// <table>
//   <thead>
//     <tr>
//       <th>Name</th>
//       <th>Phone No.</th>
//       <th>Material</th>
//       <th>Total Payment</th>
//     </tr>
//   </thead>
//   <tbody>
//     {project?.suppliers.map((supplier) => (
//       <tr key={supplier._id}>
//         <td>{supplier.name}</td>
//         <td>{supplier.phoneNo}</td>
//         <td>{supplier.materials?.map(m => m.name).join(", ") || "N/A"}</td>
//         <td>₹{supplier.materials?.reduce((sum, m) => sum + (m.payments?.reduce((pSum, p) => pSum + p.amount, 0) || 0), 0)}</td>
//       </tr>
//     ))}
//   </tbody>
// </table>
//  <hr></hr>

//     <h3 style={{ textAlign: "center", color: "#333" }}>
//       Total Paid: ₹{totalPaid}
//     </h3>
// <div className="transaction-sidebar">
// <h3>Payment History for {selectedEmployee?.name}</h3>

// <PieChart width={250} height={250}>
//   <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} fill="#8884d8" dataKey="value">
//     {data.map((entry, index) => (
//       <Cell key={`cell-${index}`} fill={COLORS[index]} />
//     ))}
//   </Pie>
//   <Tooltip />
// </PieChart>

// <h4>Total Salary: ₹{selectedEmployee}</h4>
// <h4>Paid: ₹{totalPaid}</h4>
// <h4>Remaining: ₹{remainingSalary}</h4>
// </div>

{
  /* Payment History Sidebar */
}
{
  /* <div className="sidebar-content">
  <div className="sidebar-header">
    <h3>Payment History22</h3>
    <button onClick={closeSidebar} className="close-btn">Close</button>
  </div>

  {selectedPayments && selectedPayments.length > 0 ? (
    <ul className="transaction-list"> 
      {selectedPayments.map((pay) => (
        <li key={pay._id} className="transaction-item">
          <div className="transaction-details">
            <p className="amount">₹{pay.amount}</p>
            <p className="description">
              <strong>Description:</strong> {pay.description || "N/A"}
            </p>
            <p className="date">
              <strong>Date:</strong> {pay.date ? new Date(pay.date).toLocaleDateString() : "Unknown"}
            </p>
          </div>
        </li>
      ))}
    </ul>
  ) : (
    <p className="no-transactions">No transactions found.</p>
  )}
</div> */
}

{
  /* {isTransactionSidebarOpen && (
  <div className="transaction-sidebar"  style={{ position: "fixed", right: 0, top: 0, width: "320px",  height: "100%", background: "#fff",
      boxShadow: "-4px 0 10px rgba(0,0,0,0.1)",  padding: "20px",  overflowY: "auto", display: "flex", flexDirection: "column",
      borderLeft: "3px solid #4CAF50", }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
      <h3 style={{ fontSize: "20px", color: "#333", fontWeight: "bold" }}>Payment History99</h3>
      <button onClick={() => setIsTransactionSidebarOpen(false)}
        style={{background: "red", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "5px", cursor: "pointer", }}>
        Close
      </button>
    </div>
    
 <ul style={{ listStyleType: "none", padding: 0, margin: 0 }}>
      {transactions.length > 0 ? (
        transactions.map((pay, index) => (
          <li key={index} style={{ background: "#f1f1f1", padding: "12px", borderRadius: "8px", marginBottom: "10px",
              justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <p style={{ margin: 0, fontWeight: "900", color: "#333" }}> - ₹{pay.amount} / </p>
              <p style={{ color: "rgb(207 164 45)", fontWeight: "400" }}>{new Date(pay.date).toLocaleDateString()}  </p>
            </div>
          </li>
        ))
      ) : (
        <p style={{ textAlign: "center", color: "#777", marginTop: "20px" }}>
          No transactions found.
        </p>
      )}
    </ul>
  </div>
)} */
}
