export function getPostLoginPath(bootstrap) {
  const role = bootstrap?.user?.role;
  const access = bootstrap?.access || {};

  if (role === "superadmin" || role === "superAdmin") {
    return "/superadmin";
  }

  if (access.needsPropertySelection) return "/property-types";

  if (access.needsUnitSetup) {
    return "/trial-unit-setup";
  }

  if (access.readOnly) return "/admin";

  if (access.expired || access.needsPayment || !access.canUseSystem) {
    return "/subscription-expired";
  }

  return "/admin";
}
