import { Languages } from "lucide-react";
import type { CarePlan } from "@/lib/types";

export function PatientGuide({ plan }: { plan: CarePlan }) {
  const guide = plan.patient_guide;
  const spanish = guide.language === "Spanish";
  return <section className="patient-guide" id="caregiver-guide" aria-labelledby="guide-title">
    <header className="guide-header"><div><span className="section-index">04 / For the caregiver</span><h2 id="guide-title">{guide.title}</h2><p>Plain-language draft for care-team review</p></div><div className="guide-meta"><span>{guide.language}</span><span>Target: {guide.reading_level}</span></div></header>
    {guide.translation_required && <p className="notice notice--warning"><Languages size={18} aria-hidden="true" /> A qualified translation is needed before sharing this guide.</p>}
    <div className="guide-columns"><div><h3>{spanish ? "Qué hacer ahora" : "What to do next"}</h3><ol className="guide-steps">{guide.instructions.map((instruction, index) => <li key={index}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><p>{instruction}</p></li>)}</ol></div><div className="guide-side"><h3>{spanish ? "Preguntas para el equipo" : "Questions for the team"}</h3><ul>{guide.questions_to_ask_the_care_team.map((question, index) => <li key={index}>{question}</li>)}</ul><div className="teach-back"><strong>{spanish ? "Explique el plan con sus palabras" : "Teach-back"}</strong><p>{guide.teach_back_prompt}</p></div></div></div>
  </section>;
}
