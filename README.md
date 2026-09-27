# 🍁 Emergence Health

**Creating personalized medication profiles for Canadians.**

Emergence Health is a proof-of-concept clinical decision-support tool that combines **pharmacogenomic (PGx)** evidence with **Canadian social determinants of health (SDOH)** to generate explainable, patient-specific medication review profiles. It's designed around the idea that "what works" for a patient depends not just on their genome, but also on their social determinant context.

## How it works

Given a patient's age, province/territory, and condition, Emergence:

1. **Analyzes the genomic profile** — intended to run [PharmCAT](https://pharmcat.org/) to translate pharmacogenomic variants into actionable phenotypes (see `PharmCAT-tutorial/`).
2. **Builds Canadian context** — looks up province/territory-level indicators (economic stability, residential stability, access to care) via `sdoh.py`.
3. **Integrates patient factors** — merges PGx results and SDOH context into a per-medication recommendation (`Review` / flags and reasons) via `engine.py`.
4. **Surfaces an explainable profile** — presents the result to the clinician/patient in a Streamlit interface (`app.py`).

## Project structure

```
.
├── app.py               # Streamlit front-end / entry point
├── engine.py             # Core logic that merges PGx + SDOH signals into a medication profile
├── sdoh.py                # Canadian social-determinants-of-health lookups by province/territory
├── requirements.txt       # Python dependencies
├── PharmCAT-tutorial/     # Notes/assets for integrating PharmCAT pharmacogenomic calling
├── data/                  # Reference and/or sample data
├── demo/                  # Demo assets
└── frontend/              # Front-end assets/prototypes
```

## Getting started

### Prerequisites

- Python 3.10+

### Installation

```bash
git clone https://github.com/eh8818/Emergence.git
cd Emergence
pip install -r requirements.txt
```

### Run the app

```bash
streamlit run app.py
```

This launches the Streamlit UI, where you can select a patient's age, province/territory, and condition, then click **🍁 Analyze Patient** to generate a profile.

## Tech stack

- [Streamlit](https://streamlit.io/) — web UI
- [PharmCAT](https://pharmcat.org/) — pharmacogenomic variant interpretation
- pandas / NumPy / scikit-learn / XGBoost / SHAP — modeling and explainability
- Plotly / Altair — visualization

## Status

This project is an early-stage prototype. Pharmacogenomic integration (`pgx_results`) and the medication list in `app.py` are currently placeholders, and SDOH data currently covers a subset of provinces (Ontario, British Columbia, Alberta), falling back to Ontario's profile otherwise.

## Disclaimer

Emergence Health is a research/educational prototype and **is not a certified medical device**. It is not intended to diagnose, treat, or provide clinical medication decisions on its own. Always consult a qualified healthcare provider before making medication decisions.

## License

No license specified yet.
