def get_canadian_profile(province):

    profiles = {
        "Ontario": {
            "economic_stability": 0.72,
            "residential_stability": 0.68,
            "access_to_care": 0.81
        },

        "British Columbia": {
            "economic_stability": 0.69,
            "residential_stability": 0.62,
            "access_to_care": 0.75
        },

        "Alberta": {
            "economic_stability": 0.77,
            "residential_stability": 0.71,
            "access_to_care": 0.73
        }
    }

    return profiles.get(
        province,
        profiles["Ontario"]
    )