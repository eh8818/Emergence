from clinpgx import get_drug_evidence
import json

drug = "warfarin"

result = get_drug_evidence(drug)

print("=" * 80)
print("CLINPGX CLINICAL ANNOTATIONS")
print("=" * 80)

clinical = result["clinical_annotations"]

print(json.dumps(clinical, indent=2)[:15000])


print("\n")
print("=" * 80)
print("CLINPGX GUIDELINE ANNOTATIONS")
print("=" * 80)

guidelines = result["guideline_annotations"]

print(json.dumps(guidelines, indent=2)[:15000])