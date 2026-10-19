import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const DuplicateForms = () => {
  const [duplicateForms, setDuplicateForms] = useState([]); // Initialize as an empty array
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

const navigate = useNavigate();
const handleNavigation =(path)=>{
  navigate(path);
}

  useEffect(() => {
    const fetchDuplicateForms = async () => {
      try {
        const response = await axios.get('    https://rentmobile-api.pnminfotech.com/api/duplicateforms');
        setDuplicateForms(response.data || []); // Fallback to an empty array if response.data is undefined
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDuplicateForms();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h1>Duplicate Forms</h1>
      <table border="1">
        <thead>
          <tr>
            <th>Sr. No.</th>
            <th>Name</th>
            <th>Joining Date</th>
            <th>Room No.</th>
            <th>Deposit Amount</th>
            <th>Rents</th>
            <th>Deleted At</th>
          </tr>
        </thead>
        <tbody>
          {duplicateForms && duplicateForms.length > 0 ? (
            duplicateForms.map((form) => (
              <tr key={form._id}>
                <td>{form.formData?.srNo || 'N/A'}</td>
                <td>{form.formData?.name || 'N/A'}</td>
                <td>
                  {form.formData?.joiningDate
                    ? new Date(form.formData.joiningDate).toLocaleDateString()
                    : 'N/A'}
                </td>
                <td>{form.formData?.roomNo || 'N/A'}</td>
                <td>{form.formData?.depositAmount || 'N/A'}</td>
                <td>
                  {form.formData?.rents?.length > 0
                    ? form.formData.rents.map((rent, index) => (
                        <div key={index}>
                          <strong>Amount:</strong> {rent.rentAmount || 'N/A'},{' '}
                          <strong>Date:</strong>{' '}
                          {rent.date ? new Date(rent.date).toLocaleDateString() : 'N/A'}
                        </div>
                      ))
                    : 'No Rents'}
                </td>
                <td>
                  {form.deletedAt ? new Date(form.deletedAt).toLocaleDateString() : 'N/A'}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7">No duplicate forms found</td>
            </tr>
          )}
        </tbody>
      </table>
      <button className='btn-primary' onClick={()=>handleNavigation('/mainpage')}>
        Back
      </button>
    </div>
  );
};

export default DuplicateForms;
