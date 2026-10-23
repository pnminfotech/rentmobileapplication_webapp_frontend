export const UNIT_TYPES = [
  { value: "bed", label: "Hostel Beds", quotaKey: "beds" },
  { value: "room", label: "Residential Rooms", quotaKey: "rooms" },
  { value: "shop", label: "Commercial Shop", quotaKey: "shops" },
];

export function getUnitLimits(source = {}) {
  const candidates = [
    source?.limits,
    source?.subscription?.units,
    source?.units,
    source?.unitAllocation,
    source?.organization?.unitAllocation,
    source,
  ].filter((value) => value && typeof value === "object");
  const limits = candidates.find((value) =>
    ["beds", "rooms", "shops"].some((key) => Number(value[key] || 0) > 0)
  ) || candidates[0] || {};

  return {
    beds: Number(limits.beds || 0),
    rooms: Number(limits.rooms || 0),
    shops: Number(limits.shops || 0),
  };
}

export function allowedUnitTypes(source = {}) {
  const limits = getUnitLimits(source);
  const selected = UNIT_TYPES.filter((type) => limits[type.quotaKey] > 0);
  if (selected.length) return selected;

  const businessType = String(
    source?.organization?.businessType || source?.businessType || ""
  ).toLowerCase();
  if (businessType === "hostel") return UNIT_TYPES.filter((type) => type.value === "bed");
  if (businessType === "rooms") return UNIT_TYPES.filter((type) => type.value === "room");
  if (businessType === "shops") return UNIT_TYPES.filter((type) => type.value === "shop");

  // Unit allocation is the permission source. Do not expose property screens
  // when it is missing or cannot be loaded.
  return [];
}

export function firstAllowedType(source = {}) {
  return allowedUnitTypes(source)[0]?.value || "bed";
}

export function isTypeAllowed(type, source = {}) {
  return allowedUnitTypes(source).some((item) => item.value === type);
}
