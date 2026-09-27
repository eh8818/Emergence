import pandas as pd
import joblib

from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report,
    roc_auc_score,
    average_precision_score,
)

from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder

from xgboost import XGBClassifier


DATA_FILE = Path("data/pumf_cchs.csv")
MODEL_FILE = Path("pipeline/sdoh_model_no_province.joblib")


# Same features as the current model,
# except GEOGPRV is removed.
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


def load_data():
    return pd.read_csv(DATA_FILE)


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

    # Match the original model exactly
    data = data.dropna()

    return data


def train_model():

    df = load_data()

    data = prepare_data(df)

    X = data[FEATURES]

    y = data["target"]

    print(
        "\nDataset size:",
        len(data)
    )

    print(
        "\nTarget distribution:"
    )

    print(
        y.value_counts(
            normalize=True
        )
    )

    # Same random seed and split as original model
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y,
    )

    # Same one-hot encoding approach
    preprocessor = ColumnTransformer(

        transformers=[

            (
                "categorical",

                OneHotEncoder(
                    handle_unknown="ignore"
                ),

                FEATURES,
            )
        ]
    )

    X_train_encoded = preprocessor.fit_transform(
        X_train
    )

    X_test_encoded = preprocessor.transform(
        X_test
    )

    print(
        "\nEncoded feature count:",
        X_train_encoded.shape[1]
    )

    # EXACT SAME XGBoost configuration
    model = XGBClassifier(

        n_estimators=500,

        max_depth=4,

        learning_rate=0.03,

        subsample=0.8,

        colsample_bytree=0.8,

        min_child_weight=3,

        gamma=0.1,

        reg_alpha=0.1,

        reg_lambda=1.0,

        scale_pos_weight=10,

        eval_metric="auc",

        random_state=42,
    )

    model.fit(
        X_train_encoded,
        y_train,
    )

    probabilities = model.predict_proba(
        X_test_encoded
    )[:, 1]

    predictions = (
        probabilities >= 0.5
    ).astype(int)

    # Metrics
    roc_auc = roc_auc_score(
        y_test,
        probabilities,
    )

    pr_auc = average_precision_score(
        y_test,
        probabilities,
    )

    print(
        "\nMODEL WITHOUT PROVINCE"
    )

    print(
        "=" * 60
    )

    print(
        f"ROC-AUC: {roc_auc:.4f}"
    )

    print(
        f"PR-AUC:  {pr_auc:.4f}"
    )

    print(
        "\nClassification report:"
    )

    print(
        classification_report(
            y_test,
            predictions,
            zero_division=0,
        )
    )

    # Save separately so we don't overwrite the current model
    joblib.dump(

        {
            "model": model,
            "preprocessor": preprocessor,
            "features": FEATURES,
        },

        MODEL_FILE,
    )

    print(
        f"\nModel saved to {MODEL_FILE}"
    )


if __name__ == "__main__":
    train_model()