import type { CarePlan, Patient } from "./types";

export type PatientSummary = { key: string; patient_id: string; name: string; primary_language: string; source: "example" | "entered" };
export type PatientInput = Omit<Patient, "patient_id">;

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(`${API}${path}`, { ...init, cache: "no-store" }); }
  catch { throw new Error("Cannot reach the demo backend. Check that it is running, then retry."); }
  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const body = await response.json();
      if (Array.isArray(body.detail)) message = body.detail.map((item: { loc?: string[]; msg?: string }) => `${item.loc?.join(".")}: ${item.msg}`).join("; ");
      else if (body.detail?.message) message = body.detail.message;
    } catch { /* Keep status message. */ }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export const getPatient = (key: string, signal?: AbortSignal) => request<Patient>(`/api/v1/patients/${encodeURIComponent(key === "a" || key === "b" ? `mock-patient-${key}` : key)}`, { signal });
export const listPatients = () => request<PatientSummary[]>("/api/v1/patients");
export const createPatient = (patient: PatientInput) => request<Patient>("/api/v1/patients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patient) });
export const getHealth = () => request<{ status: string }>("/health");
export const synthesize = (patient: Patient, useMockAi: boolean) => request<CarePlan>("/api/v1/synthesize-care-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patient, use_mock_ai: useMockAi }) });
export const previewNote = (carePlan: CarePlan) => request<{ note: string; exported: boolean }>("/api/v1/export-note-preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ care_plan: carePlan }) });
