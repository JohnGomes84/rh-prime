function parseBooleanFlag(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function isFeatureEnabled(name: string): boolean {
  const normalized = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  const directKey = `${normalized}_ENABLED`;
  if (parseBooleanFlag(process.env[directKey])) return true;

  const list = process.env.FEATURE_FLAGS;
  if (!list) return false;

  return list
    .split(",")
    .map((entry) => entry.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_"))
    .includes(normalized);
}
