// src/Pages/TenantIntake.js
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import "../form.css";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../api";
import { lookupIndianPincode } from "../utils/pincodeLookup";

const API = API_BASE;
const API_ROOT = String(API).replace(/\/+$/, "");
const DATE_FIELDS = new Set(["joiningDate", "dob", "dateOfJoiningCollege"]);

function toDateInputValue(value) {
  if (value == null || value === "") return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeSharedTrackerType(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "room" || raw === "shop" || raw === "bed") return raw;
  return "";
}

function TenantIntake() {
  const [formData, setFormData] = useState({
    srNo: "",
    name: "",
    phoneNo: "",
    address: "",
    pincode: "",
    city: "",
    state: "",
    houseNo: "",
    nearbyPlace: "",
    joiningDate: "",
    dob: "",
    category: "",
    relativeAddress: "",
    companyAddress: "",
    dateOfJoiningCollege: "",
    roomNo: "",
    bedNo: "",
    baseRent: "",
    rentAmount: "",
    depositAmount: "",
    relative1Relation: "Self",
    relative1Name: "",
    relative1Phone: "",
    relative2Relation: "Self",
    relative2Name: "",
    relative2Phone: "",
    familyMembers: "",
    shopName: "",
    shopBusiness: "",
    trackerType: "",
    propertyType: "",
  });

  const [docFiles, setDocFiles] = useState([]);
  const [docMsg, setDocMsg] = useState("");

  const [selfAadharFile, setSelfAadharFile] = useState(null);
  const [parentAadharFile, setParentAadharFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [panCardFile, setPanCardFile] = useState(null);
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [documentActionMenu, setDocumentActionMenu] = useState("");

  const [inviteToken, setInviteToken] = useState(null);
  const [inviteError, setInviteError] = useState("");
  const [formId, setFormId] = useState(null);
  const [lockedFieldMap, setLockedFieldMap] = useState({});
  const [pinLookupStatus, setPinLookupStatus] = useState("idle");

  const [submitting, setSubmitting] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const isTenant = params.get("tenant") === "true";
  const isSharedLink = isTenant || Boolean(params.get("inv"));

  const navigate = useNavigate();

  const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png"]);
  const ALLOWED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

  const isAllowedImageFile = (file) => {
    if (!file) return false;

    const mime = String(file.type || "").toLowerCase();
    const name = String(file.name || "");
    const dotIndex = name.lastIndexOf(".");
    const ext = dotIndex >= 0 ? name.slice(dotIndex).toLowerCase() : "";

    return ALLOWED_IMAGE_MIME_TYPES.has(mime) && ALLOWED_IMAGE_EXTENSIONS.has(ext);
  };

  const handleStrictImageSelection = (file, setter, label) => {
    if (!file) {
      setter(null);
      return false;
    }

    if (!isAllowedImageFile(file)) {
      setter(null);
      setDocMsg(`${label} must be JPG, JPEG, or PNG.`);
      return false;
    }

    setDocMsg("");
    setter(file);
    return true;
  };

  const normalizeDocumentRelation = (value) => {
    const relation = String(value || "").trim().toLowerCase().replace(/[._-]+/g, " ").replace(/\s+/g, " ");
    if (relation === "self" || relation === "aadhaar" || relation === "self aadhaar" || relation === "tenant aadhaar" || relation === "tenant aadhaar card") return "self aadhaar card";
    if (relation.includes("parent") && relation.includes("aadhaar")) return "parent aadhaar card";
    if (relation.includes("partner") && relation.includes("aadhaar")) return "partner aadhaar card";
    if (relation === "tenant photograph" || relation === "tenant photograph (selfie)" || relation === "tenant photo" || relation === "photo") return "tenant photo";
    if (relation === "pan" || relation === "pan card" || relation === "shop pan") return "pan card";
    return relation;
  };

  const getSavedDocument = (relation) =>
    existingDocuments.find((document) =>
      Boolean(document?.url || document?.filePath || document?.fileId) &&
      normalizeDocumentRelation(document?.relation) === normalizeDocumentRelation(relation)
    );

  const selectDocumentFile = (file, { role, relation, label, setter }) => {
    if (!handleStrictImageSelection(file, setter, label)) return;
    setDocFiles((previous) => {
      const withoutCurrentRole = previous.filter((document) => document.role !== role);
      return file ? [...withoutCurrentRole, { file, relation, role }] : withoutCurrentRole;
    });
  };

  const viewSelectedDocument = (file) => {
    const url = URL.createObjectURL(file);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const renderDocumentField = ({ role, label, relation, file, setter, camera = "environment" }) => {
    const saved = getSavedDocument(relation);
    const savedUrl = saved?.url || saved?.filePath || "";
    const additionalFiles = docFiles.filter((document) => document.role?.startsWith(`additional-${role}-`));
    const select = (event) => {
      const selectedFile = event.target.files?.[0] || null;
      event.target.value = "";
      setDocumentActionMenu("");
      if (!selectedFile) return;
      const isAdditionalResidentialDocument = sharedTrackerType === "room" && Boolean(file || saved);
      if (!isAdditionalResidentialDocument) {
        selectDocumentFile(selectedFile, { role, relation, label, setter });
        return;
      }
      if (!isAllowedImageFile(selectedFile)) {
        setDocMsg(`${label} must be JPG, JPEG, or PNG.`);
        return;
      }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setDocMsg("");
      setDocFiles((previous) => [...previous, {
        file: selectedFile,
        role: `additional-${role}-${id}`,
        relation: `Additional ${relation} - ${id}`,
      }]);
    };
    return (
      <div className="tenant-intake-document-field">
        <label>{label}</label>
        {saved && (
          <div className="tenant-intake-saved-document">
            <span>Saved: {saved.fileName || label}</span>
            {savedUrl && <a href={savedUrl} target="_blank" rel="noreferrer">View</a>}
          </div>
        )}
        <button type="button" className="tenant-intake-add-document-button" onClick={() => setDocumentActionMenu((current) => current === role ? "" : role)}>+ Add document</button>
        {documentActionMenu === role && (
          <div className="tenant-intake-document-menu">
            <label className="tenant-intake-upload-button">Upload from device<input type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={select} /></label>
            <label className="tenant-intake-upload-button">Use camera<input type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" capture={camera} onChange={select} /></label>
          </div>
        )}
        {file && <div className="tenant-intake-selected-document"><span>New file: {file.name}</span><div><button type="button" onClick={() => viewSelectedDocument(file)}>View</button><button type="button" onClick={() => { setter(null); setDocFiles((previous) => previous.filter((document) => document.role !== role)); }}>Delete</button></div></div>}
        {additionalFiles.map((document) => (
          <div className="tenant-intake-selected-document" key={document.role}>
            <span>Added: {document.file.name}</span>
            <div><button type="button" onClick={() => viewSelectedDocument(document.file)}>View</button><button type="button" onClick={() => setDocFiles((previous) => previous.filter((item) => item.role !== document.role))}>Delete</button></div>
          </div>
        ))}
      </div>
    );
  };

  const mergeLockedFields = (source, previous = {}) => {
    const next = { ...previous };

    Object.entries(source || {}).forEach(([key, value]) => {
      if (key === "srNo") return;
      if (value === "" || value == null) return;
      next[key] = true;
    });

    return next;
  };

  const normalizeFormDates = (source = {}) => {
    const next = { ...source };
    DATE_FIELDS.forEach((field) => {
      if (!(field in next)) return;
      const normalized = toDateInputValue(next[field]);
      if (normalized) next[field] = normalized;
      else delete next[field];
    });
    return next;
  };

  const tenantEditableFields = new Set([
    "relativeAddress",
    "relative1Relation",
    "relative1Name",
    "relative1Phone",
    "relative2Relation",
    "relative2Name",
    "relative2Phone",
  ]);

  const sharedAdminLockedFields = new Set([
    "category",
    "name",
    "phoneNo",
    "joiningDate",
    "roomNo",
    "bedNo",
    "baseRent",
    "rentAmount",
    "depositAmount",
  ]);

  const isFieldLocked = (name) =>
    !tenantEditableFields.has(name) &&
    ((isSharedLink && sharedAdminLockedFields.has(name)) || Boolean(lockedFieldMap[name]));

  const sharedTrackerType = useMemo(() => {
    const explicit =
      normalizeSharedTrackerType(formData.trackerType) ||
      normalizeSharedTrackerType(formData.propertyType);
    if (explicit) return explicit;

    const bedNo = String(formData.bedNo || "").trim().toUpperCase();
    if (bedNo === "ROOM-1") return "room";
    if (bedNo === "SHOP-1") return "shop";

    if (String(formData.shopName || "").trim() || String(formData.shopBusiness || "").trim()) {
      return "shop";
    }

    if (
      String(formData.familyMembers || "").trim() ||
      String(formData.wingName || "").trim() ||
      String(formData.floorNo || "").trim()
    ) {
      return "room";
    }

    if (
      String(formData.relativeAddress || "").trim() ||
      String(formData.relative1Name || "").trim() ||
      String(formData.relative1Phone || "").trim() ||
      String(formData.relative2Name || "").trim() ||
      String(formData.relative2Phone || "").trim()
    ) {
      return "bed";
    }

    return "bed";
  }, [
    formData.bedNo,
    formData.familyMembers,
    formData.floorNo,
    formData.propertyType,
    formData.relative1Name,
    formData.relative1Phone,
    formData.relative2Name,
    formData.relative2Phone,
    formData.relativeAddress,
    formData.shopBusiness,
    formData.shopName,
    formData.trackerType,
    formData.wingName,
  ]);

  /* ===========================
     Prefill From Query Params
  ============================ */
  useEffect(() => {
    const queryPrefill = {
      ...(params.has("category") ? { category: params.get("category") } : {}),
      ...(params.has("name") ? { name: params.get("name") } : {}),
      ...(params.has("phoneNo")
        ? { phoneNo: params.get("phoneNo").replace(/\D/g, "").slice(0, 10) }
        : {}),
      ...(params.has("address") ? { address: params.get("address") } : {}),
      ...(params.has("pincode") ? { pincode: params.get("pincode") } : {}),
      ...(params.has("city") ? { city: params.get("city") } : {}),
      ...(params.has("state") ? { state: params.get("state") } : {}),
      ...(params.has("houseNo") ? { houseNo: params.get("houseNo") } : {}),
      ...(params.has("nearbyPlace") ? { nearbyPlace: params.get("nearbyPlace") } : {}),
      ...(params.has("relativeAddress") ? { relativeAddress: params.get("relativeAddress") } : {}),
      ...(params.has("relative1Relation") ? { relative1Relation: params.get("relative1Relation") } : {}),
      ...(params.has("relative1Name") ? { relative1Name: params.get("relative1Name") } : {}),
      ...(params.has("relative1Phone") ? { relative1Phone: params.get("relative1Phone") } : {}),
      ...(params.has("relative2Relation") ? { relative2Relation: params.get("relative2Relation") } : {}),
      ...(params.has("relative2Name") ? { relative2Name: params.get("relative2Name") } : {}),
      ...(params.has("relative2Phone") ? { relative2Phone: params.get("relative2Phone") } : {}),
      ...(params.has("companyAddress") ? { companyAddress: params.get("companyAddress") } : {}),
      ...(params.has("dateOfJoiningCollege")
        ? { dateOfJoiningCollege: params.get("dateOfJoiningCollege") }
        : {}),
      ...(params.has("dob") ? { dob: params.get("dob") } : {}),
      ...(params.has("roomNo") ? { roomNo: params.get("roomNo") } : {}),
      ...(params.has("bedNo") ? { bedNo: params.get("bedNo") } : {}),
      ...(params.has("baseRent") ? { baseRent: params.get("baseRent") } : {}),
      ...(params.has("rentAmount") ? { rentAmount: params.get("rentAmount") } : {}),
      ...(params.has("depositAmount") ? { depositAmount: params.get("depositAmount") } : {}),
      ...(params.has("joiningDate") ? { joiningDate: params.get("joiningDate") } : {}),
      ...(params.has("familyMembers") ? { familyMembers: params.get("familyMembers") } : {}),
      ...(params.has("shopName") ? { shopName: params.get("shopName") } : {}),
      ...(params.has("shopBusiness") ? { shopBusiness: params.get("shopBusiness") } : {}),
      ...(params.has("trackerType") ? { trackerType: params.get("trackerType") } : {}),
      ...(params.has("propertyType") ? { propertyType: params.get("propertyType") } : {}),
    };

    setFormData((prev) => ({ ...prev, ...queryPrefill }));
    setLockedFieldMap((prev) => mergeLockedFields(queryPrefill, prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===========================
     Pincode Lookup (City/State/Nearby Place)
  ============================ */
  useEffect(() => {
    const pin = String(formData?.pincode || "").trim();
    if (!/^\d{6}$/.test(pin)) {
      setPinLookupStatus("idle");
      return;
    }

    const controller = new AbortController();
    setPinLookupStatus("loading");
    const timer = window.setTimeout(async () => {
      try {
        const details = await lookupIndianPincode(pin, controller.signal);
        if (controller.signal.aborted) return;
        setFormData((prev) => String(prev.pincode || "").trim() === pin
          ? {
              ...prev,
              city: prev.city || details.city,
              state: prev.state || details.state,
              nearbyPlace: prev.nearbyPlace || details.nearbyPlace,
            }
          : prev);
        setPinLookupStatus("success");
      } catch {
        if (!controller.signal.aborted) setPinLookupStatus("error");
      }
    }, 350);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [formData?.pincode]);

  /* ===========================
     Optional: formId from URL
  ============================ */
  useEffect(() => {
    const fid = params.get("formId");
    if (fid) setFormId(fid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===========================
     Invite Link Validation
     ✅ pulls formId + srNo + prefill
  ============================ */
  useEffect(() => {
    const token = params.get("inv")?.trim().replace(/\/+$/, "");
    if (!token) return;

    setInviteToken(token);

    (async () => {
      try {
        const r = await axios.get(`${API_ROOT}/invites/${token}`);

        const fid = r.data?.formId || r.data?.form?._id;
        if (fid) setFormId(String(fid));

        // Prefill from invite
        if (r.data?.ok && r.data.prefill) {
          const pre = normalizeFormDates({ ...r.data.prefill });
          if (pre.category == null) delete pre.category; // prevent null overwrite

          setFormData((prev) => ({
            ...prev,
            ...pre,
          }));
          setLockedFieldMap((prev) => mergeLockedFields(pre, prev));
        }
        setExistingDocuments(Array.isArray(r.data?.existingDocuments) ? r.data.existingDocuments : []);

        // If backend sends existing form data too (optional)
        if (r.data?.form) {
          const existing = normalizeFormDates({ ...r.data.form });
          delete existing._id;
          delete existing.__v;

          setFormData((prev) => ({
            ...prev,
            ...existing,
          }));
        }

      } catch (err) {
        const code = err?.response?.status;
        if (code === 409) setInviteError("This link has already been used.");
        else if (code === 410) setInviteError("This link has expired.");
        else if (code === 404) setInviteError("Invalid invite link.");
        else setInviteError("Could not validate invite link.");

        console.warn("Invite validation failed.", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===========================
     (Optional) SR No preview for admin-only pages
     Tenant links should already have srNo from invite.
  ============================ */
  const fetchSrNo = async () => {
    try {
      const res = await axios.get(`${API_ROOT}/forms/count`);
      setFormData((prev) => ({ ...prev, srNo: res.data.nextSrNo }));
      return res.data.nextSrNo;
    } catch (err) {
      console.error("Error fetching Sr No:", err);
      return "";
    }
  };

  useEffect(() => {
    // Only fetch srNo preview when NOT tenant link
    if (!params.get("inv")) fetchSrNo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===========================
     Input Handlers
  ============================ */
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (isFieldLocked(name)) {
      return;
    }

    if (name === "phoneNo" || name === "relative1Phone" || name === "relative2Phone") {
      const onlyDigits = value.replace(/\D/g, "").slice(0, 10);
      setFormData((prev) => ({ ...prev, [name]: onlyDigits }));
      return;
    }

    if (name === "pincode") {
      const pincode = value.replace(/\D/g, "").slice(0, 6);
      setFormData((prev) => ({
        ...prev,
        pincode,
        city: isFieldLocked("city") ? prev.city : "",
        state: isFieldLocked("state") ? prev.state : "",
        nearbyPlace: isFieldLocked("nearbyPlace") ? prev.nearbyPlace : "",
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRentAmountChange = (e) => {
    if (isFieldLocked("rentAmount")) return;
    const v = e.target.value;
    if (v === "" || /^\d+(\.\d{0,2})?$/.test(v)) {
      setFormData((prev) => ({ ...prev, rentAmount: v }));
    }
  };

  /* ===========================
     Remove Doc
  ============================ */
  const removeDoc = (idx) => setDocFiles((prev) => prev.filter((_, i) => i !== idx));

  /* ===========================
     Sanitize Payload
  ============================ */
  function sanitizeTenantPayload(obj) {
    const out = {};

    for (const [k, v] of Object.entries(obj || {})) {
      if (v === "" || v == null) continue;

      if (/(amount|price|rent|deposit|srNo)$/i.test(k)) {
        const n = Number(String(v).replace(/[,₹\s]/g, ""));
        if (Number.isFinite(n)) out[k] = n;
        continue;
      }

      if (/(date|dob|joining)/i.test(k)) {
        out[k] = v;
        continue;
      }

      out[k] = v;
    }

    return out;
  }

  /* ===========================
     Upload Docs
  ============================ */
  async function prepareDocumentForUpload(file) {
    const maxRequestFileSize = 700 * 1024;
    if (file.size <= maxRequestFileSize) return file;

    const imageUrl = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = imageUrl;
      await image.decode();

      for (const maxSide of [1800, 1500, 1200]) {
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");
        if (!context) break;
        context.fillStyle = "#fff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        for (const quality of [0.88, 0.78, 0.68]) {
          const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
          if (blob && blob.size <= maxRequestFileSize) {
            return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
          }
        }
      }
    } finally {
      URL.revokeObjectURL(imageUrl);
    }

    throw new Error(`${file.name} is too large to upload. Please choose a smaller image.`);
  }

  async function uploadDocsIfAny(docs) {
    if (!docs.length) return [];

    const uploadedDocuments = [];
    for (const doc of docs) {
      const file = await prepareDocumentForUpload(doc.file);
      const fd = new FormData();
      fd.append("documents", file);
      fd.append("source", "tenant-intake");
      fd.append("inviteToken", inviteToken);

      const response = await axios.post(`${API_ROOT}/uploads/docs`, fd, {
        headers: { "X-Invite-Token": inviteToken },
      });
      const uploaded = response.data?.files?.[0];
      const url = uploaded?.url || uploaded?.path || uploaded?.location || uploaded?.secure_url;
      if (!url) throw new Error(`Upload failed for ${doc.file.name}. Please try again.`);
      uploadedDocuments.push({
        fileName: doc.file.name,
        relation: doc.relation || "Self",
        url,
      });
    }
    return uploadedDocuments;
  }

  /* ===========================
     SUBMIT FORM
  ============================ */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return;
    setSubmitting(true);

    try {
    if (!inviteToken) {
      alert("Invite token missing. Please open the original invite link.");
      return;
    }

      if (!formId) {
        alert("formId missing. Admin invite must create & link a draft form.");
        return;
      }

      let resolvedRentAmount = String(formData.rentAmount ?? "").trim();
      if (!resolvedRentAmount && String(formData.baseRent ?? "").trim()) {
        resolvedRentAmount = String(formData.baseRent).trim();
      }


      const requiredFields = [
        ...(!isTenant ? [["category", "Category"]] : []),
        ["name", "Name"],
        ["phoneNo", "Phone No"],
        ["address", "Address"],
        ["joiningDate", "Joining Date"],
        ["roomNo", "Room No"],
        ["depositAmount", "Deposit Amount"],
        ...(sharedTrackerType === "bed"
          ? [
              ["relativeAddress", "Relative Address"],
              ["relative1Relation", "Relative 1 Relation"],
              ["relative1Name", "Relative 1 Name"],
              ["relative1Phone", "Relative 1 Phone"],
              ["relative2Relation", "Relative 2 Relation"],
              ["relative2Name", "Relative 2 Name"],
              ["relative2Phone", "Relative 2 Phone"],
              ["companyAddress", "Company / College"],
              ["dateOfJoiningCollege", "Date of Joining College/Office"],
              ["bedNo", "Bed No"],
            ]
          : []),
        ...(sharedTrackerType === "room"
          ? [
              ["companyAddress", "Company / College"],
              ["dateOfJoiningCollege", "Date of Joining College/Office"],
            ]
          : []),
      ];

      for (const [key, label] of requiredFields) {
        if (!String(formData[key] ?? "").trim()) {
          return alert(`${label} is required`);
        }
      }

      if (!String(resolvedRentAmount || "").trim()) {
        return alert("Rent Amount is required");
      }

      if (!isFieldLocked("phoneNo") && formData.phoneNo && !/^\d{10}$/.test(formData.phoneNo))
        return alert("Enter valid 10-digit phone number.");

      if (!isFieldLocked("relative1Phone") && formData.relative1Phone && !/^\d{10}$/.test(formData.relative1Phone))
        return alert("Relative 1 phone must be 10 digits.");

      if (!isFieldLocked("relative2Phone") && formData.relative2Phone && !/^\d{10}$/.test(formData.relative2Phone))
        return alert("Relative 2 phone must be 10 digits.");

      if (
        (selfAadharFile && !isAllowedImageFile(selfAadharFile)) ||
        (parentAadharFile && !isAllowedImageFile(parentAadharFile)) ||
        (photoFile && !isAllowedImageFile(photoFile)) ||
        (panCardFile && !isAllowedImageFile(panCardFile))
      ) {
        setDocMsg("Only JPG, JPEG, and PNG files are allowed.");
        return;
      }

      // Show exactly which required document is still missing. Saved documents
      // from the original tenant record count the same as a newly selected file.
      const hasSaved = (relation) => Boolean(getSavedDocument(relation));
      const partnerOrParentRelation = sharedTrackerType === "room" ? "Partner Aadhaar Card" : "Parent Aadhaar Card";
      const requiredDocuments = sharedTrackerType === "shop"
        ? [
            { label: "Self Aadhaar Card", file: selfAadharFile, relation: "Self Aadhaar Card" },
            { label: "Tenant Photograph (Selfie)", file: photoFile, relation: "Tenant Photo" },
            { label: "PAN Card", file: panCardFile, relation: "PAN Card" },
          ]
        : [
            { label: "Self Aadhaar Card", file: selfAadharFile, relation: "Self Aadhaar Card" },
            { label: sharedTrackerType === "room" ? "Partner Aadhaar Card" : "Parent Aadhaar Card", file: parentAadharFile, relation: partnerOrParentRelation },
            { label: "Tenant Photograph (Selfie)", file: photoFile, relation: "Tenant Photo" },
          ];
      const missingDocuments = requiredDocuments
        .filter((document) => !document.file && !hasSaved(document.relation))
        .map((document) => document.label);
      if (missingDocuments.length) {
        setDocMsg(`Please upload: ${missingDocuments.join(", ")}.`);
        return;
      } else {
        setDocMsg("");
      }

      const documents = await uploadDocsIfAny([...docFiles]);

      const raw = {
        ...formData,
        rentAmount: resolvedRentAmount,
        documents,
        source: "public-intake",
        status: "pending_review",
        inviteToken,
        trackerType: sharedTrackerType,
      };
      if (sharedTrackerType === "bed" && String(formData.relativeAddress || "").trim()) {
        raw.relativeAddress1 = formData.relativeAddress;
      }
      delete raw.relativeAddress;
      if (sharedTrackerType !== "bed") {
        delete raw.relative1Relation;
        delete raw.relative1Name;
        delete raw.relative1Phone;
        delete raw.relative2Relation;
        delete raw.relative2Name;
        delete raw.relative2Phone;
        delete raw.relativeAddress1;
      }
      if (sharedTrackerType === "shop") {
        delete raw.companyAddress;
        delete raw.dateOfJoiningCollege;
        delete raw.familyMembers;
        delete raw.bedNo;
      }
      if (sharedTrackerType === "room") {
        delete raw.shopName;
        delete raw.shopBusiness;
      }

      const payload = sanitizeTenantPayload(raw);

      console.log("SUBMIT PAYLOAD =>", {
        formId,
        category: payload.category,
        roomNo: payload.roomNo,
        bedNo: payload.bedNo,
      });
const submitRes = await axios.put(`${API_ROOT}/invites/${inviteToken}/submit`, payload);

      const admissionStatus = submitRes?.data?.messageStatus;
      const notices = [];
      if (admissionStatus?.ok) notices.push("Admission SMS sent.");
      else if (admissionStatus?.reason) notices.push(`Admission SMS not sent: ${admissionStatus.reason}`);

      if (notices.length) {
        alert(notices.join("\n"));
      }


      if (isTenant) navigate("/form-submitted");
      else navigate("/add-data");
    } catch (error) {
      console.error("Error submitting form:", error);

      console.log("FAILED URL =>", error?.config?.url);
      console.log("STATUS =>", error?.response?.status);
      console.log("RESP =>", error?.response?.data);
      console.log("RESP JSON =>", JSON.stringify(error?.response?.data, null, 2));
      console.log("formId =>", formId);

      alert(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error.message ||
          "Failed to submit"
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ===========================
     RENDER UI
  ============================ */
  return (
    <>
      <h2>Tenant Form</h2>

      {inviteError && (
        <div className="alert alert-danger" role="alert">
          {inviteError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-container">
        {/* Sr No */}
        <div className="form-group">
          <label>Sr No.</label>
          <input type="text" value={formData.srNo} readOnly className="form-input" />
        </div>

        {/* NAME */}
      <div className="form-group">
        <label>Name</label>
        <input
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="form-input"
          readOnly={isFieldLocked("name")}
          placeholder="Enter tenant name"
          required
        />
      </div>

        {/* PHONE */}
        <div className="form-group">
          <label>Phone No</label>
        <input
          name="phoneNo"
          value={formData.phoneNo}
          onChange={handleChange}
          className="form-input"
          readOnly={isFieldLocked("phoneNo")}
          placeholder="10-digit number"
          required
        />
      </div>

        {/* ADDRESS */}
        <div className="form-group">
          <label>Pincode</label>
        <input
          name="pincode"
          inputMode="numeric"
          maxLength={6}
          value={formData.pincode}
          onChange={handleChange}
          className="form-input"
          readOnly={isFieldLocked("pincode")}
          placeholder="6-digit pincode"
        />
        {pinLookupStatus === "loading" && <small>Finding city and location...</small>}
        {pinLookupStatus === "error" && <small>PIN code not found. Enter city and nearby place manually.</small>}
      </div>
        <div className="form-group">
          <label>City</label>
          <input
            name="city"
            value={formData.city}
            onChange={handleChange}
            className="form-input"
            readOnly={isFieldLocked("city")}
          />
        </div>
        <div className="form-group">
          <label>State</label>
          <input
            name="state"
            value={formData.state}
            onChange={handleChange}
            className="form-input"
            readOnly={isFieldLocked("state")}
          />
        </div>
        <div className="form-group">
          <label>Local Address</label>
          <input
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="form-input"
            readOnly={isFieldLocked("address")}
            placeholder="House, Street, Area"
            required
          />
        </div>
        <div className="form-group">
          <label>House No</label>
          <input
            name="houseNo"
            value={formData.houseNo}
            onChange={handleChange}
            className="form-input"
            readOnly={isFieldLocked("houseNo")}
          />
        </div>
        <div className="form-group">
          <label>Nearby Place</label>
          <input
            name="nearbyPlace"
            value={formData.nearbyPlace}
            onChange={handleChange}
            className="form-input"
            readOnly={isFieldLocked("nearbyPlace")}
          />
        </div>

        {/* JOINING */}
        <div className="form-group">
          <label>Joining Date</label>
          <input
            type="date"
            name="joiningDate"
            value={formData.joiningDate}
            onChange={handleChange}
            className="form-input"
            readOnly={isFieldLocked("joiningDate")}
            required
          />
        </div>

        {/* DOB */}
        {sharedTrackerType !== "shop" && (
          <div className="form-group">
            <label>DOB</label>
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              className="form-input"
              readOnly={isFieldLocked("dob")}
              required
            />
          </div>
        )}

        {sharedTrackerType === "bed" && (
          <>
            <div className="form-group">
              <label>Relative Address</label>
              <input
                name="relativeAddress"
                value={formData.relativeAddress}
                onChange={handleChange}
                className="form-input"
                readOnly={isFieldLocked("relativeAddress")}
                required
              />
            </div>

            <fieldset className="form-group">
              <legend>Relative 1</legend>
              <select
                name="relative1Relation"
                value={formData.relative1Relation}
                onChange={handleChange}
                className="form-input"
                required
              >
                {["Self", "Sister", "Brother", "Father", "Husband", "Mother"].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
              <input
                name="relative1Name"
                value={formData.relative1Name}
                onChange={handleChange}
                className="form-input"
                readOnly={isFieldLocked("relative1Name")}
                placeholder="Name"
                required
              />
              <input
                name="relative1Phone"
                value={formData.relative1Phone}
                onChange={handleChange}
                className="form-input"
                readOnly={isFieldLocked("relative1Phone")}
                placeholder="10 digit"
                required
              />
            </fieldset>

            <fieldset className="form-group">
              <legend>Relative 2</legend>
              <select
                name="relative2Relation"
                value={formData.relative2Relation}
                onChange={handleChange}
                className="form-input"
                required
              >
                {["Self", "Sister", "Brother", "Father", "Husband", "Mother"].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
              <input
                name="relative2Name"
                value={formData.relative2Name}
                onChange={handleChange}
                className="form-input"
                readOnly={isFieldLocked("relative2Name")}
                placeholder="Name"
                required
              />
              <input
                name="relative2Phone"
                value={formData.relative2Phone}
                onChange={handleChange}
                className="form-input"
                readOnly={isFieldLocked("relative2Phone")}
                placeholder="10 digit"
                required
              />
            </fieldset>
          </>
        )}

        {sharedTrackerType === "shop" && (
          <div className="form-group">
            <label>Shop Name</label>
            <input
              name="shopName"
              value={formData.shopName}
              onChange={handleChange}
              className="form-input"
              readOnly={isFieldLocked("shopName")}
              placeholder="Enter shop name"
            />
          </div>
        )}

        {sharedTrackerType !== "shop" && (
          <>
            <div className="form-group">
              <label>Company Address / College</label>
              <input
                name="companyAddress"
                value={formData.companyAddress}
                onChange={handleChange}
                className="form-input"
                readOnly={isFieldLocked("companyAddress")}
                required={sharedTrackerType !== "shop"}
              />
            </div>

            <div className="form-group">
              <label>Date of Joining College / Company</label>
              <input
                type="date"
                name="dateOfJoiningCollege"
                value={formData.dateOfJoiningCollege}
                onChange={handleChange}
                className="form-input"
                readOnly={isFieldLocked("dateOfJoiningCollege")}
                required={sharedTrackerType !== "shop"}
              />
            </div>
          </>
        )}

        {/* Category (Admin only) */}
        {!isTenant && (
          <div className="form-group">
            <label>Category</label>
            <input
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="form-input"
              readOnly={isFieldLocked("category")}
              required
            />
          </div>
        )}

        {/* ROOM */}
        <div className="form-group">
          <label>{sharedTrackerType === "shop" ? "Shop" : "Room No"}</label>
          <input
            name="roomNo"
            value={formData.roomNo}
            onChange={handleChange}
            className="form-input"
            readOnly={isFieldLocked("roomNo")}
            required
          />
        </div>

        {sharedTrackerType === "bed" && (
          <div className="form-group">
            <label>Bed No</label>
            <input
              name="bedNo"
              value={formData.bedNo}
              onChange={handleChange}
              className="form-input"
              readOnly={isFieldLocked("bedNo")}
              required
            />
          </div>
        )}

        {/* RENT */}
        <div className="form-group">
          <label>{sharedTrackerType === "shop" ? "Shop Price (Monthly Rent)" : "Rent Amount"}</label>
          <input
            name="rentAmount"
            value={formData.rentAmount}
            onChange={handleRentAmountChange}
            className="form-input"
            readOnly={isFieldLocked("rentAmount")}
            required
          />
        </div>

        {/* DEPOSIT */}
        <div className="form-group">
          <label>Deposit Amount</label>
          <input
            name="depositAmount"
            value={formData.depositAmount}
            onChange={(e) => {
              if (isFieldLocked("depositAmount")) return;
              const v = e.target.value;
              if (v === "" || /^\d+(\.\d{0,2})?$/.test(v)) {
                setFormData((prev) => ({ ...prev, depositAmount: v }));
              }
            }}
            className="form-input"
            readOnly={isFieldLocked("depositAmount")}
            required
          />
        </div>

        {sharedTrackerType === "shop" && (
          <div className="form-group">
            <label>What are you selling/doing in shop</label>
            <input
              name="shopBusiness"
              value={formData.shopBusiness}
              onChange={handleChange}
              className="form-input"
              readOnly={isFieldLocked("shopBusiness")}
              placeholder="Example: Grocery, mobile repair, salon, tailoring..."
            />
          </div>
        )}

        {sharedTrackerType === "room" && (
          <div className="form-group">
            <label>No. of Family Members</label>
            <input
              type="number"
              min="0"
              name="familyMembers"
              value={formData.familyMembers}
              onChange={handleChange}
              className="form-input"
              readOnly={isFieldLocked("familyMembers")}
            />
          </div>
        )}

        {/* DOCUMENT UPLOADS */}
        <div className="form-group">
          <label>Upload Documents</label>
          <small className="text-muted d-block mb-2">Only JPG, JPEG, and PNG files are accepted.</small>

          {renderDocumentField({ role: "selfAadhar", label: "Self Aadhaar Card", relation: "Self Aadhaar Card", file: selfAadharFile, setter: setSelfAadharFile })}

          {sharedTrackerType !== "shop" && (
            renderDocumentField({
              role: "parentAadhar",
              label: sharedTrackerType === "room" ? "Partner Aadhaar Card" : "Parent Aadhaar Card",
              relation: sharedTrackerType === "room" ? "Partner Aadhaar Card" : "Parent Aadhaar Card",
              file: parentAadharFile,
              setter: setParentAadharFile,
            })
          )}

          {renderDocumentField({ role: "photo", label: "Tenant Photograph (Selfie)", relation: "Tenant Photo", file: photoFile, setter: setPhotoFile, camera: "user" })}

          {sharedTrackerType === "shop" && (
            renderDocumentField({ role: "panCard", label: "PAN Card", relation: "PAN Card", file: panCardFile, setter: setPanCardFile })
          )}

          {docMsg && <small className="text-danger mt-1 d-block">{docMsg}</small>}
        </div>

        {/* ACTION BUTTONS */}
        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit"}
        </button>

        {!isTenant && (
          <button type="button" className="back-btn" onClick={() => navigate("/mainpage")}>
            Back
          </button>
        )}
      </form>
    </>
  );
}

export default TenantIntake;
