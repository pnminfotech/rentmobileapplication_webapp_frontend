import React, { useEffect, useMemo, useState } from "react";

import {
  FaEdit,
  FaEye,
  FaPlus,
  FaReceipt,
  FaTrash,
  FaUtensils,
  FaSearch,
  FaSlidersH,
  FaTimes,FaDownload
} from "react-icons/fa";
import * as XLSX from "xlsx";
import { api } from "../api";
import "./CanteenExpense.css";
import { FaRupeeSign, FaWallet } from "react-icons/fa";
import { MdPendingActions } from "react-icons/md";
import { FaCheckCircle } from "react-icons/fa";
import { FaChartLine } from "react-icons/fa";
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const initialForm = {
  expenseDate: "",
  title: "",
  category: "Grocery",
  amount: "",
  vendorName: "",
  billNumber: "",
  paidBy: "",
  paymentMethod: "Cash",
  description: "",
  notes: "",
  dueDate: "",
  paidAmount: "",
  receiptFiles: [],
  existingReceipts: [],
  receiptImage: null,
  receiptFileId: "",
};

const createBatchEntry = () => ({
  title: "",
  category: "Grocery",
  amount: "",
  vendorName: "",
  billNumber: "",
  paidBy: "",
  paymentMethod: "Cash",
  description: "",
  notes: "",
  dueDate: "",
  paidAmount: "",
  receiptFiles: [],
});

const initialSummary = {
  totalAmount: 0,
  totalEntries: 0,
  totalPaidAmount: 0,
  outstandingAmount: 0,
  budgetAmount: 0,
  budgetVariance: 0,
  categoryBreakdown: [],
  vendorBreakdown: [],
  paymentBreakdown: [],
  recentExpenses: [],
  budget: null,
};

const categories = [
  "Grocery",
  "Vegetables",
  "Milk/Dairy",
  "Gas",
  "Snacks",
  "Kitchen Items",
  "Cleaning",
  "Repairs",
  "Tea/Refreshments",
  "Other",
];

const paymentMethods = [
  "Cash",
  "UPI",
  "Card",
  "Bank Transfer",
  "Credit",
  "Other",
];

const paymentStatuses = ["Pending", "Partial", "Paid"];

const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));
const getPaymentStatusClass = (status) =>
  String(status || "pending").toLowerCase();
const getCurrentMonth = () => new Date().toISOString().slice(0, 7);
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
const normalizeReceipts = (expense = {}) => {
  const receipts = Array.isArray(expense.receipts) ? expense.receipts : [];
  if (receipts.length) {
    return receipts.filter((item) => item?.url);
  }

  if (expense.receiptImage) {
    return [
      {
        url: expense.receiptImage,
        fileId: expense.receiptFileId || "",
      },
    ];
  }

  return [];
};

function CanteenExpense({ embedded = false }) {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(initialSummary);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [batchEntries, setBatchEntries] = useState([createBatchEntry()]);
  const [budgetForm, setBudgetForm] = useState({ amount: "", notes: "" });
const [showMobileFilters, setShowMobileFilters] = useState(false);
const [isMobile, setIsMobile] = useState(
  typeof window !== "undefined" ? window.innerWidth <= 768 : false
);



  const [filters, setFilters] = useState({
    search: "",
    category: "",
    month: getCurrentMonth(),
    paymentStatus: "",
  });

  const [previewImage, setPreviewImage] = useState("");
  const [previewReceipts, setPreviewReceipts] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showExportMenu, setShowExportMenu] = useState(false);
