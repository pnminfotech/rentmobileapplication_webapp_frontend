export async function lookupIndianPincode(pincode, signal) {
  const response = await fetch(
    `https://api.postalpincode.in/pincode/${pincode}`,
    { signal }
  );
  if (!response.ok) throw new Error("PIN code lookup failed.");

  const payload = await response.json();
  const result = Array.isArray(payload) ? payload[0] : null;
  const offices = Array.isArray(result?.PostOffice) ? result.PostOffice : [];
  const office = offices.find((item) => item?.DeliveryStatus === "Delivery") || offices[0];
  if (!office || String(result?.Status || "").toLowerCase() !== "success") {
    throw new Error("PIN code details not found.");
  }

  return {
    city: office.District || office.Name || "",
    state: office.State || "",
    nearbyPlace: office.Name || "",
  };
}
