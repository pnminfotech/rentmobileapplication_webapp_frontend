import React, { useMemo, useRef, useState } from "react";
import axios from "axios";
import { API, authHeader } from "../tenantApi";
import { FaFilePdf, FaFileImage, FaDownload, FaEye } from "react-icons/fa";

export default function TenantDocs({ me, onChanged }) {
  const [files, setFiles] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef();

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

  const card = {
    background: "#fff",
    borderRadius: 14,
    boxShadow: "0 8px 30px rgba(16,24,40,.06)",
    padding: 20,
    marginBottom: 20,
  };

  const dropArea = {
    border: "2px dashed #4c7cff",
    padding: 20,
    borderRadius: 10,
    textAlign: "center",
    cursor: "pointer",
    background: "#f9fafb",
    marginBottom: 20,
  };

  const handleFiles = (selectedFiles) => {
    const list = Array.from(selectedFiles || []);
    if (list.some((file) => !isAllowedImageFile(file))) {
      alert("Only JPG, JPEG, and PNG files are allowed.");
      return;
    }

    setFiles((prev) => [...prev, ...list]);
  };

  const onDrop = (e) => {
    e.preventDefault();
    handleFiles(Array.from(e.dataTransfer.files));
  };

  // ✅ Build correct URL (ImageKit or backend served /uploads)
  const getFileUrl = (doc) => {
    if (!doc) return "#";

    const url = String(doc.url || "").trim();
    if (!url) return "#";

    // ImageKit or any absolute link
    if (/^https?:\/\//i.test(url)) return url;

    // relative backend link like "/uploads/docs/xxx.webp"
    // API is usually like "   https://rentmobile-api.pnminfotech.com/api"
    const ORIGIN = String(API).replace(/\/api\/?$/i, "");
    const rel = url.startsWith("/") ? url : `/${url}`;
    return `${ORIGIN}${rel}`;
  };

  const upload = async () => {
    if (!files.length) return;

    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("documents", f));

      // ✅ backend should: upload to ImageKit + save in Mongo tenant.documents[]
      const res = await axios.post(`${API}/tenant/docs`, fd, {
        headers: { ...authHeader(), "Content-Type": "multipart/form-data" },
      });

      // Optional debug
      console.log("UPLOAD RES =>", res.data);

      setFiles([]);
      onChanged && onChanged(); // ✅ must refetch "me" from server
    } catch (err) {
      console.error("Upload failed", err?.response?.data || err.message);
      alert(err?.response?.data?.message || "Upload failed");
    }
  };

  // ✅ ImageKit download: just open url with ik-attachment param
  const handleDownload = (doc) => {
    const url = getFileUrl(doc);
    if (!url || url === "#") {
      alert("No file URL available for download.");
      return;
    }

    setDownloading(true);
    try {
      const finalUrl = `${url}${url.includes("?") ? "&" : "?"}ik-attachment=true`;
      window.open(finalUrl, "_blank", "noopener,noreferrer");
    } finally {
      setTimeout(() => setDownloading(false), 500);
    }
  };

  const getFileIcon = (fileName) => {
    const name = String(fileName || "");
    const ext = name.split(".").pop().toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
      return <FaFileImage color="#f97316" />;
    }
    if (["pdf"].includes(ext)) {
      return <FaFilePdf color="#ef4444" />;
    }
    return <FaFilePdf color="#888" />;
  };

  const filteredDocs = useMemo(() => {
    const q = (search || "").toLowerCase().trim();
    const docs = Array.isArray(me?.documents) ? me.documents : [];
    if (!q) return docs;
    return docs.filter((doc) =>
      String(doc.fileName || "").toLowerCase().includes(q)
    );
  }, [me, search]);

  return (
    <div style={card} className="tdocs-container">
      <style>{`
        .tdocs-container .row { display:flex; gap:10px; flex-wrap:wrap; }
        .tdocs-container .files-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:8px; }
        .tdocs-container .doc-item { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-radius:10px; background:#f9fafb; margin-bottom:8px; gap:10px; }
        .tdocs-container .doc-left { display:flex; align-items:center; gap:10px; min-width:0; }
        .tdocs-container .doc-left span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:inline-block; max-width:52vw; }
        .tdocs-container .doc-actions { display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:flex-end; }

        @media (max-width:1024px){ .tdocs-container .doc-left span{ max-width:42vw; } }
        @media (max-width:640px){
          .tdocs-container .doc-item{ flex-direction:column; align-items:stretch; }
          .tdocs-container .doc-left span{ max-width:100%; }
          .tdocs-container .doc-actions{ justify-content:stretch; }
          .tdocs-container .doc-actions > *{ flex:1 1 auto; justify-content:center; text-align:center; }
          .tdocs-container .drop-area{ padding:16px; }
        }
      `}</style>

      <h5 style={{ marginBottom: 12 }}>📂 Tenant Documents</h5>

      <input
        type="text"
        placeholder="Search documents..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={inputBox}
      />

      <div
        className="drop-area"
        style={dropArea}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
      >
        Drag & drop files here or click to select
      </div>

      <input
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        style={{ display: "none" }}
        ref={fileInputRef}
        onChange={(e) => {
          handleFiles(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />

      {files.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <h6>Files to upload:</h6>
          <ul style={{ listStyle: "none", padding: 0 }} className="files-grid">
            {files.map((f, idx) => (
              <li key={idx} style={filePreview}>
                {getFileIcon(f.name)}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {f.name}
                </span>
              </li>
            ))}
          </ul>
          <div className="row">
            <button onClick={upload} style={btnPri} disabled={!files.length}>
              Upload
            </button>
          </div>
        </div>
      )}

      <div>
        {filteredDocs?.length ? (
          <ul style={{ paddingLeft: 0, listStyle: "none" }}>
            {filteredDocs.map((d, i) => {
              const href = getFileUrl(d);
              return (
                <li key={i} className="doc-item">
                  <div className="doc-left">
                    {getFileIcon(d.fileName)}
                    <span title={d.fileName}>{d.fileName}</span>
                  </div>

                  <div className="doc-actions">
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      style={iconBtn}
                      onClick={(e) => {
                        if (!href || href === "#") {
                          e.preventDefault();
                          alert("No file URL available.");
                        }
                      }}
                    >
                      <FaEye /> View
                    </a>

                    <button
                      onClick={() => handleDownload(d)}
                      style={iconBtn}
                      disabled={downloading}
                    >
                      <FaDownload /> {downloading ? "..." : "Download"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div style={{ color: "#6b7280" }}>No documents uploaded</div>
        )}
      </div>
    </div>
  );
}

const btnPri = {
  padding: "10px 14px",
  border: 0,
  borderRadius: 10,
  background: "#4c7cff",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const inputBox = {
  padding: "10px",
  marginBottom: 10,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  width: "100%",
};

const filePreview = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  borderRadius: 8,
  background: "#f1f5f9",
  border: "1px solid #e5e7eb",
};

const iconBtn = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  border: "none",
  background: "#eef2ff",
  padding: "8px 12px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 14,
  textDecoration: "none",
  color: "#1d4ed8",
  fontWeight: 600,
};
