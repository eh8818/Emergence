import pandas as pd
from pathlib import Path

DATA_FILE = Path("data/pumf_cchs.csv")

FEATURES = [
    "FSCDVAF2",
    "MAC_05",
    "LBFDVPFT",
    "DHHDGHSZ",
]

df = pd.read_csv(DATA_FILE)

print("=" * 80)
print("Emergence — ADDITIONAL CCHS VARIABLES")
print("=" * 80)

for feature in FEATURES:

    print("\n")
    print("=" * 80)
    print(f"VARIABLE: {feature}")
    print("=" * 80)

    print("\nUnique values:")
    print(
        sorted(
            df[feature]
            .dropna()
            .unique()
            .tolist()
        )
    )

    print("\nValue counts:")
    print(
        df[feature]
        .value_counts(dropna=False)
        .sort_index()
    )