"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ClipboardList, LoaderCircle } from "lucide-react";
import { fetchDashboard, fetchGlobalShap } from "@/lib/emergence";
import { getPatient, listPatients } from "@/lib/api";
import type { PatientSummary } from "@/lib/api";
import type { Dashboard, DashboardRequest, Evidence, ShapValue } from "@/lib/emergence";
import type { Patient } from "@/lib/types";
import "./navigator.css";

const medications = {
  psychiatric: ["sertraline", "citalopram", "escitalopram", "paroxetine"],
  cardiovascular: ["atorvastatin calcium", "metoprolol succinate", "carvedilol"],
};
const initial: DashboardRequest = {
  disease_context: "psychiatric", subtype: "depression", selected_medications: ["paroxetine", "sertraline"],
  patient_context: { INCDGHH: 3, INP_05: 1, RHC_05: 1, EDDVH3: 3, DHHGAGE: 5, DHH_SEX: 2, PCN_05: 1, FSCDVAF2: 0, GEN_10: 2, GEN_15: 6, GEN_20: 2, DHHDGHSZ: 1 },
  location: { city: "Waterloo", province: "Ontario", postal_code: "" },
};
const fields: [string, string, number[]][] = [
  ["DHHGAGE", "Age group", [1, 2, 3, 4, 5]], ["DHH_SEX", "Sex · survey code", [1, 2]],
  ["INCDGHH", "Household income · survey code", [1, 2, 3, 4, 5]], ["INP_05", "Prescription insurance · survey code", [1, 2]],
  ["RHC_05", "Regular provider · survey code", [1, 2, 3, 4, 5]], ["EDDVH3", "Education · survey code", [1, 2, 3]],
  ["PCN_05", "Prescription use · survey code", [1, 2]], ["FSCDVAF2", "Food security · survey code", [0, 1, 2, 3]],
  ["GEN_10", "Life stress · survey code", [1, 2, 3, 4, 5]], ["GEN_15", "Work stress · survey code", [1, 2, 3, 4, 5, 6]],
  ["GEN_20", "Belonging · survey code", [1, 2, 3, 4]], ["DHHDGHSZ", "Household size · survey code", [1, 2]],
];
type Tab = "summary" | "pgx" | "evidence" | "model" | "note";
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="clinical-section"><h3>{title}</h3>{children}</section>;
}
function EvidenceTable({ rows }: { rows: Evidence[] }) {
  return <div className="table-scroll"><table className="data-table"><thead><tr><th>Medication</th><th>ClinPGx result</th><th>Genes to review</th><th>Records</th><th>Action</th></tr></thead><tbody>
    {rows.map(row => <tr key={row.medication}><th scope="row">{row.medication}</th><td>{row.message}</td><td>{row.genes_to_review?.map(g => `${g.gene}: ${g.phenotype || "No result"}`).join("; ") || "None returned"}</td><td>{row.annotations.length} annotations · {row.guidelines.length} guidelines{row.annotations.length + row.guidelines.length > 0 && <details><summary>View records</summary><ul>{[...row.annotations, ...row.guidelines].map((record, index) => <li key={`${record.accession_id}-${index}`}>{record.accession_id} · {record.level || "Level unknown"} · {record.name || "Unnamed"}</li>)}</ul></details>}</td><td className="text-warning">Clinician review required</td></tr>)}
  </tbody></table></div>;
}
function ShapTable({ values }: { values: ShapValue[] }) {
  return <div className="table-scroll"><table className="data-table"><thead><tr><th>Model input</th><th>Contribution</th><th>Direction</th></tr></thead><tbody>{values.map(value => <tr key={value.feature}><td>{value.label}</td><td className="tabular">{value.shap_value.toFixed(5)}</td><td>{value.direction}</td></tr>)}</tbody></table></div>;
}

