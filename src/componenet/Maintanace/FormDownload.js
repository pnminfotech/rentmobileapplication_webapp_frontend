// import React from "react";
// import jsPDF from "jspdf";
// import html2canvas from "html2canvas";
// import "../Maintanace/FormDownload.css";
// import Img from "../../image/mutkehostel.png";
// import RuleImg from "../../assets/rulebook.jpg";

// const FormDownload = ({ formData }) => {
//   const handleDownload = async () => {
//     const formPage = document.getElementById("form-page");
//     const rulePage = document.getElementById("rule-page");

//     const pdf = new jsPDF("p", "mm", "a4");
//     const pdfWidth = pdf.internal.pageSize.getWidth();

//     // --- Page 1: Admission form
//     const canvas1 = await html2canvas(formPage, { scale: 2 });
//     const imgData1 = canvas1.toDataURL("image/png");
//     const imgHeight1 = (canvas1.height * pdfWidth) / canvas1.width;
//     pdf.addImage(imgData1, "PNG", 0, 0, pdfWidth, imgHeight1);

//     // --- Page 2: Rules page
//     const canvas2 = await html2canvas(rulePage, { scale: 2 });
//     const imgData2 = canvas2.toDataURL("image/png");
//     const imgHeight2 = (canvas2.height * pdfWidth) / canvas2.width;
//     pdf.addPage();
//     pdf.addImage(imgData2, "PNG", 0, 0, pdfWidth, imgHeight2);

//     pdf.save("Admission_Form.pdf");
//   };

//   // ---- Helpers to resolve Relative Address 1 / 2 from various sources ----
//   const formatRelative = (r) => {
//     if (!r) return "";
//     const relation = r.relation && String(r.relation).trim();
//     const name = r.name && String(r.name).trim();
//     const phone = r.phone && String(r.phone).trim();

//     if (relation && name && phone) return `${relation}: ${name} (${phone})`;
//     if (relation && name) return `${relation}: ${name}`;
//     if (name && phone) return `${name} (${phone})`;
//     return [relation, name, phone].filter(Boolean).join(" ");
//   };

//   // Preferred new structure: relatives[]
//   const rel0FromArray = Array.isArray(formData?.relatives) ? formData.relatives[0] : null;
//   const rel1FromArray = Array.isArray(formData?.relatives) ? formData.relatives[1] : null;

//   // Your current payload fields (fallback if relatives[] not present)
//   const rel1FromFields = {
//     relation: formData?.relative1Relation,
//     name: formData?.relative1Name,
//     phone: formData?.relative1Phone,
//   };
//   const rel2FromFields = {
//     relation: formData?.relative2Relation,
//     name: formData?.relative2Name,
//     phone: formData?.relative2Phone,
//   };

//   // Build the two lines with a clear priority:
//   // 1) explicit relativeAddress1/2
//   // 2) relatives[0]/relatives[1]
//   // 3) individual fields relative1*/relative2*
//   // 4) single relativeAddress (for line 1 only)
//   // 5) underscores fallback
//   const relativeAddressLine1 =
//     formData?.relativeAddress1 ||
//     formatRelative(rel0FromArray) ||
//     formatRelative(rel1FromFields) ||
//     formData?.relativeAddress ||
//     "______________________________";

//   const relativeAddressLine2 =
//     formData?.relativeAddress2 ||
//     formatRelative(rel1FromArray) ||
//     formatRelative(rel2FromFields) ||
//     "_______________________________";

//   return (
//     <div>
//       {/* PAGE 1 - Form */}
//       <div id="form-page" className="form-container">
//         {/* Header */}
//         <header className="form-header">
//           <img src={Img} alt="Logo" className="form-logo" />
//           <div className="form-title">
//             <div className="form-no">
//               <span>Form No:</span>
//               <div className="form-box"></div>
//             </div>
//             <p
//               style={{
//                 marginLeft: "-118px",
//                 marginTop: "4px",
//                 fontSize: "12px",
//               }}
//             >
//               New Admission Form
//             </p>
//           </div>
//           <div className="form-photo-box"></div>
//         </header>

