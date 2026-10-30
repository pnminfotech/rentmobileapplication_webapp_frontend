import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import axios from 'axios';
// import { useNavigate } from 'react-router-dom';
import { FaPlus, FaDownload, FaEdit } from "react-icons/fa";
import { FaInfoCircle } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { FaBolt, FaReceipt } from 'react-icons/fa'; // example icons
import { FaSearch } from 'react-icons/fa';

function NewComponantOriginal() {
  const [formData, setFormData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingTenant, setEditingTenant] = useState(null);
  const [editRentAmount, setEditRentAmount] = useState('');
  const [editRentDate, setEditRentDate] = useState('');
   const [activeTab, setActiveTab] = useState('light');
    const [lightBills, setLightBills] = useState([]);
    // const [activeTab, setActiveTab] = useState('light'); // 'light' or 'other'
const [searchText, setSearchText] = useState('');

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

 
const handleAddTenant = async () => {
  try {
    await axios.post(`${apiUrl}forms`, newTenant);  // ✅ Use "forms" instead of "form"
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
      companyAddress: ''
    });
    const response = await axios.get(apiUrl);
    setFormData(response.data);
  } catch (error) {
    alert('Failed to add tenant: ' + (error.response?.data?.message || error.message));
  }
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
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const matchRent = (month, year) =>
      rents.find(r => {
        if (!r.date) return false;
        const d = new Date(r.date);
        return d.getMonth() === month && d.getFullYear() === year && Number(r.rentAmount) > 0;
      });

    const current = matchRent(currentMonth, currentYear);
    if (current) return { rentAmount: Number(current.rentAmount), date: current.date };

    const previous = matchRent(previousMonth, previousYear);
    if (previous) return { rentAmount: Number(previous.rentAmount), date: previous.date };

    const latest = rents
      .filter(r => Number(r.rentAmount) > 0 && r.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    return latest ? { rentAmount: Number(latest.rentAmount), date: latest.date } : { rentAmount: 0, date: null };
  };

  const calculateDue = (rents = [], joiningDateStr) => {
    if (!joiningDateStr) return 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const joiningDate = new Date(joiningDateStr);
    const rentStartMonth = new Date(joiningDate.getFullYear(), joiningDate.getMonth() + 1, 1);

    const rentMap = new Map();
    rents.forEach(rent => {
      const rentDate = new Date(rent.date);
      const key = `${rentDate.getMonth()}-${rentDate.getFullYear()}`;
      rentMap.set(key, rent);
    });

    const rentAmount = getDisplayedRent(rents).rentAmount || 1000;
    let dueCount = 0;

    const isDue = (month, year) => {
      const monthDate = new Date(year, month, 1);
      if (monthDate < rentStartMonth) return false;

      const key = `${month}-${year}`;
      const paid = rentMap.get(key);
      return !(paid && Number(paid.rentAmount) > 0);
    };

    if (isDue(previousMonth, previousYear)) dueCount++;
    if (now.getDate() >= 1 && isDue(currentMonth, currentYear)) dueCount++;

    return rentAmount * dueCount;
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
    style={{backgroundColor:"#3db7b1", color:"white"}}
   onClick={openAddModal}>
   <FaPlus className="me-1" /> Add Tenant
  </button>

  <button
    className="btn me-2"
    style={activeTab === 'light' ? style.colorA : style.colorB}
    onClick={() => {
      setActiveTab('light');
      navigate('/lightbillmaintance', { state: { tab: 'light' } });
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
      navigate('/lightbillmaintance', { state: { tab: 'other' } });
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
                    <th>Deposit</th>
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
return (
  (name.includes(searchText.toLowerCase()) || bed.includes(searchText)) &&
  (selectedYear === 'All Records' || joinYear === Number(selectedYear))
);

    })
    .map((tenant) => {
      const { rentAmount, date: rentDate } = getDisplayedRent(tenant.rents);
      const dueAmount = calculateDue(tenant.rents, tenant.joiningDate);
      const depositCollected = Number(tenant.depositAmount) > 0;

      return (
        <tr key={tenant._id}>
          <td>{tenant.roomNo} <div className="text-muted small">bed {tenant.bedNo}</div></td>
          <td>{tenant.name}</td>
             <td>₹{Number(tenant.depositAmount || 0).toLocaleString('en-IN')}</td>
          {/* <td>₹{rentAmount.toLocaleString('en-IN')}</td> */}
         <td style={{ minWidth: "120px" }}>
  {editingTenant?._id === tenant._id ? (
    <div className="d-flex">
      <input
        type="number"
        className="form-control form-control-sm me-1"
        value={editRentAmount}
        onChange={(e) => setEditRentAmount(e.target.value)}
        autoFocus
      />
      <button className="btn btn-sm btn-success" onClick={handleSave}>✔</button>
    </div>
  ) : (
    <span style={{ cursor: 'pointer' }} onClick={() => handleEdit(tenant)}>
      ₹{rentAmount.toLocaleString('en-IN')}<div className="text-muted small">{rentDate ? new Date(rentDate).toLocaleDateString('en-IN') : '--'}</div>
    </span>
  )}
</td>


          {/* <td>{rentDate ? new Date(rentDate).toLocaleDateString('en-IN') : '--'}</td> */}
          <td>₹{dueAmount.toLocaleString('en-IN')}</td>
       
          <td>
            <span className={`badge rounded-pill px-3 py-2 ${dueAmount === 0 ? 'bg-success' : 'bg-warning text-dark'}`}>
              {dueAmount === 0 ? 'Paid' : 'Pending'}
            </span>
          </td>
          {/* <td>
            <span className={`badge rounded-pill px-3 py-2 ${depositCollected ? 'bg-success' : 'bg-warning text-dark'}`}>
              {depositCollected ? 'Collected' : 'Pending'}
            </span>
          </td> */}
          <td>
            <button className="btn btn-sm btn-outline-primary me-2" onClick={() => handleEdit(tenant)}>
              <FaEdit />
            </button>
            <button style={{ backgroundColor: "#416ed7d1", color: "white" }} className="btn" onClick={() => handleNavigation('/add-data')}>
              <FaInfoCircle className="me-2" /> View Details
            </button>
          </td>
        </tr>
      );
    })}
</tbody>

            </table>
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
  {[
    { label: 'Sr No', key: 'srNo', type: 'text', readOnly: true },
    { label: 'Name', key: 'name' },
    { label: 'Joining Date', key: 'joiningDate', type: 'date' },
    { label: 'Room No', key: 'roomNo' },
    { label: 'Deposit Amount', key: 'depositAmount', type: 'number' },
    { label: 'Phone No', key: 'phoneNo' },
    { label: 'Address', key: 'address' },
    { label: 'Relative Address 1', key: 'relativeAddress1' },
    { label: 'Relative Address 2', key: 'relativeAddress2' },
    { label: 'Floor No', key: 'floorNo' },
    { label: 'Bed No', key: 'bedNo' },
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
</div>

        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
          <button className="btn " onClick={handleAddTenant} style={{backgroundColor:"rgb(94, 182, 92)", color:"white"}}>
            <FaPlus className="me-2" /> Save Tenant
          </button>
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
export default NewComponantOriginal;