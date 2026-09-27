from integration import build_integrated_profile


def get_patient_gene_map(patient_profile):
    """
    Convert the patient's PGx results into a dictionary:
    gene -> PGx result
    """
    gene_map = {}

    for result in patient_profile:
        gene = result.get("gene")

        if gene:
            gene_map[gene] = result

    return gene_map


def extract_guideline_genes(guideline):
    """
    Extract gene symbols associated with a ClinPGx guideline.
    """
    genes = []

    for gene in guideline.get("relatedGenes", []):
        symbol = gene.get("symbol")

        if symbol:
            genes.append(symbol)

    return genes


def classify_match(patient_result, guideline):
    """
    Classify how strong/relevant the medication-specific evidence is.
    """

    phenotype = patient_result.get("phenotype")

    recommendation = guideline.get("recommendation", False)
    dosing_information = guideline.get("dosingInformation", False)

    # We cannot interpret a missing PGx result.
    if phenotype == "No Result":
        return "INSUFFICIENT GENETIC RESULT"

    # Strongest category in our demo:
    # ClinPGx contains both a recommendation and dosing information.
    if recommendation and dosing_information:
        return "PGx GUIDELINE EVIDENCE"

    if recommendation:
        return "PGx RECOMMENDATION EVIDENCE"

    return "RELEVANT PGx EVIDENCE"


def find_medication_pgx_matches(profile):
    """
    Find medications for which the patient's PGx genes
    overlap with genes represented in ClinPGx guidelines.
    """

    patient_profile = profile["patient_pgx"]
    drug_evidence = profile["drug_evidence"]

    patient_genes = get_patient_gene_map(patient_profile)

    matches = []

    for drug, evidence in drug_evidence.items():

        if "error" in evidence:
            continue

        guidelines = evidence.get(
            "guideline_annotations", {}
        ).get("data", [])

        for guideline in guidelines:

            guideline_genes = extract_guideline_genes(guideline)

            overlapping_genes = (
                set(patient_genes).intersection(guideline_genes)
            )

            for gene in overlapping_genes:

                patient_result = patient_genes[gene]

                matches.append({
                    "drug": drug,
                    "gene": gene,
                    "diplotype": patient_result.get("diplotype"),
                    "phenotype": patient_result.get("phenotype"),
                    "status": classify_match(
                        patient_result,
                        guideline
                    ),
                    "source": guideline.get("source"),
                    "guideline": guideline.get("name"),
                    "recommendation": guideline.get(
                        "recommendation"
                    ),
                    "dosing_information": guideline.get(
                        "dosingInformation"
                    ),
                })

    return matches


def aggregate_matches(matches):
    """
    Remove duplicate findings caused by multiple
    ClinPGx records for the same drug/gene result.
    """

    aggregated = {}

    for match in matches:

        key = (
            match["drug"],
            match["gene"],
            match["diplotype"],
            match["phenotype"],
            match["status"],
        )

        if key not in aggregated:

            aggregated[key] = {
                "drug": match["drug"],
                "gene": match["gene"],
                "diplotype": match["diplotype"],
                "phenotype": match["phenotype"],
                "status": match["status"],
                "sources": [],
                "guidelines": [],
            }

        source = match.get("source")

        if source and source not in aggregated[key]["sources"]:
            aggregated[key]["sources"].append(source)

        guideline = match.get("guideline")

        if guideline and guideline not in aggregated[key]["guidelines"]:
            aggregated[key]["guidelines"].append(guideline)

    return list(aggregated.values())


def summarize_sdoh(sdoh):
    """
    Convert population-level CCHS context into
    general medication-access considerations.

    These are NOT patient-level predictions.
    """

    considerations = []

    coverage = sdoh.get("prescription_coverage_rate")
    nonadherence = sdoh.get(
        "cost_related_nonadherence_rate"
    )

    if coverage is not None:
        considerations.append(
            f"{coverage * 100:.1f}% of CCHS respondents "
            "reported prescription medication insurance coverage."
        )

    if nonadherence is not None:
        considerations.append(
            f"{nonadherence * 100:.1f}% of CCHS respondents "
            "reported cost-related prescription non-adherence."
        )

    return considerations


def build_medication_profiles():

    profile = build_integrated_profile()

    matches = find_medication_pgx_matches(profile)

    aggregated_matches = aggregate_matches(matches)

    sdoh = profile["sdoh"]

    sdoh_considerations = summarize_sdoh(sdoh)

    medication_profiles = {}

    # Create a profile for every medication being investigated.
    for drug in profile["drug_evidence"]:

        medication_profiles[drug] = {
            "drug": drug,
            "pgx_findings": [],
            "sdoh_considerations": sdoh_considerations,
            "clinical_review_status": (
                "Review medication-specific PGx evidence"
            ),
        }

    # Add the medication-specific PGx findings.
    for match in aggregated_matches:

        drug = match["drug"]

        if drug not in medication_profiles:
            continue

        medication_profiles[drug]["pgx_findings"].append(
            match
        )

    return medication_profiles


if __name__ == "__main__":

    medication_profiles = build_medication_profiles()

    print("\n")
    print("=" * 80)
    print("Emergence — PERSONALIZED MEDICATION EVIDENCE")
    print("=" * 80)

    for drug, profile in medication_profiles.items():

        print("\n")
        print("=" * 80)
        print(f"MEDICATION: {drug.upper()}")
        print("=" * 80)

        print("\nPGx FINDINGS")
        print("-" * 80)

        findings = profile["pgx_findings"]

        if not findings:

            print(
                "No medication-specific PGx findings identified."
            )

        else:

            for finding in findings:

                print(
                    f"Gene:        {finding['gene']}"
                )

                print(
                    f"Diplotype:   {finding['diplotype']}"
                )

                print(
                    f"Phenotype:   {finding['phenotype']}"
                )

                print(
                    f"Evidence:    {finding['status']}"
                )

                print(
                    f"Sources:     "
                    f"{', '.join(finding['sources'])}"
                )

                print(
                    f"Guidelines:  "
                    f"{', '.join(finding['guidelines'])}"
                )

                print()

        print("CANADIAN CONTEXT")
        print("-" * 80)

        for consideration in profile[
            "sdoh_considerations"
        ]:

            print(f"• {consideration}")

        print("\nCLINICAL REVIEW STATUS")
        print("-" * 80)

        print(
            profile["clinical_review_status"]
        )