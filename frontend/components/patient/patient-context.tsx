"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, CircleAlert, FileText, HeartPulse, Pill, ShieldAlert, UserRound } from "lucide-react";
import type { CarePlan, Patient } from "@/lib/types";

type Section = "snapshot" | "diagnoses" | "medications" | "allergies" | "molecular" | "access" | "team" | "documents" | "plans";
export function PatientContext({ patient, plan }: { patient: Patient; plan: CarePlan | null }) {
  const [open, setOpen] = useState<Set<Section>>(new Set(["snapshot", "access"]));
  const toggle = (id: Section) => setOpen(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const access = patient.sdoh_profile;
  const needs = patient.demographics.primary_language !== "English";
  const rows: [string, string, string][] = [
    ["Insurance", access.insurance_status, "Verify"],
    ["Transportation", access.transportation_access, "Review"],
    ["Language", patient.demographics.primary_language, needs ? "Interpreter" : "Recorded"],
    ["Caregiver", access.caregiver_availability, "Review"],
    ["Financial", access.financial_strain, "Review"],
  ];
  const sections: { id: Section; title: string; icon: typeof UserRound; count?: number; body: React.ReactNode }[] = [
    { id: "snapshot", title: "Snapshot", icon: UserRound, body: <dl className="key-value">
      <div><dt>Age</dt><dd>{patient.age_years} years</dd></div><div><dt>Language</dt><dd>{patient.demographics.primary_language}</dd></div>
      <div><dt>Insurance</dt><dd>{access.insurance_status}</dd></div><div><dt>Pharmacy</dt><dd>Not recorded</dd></div>
      <div><dt>Transportation</dt><dd>{access.transportation_access}</dd></div><div><dt>Caregiver</dt><dd>{access.caregiver_availability}</dd></div>
      <div><dt>Health literacy</dt><dd>{access.health_literacy_level}</dd></div><div><dt>Upcoming visit</dt><dd>Not recorded</dd></div>
      <div><dt>Last plan</dt><dd>{plan ? new Date(plan.synthesis_timestamp).toLocaleString() : "None in this session"}</dd></div>
      <div><dt>Coordinator</dt><dd>Not assigned in demo</dd></div>
    </dl> },
    { id: "diagnoses", title: "Diagnoses", icon: HeartPulse, count: 1, body: <p className="rail-copy">{patient.molecular_profile.diagnosis}</p> },
    { id: "medications", title: "Medications", icon: Pill, count: patient.molecular_profile.current_prescriptions.length, body: <><p className="rail-copy">{patient.molecular_profile.current_prescriptions.join("; ")}</p><p className="rail-caution">Clinician review required before any medication decision.</p></> },
    { id: "allergies", title: "Allergies", icon: ShieldAlert, count: patient.molecular_profile.allergies.length, body: <><p className="rail-copy">{patient.molecular_profile.allergies.join(", ") || "No allergies recorded — verify"}</p><p className="rail-caution">Verify with the patient and care team.</p></> },
    { id: "molecular", title: "Molecular Profile", icon: FileText, count: patient.molecular_profile.biomarkers.length, body: <dl className="key-value"><div><dt>Biomarker</dt><dd>{patient.molecular_profile.biomarkers.join("; ") || "Not recorded"}</dd></div><div><dt>Implication</dt><dd>Unverified; clinician interpretation required</dd></div></dl> },
    { id: "access", title: "SDOH / Access Barriers", icon: CircleAlert, count: patient.patient_id === "DEMO-PEDI-8842" ? 5 : patient.patient_id === "DEMO-PEDI-8841" ? 0 : undefined, body: <div className="rail-table-wrap"><table className="data-table access-table"><thead><tr><th>Domain</th><th>Finding</th><th>Status</th></tr></thead><tbody>{rows.map(([domain, finding, status]) => <tr key={domain}><th scope="row">{domain}</th><td>{finding}</td><td><span className={status === "Recorded" ? "text-muted" : "text-warning"}>{status}</span></td></tr>)}</tbody></table><p className="rail-disclaimer">Entered information requires care-team verification; benefits and resources are unknown until confirmed.</p></div> },
    { id: "team", title: "Care Team", icon: UserRound, body: <p className="rail-copy">No assigned team members in the fictional record. Draft tasks identify proposed roles.</p> },
    { id: "documents", title: "Documents", icon: FileText, body: <p className="rail-copy">No documents attached to this demo chart.</p> },
    { id: "plans", title: "Prior Plans", icon: FileText, count: plan ? 1 : 0, body: <p className="rail-copy">{plan ? "Current session draft available in the Plan workspace." : "No prior plan available in this demo."}</p> },
  ];
  return <section className="workspace-region chart-rail" id="clinical-context" aria-labelledby="chart-rail-title">
    <header className="pane-header"><h2 id="chart-rail-title">Chart Review / Navigator</h2><span>Read-only demo record</span></header>
    <div className="chart-accordions">{sections.map(({ id, title, icon: Icon, count, body }) => <div className="chart-section" key={id}>
      <button className="chart-section__toggle" type="button" aria-expanded={open.has(id)} aria-controls={"chart-section-" + id} onClick={() => toggle(id)}>
        {open.has(id) ? <ChevronDown size={13} aria-hidden="true" /> : <ChevronRight size={13} aria-hidden="true" />}<Icon size={14} aria-hidden="true" /><span>{title}</span>{count !== undefined && <small>{count}</small>}
      </button>
      {open.has(id) && <div className="chart-section__body" id={"chart-section-" + id}>{body}</div>}
    </div>)}</div>
  </section>;
}
