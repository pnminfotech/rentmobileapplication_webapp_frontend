



















///////////////////////////////////////////////////////////////////////
import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import axios from 'axios';
// import { useNavigate } from 'react-router-dom';
import { FaPlus, FaEdit } from "react-icons/fa";
import { FaInfoCircle } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { FaBolt, FaReceipt,FaEye ,FaTrash } from 'react-icons/fa'; // example icons
import { FaSearch } from 'react-icons/fa';
import { FaSignOutAlt, FaUndo, FaDownload } from "react-icons/fa";
import FormDownload from '../componenet/Maintanace/FormDownload';
import RoomManager from './RoomManager'; // adjust path if needed
// import { useNavigate } from 'react-router-dom';
import { FaMoneyBillWave, FaPhoneAlt, FaCalendarAlt } from "react-icons/fa";

function NewComponant() {
  const [formData, setFormData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roomsData, setRoomsData] = useState([]);


  const [editingTenant, setEditingTenant] = useState(null);
  const [editRentAmount, setEditRentAmount] = useState('');
  const [editRentDate, setEditRentDate] = useState('');
   const [activeTab, setActiveTab] = useState('light');
    const [lightBills, setLightBills] = useState([]);
    // const [activeTab, setActiveTab] = useState('light'); // 'light' or 'other'
const [searchText, setSearchText] = useState('');
const [leaveDates, setLeaveDates] = useState({});
const [deletedData, setDeletedData] = useState([]);
const [showLeaveModal, setShowLeaveModal] = useState(false);
const [selectedLeaveDate, setSelectedLeaveDate] = useState('');
const [currentLeaveId, setCurrentLeaveId] = useState(null);
const [currentLeaveName, setCurrentLeaveName] = useState('');
const [showRentModal, setShowRentModal] = useState(false);
const [selectedRentDetails, setSelectedRentDetails] = useState([]);
// const [selectedTenantName, setSelectedTenantName] = useState('');
const [showDetailsModal, setShowDetailsModal] = useState(false);
const [selectedTenant, setSelectedTenant] = useState(null);
////form
const [showFModal, setShowFModal] = useState(false);
const [selectedRowData, setSelectedRowData] = useState(null);

const [showAddModal, setShowAddModal] = useState(false);
const [newTenant, setNewTenant] = useState({
  srNo: '',
  name: '',
  joiningDate: '',
  roomNo: '',
  depositAmount: '',
  address: '',
  phoneNo: '',
  relativeAddress1: '',
  relativeAddress2: '',
  floorNo: '',
  bedNo: '',
  companyAddress: '',
  dateOfJoiningCollege: '',
  dob: ''
});
const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
const [password, setPassword] = useState("");
const [currentDeleteId, setCurrentDeleteId] = useState(null);
const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

const [showEditModal, setShowEditModal] = useState(false);
const [editTenantData, setEditTenantData] = useState(null);

const [showDueModal, setShowDueModal] = useState(false);
const [dueMonths, setDueMonths] = useState([]);
const [selectedTenantName, setSelectedTenantName] = useState('');

const [showStatusModal, setShowStatusModal] = useState(false);
const [statusMonths, setStatusMonths] = useState([]);
const [statusTenantName, setStatusTenantName] = useState('');

const [selectedYear, setSelectedYear] = useState('All Records');

const years = ['All Records', ...Array.from(new Set(
  formData.map(d => new Date(d.joiningDate).getFullYear())
)).sort((a, b) => b - a)];


const fetchSrNo = async () => {
  try {
    const response = await axios.get(`${apiUrl}forms/count`);
    setNewTenant(prev => ({ ...prev, srNo: response.data.nextSrNo }));
  } catch (error) {
    console.error("Error fetching Sr No:", error);
  }
};

const openAddModal = () => {
  fetchSrNo();
  setShowAddModal(true);
};

  const apiUrl = '    https://rentmobile-api.pnminfotech.com/api/';
const correctPassword = "987654";

  useEffect(() => {
    axios
      .get(apiUrl)
      .then((response) => {
        setFormData(response.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch data');
        setLoading(false);
      });
  }, []);

 useEffect(() => {
  axios.get(`${apiUrl}forms`)
    .then(response => {
      const leaveMap = {};
      response.data.forEach(item => {
        if (item.leaveDate) {
          leaveMap[item._id] = new Date(item.leaveDate).toISOString().split("T")[0];
        }
      });
      setLeaveDates(leaveMap);
    })
    .catch(err => console.error("Error fetching leave data:", err));
}, []);
useEffect(() => {
  axios.get(`${apiUrl}forms/archived`)
    .then(response => setDeletedData(response.data))
    .catch(err => console.error("Error fetching archived tenants:", err));
}, []);
useEffect(() => {
  axios.get('    https://rentmobile-api.pnminfotech.com/api/rooms')
    .then(response => setRoomsData(response.data))
    .catch(err => console.error("Failed to fetch rooms:", err));
}, []);
const handleAddTenant = async () => {
  try {
    // Get the rent price based on selected room and bed
    const selectedRoom = roomsData.find(r => r.roomNo === newTenant.roomNo);
    const selectedBed = selectedRoom?.beds.find(b => b.bedNo === newTenant.bedNo);
    const baseRent = selectedBed?.price || 0;

    // Prepare the tenant object with baseRent included
    const tenantToSave = {
      ...newTenant,
      baseRent,
    };

    await axios.post(`${apiUrl}forms`, tenantToSave);
    alert('Tenant added successfully');
    setShowAddModal(false);

    setNewTenant({
      srNo: '',
      name: '',
      joiningDate: '',
      roomNo: '',
      depositAmount: '',
      address: '',
      phoneNo: '',
      relativeAddress1: '',
      relativeAddress2: '',
      floorNo: '',
      bedNo: '',
      companyAddress: '',
      dateOfJoiningCollege: '',
      dob: '',
      baseRent: '', // optional: can be omitted or cleared
      rentAmount: '', // used temporarily for autofill UI
    });

    const response = await axios.get(apiUrl);
    setFormData(response.data);
  } catch (error) {
    alert('Failed to add tenant: ' + (error.response?.data?.message || error.message));
  }
};
const occupiedBeds = new Set(
  formData
    .filter(t => !t.leaveDate) // exclude tenants who left
    .map(t => `${t.roomNo}-${t.bedNo}`)
);

const getPendingMonthsForStatus = (rents = [], joiningDateStr) => {
  if (!joiningDateStr) return [];

  const now = new Date();
  const currentYear = now.getFullYear();

  // Map paid months
  const paidMonths = new Set(
    rents
      .filter(r => r.date && Number(r.rentAmount) > 0)
      .map(r => {
        const d = new Date(r.date);
        return `${d.getMonth()}-${d.getFullYear()}`;
      })
  );

  const months = [];
  const startMonth = new Date(currentYear, 0); // Jan of current year

  const joinDate = new Date(joiningDateStr);
  const startDate = joinDate > startMonth ? joinDate : startMonth;
  const tempDate = new Date(startDate);

  while (tempDate <= now) {
    const key = `${tempDate.getMonth()}-${tempDate.getFullYear()}`;
    if (!paidMonths.has(key)) {
      months.push(tempDate.toLocaleString('default', { month: 'long', year: 'numeric' }));
    }
    tempDate.setMonth(tempDate.getMonth() + 1);
  }

  return months;
};



const handleDownloadExcel = () => {
  const sheetData = formData.map(item => ({
    SrNo: item.srNo,
    Name: item.name,
    Phone: item.phoneNo,
    JoiningDate: item.joiningDate,
    RoomNo: item.roomNo,
    FloorNo: item.floorNo,
    BedNo: item.bedNo,
    DepositAmount: item.depositAmount,
    Address: item.address,
    RelativeAddress1: item.relativeAddress1,
    RelativeAddress2: item.relativeAddress2,
    CompanyAddress: item.companyAddress,
    DateOfJoiningCollege: item.dateOfJoiningCollege,
    DOB: item.dob
  }));

  const worksheet = XLSX.utils.json_to_sheet(sheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tenants");

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const data = new Blob([excelBuffer], { type: "application/octet-stream" });
  saveAs(data, "tenant_data.xlsx");
};

const getDisplayedRent = (rents = []) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  let current = null;
  let previous = null;

  rents.forEach(rent => {
    const date = new Date(rent.date);
    const m = date.getMonth();
    const y = date.getFullYear();

    if (m === currentMonth && y === currentYear) {
      current = rent;
    } else if (m === prevMonth && y === prevYear) {
      previous = rent;
    }
  });

  return { current, previous };
};


  // const getDisplayedRent = (rents = []) => {
  //   const now = new Date();
  //   const currentMonth = now.getMonth();
  //   const currentYear = now.getFullYear();
  //   const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  //   const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  //   const matchRent = (month, year) =>
  //     rents.find(r => {
  //       if (!r.date) return false;
  //       const d = new Date(r.date);
  //       return d.getMonth() === month && d.getFullYear() === year && Number(r.rentAmount) > 0;
  //     });

  //   const current = matchRent(currentMonth, currentYear);
  //   if (current) return { rentAmount: Number(current.rentAmount), date: current.date };

  //   const previous = matchRent(previousMonth, previousYear);
  //   if (previous) return { rentAmount: Number(previous.rentAmount), date: previous.date };

  //   const latest = rents
  //     .filter(r => Number(r.rentAmount) > 0 && r.date)
  //     .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  //   return latest ? { rentAmount: Number(latest.rentAmount), date: latest.date } : { rentAmount: 0, date: null };
  // };












  
const calculateDue = (rents = [], joiningDateStr) => {
  if (!joiningDateStr) return 0;

  const now = new Date();
  const currentYear = now.getFullYear();
  const startOfYear = new Date(currentYear, 0, 1); // Jan 1 of current year
  const joinDate = new Date(joiningDateStr);
  const rentStart = new Date(joinDate.getFullYear(), joinDate.getMonth() + 1, 1);

  // Determine the actual starting month (either Jan or 1 month after joining)
  const startDate = rentStart > startOfYear ? rentStart : startOfYear;

  const tempDate = new Date(startDate);
  const paidMonths = new Set(
    rents
      .filter(r => r.date && Number(r.rentAmount) > 0)
      .map(r => {
        const d = new Date(r.date);
        return `${d.getMonth()}-${d.getFullYear()}`;
      })
  );

  const lastPaid = rents
    .filter(r => r.date && Number(r.rentAmount) > 0)
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  const rentAmount = lastPaid ? Number(lastPaid.rentAmount) : 0;

  let dueCount = 0;

  // Go from startDate up to the current month of the current year
  while (tempDate <= now && tempDate.getFullYear() === currentYear) {
    const key = `${tempDate.getMonth()}-${tempDate.getFullYear()}`;
    if (!paidMonths.has(key)) {
      dueCount++;
    }
    tempDate.setMonth(tempDate.getMonth() + 1);
  }

  return rentAmount * dueCount;
};


const handleLeave = (tenant) => {
  setCurrentLeaveId(tenant._id);
  setCurrentLeaveName(tenant.name);
  setShowLeaveModal(true);
};
const confirmLeave = async () => {
  if (!selectedLeaveDate) {
    alert("Please select a leave date.");
    return;
  }

  try {
    const response = await axios.post(`${apiUrl}leave`, {
      formId: currentLeaveId,
      leaveDate: selectedLeaveDate,
    });

    if (response.data?.message) {
      alert(response.data.message);
      setLeaveDates((prev) => ({ ...prev, [currentLeaveId]: selectedLeaveDate }));
      setShowLeaveModal(false);
    } else {
      alert("Failed to mark leave.");
    }
  } catch (err) {
    console.error("Error setting leave:", err);
  }
};

const getDueMonths = (rents = [], joiningDateStr) => {
  if (!joiningDateStr) return [];

  const joiningDate = new Date(joiningDateStr);
  const startDate = new Date(joiningDate.getFullYear(), joiningDate.getMonth() + 1, 1);
  const now = new Date();
  const currentYear = now.getFullYear();

  const rentMap = new Map();
  rents.forEach(rent => {
    const d = new Date(rent.date);
    const key = `${d.getMonth()}-${d.getFullYear()}`;
    rentMap.set(key, true);
  });

  const months = [];
  const tempDate = new Date(startDate);

  while (tempDate <= now) {
    const year = tempDate.getFullYear();
    const month = tempDate.getMonth();
    const key = `${month}-${year}`;

    if (year === currentYear && !rentMap.has(key)) {
      months.push(tempDate.toLocaleString('default', { month: 'long', year: 'numeric' }));
    }

    tempDate.setMonth(tempDate.getMonth() + 1);
  }

  return months;
};

  const handleEdit = (tenant) => {
    const { rentAmount, date } = getDisplayedRent(tenant.rents);
    setEditingTenant(tenant);
    setEditRentAmount(rentAmount);
    setEditRentDate(date || new Date().toISOString().split('T')[0]);
  };

const handleDelete = async (tenant) => {
  try {
    // Determine current month-year key, matching how backend identifies rent
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthKey = `${currentMonth}-${currentYear}`; // format to match backend
    
    // Make sure you pass monthKey in URL or request body as per backend spec
    await axios.delete(`${apiUrl}form/${tenant._id}/rent/${monthKey}`);
    
    // Refresh data after delete
    const response = await axios.get(apiUrl);
    setFormData(response.data);
  } catch (error) {
    alert('Failed to delete rent: ' + (error.response?.data?.message || error.message));
  }
};






// formupdate

const handleUndoClick = (tenant) => {
  if (!window.confirm(`Undo archive for ${tenant.name}?`)) return;

  axios
    .post(`${apiUrl}forms/restore`, { id: tenant._id })
    .then((response) => {
      const restored = response.data;
      setDeletedData((prev) => prev.filter((item) => item._id !== tenant._id));
      setFormData((prev) => [...prev, restored]);
    })
    .catch((error) => {
      console.error("Error restoring tenant:", error);
      alert("Failed to restore tenant.");
    });
};
const handleDownloadForm = async (tenant) => {
  try {
    const response = await axios.get(`${apiUrl}form/${tenant._id}`);
    const form = response.data;

    const formatted = [
      ["Field", "Value"],
      ["Name", form.name],
      ["Joining Date", new Date(form.joiningDate).toLocaleDateString()],
      ["Room No", form.roomNo],
      ["Deposit Amount", form.depositAmount],
      ["Leave Date", form.leaveDate ? new Date(form.leaveDate).toLocaleDateString() : "N/A"],
    ];

    if (form.rents && form.rents.length > 0) {
      formatted.push(["Rents", ""]);
      form.rents.forEach((rent, i) => {
        formatted.push([`Rent ${i + 1} Amount`, rent.rentAmount]);
        formatted.push([`Rent ${i + 1} Date`, new Date(rent.date).toLocaleDateString()]);
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(formatted);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tenant Data");
    XLSX.writeFile(wb, `Tenant_${tenant.name}.xlsx`);
  } catch (err) {
    console.error("Download failed", err);
    alert("Failed to download tenant data.");
  }
};

const handleTenantUpdate = async () => {
  try {
    const response = await axios.put(`${apiUrl}update/${editTenantData._id}`, editTenantData);
    alert("Tenant updated successfully!");

    // Replace updated tenant in list
    setFormData(prev =>
      prev.map(t => t._id === editTenantData._id ? response.data : t)
    );

    setShowEditModal(false);
  } catch (err) {
    console.error("Update failed:", err);
    alert("Failed to update tenant.");
  }
};


const openDeleteConfirmation = (tenantId) => {
  setCurrentDeleteId(tenantId);
  setShowPasswordPrompt(true); // Show password modal
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
    await axios.delete(`${apiUrl}form/${currentDeleteId}`);
    setFormData(prev => prev.filter(t => t._id !== currentDeleteId));
    alert("Tenant deleted successfully.");
    setShowDeleteConfirmation(false);
  } catch (error) {
    console.error("Error deleting:", error);
    alert("Failed to delete tenant.");
  }
};


// const showLastThreeRents = (tenant) => {
//   const sortedRents = [...(tenant.rents || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
//   const lastThree = sortedRents.slice(0, 3);
//   setSelectedRentDetails(lastThree);
//   setSelectedTenantName(tenant.name);
//   setShowRentModal(true);
// };
const showRentHistory = (tenant) => {
  const sortedRents = [...(tenant.rents || [])].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
  setSelectedRentDetails(sortedRents);  // 👈 full history now
  setSelectedTenantName(tenant.name);
  setShowRentModal(true);
};

  const handleSave = async () => {
    if (!editingTenant) return;
    try {
      await axios.put(`${apiUrl}form/${editingTenant._id}`, {
        rentAmount: editRentAmount,
        date: editRentDate,
        month: new Date(editRentDate).toLocaleString('default', { month: 'short', year: '2-digit' })
      });
      setEditingTenant(null);
      // window.location.reload();
    } catch (error) {
      alert('Failed to update rent');
    }
  };
  const navigate = useNavigate();
  const handleNavigation = (path) => {
    navigate(path);
  };


const [pendingRents, setPendingRents] = useState(0);

useEffect(() => {
  if (!formData || !formData.length) return;

  const now = new Date();
  const count = formData.filter(t => {
    const lastRent = t.rents && t.rents.length ? t.rents[t.rents.length - 1] : null;
    if (!lastRent) return true;

    const rentDate = new Date(lastRent.date);
    return rentDate.getMonth() !== now.getMonth() || rentDate.getFullYear() !== now.getFullYear();
  }).length;

  setPendingRents(count);
}, [formData]);



  if (loading) return <div className="text-center mt-5">Loading...</div>;
  if (error) return <div className="text-center text-danger mt-5">{error}</div>;


// Filter only tenants who left in the last month or this month
const filteredDeletedData = deletedData.filter(t => t.leaveDate);



  return (
    // <div className="container-fluid py-4" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="container-fluid px-4 py-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <h3 className="fw-bold mb-4">Rent & Deposite Tracker</h3>
     <div className="d-flex align-items-center mb-4 flex-wrap"> 
  <select
    className="form-select me-2"
    style={{ width: '150px' }}
    value={selectedYear}
    onChange={(e) => setSelectedYear(Number(e.target.value))}
  >
    {years.map((year) => (
      <option key={year} value={year}>{year}</option>
    ))}
  </select>

  <div style={{ position: 'relative', maxWidth: '300px' }} className="me-2">
    <FaSearch 
      style={{
        position: 'absolute',
        left: '10px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#aaa',
        pointerEvents: 'none',
        zIndex: 1,
        marginLeft:2,
      }}
    />
    <input 
      type="text"
      placeholder="  Search by Name"
      className="form-control ps-4 "
      value={searchText}
      onChange={(e) => setSearchText(e.target.value)}
    />
  </div>

  {/* <button className="btn btn-primary me-2" onClick={openAddModal}>
    <FaPlus className="me-1" /> Add Tenant
  </button> */}
<button
  className="btn me-2"
  style={{ backgroundColor: "#9c27b0", color: "white" }}
  onClick={() => navigate('/roommanager')}
>
  <FaPlus className="me-1" /> Manage Rooms
</button>


 <button
    className="btn me-2"
    style={{backgroundColor:"#3db7b1", color:"white"}}
   onClick={openAddModal}>
   <FaPlus className="me-1" /> Add Tenant
  </button>

  <button
    className="btn me-2"
    style={activeTab === 'light' ? style.colorA : style.colorB}
    onClick={() => {
      setActiveTab('light');
      navigate('/lightbillotherexpenses', { state: { tab: 'light' } });
    }}
  >
    <FaBolt className="me-1" />
    Light Bill
  </button>

  <button
    className="btn me-2"
    style={activeTab === 'other' ? style.colorA : style.colorB}
    onClick={() => {
      setActiveTab('other');
      navigate('/lightbillotherexpenses', { state: { tab: 'other' } });
    }}
  >
    <FaReceipt className="me-1" />
    Other Expenses
  </button>

  <button
    className="btn me-2"
    style={style.successButton}
    onClick={handleDownloadExcel}
  >
    <FaDownload className="me-1" />
    Download Excel
  </button>

  <button
    className="btn me-2"
    style={activeTab === 'light' ? style.colorA : style.colorB}
    onClick={() => setShowAddModal(true)}
  >
    <FaPlus className="me-1" />
    Add {activeTab === 'light' ? 'Light Bill' : 'Other Expense'}
  </button>

  <button
    className="btn me-2"
    style={{ backgroundColor: "#483f3fab", color: "white" }}
    onClick={() => handleNavigation('/maindashboard')}
  >
    <FaArrowLeft className="me-1" />
    Back 
  </button>

  {/* <button className="btn btn-outline-dark">
    Logout
  </button> */}
</div>



 <div className="row g-3 mb-4">
        <div className="col-md-2">
          <div className="bg-white border rounded shadow-sm p-3 text-center">
            <h6 className="text-muted mb-1">Total Beds</h6>
            <h4 className="fw-bold">{formData.length}</h4>
          </div>
        </div>
        <div className="col-md-2">
          <div className="bg-white border rounded shadow-sm p-3 text-center">
            <h6 className="text-muted mb-1">Occupied</h6>
            <h4 className="fw-bold"> {formData.filter(d => !d.leaveDate).length}</h4>
          </div>
        </div>
      



<div className="col-md-2">
  <div className="bg-white border rounded shadow-sm p-3 text-center">
    <h6 className="text-muted mb-1">Vacant</h6>
    <h4 className="fw-bold text-danger">{formData.filter(d => d.leaveDate).length}</h4>
  </div>
</div>
{/* Pending Maintenance */}
<div className="col-md-3">
  <div className="bg-white border rounded shadow-sm p-3 text-center">
    <h6 className="text-muted mb-1">Pending Rents</h6>
    <h4 className="fw-bold text-danger">{pendingRents}</h4>
  </div>

{/* <div className="alert alert-warning mt-3">
  Pending Rents This Month: <strong>{pendingRents}</strong>
</div> */}


</div>

<div className="col-md-3">
  <div className="bg-white border rounded shadow-sm p-3 text-center">
    <h6 className="text-muted mb-1">Deposits</h6>
    <h4 className="fw-bold text-danger">{formData.filter(d => Number(d.depositAmount) > 0).length}</h4>
  </div>
</div>
</div>

      {/* <div className="row text-center mb-4">
        <div className="col">
          <div className="border rounded p-3"><strong>Total Beds</strong><h4>{formData.length}</h4></div>
        </div>
        <div className="col">
          <div className="border rounded p-3"><strong>Occupied</strong><h4>{formData.filter(d => !d.leaveDate).length}</h4></div>
        </div>
        <div className="col">
          <div className="border rounded p-3"><strong>Vacant</strong><h4>{formData.filter(d => d.leaveDate).length}</h4></div>
        </div>
        <div className="col">
          <div className="border rounded p-3"><strong>Pending Rents</strong><h4>{formData.filter(d => calculateDue(d.rents, d.joiningDate) > 0).length}</h4></div>
        </div>
        <div className="col">
          <div className="border rounded p-3"><strong>Deposits</strong><h4>{formData.filter(d => Number(d.depositAmount) > 0).length}</h4></div>
        </div>
      </div> */}

      <div className="card shadow-sm">
        <div className="card-body">
          <h5 className="fw-bold mb-3">Bed-wise Rent and Deposit Tracker</h5>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead className="table-borderless">
                <tr className="fw-semibold text-secondary">
                  <th>Bed</th>
                  <th>Name</th>
                    {/* <th>Deposit</th> */}
                  <th>Rent</th>
                  {/* <th>Rent Date</th> */}
                  <th>Due</th>
                
                  <th>Rent Status</th>
                  {/* <th>Deposit Status</th> */}
                  <th>Actions</th>
                </tr>
              </thead>
            <tbody>
  {formData
   .filter((tenant) => {
  const name = tenant.name?.toLowerCase() || '';
  const bed = tenant.bedNo?.toString() || '';
  const joinYear = new Date(tenant.joiningDate).getFullYear();
  const leaveDate = leaveDates[tenant._id];
  const isLeaved = leaveDate && new Date(leaveDate) < new Date();

  return (
    !isLeaved && // 👈 EXCLUDE tenants who already left
    (name.includes(searchText.toLowerCase()) || bed.includes(searchText)) &&
    (selectedYear === 'All Records' || joinYear === Number(selectedYear))
  );
})

    .map((tenant) => {
       const { current, previous } = getDisplayedRent(tenant.rents); 
      const dueAmount = calculateDue(tenant.rents, tenant.joiningDate);
      const depositCollected = Number(tenant.depositAmount) > 0;

      return (
        <tr key={tenant._id}>
          <td>{tenant.roomNo} <div className="text-muted small">bed {tenant.bedNo}</div></td>
    <td>
  <span 
    style={{ cursor: 'pointer', color: '#007bff' }}
    onClick={() => {
      setSelectedRowData(tenant);
      setShowFModal(true);
    }}
  >
    {tenant.name}
    <br />
    <small className="text-muted">
      {/* <FaMoneyBillWave style={{ marginRight: '5px' }} /> */}
      Deposit: ₹{Number(tenant.depositAmount || 0).toLocaleString('en-IN')}
    </small>
    <br />
    <small className="text-muted">
      <FaPhoneAlt style={{ marginRight: '5px' }} />
      {tenant.phoneNo}
    </small>
    <br />
    <small className="text-muted">
      <FaCalendarAlt style={{ marginRight: '5px' }} />
      {new Date(tenant.joiningDate).toLocaleDateString()}
    </small>
  </span>
</td>



         
         
              {/* <td>₹{Number(tenant.depositAmount || 0).toLocaleString('en-IN')}</td> */}
          {/* <td>₹{rentAmount.toLocaleString('en-IN')}</td> */}
      <td style={{ minWidth: "200px" }}>
  <div className="d-flex justify-content-between align-items-start" onClick={() => handleEdit(tenant)} style={{ cursor: 'pointer' }}>
   

    {previous ? (
      <div className=" text-center">
        <div>₹{Number(previous.rentAmount).toLocaleString('en-IN')}</div>
        <small>{new Date(previous.date).toLocaleDateString('en-IN')}</small>
      </div>
    ) : (
      <div className="text-danger text-center">
        <div>--</div>
        <small>(Prev)</small>
      </div>
    )}

     {current ? (
      <div className=" text-center me-2">
        <div>₹{Number(current.rentAmount).toLocaleString('en-IN')}</div>
        <small>{new Date(current.date).toLocaleDateString('en-IN')}</small>
      </div>
    ) : (
      <div className="text-danger text-center me-2">
        <div>--</div>
        <small>(Current)</small>
      </div>
    )}
  </div>
</td>



          {/* <td>{rentDate ? new Date(rentDate).toLocaleDateString('en-IN') : '--'}</td> */}
  <td style={{ cursor: 'pointer', color: dueAmount > 0 ? 'red' : 'inherit' }} onClick={() => {
  const dueList = getDueMonths(tenant.rents, tenant.joiningDate);
  setDueMonths(dueList);
  setSelectedTenantName(tenant.name);
  setShowDueModal(true);
}}>
  ₹{dueAmount.toLocaleString('en-IN')}
</td>

       
       <td>
  <span
    className={`badge rounded-pill px-3 py-2 ${dueAmount === 0 ? 'bg-success' : 'bg-warning text-dark'}`}
    style={{ cursor: dueAmount > 0 ? 'pointer' : 'default' }}
    onClick={() => {
      if (dueAmount > 0) {
        const pending = getPendingMonthsForStatus(tenant.rents, tenant.joiningDate);
        console.log('Pending Months:', pending); // DEBUG LOG
        setStatusMonths(pending);
        setStatusTenantName(tenant.name);
        setShowStatusModal(true);
      }
    }}
  >
    {dueAmount === 0 ? 'Paid' : 'Pending'}
  </span>
</td>


          {/* <td>
            <span className={`badge rounded-pill px-3 py-2 ${depositCollected ? 'bg-success' : 'bg-warning text-dark'}`}>
              {depositCollected ? 'Collected' : 'Pending'}
            </span>
          </td> */}
          <td>
           <button className="btn btn-sm btn-outline-primary me-2" onClick={() => {
  setEditTenantData(tenant);
  setShowEditModal(true);
}}>
  <FaEdit />
</button>

           <button
  style={{ backgroundColor: "#3db7b1", color: "white" }}
  className="btn  btn-sm "
  onClick={() => {
    setSelectedTenant(tenant);
    setShowDetailsModal(true);
  }}>
      <FaEye className=""/>
  {/* <FaInfoCircle className="me-2" />  */}
 
</button>

            <button className="btn btn-sm  me-2" onClick={() => handleLeave(tenant)} style={{ backgroundColor: "#f49f36", color: "white" }}>
  <FaSignOutAlt />
</button>

 <button className="btn btn-sm btn-danger" onClick={() => openDeleteConfirmation(tenant._id)}>
<FaTrash />
</button>

{leaveDates[tenant._id] && (
  <div className="text-danger mt-1" style={{ fontSize: '12px' }}>
    Leave on: {new Date(leaveDates[tenant._id]).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    })}
  </div>
)}

          </td>
        </tr>
      );
    })}
</tbody>

            </table>














            {deletedData.length > 0 && (
<div className="mt-5">
  <h5 style={{ fontWeight: 'bold' }}>Leaved Tenants</h5>
  <table className="table table-bordered">
    <thead>
      <tr>
        <th>Room No</th>
        <th>Name</th>
        <th>Joining Date</th>
        <th>Leave Date</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {filteredDeletedData.map((tenant, index) => {
        const leaveDate = new Date(tenant.leaveDate);
        const now = new Date();
        const currentMonth = now.getMonth();
        const lastMonth = (currentMonth - 1 + 12) % 12;

        const isLastMonth =
          leaveDate.getMonth() === lastMonth &&
          leaveDate.getFullYear() === now.getFullYear(); // same year check

        return (
          <tr key={index}>
            <td>
              {tenant.roomNo}{" "}
              <div className="text-muted small">bed {tenant.bedNo}</div>
            </td>
            <td
              style={{ cursor: "pointer" }}
              onClick={() => showRentHistory(tenant)}
            >
              {tenant.name}
            </td>
            <td>{new Date(tenant.joiningDate).toLocaleDateString()}</td>
            <td>{new Date(tenant.leaveDate).toLocaleDateString()}</td>
            <td>
              {isLastMonth && ( // ✅ show Undo button only for last month
                <button
                  className="btn btn-sm btn-success me-2"
                  onClick={() => handleUndoClick(tenant)}
                >
                  <FaUndo />
                </button>
              )}
              <button
                className="btn btn-sm"
                style={{ backgroundColor: "#416ed7d1", color: "white" }}
                onClick={() => handleDownloadForm(tenant)}
              >
                <FaDownload />
              </button>
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
</div>



)}
{showRentModal && selectedTenant && (
  <div
    className="modal d-block"
    tabIndex="-1"
    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
  >
    <div className="modal-dialog modal-lg">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Rent History - {selectedTenantName}</h5>
          <button
            type="button"
            className="btn-close"
            onClick={() => setShowRentModal(false)}
          ></button>
        </div>

        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {selectedRentDetails.map((rent, idx) => (
                <tr key={idx}>
                  <td>{new Date(rent.date).toLocaleDateString()}</td>
                  <td>{rent.amount}</td>
                  <td>{rent.status}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Download button below rent history */}
          <div className="mt-3">
            <button
              className="btn btn-sm"
              style={{ backgroundColor: "#416ed7d1", color: "white" }}
              onClick={() => handleDownloadForm(selectedTenant)}
            >
              <FaDownload /> Download Form
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowRentModal(false)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
)}

          </div>
        </div>
      </div>

{showAddModal && (
  <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
    <div className="modal-dialog modal-lg modal-dialog-scrollable">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Add New Tenant</h5>
          <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
        </div>
        <div className="modal-body">
          <div className="row g-3">
            {/* Standard Inputs */}
            {[
              { label: 'Sr No', key: 'srNo', type: 'text', readOnly: true },
              { label: 'Name', key: 'name' },
              { label: 'Joining Date', key: 'joiningDate', type: 'date' },
              { label: 'Deposit Amount', key: 'depositAmount', type: 'number' },
              { label: 'Phone No', key: 'phoneNo' },
              { label: 'Address', key: 'address' },
              { label: 'Relative Address 1', key: 'relativeAddress1' },
              { label: 'Relative Address 2', key: 'relativeAddress2' },
              // { label: 'Floor No', key: 'floorNo' },
              { label: 'Company Address / College', key: 'companyAddress' },
              { label: 'Date of Joining College', key: 'dateOfJoiningCollege', type: 'date' },
              { label: 'Date of Birth', key: 'dob', type: 'date' },
            ].map(({ label, key, type = 'text', readOnly = false }) => (
              <div className="col-md-6" key={key}>
                <label className="form-label">{label}</label>
                <input
                  type={type}
                  className="form-control"
                  value={newTenant[key]}
                  readOnly={readOnly}
                  onChange={(e) => setNewTenant({ ...newTenant, [key]: e.target.value })}
                />
              </div>
            ))}


            {/* Room No Dropdown */}
            <div className="col-md-6">
              <label className="form-label">Room No</label>
             <select
  className="form-control"
  value={newTenant.roomNo}
  onChange={(e) => {
    const roomNo = e.target.value;
    const selectedRoom = roomsData.find(room => room.roomNo === roomNo);
    
    setNewTenant(prev => ({
      ...prev,
      roomNo,
      bedNo: '', // reset bed
      floorNo: selectedRoom?.floorNo || '',
      rentAmount: '' // optional, reset
    }));
  }}
>
  <option value="">Select Room</option>
  {roomsData.map(room => (
    <option key={room.roomNo} value={room.roomNo}>
      {room.roomNo} (Floor {room.floorNo})
    </option>
  ))}
</select>

            </div>

            {/* Bed No Dropdown */}
            <div className="col-md-6">
              <label className="form-label">Bed No</label>
            <select
  className="form-control"
  value={newTenant.bedNo}
  onChange={(e) => {
    const bedNo = e.target.value;
    const selectedRoom = roomsData.find(r => String(r.roomNo) === String(newTenant.roomNo));
    const selectedBed = selectedRoom?.beds.find(b => String(b.bedNo) === String(bedNo));
    
    setNewTenant(prev => ({
      ...prev,
      bedNo,
      baseRent: selectedBed?.price || '',
      rentAmount: selectedBed?.price || ''
    }));
  }}
>
  <option value="">Select Bed</option>
  {roomsData
  .find(r => String(r.roomNo) === String(newTenant.roomNo))
  ?.beds
  .filter(bed => !occupiedBeds.has(`${newTenant.roomNo}-${bed.bedNo}`)) // 🧠 only unoccupied beds
  .map(bed => (
    <option key={bed.bedNo} value={bed.bedNo}>
      {bed.bedNo} - {bed.category} - ₹{bed.price}
    </option>
))}
{/* {roomsData.find(r => String(r.roomNo) === String(newTenant.roomNo))?.beds.filter(
  bed => !occupiedBeds.has(`${newTenant.roomNo}-${bed.bedNo}`)
).length === 0 && (
  <small className="text-danger">No available beds in this room</small>
)} */}

</select>

            </div>
  <div className="col-md-6">
              <label className="form-label">Base Rent Amount (Auto-Filled)</label>
              <input
                className="form-control"
                value={newTenant.baseRent || ''}
                readOnly
              />
            </div>
            {/* Auto-Filled Rent Price */}
            <div className="col-md-6">
              <label className="form-label">Rent Amount (Auto-Filled)</label>
              <input
                className="form-control"
                value={newTenant.rentAmount || ''}
                readOnly
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
          <button
            className="btn"
            onClick={handleAddTenant}
            style={{ backgroundColor: "rgb(94, 182, 92)", color: "white" }}
          >
            <FaPlus className="me-2" /> Save Tenant
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{showStatusModal && (
  <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
    <div className="modal-dialog">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Pending Months for {statusTenantName}</h5>
          <button type="button" className="btn-close" onClick={() => setShowStatusModal(false)}></button>
        </div>
        <div className="modal-body">
          {statusMonths.length > 0 ? (
            <ul className="list-group">
              {statusMonths.map((month, idx) => (
                <li key={idx} className="list-group-item text-danger">{month}</li>
              ))}
            </ul>
          ) : (
            <p className="text-success">No pending months!</p>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowStatusModal(false)}>Close</button>
        </div>
      </div>
    </div>
  </div>
)}

{showDueModal && (
  <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
    <div className="modal-dialog">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Due Months for {selectedTenantName}</h5>
          <button type="button" className="btn-close" onClick={() => setShowDueModal(false)}></button>
        </div>
        <div className="modal-body">
          {dueMonths.length > 0 ? (
            <ul className="list-group">
              {dueMonths.map((month, idx) => (
                <li key={idx} className="list-group-item">{month}</li>
              ))}
            </ul>
          ) : (
            <p className="text-success">No dues!</p>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowDueModal(false)}>Close</button>
        </div>
      </div>
    </div>
  </div>
)}

{showEditModal && editTenantData && (
  <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
    <div className="modal-dialog modal-dialog-scrollable">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Edit Tenant - {editTenantData.name}</h5>
          <button className="btn-close" onClick={() => setShowEditModal(false)}></button>
        </div>
        <div className="modal-body">
          {[
            { label: "Name", key: "name" },
            { label: "Phone", key: "phoneNo" },
            { label: "Room No", key: "roomNo" },
            { label: "Bed No", key: "bedNo" },
            { label: "Deposit Amount", key: "depositAmount" },
            { label: "Address", key: "address" },
            { label: "Company Address", key: "companyAddress" },
          ].map(field => (
            <div className="mb-3" key={field.key}>
              <label className="form-label">{field.label}</label>
              <input
                type="text"
                className="form-control"
                value={editTenantData[field.key] || ''}
                onChange={(e) =>
                  setEditTenantData(prev => ({ ...prev, [field.key]: e.target.value }))
                }
              />
            </div>
          ))}
          <div className="mb-3">
            <label className="form-label">Joining Date</label>
            <input
              type="date"
              className="form-control"
              value={editTenantData.joiningDate?.split('T')[0]}
              onChange={(e) =>
                setEditTenantData(prev => ({ ...prev, joiningDate: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleTenantUpdate}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{showFModal && (
  <div
    className="modal-backdrop-custom"
    style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1050
    }}
    onClick={() => setShowFModal(false)} // ✅ Close on backdrop click
  >
    <div
      className="modal-dialog modal-lg"
      style={{ zIndex: 1060 }}
      onClick={(e) => e.stopPropagation()} // ❌ Prevent close when clicking inside
    >
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Tenant Admission Form</h5>
          <button className="btn-close" onClick={() => setShowFModal(false)}></button>
        </div>
        <div className="modal-body">
          {selectedRowData && <FormDownload formData={selectedRowData} />}
        </div>
      </div>
    </div>
  </div>
)}



{/* show details model */}

{showDetailsModal && selectedTenant && (
  <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
    <div className="modal-dialog modal-lg">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Tenant Details - {selectedTenant.name}</h5>
          <button className="btn-close" onClick={() => setShowDetailsModal(false)}></button>
        </div>
        <div className="modal-body">
          {/* Personal Info */}
          <h6>Personal Information</h6>
          <ul className="list-group mb-3">
            <li className="list-group-item">Name:  {selectedTenant.name}</li>
            <li className="list-group-item">Room No: {selectedTenant.roomNo}</li>
            <li className="list-group-item">Bed No: {selectedTenant.bedNo}</li>
            <li className="list-group-item">Phone: {selectedTenant.phoneNo}</li>
            <li className="list-group-item">Joining Date: {new Date(selectedTenant.joiningDate).toLocaleDateString()}</li>
            <li className="list-group-item">Deposit: ₹{Number(selectedTenant.depositAmount || 0).toLocaleString('en-IN')}</li>
            <li className="list-group-item">Address: {selectedTenant.address}</li>
            <li className="list-group-item">Company Address: {selectedTenant.companyAddress}</li>
          </ul>

          {/* Rent Info */}
          <h6>Rent History ({new Date().getFullYear()})</h6>
          <ul className="list-group">
            {Array.from({ length: 12 }, (_, i) => {
              const monthDate = new Date(new Date().getFullYear(), i, 1);
              const key = monthDate.toLocaleString('default', { month: 'short' }) + '-' + String(monthDate.getFullYear()).slice(-2);

              const rent = selectedTenant.rents?.find(r =>
                new Date(r.date).getMonth() === i &&
                new Date(r.date).getFullYear() === monthDate.getFullYear()
              );

              const isPast = monthDate < new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const joiningDate = new Date(selectedTenant.joiningDate);
const rentStartMonth = new Date(joiningDate.getFullYear(), joiningDate.getMonth() + 1, 1);
const isFutureMonth = monthDate > new Date();
const isBeforeRentStart = monthDate < rentStartMonth;


             return (
  <li key={i} className="list-group-item d-flex justify-content-between align-items-center">
    {monthDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
    {isBeforeRentStart ? (
      <span className="badge bg-secondary">Not Applicable</span>
    ) : rent ? (
      <span className="badge bg-success">₹{Number(rent.rentAmount).toLocaleString('en-IN')} on {new Date(rent.date).toLocaleDateString()}</span>
    ) : isFutureMonth ? (
      <span className="badge bg-warning text-dark">Upcoming</span>
    ) : (
      <span className="badge bg-danger">Pending</span>
    )}
  </li>
);

            })}
          </ul>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowDetailsModal(false)}>Close</button>
        </div>
      </div>
    </div>
  </div>
)}



{/* editmodel */}
      {editingTenant && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Rent for {editingTenant.name}</h5>
                <button type="button" className="btn-close" onClick={() => setEditingTenant(null)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Rent Amount</label>
                  <input type="number" className="form-control" value={editRentAmount} onChange={e => setEditRentAmount(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-control" value={editRentDate} onChange={e => setEditRentDate(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingTenant(null)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleSave}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

{showLeaveModal && (
  <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
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
            Are you sure you want <strong>{currentLeaveName}</strong> to leave on <strong>{selectedLeaveDate || "..."}</strong>?
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowLeaveModal(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={confirmLeave}>Confirm Leave</button>
        </div>
      </div>
    </div>
  </div>
)}
{showRentModal && (
  <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
    <div className="modal-dialog">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Last 3 Rents - {selectedTenantName}</h5>
          <button type="button" className="btn-close" onClick={() => setShowRentModal(false)}></button>
        </div>
        <div className="modal-body">
          {selectedRentDetails.length > 0 ? (
            <ul className="list-group">
              {selectedRentDetails.map((rent, index) => (
                <li className="list-group-item" key={index}>
                  ₹{Number(rent.rentAmount).toLocaleString('en-IN')} – {new Date(rent.date).toLocaleDateString()}
                </li>
              ))}
            </ul>
          ) : (
            <p>No rent data available.</p>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowRentModal(false)}>Close</button>
        </div>
      </div>
    </div>
  </div>
)}
{showPasswordPrompt && (
  <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
    <div className="modal-dialog">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Enter Password</h5>
          <button className="btn-close" onClick={() => setShowPasswordPrompt(false)}></button>
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
          <button className="btn btn-secondary" onClick={() => setShowPasswordPrompt(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={verifyPassword}>Submit</button>
        </div>
      </div>
    </div>
  </div>
)}
{showDeleteConfirmation && (
  <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
    <div className="modal-dialog">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Confirm Deletion</h5>
          <button className="btn-close" onClick={() => setShowDeleteConfirmation(false)}></button>
        </div>
        <div className="modal-body">
          Are you sure you want to delete this tenant?
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowDeleteConfirmation(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDeleteConfirm}>Yes, Delete</button>
        </div>
      </div>
    </div>
  </div>
)}


    </div>
  );
}
const style = {
  colorA: {
    backgroundColor: '#387fbc',
    color: '#fff',
    border: '1px solid #387fbc',
  },
  colorB: {
    backgroundColor: '#5eb65c',
    color: '#fff',
    border: '1px solid #5eb65c',
  },
  successButton: {
    backgroundColor: '#efad4d',
    color: '#fff',
    border: '1px solid #efad4d',
  },
};
export default NewComponant;
/////////////////////////////////////////////////////////////////////////
// previous code 
import React, { useEffect, useState } from 'react';
import { FaPlus, FaDownload, FaEdit } from "react-icons/fa";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import * as XLSX from 'xlsx';

const LightbillMaintenace = () => {
  const currentYear = new Date().getFullYear();
  // const [selectedYear, setSelectedYear] = useState(currentYear);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-based month (1=Jan)

  const [showFirstHalf, setShowFirstHalf] = useState(true);
  const [activeTab, setActiveTab] = useState('light');
  const [lightBills, setLightBills] = useState([]);
  const [otherExpenses, setOtherExpenses] = useState([]);
  // const [selectedMonth, setSelectedMonth] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [searchText, setSearchText] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [updatedTotalReading, setUpdatedTotalReading] = useState('');
  const [updatedAmount, setUpdatedAmount] = useState('');
  const [updatedDate, setUpdatedDate] = useState('');
  const [updatedStatus, setUpdatedStatus] = useState('');
// Added state to handle updated mainAmount and expenses for Other Expenses edit
  const [updatedMainAmount, setUpdatedMainAmount] = useState('');
  const [updatedExpenses, setUpdatedExpenses] = useState('');


const [tenants, setTenants] = useState([]);
const [showAddModal, setShowAddModal] = useState(false);
const [newEntry, setNewEntry] = useState({
  roomNo: '',
  meterNo: '',
  totalReading: '',
  amount: '',
  mainAmount: '',
  expenses: '',
  date: '',
  status:'',
});

  
  // const months = Array.from({ length: 12 }, (_, i) =>
  //   new Date(selectedYear, i).toLocaleString('default', { month: 'short' }) + '-' + String(selectedYear).slice(-2)
  // );
  // const visibleMonths = showFirstHalf ? months.slice(0, 6) : months.slice(6, 12);


  // For example, allow 5 years range for selection
const years = [];
for (let y = selectedYear - 2; y <= selectedYear + 2; y++) {
  years.push(y);
}

const months = [
  { value: 0, label: 'All Months' },
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Feb' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' },
  { value: 5, label: 'May' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Aug' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dec' },
];


  const getMonthYear = (dateString) => {
    const date = new Date(dateString);
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${month}-${year}`;
  };
useEffect(() => {
  const fetchTenants = async () => {
    try {
      const res = await fetch('    https://rentmobile-api.pnminfotech.com/api/');
      const data = await res.json();
      setTenants(data);
    } catch (err) {
      console.error("Error fetching tenants:", err);
    }
  };
  fetchTenants();
}, []);

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



  
const handleAddEntry = async () => {
  try {
    const url = activeTab === 'light'
      ? '    https://rentmobile-api.pnminfotech.com/api/light-bill'
      : '    https://rentmobile-api.pnminfotech.com/api/other-expense';

    const bodyData = activeTab === 'light'
      ? {
          roomNo: newEntry.roomNo,
          meterNo: newEntry.meterNo,
          totalReading: newEntry.totalReading,
          amount: newEntry.amount,
          date: newEntry.date,
        }
      : {
          roomNo: newEntry.roomNo,
          mainAmount: newEntry.mainAmount,
          expenses: newEntry.expenses.split(',').map(e => e.trim()),
          date: newEntry.date,
        };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData),
    });

    if (!res.ok) throw new Error("Add failed");

    alert("Entry added successfully!");
    setShowAddModal(false);
    setNewEntry({ roomNo: '', meterNo: '', totalReading: '', amount: '', mainAmount: '', expenses: '', date: '' });
    fetchData();
  } catch (err) {
    alert("Failed to add entry: " + err.message);
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



 

  // Modified handleEdit to handle both tabs
  const handleEdit = (bill) => {
    setSelectedBill(bill);
    if (activeTab === 'light') {
      setUpdatedTotalReading(bill.totalReading);
      setUpdatedAmount(bill.amount);
      setUpdatedDate(bill.date?.slice(0, 10));
      setUpdatedStatus(bill.status);
    } else {
      setUpdatedMainAmount(bill.mainAmount);
      setUpdatedExpenses(bill.expenses?.join(', ') || '');
      setUpdatedDate(bill.date?.slice(0, 10));
       setUpdatedStatus(bill.status);
    }
    setShowEditModal(true);
  };

  // Modified handleUpdateSubmit to handle both tabs
  const handleUpdateSubmit = async () => {
    try {
      let bodyData;
      let url;
      if (activeTab === 'light') {
        url = `    https://rentmobile-api.pnminfotech.com/api/light-bill/${selectedBill._id}`;
        bodyData = {
          ...selectedBill,
          status: updatedStatus,
          totalReading: updatedTotalReading,
          amount: updatedAmount,
          date: updatedDate,
        };
      } else {
        url = `    https://rentmobile-api.pnminfotech.com/api/other-expense/${selectedBill._id}`;
        bodyData = {
          ...selectedBill,
           status: updatedStatus,
          mainAmount: updatedMainAmount,
          expenses: updatedExpenses.split(',').map(e => e.trim()),
          date: updatedDate,

        };
      }

      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      if (!res.ok) throw new Error("Update failed");

      alert("Bill updated!");
      setShowEditModal(false);
      fetchData();
    } catch (err) {
      alert("Failed to update: " + err.message);
    }
  };

  // Modified handleDelete to handle both tabs
  const handleDelete = async (bill) => {
    if (window.confirm(`Are you sure you want to delete this ${activeTab === 'light' ? 'light bill' : 'other expense'}?`)) {
      try {
        const url = activeTab === 'light'
          ? `    https://rentmobile-api.pnminfotech.com/api/light-bill/${bill._id}`
          : `    https://rentmobile-api.pnminfotech.com/api/other-expense/${bill._id}`;

        const response = await fetch(url, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) throw new Error("Delete failed");

        alert(`${activeTab === 'light' ? 'Light Bill' : 'Other Expense'} deleted successfully`);
        fetchData();
      } catch (err) {
        alert("Delete failed: " + err.message);
      }
    }
  };




const rawBills = activeTab === 'light' ? lightBills : otherExpenses;

const billsWithTenant = rawBills.map(item => {
  const tenant = tenants.find(t => t.roomNo === item.roomNo);
  return {
    ...item,
    tenantName: tenant?.name || '',
    tenantBedNo: tenant?.bedNo || ''
  };
});

const filteredBills = billsWithTenant.filter(item => {
  const itemDate = new Date(item.date);
  const matchesYear = itemDate.getFullYear() === selectedYear;
  const matchesMonth = selectedMonth === 0 || (itemDate.getMonth() + 1) === selectedMonth;
  const matchesRoom = buildingFilter === '' || item.roomNo === buildingFilter;
  const matchesSearch =
    searchText === '' ||
    item.tenantName.toLowerCase().includes(searchText.toLowerCase()) ||
    item.tenantBedNo.toLowerCase().includes(searchText.toLowerCase());

  return matchesYear && matchesMonth && matchesRoom && matchesSearch;
});

  const totalLightBill = lightBills.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalmaintainace = otherExpenses.reduce((sum, item) => sum + Number(item.mainAmount  || 0),0);


const totalPaidLightBill = lightBills
  .filter(item => item.status === 'paid')
  .reduce((sum, item) => sum + Number(item.amount || 0), 0);

const totalPendingLightBill = lightBills
  .filter(item => item.status !== 'paid')
  .reduce((sum, item) => sum + Number(item.amount || 0), 0);

const totalPaidMaintenance = otherExpenses
  .filter(item => item.status === 'paid')
  .reduce((sum, item) => sum + Number(item.mainAmount || 0), 0);

const totalPendingMaintenance = otherExpenses
  .filter(item => item.status !== 'paid')
  .reduce((sum, item) => sum + Number(item.mainAmount || 0), 0);


  
  return (
    <div className="container-fluid px-4 py-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <h3 className="fw-bold mb-4">Light Bill & Maintenance Tracker</h3>

     
      {/* Filters */}
      <div className="d-flex align-items-center mb-3 gap-3 flex-wrap">
      


  <select
    className="form-select"
    style={{ width: '120px' }}
    value={selectedYear}
    onChange={(e) => setSelectedYear(Number(e.target.value))}
  >
    {years.map((year) => (
      <option key={year} value={year}>{year}</option>
    ))}
  </select>

  <select
    className="form-select"
    style={{ width: '120px' }}
    value={selectedMonth}
    onChange={(e) => setSelectedMonth(Number(e.target.value))}
  >
    {months.map(({ value, label }) => (
      <option key={value} value={value}>{label}</option>
    ))}
  </select>

  {/* Keep your other filters and buttons here */}




       <select className="form-select" style={{ width: '200px' }} value={buildingFilter} onChange={(e) => setBuildingFilter(e.target.value)}>
  <option value="">Select Room No</option>
  {[...new Set(tenants.map(t => t.roomNo))] // Unique roomNos
    .filter(room => room) // Exclude undefined/null
    .map((room, idx) => (
      <option key={idx} value={room}>{room}</option>
  ))}
</select>


        <input
          type="text"
          placeholder="Search by Tenant Name / Bed No"
          className="form-control"
          style={{ maxWidth: '300px' }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
<button
  className="btn me-2"
  style={activeTab === 'light' ? style.colorA : style.colorB}
  onClick={() => setActiveTab('light')}
>
  Light Bill
</button>

<button
  className="btn me-2"
  style={activeTab === 'other' ? style.colorA : style.colorB}
  onClick={() => setActiveTab('other')}
>
  Other Expenses
</button>

<button
  className="btn"
  style={style.successButton}
  onClick={downloadExcel}
>
  <FaDownload className="me-1" /> Download Excel
</button>


       
  <button
  className="btn me-2"
  style={activeTab === 'light' ? style.colorA : style.colorB}
  onClick={() => setShowAddModal(true)}
>
  <FaPlus className="me-1" />
  Add {activeTab === 'light' ? 'Light Bill' : 'Other Expense'}
</button>



      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="bg-white border rounded shadow-sm p-3 text-center">
            <h6 className="text-muted mb-1">Total Light Bill</h6>
            <h4 className="fw-bold">{totalLightBill.toLocaleString()}</h4>
          </div>
        </div>
        <div className="col-md-3">
          <div className="bg-white border rounded shadow-sm p-3 text-center">
            <h6 className="text-muted mb-1">Total Maintenance Collected</h6>
            <h4 className="fw-bold"> {totalmaintainace.toLocaleString()}</h4>
          </div>
        </div>
      
 {/* <div className="col-md-4">
  <div className="bg-white border rounded shadow-sm p-3 text-center">
    <h6 className="text-muted mb-1">Total Paid Light Bill</h6>
    <h4 className="fw-bold">{totalPaidLightBill.toLocaleString()}</h4>
  </div>
</div> */}

{/* Total Paid Maintenance */}
{/* <div className="col-md-4">
  <div className="bg-white border rounded shadow-sm p-3 text-center">
    <h6 className="text-muted mb-1">Total Paid Maintenance</h6>
    <h4 className="fw-bold">{totalPaidMaintenance.toLocaleString()}</h4>
  </div>
</div> */}


<div className="col-md-3">
  <div className="bg-white border rounded shadow-sm p-3 text-center">
    <h6 className="text-muted mb-1">Pending LightBill</h6>
    <h4 className="fw-bold text-danger">{totalPendingLightBill.toLocaleString()}</h4>
  </div>
</div>
{/* Pending Maintenance */}
<div className="col-md-3">
  <div className="bg-white border rounded shadow-sm p-3 text-center">
    <h6 className="text-muted mb-1">Pending Maintenance</h6>
    <h4 className="fw-bold text-danger">{totalPendingMaintenance.toLocaleString()}</h4>
  </div>
</div>
</div>
      

      {/* Table */}
     <div className="table-responsive">
  <table className="table table-bordered align-middle">
    <thead className="table-light">
      <tr>
        <th>#</th>
        <th>Tenant Name</th>
        <th>Bed No</th>
        <th>Room No</th>
        {activeTab === 'light' ? (
          <>
            <th>Meter No</th>
            <th>Total Reading</th>
            <th>Amount</th>
          </>
        ) : (
          <>
            <th>Main Amount</th>
            <th>Expenses</th>
          </>
        )}
        <th>Date</th>
        <th>Status</th>
        <th className="text-center">Actions</th>
      </tr>
    </thead>
    <tbody>
      {filteredBills.length === 0 ? (
        <tr>
          <td colSpan="10" className="text-center">No data found.</td>
        </tr>
      ) : (
        filteredBills.map((item, idx) => (
          <tr key={item._id || idx}>
            <td>{idx + 1}</td>
           
<td>{item.tenantName || '-'}</td>
<td>{item.tenantBedNo || '-'}</td>


            <td>{item.roomNo || '-'}</td>
            {activeTab === 'light' ? (
              <>
                <td>{item.meterNo || '-'}</td>
                <td>{item.totalReading || '-'}</td>
                <td>{item.amount?.toLocaleString() || '-'}</td>
              </>
            ) : (
              <>
                <td>{item.mainAmount?.toLocaleString() || '-'}</td>
                <td>{item.expenses?.join(', ') || '-'}</td>
              </>
            )}
            <td>{new Date(item.date).toLocaleDateString()}</td>
            <td>
              {item.status === 'paid' ? (
                <span className="badge bg-success">Paid</span>
              ) : (
                <span className="badge bg-warning text-dark">Pending</span>
              )}
            </td>
            <td className="text-center">
              <button className="btn btn-sm btn-outline-primary me-2" onClick={() => handleEdit(item)}>
                <FaEdit />
              </button>
              <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(item)}>
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </td>
          </tr>
        ))
      )}
    </tbody>
  </table>
</div>

{showAddModal && (
  <div className="modal d-block" tabIndex="-1">
    <div className="modal-dialog">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Add {activeTab === 'light' ? 'Light Bill' : 'Other Expense'}</h5>
          <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
        </div>
        <div className="modal-body">
          <div className="mb-3">
            <label className="form-label">Room No</label>
            <select
  className="form-select"
  value={newEntry.roomNo}
  onChange={(e) => setNewEntry({ ...newEntry, roomNo: e.target.value })}
>
  <option value="">Select Room No</option>
  {[...new Set(tenants.map(t => t.roomNo))]
    .filter(room => room)
    .map((room, idx) => (
      <option key={idx} value={room}>{room}</option>
    ))
  }
</select>

          </div>

          {activeTab === 'light' ? (
            <>
              <div className="mb-3">
                <label className="form-label">Meter No</label>
                <input
                  type="text"
                  className="form-control"
                  value={newEntry.meterNo}
                  onChange={(e) => setNewEntry({ ...newEntry, meterNo: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Total Reading</label>
                <input
                  type="number"
                  className="form-control"
                  value={newEntry.totalReading}
                  onChange={(e) => setNewEntry({ ...newEntry, totalReading: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Amount</label>
                <input
                  type="number"
                  className="form-control"
                  value={newEntry.amount}
                  onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                />
              </div>
            </>
          ) : (
            <>
              <div className="mb-3">
                <label className="form-label">Main Amount</label>
                <input
                  type="number"
                  className="form-control"
                  value={newEntry.mainAmount}
                  onChange={(e) => setNewEntry({ ...newEntry, mainAmount: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Expenses (comma separated)</label>
                <input
                  type="text"
                  className="form-control"
                  value={newEntry.expenses}
                  onChange={(e) => setNewEntry({ ...newEntry, expenses: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="mb-3">
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-control"
              value={newEntry.date}
              onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddEntry} style={{backgroundColor:"#5eb65c"}}>Add</button>
        </div>
      </div>
    </div>
  </div>
)}

  {showEditModal && (
    <div className="modal d-block" tabIndex="-1">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Edit {activeTab === 'light' ? 'Light Bill' : 'Other Expense'}</h5>
            <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
          </div>
          <div className="modal-body">
            {activeTab === 'light' ? (
              <>
               <div className="mb-3">
                  <label className="form-label">Status</label>
  <select
    className="form-select"
    value={updatedStatus}
    onChange={(e) => setUpdatedStatus(e.target.value)}
  >
    <option value="pending">Pending</option>
    <option value="paid">Paid</option>
  </select>
                </div>
              <div className="mb-3">
                  <label className="form-label">Total Reading</label>
                  <input
                    type="number"
                    className="form-control"
                    value={updatedTotalReading}
                    onChange={(e) => setUpdatedTotalReading(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Amount</label>
                  <input
                    type="number"
                    className="form-control"
                    value={updatedAmount}
                    onChange={(e) => setUpdatedAmount(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
              <div className="mb-3">
                  <label className="form-label">Status</label>
  <select
    className="form-select"
    value={updatedStatus}
    onChange={(e) => setUpdatedStatus(e.target.value)}
  >
    <option value="pending">Pending</option>
    <option value="paid">Paid</option>
  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Main Amount</label>
                  <input
                    type="number"
                    className="form-control"
                    value={updatedMainAmount}
                    onChange={(e) => setUpdatedMainAmount(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Expenses (comma separated)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={updatedExpenses}
                    onChange={(e) => setUpdatedExpenses(e.target.value)}
                    placeholder="e.g. Repair, Cleaning"
                  />
                </div>
              </>
            )}
            <div className="mb-3">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-control"
                value={updatedDate}
                onChange={(e) => setUpdatedDate(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
            <button className="btn " onClick={handleUpdateSubmit} style={{backgroundColor:"#5eb65c"}}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  )}

     
    </div>
  );
};
const style = {
  colorA: {
    backgroundColor: '#387fbc',
    color: '#fff',
    border: '1px solid #387fbc',
  },
  colorB: {
    backgroundColor: '#5eb65c',
    color: '#fff',
    border: '1px solid #5eb65c',
  },
  successButton: {
    backgroundColor: '#efad4d',
    color: '#fff',
    border: '1px solid #efad4d',
  },
};


export default LightbillMaintenace;

















// MainDashboard.jsx
import React, { useEffect, useState } from 'react';
import { FiBarChart2 } from 'react-icons/fi';
import { MdOutlineBedroomParent, MdLightbulbOutline, MdOutlineReceiptLong } from 'react-icons/md';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#2563eb', '#facc15', '#10b981', '#ef4444', '#6366f1', '#1e3a8a'];

const MainDashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState({ rent: {}, beds: {}, light: {}, maintenance: {} });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('    https://rentmobile-api.pnminfotech.com/api/').then(res => res.json()),
      fetch('    https://rentmobile-api.pnminfotech.com/api/light-bill/all').then(res => res.json()),
      fetch('    https://rentmobile-api.pnminfotech.com/api/other-expense/all').then(res => res.json()),
    ]).then(([tenants, lightBills, otherExpenses]) => {
      const totalBeds = tenants.length;
      const occupied = tenants.filter(t => !t.leaveDate).length;
      const vacant = totalBeds - occupied;
      const deposits = tenants.filter(t => Number(t.depositAmount) > 0).length;

      const now = new Date();
      const pendingRents = tenants.filter(t => {
        const lastRent = t.rents?.[t.rents.length - 1];
        if (!lastRent) return true;
        const rentDate = new Date(lastRent.date);
        return rentDate.getMonth() !== now.getMonth() || rentDate.getFullYear() !== now.getFullYear();
      }).length;

      const totalLight = lightBills.reduce((sum, b) => sum + Number(b.amount || 0), 0);
      const paidLight = lightBills.filter(b => b.status === 'paid').reduce((sum, b) => sum + Number(b.amount), 0);
      const pendingLight = totalLight - paidLight;

      const totalMaint = otherExpenses.reduce((sum, x) => sum + Number(x.mainAmount || 0), 0);
      const paidMaint = otherExpenses.filter(x => x.status === 'paid').reduce((sum, x) => sum + Number(x.mainAmount), 0);
      const pendingMaint = totalMaint - paidMaint;

      setSummary({
        beds: { total: totalBeds, occupied, vacant },
        rent: { pending: pendingRents, deposits },
        light: { paid: paidLight, pending: pendingLight },
        maintenance: { paid: paidMaint, pending: pendingMaint },
      });
    });
  }, []);

  const handleNavigation = (path) => navigate(path);
  const handleLogout = () => {
    localStorage.removeItem("authToken");
    navigate("/");
  };

  const renderCard = (label, value) => (
    <div className="col-sm-6 col-lg-3">
      <div className="p-3 bg-white border rounded shadow-sm text-center">
        <h6 className="text-muted mb-1">{label}</h6>
        <h4 className="fw-bold text-primary">{value}</h4>
      </div>
    </div>
  );

  const renderPie = (data, title) => (
    <div className="bg-white rounded shadow-sm p-3" style={{ width: '100%', minHeight: 300 }}>
      <h6 className="text-center text-muted mb-3">{title}</h6>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={70}
            innerRadius={40}
            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {data.map((entry, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );

  const renderBarChart = () => {
    const totalLight = (summary.light.paid || 0) + (summary.light.pending || 0);
    const totalMaint = (summary.maintenance.paid || 0) + (summary.maintenance.pending || 0);
    const totalRent = (summary.rent.deposits || 0) + (summary.rent.pending || 0);

    const getPercent = (value, total) => total ? (value / total) * 100 : 0;

    const data = [
      { name: 'Light', Paid: getPercent(summary.light.paid, totalLight), Pending: getPercent(summary.light.pending, totalLight) },
      { name: 'Maintenance', Paid: getPercent(summary.maintenance.paid, totalMaint), Pending: getPercent(summary.maintenance.pending, totalMaint) },
      { name: 'Rent', Paid: getPercent(summary.rent.deposits, totalRent), Pending: getPercent(summary.rent.pending, totalRent) },
    ];

    return (
      <div className="bg-white rounded shadow-sm p-3">
        <h6 className="text-center text-muted mb-3">Overall Payment Status</h6>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} tickFormatter={(val) => `${val.toFixed(0)}%`} />
            <Tooltip formatter={(val) => `${val.toFixed(1)}%`} />
            <Legend />
            <Bar dataKey="Paid" fill="#10B981" />
            <Bar dataKey="Pending" fill="#EF4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const dayName = currentTime.toLocaleDateString(undefined, { weekday: 'long' });
  const dateString = currentTime.toLocaleDateString();
  const timeString = currentTime.toLocaleTimeString();

  return (
    <div className="d-flex" style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {/* Sidebar */}
      <aside className="bg-primary text-white p-4" style={{ width: 250 }}>
        <h4 className="text-center mb-4 fw-bold">🏨 Hostel Manager</h4>
        <ul className="list-unstyled">
          {[{ label: 'Dashboard', icon: <FiBarChart2 />, path: '/maindashboard' },
            { label: 'Rent & Deposit', icon: <MdOutlineBedroomParent />, path: '/NewComponant' },
            { label: 'Light Bill', icon: <MdLightbulbOutline />, path: '/lightbillmaintance' },
            { label: 'Maintenance', icon: <MdOutlineReceiptLong />, path: '/lightbillmaintance' }]
            .map(({ label, icon, path }) => (
              <li key={label} className="mb-3" onClick={() => handleNavigation(path)} style={{ cursor: 'pointer' }}>
                {icon} <span className="ms-2">{label}</span>
              </li>
            ))}
          <li className="mt-3" onClick={handleLogout} style={{ cursor: 'pointer' }}>
            <FontAwesomeIcon icon={faSignOutAlt} /> <span className="ms-2">Logout</span>
          </li>
        </ul>
      </aside>

      {/* Main Content */}
      <main className="flex-grow-1 p-4 bg-light" style={{ marginLeft: 250 }}>
        <div className="mb-4 text-center">
          <h3 className="text-primary fw-bold">Welcome Admin 👋</h3>
          <p className="text-muted">{dayName}, {dateString} | {timeString}</p>
        </div>

        {/* Summary Cards */}
        <div className="row g-3 mb-4">
          {renderCard('Total Beds', summary.beds.total || 0)}
          {renderCard('Occupied', summary.beds.occupied || 0)}
          {renderCard('Pending Rents', summary.rent.pending || 0)}
          {renderCard('Deposits', summary.rent.deposits || 0)}
        </div>

        {/* Bar Chart */}
        <div className="row mb-4">
          <div className="col-12">{renderBarChart()}</div>
        </div>

        {/* Pie Charts */}
        <div className="row g-3">
          <div className="col-md-6 col-lg-3">{renderPie([
            { name: 'Paid', value: summary.light.paid || 0 },
            { name: 'Pending', value: summary.light.pending || 0 }
          ], 'Light Bill')}</div>

          <div className="col-md-6 col-lg-3">{renderPie([
            { name: 'Paid', value: summary.maintenance.paid || 0 },
            { name: 'Pending', value: summary.maintenance.pending || 0 }
          ], 'Maintenance')}</div>

          <div className="col-md-6 col-lg-3">{renderPie([
            { name: 'Received', value: summary.rent.deposits || 0 },
            { name: 'Pending', value: summary.rent.pending || 0 }
          ], 'Rent')}</div>

          <div className="col-md-6 col-lg-3">{renderPie([
            { name: 'Occupied', value: summary.beds.occupied || 0 },
            { name: 'Vacant', value: summary.beds.vacant || 0 }
          ], 'Bed Status')}</div>
        </div>
      </main>
    </div>
  );
};

export default MainDashboard;
