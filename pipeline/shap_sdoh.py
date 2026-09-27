import joblib
import pandas as pd
import numpy as np
import shap

from pathlib import Path
from sklearn.model_selection import train_test_split


DATA_FILE = Path("data/pumf_cchs.csv")
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


TARGET = "PCNDGCRA"


VALID_CODES = {

    "INCDGHH": [1, 2, 3, 4, 5],

    "INP_05": [1, 2],

    "RHC_05": [1, 2, 3, 4, 5],

    "EDDVH3": [1, 2, 3],

    "DHHGAGE": [1, 2, 3, 4, 5],

    "DHH_SEX": [1, 2],

    "PCN_05": [1, 2],

    "FSCDVAF2": [0, 1, 2, 3],

    "GEN_10": [1, 2, 3, 4, 5],

    "GEN_15": [1, 2, 3, 4, 5, 6],

    "GEN_20": [1, 2, 3, 4],

    "DHHDGHSZ": [1, 2],
}


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


def prepare_data(df):

    columns = FEATURES + [TARGET]

    data = df[columns].copy()

    # Keep only valid target responses
    data = data[
        data[TARGET].isin([1, 2])
    ]

    # 1 = experienced cost-related non-adherence
    # 0 = did not experience it
    data["target"] = (
        data[TARGET] == 1
    ).astype(int)

    data = data.drop(
        columns=[TARGET]
    )

    # Remove invalid/special CCHS codes
    for column, valid_values in VALID_CODES.items():

        data.loc[
            ~data[column].isin(valid_values),
            column
        ] = pd.NA

    # Match training procedure exactly
    data = data.dropna()

    return data


def get_original_feature(encoded_name):
    """
    Convert a one-hot encoded feature name such as:

        categorical__INCDGHH_5

    into:

        INCDGHH
    """

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

        if name.startswith(feature + "_"):
            return feature

    return name


def main():

    print("=" * 80)
    print("Emergence — SHAP EXPLAINABILITY")
    print("=" * 80)

    # ------------------------------------------------
    # Load trained model
    # ------------------------------------------------

    saved = joblib.load(
        MODEL_FILE
    )

    model = saved["model"]
    preprocessor = saved["preprocessor"]

    # ------------------------------------------------
    # Load and clean CCHS data
    # ------------------------------------------------

    df = pd.read_csv(
        DATA_FILE
    )

    data = prepare_data(
        df
    )

    X = data[FEATURES]
    y = data["target"]

    # ------------------------------------------------
    # Recreate same train/test split
    # ------------------------------------------------

    X_train, X_test, y_train, y_test = train_test_split(

        X,
        y,

        test_size=0.20,

        random_state=42,

        stratify=y,
    )

    # ------------------------------------------------
    # Transform test data
    # ------------------------------------------------

    X_test_encoded = preprocessor.transform(
        X_test
    )

    # Convert sparse matrix to dense matrix
    # 8,527 × 54 is small enough for this.
    X_test_dense = X_test_encoded.toarray()

    # ------------------------------------------------
    # Get encoded feature names
    # ------------------------------------------------

    encoded_feature_names = (
        preprocessor
        .get_feature_names_out()
    )

    print(
        f"\nEncoded features: "
        f"{len(encoded_feature_names)}"
    )

    # ------------------------------------------------
    # Create SHAP explainer
    # ------------------------------------------------

    print(
        "\nCalculating SHAP values..."
    )

    explainer = shap.TreeExplainer(
        model
    )

    shap_values = explainer.shap_values(
        X_test_dense
    )

    # ------------------------------------------------
    # Make sure SHAP output is 2D
    # ------------------------------------------------

    if isinstance(shap_values, list):

        shap_values = shap_values[0]

    shap_values = np.asarray(
        shap_values
    )

    print(
        "SHAP matrix shape:",
        shap_values.shape
    )

    # =================================================
    # GLOBAL SHAP
    # =================================================

    print("\n")
    print("=" * 80)
    print("GLOBAL FEATURE IMPORTANCE")
    print("=" * 80)

    # Mean absolute SHAP value for every encoded feature
    encoded_importance = np.mean(
        np.abs(shap_values),
        axis=0
    )

    global_encoded = pd.DataFrame({

        "encoded_feature":
            encoded_feature_names,

        "mean_abs_shap":
            encoded_importance,
    })

    # ------------------------------------------------
    # Aggregate one-hot features back to original
    # variables
    # ------------------------------------------------

    global_encoded[
        "original_feature"
    ] = global_encoded[
        "encoded_feature"
    ].apply(
        get_original_feature
    )

    global_features = (
        global_encoded
        .groupby("original_feature")[
            "mean_abs_shap"
        ]
        .sum()
        .sort_values(
            ascending=False
        )
    )

    print(
        "\nOriginal CCHS variables ranked "
        "by mean absolute SHAP contribution:"
    )

    print(
        "-" * 80
    )

    for feature, value in global_features.items():

        label = FEATURE_LABELS.get(
            feature,
            feature
        )

        print(
            f"{label:40} "
            f"{value:.5f}"
        )

    # =================================================
    # LOCAL SHAP
    # =================================================

    print("\n")
    print("=" * 80)
    print("LOCAL SHAP EXPLANATION")
    print("=" * 80)

    # Use first respondent in test set
    # as an initial demonstration example.
    row_index = 0

    person = X_test.iloc[
        row_index
    ]

    person_encoded = X_test_dense[
        row_index:row_index + 1
    ]

    person_shap = shap_values[
        row_index
    ]

    probability = model.predict_proba(
        person_encoded
    )[0, 1]

    actual_outcome = y_test.iloc[
        row_index
    ]

    print(
        f"\nModel-estimated probability: "
        f"{probability:.4f}"
    )

    print(
        f"Actual CCHS outcome: "
        f"{'Experienced non-adherence' if actual_outcome == 1 else 'Did not experience non-adherence'}"
    )

    print(
        "\nPatient characteristics:"
    )

    print(
        "-" * 80
    )

    for feature in FEATURES:

        label = FEATURE_LABELS.get(
            feature,
            feature
        )

        print(
            f"{label:40} "
            f"{person[feature]}"
        )

    # ------------------------------------------------
    # Aggregate local SHAP values
    # ------------------------------------------------

    local_df = pd.DataFrame({

        "encoded_feature":
            encoded_feature_names,

        "shap_value":
            person_shap,
    })

    local_df[
        "original_feature"
    ] = local_df[
        "encoded_feature"
    ].apply(
        get_original_feature
    )

    local_features = (
        local_df
        .groupby("original_feature")[
            "shap_value"
        ]
        .sum()
        .sort_values(
            key=lambda x: np.abs(x),
            ascending=False
        )
    )

    print("\n")
    print(
        "FEATURE CONTRIBUTIONS"
    )

    print(
        "-" * 80
    )

    print(
        "Positive = pushes prediction toward "
        "cost-related non-adherence"
    )

    print(
        "Negative = pushes prediction away "
        "from cost-related non-adherence"
    )

    print()

    for feature, value in local_features.items():

        label = FEATURE_LABELS.get(
            feature,
            feature
        )

        direction = (
            "↑"
            if value > 0
            else "↓"
        )

        print(
            f"{label:40} "
            f"{direction} "
            f"{value:+.5f}"
        )


if __name__ == "__main__":

    main()