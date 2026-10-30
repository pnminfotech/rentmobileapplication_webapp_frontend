import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { FaDownload } from "react-icons/fa";
import { FaUndo } from "react-icons/fa";
import { useParams } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import * as XLSX from 'xlsx';
import '../App.css';
import { useNavigate } from "react-router-dom";
import '../stylecss/mainpage.css';
import '../componenet/Maintanace/FormDownload.css'
import FormDownload from '../componenet/Maintanace/FormDownload';
import Kahata from '../Componen/Kahata';
import { FaEdit} from "react-icons/fa";
import { Modal} from "react-bootstrap";
import { faTrash } from "@fortawesome/free-solid-svg-icons";

function AddData() {
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState("");
  const [formData, setFormData] = useState([]);
  const { id } = useParams(); 
  const [singleForm , setSingleForm] =useState(null);
  const [deletedData, setDeletedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRowData, setSelectedRowData] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [currentDeleteId, setCurrentDeleteId] = useState(null);
  const [selectedLeaveDate, setSelectedLeaveDate] = useState("");
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [currentLeaveId, setCurrentLeaveId] = useState(null);
  const [currentLeaveName, setCurrentLeaveName] = useState("");
   const [isLightBill, setIsLightBill] = useState(true);
 const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // Default: current year
  const [leaveDates, setLeaveDates] = useState({}); // Key: ID, Value: Leave Date
   const [showModal, setShowModal] = useState(false);
  const [showFModal, setShowFModal] = useState(false);
  const [currentFormId, setCurrentFormId] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [newRent, setNewRent] = useState({ rentAmount: '', date: '' });
  const [lightBills, setLightBills] = useState([]);
  const [updatedFormData, setUpdatedFormData] = useState({
    srNo: '',
    name: '',
    joiningDate: '',
    roomNo: '',
    depositAmount: '',
    address: '',
    phoneNo:'',
    relativeAddress1: '',
    relativeAddress2: '',
    floorNo: '',
    bedNo: '',
    companyAddress: '',
  });

  // const apiUrl = '    https://rentmobile-api.pnminfotech.com/api/';
  const apiUrl = '    https://rentmobile-api.pnminfotech.com/api/';  
  const correctPassword = "987654";
 const getUndoKey = (tenantId, month) => `undo_history_${tenantId}_${month}`;

const saveUndoHistory = (tenantId, month, oldRentData) => {
  const key = getUndoKey(tenantId, month);
  localStorage.setItem(key, JSON.stringify(oldRentData));
};

const getUndoHistory = (tenantId, month) => {
  const key = getUndoKey(tenantId, month);
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
};

const clearUndoHistory = (tenantId, month) => {
  const key = getUndoKey(tenantId, month);
  localStorage.removeItem(key);
};

  
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = new Date(selectedYear, index).toLocaleString("default", { month: "short" });
    return `${month}-${selectedYear.toString().slice(-2)}`;
  });

  const [showFirstHalf, setShowFirstHalf] = useState(true);
  const toggleMonths = () => {
    setShowFirstHalf((prev) => !prev);
  };
  const visibleMonths = showFirstHalf ? months.slice(0, 6) : months.slice(5, 12);
  const roomRowStyleMap = React.useMemo(() => {
    const selectedYearNum = parseInt(selectedYear, 10);
    const orderedRooms = Array.from(
      new Set(
        (Array.isArray(formData) ? formData : [])
          .filter((data) => {
            const tenantJoiningYear = new Date(data.joiningDate).getFullYear();
            const tenantLeaveYear = data.leaveDate ? new Date(data.leaveDate).getFullYear() : null;

            return (
              tenantJoiningYear <= selectedYearNum &&
              (!tenantLeaveYear || tenantLeaveYear >= selectedYearNum)
            );
          })
          .sort((a, b) => {
            const order = [301, 302, 402];
            const indexA = order.includes(a.roomNo) ? order.indexOf(a.roomNo) : order.length;
            const indexB = order.includes(b.roomNo) ? order.indexOf(b.roomNo) : order.length;
            return indexA - indexB || a.roomNo - b.roomNo;
          })
          .map((data) => String(data.roomNo || "").trim())
          .filter(Boolean)
      )
    );

    return orderedRooms.reduce((acc, roomNo, index) => {
      acc[roomNo] = index % 2 === 0 ? "#f8e8ec" : "#ffffff";
      return acc;
    }, {});
  }, [formData, selectedYear]);

  useEffect(() => {
    axios
      .get(apiUrl)
      .then((response) => {
        setFormData(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
        setError('Failed to fetch data. Please try again later.');
        setLoading(false);
      });
  }, []);

    useEffect(() => {
      if (!id) return;
  
      const fetchData = async () => {
        try {
          // const response = await fetch(`    https://rentmobile-api.pnminfotech.com/api/form/${id}`);
          const response = await fetch(`    https://rentmobile-api.pnminfotech.com/api/form/${id}`);
          if (!response.ok) throw new Error("Failed to fetch data");
  
          const data = await response.json();
          setSingleForm(data);
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      };
  
      fetchData();
    }, [id]);
      const handleDownload = () => {
        const filteredData = formData.filter(data =>
          data.rents.some(rent => new Date(rent.date).getFullYear() === selectedYear)
        );
    
        const worksheetData = filteredData.map(data => {
          const row = {
            "Sr No.": data.srNo,
            "Name": data.name,
            "Room No.": data.roomNo,
            "Deposit Amount": data.depositAmount,
          };
    
          months.forEach(month => {
            const matchingRent = data.rents.find(rent => getMonthYear(rent.date) === month);
            row[month] = matchingRent ? matchingRent.rentAmount : "--";
          });
    
          return row;
        });
    
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `RentData-${selectedYear}`);
        XLSX.writeFile(workbook, `RentData-${selectedYear}.xlsx`);
      };

    const handleDownloadForm = async (data) => {
      try {
        const response = await axios.get(`    https://rentmobile-api.pnminfotech.com/api/form/${data._id}`);
        if (response.status !== 200) throw new Error("Failed to fetch data");
  
        const singleForm = response.data;
        console.log("Fetched Data for Download:", singleForm);
  
        if (!singleForm) {
          console.error("No data available for download.");
          return;
        }
  
        const formattedData = [
          ["Field", "Value"],
          ["Sr No", singleForm.srNo],
          ["Name", singleForm.name],
          ["Joining Date", new Date(singleForm.joiningDate).toLocaleDateString()],
          ["Room No", singleForm.roomNo],
          ["Deposit Amount", singleForm.depositAmount],
          ["Address", singleForm.address],
          ["Phone No", singleForm.phoneNo],
          ["Relative Address 1", singleForm.relativeAddress1 || "N/A"],
          ["Relative Address 2", singleForm.relativeAddress2 || "N/A"],
          ["Floor No", singleForm.floorNo],
          ["Bed No", singleForm.bedNo],
          ["Company Address", singleForm.companyAddress || "N/A"],
          ["Date of Joining College", new Date(singleForm.dateOfJoiningCollege).toLocaleDateString()],
          ["Date of Birth", new Date(singleForm.dob).toLocaleDateString()],
        ];
  
        // Handle rents array
        if (singleForm.rents && singleForm.rents.length > 0) {
          formattedData.push(["Rents", ""]);
          singleForm.rents.forEach((rent, index) => {
            formattedData.push([`Rent ${index + 1} Amount`, rent.rentAmount]);
            formattedData.push([`Rent ${index + 1} Date`, new Date(rent.date).toLocaleDateString()]);
          });
        }
  
        console.log("Formatted Data:", formattedData);
  
        // Convert to worksheet
        const ws = XLSX.utils.aoa_to_sheet(formattedData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "UserDetails");
  
        console.log("Downloading file...");
  
        // Write and trigger download
        XLSX.writeFile(wb, `UserDetails_${data._id}.xlsx`);
      } catch (error) {
        console.error("Error fetching data for download:", error);
      }
    };


const handleCancelLeave = async (id) => {
  const confirmCancel = window.confirm("Are you sure you want to cancel the leave?");
  if (!confirmCancel) return;

  try {
    const response = await axios.post(
      `    https://rentmobile-api.pnminfotech.com/api/cancel-leave`,
      { id }
    );

    if (response.data.success) {
      alert("Leave canceled successfully.");

      // Remove from leaveDates state
      setLeaveDates((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });

      // Optionally re-fetch active data (if needed)
    } else {
      alert("Failed to cancel leave. Try again.");
    }
  } catch (error) {
    console.error("Cancel leave error:", error);
    alert("Something went wrong.");
  }
};


  const navigate = useNavigate();
  const handleNavigation = (path) => {
    navigate(path);
  };


  useEffect(() => {
    fetchLightBills();
  }, []);

  const fetchLightBills = async () => {
    try {
      const response = await fetch(
        "    https://rentmobile-api.pnminfotech.com/api/light-bill/all"
      );
      const data = await response.json();
      setLightBills(data); // Assuming data is an array
    } catch (error) {
      console.error("Error fetching light bill data:", error);
    }
  };
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const idsToArchive = Object.keys(leaveDates).filter((id) => leaveDates[id] === today);
  
    idsToArchive.forEach((id) => {
      const recordToArchive = formData.find((data) => data._id === id);
      if (recordToArchive) {
        // Archive the record
        axios
          .post(`    https://rentmobile-api.pnminfotech.com/api/forms/archive`, { id })
          .then((response) => {
            console.log('Data archived:', response.data);
            // Remove from formData
            setFormData((prev) => prev.filter((data) => data._id !== id));
            // Add to deletedData
            setDeletedData((prev) => [...prev, response.data]);
          })
          .catch((error) => {
            console.error('Error archiving data:', error);
          });
      }
    });
  }, [leaveDates, formData]);
  
  useEffect(() => {
    axios
      .get(apiUrl)
      .then((response) => {
        setFormData(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
        setError('Failed to fetch data. Please try again later.');
        setLoading(false);
      });
  }, [apiUrl]);

  useEffect(() => {
    axios
      .get('    https://rentmobile-api.pnminfotech.com/api/forms/archived')
      .then((response) => {
        console.log('Archived data fetched:', response.data);
        setDeletedData(response.data); // Populate the archived data state
      })
      .catch((error) => {
        console.error('Error fetching archived data:', error);
        setError('Failed to fetch archived data.');
      });
  }, []);
  
  useEffect(() => {
    axios
      .get("    https://rentmobile-api.pnminfotech.com/api/forms")
      .then((response) => {
        const leaveData = {};
        response.data.forEach((item) => {
          if (item.leaveDate) {
            leaveData[item._id] = new Date(item.leaveDate).toISOString().split("T")[0]; 
          }
        });
        setLeaveDates(leaveData);
      })
      .catch((error) => console.error("Error fetching leave data:", error));
  }, []);
 
  
  //download sheet for light bill
  const downloadLightBillExcel = async () => {
    const apiUrl = isLightBill
      ? "    https://rentmobile-api.pnminfotech.com/api/light-bill/all"
      : "    https://rentmobile-api.pnminfotech.com/api/other-expense/all";
  
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
  
  // download Sheet for all Tenants
  // const downloadExcel = () => {
  //   const flattenedData = formData.map((data) => ({
  //     'Sr No.': data.srNo || '',
  //     Name: data.name || '',
  //     'Room No.': data.roomNo || '',
  //     'Phone No' : data.phoneNo || '',
  //     'Joining Date': formatDate(data.joiningDate) || '',
  //     'Deposit Amount': data.depositAmount || '',
  //     ...months.reduce((acc, month) => {
  //       const rent = data.rents.find((r) => getMonthYear(r.date) === month);
  //       acc[month] = rent ? `${rent.rentAmount} | ${formatDate(rent.date)}` : '--';
  //       return acc;
  //     }, {}),
  //   }));

  //   const flattenedDeletedData = deletedData.map((data, index) => ({
  //     'Sr No.': index + 1,
  //     Name: data.name || '',
  //     'Room No.': data.roomNo || '',
  //     'Joining Date': formatDate(data.joiningDate) || '',
  //     'Deposit Amount': data.depositAmount || '',
  //   }));

  //   const workbook = XLSX.utils.book_new();
  //   const activeSheet = XLSX.utils.json_to_sheet(flattenedData);
  //   const deletedSheet = XLSX.utils.json_to_sheet(flattenedDeletedData);

  //   XLSX.utils.book_append_sheet(workbook, activeSheet, 'Active Data');
  //   XLSX.utils.book_append_sheet(workbook, deletedSheet, 'Deleted Data');

  //   XLSX.writeFile(workbook, 'RentData.xlsx');
  // };
  const openUpdateModal = (id) => {
    setCurrentFormId(id);
    setShowModal(true);
  };
  const openModal = (rowData) => {
    setSelectedRowData(rowData);
    setShowFModal(true);
  };

  const closeUpdateModal = () => {
    setShowModal(false);
    setNewRent({ rentAmount: '', date: '' });
    setCurrentFormId(null);
  };

  const openFormUpdateModal = (id) => {
    setCurrentFormId(id);
    const selectedForm = formData.find((data) => data._id === id);
    if (selectedForm) {
      setUpdatedFormData({
        srNo: selectedForm.srNo,
        name: selectedForm.name,
        roomNo: selectedForm.roomNo,
        depositAmount: selectedForm.depositAmount,
        rentAmount: selectedForm.rents[0]?.rentAmount || '',
        joiningDate: selectedForm.joiningDate,
        address: selectedForm.address,
        phoneNo:selectedForm.phoneNo,
        relativeAddress1: selectedForm.relativeAddress1 || '',
        relativeAddress2: selectedForm.relativeAddress2 || '',
        floorNo: selectedForm.floorNo || '',
        bedNo: selectedForm.bedNo || '',
        companyAddress: selectedForm.companyAddress || '',
      });
    }
    setShowUpdateModal(true);
  };
  const closeFormUpdateModal = () => {
    setShowUpdateModal(false);
    setUpdatedFormData({
      srNo: '',
      name: '',
      joiningDate: '',
      roomNo: '',
      depositAmount: '',
      address: '',
      phoneNo:'',
      relativeAddress1: '',
      relativeAddress2: '',
      floorNo: '',
      bedNo: '',
      companyAddress: '',
    });
    setCurrentFormId(null);
  };

  const handleLeave = (data) => {
    setCurrentLeaveId(data._id);
    setCurrentLeaveName(data.name);
    setShowLeaveModal(true);
  };
  
  const confirmLeave = async () => {
    if (!selectedLeaveDate) {
      alert("Please select a leave date.");
      return;
    }
  
    const currentDate = new Date().toISOString().split("T")[0];
  
    try {
      const response = await fetch("    https://rentmobile-api.pnminfotech.com/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: currentLeaveId,
          leaveDate: selectedLeaveDate,
        }),
      });
  
      const result = await response.json();
  
      if (response.ok) {
        alert(result.message);
        setLeaveDates((prev) => ({ ...prev, [currentLeaveId]: selectedLeaveDate }));
        setShowLeaveModal(false);
      } else {
        alert(result.error || "Failed to process leave request.");
      }
    } catch (error) {
      console.error("Error processing leave:", error);
    }
  };
 
  



  const handleUpdate = () => { 
    if (!newRent.rentAmount || !newRent.date || !newRent.month) {
      alert("Please fill out all fields.");
      return;
    }
  
    const newRentAmount = parseFloat(newRent.rentAmount);
    const monthYear = newRent.month;
  
    if (newRentAmount === 0) {
      // 📌 If Rent Amount is 0, Call DELETE API     https://rentmobile-api.pnminfotech.com/
      axios
        .delete(`    https://rentmobile-api.pnminfotech.com/api/form/${currentFormId}/rent/${monthYear}`)
        .then(() => {
          alert("Rent removed successfully!"); 
  
          // 📌 Update UI after deletion
          setFormData((prevData) =>
            prevData.map((data) => 
              data._id === currentFormId
                ? { ...data, rents: data.rents.filter((rent) => rent.month !== monthYear) }
                : data
            )
          );
  
          closeUpdateModal();
        })
        .catch((error) => {
          console.error("Error removing rent:", error);
          alert("Failed to remove rent. Please try again.");
        });
  
      return;
    }
  const tenant = formData.find(data => data._id === currentFormId);
const existingRent = tenant?.rents?.find(r => r.month === newRent.month);

saveUndoHistory(currentFormId, newRent.month, existingRent ? {
  rentAmount: existingRent.rentAmount,
  date: existingRent.date,
  month: newRent.month
} : {
  rentAmount: null,
  date: null,
  month: newRent.month,
  status: "Rent Due!!"
});
    // 📌 Prepare data for PUT request
    const updatedRent = {
      rentAmount: newRent.rentAmount,
      date: newRent.date,
      month: newRent.month
    };
  
    // 📌 Send PUT request to update rent
   axios
  .put(`    https://rentmobile-api.pnminfotech.com/api/form/${currentFormId}`, updatedRent)
  .then((response) => {
    const patched = {
      ...response.data,
      rents: (response.data.rents || []).map((rent) => ({
        ...rent,
        month: rent.month || getMonthYear(rent.date)
      }))
    };

    setFormData((prevFormData) =>
      prevFormData.map((data) =>
        data._id === patched._id ? patched : data
      )
    );
    closeUpdateModal();
  })
      .catch((error) => {
        console.error("Error updating rent:", error);
        alert("Failed to update rent. Please try again later.");
      });
  };
  
  
  const getMonthYear = (date) => {
    const d = new Date(date);
    return `${d.toLocaleString('default', { month: 'short' })}-${d.getFullYear().toString().slice(-2)}`;
  };
  const openDeleteConfirmation = (id) => {
    setCurrentDeleteId(id);
    setShowPasswordPrompt(true); // Show password input first
  };

  const verifyPassword = () => {
    if (password === correctPassword) {
      setShowPasswordPrompt(false);
      setShowDeleteConfirmation(true);
    } else {
      alert("Incorrect password. Please try again.");
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await axios.delete(`    https://rentmobile-api.pnminfotech.com/api/form/${currentDeleteId}`);
      setFormData((prevFormData) => prevFormData.filter((data) => data._id !== currentDeleteId));
      alert('Form deleted successfully');
      setShowDeleteConfirmation(false);  // Close confirmation modal
    } catch (error) {
      console.error('Error deleting form:', error);
      alert('Failed to delete form. Please try again later.');
    }
  };


