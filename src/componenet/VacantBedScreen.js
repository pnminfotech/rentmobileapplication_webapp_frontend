import React from "react";
import VacantBedListView from "./VacantBedListView";
import "./VacantBedScreen.css";

function VacantBedScreen({
  beds = [],
  onAddTenant,
  onBack,
  title = "Vacant Beds",
  subtitle = "Tap a bed to add a tenant",
  trackerType = "bed",
}) {
  return (
    <div className="vacant-mobile-screen">
      <div className="vacant-mobile-screen-shell">
        <VacantBedListView
          beds={beds}
          title={title}
          subtitle={subtitle}
          trackerType={trackerType}
          onAddTenant={onAddTenant}
          onBack={onBack}
        />
      </div>
    </div>
  );
}

export default VacantBedScreen;
