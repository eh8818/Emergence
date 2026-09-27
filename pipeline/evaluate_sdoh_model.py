import joblib
import pandas as pd
import numpy as np

from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    precision_score,
    recall_score,
    f1_score,
    accuracy_score,
    confusion_matrix,
)

MODEL_FILE = Path("pipeline/sdoh_model.joblib")
DATA_FILE = Path("data/pumf_cchs.csv")


FEATURES = [
    "INCDGHH",
    "INP_05",
    "RHC_05",
    "EDDVH3",
    "DHHGAGE",
    "DHH_SEX",
    "GEOGPRV",
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

    "GEOGPRV": [
        10, 11, 12, 13,
        24, 35, 46, 47,
        48, 59, 60
    ],

    "PCN_05": [1, 2],

    "FSCDVAF2": [0, 1, 2, 3],

    "GEN_10": [1, 2, 3, 4, 5],

    "GEN_15": [1, 2, 3, 4, 5, 6],

    "GEN_20": [1, 2, 3, 4],

    "DHHDGHSZ": [1, 2],
}


def prepare_data(df):

    columns = FEATURES + [TARGET]

    data = df[columns].copy()

    # Keep only valid target responses
    data = data[
        data[TARGET].isin([1, 2])
    ]

    # Convert target:
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

    # Match the training procedure
    data = data.dropna()

    return data


def main():

    print("=" * 80)
    print("Emergence — SDOH MODEL EVALUATION")
    print("=" * 80)

    # ------------------------------------------------
    # Load model
    # ------------------------------------------------

    saved = joblib.load(MODEL_FILE)

    model = saved["model"]
    preprocessor = saved["preprocessor"]

    # ------------------------------------------------
    # Load data
    # ------------------------------------------------

    df = pd.read_csv(DATA_FILE)

    data = prepare_data(df)

    X = data[FEATURES]
    y = data["target"]

    # ------------------------------------------------
    # Recreate the same test split used during training
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

    # ------------------------------------------------
    # Get probabilities
    # ------------------------------------------------

    probabilities = model.predict_proba(
        X_test_encoded
    )[:, 1]

    # ------------------------------------------------
    # Overall metrics
    # ------------------------------------------------

    roc_auc = roc_auc_score(
        y_test,
        probabilities
    )

    pr_auc = average_precision_score(
        y_test,
        probabilities
    )

    prevalence = y_test.mean()

    print("\nDATASET")
    print("-" * 80)

    print(
        f"Test samples: {len(y_test):,}"
    )

    print(
        f"Positive cases: {y_test.sum():,}"
    )

    print(
        f"Positive prevalence: {prevalence:.4f}"
    )

    print("\nMODEL-LEVEL METRICS")
    print("-" * 80)

    print(
        f"ROC-AUC: {roc_auc:.4f}"
    )

    print(
        f"PR-AUC:  {pr_auc:.4f}"
    )

    print(
        f"Random PR-AUC baseline: {prevalence:.4f}"
    )

    print(
        f"PR-AUC improvement over random: "
        f"{pr_auc / prevalence:.2f}x"
    )

    # ------------------------------------------------
    # Majority-class baseline
    # ------------------------------------------------

    majority_predictions = np.zeros(
        len(y_test),
        dtype=int
    )

    majority_accuracy = accuracy_score(
        y_test,
        majority_predictions
    )

    print("\nMAJORITY-CLASS BASELINE")
    print("-" * 80)

    print(
        "Baseline prediction: "
        "always predict NO non-adherence"
    )

    print(
        f"Accuracy: {majority_accuracy:.4f}"
    )

    # ------------------------------------------------
    # Threshold analysis
    # ------------------------------------------------

    print("\nTHRESHOLD ANALYSIS")
    print("-" * 80)

    print(
        f"{'Threshold':<12}"
        f"{'Precision':<12}"
        f"{'Recall':<12}"
        f"{'F1':<12}"
        f"{'Accuracy':<12}"
    )

    print("-" * 60)

    thresholds = [
        0.10,
        0.15,
        0.20,
        0.25,
        0.30,
        0.35,
        0.40,
        0.45,
        0.50,
        0.55,
        0.60,
        0.65,
        0.70,
    ]

    for threshold in thresholds:

        predictions = (
            probabilities >= threshold
        ).astype(int)

        precision = precision_score(
            y_test,
            predictions,
            zero_division=0
        )

        recall = recall_score(
            y_test,
            predictions,
            zero_division=0
        )

        f1 = f1_score(
            y_test,
            predictions,
            zero_division=0
        )

        accuracy = accuracy_score(
            y_test,
            predictions
        )

        print(
            f"{threshold:<12.2f}"
            f"{precision:<12.3f}"
            f"{recall:<12.3f}"
            f"{f1:<12.3f}"
            f"{accuracy:<12.3f}"
        )

    # ------------------------------------------------
    # Current 0.5 threshold
    # ------------------------------------------------

    predictions = (
        probabilities >= 0.5
    ).astype(int)

    cm = confusion_matrix(
        y_test,
        predictions
    )

    print("\nCONFUSION MATRIX — THRESHOLD 0.50")
    print("-" * 80)

    print(
        "Rows = actual"
    )

    print(
        "Columns = predicted"
    )

    print()

    print(cm)

    print(
        "\n"
        "[[TN, FP],"
        "\n [FN, TP]]"
    )


if __name__ == "__main__":
    main()