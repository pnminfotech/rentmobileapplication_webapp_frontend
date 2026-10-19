import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "./Sidebar";
import "../Pages/khata.css";
import  ReactModal from "react-modal";

const Suppliers = () => {
  const [view, setView] = useState("list");
  const [form, setForm] = useState({name: "", phoneNo: "", address: "", materialName: "",totalPayment: "", }); 
  const [transaction, setTransaction] = useState({ amount: "", description: "" });
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [suppliers, setSuppliers] = useState([]);  // Define suppliers state
  const [expandedSupplier, setExpandedSupplier] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [search, setSearch] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get("    https://rentmobile-api.pnminfotech.com/api/suppliers");
      setSuppliers(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetch("    https://rentmobile-api.pnminfotech.com/api/suppliers")
      .then((res) => res.json())
      .then((data) => setSuppliers(data))
      .catch((err) => console.error("Error fetching suppliers:", err));
  }, []);

  const toggleAccordion = (supplierId) => {
    setExpandedSupplier(expandedSupplier === supplierId ? null : supplierId);
  };

  const openModal = (material) => {
    setSelectedMaterial(material);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedMaterial(null);
  };
  const filteredProjects = suppliers.filter((project) =>
    project.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const newSupplier = {
        name: form.name,
        phoneNo: form.phoneNo,
        address: form.address,
        materials: [
          {
            name: form.materialName,
            payments: [{ amount: Number(form.totalPayment), description: "Initial Payment" }],
          },
        ],
      };

      const res = await axios.post("    https://rentmobile-api.pnminfotech.com/api/suppliers", newSupplier);
      setSuppliers([...suppliers, res.data]);

      setForm({ name: "", phoneNo: "", address: "", materialName: "", totalPayment: "" });
    } catch (err) {
      console.log(err);
    }
  };

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSupplier) return;

    try {
      const res = await axios.post(`    https://rentmobile-api.pnminfotech.com/api/suppliers/${selectedSupplier._id}/payment`, transaction);
      setSuppliers((prevSuppliers) =>
        prevSuppliers.map((supplier) => (supplier._id === selectedSupplier._id ? res.data : supplier))
      );
      setTransaction({ amount: "", description: "" });
      setSelectedSupplier(res.data); // Update selected supplier with new data
    } catch (err) {
      console.log(err);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedSupplier(null);
  };
  
// Function to calculate remaining balance
const calculateRemainingBalance = (totalPayment, payments) => {
  // Check if payments is an array and has data
  const totalPaid = Array.isArray(payments)
    ? payments.reduce((sum, payment) => sum + payment.amount, 0)
    : 0; // If payments is not an array, set totalPaid to 0
  return totalPayment - totalPaid;
};

// const openModal = (material) => {
//   console.log("Opening modal for:", material); // Debugging
//   setSelectedMaterial(material);
// };

