// TenantForm.js
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "./api";

const TenantForm = ({ mode }) => {
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/forms`, formData);
      alert('Form submitted successfully');

      if (mode === 'tenant') {
        navigate('/form-submitted'); // Tenant thank-you page
      } else {
        navigate('/dashboard'); // Admin flow
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting form');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button type="submit">Submit</button>
    </form>
  );
};

export default TenantForm;
