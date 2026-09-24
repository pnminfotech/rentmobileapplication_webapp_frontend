import React from "react";
import LeavedTenantListView from "./LeavedTenantListView";
import "./LeavedTenantScreen.css";

function LeavedTenantScreen({
  tenants = [],
  onOpenHistory,
  onUndo,
  onDownload,
  onBack,
}) {
  return (
    <div className="leaved-mobile-screen">
      <div className="leaved-mobile-screen-shell">
        <LeavedTenantListView
          tenants={tenants}
          onOpenHistory={onOpenHistory}
          onUndo={onUndo}
          onDownload={onDownload}
          onBack={onBack}
        />
      </div>
    </div>
  );
}

export default LeavedTenantScreen;
