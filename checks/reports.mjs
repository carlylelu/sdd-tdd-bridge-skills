// Shared structural rules. Passing structure never proves that the evidence was produced honestly.
export function assertReport(report, expected) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) throw new Error('Report must be an object');
  for (const [key, value] of Object.entries(expected)) if (report[key] !== value) throw new Error(`Report ${key} must be ${value}`);
  if (report.schema_version !== 1 || report.result !== 'PASS') throw new Error('Report is failed or unsupported');
  if (typeof report.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(report.fingerprint)) throw new Error('Report fingerprint is missing or invalid');
  if (typeof report.checked_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(report.checked_at) || !Number.isFinite(Date.parse(report.checked_at)) || new Date(report.checked_at).toISOString() !== report.checked_at || Date.parse(report.checked_at) > Date.now() + 300_000) throw new Error('Report timestamp must be an actual UTC ISO string, not in the future');
  for (const field of ['evidence', 'outputs']) if (!Array.isArray(report[field]) || !report[field].length || report[field].some(s => typeof s !== 'string' || !s.trim())) throw new Error(`Report lacks ${field}`);
  if (typeof report.next_action !== 'string' || !report.next_action.trim()) throw new Error('Report lacks next_action');
  if (!Array.isArray(report.issues) || report.issues.length) throw new Error('Passing report must have no unresolved issues');
}