//         {/* Body */}
//         <div className="form-body">
//           <p>
//             <strong>Name Of Occupant:</strong>{" "}
//             {formData?.name || "_______________________________"}
//           </p>
//           <p>
//             <strong>Address:</strong>{" "}
//             {formData?.address || "_______________________________"}
//           </p>

//           {/* Relative Address 1 / 2 – supports old fields, new relatives[], and individual fields */}
//           <p>
//             <strong>
//               Address Of Relative:
//               <br />
//               1)
//             </strong>{" "}
//             {relativeAddressLine1} <br />
//             <strong>2)</strong> {relativeAddressLine2}
//           </p>

//           <p>
//             <strong>Hostel Joining Date:</strong>{" "}
//             {formData?.joiningDate
//               ? new Date(formData.joiningDate).toLocaleDateString()
//               : "______________________________"}
//           </p>
//           <p>
//             <strong>Flat No:</strong> {formData?.roomNo || "_________"} &nbsp;
//             &nbsp; &nbsp;
//             <strong>Floor No:</strong> {formData?.floorNo || "_________"} &nbsp;
//             &nbsp; &nbsp;
//             <strong>Bed No:</strong> {formData?.bedNo || "_________"}
//           </p>
//           <hr />
//           <p>
//             <strong>
//               Name & Address of Company/College/Institute/Other:
//             </strong>
//             <br /> {formData?.companyAddress || "________________________________"}
//           </p>
//           <p>
//             <strong>Date Of Joining:</strong>{" "}
//             {formData?.joiningDate
//               ? new Date(formData.joiningDate).toLocaleDateString()
//               : "______________________________"}{" "}
//             &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
//             <strong>Date Of Birth:</strong>{" "}
//             {formData?.dob
//               ? new Date(formData.dob).toLocaleDateString()
//               : "______________________________"}{" "}
//           </p>
//           <p>
//             <strong>
//               Has Occupant Givin Rules & Regulation Copy To Read & Understand:
//             </strong>{" "}
//             {formData?.rulesProvided || "Yes/No"}
//           </p>
//         </div>

//         {/* Footer */}
//         <footer className="form-footer">
//           <div className="signature" style={{ fontSize: "10px" }}>
//             <p>Sign of Warden:</p>
//             <span>_____</span>
//           </div>
//           <div className="signature" style={{ fontSize: "10px" }}>
//             <p>Sign of Occupant:</p>
//             <span>_____</span>
//           </div>
//           <div className="signature" style={{ fontSize: "10px" }}>
//             <p>Sign of Guardian:</p>
//             <span>_____</span>
//           </div>
//         </footer>

//         <h6>Regards MUTKE HOSTEL</h6>
//       </div>

//       {/* PAGE 2 - Rules */}
//       <div id="rule-page" className="form-container">
//         <img src={RuleImg} alt="rules" style={{ width: "100%" }} />
//       </div>

//       {/* Download Button */}
//       <button onClick={handleDownload} className="download-button">
//         Download as PDF
//       </button>
//     </div>
//   );
// };

