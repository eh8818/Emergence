export type ShapValue = { feature: string; label: string; shap_value: number; direction: string };
export type PgxFinding = { gene: string; diplotype: string | null; phenotype: string | null; interpretation: string; available: boolean };
export type Evidence = { medication: string; status: "available" | "none" | "unavailable"; message: string; genes_to_review?: { gene: string; diplotype: string | null; phenotype: string | null; available: boolean }[]; annotations: { accession_id: string; level: string | null; name: string | null }[]; guidelines: { accession_id: string; level: string | null; name: string | null }[]; source?: string };
export type DashboardRequest = { disease_context: "psychiatric" | "cardiovascular"; subtype: string; selected_medications: string[]; patient_context: Record<string, number>; location: { city: string; province: string; postal_code: string } };
export type Dashboard = {
  meta: { generated_at: string; clinical_disclaimer: string };
  patient: { display_name: string; location: DashboardRequest["location"] };
  pgx_profile: { source: string; findings: PgxFinding[]; complete_profile_available: boolean };
  medication_evidence: Evidence[];
  canadian_population_context: { source_label: string; prescription_coverage_percent: number; prescription_medication_use_percent: number; cost_related_non_adherence_percent: number; respondents: number };
  sdoh_model: { target: string; estimated_probability_percent: number; disclaimer: string; local_shap_values: ShapValue[]; shap_disclaimer: string };
  personalized_treatment_considerations: { genomic_considerations: string[]; medication_evidence_considerations: string[]; access_considerations: string[]; monitoring_and_uncertainty: string[]; clinical_review_required: boolean };
  community_supports: { resources: { name: string; category: string; website_url: string; source_url: string; description: string; relevance_reason: string; availability_disclaimer: string }[]; message: string; disclaimer: string };
  clinician_note: { title: string; text: string; footer: string };
};

const BASE = process.env.NEXT_PUBLIC_EMERGENCE_API_BASE_URL || "http://127.0.0.1:8002";
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(`${BASE}${path}`, { ...init, cache: "no-store" }); }
  catch { throw new Error("Emergence backend unavailable. Start the API and try again."); }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : `Request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}
export const fetchDashboard = (payload: DashboardRequest) => request<Dashboard>("/api/dashboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
export const fetchGlobalShap = () => request<{ features: { feature: string; label: string; mean_abs_shap: number }[]; disclaimer: string }>("/api/sdoh/global");
