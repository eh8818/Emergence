"use client";

import { useState } from "react";
import { createPatient } from "@/lib/api";
import type { Patient } from "@/lib/types";

type FormValues = {
  name: string; age: string; language: string; postal: string; income: string;
  diagnosis: string; allergies: string; prescriptions: string; biomarkers: string;
  insurance: string; transportation: string; financial: string; caregiver: string; literacy: string;
};
const empty: FormValues = { name: "", age: "", language: "", postal: "", income: "", diagnosis: "", allergies: "", prescriptions: "", biomarkers: "", insurance: "", transportation: "", financial: "", caregiver: "", literacy: "" };
const recorded = (value: string) => value.trim() || "Not recorded";
const lines = (value: string) => value.split(/\n|,/).map(item => item.trim()).filter(Boolean);

export function NewPatientForm({ onCreated, onCancel }: { onCreated: (patient: Patient) => void; onCancel: () => void }) {
  const [values, setValues] = useState<FormValues>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  function field(key: keyof FormValues, label: string, required = false, type = "text") {
    return <label className="new-patient-field" key={key}><span>{label}{required && " *"}</span><input type={type} value={values[key]} required={required} min={type === "number" ? 0 : undefined} max={type === "number" ? 18 : undefined} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))}/></label>;
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const patient = await createPatient({
        name: values.name.trim(), age_years: Number(values.age),
        demographics: { primary_language: values.language.trim(), zip_code: recorded(values.postal), household_income_level: recorded(values.income) },
        molecular_profile: { diagnosis: values.diagnosis.trim(), allergies: lines(values.allergies), current_prescriptions: lines(values.prescriptions), biomarkers: lines(values.biomarkers) },
        sdoh_profile: { insurance_status: recorded(values.insurance), transportation_access: recorded(values.transportation), financial_strain: recorded(values.financial), caregiver_availability: recorded(values.caregiver), health_literacy_level: recorded(values.literacy) },
      });
      onCreated(patient);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Patient could not be saved."); }
    finally { setSaving(false); }
  }
  return <section id="new-patient-form" className="new-patient-panel" aria-labelledby="new-patient-title"><header className="pane-header"><h2 id="new-patient-title">Add Patient</h2><span>Stored in local care-coordination backend</span></header><form onSubmit={save}>
    <p className="rail-caution">Enter fictional information only. This local demo store has no user accounts or production privacy controls. Medication and allergy entries need clinician verification.</p>
    <div className="new-patient-group"><h3>Patient and clinical context</h3><div className="new-patient-fields">{field("name", "Patient name", true)}{field("age", "Age in years (0–18)", true, "number")}{field("language", "Primary language", true)}{field("postal", "Postal / ZIP code")}{field("diagnosis", "Recorded diagnosis", true)}{field("income", "Household income or financial context")}</div></div>
    <div className="new-patient-group"><h3>Medication and safety information</h3><p>Separate multiple entries with commas or line breaks. Leave blank if unknown.</p><div className="new-patient-fields">{field("allergies", "Recorded allergies")}{field("prescriptions", "Current prescriptions")}{field("biomarkers", "Recorded biomarkers")}</div><p className="rail-caution">No medication decision should be made from an unverified entry. Clinician review required.</p></div>
    <div className="new-patient-group"><h3>Access and caregiving</h3><div className="new-patient-fields">{field("insurance", "Coverage status")}{field("transportation", "Transportation access")}{field("financial", "Financial strain")}{field("caregiver", "Caregiver availability")}{field("literacy", "Health literacy or communication needs")}</div></div>
    {error && <div className="notice notice--error" role="alert">{error}<button type="button" onClick={() => setError("")}>Dismiss</button></div>}
    <div className="new-patient-actions"><span>* Required. Other blanks are stored as “Not recorded.”</span><button type="button" onClick={onCancel} disabled={saving}>Cancel</button><button type="submit" className="action-primary" disabled={saving}>{saving ? "Saving…" : "Save patient"}</button></div>
  </form></section>;
}
