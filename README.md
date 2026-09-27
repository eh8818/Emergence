# Emergence

Emergence is a clinical research demo with a Next.js care-coordination interface, a separate Streamlit prototype, and Python scripts for pharmacogenomic (PGx) and social-determinants-of-health (SDOH) exploration. Medication content is for clinician review; this repository is not a clinical system.

## Repository structure

This is the complete tracked file tree on `main` (excluding generated files such as `node_modules/` and `.next/`):

```text
.
├── .gitignore
├── PharmCAT-tutorial                 # Git commit pointer; see note below
├── README.md
├── app.py                            # Separate Streamlit prototype
├── engine.py                         # Simple medication-review demonstration
├── sdoh.py                           # Hard-coded province profiles used by app.py
├── requirements.txt                  # Python dependencies
├── data/
│   └── pumf_cchs.csv
├── demo/
│   ├── patient.match.json
│   ├── patient.match_warnings.txt
│   ├── patient.missing_pgx_var.vcf
│   ├── patient.phenotype.json
│   ├── patient.preprocessed.vcf.bgz
│   ├── patient.report.html
│   ├── patient.vcf.bgz
│   └── patient.vcf.bgz.csi
├── frontend/                         # Next.js / React / TypeScript clinical demo
│   ├── .gitignore
│   ├── app/
│   │   ├── care-coordination/
│   │   │   └── page.tsx              # Redirects to the main dashboard
│   │   ├── medication-navigator/
│   │   │   ├── navigator.css
│   │   │   └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                  # Care Coordinator dashboard
│   ├── components/
│   │   ├── caregiver/
│   │   │   └── patient-guide.tsx
│   │   ├── coordination/
│   │   │   └── coordination-queue.tsx
│   │   ├── patient/
│   │   │   ├── new-patient-form.tsx
│   │   │   └── patient-context.tsx
│   │   └── ui/
│   │       └── folder-float.tsx
│   ├── lib/
│   │   ├── api.ts                    # Care Coordinator HTTP client
│   │   ├── emergence.ts              # Medication Navigator HTTP client and types
│   │   └── types.ts                  # Shared care-plan types
│   ├── eslint.config.mjs
│   ├── next-env.d.ts
│   ├── next.config.mjs
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.ts
│   └── tsconfig.json
└── pipeline/                         # Research scripts and model artifacts
    ├── clinician_plan.py
    ├── clinpgx.py
    ├── decision_engine.py
    ├── evaluate_sdoh_model.py
    ├── explainability.py
    ├── inspect_annotations.py
    ├── inspect_cchs.py
    ├── inspect_clinpgx
    ├── integration.py
    ├── matcher.py
    ├── pharmcat.py
    ├── sdoh_model.joblib
    ├── sdoh_model_no_province.joblib
    ├── sdoh_predictor.py
    ├── sdoh_profile.py
    ├── shap_sdoh.py
    ├── summary.py
    ├── train_sdoh_model.py
    └── train_sdoh_no_province.py
```

`PharmCAT-tutorial` is recorded as a Git commit pointer rather than ordinary files in this repository. There is no `.gitmodules` file on `main`, so its contents are not available through this tree.

## What runs today

| Part | Entry point | What it does |
| --- | --- | --- |
| Care Coordinator | `frontend/app/page.tsx` at `/` | Displays Patient A/B and entered-patient context, care plans, tasks, a patient guide, and a note preview. |
| Medication Navigator | `frontend/app/medication-navigator/page.tsx` | Shows a research medication review and selected Care Coordinator chart context. Genomic and model samples are separate from that chart. |
| Streamlit prototype | `app.py` | Accepts age, province/territory, and condition; calls the simple `sdoh.py` and `engine.py` example logic. Its PGx input and medication names are placeholders. |
| Research pipeline | `pipeline/` | Holds PGx/SDOH exploration scripts and saved model artifacts. It is not the HTTP API used by the Next.js client. |

The two interfaces are separate. The repository currently **does not contain the HTTP API servers** expected by the Next.js client. Running the frontend alone can render the UI, but patient loading, patient creation, care-plan generation, note preview, and Medication Navigator data require those services.

## Run the Next.js frontend

Install Node.js and npm, then:

```bash
git clone https://github.com/eh8818/Emergence.git
cd Emergence/frontend
npm ci
npm run dev
```

Open `http://localhost:3000`. The frontend uses these API bases unless configured otherwise:

| Environment variable | Default | Routes used |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000` | `/health`, `/api/v1/patients`, `/api/v1/synthesize-care-plan`, `/api/v1/export-note-preview` |
| `NEXT_PUBLIC_EMERGENCE_API_BASE_URL` | `http://127.0.0.1:8002` | `/api/dashboard`, `/api/sdoh/global` |

Set these variables to compatible API services if you have them. The checked-in `app.py` is a Streamlit app and does not serve these routes.

Frontend checks:

```bash
cd frontend
npm run typecheck
npm run lint
npm run build
```

## Run the separate Streamlit prototype

From the repository root, install the Python dependencies and start Streamlit:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m streamlit run app.py
```

This is the older Python demo, not the backend for `frontend/`. Its province profiles are hard-coded examples and fall back to Ontario for provinces without an entry; they should not be treated as validated clinical or insurance data.

## Safety and scope

Emergence is a research and demonstration project, not a certified medical device or production EHR integration. Patient examples, costs, coverage, PGx samples, and model outputs need independent verification before real-world use. Every medication suggestion requires clinician review. The note export in the frontend is a preview, not a write to an EHR.

## License

No license is specified in this repository.