// export default FormDownload;
import React, { useCallback, useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "../Maintanace/FormDownload.css";
import Img from "../../image/kplogo.png";
import { api } from "../../api";

const FormDownload = ({ formData }) => {
  const [roomMeta, setRoomMeta] = useState({
    category: "",
    floorNo: "",
    bedNo: "",
    bedRent: "",
  });

  const [tenantDoc, setTenantDoc] = useState(null);
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [documentDataUrls, setDocumentDataUrls] = useState({});
  const [previewImage, setPreviewImage] = useState(null);
  const [previewRotation, setPreviewRotation] = useState(0);
  const [hostelRules, setHostelRules] = useState({
    title: "Hostel Rules & Regulations",
    content: "",
  });

  // ---------------- Helpers ----------------
  const safe = (v) =>
    v === null || v === undefined || String(v).trim() === ""
      ? ""
      : String(v).trim();

  const safeText = (v, fallback = "_______________________________") =>
    safe(v) ? safe(v) : fallback;

  const safeDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "______________________________";

  const fmtINR = (n) =>
    n != null && n !== "" && !Number.isNaN(Number(n))
      ? `₹${Number(n).toLocaleString("en-IN")}`
      : "—";

  const norm = (v) => String(v ?? "").toLowerCase().replace(/\s|_|-/g, "");
  const digits = (v) => {
    const m = String(v ?? "").match(/\d+/g);
    return m ? m.join("") : "";
  };

  const isBadBed = (v) => {
    const s = String(v ?? "").trim();
    return !s || s === "." || s === ".." || s === "-" || s === "—";
  };

  const pickRentFromBed = (b) => {
    const candidates = [
      b?.price,
      b?.rentAmount,
      b?.rent,
      b?.bedRent,
      b?.amount,
      b?.baseRent,
      b?.monthlyRent,
    ];
    const val = candidates.find(
      (x) => x != null && x !== "" && !Number.isNaN(Number(x))
    );
    return val != null ? Number(val) : "";
  };

  // Prefer fetched doc if available
  const data = tenantDoc || formData;

  const rulePages = useMemo(() => {
    const rules = String(hostelRules.content || "")
      .split(/\r?\n/)
      .map((rule) => rule.trim())
      .filter(Boolean);
    if (!rules.length) return [[]];

    const pages = [];
    let current = [];
    let usedLines = 0;
    rules.forEach((rule) => {
      // Keep enough rules on each A4 page. The rendered list then distributes
      // its entries over the available height rather than leaving a blank block.
      const estimatedLines = Math.max(1, Math.ceil(rule.length / 86));
      if (current.length && usedLines + estimatedLines > 38) {
        pages.push(current);
        current = [];
        usedLines = 0;
      }
      current.push(rule);
      usedLines += estimatedLines;
    });
    if (current.length) pages.push(current);
    return pages;
  }, [hostelRules.content]);

  const BASE_URL = "   https://rentmobile-api.pnminfotech.com/";

  useEffect(() => {
    let cancelled = false;
    api.get("/saas/settings/hostel-rules")
      .then((response) => {
        if (!cancelled) {
          setHostelRules({
            title: response.data?.title || "Hostel Rules & Regulations",
            content: response.data?.content || "",
          });
        }
      })
      .catch(() => {
        if (!cancelled) setHostelRules({ title: "Hostel Rules & Regulations", content: "" });
      });
    return () => { cancelled = true; };
  }, []);

  const allDocuments = useMemo(() => {
    if (Array.isArray(data?.documents)) return data.documents;
    if (Array.isArray(data?.docs)) return data.docs;
    if (Array.isArray(data?.files)) return data.files;
    return [];
  }, [data?.documents, data?.docs, data?.files]);

  const visibleDocuments = useMemo(
    () =>
      allDocuments.filter((doc) => {
        const rel = String(
          doc?.relation || doc?.docType || doc?.documentType || ""
        )
          .toLowerCase()
          .trim();
        return !["photo", "tenant photo", "profile photo"].includes(rel);
      }),
    [allDocuments]
  );

  const getDocUrl = useCallback((d) => {
    const raw =
      d?.url || d?.fileUrl || d?.path || d?.secure_url || d?.location || "";
    if (!raw) return "";
    if (String(raw).startsWith("http")) return raw;
    return `${BASE_URL}/${String(raw).replace(/^\/+/, "")}`;
  }, []);

  const isImageDoc = useCallback((d) => {
    const ct = String(d?.contentType || d?.type || d?.mime || "").toLowerCase();
    const name = String(d?.fileName || d?.name || getDocUrl(d)).toLowerCase();
    return ct.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(name);
  }, [getDocUrl]);

  const docLabel = (d, index) =>
    d?.relation ||
    d?.docType ||
    d?.documentType ||
    d?.fileName ||
    d?.name ||
    `Document ${index + 1}`;

  const toDataUrl = useCallback(async (url) => {
    try {
      const res = await fetch(url, { mode: "cors" });
      const blob = await res.blob();

      const reader = new FileReader();
      return await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      return "";
    }
  }, []);

  const openPreviewImage = useCallback((src, title) => {
    setPreviewRotation(0);
    setPreviewImage({ src, title });
  }, []);

  const closePreviewImage = useCallback(() => {
    setPreviewImage(null);
    setPreviewRotation(0);
  }, []);

  // ---------------- Try to fetch full tenant doc (WITH and WITHOUT /api prefix) ----------------
  useEffect(() => {
    const id = formData?._id;
    if (!id) return;

    let cancelled = false;

    (async () => {
      const singleTries = [
        `/tenants/${id}`,
        `/tenant/${id}`,
        `/forms/${id}`,
        `/form/${id}`,
        // try with /api prefix too (in case baseURL doesn't include /api)
        `/api/tenants/${id}`,
        `/api/tenant/${id}`,
        `/api/forms/${id}`,
        `/api/form/${id}`,
      ];

      for (const url of singleTries) {
        try {
          const res = await api.get(url);
          const doc = res?.data;
          if (doc && !cancelled) {
            setTenantDoc(doc);
            return;
          }
        } catch (e) {}
      }

      const listTries = [
        "/tenants",
        "/tenant",
        "/forms",
        "/form",
        "/api/tenants",
        "/api/tenant",
        "/api/forms",
        "/api/form",
      ];

      for (const url of listTries) {
        try {
          const res = await api.get(url);
          const arr = res?.data;
          if (Array.isArray(arr)) {
            const found = arr.find((x) => String(x?._id) === String(id));
            if (found && !cancelled) {
              setTenantDoc(found);
              return;
            }
          }
        } catch (e) {}
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [formData?._id]);

  // ---------------- Fetch room meta + resolve bed + rent ----------------
  useEffect(() => {
    const roomNo = safe(data?.roomNo);
    if (!roomNo) return;

    let cancelled = false;

    (async () => {
      try {
        let rooms = [];
        try {
          const r1 = await api.get("/rooms");
          rooms = r1.data || [];
        } catch (e) {
          const r2 = await api.get("/api/rooms");
          rooms = r2.data || [];
        }

        const rm = (rooms || []).find((r) => String(r?.roomNo) === roomNo);
        if (!rm) return;

        const category = rm?.category || rm?.categoryName || "";
        const floorNo = rm?.floorNo || rm?.floor || "";
        const beds = Array.isArray(rm?.beds) ? rm.beds : [];

        // Bed hints
        const bedId = data?.bedId || data?.bed?._id || data?.bedRef;
        const bedIndex =
          data?.bedIndex ?? data?.bedIdx ?? data?.bedNumberIndex ?? null;
        const bedKey = data?.bedKey || data?.shiftTargetKey || "";
        const tenantBed = data?.bedNo; // could be ".."

        const tDigits = digits(tenantBed);
        const kDigits = digits(bedKey);

        let bedObj =
          // 1) by bed _id
          (bedId ? beds.find((b) => String(b?._id) === String(bedId)) : null) ||
          // 2) by index
          (bedIndex != null
            ? beds.find(
                (b, idx) =>
                  String(digits(b?.bedNo)) === String(bedIndex) ||
                  String(idx + 1) === String(bedIndex)
              )
            : null) ||
          // 3) by bedKey digits
          (kDigits
            ? beds.find((b) => String(digits(b?.bedNo)) === String(kDigits))
            : null) ||
          // 4) by tenantBed digits
          (tDigits
            ? beds.find((b) => String(digits(b?.bedNo)) === String(tDigits))
            : null) ||
          // 5) by normalized text
          (!isBadBed(tenantBed)
            ? beds.find((b) => norm(b?.bedNo) === norm(tenantBed))
            : null) ||
          null;

        // ✅ NEW: If bed is unknown but rent exists, match bed by price
        const tenantRentHint =
          Number(data?.rentAmount) > 0
            ? Number(data?.rentAmount)
            : Number(data?.baseRent) > 0
            ? Number(data?.baseRent)
            : null;

        if (!bedObj && tenantRentHint != null) {
          bedObj =
            beds.find((b) => Number(b?.price) === tenantRentHint) ||
            beds.find((b) => Number(pickRentFromBed(b)) === tenantRentHint) ||
            null;
        }

        // ✅ NEW: Min price fallback so rent never becomes —
        const allPrices = (beds || [])
          .map((b) => Number(pickRentFromBed(b)))
          .filter((n) => !Number.isNaN(n) && n > 0);

        const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : "";

        const resolvedBedNo = bedObj?.bedNo
          ? `bed ${String(bedObj.bedNo).trim()}`
          : !isBadBed(tenantBed)
          ? tenantBed
          : "";

        const resolvedBedRent = bedObj
          ? pickRentFromBed(bedObj)
          : tenantRentHint != null
          ? tenantRentHint
          : minPrice;

        if (cancelled) return;

        setRoomMeta({
          category,
          floorNo,
          bedNo: resolvedBedNo,
          bedRent: resolvedBedRent,
        });
      } catch (err) {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data?.roomNo, data?.bedNo, data?.baseRent, data?.rentAmount]);

  // ✅ Rent priority: bed price (resolved) > tenant rent/baseRent
  const rentVal = useMemo(() => {
    const raw = roomMeta?.bedRent ?? data?.rentAmount ?? data?.baseRent;
    return raw != null && raw !== "" && !Number.isNaN(Number(raw))
      ? Number(raw)
      : "";
  }, [roomMeta?.bedRent, data?.rentAmount, data?.baseRent]);

  const categoryVal = roomMeta.category || safe(data?.category) || "—";
  const floorVal = roomMeta.floorNo || safe(data?.floorNo) || "_________";

  const bedDisplay = !isBadBed(data?.bedNo)
    ? data?.bedNo
    : roomMeta?.bedNo
    ? roomMeta.bedNo
    : "_________";

  // ---------------- PDF Download ----------------
  const handleDownload = async () => {
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const pages = Array.from(document.querySelectorAll("[data-pdf-page='true']"));
    document.body.classList.add("admission-pdf-rendering");
    pages.forEach((page) => page.classList.add("pdf-render-page"));
    try {
      for (let i = 0; i < pages.length; i += 1) {
        const canvas = await html2canvas(pages[i], {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
        });
        const imageHeight = (canvas.height * pdfWidth) / canvas.width;
        if (i > 0) pdf.addPage();
        // All generated sections use the A4 ratio. This keeps the first page
        // full size and preserves text size on subsequent pages.
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pdfWidth, Math.min(pdfHeight, imageHeight));
      }
    } finally {
      document.body.classList.remove("admission-pdf-rendering");
      pages.forEach((page) => page.classList.remove("pdf-render-page"));
    }

    pdf.save(`Admission_Form_${data?.srNo || ""}.pdf`);
  };

  // ✅ STRICT PHOTO ONLY (NO OTHER DOC IMAGE)
  const photoUrl = useMemo(() => {
    const docs = allDocuments;

    const isImage = (d) => {
      const ct = String(d?.contentType || d?.type || d?.mime || "").toLowerCase();
      const name = String(d?.fileName || d?.name || "").toLowerCase();
      return ct.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(name);
    };

    const BASE_URL = "   https://rentmobile-api.pnminfotech.com/"; // change to your backend URL

    const getUrl = (d) => {
      const raw =
        d?.url || d?.fileUrl || d?.path || d?.secure_url || d?.location || "";
      if (!raw) return "";
      if (raw.startsWith("http")) return raw;
      return `${BASE_URL}/${raw.replace(/^\/+/, "")}`;
    };

    // ✅ only photo relation
    const preferred = docs.find((d) => {
      const rel = String(
        d?.relation || d?.docType || d?.documentType || ""
      )
        .toLowerCase()
        .trim();

      return (
        isImage(d) &&
        getUrl(d) &&
        (rel === "photo" || rel === "tenant photo" || rel === "profile photo")
      );
    });

    // ❌ no fallback to anyImg (so other docs never show)
    return getUrl(preferred) || "";
  }, [allDocuments]);

  useEffect(() => {
    let cancelled = false;

    async function toDataUrl(url) {
      try {
        const res = await fetch(url, { mode: "cors" });
        const blob = await res.blob();

        const reader = new FileReader();
        const dataUrl = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        return dataUrl;
      } catch (e) {
        return "";
      }
    }

    (async () => {
      if (!photoUrl) {
        setPhotoDataUrl("");
        return;
      }

      const durl = await toDataUrl(photoUrl);
      if (!cancelled) setPhotoDataUrl(durl || "");
    })();

    return () => {
      cancelled = true;
    };
  }, [photoUrl]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const next = {};
      await Promise.all(
        visibleDocuments.map(async (doc, index) => {
          const url = getDocUrl(doc);
          if (!url || !isImageDoc(doc)) return;
          const durl = await toDataUrl(url);
          if (durl) next[index] = durl;
        })
      );
      if (!cancelled) setDocumentDataUrls(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [visibleDocuments, getDocUrl, isImageDoc, toDataUrl]);

  // ---------------- UI ----------------
  return (
    <div>
      <div id="form-page" className="form-container form-admission-page" data-pdf-page="true">
        <header className="form-header">
          <img src={Img} alt="Logo" className="form-logo" />
          <div className="form-title">
            <div className="form-no">
              <span>Form No:</span>
              <div className="form-box">{data?.srNo || ""}</div>
            </div>
            <p className="form-subtitle">
              New Admission Form
            </p>
          </div>

          <div
            className="form-photo-box"
            role={photoDataUrl ? "button" : undefined}
            tabIndex={photoDataUrl ? 0 : undefined}
            title={photoDataUrl ? "View larger photo" : undefined}
            onClick={() =>
              photoDataUrl &&
              openPreviewImage(photoDataUrl, "Tenant Photo")
            }
            onKeyDown={(e) => {
              if (photoDataUrl && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                openPreviewImage(photoDataUrl, "Tenant Photo");
              }
            }}
          >
            {photoDataUrl ? (
              <img src={photoDataUrl} alt="Occupant" className="form-photo" />
            ) : (
              <div style={{ fontSize: 10, textAlign: "center" }}>PHOTO</div>
            )}
          </div>
        </header>

        <div className="form-body">
          <p>
            <strong>SR No:</strong> {data?.srNo || "_________"}
          </p>
          <p>
            <strong>Name Of Occupant:</strong> {safeText(data?.name)}
          </p>
          <p>
            <strong>Phone No:</strong> {safeText(data?.phoneNo)}
          </p>
          <p>
            <strong>Address:</strong> {safeText(data?.address)}
          </p>

          <hr />

          <p>
            <strong>Relative 1:</strong>{" "}
            {[safe(data?.relative1Relation), safe(data?.relative1Name), safe(data?.relative1Phone)]
              .filter(Boolean)
              .join(" • ") || "______________________________"}
          </p>

          <p>
            <strong>Relative 2:</strong>{" "}
            {[safe(data?.relative2Relation), safe(data?.relative2Name), safe(data?.relative2Phone)]
              .filter(Boolean)
              .join(" • ") || "______________________________"}
          </p>

          <hr />

          <p>
            <strong>Name & Address of Company/College/Institute/Other:</strong>
            <br />
            {safeText(data?.companyAddress, "________________________________")}
          </p>

          <p>
            <strong>Date Of Joining (Company/College):</strong> {safeDate(data?.dateOfJoiningCollege)}
          </p>
          <p>
            <strong>Hostel Joining Date:</strong> {safeDate(data?.joiningDate)}
          </p>

          <p className="form-inline-fields">
            <strong>Category:</strong> {categoryVal} &nbsp;&nbsp;&nbsp;
            <strong>Floor No:</strong> {floorVal} &nbsp;&nbsp;&nbsp;
            <strong>Room No:</strong> {safe(data?.roomNo) || "_________"} &nbsp;&nbsp;&nbsp;
            <strong>Bed No:</strong> {bedDisplay}
          </p>

          <p className="form-inline-fields">
            <strong>Rent Amount:</strong> {fmtINR(rentVal)} &nbsp;&nbsp;&nbsp;
            <strong>Deposit Amount:</strong> {fmtINR(data?.depositAmount)}
          </p>

          <p>
            <strong>Date Of Birth:</strong> {safeDate(data?.dob)}
          </p>

          <p>
            <strong>Has Occupant Given Rules & Regulation Copy To Read & Understand:</strong>{" "}
            {data?.rulesProvided || "Yes/No"}
          </p>
        </div>

        <footer className="form-footer">
          <div className="signature" style={{ fontSize: "10px" }}>
            <p>Sign of Warden:</p>
            <span>_____</span>
          </div>
          <div className="signature" style={{ fontSize: "10px" }}>
            <p>Sign of Occupant:</p>
            <span>_____</span>
          </div>
          <div className="signature" style={{ fontSize: "10px" }}>
            <p>Sign of Guardian:</p>
            <span>_____</span>
          </div>
        </footer>

        <h6 className="form-regards">Regards KP Shevkari PG</h6>
      </div>

      {rulePages.map((rules, pageIndex) => <div id={`rule-page-${pageIndex + 1}`} className="form-container form-rules-container" data-pdf-page="true" key={`rules-${pageIndex}`}>
        <section className="form-rules-page">
          <header className="form-rules-header">
            <img src={Img} alt="Logo" className="form-rules-logo" />
            <div>
              <h2>{hostelRules.title}</h2>
              <p>Rules and regulations - page {pageIndex + 1} of {rulePages.length}</p>
            </div>
          </header>
          {rules.length ? (
            <ol className="form-rules-list">
              {rules.map((rule, index) => (
                <li key={`${pageIndex}-${index}-${rule}`} value={rulePages.slice(0, pageIndex).reduce((count, page) => count + page.length, 0) + index + 1}>{rule}</li>
              ))}
            </ol>
          ) : (
            <p className="form-rules-empty">No hostel rules have been added by the administrator yet.</p>
          )}
          {pageIndex === rulePages.length - 1 && <div className="form-rules-acknowledgement">
            <strong>Occupant acknowledgement:</strong> I have read, understood and agree to follow the above rules.<br />
            <span>Occupant signature: ____________________________</span>
          </div>}
        </section>
      </div>)}

      {visibleDocuments.length > 0 ? visibleDocuments.map((doc, index) => {
              const url = getDocUrl(doc);
              const imgSrc = documentDataUrls[index] || (isImageDoc(doc) ? url : "");
              return <div id={`tenant-document-page-${index + 1}`} className="form-container form-document-page" data-pdf-page="true" key={`${docLabel(doc, index)}-${index}`}>
                {imgSrc ? <img
                  src={imgSrc}
                  alt={docLabel(doc, index)}
                  className="form-document-image form-document-image-clickable"
                  role="button"
                  tabIndex={0}
                  title="Click to zoom"
                  onClick={() => openPreviewImage(imgSrc, docLabel(doc, index))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openPreviewImage(imgSrc, docLabel(doc, index));
                    }
                  }}
                /> : url ? <div className="form-document-link">{url}</div> : <div className="form-document-empty">No document preview available</div>}
              </div>;
            }) : <div id="tenant-documents-page" className="form-container form-document-page" data-pdf-page="true"><div className="form-document-empty">No documents uploaded</div></div>}
      <button onClick={handleDownload} className="download-button">
        Download as PDF
      </button>
      {previewImage?.src && (
        <div
          className="form-photo-preview-backdrop"
          onClick={closePreviewImage}
        >
          <div
            className="form-photo-preview-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="form-photo-preview-toolbar">
              <div className="form-photo-preview-title">
                {previewImage.title}
              </div>
              <div className="form-photo-preview-actions">
                <button
                  type="button"
                  className="form-photo-preview-action-btn"
                  onClick={() => setPreviewRotation((prev) => prev - 90)}
                >
                  Rotate Left
                </button>
                <button
                  type="button"
                  className="form-photo-preview-action-btn"
                  onClick={() => setPreviewRotation((prev) => prev + 90)}
                >
                  Rotate Right
                </button>
              </div>
            </div>
            <button
              type="button"
              className="form-photo-preview-close"
              onClick={closePreviewImage}
            >
              x
            </button>
            <img
              src={previewImage.src}
              alt={previewImage.title || "Preview"}
              className="form-photo-preview-image"
              style={{ transform: `rotate(${previewRotation}deg)` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FormDownload;
