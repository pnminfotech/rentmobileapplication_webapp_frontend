
import { useState, useEffect } from "react";
import axios from "axios";
import React from "react";
import Sidebar from "./Sidebar";
import {Link} from 'react-dom'
const AdminSidebar =()=>{
    const [suppliers, setSuppliers] = useState([]);
    const [transaction, setTransaction] = useState({ given: "", received: "" });
    const [selectedSupplier, setSelectedSupplier] = useState(null);
  
    useEffect(() => {
      axios.get("    https://rentmobile-api.pnminfotech.com/api/suppliers")
        .then((res) => setSuppliers(res.data))
        .catch((err) => console.log(err));
    }, []);
  
    const handleTransactionSubmit = (e) => {
      e.preventDefault();
      if (!selectedSupplier) return;
  
      axios.put(`    https://rentmobile-api.pnminfotech.com/api/suppliers/${selectedSupplier._id}/payments`, transaction)
        .then((res) => {
          setSuppliers(suppliers.map((s) => (s._id === selectedSupplier._id ? res.data : s)));
          setTransaction({ given: "", received: "" });
        })
        .catch((err) => console.log(err));
    };
  
    return (
      <div className="dashboard" style={{ display: "flex", background: "#fff" }}>
          <Sidebar /> 
          <div className="content" style={{ marginLeft: "256px", padding: "20px", flex: 1 }}>
  
      <h3>Supplier Transactions</h3>
      <table border="1">
        <thead>
          <tr>
            <th>Supplier Name</th>
            <th>Given Amount</th>
            <th>Received Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Supplier 1</td>
            <td>1000</td>
            <td>500</td>
          </tr>
          <tr>
            <td>Supplier 2</td>
            <td>2000</td>
            <td>1000</td>
          </tr>
          <tr>
            <td>Supplier 3</td>
            <td>1500</td>
            <td>750</td>
          </tr>
        </tbody>
      </table>
    </div>
    </div>
    );
  };
export default AdminSidebar;