from decision_engine import build_medication_profiles


def create_medication_summary(profile):
    """
    Convert the detailed decision-engine output into
    a clean structure for the Emergence interface.
    """

    findings = profile["pgx_findings"]

    # Separate findings with usable genetic results
    # from findings where the genetic result is unavailable.
    usable_findings = []
    insufficient_findings = []

    for finding in findings:

        if finding["status"] == "INSUFFICIENT GENETIC RESULT":
            insufficient_findings.append(finding)

        else:
            usable_findings.append(finding)

    # Determine an overall evidence status.
    if usable_findings:
        evidence_status = "PGx EVIDENCE IDENTIFIED"

    elif insufficient_findings:
        evidence_status = "GENETIC RESULT INSUFFICIENT"

    else:
        evidence_status = "NO MATCHING PGx EVIDENCE IDENTIFIED"

    return {
        "drug": profile["drug"],
        "evidence_status": evidence_status,
        "pgx_findings": usable_findings,
        "insufficient_genetic_results": insufficient_findings,
        "sdoh_considerations": profile[
            "sdoh_considerations"
        ],
        "clinical_review_status": profile[
            "clinical_review_status"
        ],
    }


def build_Emergence_summary():

    medication_profiles = build_medication_profiles()

    summaries = {}

    for drug, profile in medication_profiles.items():

        summaries[drug] = create_medication_summary(
            profile
        )

    return summaries


if __name__ == "__main__":

    summaries = build_Emergence_summary()

    print("\n")
    print("=" * 80)
    print("Emergence — EVIDENCE SUMMARY")
    print("=" * 80)

    for drug, summary in summaries.items():

        print("\n")
        print("=" * 80)
        print(f"MEDICATION: {drug.upper()}")
        print("=" * 80)

        print(
            f"\nEvidence status: "
            f"{summary['evidence_status']}"
        )

        print("\nPGx FINDINGS")
        print("-" * 80)

        if not summary["pgx_findings"]:

            print(
                "No usable medication-specific PGx findings."
            )

        else:

            for finding in summary["pgx_findings"]:

                print(
                    f"{finding['gene']}: "
                    f"{finding['diplotype']} "
                    f"→ {finding['phenotype']}"
                )

                print(
                    f"  Evidence: {finding['status']}"
                )

                print(
                    f"  Sources: "
                    f"{', '.join(finding['sources'])}"
                )

        if summary["insufficient_genetic_results"]:

            print("\nGENETIC RESULTS REQUIRING CAUTION")
            print("-" * 80)

            for finding in summary[
                "insufficient_genetic_results"
            ]:

                print(
                    f"{finding['gene']}: "
                    f"Genetic result unavailable"
                )

        print("\nCANADIAN CONTEXT")
        print("-" * 80)

        for consideration in summary[
            "sdoh_considerations"
        ]:

            print(f"• {consideration}")

        print("\nSTATUS")
        print("-" * 80)

        print(
            summary["clinical_review_status"]
        )