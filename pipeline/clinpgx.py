import requests

BASE_URL = "https://api.clinpgx.org/v1"


def get_drug_info(drug):
    """Get the basic ClinPGx drug record."""

    response = requests.get(
        f"{BASE_URL}/data/drug",
        params={
            "name": drug,
            "view": "base"
        },
        timeout=30
    )

    response.raise_for_status()

    return response.json()


def get_clinical_annotations(drug):
    """
    Get ClinPGx clinical annotations for a drug.
    """

    response = requests.get(
        f"{BASE_URL}/data/clinicalAnnotation",
        params={
            "relatedChemicals.name": drug,
            "view": "base"
        },
        timeout=30
    )

    response.raise_for_status()

    return response.json()


def get_guideline_annotations(drug):
    """
    Get PGx dosing guideline annotations for a drug.
    """

    response = requests.get(
        f"{BASE_URL}/data/guidelineAnnotation",
        params={
            "relatedChemicals.name": drug,
            "view": "base"
        },
        timeout=30
    )

    response.raise_for_status()

    return response.json()


def get_drug_evidence(drug):
    """
    Get all relevant PGx evidence for a drug.
    """

    return {
        "drug": get_drug_info(drug),
        "clinical_annotations": get_clinical_annotations(drug),
        "guideline_annotations": get_guideline_annotations(drug)
    }


def get_relevant_drug_info(drugs):

    results = {}

    for drug in drugs:

        try:
            results[drug] = get_drug_evidence(drug)

        except Exception as e:

            results[drug] = {
                "error": str(e)
            }

    return results


if __name__ == "__main__":

    drugs = [
        "warfarin",
        "simvastatin",
        "azathioprine"
    ]

    results = get_relevant_drug_info(drugs)

    for drug, result in results.items():

        print("\n" + "=" * 70)
        print(f"DRUG: {drug}")
        print("=" * 70)

        if "error" in result:

            print("ERROR:", result["error"])
            continue

        clinical = result["clinical_annotations"].get("data", [])
        guidelines = result["guideline_annotations"].get("data", [])

        print(f"Clinical annotations: {len(clinical)}")
        print(f"Guideline annotations: {len(guidelines)}")