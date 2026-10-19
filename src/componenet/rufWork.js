import React, { useState, useEffect } from "react";

const UpdateForm = ({ formId }) => {
  const [formData, setFormData] = useState({
    srNo: "",
    name: "",
    joiningDate: "",
    roomNo: "",
    depositAmount: "",
    address: "",
    relativeAddress1: "",
    relativeAddress2: "",
    floorNo: "",
    bedNo: "",
    companyAddress: "",
    dateOfJoiningCollege: "",
    dob: "",
    rents: [{ rentAmount: "", date: "" }],
  });

  useEffect(() => {
    // Fetch existing data for the given formId
    fetch(`    https://rentmobile-api.pnminfotech.com/api/form/${formId}`)
      .then((res) => res.json())
      .then((data) => {
        setFormData(data);
      })
      .catch((err) => console.error(err));
  }, [formId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleRentChange = (index, e) => {
    const { name, value } = e.target;
    const updatedRents = [...formData.rents];
    updatedRents[index][name] = value;
    setFormData({ ...formData, rents: updatedRents });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`    https://rentmobile-api.pnminfotech.com/api/form/update/${formId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (response.ok) {
        alert("Form updated successfully!");
      } else {
        alert("Error updating form: " + result.message);
      }
    } catch (error) {
      console.error("Error updating form:", error);
    }
  };

  return (
    <div>
      <h2>Update Form</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" name="srNo" value={formData.srNo} onChange={handleChange} placeholder="Sr No" required />
        <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Name" required />
        <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} required />
        <input type="text" name="roomNo" value={formData.roomNo} onChange={handleChange} placeholder="Room No" required />
        <input type="number" name="depositAmount" value={formData.depositAmount} onChange={handleChange} placeholder="Deposit Amount" required />
        <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Address" required />
        <input type="text" name="relativeAddress1" value={formData.relativeAddress1} onChange={handleChange} placeholder="Relative Address 1" />
        <input type="text" name="relativeAddress2" value={formData.relativeAddress2} onChange={handleChange} placeholder="Relative Address 2" />
        <input type="text" name="floorNo" value={formData.floorNo} onChange={handleChange} placeholder="Floor No" required />
        <input type="text" name="bedNo" value={formData.bedNo} onChange={handleChange} placeholder="Bed No" required />
        <input type="text" name="companyAddress" value={formData.companyAddress} onChange={handleChange} placeholder="Company Address" />
        <input type="date" name="dateOfJoiningCollege" value={formData.dateOfJoiningCollege} onChange={handleChange} required />
        <input type="date" name="dob" value={formData.dob} onChange={handleChange} required />

        <h3>Rents</h3>
        {formData.rents.map((rent, index) => (
          <div key={index}>
            <input
              type="number"
              name="rentAmount"
              value={rent.rentAmount}
              onChange={(e) => handleRentChange(index, e)}
              placeholder="Rent Amount"
            />
            <input
              type="date"
              name="date"
              value={rent.date}
              onChange={(e) => handleRentChange(index, e)}
            />
          </div>
        ))}

        <button type="submit">Update</button>
      </form>
    </div>
  );
};

export default UpdateForm;