export default function MedicationNavigator() {
  const router = useRouter();
  const [draft, setDraft] = useState<DashboardRequest>(initial);
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("summary");
  const [chartOpen, setChartOpen] = useState(false);
  const [copied, setCopied] = useState("");
  const [global, setGlobal] = useState<{ feature: string; label: string; mean_abs_shap: number }[]>([]);
  const [globalError, setGlobalError] = useState("");
  const [chartPersona, setChartPersona] = useState("b");
  const [chartPatients, setChartPatients] = useState<PatientSummary[]>([
    { key: "b", patient_id: "DEMO-PEDI-8842", name: "Maria Santos", primary_language: "Spanish", source: "example" },
    { key: "a", patient_id: "DEMO-PEDI-8841", name: "Daniel Lee", primary_language: "English", source: "example" },
  ]);
  const [chartPatient, setChartPatient] = useState<Patient | null>(null);
  const [chartError, setChartError] = useState("");
  const [chartLoading, setChartLoading] = useState(true);
  useEffect(() => {
    const saved = window.sessionStorage.getItem("emergence-care-persona");
    if (saved) queueMicrotask(() => setChartPersona(saved));
    listPatients().then(items => setChartPatients(items.map(item => ({ ...item, key: item.key === "mock-patient-a" ? "a" : item.key === "mock-patient-b" ? "b" : item.key })))).catch(() => { /* The selected chart still loads by ID. */ });
    fetchDashboard(initial).then(setData).catch(e => setError(e instanceof Error ? e.message : "Review unavailable.")).finally(() => setLoading(false));
    fetchGlobalShap().then(result => setGlobal(result.features)).catch(() => setGlobalError("Global model explanation unavailable."));
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    getPatient(chartPersona, controller.signal).then(patient => { setChartPatient(patient); setChartError(""); }).catch(error => { if (!controller.signal.aborted) { setChartPatient(null); setChartError(error instanceof Error ? error.message : "Care Coordination chart unavailable."); } }).finally(() => { if (!controller.signal.aborted) setChartLoading(false); });
    return () => controller.abort();
  }, [chartPersona]);
  function selectChartPersona(value: string) {
    window.sessionStorage.setItem("emergence-care-persona", value);
    setChartPersona(value); setChartPatient(null); setChartLoading(true); setChartError("");
  }
  async function update(next = draft) {
    setLoading(true); setError("");
    try { setData(await fetchDashboard(next)); }
    catch (e) { setError(e instanceof Error ? e.message : "Review unavailable."); }
    finally { setLoading(false); }
  }
  function changeContext(context: DashboardRequest["disease_context"]) {
    const next = { ...draft, disease_context: context, subtype: context === "psychiatric" ? "depression" : "cardiovascular review", selected_medications: context === "psychiatric" ? ["paroxetine", "sertraline"] : ["carvedilol"] };
    setDraft(next); void update(next);
  }
  const considerationGroups = data ? [
    ["Genomic considerations", data.personalized_treatment_considerations.genomic_considerations],
    ["Medication evidence", data.personalized_treatment_considerations.medication_evidence_considerations],
    ["Access considerations", data.personalized_treatment_considerations.access_considerations],
    ["Monitoring and uncertainty", data.personalized_treatment_considerations.monitoring_and_uncertainty],
  ] as [string, string[]][] : [];
  return <main className="clinical-app navigator-app">
    <header className="utility-bar"><div className="utility-brand"><strong>Emergence</strong><span>Medication Navigator</span></div><div className="utility-right"><span className="utility-user"><strong>Clinical review workspace</strong><small>PharmCAT sample · separate from pediatric charts</small></span><span className="environment-label">RESEARCH DEMO</span><span className={`status-mark ${error ? "status-mark--down" : data ? "status-mark--up" : ""}`}>{loading ? "Loading" : error ? "API unavailable" : "API connected"}</span></div></header>
    <nav className="module-tabs" aria-label="Clinical modules"><button type="button" onClick={() => router.push("/")}>Care Coordination</button><button type="button" className="active" aria-current="page">Medication Navigator</button></nav>
    <section className="patient-banner" aria-label="Current sample record"><div className="patient-banner__primary"><div><strong>Demo Patient</strong><small>PharmCAT sample output · no linked EHR chart</small></div></div><div className="patient-meta"><span>Review context</span><strong>{draft.disease_context === "psychiatric" ? "Psychiatric / depression" : "Cardiovascular"}</strong></div><div className="patient-meta"><span>City entered</span><strong>{draft.location.city || "Unknown"}</strong></div><div className="patient-meta"><span>Province entered</span><strong>{draft.location.province || "Unknown"}</strong></div><div className="patient-meta"><span>Status</span><strong className="text-warning">Clinician review required</strong></div></section>
    <div className="work-area"><div className="notice notice--warning"><AlertTriangle size={14} aria-hidden="true"/>Medication evidence and treatment considerations require clinician review. No prescribing or EHR action occurs here.</div>
      {error && <div className="notice notice--error" role="alert"><AlertTriangle size={15} aria-hidden="true"/>{error}<button type="button" onClick={() => void update()}>Retry</button></div>}
      <button className="mobile-chart-toggle" type="button" aria-expanded={chartOpen} onClick={() => setChartOpen(!chartOpen)}>Review Inputs {chartOpen ? "−" : "+"}</button>
      <div className={`workspace-grid ${chartOpen ? "workspace-grid--chart-open" : ""}`}>
        <aside className="workspace-region chart-rail" aria-label="Review inputs"><header className="pane-header"><h2>Review Inputs</h2><span>Editable demo context</span></header><div className="navigator-rail-body"><fieldset className="navigator-fieldset"><legend>Disease context</legend><label><input type="radio" name="context" checked={draft.disease_context === "psychiatric"} onChange={() => changeContext("psychiatric")}/> Psychiatric</label><label><input type="radio" name="context" checked={draft.disease_context === "cardiovascular"} onChange={() => changeContext("cardiovascular")}/> Cardiovascular</label></fieldset><fieldset className="navigator-fieldset"><legend>Medications to query</legend>{medications[draft.disease_context].map(med => <label key={med}><input type="checkbox" checked={draft.selected_medications.includes(med)} onChange={e => setDraft(current => ({ ...current, selected_medications: e.target.checked ? [...current.selected_medications, med] : current.selected_medications.filter(item => item !== med) }))}/> {med}</label>)}<p className="rail-caution">Selection is for evidence lookup only. Clinician review required.</p></fieldset><fieldset className="navigator-fieldset"><legend>Location entered</legend>{(["city", "province", "postal_code"] as const).map(key => <label key={key}>{key === "postal_code" ? "Postal code" : key === "city" ? "City" : "Province"}<input value={draft.location[key]} onChange={e => setDraft(current => ({ ...current, location: { ...current.location, [key]: e.target.value } }))}/></label>)}</fieldset><fieldset className="navigator-fieldset"><legend>CCHS model inputs</legend><p className="rail-disclaimer">Numeric survey codes are shown as recorded; their meanings need dataset validation.</p>{fields.map(([key, label, choices]) => <label key={key}>{label}<select value={draft.patient_context[key]} onChange={e => setDraft(current => ({ ...current, patient_context: { ...current.patient_context, [key]: Number(e.target.value) } }))}>{choices.map(value => <option value={value} key={value}>Code {value}</option>)}</select></label>)}</fieldset></div></aside>
        <section className="workspace-region plan-workspace" aria-labelledby="navigator-title"><header className="pane-header"><h2 id="navigator-title">Medication Evidence Review</h2><span>{data ? "Backend results · clinician review required" : "No results loaded"}</span></header><div className="plan-toolbar"><button type="button" className="action-primary" disabled={loading} onClick={() => void update()}>{loading ? <LoaderCircle size={13} className="spin"/> : <ClipboardList size={13}/>}Update Review</button><small>Inputs update results when you select Update Review</small></div><div className="pane-tabs" role="tablist" aria-label="Medication review sections" onKeyDown={event => { if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return; const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')); const index = items.indexOf(document.activeElement as HTMLButtonElement); if (index < 0) return; event.preventDefault(); const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + items.length) % items.length; items[next].focus(); items[next].click(); }}>{([ ["summary", "Summary"], ["pgx", "Genomic Profile"], ["evidence", "Medication Evidence"], ["model", "SDOH Model"], ["note", "Clinician Note"] ] as [Tab, string][]).map(([id, label]) => <button key={id} type="button" role="tab" tabIndex={tab === id ? 0 : -1} aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>)}</div>
          {loading && !data ? <div className="compact-loading" role="status"><LoaderCircle size={15} className="spin"/>Loading actual backend outputs…</div> : !data ? <div className="plan-empty"><h3>Review unavailable</h3><p>Start the Emergence API and retry the review.</p></div> : <div className="plan-content" aria-busy={loading}>
            {tab === "summary" && <><Section title="Canadian population context"><div className="table-scroll"><table className="data-table"><thead><tr><th>Prescription coverage</th><th>Prescription medication use</th><th>Cost-related non-adherence</th></tr></thead><tbody><tr><td>{data.canadian_population_context.prescription_coverage_percent.toFixed(1)}%</td><td>{data.canadian_population_context.prescription_medication_use_percent.toFixed(1)}%</td><td>{data.canadian_population_context.cost_related_non_adherence_percent.toFixed(1)}%</td></tr></tbody></table></div><p className="rail-disclaimer">{data.canadian_population_context.source_label}. Population figures are not patient findings.</p></Section><Section title="Model estimate"><dl className="key-value"><div><dt>Outcome</dt><dd>{data.sdoh_model.target}</dd></div><div><dt>Estimate</dt><dd><strong>{data.sdoh_model.estimated_probability_percent.toFixed(2)}%</strong></dd></div></dl><p className="rail-disclaimer">{data.sdoh_model.disclaimer}</p></Section><Section title="Treatment considerations">{considerationGroups.map(([title, items]) => <div className="navigator-considerations" key={title}><strong>{title}</strong><ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul></div>)}<p className="rail-caution">All medication-related considerations require clinician review.</p></Section></>}
            {tab === "pgx" && <><p className="section-intro">PharmCAT sample profile. No association with the fictional pediatric charts.</p><Section title={`Complete PGx profile · ${data.pgx_profile.findings.length} genes`}><div className="table-scroll"><table className="data-table"><thead><tr><th>Gene</th><th>Diplotype</th><th>Phenotype</th><th>Interpretation</th></tr></thead><tbody>{data.pgx_profile.findings.map(finding => <tr key={finding.gene}><th scope="row">{finding.gene}</th><td>{finding.diplotype || "Unknown"}</td><td>{finding.phenotype || "No result"}</td><td>{finding.interpretation}</td></tr>)}</tbody></table></div><p className="rail-caution">Genomic findings require clinician interpretation before medication decisions.</p></Section></>}
            {tab === "evidence" && <><p className="section-intro">ClinPGx records are queried for the selected medications. A missing record does not establish safety or efficacy.</p><Section title="Medication evidence">{data.medication_evidence.length ? <EvidenceTable rows={data.medication_evidence}/> : <p className="lower-empty">No medications selected. Select a medication and update the review.</p>}</Section></>}
            {tab === "model" && <><Section title="Local model explanation"><ShapTable values={data.sdoh_model.local_shap_values}/><p className="rail-disclaimer">{data.sdoh_model.shap_disclaimer}</p></Section><Section title="Global model explanation">{global.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Feature</th><th>Mean absolute SHAP</th></tr></thead><tbody>{global.map(item => <tr key={item.feature}><td>{item.label}</td><td className="tabular">{item.mean_abs_shap.toFixed(5)}</td></tr>)}</tbody></table></div> : <p>{globalError || "Loading global explanation…"}{globalError && <button type="button" className="navigator-inline-button" onClick={() => { setGlobalError(""); fetchGlobalShap().then(result => setGlobal(result.features)).catch(() => setGlobalError("Global model explanation unavailable.")); }}>Retry</button>}</p>}</Section></>}
            {tab === "note" && <><div className="note-meta"><strong>{data.clinician_note.title}</strong><span>Generated {new Date(data.meta.generated_at).toLocaleString()}</span></div><p className="rail-caution">Draft only. Clinician review required. No EHR export.</p><div className="note-view"><pre tabIndex={0}>{data.clinician_note.text}</pre></div><div className="note-actions"><span role="status">{copied}</span><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(data.clinician_note.text); setCopied("Draft note copied"); } catch { setCopied("Clipboard unavailable. Select and copy the note text."); } }}>Copy draft</button></div></>}
          </div>}
        </section>
        <aside className="workspace-region queue-rail" aria-label="Care Coordination chart reference and supports"><header className="pane-header"><h2>Care Coordination Reference</h2><span>Fictional chart</span></header><div className="navigator-rail-body"><label className="navigator-chart-select">Selected chart<select value={chartPersona} onChange={event => selectChartPersona(event.target.value)}>{!chartPatients.some(item => item.key === chartPersona) && <option value={chartPersona}>Loading selected chart…</option>}{chartPatients.map(item => <option value={item.key} key={item.key}>{item.name} · {item.source === "entered" ? "Entered" : item.key === "a" ? "Patient A" : "Patient B"}</option>)}</select></label>{chartLoading ? <p className="lower-empty" role="status">Loading chart context…</p> : chartError ? <div className="notice notice--error" role="alert">{chartError}<button type="button" onClick={() => { setChartLoading(true); getPatient(chartPersona).then(setChartPatient).then(() => setChartError("")).catch(error => setChartError(error instanceof Error ? error.message : "Chart unavailable.")).finally(() => setChartLoading(false)); }}>Retry</button></div> : chartPatient ? <><dl className="key-value"><div><dt>Patient</dt><dd>{chartPatient.name} · {chartPatient.age_years} years</dd></div><div><dt>Language</dt><dd>{chartPatient.demographics.primary_language}</dd></div><div><dt>Income</dt><dd>{chartPatient.demographics.household_income_level}</dd></div><div><dt>Coverage</dt><dd>{chartPatient.sdoh_profile.insurance_status}</dd></div><div><dt>Transport</dt><dd>{chartPatient.sdoh_profile.transportation_access}</dd></div><div><dt>Financial</dt><dd>{chartPatient.sdoh_profile.financial_strain}</dd></div><div><dt>Caregiver</dt><dd>{chartPatient.sdoh_profile.caregiver_availability}</dd></div><div><dt>Literacy</dt><dd>{chartPatient.sdoh_profile.health_literacy_level}</dd></div><div><dt>Location</dt><dd>{chartPatient.demographics.zip_code === "00000" ? "Not recorded" : chartPatient.demographics.zip_code}</dd></div></dl><p className="rail-disclaimer">These values come from the selected Care Coordination chart. The PharmCAT profile, ClinPGx query, and CCHS model inputs are separate research samples and are not attributed to this child.</p></> : <p className="lower-empty">Chart context unavailable.</p>}<div className="navigator-divider"><strong>Research Review Summary</strong></div><dl className="key-value"><div><dt>PGx source</dt><dd>{data?.pgx_profile.source || "Unknown"}</dd></div><div><dt>Selected drugs</dt><dd>{draft.selected_medications.length}</dd></div><div><dt>Evidence</dt><dd>{data?.medication_evidence.length ?? "—"} results</dd></div><div><dt>Model</dt><dd>{data ? `${data.sdoh_model.estimated_probability_percent.toFixed(2)}%` : "—"}</dd></div></dl><p className="rail-caution">Clinician review required for every medication suggestion.</p><div className="navigator-divider"><strong>Community and social supports</strong></div>{data ? <><p className="rail-disclaimer">{data.community_supports.disclaimer}</p>{data.community_supports.resources.length ? data.community_supports.resources.map(resource => <article className="navigator-resource" key={resource.name}><strong><a href={resource.website_url} target="_blank" rel="noreferrer">{resource.name}</a></strong><small>{resource.category.replaceAll("_", " ")}</small><p>{resource.description}</p><p className="rail-disclaimer">{resource.availability_disclaimer} <a href={resource.source_url} target="_blank" rel="noreferrer">Official source</a></p></article>) : <p className="lower-empty">{data.community_supports.message}</p>}</> : <p className="lower-empty">Supports load with the review.</p>}</div></aside>
      </div><footer>Emergence research demonstration · PharmCAT sample · No prescribing or EHR connection · Clinician review required</footer>
    </div>
  </main>;
}
