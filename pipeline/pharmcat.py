import json
from pathlib import Path


RESULT_FILE = Path("demo/patient.phenotype.json")


def load_pharmcat_results():
    with open(RESULT_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def extract_pgx_results(data):
    """Convert PharmCAT's large JSON into a simple PGx table."""

    results = []

    for gene, report in data["geneReports"].items():

        diplotypes = report.get("recommendationDiplotypes", [])

        if not diplotypes:
            continue

        # Usually the first recommendation diplotype is the relevant one
        diplotype = diplotypes[0]

        phenotype_list = diplotype.get("phenotypes", [])

        phenotype = (
            phenotype_list[0]
            if phenotype_list
            else None
        )

        allele1 = diplotype.get("allele1") or {}
        allele2 = diplotype.get("allele2") or {}

        results.append({
            "gene": gene,
            "allele1": allele1.get("name"),
            "allele2": allele2.get("name"),
            "diplotype": diplotype.get("label"),
            "phenotype": phenotype,
        })

    return results


if __name__ == "__main__":

    data = load_pharmcat_results()

    pgx_results = extract_pgx_results(data)

    print("\nCLEAN PGx PROFILE")
    print("=" * 70)

    for result in pgx_results:

        print(
            f"{result['gene']:10} | "
            f"{str(result['diplotype']):20} | "
            f"{result['phenotype']}"
        )