// const closeModal = () => {
//   setSelectedMaterial(null);
// };

  return (
   <div className="" style={{ display: "flex", background: "#fff" }}>
      <Sidebar />

      <div className="content" style={{ marginLeft: "206px", padding: "20px", flex: 1 }}>
       

        {view === "add" ? (
          <div className="supplier-form">
            <h2 className="dashboard-title">Add Supplier</h2>
            <div className="top-bar">
            <input
              type="text"
              placeholder="Search supplier by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-bar"
            />
         
            <div className="toggle-buttons">
          <button onClick={() => setView("add")} className={view === "add" ? "active" : ""}>
            Add Supplier
          </button>
          <button onClick={() => setView("list")} className={view === "list" ? "active" : ""}>
            All Suppliers
          </button>
          <button onClick={() => setView("list")} className={view === "list" ? "active" : ""}>
            Download
          </button>
        </div>
          </div>
          <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        required
      />
      <input
        type="text"
        placeholder="Phone No"
        value={form.phoneNo}
        onChange={(e) => setForm({ ...form, phoneNo: e.target.value })}
        required
      />
      <input
        type="text"
        placeholder="Address"
        value={form.address}
        onChange={(e) => setForm({ ...form, address: e.target.value })}
        required
      />
      <input
        type="text"
        placeholder="Material Name"
        value={form.materialName}
        onChange={(e) => setForm({ ...form, materialName: e.target.value })}
        required
      />
      <input
        type="number"
        placeholder="Total Payment"
        value={form.totalPayment}
        onChange={(e) => setForm({ ...form, totalPayment: e.target.value })}
        required
      />
      <button type="submit">Add Supplier</button>
    </form>
          </div>
        ) : (
          <div className="supplier-list">
          <h2 className="dashboard-title">All Suppliers</h2>
          <div className="top-bar">
            <input
              type="text"
              placeholder="Search supplier by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-bar"
            />
         
            <div className="toggle-buttons">
          <button onClick={() => setView("add")} className={view === "add" ? "active" : ""}>
            Add Supplier
          </button>
          <button onClick={() => setView("list")} className={view === "list" ? "active" : ""}>
            All Suppliers
          </button>
          <button onClick={() => setView("list")} className={view === "list" ? "active" : ""}>
            Download
          </button>
        </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone No</th>
                <th>Address</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <React.Fragment key={supplier._id}>
                  <tr onClick={() => toggleAccordion(supplier._id)} style={{ cursor: "pointer" }}>
                    <td style={{ fontWeight: "900" }}>{supplier.name}</td>
                    <td>{supplier.phoneNo}</td>
                    <td>{supplier.address}</td>
                    <td>{expandedSupplier === supplier._id ? "▲" : "▼"}</td>
                  </tr>
                  {expandedSupplier === supplier._id && (
                    <tr>
                      <td colSpan={4}>
                        <table style={{ width: "100%", marginTop: "10px", borderCollapse: "collapse" }}>
                          <thead>
                            <tr>
                              <th>Material</th>
                              <th>Actions</th>
                              <th>Update</th>
                            </tr>
                          </thead>
                          <tbody>
                            {supplier.materials.map((material) => (
                              <tr key={material._id}>
                                <td>{material.name}</td>
                                <td>
                                  <button onClick={() => openModal(material)}>View Payments</button>
                                </td>
                                <td>
                                  <button onClick={() => openModal(material)}>add Payments</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
      
          {/* Modal for Payments */}
          <ReactModal
  isOpen={!!selectedMaterial}
  onRequestClose={closeModal}
  contentLabel="Payment Details"
  style={{
    overlay: { backgroundColor: "rgba(0, 0, 0, 0.5)" },
    content: { width: "50%", margin: "auto", padding: "20px", borderRadius: "10px" }
  }}>
            <h2>Payments for {selectedMaterial?.name}</h2>
            <table>
              <thead>
                <tr>
                  <th>Amount</th>
                  <th>Description</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {selectedMaterial?.payments.map((payment) => (
                  <tr key={payment._id}>
                    <td>₹{payment.amount}</td>
                    <td>{payment.description}</td>
                    <td>{new Date(payment.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={closeModal}>Close</button>
          </ReactModal>
        </div>
        )}      
      </div>
      <ReactModal show={isModalOpen} onHide={handleModalClose}>
          <ReactModal.Header closeButton>
            <ReactModal.Title>{modalType === "view" ? "Supplier Details" : "Edit Supplier"}</ReactModal.Title>
          </ReactModal.Header>
          <ReactModal.Body>
            {modalType === "view" ? (
              <div>
                <p><strong>Name:</strong> {selectedSupplier?.name}</p>
                <p><strong>Phone No:</strong> {selectedSupplier?.phoneNo}</p>
                <p><strong>Address:</strong> {selectedSupplier?.address}</p>
                <p><strong>Material:</strong> {selectedSupplier?.materialName}</p>
                <p><strong>Total Payment:</strong> ₹{selectedSupplier?.totalPayment}</p>
                <p><strong>Remaining Balance:</strong> ₹{calculateRemainingBalance(selectedSupplier?.totalPayment, selectedSupplier?.payments)}</p>
                
                {/* Display Payments */}
                <h5>Payments:</h5>
                <ul>
                  {selectedSupplier?.payments?.map((payment, index) => (
                    <li key={index}>
                      <strong>Amount:</strong> ₹{payment.amount}, <strong>Description:</strong> {payment.description}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <form>
                <input
                  type="number"
                  value={transaction.amount || ""}
                  onChange={(e) => setTransaction({ ...transaction, amount: e.target.value })}
                  placeholder="Amount"
                />
                <input
                  type="text"
                  value={transaction.description || ""}
                  onChange={(e) => setTransaction({ ...transaction, description: e.target.value })}
                  placeholder="Description"
                />
                <button onClick={handleTransactionSubmit} type="submit">Add Payment</button>
              </form>
            )}
          </ReactModal.Body>
          <ReactModal.Footer>
            <button onClick={handleModalClose}>Close</button>
          </ReactModal.Footer>
        </ReactModal>


        
    </div>
  );
};

export default Suppliers;
