export type Patient = {
  patient_id: string; name: string; age_years: number;
  demographics: { primary_language: string; zip_code: string; household_income_level: string };
  molecular_profile: { biomarkers: string[]; diagnosis: string; allergies: string[]; current_prescriptions: string[] };
  sdoh_profile: { insurance_status: string; transportation_access: string; financial_strain: string; caregiver_availability: string; health_literacy_level: string };
};
export type TaskStatus = "todo" | "in_progress" | "complete";
export type CareTask = { id: string; assignee: string; title: string; description: string; priority: "urgent" | "high" | "routine"; status: TaskStatus; category: string; due_date: string | null };
export type CarePlan = {
  patient_id: string; synthesis_timestamp: string; demo_disclaimer: string;
  clinical_summary: { biological_risk_overview: string; standard_plan_description: string; equity_plan_description: string; standard_plan_cost_estimate: string | null; equity_plan_cost_estimate: string | null; cost_estimate_disclaimer: string };
  safety_findings: { severity: "info" | "warning" | "critical"; title: string; description: string; source: string }[];
  equity_adjustments: { id: string; category: string; original: string; adapted: string; rationale: string; requires_clinician_review: boolean; requires_external_verification: boolean }[];
  care_team_tasks: CareTask[];
  patient_guide: { language: string; reading_level: string; title: string; instructions: string[]; questions_to_ask_the_care_team: string[]; teach_back_prompt: string; translation_required: boolean };
};
