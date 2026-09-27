import joblib
import pandas as pd
import numpy as np
import shap

from pathlib import Path


MODEL_FILE = Path("pipeline/sdoh_model_no_province.joblib")


FEATURES = [
    "INCDGHH",
    "INP_05",
    "RHC_05",
    "EDDVH3",
    "DHHGAGE",
    "DHH_SEX",
    "PCN_05",
    "FSCDVAF2",
    "GEN_10",
    "GEN_15",
    "GEN_20",
    "DHHDGHSZ",
]


FEATURE_LABELS = {
    "INCDGHH": "Household income",
    "INP_05": "Prescription medication insurance",
    "RHC_05": "Regular healthcare provider",
    "EDDVH3": "Household education",
    "DHHGAGE": "Age group",
    "DHH_SEX": "Sex",
    "PCN_05": "Prescription medication use",
    "FSCDVAF2": "Food security",
    "GEN_10": "Life stress",
    "GEN_15": "Work stress",
    "GEN_20": "Sense of belonging",
    "DHHDGHSZ": "Household size",
}


def load_model():

    saved = joblib.load(
        MODEL_FILE
    )

    return saved


def get_original_feature(encoded_name):

    name = encoded_name

    if name.startswith("categorical__"):

        name = name.replace(
            "categorical__",
            "",
            1
        )

    for feature in FEATURES:

        if name == feature:

            return feature

        if name.startswith(
            feature + "_"
        ):

            return feature

    return name


def predict_sdoh(patient_data):

    saved = load_model()

    model = saved["model"]

    preprocessor = saved["preprocessor"]


    # ------------------------------------------------
    # Create patient dataframe
    # ------------------------------------------------

    X = pd.DataFrame(
        [[patient_data[feature] for feature in FEATURES]],
        columns=FEATURES,
    )


    # ------------------------------------------------
    # Apply EXACT same preprocessing as SHAP script
    # ------------------------------------------------

    X_encoded = preprocessor.transform(
        X
    )

    # Convert sparse matrix to dense,
    # matching shap_sdoh.py exactly.
    X_dense = X_encoded.toarray()


    # ------------------------------------------------
    # Model prediction
    # ------------------------------------------------

    probability = model.predict_proba(
        X_dense
    )[0, 1]


    # ------------------------------------------------
    # SHAP explanation
    # ------------------------------------------------

    explainer = shap.TreeExplainer(
        model
    )

    shap_values = explainer.shap_values(
        X_dense
    )


    # Make sure SHAP output is a NumPy array
    shap_values = np.asarray(
        shap_values
    )


    # Binary XGBoost should give:
    # (1, number_of_encoded_features)

    if shap_values.ndim == 3:

        shap_values = shap_values[0]


    if shap_values.ndim == 2:

        shap_values = shap_values[0]


    # ------------------------------------------------
    # Get encoded feature names
    # ------------------------------------------------

    encoded_feature_names = (
        preprocessor
        .get_feature_names_out()
    )


    # ------------------------------------------------
    # Aggregate one-hot features back to
    # original CCHS variables
    # ------------------------------------------------

    contributions = {
        feature: 0.0
        for feature in FEATURES
    }


    for encoded_name, value in zip(
        encoded_feature_names,
        shap_values,
    ):

        original_feature = (
            get_original_feature(
                encoded_name
            )
        )

        if original_feature in contributions:

            contributions[
                original_feature
            ] += float(value)


    # ------------------------------------------------
    # Rank contributions
    # ------------------------------------------------

    ranked_contributions = sorted(
        contributions.items(),
        key=lambda item: abs(item[1]),
        reverse=True,
    )


    explanations = []


    for feature, value in ranked_contributions:

        if value > 0:

            direction = (
                "toward higher predicted non-adherence"
            )

        elif value < 0:

            direction = (
                "toward lower predicted non-adherence"
            )

        else:

            direction = (
                "no meaningful contribution"
            )


        explanations.append({

            "feature": feature,

            "label": FEATURE_LABELS[
                feature
            ],

            "shap_value": value,

            "direction": direction,

        })


    return {

        "probability": float(
            probability
        ),

        "probability_percent": float(
            probability * 100
        ),

        "target": (
            "cost-related prescription "
            "medication non-adherence"
        ),

        "explanations": explanations,

    }


# ====================================================
# DEMO
# ====================================================

if __name__ == "__main__":

    demo_patient = {

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


    result = predict_sdoh(
        demo_patient
    )


    print("=" * 80)

    print(
        "Emergence — SDOH PREDICTION"
    )

    print("=" * 80)


    print(

        f"\nModel-estimated probability: "

        f"{result['probability_percent']:.2f}%"

    )


    print(

        "\nTarget:"

        f"\n{result['target']}"

    )


    print(

        "\nSHAP EXPLANATION"

    )

    print(

        "-" * 80

    )


    for explanation in result[
        "explanations"
    ]:

        print(

            f"{explanation['label']:40} "

            f"{explanation['shap_value']:+.5f} "

            f"({explanation['direction']})"

        )