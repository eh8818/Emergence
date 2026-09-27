import pandas as pd
from pathlib import Path

DATA_FILE = Path("data/pumf_cchs.csv")


def load_cchs_data():
    return pd.read_csv(DATA_FILE)


def calculate_cchs_context(df):
    context = {}

    # ---------------------------------------------------------
    # Prescription medication coverage
    # INP_05: 1 = Yes, 2 = No
    # ---------------------------------------------------------
    coverage = df["INP_05"]
    valid_coverage = coverage[coverage.isin([1, 2])]

    context["prescription_coverage_rate"] = (
        valid_coverage == 1
    ).mean()

    # ---------------------------------------------------------
    # Prescription medication use
    # PCN_05: 1 = Yes, 2 = No
    # ---------------------------------------------------------
    prescriptions = df["PCN_05"]
    valid_prescriptions = prescriptions[prescriptions.isin([1, 2])]

    context["prescription_use_rate"] = (
        valid_prescriptions == 1
    ).mean()

    # ---------------------------------------------------------
    # Cost-related prescription non-adherence
    # PCNDGCRA:
    # 1 = Experienced cost-related non-adherence
    # 2 = Did not experience cost-related non-adherence
    # ---------------------------------------------------------
    nonadherence = df["PCNDGCRA"]
    valid_nonadherence = nonadherence[nonadherence.isin([1, 2])]

    context["cost_related_nonadherence_rate"] = (
        valid_nonadherence == 1
    ).mean()

    # ---------------------------------------------------------
    # Regular healthcare provider
    # RHC_05:
    # 1 = Has regular healthcare provider
    # 2 = Waiting for a provider in area
    # 3 = Has not tried to find one
    # 4 = Other reason
    # 5 = Provider left/retired/not available
    # ---------------------------------------------------------
    provider = df["RHC_05"]
    valid_provider = provider[provider.isin([1, 2, 3, 4, 5])]

    provider_distribution = (
        valid_provider.value_counts(normalize=True)
        .sort_index()
        .to_dict()
    )

    context["healthcare_provider_distribution"] = provider_distribution

    # ---------------------------------------------------------
    # Household income
    # INCDGHH
    # ---------------------------------------------------------
    income = df["INCDGHH"]
    valid_income = income[income.isin([1, 2, 3, 4, 5])]

    context["household_income_distribution"] = (
        valid_income.value_counts(normalize=True)
        .sort_index()
        .to_dict()
    )

    # ---------------------------------------------------------
    # Household education
    # EDDVH3
    # ---------------------------------------------------------
    education = df["EDDVH3"]
    valid_education = education[education.isin([1, 2, 3])]

    context["education_distribution"] = (
        valid_education.value_counts(normalize=True)
        .sort_index()
        .to_dict()
    )

    context["source"] = (
        "Statistics Canada — Canadian Community Health Survey 2022"
    )

    context["respondents"] = len(df)

    return context


def get_cchs_context():
    df = load_cchs_data()
    return calculate_cchs_context(df)


if __name__ == "__main__":

    context = get_cchs_context()

    print("\n")
    print("=" * 70)
    print("Emergence — CANADIAN HEALTHCARE & SDOH CONTEXT")
    print("=" * 70)

    print(f"\nSource: {context['source']}")
    print(f"Respondents: {context['respondents']:,}")

    # ---------------------------------------------------------
    # Healthcare provider access
    # ---------------------------------------------------------

    print("\nRegular Healthcare Provider")
    print("-" * 70)

    provider_labels = {
        1: "Has regular healthcare provider",
        2: "No provider: Waiting for one in area",
        3: "No provider: Has not tried to find one",
        4: "No provider: Other reason",
        5: "No provider: Provider left, retired, or unavailable",
    }

    for code, proportion in context["healthcare_provider_distribution"].items():
        print(
            f"{provider_labels[code]:55} "
            f"{proportion * 100:5.1f}%"
        )

    # ---------------------------------------------------------
    # Prescription and financial context
    # ---------------------------------------------------------

    print("\nPrescription & Financial SDOH Context")
    print("-" * 70)

    print(
        f"Prescription medication use (past 12 months): "
        f"{context['prescription_use_rate'] * 100:.1f}%"
    )

    print(
        f"Prescription medication insurance coverage: "
        f"{context['prescription_coverage_rate'] * 100:.1f}%"
    )

    print(
        f"Cost-related prescription non-adherence: "
        f"{context['cost_related_nonadherence_rate'] * 100:.1f}%"
    )

    # ---------------------------------------------------------
    # Household income
    # ---------------------------------------------------------

    print("\nHousehold Income Distribution")
    print("-" * 70)

    income_labels = {
        1: "Less than $20,000",
        2: "$20,000–$39,999",
        3: "$40,000–$59,999",
        4: "$60,000–$79,999",
        5: "$80,000 or more",
    }

    for code, proportion in context["household_income_distribution"].items():
        print(
            f"{income_labels[code]:30} "
            f"{proportion * 100:5.1f}%"
        )

    # ---------------------------------------------------------
    # Education
    # ---------------------------------------------------------

    print("\nHousehold Education")
    print("-" * 70)

    education_labels = {
        1: "High school graduation or less",
        2: "Post-secondary below bachelor's degree",
        3: "Bachelor's degree or higher",
    }

    for code, proportion in context["education_distribution"].items():
        print(
            f"{education_labels[code]:40} "
            f"{proportion * 100:5.1f}%"
        )