const handleUndoRent = (tenantId, month) => {
  const history = getUndoHistory(tenantId, month);
  if (!history) return;

  const updatedFormData = formData.map((tenant) => {
    if (tenant._id === tenantId) {
      const updatedRents = tenant.rents.filter((r) => r.month !== month);

      if (history.rentAmount !== null) {
        updatedRents.push({
          rentAmount: history.rentAmount,
          date: history.date,
          month: history.month
        });
      }

      return {
        ...tenant,
        rents: updatedRents
      };
    }
    return tenant;
  });

  setFormData(updatedFormData);
  clearUndoHistory(tenantId, month);
};


  const handleUndoClick = (data) => {
    const isConfirmed = window.confirm(`Are you sure you want to undo ${data.name}?`);
    if (isConfirmed) {
      undoArchive(data);
    }
  };
  




  const undoArchive = (data) => {
  axios
    .post(`    https://rentmobile-api.pnminfotech.com/api/forms/restore`, { id: data._id })
    .then(() => {
      // Re-fetch entire updated tenant list after restore
      axios.get(apiUrl).then((response) => {
        // Ensure each rent has .month field
        const updatedData = response.data.map((tenant) => ({
          ...tenant,
          rents: (tenant.rents || []).map((rent) => ({
            ...rent,
            month: rent.month || getMonthYear(rent.date)
          }))
        }));

        setFormData(updatedData);
      });

      // Clean up deleted
      setDeletedData((prev) => prev.filter((item) => item._id !== data._id));
    })
    .catch((error) => {
      console.error("Error restoring data:", error);
    });
};
  const handleFormUpdate = () => {
    // if (!updatedFormData.name || !updatedFormData.roomNo || !updatedFormData.depositAmount || !updatedFormData.rentAmount) {
    //   alert('Please fill out all fields.');
    //   return;
    // }

    axios
      .put(`    https://rentmobile-api.pnminfotech.com/api/update/${currentFormId}`, updatedFormData)
      .then((response) => {
        const updatedData = formData.map((data) =>
          data._id === response.data._id ? response.data : data
        );
        setFormData(updatedData);
        closeFormUpdateModal();
      })
      .catch((error) => {
        alert('Failed to update entity. Please try again later.');
      });
  }; 

  const formatDate = (date) => {
    const formattedDate = new Date(date).toLocaleDateString(); // Ensures only the date is displayed
    return formattedDate;
  };

  const formatDateNew = (dateString) => {
    const date = new Date(dateString);
    const options = { day: '2-digit', month: 'short', year: '2-digit' };
    return date.toLocaleDateString('en-GB', options).replace(',', '').replace(' ', '-');
  };
  

  if (loading) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  if (error) {
    return <div className="text-center mt-5 text-danger">{error}</div>;
  }

  return (
    <div className="m-4" style={{fontFamily: "Century Gothic", fontSize:12}}>
        <div className="d-flex align-items-center" >
        <label className="me-2" style={{ fontWeight: 'bold' }}>Select Year:</label>
        <select
          className="form-select w-auto"
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
        >
          {[2024, 2025, 2026, 2027, 2028, 2029, 2030 , 2031, 2032, 2033 , 2034, 2035].map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        <button className="btn btn-primary1 ms-3" onClick={handleDownload}>
         <FaDownload className="me-2" />{selectedYear} 
        </button>
        <button  className="btn btn-primary1 ms-3 me-2" onClick={toggleMonths} style={{cursor: "pointer" }}>
        {showFirstHalf ? "Show Jul - Dec >" : "< Show  Jan - Jun"}
      </button>
      <button className="btn btn-primary1 me-2" onClick={() => handleNavigation("/form")}>
         Add Tenant
        </button>
       <button className="btn btn-primary1 me-2" onClick={() => handleNavigation("/maintenance-manager")}>
         Light Bill
        </button>
        <button className="btn btn-primary1 me-2" onClick={() => handleNavigation("/maintenance-manager")}>
         Maintanace
        </button>
        <button className="btn btn-primary1 me-2" onClick={() => handleNavigation("/suppliers")}>
        Khata Book
        </button>
      <button className="btn btn-primary1 me-2" onClick={() => handleNavigation("/mainpage")}>
         Back
        </button>
      
      </div>
      
      <table className="table table-bordered table-hover" style={{border: '2px solid black'}}>
        <thead className="thead-light styled-header">

          
          <tr style={{ fontWeight: 'bold', color: 'black' }}>
            <th style={{ backgroundColor: 'rgb(199 124 136)', color:'white' }}>Sr</th>
            {/* <th style={{ backgroundColor: 'rgb(199 124 136)' , color:'white' }}>Edit</th> Combined column */}
            {/* <th style={{ backgroundColor: 'rgb(199 124 136)', color:'white' }}>Information</th> */}
            <th colSpan={2}  style={{ backgroundColor: 'rgb(199 124 136)', color:'white' }}>Name </th>
            <th style={{ backgroundColor: 'rgb(199 124 136)', color:'white' }}>Phone No. </th>
            {visibleMonths.map((month) => (
              <th key={month} style={{ backgroundColor: "rgb(199 124 136)", color: "white" }}>
                {month}
              </th>
            ))}
             <th style={{ backgroundColor: 'rgb(199 124 136)', color: 'white' }}>Leave</th>
          </tr>
          <tr>
            <th style={{ backgroundColor: 'rgb(199 124 136)', color:'white' }}></th>
            {/* <th style={{ backgroundColor: 'rgb(199 124 136)', color:'white' }}>Delete</th> */}
            {/* <th style={{ backgroundColor: 'rgb(199 124 136)', color:'white' }}></th> */}
            <th colSpan={2} style={{ backgroundColor: 'rgb(199 124 136)', color:'white' }}>Joining Date</th>
            <th style={{ backgroundColor: 'rgb(199 124 136)', color:'white' }}>Deposit Amount</th>
            {visibleMonths.map((month) => (
              <th style={{ backgroundColor: 'rgb(199 124 136)', color:'white' }} key={month}>Rent Date</th>
            ))}
            <th style={{ backgroundColor: 'rgb(199 124 136)', color: 'white' }}>Edit/Delete</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(formData) && 
        formData
        .filter((data) => {
          const tenantJoiningYear = new Date(data.joiningDate).getFullYear();
          const tenantLeaveYear = data.leaveDate ? new Date(data.leaveDate).getFullYear() : null;
          const selectedYearNum = parseInt(selectedYear, 10); // Convert selected year to a number
  
          return (
            tenantJoiningYear <= selectedYearNum && // Show only if they joined in or before the selected year
            (!tenantLeaveYear || tenantLeaveYear >= selectedYearNum) // Show only if they haven't left before the selected year
          );
        })
        .sort((a, b) => {
          const order = [301, 302, 402]; // Define the preferred order
          const indexA = order.includes(a.roomNo) ? order.indexOf(a.roomNo) : order.length;
          const indexB = order.includes(b.roomNo) ? order.indexOf(b.roomNo) : order.length;
          return indexA - indexB || a.roomNo - b.roomNo;
        })
        .map((data, index) => (
              <tr
                style={{
                  fontWeight: 'bold',
                  color: 'black',
                  backgroundColor: roomRowStyleMap[String(data.roomNo || "").trim()] || '#ffffff',
                }}
                key={index}
              >
  <td>{index + 1}</td>
  <td>
    
      <div
        className="">

       <div onClick={() => openModal(data)}
        onMouseEnter={(e) => {
          e.target.style.color = '#a12929';
          e.target.style.fontWeight = '900';
          e.target.style.cursor = 'pointer';
        }}
        onMouseLeave={(e) => {
          e.target.style.color = 'black';
          e.target.style.fontWeight = 'bold';
          e.target.style.cursor = 'default';
        }}
        style={{ 
          fontWeight: 'bold', 
          color: 'black',  
          fontSize: 15,
          whiteSpace: 'pre-wrap', // Allows text to wrap
          wordWrap: 'break-word', // Breaks words if needed
          maxWidth: '150px', // You can adjust the max width based on your design
        }}
      >
        {data.name} </div>
<p style={{marginTop:-10 , marginBottom:0}}>________________</p>
        <div style={{ color: 'rgb(209 94 13)' }}  onMouseLeave={(e) => {
          e.target.style.color = '#a12929';
          e.target.style.fontWeight = 'bold';
          e.target.style.cursor = 'default';
        }}> {formatDateNew(data.joiningDate)}</div>
      </div>
      {/* <div className="col-12" style={{ color: 'rgb(209 94 13)' }}>
        {formatDate(data.joiningDate)}
      </div> */}
    
  </td>
  <td>
  <div  className="col-auto"  style={{ fontWeight: 'bold', fontSize:15 , color: data.roomNo == 301 ? 'orange' :
                data.roomNo == 302 ? 'green' :
                data.roomNo == 401 ? 'red' :
                data.roomNo == 402 ? '#38a5e5' : '#ffc107'}}>
        {data.roomNo}
      </div>
  </td>
  <td>
    <div className="row">
      <div className="col-12" style={{    color:' #2c2c2c',
    fontWeight: 900,   }}>
        {data.phoneNo}
      </div>
     <div><hr/></div> 
      <div className="col-12" style={{ color: 'rgb(209 94 13)' }}>
       D - {data.depositAmount}
      </div>
    </div>
  </td>
  {/* {visibleMonths.map((month) => {
const matchingRent = data.rents.find((rent) => rent.month === month); */}


{visibleMonths.map((month) => {
    console.log(`Tenant: ${data.name}, Month: ${month}`, data.rents.map(r => ({
  date: r.date,
  month: r.month,
  derived: getMonthYear(r.date)
})));
console.log(`🧾 Checking rent for: ${data.name}, Month: ${month}`);
console.log(data.rents.map(r => ({
  amount: r.rentAmount,
  date: r.date,
  derivedMonth: getMonthYear(r.date),
  storedMonth: r.month
})));

 const matchingRent = data.rents.find((rent) => {
  const rentMonth = rent.month || getMonthYear(rent.date);
  return rentMonth === month;
});
const currentDate = new Date();
    const [monthName, yearSuffix] = month.split('-');
    const monthDate = new Date(`${monthName} 1, 20${yearSuffix}`);

    const isPastMonth = monthDate < new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const isCurrentMonth = monthDate.getMonth() === currentDate.getMonth() && 
                           monthDate.getFullYear() === currentDate.getFullYear();

    const depositDay = new Date(data.joiningDate).getDate();
    const isOneDayBeforeDeposit = currentDate.getDate() === depositDay - 1;
    const isDepositDatePassed = currentDate.getDate() >= depositDay;

    const joiningDate = new Date(data.joiningDate);
    const joiningMonth = joiningDate.getMonth();
    const joiningYear = joiningDate.getFullYear();
    // Rent starts from the next month after joining
const rentStartMonth = new Date(joiningYear, joiningMonth + 1, 1);

// Check if the current month is before the rent start month
const isBeforeRentStart = monthDate < rentStartMonth;
    const isBeforeJoining = monthDate.getFullYear() < joiningYear || 
                           (monthDate.getFullYear() === joiningYear && monthDate.getMonth() <= joiningMonth);
    
    const isMissingRent = !isBeforeJoining && ((isPastMonth && !matchingRent) || 
                         ((isCurrentMonth && (isOneDayBeforeDeposit || isDepositDatePassed)) && !matchingRent));
    
   return (
  <td
    key={month}
    style={{
      backgroundColor: matchingRent
        ? 'transparent'
        : isBeforeRentStart
        ? 'rgb(227 176 176)'
        : isMissingRent
        ? 'red'
        : 'transparent',
      color: matchingRent ? 'black' : isMissingRent ? 'white' : 'black',
    }}
    ref={(el) => {
      if (el) {
        el.style.setProperty(
          'background-color',
          matchingRent
            ? 'transparent'
            : isBeforeRentStart
            ? 'rgb(227 176 176)'
            : isMissingRent
            ? 'red'
            : 'transparent',
          'important'
        );
        el.style.setProperty(
          'color',
          matchingRent ? 'black' : isMissingRent ? 'white' : 'black',
          'important'
        );
      }
    }}
  >
    {matchingRent ? (
      <>
        <div
          onClick={() => {
            setNewRent({
              rentAmount: '',
              date: new Date().toISOString().split('T')[0],
              month: month,
            });
            setCurrentFormId(data._id);
            setShowModal(true);
          }}
          onMouseEnter={(e) => {
            e.target.style.color = 'green';
            e.target.style.fontWeight = 'bold';
            e.target.style.cursor = 'pointer';
          }}
          onMouseLeave={(e) => {
            e.target.style.color = 'black';
            e.target.style.fontWeight = 'bold';
            e.target.style.cursor = 'default';
          }}
        >
          {matchingRent.rentAmount}
        </div>
        <hr />
        <div style={{ color: 'rgb(209 94 13)' }}>
          {formatDateNew(matchingRent.date)}
        </div>
      </>
    ) : isBeforeRentStart ? (
      <div style={{ color: 'black', fontWeight: 'bold' }}> &nbsp; </div>
    ) : isMissingRent ? (
      <div style={{ color: 'white', fontWeight: 'bold' }}>
        Rent Due!!
        <div className="d-flex justify-content-between mt-2">
          <button
            className="btn btn-sm btn-warning"
            onClick={() => {
              setNewRent({
                rentAmount: '',
                date: new Date().toISOString().split('T')[0],
                month: month,
              });
              setCurrentFormId(data._id);
              setShowModal(true);
            }}
          >
            OK
          </button>
        </div>
      </div>
    ) : (
      <button
        className="btn btn-sm btn"
        onClick={() => {
          setNewRent({
            rentAmount: '',
            date: new Date().toISOString().split('T')[0],
            month: month,
          });
          setCurrentFormId(data._id);
          setShowModal(true);
        }}
      >
        --
      </button>
    )}

    {/* ✅ Undo Button for this cell */}
    {/* {getUndoHistory(data._id, month) && (
      <div className="text-center mt-1">
        <button
          className="btn btn-sm btn-warning"
          onClick={() => handleUndoRent(data._id, month)}
        >
          Undo
        </button>
      </div>
    )} */}
  </td>
);

})}



  <td>
    <div>
    <button
        className="btn"
        style={{fontSize:'15px' , color:'green', padding:10}}
        onClick={() => openFormUpdateModal(data._id)} >
        <FaEdit />
      </button>
      <button
        className="btn"
        style={{fontSize:'15px' , color:'red',padding:10}}
        onClick={() => openDeleteConfirmation(data._id)} >
        <FontAwesomeIcon icon={faTrash} />
      </button>
      {/* <button  className="btn"
        style={{fontSize:'15px' , color:'black', padding:10}} onClick={() => handleLeave(data)}>
      <FontAwesomeIcon icon={faSignOutAlt} />
</button>

{leaveDates[data._id] && (
  <div style={{ marginTop: "5px", color: "red"}}>
   Leave on: {new Date(leaveDates[data._id]).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
  </div>
)} */}
{leaveDates[data._id] ? (
  <>
    <div style={{ marginTop: "5px", color: "red"}}>
      Leave on: {new Date(leaveDates[data._id]).toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      })}
    </div>
    <button
      className="btn btn-sm btn-danger mt-1"
      onClick={() => handleCancelLeave(data._id)}
    >
      Cancel Leave
    </button>
  </>
) : (
  <button
    className="btn"
    style={{ fontSize: "15px", color: "black", padding: 10 }}
    onClick={() => handleLeave(data)}
  >
    <FontAwesomeIcon icon={faSignOutAlt} />
  </button>
)}

    </div>
  </td>
</tr>))}
          
        </tbody>
      </table>

         {/* Password Prompt Modal */}
         {showPasswordPrompt && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Enter Password</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowPasswordPrompt(false)}
                ></button>
              </div>
              <div className="modal-body">
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowPasswordPrompt(false)}
                >
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={verifyPassword}>
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

       {/* Leave Confirmation Modal */}
       {showLeaveModal && (
      <div className="modal show d-block" tabIndex="-1">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Select Leave Date</h5>
              <button type="button" className="btn-close" onClick={() => setShowLeaveModal(false)}></button>
            </div>
            <div className="modal-body">
              <input
                type="date"
                className="form-control"
                value={selectedLeaveDate}
                onChange={(e) => setSelectedLeaveDate(e.target.value)}
              />
              <p className="mt-3">
                Are you sure you want <strong>{currentLeaveName}</strong> to leave on{" "}
                <strong>{selectedLeaveDate || "..."}</strong>?
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowLeaveModal(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmLeave}>
                Yes, Confirm Leave
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

       {/* update Form */}
       {showUpdateModal && (
  <div className="modal show d-block" tabIndex="-1">
    <div className="modal-dialog modal-dialog-scrollable">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Update Entity</h5>
          <button type="button" className="btn-close" onClick={closeFormUpdateModal}></button>
        </div>
        <div className="modal-body">
          {/* Render input fields for all properties */}
          <div className="mb-3">
            <label htmlFor="srNo" className="form-label">SR No.</label>
            <input
              type="text"
              className="form-control"
              id="srNo"
              value={updatedFormData.srNo}
              onChange={(e) =>
                setUpdatedFormData((prev) => ({ ...prev, srNo: e.target.value }))
              }
            />
          </div>
          <div className="mb-3">
            <label htmlFor="name" className="form-label">Name</label>
            <input
              type="text"
              className="form-control"
              id="name"
              value={updatedFormData.name}
              onChange={(e) =>
                setUpdatedFormData((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>
          <div className="mb-3">
            <label htmlFor="roomNo" className="form-label">Room No.</label>
            <input
              type="text"
              className="form-control"
              id="roomNo"
              value={updatedFormData.roomNo}
              onChange={(e) =>
                setUpdatedFormData((prev) => ({ ...prev, roomNo: e.target.value }))
              }
            />
          </div>
          <div className="mb-3">
            <label htmlFor="depositAmount" className="form-label">Deposit Amount</label>
            <input
              type="number"
              className="form-control"
              id="depositAmount"
              value={updatedFormData.depositAmount}
              onChange={(e) =>
                setUpdatedFormData((prev) => ({ ...prev, depositAmount: e.target.value }))
              }
            />
          </div>
          <div className="mb-3">
            <label htmlFor="address" className="form-label">Address</label>
            <input
              type="text"
              className="form-control"
              id="address"
              value={updatedFormData.address}
              onChange={(e) =>
                setUpdatedFormData((prev) => ({ ...prev, address: e.target.value }))
              }
            />
          </div>
          <div className="mb-3">
            <label htmlFor="phoneNo" className="form-label">phoneNo</label>
            <input
              type="number"
              className="form-control"
              id="phoneNo"
              value={updatedFormData.phoneNo}
              onChange={(e) =>
                setUpdatedFormData((prev) => ({ ...prev, phoneNo: e.target.value }))
              }
            />
          </div>
          <div className="mb-3">
            <label htmlFor="relativeAddress1" className="form-label">Relative Address 1</label>
            <input
              type="text"
              className="form-control"
              id="relativeAddress1"
              value={updatedFormData.relativeAddress1}
              onChange={(e) =>
                setUpdatedFormData((prev) => ({ ...prev, relativeAddress1: e.target.value }))
              }
            />
          </div>
          <div className="mb-3">
            <label htmlFor="relativeAddress2" className="form-label">Relative Address 2</label>
            <input
              type="text"
              className="form-control"
              id="relativeAddress2"
              value={updatedFormData.relativeAddress2}
              onChange={(e) =>
                setUpdatedFormData((prev) => ({ ...prev, relativeAddress2: e.target.value }))
              }
            />
          </div>
          <div className="mb-3">
            <label htmlFor="floorNo" className="form-label">Floor No.</label>
            <input
              type="text"
              className="form-control"
              id="floorNo"
              value={updatedFormData.floorNo}
              onChange={(e) =>
                setUpdatedFormData((prev) => ({ ...prev, floorNo: e.target.value }))
              }
            />
          </div>
          <div className="mb-3">
            <label htmlFor="bedNo" className="form-label">Bed No.</label>
            <input
              type="text"
              className="form-control"
              id="bedNo"
              value={updatedFormData.bedNo}
              onChange={(e) =>
                setUpdatedFormData((prev) => ({ ...prev, bedNo: e.target.value }))
              }
            />
          </div>
          <div className="mb-3">
            <label htmlFor="companyAddress" className="form-label">Company Address</label>
            <input
              type="text"
              className="form-control"
              id="companyAddress"
              value={updatedFormData.companyAddress}
              onChange={(e) =>
                setUpdatedFormData((prev) => ({ ...prev, companyAddress: e.target.value }))
              }
            />
          </div>
          <div className="mb-3">
            <label htmlFor="joiningDate" className="form-label">Joining Date</label>
            <input
              type="date"
              className="form-control"
              id="joiningDate"
              value={updatedFormData.joiningDate}
              onChange={(e) =>
                setUpdatedFormData((prev) => ({ ...prev, joiningDate: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={closeFormUpdateModal}>
            Close
          </button>
          <button className="btn btn-primary" onClick={handleFormUpdate}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  </div>
)}
  
       {showDeleteConfirmation && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Deletion</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDeleteConfirmation(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this form?</p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteConfirmation(false)}
                >
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={handleDeleteConfirm}>
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Update Rent Amount Modal */}
      {showModal && (
  <div className="modal show d-block" tabIndex="-1">
    <div className="modal-dialog">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Update Rent</h5>
          <button type="button" className="btn-close" onClick={closeUpdateModal}></button>
        </div>
        <div className="modal-body">
          <div className="mb-3">
            <label htmlFor="rentAmount" className="form-label">Rent Amount</label>
            <input
              type="number"
              className="form-control"
              id="rentAmount"
              value={newRent.rentAmount}
              onChange={(e) => setNewRent((prev) => ({ ...prev, rentAmount: e.target.value }))}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="rentDate" className="form-label">Payment Date</label>
            <input
              type="date"
              className="form-control"
              id="rentDate"
              value={newRent.date}
              onChange={(e) => setNewRent((prev) => ({ ...prev, date: e.target.value }))}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="rentMonth" className="form-label">Rent For Month</label>
            <input
              type="text"
              className="form-control"
              id="rentMonth"
              value={newRent.month}
              readOnly 
              // onChange={(e) => setNewRent((prev) => ({ ...prev, month: e.target.value }))}
            />
          </div>
        </div>
        {/* <div className="modal-footer">
          

          <button className="btn btn-secondary" onClick={closeUpdateModal}>Close</button>
          <button className="btn btn-primary" onClick={handleUpdate}>Save Changes</button>
        </div> */}


        <div className="modal-footer d-flex justify-content-between w-100">
  <div>
    {getUndoHistory(currentFormId, newRent.month) && (
      <button
        className="btn btn-warning me-2"
        onClick={() => {
          handleUndoRent(currentFormId, newRent.month);
          closeUpdateModal(); // optionally close modal after undo
        }}
      >
        Undo
      </button>
    )}
  </div>
  <div>
    <button className="btn btn-secondary me-2" onClick={closeUpdateModal}>
      Close
    </button>
    <button className="btn btn-primary" onClick={handleUpdate}>
      Save Changes
    </button>
  </div>
</div>

      </div>
    </div>
  </div>
)}

<Modal show={showFModal} onHide={() => setShowFModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Admission Form</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRowData && <FormDownload formData={selectedRowData} />}
        </Modal.Body>
      </Modal>


      {deletedData.length > 0 ? (
  <div className="mt-5">
    <h3 style={{ fontWeight: 800 }}>Leaved Tenant Data</h3>
    <table className="table table-bordered table-hover">
      <thead>
        <tr>
          <th>Sr No.</th>
          <th>Name</th>
          <th>Room No.</th>
          <th>Joining Date</th>
          <th>Deposit Amount</th>
          <th>Rents</th>
          <th>Leaves</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {deletedData
          .filter((data) => {
            const tenantJoiningYear = new Date(data.joiningDate).getFullYear();
            const tenantLeaveYear = data.leaveDate ? new Date(data.leaveDate).getFullYear() : null;
            const selectedYearNum = parseInt(selectedYear, 10); // Convert selected year to a number

            return (
              tenantJoiningYear <= selectedYearNum && // Tenant should be visible from their joining year onwards
              (!tenantLeaveYear || tenantLeaveYear >= selectedYearNum) // Tenant should be visible only until their leave year
            );
          })
          .map((data, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>
                {data.name.split(" ").map((word, index) => (
                  <div key={index}>{word}</div>
                ))}
              </td>
              <td>{data.roomNo}</td>
              <td>{formatDate(data.joiningDate)}</td>
              <td>{data.depositAmount}</td>
              {/* <td>
                {data.rents && data.rents.length > 0 ? (
                  <ul>
                    {data.rents.map((rent, rentIndex) => (
                      <li key={rentIndex}>
                        {`Amount: ${rent.rentAmount}, Date: ${formatDate(rent.date)}`}
                      </li>
                    ))}
                  </ul>
                ) : (
                  "No Rents"
                )}
              </td> */}
              <td>
  {data.rents && data.rents.length > 0 ? (
    <ul>
      {[...data.rents]
        .sort((a, b) => new Date(b.date) - new Date(a.date)) // sort by most recent
        .slice(0, 3) // get last 3
        .map((rent, rentIndex) => (
          <li key={rentIndex}>
            {`Amount: ${rent.rentAmount}, Date: ${formatDate(rent.date)}`}
          </li>
        ))}
    </ul>
  ) : (
    "No Rents"
  )}
</td>

              <td style={{ fontWeight: "bold" }}>
                {data.leaveDate
                  ? new Date(data.leaveDate).toLocaleDateString("en-US", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "N/A"}
              </td>
              <td>
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => handleUndoClick(data)}
                  style={{ marginLeft: 10 }}
                >
                  <FaUndo />
                </button>
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => handleDownloadForm(data)}
                  style={{ marginLeft: 10 }}
                >
                  <FaDownload />
                </button>
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  </div>
) : (
  <div className="mt-5">No archived data found.</div>
)}



    {/* Display Light Bill Data */}
    <div className="mt-5">
        <h3 style={{fontWeight:800}}>Meter Bill Reading <button type="button" className="btn btn-success" onClick={downloadLightBillExcel}>
                        <FaDownload className="me-2" />
                      </button></h3>
        {lightBills.length > 0 ? (
          <table className="table table-bordered table-hover">
            <thead>
              <tr>
                <th>Sr No.</th>
                <th>Meter No.</th>
                <th>Total Reading</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {lightBills.map((bill, index) => (
                <tr key={bill._id}>
                  <td>{index + 1}</td>
                  <td>{bill.meterNo}</td>
                  <td>{bill.totalReading}</td>
                  <td>{bill.amount}</td>
                  <td>{formatDate(bill.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div>No light bill data available.</div>
        )}
      </div>





    </div>
  );
}
export default AddData;
