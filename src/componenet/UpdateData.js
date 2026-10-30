import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import { FaEdit } from "react-icons/fa";
import { Modal, Button } from "react-bootstrap";
import FormDownload from '../componenet/Maintanace/FormDownload';
import * as XLSX from "xlsx";

function UpdateData() {
  const [formData, setFormData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRowData, setSelectedRowData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // Default: current year

  const navigate = useNavigate();
  const handleNavigation = (path) => {
    navigate(path);
  };

  const apiUrl = '    https://rentmobile-api.pnminfotech.com/api/'; // API endpoint

  // Generate months dynamically for the selected year
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = new Date(selectedYear, index).toLocaleString('default', { month: 'short' });
    return `${month}-${selectedYear.toString().slice(-2)}`;
  });

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

  const openModal = (rowData) => {
    setSelectedRowData(rowData);
    setShowModal(true);
  };

  const getMonthYear = (date) => {
    const d = new Date(date);
    return `${d.toLocaleString('default', { month: 'short' })}-${d.getFullYear().toString().slice(-2)}`;
  };

  // Function to handle downloading data as Excel
  const handleDownload = () => {
    const filteredData = formData.filter(data =>
      data.rents.some(rent => new Date(rent.date).getFullYear() === selectedYear)
    );

    const worksheetData = filteredData.map(data => {
      const row = {
        "Sr No.": data.srNo,
        Name: data.name,
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

  if (loading) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  if (error) {
    return <div className="text-center mt-5 text-danger">{error}</div>;
  }

  return (
    <div className="mt-5 ms-5">
      <div className="mb-4 d-flex align-items-center">
        <label className="me-2" style={{ fontWeight: 'bold' }}>Select Year:</label>
        <select
          className="form-select w-auto"
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
        >
          {[2024, 2025, 2026, 2027].map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        <button className="btn btn-success ms-3" onClick={handleDownload}>
          Download {selectedYear} Data
        </button>
      </div>

      <table className="table table-bordered table-hover" style={{ border: '2px solid black' }}>
        <thead className="thead-light styled-header">
          <tr style={{ fontWeight: 'bold', color: 'black' }}>
            <th style={{ backgroundColor: 'rgb(201 94 112)' }}>Edit</th>
            <th style={{ backgroundColor: 'rgb(201 94 112)' }}>Sr No.</th>
            <th style={{ backgroundColor: 'rgb(201 94 112)' }}>Name</th>
            <th style={{ backgroundColor: 'rgb(201 94 112)' }}>Room No.</th>
            {months.map(month => (
              <th key={month} style={{ backgroundColor: 'rgb(201 94 112)' }}>{month}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.isArray(formData) && formData.length > 0 ? (
            formData.map((data, index) => (
              <tr key={index} style={{ fontWeight: 'bold', color: 'black' }}>
                <td>
                  <button className="btn" style={{ fontSize: '25px' }}>
                    <FaEdit />
                  </button>
                </td>
                <td>{index + 1}</td>
                <td>
                  <div
                    className="row-item"
                    onClick={() => openModal(data)}
                    style={{ cursor: 'pointer', color: 'black' }}
                  >
                    {data.name}
                  </div>
                </td>
                <td>{data.roomNo}</td>
                {months.map(month => {
                  const matchingRent = data.rents.find(rent => getMonthYear(rent.date) === month);
                  return (
                    <td key={month}>
                      {matchingRent ? (
                        <>
                          <span>{matchingRent.rentAmount}</span>
                          <hr />
                          <span style={{ color: 'green' }}>
                            {new Date(matchingRent.date).toLocaleDateString()}
                          </span>
                        </>
                      ) : (
                        <span>--</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={months.length + 3}>No data available</td>
            </tr>
          )}
        </tbody>
      </table>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Admission Form</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRowData && <FormDownload formData={selectedRowData} />}
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default UpdateData;