useEffect(() => {
  const handleResize = () => {
    setIsMobile(window.innerWidth <= 768);
  };

  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);
  const paymentBreakdownMap = useMemo(() => {
    return (summary.paymentBreakdown || []).reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
  }, [summary.paymentBreakdown]);

  const totalThisPage = useMemo(() => {
    return expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [expenses]);

  const groupedExpenses = useMemo(() => {
    const groups = [];
    expenses.forEach((item) => {
      const groupKey = item.expenseDate
        ? new Date(item.expenseDate).toISOString().slice(0, 10)
        : "unknown-date";
      const lastGroup = groups[groups.length - 1];

      if (!lastGroup || lastGroup.key !== groupKey) {
        groups.push({
          key: groupKey,
          label: item.expenseDate
            ? new Date(item.expenseDate).toLocaleDateString("en-GB")
            : "-",
          items: [item],
        });
        return;
      }

      lastGroup.items.push(item);
    });
    return groups;
  }, [expenses]);

  const appendFilters = (params, options = {}) => {
    const {
      includeSearch = true,
      includeCategory = true,
      includeMonth = true,
      includePaymentStatus = true,
    } = options;

    if (includeSearch && filters.search) params.append("search", filters.search);
    if (includeCategory && filters.category) {
      params.append("category", filters.category);
    }
    if (includeMonth && filters.month) params.append("month", filters.month);
    if (includePaymentStatus && filters.paymentStatus) {
      params.append("paymentStatus", filters.paymentStatus);
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      appendFilters(params);

      const res = await api.get(`/canteen-expenses?${params.toString()}`);
      setExpenses(res.data?.data || []);
    } catch (error) {
      console.error("fetchExpenses error:", error);
      alert(error?.response?.data?.message || "Failed to load canteen expenses");
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const params = new URLSearchParams();
      appendFilters(params);

      const res = await api.get(`/canteen-expenses/summary?${params.toString()}`);
      setSummary({
        ...initialSummary,
        ...(res.data?.data || {}),
      });
    } catch (error) {
      console.error("fetchSummary error:", error);
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchSummary();
  }, [filters.search, filters.category, filters.month, filters.paymentStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const openAddModal = () => {
    setEditingExpense(null);
    setFormData({
      ...initialForm,
      expenseDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date().toISOString().slice(0, 10),
      paidAmount: "",
      receiptFiles: [],
      existingReceipts: [],
    });
    setBatchEntries([createBatchEntry()]);
    setShowModal(true);
  };

  const openEditModal = (item) => {
    const existingReceipts = normalizeReceipts(item);
    setEditingExpense(item);
    setFormData({
      expenseDate: item.expenseDate ? item.expenseDate.slice(0, 10) : "",
      title: item.title || "",
      category: item.category || "Grocery",
      amount: item.amount || "",
      vendorName: item.vendorName || "",
      billNumber: item.billNumber || "",
      paidBy: item.paidBy || "",
      paymentMethod: item.paymentMethod || "Cash",
      description: item.description || "",
      notes: item.notes || "",
      dueDate: item.dueDate ? item.dueDate.slice(0, 10) : "",
      paidAmount: item.paidAmount || "",
      receiptFiles: [],
      existingReceipts,
      receiptImage: null,
      receiptFileId: existingReceipts[0]?.fileId || "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingExpense(null);
    setFormData(initialForm);
    setBatchEntries([createBatchEntry()]);
  };

  const openBudgetModal = () => {
    setBudgetForm({
      amount:
        summary.budget?.amount !== undefined && summary.budget?.amount !== null
          ? String(summary.budget.amount)
          : "",
      notes: summary.budget?.notes || "",
    });
    setShowBudgetModal(true);
  };

  const closeBudgetModal = () => {
    setShowBudgetModal(false);
    setBudgetForm({ amount: "", notes: "" });
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "receiptFiles") {
      const selectedFiles = Array.from(files || []);
      if (selectedFiles.some((file) => !isAllowedImageFile(file))) {
        alert("Only JPG, JPEG, and PNG files are allowed.");
        e.target.value = "";
        return;
      }

      setFormData((prev) => ({
        ...prev,
        receiptFiles: selectedFiles,
      }));
      return;
    }

    if (name === "receiptImage") {
      const file = files?.[0] || null;
      if (file && !isAllowedImageFile(file)) {
        alert("Only JPG, JPEG, and PNG files are allowed.");
        e.target.value = "";
        return;
      }

      setFormData((prev) => ({
        ...prev,
        receiptImage: file,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBatchEntryChange = (index, field, value) => {
    setBatchEntries((prev) =>
      prev.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry
      )
    );
  };

  const handleBatchReceiptChange = (index, files) => {
    const selectedFiles = Array.from(files || []);
    if (selectedFiles.some((file) => !isAllowedImageFile(file))) {
      alert("Only JPG, JPEG, and PNG files are allowed.");
      return;
    }

    setBatchEntries((prev) =>
      prev.map((entry, entryIndex) =>
        entryIndex === index
          ? { ...entry, receiptFiles: selectedFiles }
          : entry
      )
    );
  };

  const removeSelectedBatchReceipt = (entryIndex, fileIndex) => {
    setBatchEntries((prev) =>
      prev.map((entry, index) =>
        index === entryIndex
          ? {
              ...entry,
              receiptFiles: entry.receiptFiles.filter(
                (_, currentFileIndex) => currentFileIndex !== fileIndex
              ),
            }
          : entry
      )
    );
  };

  const addBatchEntryRow = () => {
    setBatchEntries((prev) => [...prev, createBatchEntry()]);
  };

  const removeBatchEntryRow = (indexToRemove) => {
    setBatchEntries((prev) =>
      prev.length === 1
        ? prev
        : prev.filter((_, index) => index !== indexToRemove)
    );
  };

  const removeExistingReceipt = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      existingReceipts: prev.existingReceipts.filter(
        (_, index) => index !== indexToRemove
      ),
    }));
  };

  const removeSelectedReceipt = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      receiptFiles: prev.receiptFiles.filter((_, index) => index !== indexToRemove),
    }));
  };

  const uploadReceiptsToImageKit = async (files = []) => {
    if (!files.length) return [];

    const uploadForm = new FormData();
    files.forEach((file) => {
      uploadForm.append("documents", file);
    });

    const uploadRes = await api.post("/uploads/docs", uploadForm, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    const uploadedFiles = Array.isArray(uploadRes?.data?.files)
      ? uploadRes.data.files
      : [];

    if (!uploadedFiles.length || uploadedFiles.some((file) => !file?.url)) {
      throw new Error("Receipt upload failed");
    }

    return uploadedFiles.map((file) => ({
      url: file.url,
      fileId: file.fileId || "",
      filePath: file.filePath || "",
      filename: file.filename || "",
      storedName: file.storedName || "",
      mimetype: file.mimetype || "",
      size: Number(file.size || 0),
    }));
  };

  const buildSingleExpensePayload = async (entry, expenseDate) => {
    const numericAmount = Number(entry.amount || 0);
    const numericPaidAmount =
      entry.paidAmount === "" ? 0 : Number(entry.paidAmount);

    if (!String(expenseDate || "").trim()) {
      throw new Error("Date is required");
    }

    if (!String(entry.title || "").trim()) {
      throw new Error("Each entry needs a title");
    }

    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      throw new Error("Amount must be a valid non-negative number");
    }

    if (!Number.isFinite(numericPaidAmount) || numericPaidAmount < 0) {
      throw new Error("Paid amount must be a valid non-negative number");
    }

    if (numericPaidAmount > numericAmount) {
      throw new Error("Paid amount cannot be greater than amount");
    }

    const uploadedReceipts = await uploadReceiptsToImageKit(entry.receiptFiles || []);
    const receipts = [
      ...(entry.existingReceipts || []),
      ...uploadedReceipts,
    ];

    return {
      expenseDate,
      title: entry.title,
      category: entry.category,
      amount: numericAmount,
      vendorName: entry.vendorName,
      billNumber: entry.billNumber,
      paidBy: entry.paidBy,
      paymentMethod: entry.paymentMethod,
      description: entry.description,
      notes: entry.notes,
      dueDate: entry.dueDate || "",
      paidAmount: numericPaidAmount,
      receipts,
    };
  };

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      if (editingExpense?._id) {
        const payload = await buildSingleExpensePayload(
          formData,
          formData.expenseDate
        );
        await api.put(`/canteen-expenses/${editingExpense._id}`, payload);
        alert("Expense updated successfully");
      } else {
        const usableEntries = batchEntries.filter(
          (entry) =>
            String(entry.title || "").trim() ||
            String(entry.vendorName || "").trim() ||
            String(entry.amount || "").trim()
        );

        if (!usableEntries.length) {
          throw new Error("Add at least one vendor entry");
        }

        const payloads = [];
        for (let index = 0; index < usableEntries.length; index += 1) {
          payloads.push(
            await buildSingleExpensePayload(
              usableEntries[index],
              formData.expenseDate
            )
          );
        }

        await Promise.all(
          payloads.map((payload) => api.post("/canteen-expenses", payload))
        );
        alert(
          payloads.length === 1
            ? "Expense added successfully"
            : `${payloads.length} expenses added for the same date`
        );
      }

      closeModal();
      fetchExpenses();
      fetchSummary();
    } catch (error) {
      console.error("handleSave error:", error);
      alert(error?.response?.data?.message || error.message || "Failed to save expense");
    } finally {
      setSaving(false);
    }
  };

  const handleBudgetSave = async (e) => {
    e.preventDefault();

    if (!filters.month) {
      alert("Select a month before setting a budget");
      return;
    }

    try {
      setBudgetSaving(true);
      await api.put("/canteen-expenses/budget", {
        monthKey: filters.month,
        amount: Number(budgetForm.amount || 0),
        notes: budgetForm.notes,
      });
      closeBudgetModal();
      fetchSummary();
      alert("Budget saved successfully");
    } catch (error) {
      console.error("handleBudgetSave error:", error);
      alert(error?.response?.data?.message || "Failed to save budget");
    } finally {
      setBudgetSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Are you sure you want to delete this expense?");
    if (!ok) return;

    try {
      await api.delete(`/canteen-expenses/${id}`);
      alert("Expense deleted successfully");
      fetchExpenses();
      fetchSummary();
    } catch (error) {
      console.error("handleDelete error:", error);
      alert("Failed to delete expense");
    }
  };

  const getFileUrl = (filePath) => {
    if (!filePath) return "";
    if (filePath.startsWith("http")) return filePath;

    const base =
      api?.defaults?.baseURL?.replace(/\/api\/?$/, "") ||
      window.location.origin;

    return `${base}${filePath}`;
  };

  const openReceiptPreview = (receipts = [], startIndex = 0) => {
    const normalizedPreviewReceipts = receipts
      .map((receipt) => ({
        ...receipt,
        url: getFileUrl(receipt.url),
      }))
      .filter((receipt) => receipt.url);

    if (!normalizedPreviewReceipts.length) return;

    const safeIndex = Math.min(
      Math.max(startIndex, 0),
      normalizedPreviewReceipts.length - 1
    );

    setPreviewReceipts(normalizedPreviewReceipts);
    setPreviewIndex(safeIndex);
    setPreviewImage(normalizedPreviewReceipts[safeIndex].url);
  };

  const closeReceiptPreview = () => {
    setPreviewReceipts([]);
    setPreviewIndex(0);
    setPreviewImage("");
  };

  const setActivePreviewIndex = (nextIndex) => {
    const nextReceipt = previewReceipts[nextIndex];
    if (!nextReceipt) return;

    setPreviewIndex(nextIndex);
    setPreviewImage(nextReceipt.url);
  };

  const getLastMonth = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  };

  const getCurrentYearRange = () => {
    const year = new Date().getFullYear();
    return {
      fromDate: `${year}-01-01`,
      toDate: `${year}-12-31`,
    };
  };

  const exportToExcel = async (type) => {
    if (!type) return;

    try {
      setExporting(true);

      const params = new URLSearchParams();
      appendFilters(params, { includeMonth: false });

      let fileName = "canteen_expenses.xlsx";

      if (type === "current_month") {
        params.append("month", getCurrentMonth());
        fileName = `canteen_expenses_current_month.xlsx`;
      }

      if (type === "last_month") {
        params.append("month", getLastMonth());
        fileName = `canteen_expenses_last_month.xlsx`;
      }

      if (type === "current_year") {
        const { fromDate, toDate } = getCurrentYearRange();
        params.append("fromDate", fromDate);
        params.append("toDate", toDate);
        fileName = `canteen_expenses_current_year.xlsx`;
      }

      const res = await api.get(`/canteen-expenses?${params.toString()}`);
      const exportData = res.data?.data || [];

      if (!exportData.length) {
        alert("No data found for selected export");
        return;
      }

      const rows = exportData.map((item, index) => ({
        Sr_No: index + 1,
        Date: item.expenseDate
          ? new Date(item.expenseDate).toLocaleDateString("en-GB")
          : "",
        Title: item.title || "",
        Category: item.category || "",
        Vendor_Name: item.vendorName || "",
        Bill_Number: item.billNumber || "",
        Amount: Number(item.amount || 0),
        Paid_Amount: Number(item.paidAmount || 0),
        Balance_Amount: Number(item.balanceAmount || 0),
        Payment_Status: item.paymentStatus || "",
        Due_Date: item.dueDate
          ? new Date(item.dueDate).toLocaleDateString("en-GB")
          : "",
        Paid_By: item.paidBy || "",
        Payment_Method: item.paymentMethod || "",
        Description: item.description || "",
        Notes: item.notes || "",
        Receipt_URLs: normalizeReceipts(item)
          .map((receipt) => receipt.url)
          .join(", "),
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Canteen Expenses");

      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error("exportToExcel error:", error);
      alert("Failed to export Excel");
    } finally {
      setExporting(false);
    }
  };

  const handleQuickExport = async (value) => {
    setShowExportMenu(false);
    await exportToExcel(value);
  };

  const balancePreview = Math.max(
    Number(formData.amount || 0) - Number(formData.paidAmount || 0),
    0
  );
  const paymentStatusPreview = getPaymentStatusClass(
    balancePreview <= 0
      ? "Paid"
      : Number(formData.paidAmount || 0) > 0
      ? "Partial"
      : "Pending"
  );

  const renderReceiptTrigger = (receipts) =>
    receipts.length ? (
      <div className="canteen-receipt-actions">
        <button
          className="icon-btn view"
          onClick={() => openReceiptPreview(receipts)}
          title="View all bills"
        >
          <FaEye />
        </button>
        <span className="canteen-receipt-count">
          {receipts.length} file
          {receipts.length > 1 ? "s" : ""}
        </span>
      </div>
    ) : (
      "-"
    );

  const renderExpenseActions = (item) => (
    <div className="action-btn-group">
      <button
        className="icon-btn edit"
        onClick={() => openEditModal(item)}
        title="Edit"
      >
        <FaEdit />
      </button>
      <button
        className="icon-btn delete"
        onClick={() => handleDelete(item._id)}
        title="Delete"
      >
        <FaTrash />
      </button>
    </div>
  );
const formattedMonthLabel = filters.month
  ? new Date(`${filters.month}-01`).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })
  : "Select Month";
  return (
    <div className={`canteen-expense-page ${embedded ? "embedded" : ""}`}>
   <div className="canteen-header-card mobile-app-header">
  <div className="section-title">
    <span className="section-icon">
      <FaUtensils />
    </span>
    <div>
      <span className="section-text">Canteen Expenses</span>
      <p className="canteen-subtext">Track purchases and dues.</p>
    </div>
  </div>

  <div className="canteen-header-actions">
    <button className="canteen-budget-btn" onClick={openBudgetModal}>
      Set Budget
    </button>

    <button className="canteen-add-btn" onClick={openAddModal}>
      <FaPlus /> Add Day Expenses
    </button>
  </div>

  {isMobile && (
    <div className="canteen-mobile-header-actions">
      <button className="canteen-budget-link-btn" onClick={openBudgetModal}>
        Set Budget
      </button>
    </div>
  )}

  <button
    type="button"
    className="canteen-export-fab"
    onClick={() => setShowExportMenu((prev) => !prev)}
    disabled={exporting}
    aria-label="Download Excel"
    title="Download Excel"
  >
    <FaDownload />
  </button>

  {showExportMenu && (
    <div className="canteen-export-menu">
      <button type="button" onClick={() => handleQuickExport("current_month")}>
        Current Month
      </button>
      <button type="button" onClick={() => handleQuickExport("last_month")}>
        Last Month
      </button>
      <button type="button" onClick={() => handleQuickExport("current_year")}>
        Current Year
      </button>
    </div>
  )}
</div>

   <div className="canteen-summary-grid">

  {/* TOTAL SPEND */}
  <div className="canteen-summary-box box1">
    <div className="summary-inner">

      <div className="summary-icon blue">
        <FaWallet />
      </div>

      <div className="summary-content">
        <p>Total Spend</p>






        <h3>{formatCurrency(summary.totalAmount)}</h3>
        <span className="canteen-metric-caption">
          Filtered entries: {summary.totalEntries || 0}
        </span>
      </div>

    </div>
  </div>

  {/* OUTSTANDING */}
  <div className="canteen-summary-box box2">
    <div className="summary-inner">

      <div className="summary-icon orange">
        <MdPendingActions />
      </div>

      <div className="summary-content">
        <p>Outstanding Dues</p>
        <h3>{formatCurrency(summary.outstandingAmount)}</h3>
        <span className="canteen-metric-caption">
          Pending {paymentBreakdownMap.Pending || 0} | Partial {paymentBreakdownMap.Partial || 0}
        </span>
      </div>

    </div>
  </div>

  {/* PAID */}
  <div className="canteen-summary-box box3">
    <div className="summary-inner">

      <div className="summary-icon green">
        <FaCheckCircle />
      </div>

      <div className="summary-content">
        <p>Paid So Far</p>
        <h3>{formatCurrency(summary.totalPaidAmount)}</h3>
        <span className="canteen-metric-caption">
          Fully settled: {paymentBreakdownMap.Paid || 0}
        </span>
      </div>

    </div>
  </div>

  {/* BUDGET */}
  <div className="canteen-summary-box box4">
    <div className="summary-inner">

      <div className="summary-icon indigo">
        <FaChartLine />
      </div>

      <div className="summary-content">
        <p>Budget vs Actual</p>

        <h3>
          {summary.budgetAmount
            ? formatCurrency(summary.budgetAmount)
            : "Not Set"}
        </h3>

        <span
          className={`canteen-metric-caption ${
            summary.budgetVariance < 0 ? "negative" : "positive"
          }`}
        >
          {summary.budgetAmount
            ? `${summary.budgetVariance < 0 ? "Over by" : "Left"} ${formatCurrency(
                Math.abs(summary.budgetVariance)
              )}`
            : "Set a monthly budget"}
        </span>

      </div>

    </div>
  </div>

</div>
{!isMobile ? (
  <div className="canteen-filter-card">
    <input
      type="month"
      value={filters.month}
      onChange={(e) =>
        setFilters((prev) => ({ ...prev, month: e.target.value }))
      }
    />

    <input
      type="text"
      placeholder="Search title, vendor, bill no, notes..."
      value={filters.search}
      onChange={(e) =>
        setFilters((prev) => ({ ...prev, search: e.target.value }))
      }
    />

    <select
      value={filters.category}
      onChange={(e) =>
        setFilters((prev) => ({ ...prev, category: e.target.value }))
      }
    >
      <option value="">All Categories</option>
      {categories.map((cat) => (
        <option key={cat} value={cat}>
          {cat}
        </option>
      ))}
    </select>

    <select
      value={filters.paymentStatus}
      onChange={(e) =>
        setFilters((prev) => ({ ...prev, paymentStatus: e.target.value }))
      }
    >
      <option value="">All Payment Status</option>
      {paymentStatuses.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </select>
  </div>
) : (
  <div className="canteen-mobile-search-card">
    <div className="canteen-mobile-search-box">
      <FaSearch className="canteen-mobile-search-icon" />
      <input
        type="text"
        placeholder="Search title, vendor, bill no, notes..."
        value={filters.search}
        onChange={(e) =>
          setFilters((prev) => ({ ...prev, search: e.target.value }))
        }
      />
    </div>

    <button
      type="button"
      className="canteen-mobile-filter-btn"
      onClick={() => setShowMobileFilters(true)}
    >
      <FaSlidersH />
    </button>
  </div>
)}

      <div className="canteen-table-card">
        {loading ? (
          <div className="py-4 text-center">Loading...</div>
        ) : expenses.length === 0 ? (
          <div className="py-4 text-center text-muted">
            No canteen expenses found
          </div>
        ) : (
          <>
          <div className="table-responsive canteen-desktop-table">
            <table className="table align-middle canteen-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Vendor</th>
                  <th>Bill No.</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Receipt</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {groupedExpenses.map((group, groupIndex) =>
                  group.items.map((item, index) => {
                    const receipts = normalizeReceipts(item);
                    const toneClass =
                      groupIndex % 2 === 0
                        ? "canteen-group-tone-a"
                        : "canteen-group-tone-b";

                    return (
                      <tr
                        key={item._id}
                        className={`canteen-group-row ${toneClass} ${
                          index > 0 ? "canteen-group-subrow" : ""
                        }`}
                      >
                        {index === 0 && (
                          <td
                            rowSpan={group.items.length}
                            className={`canteen-date-group-cell ${toneClass}`}
                          >
                            <div className="canteen-date-group">
                              <strong>{group.label}</strong>
                              <small>{group.items.length} entries</small>
                            </div>
                          </td>
                        )}
                        <td>{item.title}</td>
                        <td>{item.category}</td>
                        <td>{item.vendorName || "-"}</td>
                        <td>{item.billNumber || "-"}</td>
                        <td>{formatCurrency(item.amount)}</td>
                        <td>{formatCurrency(item.paidAmount)}</td>
                        <td>{formatCurrency(item.balanceAmount)}</td>
                        <td>
                          <span
                            className={`canteen-status-badge ${getPaymentStatusClass(
                              item.paymentStatus
                            )}`}
                          >
                            {item.paymentStatus}
                          </span>
                        </td>
                        <td>{renderReceiptTrigger(receipts)}</td>
                        <td>{renderExpenseActions(item)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="canteen-mobile-groups">
            {groupedExpenses.map((group, groupIndex) => {
              const toneClass =
                groupIndex % 2 === 0
                  ? "canteen-group-tone-a"
                  : "canteen-group-tone-b";

              return (
                <div
                  key={group.key}
                  className={`canteen-mobile-group-card ${toneClass}`}
                >
                  <div className="canteen-mobile-group-head">
                    <div className="canteen-date-group">
                      <strong>{group.label}</strong>
                      <small>{group.items.length} entries</small>
                    </div>
                  </div>

                  <div className="canteen-mobile-entry-list">
                    {group.items.map((item, index) => {
                      const receipts = normalizeReceipts(item);

                      return (
                        <div
                          key={item._id}
                          className={`canteen-mobile-entry rent-mobile-tenant-card rent-mobile-tenant-card--paid ${
                            index > 0 ? "with-divider" : ""
                          }`}
                        >
                          <div className="canteen-mobile-entry-top">
                            <strong>{item.title}</strong>
                            <span
                              className={`canteen-status-badge ${getPaymentStatusClass(
                                item.paymentStatus
                              )}`}
                            >
                              {item.paymentStatus}
                            </span>
                          </div>
                          <div className="canteen-mobile-entry-grid">
                            <span><b>Category: </b>{item.category}</span>
                            <span><b>Vendor: </b>{item.vendorName || "-"}</span>
                            <span><b>Bill No:</b> {item.billNumber || "-"}</span>
                            <span><b>Amount:</b> {formatCurrency(item.amount)}</span>
                            <span><b>Paid: </b>{formatCurrency(item.paidAmount)}</span>
                            <span><b>Balance: </b>{formatCurrency(item.balanceAmount)}</span>
                          </div>
                          <div className="canteen-mobile-entry-actions">
                            {renderReceiptTrigger(receipts)}
                            {renderExpenseActions(item)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>

      <div className="canteen-dashboard-grid mt-3">
        <div className="canteen-category-card">
          <div className="canteen-card-head">
            <h5 className="mb-0">Category Summary</h5>
          </div>
          {summary.categoryBreakdown?.length ? (
            <>
              <div className="table-responsive canteen-desktop-summary-table">
                <table className="table mb-0 canteen-category-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Entries</th>
                      <th>Total</th>
                      <th>Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.categoryBreakdown.map((item) => (
                      <tr key={item._id}>
                        <td>{item._id}</td>
                        <td>{item.count}</td>
                        <td>{formatCurrency(item.totalAmount)}</td>
                        <td>{formatCurrency(item.outstandingAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="canteen-mobile-breakdown rent-mobile-tenant-card rent-mobile-tenant-card--paid">
                {summary.categoryBreakdown.map((item) => (
                  <div key={item._id} className="canteen-mobile-breakdown-card">
                    <strong>{item._id}</strong>
                    <span>Entries: {item.count}</span>
                    <span>Total: {formatCurrency(item.totalAmount)}</span>
                    <span>Outstanding: {formatCurrency(item.outstandingAmount)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-muted mb-0">No summary available</p>
          )}
        </div>

        <div className="canteen-category-card">
          <div className="canteen-card-head">
            <h5 className="mb-0">Vendor Dues</h5>
          </div>
          {summary.vendorBreakdown?.length ? (
            <>
              <div className="table-responsive canteen-desktop-summary-table">
                <table className="table mb-0 canteen-vendor-table">
                  <thead>
                    <tr>
                      <th>Vendor</th>
                      <th>Entries</th>
                      <th>Total</th>
                      <th>Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.vendorBreakdown.map((item) => (
                      <tr key={item._id}>
                        <td>{item._id}</td>
                        <td>{item.count}</td>
                        <td>{formatCurrency(item.totalAmount)}</td>
                        <td>{formatCurrency(item.outstandingAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                
              </div>
              <div className="canteen-mobile-breakdown rent-mobile-tenant-card rent-mobile-tenant-card--paid">
                {summary.vendorBreakdown.map((item) => (
                  <div key={item._id} className="canteen-mobile-breakdown-card">
                    <strong>{item._id}</strong>
                    <span>Entries: {item.count}</span>
                    <span>Total: {formatCurrency(item.totalAmount)}</span>
                    <span>Due: {formatCurrency(item.outstandingAmount)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-muted mb-0">No vendor data available</p>
          )}
        </div>
      </div>

      <div className="canteen-category-card canteen-recent-card">
        <div className="canteen-card-head">
          <h5 className="mb-0">Recent Expenses</h5>
        </div>
        {summary.recentExpenses?.length ? (
          <div className="canteen-recent-list   ">
            {summary.recentExpenses.map((item) => (
              <div key={item._id} className="canteen-recent-item rent-mobile-tenant-card  rent-mobile-tenant-card--paid" style={{borderLeft: "5px solid #16a34a"}}>
                <div className="rcntexpnsnm">
                  <strong>{item.title}</strong>
                  <p>
                    {item.vendorName || "No vendor"} | {item.category} |{" "}
                    {item.expenseDate
                      ? new Date(item.expenseDate).toLocaleDateString("en-GB")
                      : "-"}
                  </p>
                </div>
                <div className="canteen-recent-metrics">
                  <span>{formatCurrency(item.amount)}</span>
                  <small>{item.paymentStatus}</small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted mb-0">No recent expenses available</p>
        )}
      </div>

      {false && (
        <>
      <div className="canteen-summary-grid">
        <div className="canteen-summary-box canteen-summary-box1">
          <p>Total This Month</p>
          <h3>₹ {Number(summary.totalAmount || 0).toLocaleString("en-IN")}</h3>
        </div>

        <div className="canteen-summary-box canteen-summary-box2">
          <p>Total Entries</p>
          <h3>{summary.totalEntries || 0}</h3>
        </div>

        <div className="canteen-summary-box canteen-summary-box3">
          <p>Filtered Total</p>
          <h3>₹ {Number(totalThisPage || 0).toLocaleString("en-IN")}</h3>
        </div>
      </div>

      <div className="canteen-filter-card">
        <input
          type="month"
          value={filters.month}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, month: e.target.value }))
          }
        />

        <input
          type="text"
          placeholder="Search title, vendor, paid by..."
          value={filters.search}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, search: e.target.value }))
          }
        />

        <select
          value={filters.category}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, category: e.target.value }))
          }
          className="categorydropdown"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="canteen-table-card">
        {loading ? (
          <div className="py-4 text-center">Loading...</div>
        ) : expenses.length === 0 ? (
          <div className="py-4 text-center text-muted">
            No canteen expenses found
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle canteen-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Vendor</th>
                  <th>Paid By</th>
                  <th>Payment</th>
                  <th>Receipt</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((item) => (
                  <tr key={item._id}>
                    <td>
                      {item.expenseDate
                        ? new Date(item.expenseDate).toLocaleDateString("en-GB")
                        : "-"}
                    </td>
                    <td>{item.title}</td>
                    <td>{item.category}</td>
                    <td>₹ {Number(item.amount || 0).toLocaleString("en-IN")}</td>
                    <td>{item.vendorName || "-"}</td>
                    <td>{item.paidBy || "-"}</td>
                    <td>{item.paymentMethod || "-"}</td>
                    <td>
                      {item.receiptImage ? (
                        <button
                          className="icon-btn view"
                          onClick={() =>
                            setPreviewImage(getFileUrl(item.receiptImage))
                          }
                          title="View receipt"
                        >
                          <FaEye />
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <div className="action-btn-group">
                        <button
                          className="icon-btn edit"
                          onClick={() => openEditModal(item)}
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="icon-btn delete"
                          onClick={() => handleDelete(item._id)}
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="canteen-category-card my-4">
        <h5 className="mb-3">Category Wise Summary</h5>
        {summary.categoryBreakdown?.length ? (
          <div className="table-responsive">
            <table className="table table-bordered mb-0">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Entries</th>
                  <th>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {summary.categoryBreakdown.map((item) => (
                  <tr key={item._id}>
                    <td>{item._id}</td>
                    <td>{item.count}</td>
                    <td>
                      ₹ {Number(item.totalAmount || 0).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted mb-0">No summary available</p>
        )}
      </div>

        </>
      )}

      {showModal && (
        <div className="canteen-modal-overlay">
          <div className="canteen-modal-box">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="mb-0">
                {editingExpense ? "Edit Canteen Expense" : "Add Same-Day Expenses"}
              </h4>
              <button className="canteen-close-btn" onClick={closeModal}>
                {"\u00D7"}
              </button>
            </div>

            <form onSubmit={handleSave}>
              {editingExpense ? (
                <div className="canteen-form-grid">
                  <div>
                    <label>Date</label>
                    <input
                      type="date"
                      name="expenseDate"
                      value={formData.expenseDate}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div>
                    <label>Title</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="Example: Grocery purchase"
                      required
                    />
                  </div>

                  <div>
                    <label>Category</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      required
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Total Amount</label>
                    <input
                      type="number"
                      name="amount"
                      min="0"
                      step="0.01"
                      value={formData.amount}
                      onChange={handleChange}
                      placeholder="Enter amount"
                      required
                    />
                  </div>

                  <div>
                    <label>Vendor Name</label>
                    <input
                      type="text"
                      name="vendorName"
                      value={formData.vendorName}
                      onChange={handleChange}
                      placeholder="Vendor / shop name"
                    />
                  </div>

                  <div>
                    <label>Bill Number</label>
                    <input
                      type="text"
                      name="billNumber"
                      value={formData.billNumber}
                      onChange={handleChange}
                      placeholder="Invoice or bill number"
                    />
                  </div>

                  <div>
                    <label>Paid Amount</label>
                    <input
                      type="number"
                      name="paidAmount"
                      min="0"
                      step="0.01"
                      value={formData.paidAmount}
                      onChange={handleChange}
                      placeholder="How much is already paid?"
                    />
                  </div>

                  <div>
                    <label>Due Date</label>
                    <input
                      type="date"
                      name="dueDate"
                      value={formData.dueDate}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label>Paid By</label>
                    <input
                      type="text"
                      name="paidBy"
                      value={formData.paidBy}
                      onChange={handleChange}
                      placeholder="Who paid this amount?"
                    />
                  </div>

                  <div>
                    <label>Payment Method</label>
                    <select
                      name="paymentMethod"
                      value={formData.paymentMethod}
                      onChange={handleChange}
                    >
                      {paymentMethods.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="full-width canteen-inline-summary">
                    <span>
                      Balance: <strong>{formatCurrency(balancePreview)}</strong>
                    </span>
                    <span
                      className={`canteen-status-badge ${paymentStatusPreview}`}
                    >
                      {balancePreview <= 0
                        ? "Paid"
                        : Number(formData.paidAmount || 0) > 0
                        ? "Partial"
                        : "Pending"}
                    </span>
                  </div>

                  <div className="full-width">
                    <label>Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows="3"
                      placeholder="Enter expense details"
                    />
                  </div>

                  <div className="full-width">
                    <label>Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows="2"
                      placeholder="Additional notes"
                    />
                  </div>

                  <div className="full-width">
                    <label>Receipt / Bill Files</label>
                    <input
                      type="file"
                      name="receiptFiles"
                      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                      multiple
                      onChange={handleChange}
                    />
                    {!!formData.receiptFiles.length && (
                      <div className="canteen-selected-receipts">
                        {formData.receiptFiles.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className="canteen-receipt-chip"
                          >
                            <span>{file.name}</span>
                            <button
                              type="button"
                              onClick={() => removeSelectedReceipt(index)}
                            >
                              {"\u00D7"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {!!formData.existingReceipts.length && (
                      <div className="canteen-existing-receipts">
                        <small className="text-muted d-block mt-2">
                          Existing uploaded bills
                        </small>
                        <div className="canteen-selected-receipts">
                          {formData.existingReceipts.map((receipt, index) => (
                            <div
                              key={`${receipt.url}-${index}`}
                              className="canteen-receipt-chip existing"
                            >
                              <button
                                type="button"
                                className="canteen-receipt-link"
                                onClick={() =>
                                  openReceiptPreview(formData.existingReceipts, index)
                                }
                              >
                                {receipt.filename || `Bill ${index + 1}`}
                              </button>
                              <button
                                type="button"
                                onClick={() => removeExistingReceipt(index)}
                              >
                                {"\u00D7"}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="canteen-batch-header">
                    <div>
                      <label>Date</label>
                      <input
                        type="date"
                        name="expenseDate"
                        value={formData.expenseDate}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="canteen-batch-help">
                      One date, multiple vendors. Add one row per shop or bill.
                    </div>
                  </div>

                  <div className="canteen-batch-list">
                    {batchEntries.map((entry, index) => {
                      const entryBalance = Math.max(
                        Number(entry.amount || 0) - Number(entry.paidAmount || 0),
                        0
                      );
                      const entryStatus = entryBalance <= 0
                        ? "Paid"
                        : Number(entry.paidAmount || 0) > 0
                        ? "Partial"
                        : "Pending";

                      return (
                        <div key={`batch-entry-${index}`} className="canteen-batch-card">
                          <div className="canteen-batch-card-head">
                            <h6 className="mb-0">Entry {index + 1}</h6>
                            {batchEntries.length > 1 && (
                              <button
                                type="button"
                                className="canteen-row-remove-btn"
                                onClick={() => removeBatchEntryRow(index)}
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          <div className="canteen-form-grid">
                            <div>
                              <label>Title</label>
                              <input
                                type="text"
                                value={entry.title}
                                onChange={(e) =>
                                  handleBatchEntryChange(index, "title", e.target.value)
                                }
                                placeholder="Example: Grocery purchase"
                                required={index === 0}
                              />
                            </div>

                            <div>
                              <label>Category</label>
                              <select
                                value={entry.category}
                                onChange={(e) =>
                                  handleBatchEntryChange(index, "category", e.target.value)
                                }
                              >
                                {categories.map((cat) => (
                                  <option key={cat} value={cat}>
                                    {cat}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label>Vendor Name</label>
                              <input
                                type="text"
                                value={entry.vendorName}
                                onChange={(e) =>
                                  handleBatchEntryChange(index, "vendorName", e.target.value)
                                }
                                placeholder="Vendor / shop name"
                              />
                            </div>

                            <div>
                              <label>Bill Number</label>
                              <input
                                type="text"
                                value={entry.billNumber}
                                onChange={(e) =>
                                  handleBatchEntryChange(index, "billNumber", e.target.value)
                                }
                                placeholder="Invoice or bill number"
                              />
                            </div>

                            <div>
                              <label>Total Amount</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={entry.amount}
                                onChange={(e) =>
                                  handleBatchEntryChange(index, "amount", e.target.value)
                                }
                                placeholder="Enter amount"
                              />
                            </div>

                            <div>
                              <label>Paid Amount</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={entry.paidAmount}
                                onChange={(e) =>
                                  handleBatchEntryChange(index, "paidAmount", e.target.value)
                                }
                                placeholder="How much is already paid?"
                              />
                            </div>

                            <div>
                              <label>Due Date</label>
                              <input
                                type="date"
                                value={entry.dueDate}
                                onChange={(e) =>
                                  handleBatchEntryChange(index, "dueDate", e.target.value)
                                }
                              />
                            </div>

                            <div>
                              <label>Paid By</label>
                              <input
                                type="text"
                                value={entry.paidBy}
                                onChange={(e) =>
                                  handleBatchEntryChange(index, "paidBy", e.target.value)
                                }
                                placeholder="Who paid this amount?"
                              />
                            </div>

                            <div>
                              <label>Payment Method</label>
                              <select
                                value={entry.paymentMethod}
                                onChange={(e) =>
                                  handleBatchEntryChange(index, "paymentMethod", e.target.value)
                                }
                              >
                                {paymentMethods.map((method) => (
                                  <option key={method} value={method}>
                                    {method}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="full-width canteen-inline-summary">
                              <span>
                                Balance: <strong>{formatCurrency(entryBalance)}</strong>
                              </span>
                              <span
                                className={`canteen-status-badge ${getPaymentStatusClass(
                                  entryStatus
                                )}`}
                              >
                                {entryStatus}
                              </span>
                            </div>

                            <div className="full-width">
                              <label>Description</label>
                              <textarea
                                rows="3"
                                value={entry.description}
                                onChange={(e) =>
                                  handleBatchEntryChange(index, "description", e.target.value)
                                }
                                placeholder="Enter expense details"
                              />
                            </div>

                            <div className="full-width">
                              <label>Notes</label>
                              <textarea
                                rows="2"
                                value={entry.notes}
                                onChange={(e) =>
                                  handleBatchEntryChange(index, "notes", e.target.value)
                                }
                                placeholder="Additional notes"
                              />
                            </div>

                            <div className="full-width">
                              <label>Receipt / Bill Files</label>
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                                multiple
                                onChange={(e) =>
                                  handleBatchReceiptChange(index, e.target.files)
                                }
                              />
                              {!!entry.receiptFiles.length && (
                                <div className="canteen-selected-receipts">
                                  {entry.receiptFiles.map((file, fileIndex) => (
                                    <div
                                      key={`${file.name}-${fileIndex}`}
                                      className="canteen-receipt-chip"
                                    >
                                      <span>{file.name}</span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeSelectedBatchReceipt(index, fileIndex)
                                        }
                                      >
                                        {"\u00D7"}
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="canteen-batch-footer">
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={addBatchEntryRow}
                    >
                      + Add Another Vendor
                    </button>
                  </div>
                </>
              )}

              <div className="canteen-modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingExpense
                    ? "Update Expense"
                    : "Save All Entries"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



{isMobile && (
  <div
    className="rent-mobile-actionbar canteen-mobile-actionbar"
    aria-label="Canteen quick actions"
  >
   

    <button
      type="button"
      className="rent-mobile-actionbar-btn canteen-mobile-actionbar-btn"
      onClick={openAddModal}
    >
      <span className="rent-mobile-actionbar-icon canteen-mobile-actionbar-icon">
        <FaPlus />
      </span>
      <span>Add Expense</span>
    </button>

    <button
      type="button"
      className="rent-mobile-actionbar-btn canteen-mobile-actionbar-btn"
      onClick={openBudgetModal}
    >
      <span className="rent-mobile-actionbar-icon canteen-mobile-actionbar-icon">
        <FaChartLine />
      </span>
      <span>Set Budget</span>
    </button>
     <button
      type="button"
      className="rent-mobile-actionbar-btn canteen-mobile-actionbar-btn"
      onClick={() => setShowExportMenu((prev) => !prev)}
    >
      <span className="rent-mobile-actionbar-icon canteen-mobile-actionbar-icon">
        <FaDownload />
      </span>
      <span>Download</span>
    </button>
  </div>
)}

      {showBudgetModal && (
        <div className="canteen-modal-overlay">
          <div className="canteen-modal-box canteen-budget-modal">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="mb-0">Set Monthly Budget</h4>
              <button className="canteen-close-btn" onClick={closeBudgetModal}>
                {"\u00D7"}
              </button>
            </div>

            <form onSubmit={handleBudgetSave}>
              <div className="canteen-form-grid">
                <div>
                  <label>Month</label>
                  <input type="month" value={filters.month} readOnly />
                </div>

                <div>
                  <label>Budget Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={budgetForm.amount}
                    onChange={(e) =>
                      setBudgetForm((prev) => ({
                        ...prev,
                        amount: e.target.value,
                      }))
                    }
                    placeholder="Enter monthly budget"
                    required
                  />
                </div>

                <div className="full-width">
                  <label>Notes</label>
                  <textarea
                    rows="3"
                    value={budgetForm.notes}
                    onChange={(e) =>
                      setBudgetForm((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="Optional note for this month's target"
                  />
                </div>
              </div>

              <div className="canteen-modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeBudgetModal}
                  disabled={budgetSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={budgetSaving}
                >
                  {budgetSaving ? "Saving..." : "Save Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {false && showModal && (
        <div className="canteen-modal-overlay">
          <div className="canteen-modal-box">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="mb-0">
                {editingExpense ? "Edit Canteen Expense" : "Add Canteen Expense"}
              </h4>
              <button className="canteen-close-btn" onClick={closeModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="canteen-form-grid">
                <div>
                  <label>Date</label>
                  <input
                    type="date"
                    name="expenseDate"
                    value={formData.expenseDate}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label>Title</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Example: Grocery purchase"
                    required
                  />
                </div>

                <div>
                  <label>Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Amount</label>
                  <input
                    type="number"
                    name="amount"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="Enter amount"
                    required
                  />
                </div>

                <div>
                  <label>Vendor Name</label>
                  <input
                    type="text"
                    name="vendorName"
                    value={formData.vendorName}
                    onChange={handleChange}
                    placeholder="Vendor / shop name"
                  />
                </div>

                <div>
                  <label>Paid By</label>
                  <input
                    type="text"
                    name="paidBy"
                    value={formData.paidBy}
                    onChange={handleChange}
                    placeholder="Who paid this amount?"
                  />
                </div>

                <div>
                  <label>Payment Method</label>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleChange}
                  >
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="full-width">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Enter expense details"
                  />
                </div>

                <div className="full-width">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="2"
                    placeholder="Additional notes"
                  />
                </div>

                <div className="full-width">
                  <label>Receipt / Bill Image</label>
                  <input
                    type="file"
                    name="receiptImage"
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    onChange={handleChange}
                  />
                  {formData.receiptImage && (
                    <div className="receipt-preview-box">
                      <small>Selected File: {formData.receiptImage.name}</small>
                    </div>
                  )}
                  {editingExpense?.receiptImage && !formData.receiptImage && (
                    <small className="text-muted d-block mt-2">
                      Current receipt already exists. Choose a new file only if you want to replace it.
                    </small>
                  )}
                </div>
              </div>

              <div className="canteen-modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingExpense
                    ? "Update Expense"
                    : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewReceipts.length > 0 && (
        <div
          className="canteen-modal-overlay"
          onClick={closeReceiptPreview}
        >
          <div
            className="canteen-preview-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="mb-0">
                <FaReceipt /> Receipt Preview
              </h5>
              <button
                className="canteen-close-btn"
                onClick={closeReceiptPreview}
              >
                {"\u00D7"}
              </button>
            </div>

            <div className="canteen-preview-layout">
              <div className="canteen-preview-sidebar">
                {previewReceipts.map((receipt, index) => (
                  <button
                    key={`${receipt.url}-${index}`}
                    type="button"
                    className={`canteen-preview-tab ${
                      index === previewIndex ? "active" : ""
                    }`}
                    onClick={() => setActivePreviewIndex(index)}
                  >
                    {receipt.filename || `Bill ${index + 1}`}
                  </button>
                ))}
              </div>

              <div className="canteen-preview-stage">
                {previewReceipts.length > 1 && (
                  <div className="canteen-preview-counter">
                    Bill {previewIndex + 1} of {previewReceipts.length}
                  </div>
                )}

                {previewImage.toLowerCase().endsWith(".pdf") ? (
                  <iframe
                    src={previewImage}
                    title="Receipt Preview"
                    width="100%"
                    height="500px"
                    style={{ border: "none" }}
                  />
                ) : (
                  <img
                    src={previewImage}
                    alt="Receipt Preview"
                    className="canteen-preview-image"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {false && previewImage && (
        <div
          className="canteen-modal-overlay"
          onClick={() => setPreviewImage("")}
        >
          <div
            className="canteen-preview-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="mb-0">
                <FaReceipt /> Receipt Preview
              </h5>
              <button
                className="canteen-close-btn"
                onClick={() => setPreviewImage("")}
              >
                ×
              </button>
            </div>

            {previewImage.toLowerCase().endsWith(".pdf") ? (
              <iframe
                src={previewImage}
                title="Receipt Preview"
                width="100%"
                height="500px"
                style={{ border: "none" }}
              />
            ) : (
              <img
                src={previewImage}
                alt="Receipt Preview"
                className="canteen-preview-image"
              />
            )}
          </div>
        </div>
      )}



      {isMobile && showMobileFilters && (
  <div
    className="canteen-mobile-sheet-overlay"
    onClick={() => setShowMobileFilters(false)}
  >
    <div
      className="canteen-mobile-filter-sheet"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="canteen-mobile-sheet-handle" />

      <div className="canteen-mobile-sheet-head">
        <h5>Filters</h5>
        <button
          type="button"
          className="canteen-mobile-sheet-close"
          onClick={() => setShowMobileFilters(false)}
        >
          <FaTimes />
        </button>
      </div>

      <div className="canteen-mobile-filter-fields">
        <div className="canteen-mobile-field">
          <label>Month</label>
          <input
            type="month"
            value={filters.month}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, month: e.target.value }))
            }
          />
        </div>

        <div className="canteen-mobile-field">
          <label>Category</label>
          <select
            value={filters.category}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, category: e.target.value }))
            }
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="canteen-mobile-field">
          <label>Payment Status</label>
          <select
            value={filters.paymentStatus}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, paymentStatus: e.target.value }))
            }
          >
            <option value="">All Payment Status</option>
            {paymentStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="canteen-mobile-filter-actions">
        <button
          type="button"
          className="canteen-mobile-clear-btn"
          onClick={() =>
            setFilters((prev) => ({
              ...prev,
              category: "",
              paymentStatus: "",
              search: "",
            }))
          }
        >
          Clear
        </button>

        <button
          type="button"
          className="canteen-mobile-apply-btn"
          onClick={() => setShowMobileFilters(false)}
        >
          Apply Filters
        </button>
      </div>
    </div>
  </div>
)}
{isMobile && (
  <button
    type="button"
    className="canteen-mobile-fab"
    onClick={openAddModal}
  >
    <FaPlus />
  </button>
)}
    </div>
  );
}

export default CanteenExpense; 
