// Mirrors backend rbac.can(): the action must be in the user's effective actions and the module in their module list.
export function can(user, action, module) {
  if (!user || !(user.actions || []).includes(action)) return false;
  const mods = user.modules || [];
  return !module || !mods.length || mods.includes(module);
}

export function isAdminLayer(user) {
  return !!user && ["Admin", "DexterIndiaCompanyTeam"].includes(user.hierarchy);
}

export function canDecide(user) {
  if (!user) return false;
  if (user.canDecide !== undefined) return !!user.canDecide;
  return !!(user.officeAdmin || user.hierarchy === "Director" || user.functionalRole === "Verifier");
}
