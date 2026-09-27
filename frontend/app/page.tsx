"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { KeyboardEvent } from "react";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, CircleHelp, ClipboardList, Copy, FileText, LoaderCircle, Search, Settings2 } from "lucide-react";
import { getHealth, getPatient, listPatients, previewNote, synthesize } from "@/lib/api";
import type { PatientSummary } from "@/lib/api";
import type { CarePlan, CareTask, Patient, TaskStatus } from "@/lib/types";
import { PatientContext } from "@/components/patient/patient-context";
import { CoordinationQueue } from "@/components/coordination/coordination-queue";
import { PatientGuide } from "@/components/caregiver/patient-guide";
import { NewPatientForm } from "@/components/patient/new-patient-form";

const examplePatients: PatientSummary[] = [
  { key: "b", patient_id: "DEMO-PEDI-8842", name: "Maria Santos", primary_language: "Spanish", source: "example" },
  { key: "a", patient_id: "DEMO-PEDI-8841", name: "Daniel Lee", primary_language: "English", source: "example" },
];
type PlanTab = "summary" | "safety" | "adjustments" | "instructions" | "note";
type LowerTab = "guide" | "activity" | "audit" | "related";
type Event = { time: string; action: string; object: string; status: string };
const planTabs: { id: PlanTab; label: string }[] = [
  { id: "summary", label: "Plan Summary" }, { id: "safety", label: "Safety Review" },
  { id: "adjustments", label: "Equity Adjustments" }, { id: "instructions", label: "Caregiver Instructions" },
  { id: "note", label: "Note Preview" },
];
const lowerTabs: { id: LowerTab; label: string }[] = [
  { id: "guide", label: "Caregiver Guide" }, { id: "activity", label: "Activity" },
  { id: "audit", label: "Audit Trail" }, { id: "related", label: "Related Notes" },
];
const displayTime = (date: Date) => date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const reviewText = "Clinician review required";
function moveTab(event: KeyboardEvent<HTMLDivElement>) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
  if (current < 0) return;
  event.preventDefault();
  const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
  tabs[next].focus(); tabs[next].click();
}

function SafetyTable({ plan }: { plan: CarePlan }) {
  return <div className="table-scroll"><table className="data-table"><thead><tr><th>Severity</th><th>Finding</th><th>Origin</th><th>Required action</th><th>Status</th></tr></thead><tbody>{plan.safety_findings.map((finding, index) => <tr key={index}>
    <td><span className={"severity severity--" + finding.severity}>{finding.severity}</span></td><td><strong>{finding.title}</strong><small>{finding.description}</small></td>
    <td>{finding.source === "rules_engine" ? "Rules engine" : finding.source || "Rules engine"}</td><td>Qualified clinician review</td><td>Open</td>
  </tr>)}</tbody></table></div>;
}

function AdjustmentTable({ plan, compact = false }: { plan: CarePlan; compact?: boolean }) {
  return <div className="table-scroll"><table className="data-table"><thead><tr><th>ID</th><th>Barrier / domain</th><th>Proposed coordination adjustment</th><th>Owner</th><th>Verify</th><th>Clinical review</th></tr></thead><tbody>{plan.equity_adjustments.map(item => <tr key={item.id}>
    <td className="tabular">{item.id}</td><td>{item.category}</td><td><strong>{item.adapted}</strong>{!compact && <small>{item.rationale}</small>}</td>
    <td>{item.requires_clinician_review ? "Clinical team" : "Care coordinator"}</td><td>{item.requires_external_verification ? "Required" : "—"}</td><td>{item.requires_clinician_review ? <span className="text-warning">{reviewText}</span> : "As needed"}</td>
  </tr>)}</tbody></table></div>;
}

