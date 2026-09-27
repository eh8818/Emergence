from integration import build_integrated_profile


def get_patient_gene_map(patient_profile):
    """
    Convert PharmCAT results into:
    gene -> patient's PGx result
    """

    gene_map = {}

    for result in patient_profile:

        gene = result.get("gene")

        if gene:
            gene_map[gene] = result

    return gene_map


def extract_guideline_genes(guideline):
    """
    Get genes associated with a ClinPGx guideline.
    """

    genes = []

    for gene in guideline.get("relatedGenes", []):

        symbol = gene.get("symbol")

        if symbol:
            genes.append(symbol)

    return genes


def extract_guideline_summary(guideline):
    """
    Get the readable guideline summary.
    """

    summary = guideline.get("summaryMarkdown", {})

    if isinstance(summary, dict):
        return summary.get("html", "")

    return ""


def classify_match(patient_result, guideline):
    """
    Give the PGx match a simple evidence status.

    This does NOT make a prescribing recommendation.
    It only describes what kind of evidence was found.
    """

    phenotype = patient_result.get("phenotype")

    recommendation = guideline.get("recommendation", False)
    dosing_information = guideline.get(
        "dosingInformation",
        False
    )

    if phenotype == "No Result":
        return "INSUFFICIENT GENETIC RESULT"

    if recommendation and dosing_information:
        return "PGx GUIDELINE EVIDENCE"

    if recommendation:
        return "PGx RECOMMENDATION EVIDENCE"

    return "RELEVANT PGx EVIDENCE"


def find_gene_drug_matches():

    profile = build_integrated_profile()

    patient_profile = profile["patient_pgx"]
    drug_evidence = profile["drug_evidence"]

    patient_genes = get_patient_gene_map(
        patient_profile
    )

    matches = []

    for drug, evidence in drug_evidence.items():

        if "error" in evidence:
            continue

        guidelines = evidence.get(
            "guideline_annotations",
            {}
        ).get("data", [])

        for guideline in guidelines:

            guideline_genes = extract_guideline_genes(
                guideline
            )

            overlapping_genes = set(
                patient_genes
            ).intersection(guideline_genes)

            for gene in overlapping_genes:

                patient_result = patient_genes[gene]

                matches.append({

                    "drug": drug,

                    "gene": gene,

                    "diplotype": patient_result.get(
                        "diplotype"
                    ),

                    "phenotype": patient_result.get(
                        "phenotype"
                    ),

                    "source": guideline.get(
                        "source"
                    ),

                    "guideline": guideline.get(
                        "name"
                    ),

                    "recommendation": guideline.get(
                        "recommendation"
                    ),

                    "dosing_information": guideline.get(
                        "dosingInformation"
                    ),

                    "status": classify_match(
                        patient_result,
                        guideline
                    ),

                    "summary": extract_guideline_summary(
                        guideline
                    ),
                })

    return matches


if __name__ == "__main__":

    matches = find_gene_drug_matches()

    print("\n")
    print("=" * 80)
    print("Emergence — PGx EVIDENCE MATCHES")
    print("=" * 80)

    if not matches:

        print("\nNo matches found.")

    else:

        for match in matches:

            print("\n" + "-" * 80)

            print(
                f"Drug:          {match['drug']}"
            )

            print(
                f"Gene:          {match['gene']}"
            )

            print(
                f"Diplotype:     {match['diplotype']}"
            )

            print(
                f"Phenotype:     {match['phenotype']}"
            )

            print(
                f"Evidence:      {match['status']}"
            )

            print(
                f"Source:        {match['source']}"
            )

            print(
                f"Guideline:     {match['guideline']}"
            )

            print(
                f"Recommendation: "
                f"{match['recommendation']}"
            )

            print(
                f"Dosing info:   "
                f"{match['dosing_information']}"
            )