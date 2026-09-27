"""
Emergence Explainability Engine

This module creates transparent, rule-based evidence scores.

IMPORTANT:
These are NOT clinical risk probabilities.
They are NOT treatment recommendations.
They are evidence-contribution scores showing why
Emergence surfaced a finding.
"""


def calculate_feature_contributions(finding):
    """
    Calculate transparent feature contributions for a
    medication-specific PGx finding.

    The score is intentionally simple and auditable.
    """

    features = {}

    # ---------------------------------------------------------
    # Feature 1: PGx phenotype relevance
    # ---------------------------------------------------------

    phenotype = finding.get("phenotype")

    if phenotype in [
        "Normal Metabolizer",
        "Intermediate Metabolizer",
        "Poor Metabolizer",
        "Rapid Metabolizer",
        "Ultrarapid Metabolizer",
        "Decreased Function",
        "Low Function",
        "Normal Function",
    ]:
        features["PGx phenotype relevance"] = 40

    elif phenotype == "No Result" or phenotype is None:
        features["PGx phenotype relevance"] = 0

    else:
        features["PGx phenotype relevance"] = 20

    # ---------------------------------------------------------
    # Feature 2: Guideline evidence
    # ---------------------------------------------------------

    status = finding.get("status", "")

    if status == "PGx GUIDELINE EVIDENCE":
        features["Guideline evidence"] = 30

    elif status == "PGx RECOMMENDATION EVIDENCE":
        features["Guideline evidence"] = 25

    elif status == "RELEVANT PGx EVIDENCE":
        features["Guideline evidence"] = 15

    else:
        features["Guideline evidence"] = 0

    # ---------------------------------------------------------
    # Feature 3: Gene-drug specificity
    # ---------------------------------------------------------

    if finding.get("gene") and finding.get("drug"):
        features["Gene–drug specificity"] = 20
    else:
        features["Gene–drug specificity"] = 0

    # ---------------------------------------------------------
    # Feature 4: Genetic result completeness
    # ---------------------------------------------------------

    diplotype = finding.get("diplotype")

    if (
        diplotype
        and "Unknown" not in str(diplotype)
        and "None" not in str(diplotype)
    ):
        features["Genetic result completeness"] = 10

    else:
        features["Genetic result completeness"] = 0

    # ---------------------------------------------------------
    # Calculate total
    # ---------------------------------------------------------

    total_score = sum(features.values())

    # Calculate each feature's percentage contribution.
    if total_score > 0:

        contributions = {
            feature: {
                "points": points,
                "percentage": (points / total_score) * 100,
            }
            for feature, points in features.items()
            if points > 0
        }

    else:

        contributions = {}

    return {
        "features": features,
        "total_score": total_score,
        "contributions": contributions,
    }


def explain_star_diplotype(gene, diplotype, phenotype):
    """
    Translate a pharmacogenomic diplotype into plain language.
    """

    if not diplotype:
        return {
            "short": "No diplotype available.",
            "detailed": (
                "Emergence does not have enough genetic information "
                "to explain this result."
            ),
        }

    # Unknown / unavailable result
    if "Unknown" in str(diplotype):

        return {
            "short": "The genetic result could not be determined.",
            "detailed": (
                f"PharmCAT could not determine a complete "
                f"{gene} diplotype from the available genetic data. "
                "The result should therefore not be interpreted "
                "as evidence of normal or abnormal function."
            ),
        }

    # Same allele on both chromosomes
    if "/" in str(diplotype):

        allele1, allele2 = diplotype.split("/", 1)

        if allele1 == allele2:

            explanation = (
                f"The patient has two copies of the {allele1} "
                f"allele of {gene}."
            )

        else:

            explanation = (
                f"The patient has two different versions of the "
                f"{gene}: one {allele1} allele and one {allele2} "
                "allele."
            )

    else:

        explanation = (
            f"PharmCAT identified the {diplotype} form of {gene}."
        )

    # Add phenotype explanation
    if phenotype:

        explanation += (
            f" PharmCAT interprets this genetic combination as "
            f"'{phenotype}'."
        )

    return {
        "short": explanation,
        "detailed": (
            explanation
            + " Star-allele labels such as *1 and *15 are "
            "standardized names for particular combinations "
            "of genetic variants; they are not medication "
            "doses or risk percentages."
        ),
    }


def explain_pgx_finding(finding):
    """
    Create the complete XAI explanation for one finding.
    """

    score = calculate_feature_contributions(finding)

    genetics = explain_star_diplotype(
        finding.get("gene"),
        finding.get("diplotype"),
        finding.get("phenotype"),
    )

    return {
        "drug": finding.get("drug"),
        "gene": finding.get("gene"),
        "diplotype": finding.get("diplotype"),
        "phenotype": finding.get("phenotype"),
        "plain_language": genetics,
        "feature_importance": score,
        "sources": finding.get("sources", []),
        "guidelines": finding.get("guidelines", []),
        "evidence_status": finding.get("status"),
    }


def explain_medication_profile(profile):

    explanations = []

    for finding in profile.get("pgx_findings", []):

        explanations.append(
            explain_pgx_finding(finding)
        )

    return explanations


def build_explainability_report(medication_profiles):

    report = {}

    for drug, profile in medication_profiles.items():

        report[drug] = {
            "medication": drug,
            "pgx_explanations": (
                explain_medication_profile(profile)
            ),
            "sdoh_explanation": {
                "source": "Statistics Canada CCHS 2022",
                "description": (
                    "Population-level Canadian healthcare "
                    "and medication-access context."
                ),
                "considerations": profile[
                    "sdoh_considerations"
                ],
            },
        }

    return report