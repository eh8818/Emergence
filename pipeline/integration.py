from pharmcat import load_pharmcat_results, extract_pgx_results
from clinpgx import get_relevant_drug_info
from sdoh_profile import get_cchs_context
from sdoh_predictor import predict_sdoh


DEMO_DRUGS = [
    "sertraline",
    "citalopram",
    "paroxetine",
]

DEMO_SDOH_PROFILE = {
    "INCDGHH": 3,
    "INP_05": 1,
    "RHC_05": 1,
    "EDDVH3": 3,
    "DHHGAGE": 5,
    "DHH_SEX": 2,
    "PCN_05": 1,
    "FSCDVAF2": 0,
    "GEN_10": 2,
    "GEN_15": 6,
    "GEN_20": 2,
    "DHHDGHSZ": 1,
}

def load_patient_pgx():
    data = load_pharmcat_results()
    return extract_pgx_results(data)


def find_patient_genes(patient_profile):
    genes = set()

    for result in patient_profile:
        gene = result.get("gene")

        if gene:
            genes.add(gene)

    return sorted(genes)


def build_integrated_profile():

    patient_pgx = load_patient_pgx()

    patient_genes = find_patient_genes(
        patient_pgx
    )

    drug_evidence = get_relevant_drug_info(
        DEMO_DRUGS
    )

    # Population-level Canadian context
    sdoh_context = get_cchs_context()

    # Patient-specific demo SDOH prediction
    sdoh_prediction = predict_sdoh(
        DEMO_SDOH_PROFILE
    )

    integrated_profile = {

        "patient_pgx": patient_pgx,

        "patient_genes": patient_genes,

        "drug_evidence": drug_evidence,

        "sdoh": sdoh_context,

        "sdoh_prediction": sdoh_prediction,

    }

    return integrated_profile


if __name__ == "__main__":
    profile = build_integrated_profile()

    print("\n")
    print("=" * 80)
    print("Emergence — INTEGRATED PATIENT PROFILE")
    print("=" * 80)

    # ============================================================
    # KEY PHARMACOGENOMIC FINDINGS
    # ============================================================

    print("\nKEY PHARMACOGENOMIC FINDINGS")
    print("-" * 80)

    key_findings = {
        "SLCO1B1": (
            "Reduced activity of this medication-transport gene was "
            "predicted. This is relevant to certain medications, "
            "including some statins."
        ),
        "NUDT15": (
            "The patient may process certain medications differently "
            "from someone with normal NUDT15 activity."
        ),
        "CYP2C9": (
            "Normal CYP2C9 function was predicted in the variants assessed."
        ),
    }

    patient_gene_map = {
        result["gene"]: result
        for result in profile["patient_pgx"]
    }

    for gene, explanation in key_findings.items():
        result = patient_gene_map.get(gene)

        if not result:
            continue

        print(f"\n {gene}")
        print(
            f"   {result['diplotype']} — "
            f"{result['phenotype']}"
        )
        print(
            f"   Plain English: {explanation}"
        )

    # ============================================================
    # COMPLETE PGx PROFILE
    # ============================================================

    print("\n\nCOMPLETE PHARMACOGENOMIC PROFILE")
    print("-" * 80)

    for result in profile["patient_pgx"]:
        print(
            f"{result['gene']:10} | "
            f"{str(result['diplotype']):20} | "
            f"{result['phenotype']}"
        )

    print(
        "\nInterpretation: These results describe predicted "
        "pharmacogenomic function based on the genetic variants "
        "assessed by PharmCAT. They are intended to support "
        "clinical review, not independently determine medication "
        "selection or dosing."
    )

    # ============================================================
    # CANADIAN HEALTHCARE CONTEXT
    # ============================================================

    print("\nCANADIAN HEALTHCARE CONTEXT")
    print("-" * 80)

    sdoh = profile["sdoh"]

    print(
        f"Prescription coverage: "
        f"{sdoh['prescription_coverage_rate'] * 100:.1f}%"
    )

    print(
        f"Prescription medication use: "
        f"{sdoh['prescription_use_rate'] * 100:.1f}%"
    )

    print(
        f"Cost-related non-adherence: "
        f"{sdoh['cost_related_nonadherence_rate'] * 100:.1f}%"
    )

    # ============================================================
    # SDOH MODEL PREDICTION
    # ============================================================

    print("\nSDOH MODEL PREDICTION")
    print("-" * 80)

    prediction = profile["sdoh_prediction"]

    print(
        f"Model-estimated probability of "
        f"cost-related prescription non-adherence: "
        f"{prediction['probability_percent']:.2f}%"
    )

    print("\nWhat influenced the model estimate:")
    print("-" * 80)

    for explanation in prediction["explanations"][:5]:
        if explanation["shap_value"] > 0:
            direction = "higher model estimate"
        elif explanation["shap_value"] < 0:
            direction = "lower model estimate"
        else:
            direction = "no meaningful contribution"

        print(
            f"• {explanation['label']} "
            f"→ {direction} "
            f"(SHAP: {explanation['shap_value']:+.5f})"
        )

    print(
        "\nNote: SHAP values describe how the model arrived "
        "at its estimate; they do not establish causal relationships."
    )

    # ============================================================
    # MEDICATIONS
    # ============================================================

    print("\nMEDICATIONS INVESTIGATED")
    print("-" * 80)

    for drug in profile["drug_evidence"]:
        print(drug)