export default function Home() {
  const router = useRouter();
  const [persona, setPersona] = useState("b");
  const [patientList, setPatientList] = useState<PatientSummary[]>(examplePatients);
  const [patientListError, setPatientListError] = useState("");
  const [newPatientOpen, setNewPatientOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientLoading, setPatientLoading] = useState(true);
  const [patientError, setPatientError] = useState("");
  const [plan, setPlan] = useState<CarePlan | null>(null);
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [mockMode, setMockMode] = useState(true);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [planTab, setPlanTab] = useState<PlanTab>("summary");
  const [lowerTab, setLowerTab] = useState<LowerTab>("guide");
  const [note, setNote] = useState<string | null>(null);
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteError, setNoteError] = useState("");
  const [saved, setSaved] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [mockExported, setMockExported] = useState(false);
  const [copyState, setCopyState] = useState(false);
  const [search, setSearch] = useState("");
  const [chartOpen, setChartOpen] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [clock, setClock] = useState<Date>(() => new Date());
  const epoch = useRef(0);
  const addEvent = useCallback((action: string, object: string, status = "Done") => setEvents(current => [{ time: displayTime(new Date()), action, object, status }, ...current]), []);

  useEffect(() => { const saved = window.sessionStorage.getItem("emergence-care-persona"); if (saved) queueMicrotask(() => setPersona(saved)); }, []);
  useEffect(() => { const timer = window.setInterval(() => setClock(new Date()), 30000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { getHealth().then(() => setBackendOnline(true)).catch(() => setBackendOnline(false)); }, []);
  const refreshPatients = useCallback(() => { listPatients().then(items => { setPatientList(items.map(item => ({ ...item, key: item.key === "mock-patient-a" ? "a" : item.key === "mock-patient-b" ? "b" : item.key }))); setPatientListError(""); }).catch(error => setPatientListError(error instanceof Error ? error.message : "Patient list unavailable.")); }, []);
  useEffect(() => { refreshPatients(); }, [refreshPatients]);
  const loadPatient = useCallback((selected: string, signal?: AbortSignal) => {
    getPatient(selected, signal).then(data => { if (!signal?.aborted) { setPatient(data); setBackendOnline(true); addEvent("Patient context loaded", data.patient_id); } })
      .catch(error => { if (!signal?.aborted) { setPatientError(error.message); setBackendOnline(false); } })
      .finally(() => { if (!signal?.aborted) setPatientLoading(false); });
  }, [addEvent]);
  useEffect(() => { const controller = new AbortController(); loadPatient(persona, controller.signal); return () => controller.abort(); }, [persona, loadPatient]);

  function selectPersona(selected: string) {
    if (selected === persona) return;
    window.sessionStorage.setItem("emergence-care-persona", selected);
    epoch.current += 1; setPersona(selected); setPatientLoading(true); setPatientError(""); setPatient(null);
    setPlan(null); setTasks([]); setGenerating(false); setGenerationError(""); setNote(null); setNoteError(""); setNoteLoading(false);
    setSaved(false); setReviewed(false); setMockExported(false); setPlanTab("summary");
  }
  function nextPatient(direction: -1 | 1) {
    const current = patientList.findIndex(item => item.key === persona);
    const next = (current + direction + patientList.length) % patientList.length;
    selectPersona(patientList[next].key);
  }
  function patientCreated(created: Patient) {
    setPatientList(current => [{ key: created.patient_id, patient_id: created.patient_id, name: created.name, primary_language: created.demographics.primary_language, source: "entered" }, ...current]);
    setNewPatientOpen(false); setPatientListError(""); selectPersona(created.patient_id); setSaveSuccess(`${created.name} saved to the local backend as ${created.patient_id}.`); addEvent("Patient saved to local backend", created.patient_id);
  }
  async function generate() {
    if (!patient || generating) return;
    const requestEpoch = ++epoch.current;
    setGenerating(true); setGenerationError(""); setPlan(null); setTasks([]); setNote(null); setNoteLoading(false); setSaved(false); setReviewed(false);
    try {
      const result = await synthesize(patient, mockMode);
      if (requestEpoch !== epoch.current) return;
      setPlan(result); setTasks(result.care_team_tasks); setBackendOnline(true); setPlanTab("summary");
      addEvent("Draft coordination plan generated", patient.patient_id);
    } catch (error) { if (requestEpoch === epoch.current) setGenerationError(error instanceof Error ? error.message : "Could not generate the draft."); }
    finally { if (requestEpoch === epoch.current) setGenerating(false); }
  }
  async function openNote() {
    if (!plan) { setPlanTab("note"); return; }
    const requestEpoch = epoch.current;
    setPlanTab("note"); setNoteLoading(true); setNoteError(""); setMockExported(false); setCopyState(false);
    try { const result = await previewNote({ ...plan, care_team_tasks: tasks }); if (requestEpoch !== epoch.current) return; setNote(result.note); addEvent("Note preview opened", plan.patient_id); }
    catch (error) { if (requestEpoch === epoch.current) setNoteError(error instanceof Error ? error.message : "Could not load note preview."); }
    finally { if (requestEpoch === epoch.current) setNoteLoading(false); }
  }
  function updateStatus(id: string, status: TaskStatus) { setTasks(current => current.map(task => task.id === id ? { ...task, status } : task)); addEvent("Task status changed", id, status); }
  async function copyNote() { if (!note) return; try { await navigator.clipboard.writeText(note); setCopyState(true); } catch { setNoteError("Clipboard unavailable. Select and copy the note text instead."); } }
  function goTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }
  const benefitFlag = persona === "b" ? "5 access signals" : persona === "a" ? "No major access flags" : "Entered chart · verify details";
  const otherPatientMatches = search ? patientList.filter(item => item.key !== persona && [item.name, item.patient_id].join(" ").toLowerCase().includes(search.toLowerCase())) : [];

  return <main className="clinical-app">
    <header className="utility-bar">
      <div className="utility-brand"><strong>Emergence</strong><span>Care Coordination Workspace</span></div>
      <label className="global-search"><Search size={14} aria-hidden="true" /><span className="sr-only">Search patient, task, diagnosis, or workflow</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search patient, task, diagnosis, or workflow…" /></label>
      <div className="utility-right"><span className="utility-user"><strong>Alex Morgan, RN</strong><small>Complex Care Coordination · Pediatric Oncology</small></span><span className="environment-label">DEMO</span><span className={"status-mark " + (backendOnline ? "status-mark--up" : "status-mark--down")}>{backendOnline === null ? "Checking" : backendOnline ? "Backend online" : "Backend offline"}</span><time suppressHydrationWarning>{clock ? clock.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</time><button className="utility-icon" type="button" title="Open safety review" aria-label="Open safety review" onClick={() => { setPlanTab("safety"); goTo("plan-workspace"); }}><CircleHelp size={15} /></button><button className="utility-icon" type="button" title="Demo settings" aria-label="Toggle deterministic mock mode" onClick={() => setMockMode(value => !value)}><Settings2 size={15} /></button></div>
    </header>
    <nav className="module-tabs" aria-label="Clinical modules">
      <button type="button" onClick={() => goTo("patient-banner")}>Patient List</button>
      <button type="button" className="active" aria-current="page" onClick={() => goTo("plan-workspace")}>Care Coordination</button>
      <button type="button" onClick={() => goTo("clinical-context")}>Chart Review</button>
      <button type="button" onClick={() => goTo("coordination")}>Tasks</button>
      <button type="button" onClick={() => { void openNote(); goTo("plan-workspace"); }}>Notes</button>
      <button type="button" onClick={() => router.push("/medication-navigator")}>Medication Navigator</button>
    </nav>
    <section className="patient-banner" id="patient-banner" aria-label="Current fictional patient">
      <div className="patient-banner__primary"><div className="patient-controls"><button type="button" aria-label="Previous patient" onClick={() => nextPatient(-1)}><ChevronLeft size={14} /></button><button type="button" aria-label="Next patient" onClick={() => nextPatient(1)}><ChevronRight size={14} /></button></div><div><strong>{patient?.name || (patientLoading ? "Loading patient…" : "Patient unavailable")}</strong><small>{patient?.patient_id || "—"} · {patient?.age_years ?? "—"} years · {patient?.demographics.primary_language || "Language unknown"}</small></div></div>
      <div className="patient-meta"><span>Diagnosis</span><strong>{patient?.molecular_profile.diagnosis || "Awaiting fictional record"}</strong></div>
      <div className="patient-meta"><span>Allergies · verify</span><strong className="text-urgent">{patient?.molecular_profile.allergies.join(", ") || "Unknown"}</strong></div>
      <div className="patient-meta"><span>Insurance</span><strong>{patient?.sdoh_profile.insurance_status || "Unknown"}</strong></div>
      <div className="patient-meta"><span>Caregiver</span><strong>{patient?.sdoh_profile.caregiver_availability || "Unknown"}</strong></div>
      <div className="patient-banner__actions"><span className={persona === "b" ? "text-warning" : "text-muted"}>{benefitFlag}</span><select aria-label="Select patient" value={persona} onChange={event => selectPersona(event.target.value)}>{!patientList.some(item => item.key === persona) && <option value={persona}>Loading selected patient…</option>}{patientList.map(item => <option key={item.key} value={item.key}>{item.name}{item.source === "example" ? item.key === "a" ? " / Patient A" : " / Patient B" : " / Entered"}</option>)}</select><button type="button" onClick={() => goTo("clinical-context")}>Patient Summary</button><button type="button" onClick={() => { setSaveSuccess(""); setNewPatientOpen(value => !value); }} aria-expanded={newPatientOpen} aria-controls="new-patient-form">{newPatientOpen ? "Close Patient Form" : "Add Patient"}</button></div>
    </section>
    <div className="work-area">
      {newPatientOpen && <NewPatientForm onCreated={patientCreated} onCancel={() => setNewPatientOpen(false)} />}
      {saveSuccess && <div className="local-state-note" role="status">{saveSuccess}</div>}
      {patientListError && <div className="notice notice--error" role="alert">Saved patient list unavailable. {patientListError}<button type="button" onClick={refreshPatients}>Retry list</button></div>}
      {search && patient && [patient.name, patient.patient_id, patient.molecular_profile.diagnosis].join(" ").toLowerCase().includes(search.toLowerCase()) && <div className="search-result" role="status">Chart match: <button type="button" onClick={() => goTo("clinical-context")}>{patient.name} · {patient.patient_id} · {patient.molecular_profile.diagnosis}</button></div>}
      {otherPatientMatches.map(item => <div className="search-result" role="status" key={item.key}>Patient match: <button type="button" onClick={() => selectPersona(item.key)}>{item.name} · {item.patient_id}</button></div>)}
      {patientError && <div className="notice notice--error" role="alert"><AlertTriangle size={15} />{patientError}<button type="button" onClick={() => { setPatientLoading(true); setPatientError(""); loadPatient(persona); }}>Retry patient load</button></div>}
      <button className="mobile-chart-toggle" type="button" aria-expanded={chartOpen} onClick={() => setChartOpen(value => !value)}>Chart Review / Navigator {chartOpen ? "−" : "+"}</button>
      <div className={"workspace-grid" + (chartOpen ? " workspace-grid--chart-open" : "") }>
        {patientLoading ? <section className="workspace-region chart-rail loading-cell" aria-busy="true">Loading fictional chart…</section> : patient ? <PatientContext patient={patient} plan={plan} /> : <section className="workspace-region chart-rail loading-cell">Patient record unavailable.</section>}
        <section className="workspace-region plan-workspace" id="plan-workspace" aria-labelledby="plan-title">
          <header className="pane-header"><h2 id="plan-title">Emergence Care Coordination Draft</h2><span>{plan ? "Draft — clinician review required" : "No draft in this session"}</span></header>
          <div className="plan-toolbar"><button type="button" className="action-primary" onClick={generate} disabled={!patient || generating}>{generating ? <LoaderCircle size={13} className="spin" /> : <ClipboardList size={13} />}{plan ? "Refresh Draft" : "Generate Plan"}</button><button type="button" disabled={!plan} onClick={() => { setSaved(true); addEvent("Draft saved locally", plan?.patient_id || ""); }}>Save Draft</button><button type="button" disabled={!plan} onClick={() => void openNote()}><FileText size={13} />Preview Note</button><button type="button" disabled={!plan} onClick={() => { setReviewed(true); addEvent("Draft marked reviewed locally", plan?.patient_id || ""); }}><Check size={13} />Mark Reviewed</button><span className="toolbar-spacer" /><label className="toolbar-mock"><input type="checkbox" checked={mockMode} onChange={event => setMockMode(event.target.checked)} /> Deterministic mock</label><small>{plan ? "Updated " + new Date(plan.synthesis_timestamp).toLocaleString() : "No plan generated"}</small></div>
          {(saved || reviewed) && <div className="local-state-note" role="status">{saved && "Draft saved in this browser session. "}{reviewed && "Marked reviewed for demo only; no clinical sign-off occurred."}</div>}
          {!mockMode && <div className="mode-note">Gemini mode requires a backend API key. Any generated text still needs independent clinical review.</div>}
          <div className="pane-tabs plan-tabs" role="tablist" aria-label="Plan sections" onKeyDown={moveTab}>{planTabs.map(tab => <button key={tab.id} type="button" role="tab" tabIndex={planTab === tab.id ? 0 : -1} aria-selected={planTab === tab.id} onClick={() => tab.id === "note" ? void openNote() : setPlanTab(tab.id)}>{tab.label}</button>)}</div>
          {generationError && <div className="notice notice--error" role="alert"><AlertTriangle size={15} />{generationError}<button type="button" onClick={generate}>Retry</button></div>}
          {generating ? <div className="compact-loading" role="status" aria-live="polite"><LoaderCircle className="spin" size={16} />Preparing reviewable draft and care-team tasks…</div> :
            !plan ? <div className="plan-empty"><h3>No plan draft in this session</h3><p>Generate a structured coordination draft from the fictional chart. Clinical decisions remain with the care team.</p><ol><li>Validate safety signals</li><li>Identify documented access barriers</li><li>Create reviewable coordination tasks</li></ol></div> :
            planTab === "summary" ? <div className="plan-content">
              <section className="clinical-section"><h3>Safety Review Summary</h3><SafetyTable plan={plan} /></section>
              <section className="clinical-section"><h3>Standard Care Workflow</h3><div className="table-scroll"><table className="data-table"><thead><tr><th>Clinical process</th><th>Access assumption</th><th>Potential friction</th></tr></thead><tbody><tr><td>{plan.clinical_summary.standard_plan_description}</td><td>Appointments, instructions, and prescribed medicines can be accessed</td><td>{persona === "b" ? "Reported barriers may interrupt follow-up" : persona === "a" ? "No major barrier reported; verify at visit" : "Review entered access details with the care team"}</td></tr></tbody></table></div></section>
              <section className="clinical-section"><h3>Proposed Coordination Adjustments</h3><AdjustmentTable plan={plan} compact /></section>
              <section className="clinical-section"><details className="rationale-panel"><summary>Why this plan differs from the standard workflow</summary><ul>{plan.equity_adjustments.map(item => <li key={item.id}><strong>{item.category}:</strong> {item.rationale}</li>)}</ul></details></section>
              <div className="cost-line"><strong>Cost verification:</strong> Standard {plan.clinical_summary.standard_plan_cost_estimate ?? "Unknown"} · Adapted {plan.clinical_summary.equity_plan_cost_estimate ?? "Unknown"} <span>{plan.clinical_summary.cost_estimate_disclaimer}</span></div>
            </div> :
            planTab === "safety" ? <div className="plan-content"><div className="section-intro">All findings remain open until reviewed by a qualified clinician.</div><SafetyTable plan={plan} /></div> :
            planTab === "adjustments" ? <div className="plan-content"><div className="section-intro">Draft care-team workflow changes based on the fictional record. Expand clinical context in Chart Review.</div><AdjustmentTable plan={plan} /></div> :
            planTab === "instructions" ? <div className="plan-content"><div className="instruction-split"><div><h3>{plan.patient_guide.title}</h3><ol>{plan.patient_guide.instructions.map((item, index) => <li key={index}>{item}</li>)}</ol></div><dl className="key-value"><div><dt>Language</dt><dd>{plan.patient_guide.language}</dd></div><div><dt>Reading target</dt><dd>{plan.patient_guide.reading_level}</dd></div><div><dt>Interpreter</dt><dd>{plan.patient_guide.translation_required ? "Qualified translation required" : "Confirm availability when needed"}</dd></div><div><dt>Teach-back</dt><dd>{plan.patient_guide.teach_back_prompt}</dd></div></dl></div><p className="rail-caution">Care-team review required before sharing. Do not change medication without clinician review.</p></div> :
            <div className="plan-content note-view"><div className="note-meta"><strong>Mock EHR note preview</strong><span>{patient?.name} · {patient?.patient_id} · Alex Morgan, RN · {new Date().toLocaleString()}</span></div><p className="rail-caution">Mock preview — not signed or exported to a real EHR.</p>{noteLoading ? <div className="compact-loading" role="status"><LoaderCircle size={15} className="spin" />Loading note preview…</div> : noteError ? <div className="notice notice--error" role="alert">{noteError}<button type="button" onClick={() => void openNote()}>Retry</button></div> : note ? <><pre tabIndex={0}>{note}</pre><div className="note-actions"><button type="button" onClick={copyNote}><Copy size={13} />{copyState ? "Copied" : "Copy note"}</button><button type="button" onClick={() => { setMockExported(true); addEvent("Mock export simulated", plan.patient_id); }}>Simulate sign and export</button></div>{mockExported && <p className="local-state-note" role="status">Mock export complete. Nothing was signed or sent to an EHR.</p>}</> : <p>No note preview loaded. Select Preview Note to request one.</p>}</div>}
        </section>
        <CoordinationQueue tasks={tasks} patientId={patient?.patient_id || "—"} search={search} onStatus={updateStatus} />
      </div>
      <section className="lower-region" id="lower-region" aria-labelledby="lower-title"><header className="pane-header"><h2 id="lower-title">Caregiver & Activity</h2><span>Demo-local workspace</span></header><div className="pane-tabs lower-tabs" role="tablist" aria-label="Lower workspace" onKeyDown={moveTab}>{lowerTabs.map(tab => <button key={tab.id} type="button" role="tab" tabIndex={lowerTab === tab.id ? 0 : -1} aria-selected={lowerTab === tab.id} onClick={() => setLowerTab(tab.id)}>{tab.label}</button>)}</div>
        {lowerTab === "guide" ? plan ? <PatientGuide plan={plan} /> : <p className="lower-empty">A caregiver guide appears after plan generation.</p> :
          lowerTab === "activity" ? <div className="lower-table"><p>Demo-local activity. Times reflect actions in this browser session.</p><table className="data-table"><thead><tr><th>Time</th><th>Event</th><th>Object</th></tr></thead><tbody>{events.map((event, index) => <tr key={index}><td>{event.time}</td><td>{event.action}</td><td>{event.object}</td></tr>)}</tbody></table></div> :
          lowerTab === "audit" ? <div className="lower-table"><p>Demonstration activity log — not a production audit record.</p><table className="data-table"><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Object</th><th>Status</th></tr></thead><tbody>{events.map((event, index) => <tr key={index}><td>{event.time}</td><td>Alex Morgan, RN (demo)</td><td>{event.action}</td><td>{event.object}</td><td>{event.status}</td></tr>)}</tbody></table></div> :
          <p className="lower-empty">No related notes in this demo session. The current mock note is available in Note Preview.</p>}
      </section>
      <footer>Fictional demo records · Clinical review required · Benefits and costs unverified · No EHR writeback</footer>
    </div>
  </main>;
}
