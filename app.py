
import streamlit as st
from sdoh import get_canadian_profile
from engine import analyze_patient

st.set_page_config(
    page_title="Emergence Health",
    layout="wide"
)

st.title("Emergence Health")
st.subheader("Creating personalized medication profiles for Canadians")

st.write(
    """
    Emergence Health combines pharmacogenomic information with
    Canadian social context to create an explainable
    patient medication profile.
    """
)

st.divider()

st.header("Patient")

age = st.number_input(
    "Age",
    min_value=18,
    max_value=100,
    value=45
)

province_territory = st.selectbox(
    "Province/Territory",
    [
        "Ontario",
        "British Columbia",
        "Alberta",
        "Quebec",
        "Manitoba",
        "Saskatchewan",
        "Nova Scotia",
        "New Brunswick",
        "Newfoundland and Labrador",
        "Prince Edward Island",
        "Northwest Territories",
        "Yukon",
    ]
)

condition = st.selectbox(
    "Condition",
    [
        "Anxiety disorder",
        "Depression",
        "Bipolar disorder",
        "Schizophrenia"
    ]
)

st.write("Age:", age)
st.write("Province/Territory:", province_territory)
st.write("Condition:", condition)

if st.button(
    "🍁 Analyze Patient",
    type="primary",
    use_container_width=True
):

    with st.status(
        "🧬 Analyzing genomic profile..."
    ):
        # Run PharmCAT
        pass

    with st.status(
        "🇨🇦 Building Canadian context..."
    ):
        canadian_profile = get_canadian_profile(
            province_territory
        )

    with st.status(
        "🤖 Integrating patient factors..."
    ):
        results = analyze_patient(
            pgx_results={},
            canadian_profile=canadian_profile,
            medications=[
                "Drug A",
                "Drug B",
                "Drug C"
            ]
        )

    st.success("Patient profile complete!")