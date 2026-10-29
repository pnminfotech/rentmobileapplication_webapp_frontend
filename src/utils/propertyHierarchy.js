const normalizeName = (value) => String(value || "").trim().toLowerCase();

function uniqueNames(values) {
  const seen = new Set();
  return values.map((value) => String(value || "").trim()).filter((value) => {
    const key = normalizeName(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getVisiblePropertyWings(location, wingFilter = "", floorFilter = "") {
  const savedWings = location.wings || [];
  const units = location.units || [];
  const wingNames = uniqueNames([
    ...savedWings.map((wing) => wing.name),
    ...units.map((unit) => unit.wingName || "No Wing"),
  ]);
  return (wingNames.length ? wingNames : ["No Wing"])
    .filter((name) => !wingFilter || normalizeName(name) === normalizeName(wingFilter))
    .map((name) => {
      const savedWing = savedWings.find((wing) => normalizeName(wing.name) === normalizeName(name));
      const unitFloors = units.filter((unit) => normalizeName(unit.wingName || "No Wing") === normalizeName(name)).map((unit) => unit.floorNo || "No Floor");
      const floors = uniqueNames([...(savedWing?.floors || []), ...(name === "No Wing" ? location.floors || [] : []), ...unitFloors]);
      return { name, floors: floorFilter ? floors.filter((floor) => normalizeName(floor) === normalizeName(floorFilter)) : floors };
    })
    .filter((wing) => !floorFilter || wing.floors.length > 0);
}
