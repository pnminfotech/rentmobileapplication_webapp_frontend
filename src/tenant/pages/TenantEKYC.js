import React, { useEffect, useState } from "react";
import axios from "axios";
import { API, authHeader } from "../tenantApi";

export default function EKYC() {
  const [ekyc, setEkyc] = useState(null);
  const [aadhaarLast4, setAadhaarLast4] = useState("");
  const [panLast4, setPanLast4] = useState("");
  const [docs, setDocs] = useState([]);
  const [selfie, setSelfie] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchEKYC();
  }, []);

  const fetchEKYC = async () => {
    try {
      const res = await axios.get(`${API}/tenant/ekyc`, { headers: authHeader() });
      setEkyc(res.data);
    } catch {
      setErrorMsg("Failed to load e-KYC status.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!aadhaarLast4 || !panLast4 || !docs.length || !selfie) {
      setErrorMsg("All fields are required.");
      return;
    }

    try {
      setUploading(true);
      setErrorMsg("");
      const formData = new FormData();
      formData.append("aadhaarLast4", aadhaarLast4);
      formData.append("panLast4", panLast4);
      docs.forEach((file) => formData.append("docs", file));
      formData.append("selfie", selfie);

      await axios.post(`${API}/tenant/ekyc`, formData, {
        headers: { ...authHeader(), "Content-Type": "multipart/form-data" }
      });

      alert("e-KYC submitted successfully!");
      fetchEKYC();
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to submit e-KYC.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={container}>
      <h2>e-KYC Verification</h2>

      {ekyc?.status && (
        <div style={statusBox}>
          <b>Status:</b> {ekyc.status.toUpperCase()}
        </div>
      )}

      <form onSubmit={handleSubmit} style={form}>
        <label>Aadhaar Last 4 Digits:</label>
        <input type="text" maxLength={4} value={aadhaarLast4} onChange={(e) => setAadhaarLast4(e.target.value)} />

        <label>PAN Last 4 Digits:</label>
        <input type="text" maxLength={4} value={panLast4} onChange={(e) => setPanLast4(e.target.value)} />

        <label>Upload Documents (PDF/JPG/PNG):</label>
        <input type="file" multiple onChange={(e) => setDocs([...e.target.files])} />

        <label>Upload Selfie:</label>
        <input type="file" onChange={(e) => setSelfie(e.target.files[0])} />

        {errorMsg && <div style={errorStyle}>{errorMsg}</div>}

        <button type="submit" disabled={uploading} style={btnPrimary}>
          {uploading ? "Uploading..." : "Submit e-KYC"}
        </button>
      </form>
    </div>
  );
}

const container = { padding: 20, maxWidth: 600, margin: "auto", background: "#fff", borderRadius: 8 };
const form = { display: "grid", gap: 12 };
const statusBox = { padding: 10, background: "#f1f1f1", borderRadius: 6 };
const errorStyle = { color: "red", fontSize: 13 };
const btnPrimary = { padding: "10px 16px", background: "#4c7cff", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" };





  <form>

 <label for="" >  Name</label>
 <input type="text" /> 

 <label for="lastname"> Last name :</label>
 <input type="text" name="lastname" /> 

 <label>Enter Gender</label>
  <label>Female</label>
 <input type="radio"/>
  <label>male</label>
 <input type="radio"/>
  </form>