"""
Emergence — Clinician-Facing Medication Review

Produces a hackathon-friendly, plain-language
clinical decision-support summary.
"""

from decision_engine import build_medication_profiles
from explainability import build_explainability_report


def get_clinical_interpretation(finding):

    gene = finding["gene"]
    phenotype = finding["phenotype"]
    drug = finding["drug"]

    interpretations = {

        ("SLCO1B1", "Decreased Function"): (
            f"The patient's {gene} result indicates reduced "
            f"function of a transporter involved in the handling "
            f"of some statin medications. For {drug}, this "
            "finding is clinically relevant because established "
            "guidelines associate reduced SLCO1B1 function with "
            "higher simvastatin exposure and increased risk of "
            "muscle-related adverse effects."
        ),

        ("CYP2C9", "Normal Metabolizer"): (
            "The patient's CYP2C9 result is classified as "
            "normal metabolizer status. CYP2C9 contributes to "
            "the metabolism of warfarin, so this result provides "
            "one part of the pharmacogenomic picture used when "
            "reviewing warfarin therapy."
        ),

        ("CYP4F2", None): (
            "The patient's CYP4F2 diplotype was identified, but "
            "PharmCAT did not assign a phenotype. The genotype "
            "may still be relevant to warfarin pharmacogenomic "
            "evidence, but it should not be translated into a "
            "functional prediction by Emergence."
        ),

        ("VKORC1", None): (
            "The patient's VKORC1 genetic result is represented "
            "in the warfarin guideline evidence. PharmCAT did "
            "not assign a conventional phenotype to this result, "
            "so Emergence displays the underlying genotype and "
            "guideline connection without inventing a phenotype."
        ),

        ("ABCG2", "Normal Function"): (
            "The patient's ABCG2 result is classified as normal "
            "function. ClinPGx contains ABCG2-related evidence "
            "for several statins, including simvastatin. This "
            "finding is displayed as supporting evidence rather "
            "than as an independent treatment recommendation."
        ),

        ("CYP3A5", "Normal Metabolizer"): (
            "The patient's CYP3A5 result is classified as normal "
            "metabolizer. ClinPGx includes CYP3A-related evidence "
            "for statins, but this result should be interpreted "
            "together with the medication-specific guideline."
        ),
    }

    key = (gene, phenotype)

    if key in interpretations:
        return interpretations[key]

    return (
        f"The patient's {gene} result is classified as "
        f"{phenotype}. This result was identified because "
        f"ClinPGx contains medication-specific evidence "
        f"connecting {gene} with {drug}. The underlying "
        "guideline should be reviewed before making a "
        "clinical treatment decision."
    )


def build_clinician_plan():

    medication_profiles = build_medication_profiles()

    xai = build_explainability_report(
        medication_profiles
    )

    plans = {}

    for drug, profile in medication_profiles.items():

        explanations = xai[drug]["pgx_explanations"]

        findings = []

        for explanation in explanations:

            finding = {
                "gene": explanation["gene"],
                "diplotype": explanation["diplotype"],
                "phenotype": explanation["phenotype"],
                "plain_language": explanation[
                    "plain_language"
                ],
                "clinical_interpretation": (
                    get_clinical_interpretation({
                        "gene": explanation["gene"],
                        "drug": drug,
                        "phenotype": explanation[
                            "phenotype"
                        ],
                    })
                ),
                "evidence_status": explanation[
                    "evidence_status"
                ],
                "sources": explanation["sources"],
                "guidelines": explanation["guidelines"],
                "feature_importance": explanation[
                    "feature_importance"
                ],
            }

            findings.append(finding)

        plans[drug] = {

            "medication": drug,

            "summary": (
                f"Emergence identified {len(findings)} "
                "medication-specific pharmacogenomic "
                "finding(s) requiring clinical review."
            ),

            "findings": findings,

            "canadian_context": profile[
                "sdoh_considerations"
            ],

            "clinical_actions": [

                "Review the medication-specific PGx "
                "guideline evidence.",

                "Confirm the patient's clinical indication, "
                "current medications, comorbidities, renal "
                "and hepatic function, and other relevant "
                "clinical factors.",

                "Use the cited guideline or drug-label "
                "recommendation to determine whether the "
                "genetic finding should alter treatment.",

                "Consider the patient's individual medication "
                "coverage, affordability, and access "
                "circumstances.",

                "Do not treat population-level CCHS statistics "
                "as individual patient predictions.",
            ],

            "safety_boundary": (
                "Emergence is a clinical decision-support "
                "prototype. It does not autonomously prescribe "
                "medication or determine a patient-specific "
                "dose."
            ),
        }

    return plans


def print_feature_importance(feature_importance):

    print("\n  WHY DID Emergence FLAG THIS?")
    print("  " + "-" * 70)

    total = feature_importance["total_score"]

    print(
        f"  Evidence score: {total}/100"
    )

    print()

    for feature, data in sorted(
        feature_importance["contributions"].items(),
        key=lambda x: x[1]["percentage"],
        reverse=True,
    ):

        percentage = data["percentage"]

        bar_length = int(
            percentage / 5
        )

        bar = "█" * bar_length

        print(
            f"  {feature:32} "
            f"{bar:20} "
            f"{percentage:5.1f}%"
        )


if __name__ == "__main__":

    plans = build_clinician_plan()

    print("\n")
    print("=" * 90)
    print("Emergence")
    print("PERSONALIZED MEDICATION REVIEW")
    print("=" * 90)

    print(
        "\nEvidence synthesis for clinician review"
    )

    for drug, plan in plans.items():

        print("\n")
        print("━" * 90)
        print(f"{drug.upper()}")
        print("━" * 90)

        print("\nCLINICAL SUMMARY")
        print("-" * 90)

        print(plan["summary"])

        for finding in plan["findings"]:

            print("\n")
            print(
                f"{finding['gene']} — "
                f"{finding['phenotype']}"
            )

            print("-" * 90)

            print(
                f"Genetic result: "
                f"{finding['diplotype']}"
            )

            print(
                "\nWhat does this mean?"
            )

            print(
                finding["plain_language"]["short"]
            )

            print(
                "\nClinical relevance"
            )

            print(
                finding["clinical_interpretation"]
            )

            print(
                "\nEvidence"
            )

            print(
                f"  {finding['evidence_status']}"
            )

            print(
                "  Sources: "
                + ", ".join(finding["sources"])
            )

            print_feature_importance(
                finding["feature_importance"]
            )

            print(
                "\n  Guideline records:"
            )

            for guideline in finding[
                "guidelines"
            ]:

                print(
                    f"     • {guideline}"
                )

        print("\n")
        print("🇨🇦 CANADIAN CONTEXT")
        print("-" * 90)

        for item in plan["canadian_context"]:

            print(
                f"• {item}"
            )

        print("\n")
        print("CLINICIAN REVIEW CHECKLIST")
        print("-" * 90)

        for i, action in enumerate(
            plan["clinical_actions"],
            start=1,
        ):

            print(
                f"{i}. {action}"
            )

        print("\n")
        print("SAFETY BOUNDARY")
        print("-" * 90)

        print(
            plan["safety_boundary"]
        )