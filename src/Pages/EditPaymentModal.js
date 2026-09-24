import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import axios from "axios";

const EditPaymentModal = ({ isOpen, onClose, paymentData, type, projectId }) => {
  const [amount, setAmount] = useState(paymentData?.amount || "");
  const [description, setDescription] = useState(paymentData?.description || "");

  useEffect(() => {
    if (paymentData) {
      setAmount(paymentData.amount);
      setDescription(paymentData.description);
    }
  }, [paymentData]);

  const handleSave = () => {
    if (!paymentData) {
      console.error("No paymentData found!"); // Debugging check
      return;
    }
  
    const { employeeId } = paymentData;
    
    if (!employeeId) {
      console.error("employeeId is missing in paymentData!", paymentData);
    }
  
    console.log("Saving payment data for employeeId:", employeeId);
  };


  return (
    <Modal isOpen={isOpen} onRequestClose={onClose}  style={{
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
      }}>
      <h3>Edit Payment</h3>
      <label>Amount:</label>
      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />

      <label>Description:</label>
      <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} />

      <button onClick={handleSave}>Save</button>
      <button onClick={onClose}>Cancel</button>
    </Modal>
  );
};

export default EditPaymentModal;
