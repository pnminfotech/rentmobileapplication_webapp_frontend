import React, { useState } from "react";
import Modal from "react-modal";
import { Pencil, Trash2 } from "lucide-react";

const TransactionHistory = ({ transactions, onClose, onEdit, onDelete }) => {
  return (
    <Modal
      isOpen={!!transactions}
      onRequestClose={onClose}
      style={{
        overlay: { backgroundColor: "rgba(0, 0, 0, 0.5)" },
        content: {
          width: "500px",
          margin: "auto",
          padding: "20px",
          borderRadius: "10px",
          border: "none",
          boxShadow: "0px 4px 10px rgba(0,0,0,0.1)",
        },
      }}
    >
      <h3>Transaction History</h3>
      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>Amount</th>
            <th>Description</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length > 0 ? (
            transactions.map((txn) => (
              <tr key={txn._id}>
                <td>₹{txn.amount}</td>
                <td>{txn.description || "N/A"}</td>
                <td>
                  {txn.date ? new Date(txn.date).toLocaleDateString() : "N/A"}
                </td>
                <td>
                <button onClick={() => onEdit(txn)}>✏ Edit</button>
                <button onClick={() => onDelete(txn._id)}>🗑 Delete</button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4">No transactions found.</td>
            </tr>
          )}
        </tbody>
      </table>
      <button onClick={onClose}>Close</button>
    </Modal>
  );
};

export default TransactionHistory;
