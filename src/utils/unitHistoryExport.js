import * as XLSX from "xlsx";

const valueOrBlank = (value) => value == null ? "" : value;
const amountOrBlank = (value) => value == null || value === "" || !Number.isFinite(Number(value)) ? "" : Number(value);
const dateOrBlank = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date;
};
const cycleLabel = (value) => value === "ADVANCE_PAID" ? "Pay at joining" : value === "NOT_PAID" ? "Pay at month end" : "";
const reasonLabel = (value) => ({ shifted: "Moved to another unit", left: "Tenant left", removed: "Tenant record removed", unassigned: "Unit unassigned" }[value] || "");
const canteenPlanLabel = (value) => ({ full_package: "Full package", per_meal: "Per meal", meal_package: "Meal package" }[value] || valueOrBlank(value));

export function createUnitHistoryWorkbook(history, room, bedNo = "") {
  const records = Array.isArray(history.records) ? history.records : [];
  const roomBeds = Array.isArray(room.beds) ? room.beds : [];
  const selectedBed = bedNo
    ? roomBeds.find((bed) => String(bed.bedNo).trim().toLowerCase() === String(bedNo).trim().toLowerCase())
    : room.propertyType !== "bed" ? room.beds?.[0] : null;
  const type = room.propertyType === "shop" ? "Commercial Shop" : room.propertyType === "room" ? "Residential Room" : "Hostel";
  const info = [
    ["Unit history", ""],
    ["Property type", type],
    ["Property / building", valueOrBlank(room.category)],
    ["Wing", valueOrBlank(room.wingName)],
    ["Floor", valueOrBlank(room.floorNo)],
    [room.propertyType === "shop" ? "Shop number" : "Room number", valueOrBlank(room.roomNo)],
    ["Bed number", bedNo],
    ["Bed category", valueOrBlank(selectedBed?.bedCategory)],
    ["Beds in room", room.propertyType === "bed" ? roomBeds.length : ""],
    ["Room category", valueOrBlank(room.roomCategory)],
    ["Unit type", valueOrBlank(room.flatType)],
    ["Meter number", valueOrBlank(room.meterNo)],
    ["Last meter reading", amountOrBlank(room.lastMeterReading)],
    ["Current unit rent (Rs.)", amountOrBlank(selectedBed?.price)],
    ["Total tenants", Number(history.totalTenants || 0)],
    ["Total stays", Number(history.totalStays || 0)],
    ["Current tenants", records.filter((record) => record.status === "Current").length],
    ["Current tenant names", records.filter((record) => record.status === "Current").map((record) => record.tenantName).filter(Boolean).join(", ")],
    ["History note", "Older moves may be missing when unit details were not recorded."],
  ];
  const headers = ["Property type", "Property / building", "Wing", "Floor", "Room / shop number", "Bed number", "Current bed category", "Current unit rent (Rs.)", "Unit type", "Meter number", "Last meter reading", "Tenant Sr No", "Tenant", "Phone", "Status", "Stay started", "Stay ended", "Joining date", "Date of birth", "College joining date", "Monthly rent (Rs.)", "Deposit (Rs.)", "Rent cycle", "Full address", "House number", "Address", "Nearby place", "City", "State", "Pincode", "Family members", "Contact 1 relation", "Contact 1 name", "Contact 1 phone", "Contact 1 address", "Contact 2 relation", "Contact 2 name", "Contact 2 phone", "Contact 2 address", "Shop name", "Business", "Business address", "Canteen", "Canteen plan", "Canteen start", "Canteen monthly amount (Rs.)", "Canteen meals", "Breakfast price (Rs.)", "Lunch price (Rs.)", "Dinner price (Rs.)", "End reason", "Record source"];
  const rows = records.map((record) => {
    const details = record.tenantDetails || {};
    const historyBed = room.propertyType === "bed"
      ? roomBeds.find((bed) => String(bed.bedNo).trim().toLowerCase() === String(record.bedNo || "").trim().toLowerCase())
      : selectedBed;
    const fullAddress = [details.houseNo, details.address, details.nearbyPlace, details.city, details.state, details.pincode].filter(Boolean).join(", ");
    const meals = Array.isArray(details.canteenIncludedMeals) ? details.canteenIncludedMeals.join(", ") : "";
    const mealPrices = details.canteenMealPrices || {};
    return [
      type, valueOrBlank(record.category || room.category), valueOrBlank(record.wingName ?? room.wingName), valueOrBlank(record.floorNo || room.floorNo),
      valueOrBlank(record.roomNo || room.roomNo), valueOrBlank(record.bedNo), valueOrBlank(historyBed?.bedCategory), amountOrBlank(historyBed?.price),
      valueOrBlank(room.flatType), valueOrBlank(room.meterNo), amountOrBlank(room.lastMeterReading), valueOrBlank(record.tenantSrNo),
      valueOrBlank(record.tenantName), valueOrBlank(record.phoneNo), valueOrBlank(record.status),
      dateOrBlank(record.startedAt), dateOrBlank(record.endedAt), dateOrBlank(record.joiningDate), dateOrBlank(details.dob), dateOrBlank(details.dateOfJoiningCollege),
      amountOrBlank(record.monthlyRent), amountOrBlank(record.depositAmount), cycleLabel(details.firstRentStatus),
      fullAddress, valueOrBlank(details.houseNo), valueOrBlank(details.address), valueOrBlank(details.nearbyPlace), valueOrBlank(details.city),
      valueOrBlank(details.state), valueOrBlank(details.pincode), valueOrBlank(details.familyMembers),
      valueOrBlank(details.relative1Relation), valueOrBlank(details.relative1Name), valueOrBlank(details.relative1Phone), valueOrBlank(details.relativeAddress1),
      valueOrBlank(details.relative2Relation), valueOrBlank(details.relative2Name), valueOrBlank(details.relative2Phone), valueOrBlank(details.relativeAddress2),
      valueOrBlank(details.shopName), valueOrBlank(details.shopBusiness), valueOrBlank(details.companyAddress),
      details.hasCanteen ? "Included" : "", canteenPlanLabel(details.canteenPlanType), dateOrBlank(details.canteenStartDate),
      amountOrBlank(details.canteenMonthlyAmount), meals, amountOrBlank(mealPrices.breakfast), amountOrBlank(mealPrices.lunch), amountOrBlank(mealPrices.dinner),
      reasonLabel(record.endReason),
      record.source === "existing_record" ? "Existing tenant record; start date based on joining date" : "Recorded stay",
    ];
  });
  const workbook = XLSX.utils.book_new();
  const unitSheet = XLSX.utils.aoa_to_sheet(info);
  unitSheet["!cols"] = [{ wch: 25 }, { wch: 70 }];
  const historySheet = XLSX.utils.aoa_to_sheet([headers, ...rows], { cellDates: true, dateNF: "dd mmm yyyy" });
  historySheet["!cols"] = headers.map((header) => ({ wch: Math.min(38, Math.max(16, header.length + 3)) }));
  historySheet["!autofilter"] = { ref: `A1:${XLSX.utils.encode_col(headers.length - 1)}${Math.max(1, rows.length + 1)}` };
  XLSX.utils.book_append_sheet(workbook, unitSheet, "Unit details");
  XLSX.utils.book_append_sheet(workbook, historySheet, "Tenant history");
  if (room.propertyType === "bed") {
    const bedsToExport = bedNo ? (selectedBed ? [selectedBed] : []) : [...roomBeds];
    if (!bedNo) {
      const knownBeds = new Set(bedsToExport.map((bed) => String(bed.bedNo || "").trim().toLowerCase()));
      records.forEach((record) => {
        const previousBedNo = String(record.bedNo || "").trim();
        if (previousBedNo && !knownBeds.has(previousBedNo.toLowerCase())) {
          bedsToExport.push({ bedNo: previousBedNo, historicalOnly: true });
          knownBeds.add(previousBedNo.toLowerCase());
        }
      });
    }
    const bedHeaders = ["Bed number", "Bed category", "Current rent (Rs.)", "Bed status", "Current tenants", "Total tenants", "Total stays"];
    const bedRows = bedsToExport.map((bed) => {
      const stays = records.filter((record) => String(record.bedNo || "").trim().toLowerCase() === String(bed.bedNo || "").trim().toLowerCase());
      const tenantKeys = stays.map((record) => String(record.tenantId || `${record.tenantName || ""}|${record.phoneNo || ""}`));
      return [valueOrBlank(bed.bedNo), valueOrBlank(bed.bedCategory), amountOrBlank(bed.price), bed.historicalOnly ? "Historical only" : "Configured",
        stays.filter((record) => record.status === "Current").map((record) => record.tenantName).filter(Boolean).join(", "),
        new Set(tenantKeys).size, stays.length];
    });
    const bedsSheet = XLSX.utils.aoa_to_sheet([bedHeaders, ...bedRows]);
    bedsSheet["!cols"] = bedHeaders.map((header) => ({ wch: Math.max(18, header.length + 3) }));
    bedsSheet["!autofilter"] = { ref: `A1:${XLSX.utils.encode_col(bedHeaders.length - 1)}${Math.max(1, bedRows.length + 1)}` };
    XLSX.utils.book_append_sheet(workbook, bedsSheet, "Bed details");
  }
  return workbook;
}

export function unitHistoryFilename(room, bedNo = "") {
  const unitType = room.propertyType === "shop" ? "Shop" : "Room";
  const parts = ["Unit History", room.category, unitType, room.roomNo, bedNo && `Bed ${bedNo}`].filter(Boolean);
  const safeName = parts.join(" ").replace(/[<>:"/\\|?*]/g, " ")
    .split("").map((character) => character.charCodeAt(0) < 32 ? " " : character).join("")
    .replace(/\s+/g, " ").trim().slice(0, 140);
  return `${safeName || "Unit History"}.xlsx`;
}

export function downloadUnitHistory(history, room, bedNo = "") {
  XLSX.writeFile(createUnitHistoryWorkbook(history, room, bedNo), unitHistoryFilename(room, bedNo));
}
