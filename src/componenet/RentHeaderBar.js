import React from "react";
import { FaPlus, FaDownload, FaSearch, FaHistory, FaUpload } from "react-icons/fa";
import "./RentTracker.css";

function RentHeaderBar({
  selectedYear,
  years = [],
  searchText,
  searchDisabled = false,
  searchPlaceholder = "Search room, bed, name, mobile...",
  onYearChange,
  onSearchChange,
  onManageRooms,
  manageRoomsLabel = "Manage Rooms",
  onAddTenant,
  addTenantLabel = "Add Tenant",
  onImportTenants,
  onDownloadTemplate,
  importingTenants = false,
  downloadingTemplate = false,
  onDownloadExcel,
  onOpenHistory,
  isHistoryView = false,
}) {
  return (
    <div className="rent-header-card">
      <div className="rent-header-top">
        <div className="rent-toolbar">
          <select
            className="form-select rent-toolbar-select"
            value={selectedYear}
            onChange={onYearChange}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <div className="rent-toolbar-search">
            <FaSearch className="rent-toolbar-search-icon" />
            <input
              type="text"
              name="trackerSearch"
              autoComplete="off"
              placeholder={searchPlaceholder}
              className="form-control rent-toolbar-input"
              value={searchText}
              onChange={onSearchChange}
              disabled={searchDisabled}
            />
          </div>

          <div className="rent-toolbar-actions">
            <div className="rent-toolbar-actions-primary">
              <button
                type="button"
                className="btn rent-toolbar-action"
                onClick={onManageRooms}
              >
                <FaPlus className="me-1" /> {manageRoomsLabel}
              </button>

              <button
                type="button"
                className="btn rent-toolbar-action"
                onClick={onAddTenant}
              >
                <FaPlus className="me-1" /> {addTenantLabel}
              </button>
            </div>

            <div className="rent-toolbar-actions-secondary">
              <button
                type="button"
                className="btn rent-toolbar-action"
                onClick={onImportTenants}
                disabled={importingTenants}
              >
                <FaUpload className="me-1" />
                {importingTenants ? "Importing..." : "Import"}
              </button>

              <button
                type="button"
                className="btn rent-toolbar-action"
                onClick={onDownloadTemplate}
                disabled={downloadingTemplate}
              >
                <FaDownload className="me-1" />
                {downloadingTemplate ? "Preparing..." : "Download Template"}
              </button>

              <button
                type="button"
                className="btn rent-toolbar-action"
                onClick={onDownloadExcel}
              >
                <FaDownload className="me-1" />
                Download Excel
              </button>

              <button
                type="button"
                className="btn rent-toolbar-action"
                onClick={onOpenHistory}
              >
                <FaHistory className="me-1" />
                {isHistoryView ? "Active Tenants" : "History"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RentHeaderBar;
