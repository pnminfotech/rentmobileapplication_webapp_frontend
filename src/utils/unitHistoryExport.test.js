import * as XLSX from "xlsx";
import { createUnitHistoryWorkbook, unitHistoryFilename } from "./unitHistoryExport";

const room = {
  propertyType: "bed", category: "Vedant/West", wingName: "A", floorNo: "1", roomNo: "101",
  meterNo: "M-101", roomCategory: "Standard", beds: [{ bedNo: "B1", bedCategory: "Lower", price: 3000 }, { bedNo: "B2", bedCategory: "Upper", price: 2500 }],
};

test("exports unit details and every tenant stay with usable dates and amounts", () => {
  const history = {
    totalTenants: 1, totalStays: 2,
    records: [
      { tenantId: "tenant-1", tenantSrNo: 18, tenantName: "Asha", phoneNo: "0123456789", status: "Former", bedNo: "B1", startedAt: "2025-01-01T00:00:00.000Z", endedAt: "2025-06-01T00:00:00.000Z", monthlyRent: 3000, depositAmount: 5000, source: "existing_record", tenantDetails: { firstRentStatus: "ADVANCE_PAID", address: "Ambethan", city: "Pune", state: "Maharashtra", pincode: "410501", hasCanteen: true, canteenPlanType: "per_meal", canteenMonthlyAmount: 500, canteenIncludedMeals: ["lunch"], canteenMealPrices: { lunch: 50 } } },
      { tenantId: "tenant-1", tenantName: "Asha", status: "Current", category: "Old Building", roomNo: "99", bedNo: "B1", monthlyRent: 0, depositAmount: null, source: "recorded" },
    ],
  };
  const workbook = createUnitHistoryWorkbook(history, room, "B1");
  const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx", cellDates: true });
  const reopened = XLSX.read(bytes, { type: "array", cellDates: true });
  expect(reopened.SheetNames).toEqual(["Unit details", "Tenant history", "Bed details"]);
  const info = XLSX.utils.sheet_to_json(reopened.Sheets["Unit details"], { header: 1, defval: "" });
  expect(info.find((row) => row[0] === "Total tenants")[1]).toBe(1);
  expect(info.find((row) => row[0] === "Total stays")[1]).toBe(2);
  expect(info.find((row) => row[0] === "Current unit rent (Rs.)")[1]).toBe(3000);
  const rows = XLSX.utils.sheet_to_json(reopened.Sheets["Tenant history"], { defval: "", raw: true });
  expect(rows).toHaveLength(2);
  expect(rows[0].Phone).toBe("0123456789");
  expect(rows[0]["Stay started"]).toBeInstanceOf(Date);
  expect(rows[0]["Monthly rent (Rs.)"]).toBe(3000);
  expect(rows[0]["Rent cycle"]).toBe("Pay at joining");
  expect(rows[0]["Record source"]).toContain("joining date");
  expect(rows[0]["Property / building"]).toBe("Vedant/West");
  expect(rows[0]["Room / shop number"]).toBe("101");
  expect(rows[0]["Current bed category"]).toBe("Lower");
  expect(rows[0]["Tenant Sr No"]).toBe(18);
  expect(rows[0]["Full address"]).toBe("Ambethan, Pune, Maharashtra, 410501");
  expect(rows[0]["Canteen meals"]).toBe("lunch");
  expect(rows[0]["Canteen plan"]).toBe("Per meal");
  expect(rows[0]["Lunch price (Rs.)"]).toBe(50);
  expect(rows[1]["Monthly rent (Rs.)"]).toBe(0);
  expect(rows[1]["Property / building"]).toBe("Old Building");
  expect(rows[1]["Room / shop number"]).toBe("99");
  const beds = XLSX.utils.sheet_to_json(reopened.Sheets["Bed details"], { defval: "" });
  expect(beds).toHaveLength(1);
  expect(beds[0]["Total tenants"]).toBe(1);
  expect(beds[0]["Total stays"]).toBe(2);
  expect(beds[0]["Current tenants"]).toBe("Asha");
});

test("exports current and historical beds when downloading a hostel room history", () => {
  const workbook = createUnitHistoryWorkbook({ totalTenants: 2, totalStays: 2, records: [{ tenantId: "1", tenantName: "Asha", bedNo: "B1", status: "Current" }, { tenantId: "2", tenantName: "Former", bedNo: "B3", status: "Former" }] }, room);
  const beds = XLSX.utils.sheet_to_json(workbook.Sheets["Bed details"], { defval: "" });
  expect(beds).toHaveLength(3);
  expect(beds[0]["Current tenants"]).toBe("Asha");
  expect(beds[1]["Total tenants"]).toBe(0);
  expect(beds[1]["Current rent (Rs.)"]).toBe(2500);
  expect(beds[2]["Bed status"]).toBe("Historical only");
  expect(beds[2]["Total tenants"]).toBe(1);
});

test("exports an empty history and creates a safe filename", () => {
  const workbook = createUnitHistoryWorkbook({ totalTenants: 0, totalStays: 0, records: [] }, room, "B1");
  expect(XLSX.utils.sheet_to_json(workbook.Sheets["Tenant history"])).toHaveLength(0);
  expect(unitHistoryFilename(room, "B1")).toBe("Unit History Vedant West Room 101 Bed B1.xlsx");
  expect(unitHistoryFilename({ ...room, category: "A\u0000/B" }, "B1")).toBe("Unit History A B Room 101 Bed B1.xlsx");
});

test.each([["room", "Residential Room", "Room number"], ["shop", "Commercial Shop", "Shop number"]])(
  "exports %s details without requiring a bed selection",
  (propertyType, label, numberLabel) => {
    const unit = { propertyType, category: "Royals", roomNo: "12", beds: [{ bedNo: "PRIMARY", price: 0 }] };
    const workbook = createUnitHistoryWorkbook({ totalTenants: 0, totalStays: 0, records: [] }, unit);
    const info = XLSX.utils.sheet_to_json(workbook.Sheets["Unit details"], { header: 1, defval: "" });
    expect(info.find((row) => row[0] === "Property type")[1]).toBe(label);
    expect(info.find((row) => row[0] === numberLabel)[1]).toBe("12");
    expect(info.find((row) => row[0] === "Current unit rent (Rs.)")[1]).toBe(0);
  }
);
