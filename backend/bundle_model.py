from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from math import cos, log1p, pi, sin
from pathlib import Path
from typing import Dict, List, Tuple

import joblib
import numpy as np
import pandas as pd
from pypdf import PdfReader


BUNDLE_META: Dict[int, Tuple[str, str]] = {
    0: ("BH-001", "Basic Health"),
    1: ("HDV-002", "Health + Dental + Vision"),
    2: ("FC-003", "Family Comprehensive"),
    3: ("PHL-004", "Premium Health & Life"),
    4: ("AL-005", "Auto Liability Basic"),
    5: ("AC-006", "Auto Comprehensive"),
    6: ("HS-007", "Home Standard"),
    7: ("HP-008", "Home Premium"),
    8: ("RB-009", "Renter's Basic"),
    9: ("RP-010", "Renter's Premium"),
}


@dataclass
class ModelAssets:
    model_dict: dict
    feature_columns: List[str]
    prep: dict
    pdf_chunks: List[str]


_ASSETS: ModelAssets | None = None


def _normalize_channel(value: str) -> str:
    mapping = {
        "Corporate_Partner": "Corporate_Partner",
        "Direct_Website": "Direct_Website",
        "Local_Broker": "Local_Broker",
        "Affiliate_Group": "Affiliate_Group",
        "Aggregator_Site": "Affiliate_Group",
    }
    return mapping.get(value, "Direct_Website")


def _normalize_payment(value: str) -> str:
    return value if value in {"Annual_Upfront", "Quarterly_Invoice"} else "Annual_Upfront"


def _normalize_employment(value: str) -> str:
    mapping = {
        "Self_Employed": "Self_Employed",
        "Contractor": "Contractor",
        "Unemployed": "Unemployed",
    }
    return mapping.get(value, "Employed")


def _pdf_to_chunks(pdf_path: Path) -> List[str]:
    if not pdf_path.exists():
        return []

    reader = PdfReader(str(pdf_path))
    text_blocks: List[str] = []

    for page in reader.pages:
        page_text = (page.extract_text() or "").strip()
        if not page_text:
            continue
        lines = [line.strip() for line in page_text.splitlines() if line.strip()]
        buffer: List[str] = []
        for line in lines:
            buffer.append(line)
            if len(" ".join(buffer)) > 300:
                text_blocks.append(" ".join(buffer))
                buffer = []
        if buffer:
            text_blocks.append(" ".join(buffer))

    return text_blocks


def _load_assets() -> ModelAssets:
    global _ASSETS
    if _ASSETS is not None:
        return _ASSETS

    root = Path(__file__).resolve().parent.parent
    model_path = root / "model.pkl"
    pdf_path = root / "DataQuest-Brief-Document.pdf"

    model_dict = joblib.load(model_path)
    feature_columns = model_dict.get("feature_columns", [])
    prep = model_dict.get("prep", {})
    pdf_chunks = _pdf_to_chunks(pdf_path)

    _ASSETS = ModelAssets(
        model_dict=model_dict,
        feature_columns=feature_columns,
        prep=prep,
        pdf_chunks=pdf_chunks,
    )
    return _ASSETS


def _safe_div(num: float, den: float) -> float:
    return num / den if den else 0.0


def _build_feature_row(payload: dict, assets: ModelAssets) -> pd.DataFrame:
    now = datetime.utcnow()
    prep = assets.prep

    income_cap = float(prep.get("income_cap", 150000.0))
    days_cap = float(prep.get("days_cap", 365.0))

    annual_income = max(0.0, float(payload["annual_income"]))
    age = max(18, int(payload["age"]))
    adult_dependents = max(0, int(payload.get("adult_dependents", 1)))
    child_dependents = max(0, int(payload.get("child_dependents", 0)))
    infant_dependents = max(0, int(payload.get("infant_dependents", 0)))
    previous_claims = max(0, int(payload.get("previous_claims_filed", 0)))
    years_without_claims = max(0, int(payload.get("years_without_claims", 0)))
    policy_amendments = max(0, int(payload.get("policy_amendments_count", 0)))
    vehicles = max(0, int(payload.get("vehicles_on_policy", 0)))
    riders = max(0, int(payload.get("custom_riders_requested", 0)))
    deductible_tier = int(payload.get("deductible_tier", 2))
    days_since_quote = max(0, int(payload.get("days_since_quote", 7)))
    previous_policy_duration = max(0, int(payload.get("previous_policy_duration_months", 0)))
    grace_extensions = max(0, int(payload.get("grace_period_extensions", 0)))

    total_dependents = adult_dependents + child_dependents + infant_dependents

    row: Dict[str, float] = {col: 0.0 for col in assets.feature_columns}

    policy_start_year = now.year
    month = now.month
    day = now.day
    week = now.isocalendar().week

    row.update(
        {
            "Policy_Start_Year": float(policy_start_year),
            "Grace_Period_Extensions": float(grace_extensions),
            "Previous_Policy_Duration_Months": float(previous_policy_duration),
            "Adult_Dependents": float(adult_dependents),
            "Child_Dependents": float(child_dependents),
            "Infant_Dependents": float(infant_dependents),
            "Existing_Policyholder": 1.0 if payload.get("existing_policyholder", False) else 0.0,
            "Previous_Claims_Filed": float(previous_claims),
            "Years_Without_Claims": float(years_without_claims),
            "Policy_Amendments_Count": float(policy_amendments),
            "Vehicles_on_Policy": float(vehicles),
            "Custom_Riders_Requested": float(riders),
            "Deductible_Tier": float(max(1, min(deductible_tier, 3))),
            "Days_Since_Quote": float(days_since_quote),
            "Has_Employer_ID": 1.0 if payload.get("has_employer_id", False) else 0.0,
            "Has_Broker_ID": 1.0 if payload.get("has_broker_id", False) else 0.0,
            "Log_Income": float(log1p(min(annual_income, income_cap))),
            "Log_UW_Days": float(log1p(min(days_since_quote, days_cap))),
            "Total_Dependents": float(total_dependents),
            "Has_Dependents": 1.0 if total_dependents > 0 else 0.0,
            "Has_Infant": 1.0 if infant_dependents > 0 else 0.0,
            "Income_Per_Dependent": float(_safe_div(annual_income, max(total_dependents, 1))),
            "Claims_Ratio": float(_safe_div(previous_claims, max(previous_policy_duration, 1))),
            "Policy_Activity": float(policy_amendments + riders + grace_extensions),
            "Has_Vehicle": 1.0 if vehicles > 0 else 0.0,
            "Multi_Vehicle": 1.0 if vehicles > 1 else 0.0,
            "Has_Riders": 1.0 if riders > 0 else 0.0,
            "Has_Grace_Ext": 1.0 if grace_extensions > 0 else 0.0,
            "Long_Policy": 1.0 if previous_policy_duration >= 24 else 0.0,
            "Risk_Score": float(previous_claims * 2 + total_dependents * 0.5 + vehicles * 0.5 + age / 50),
            "Quote_Freshness": float(1.0 / (1.0 + days_since_quote)),
            "Month_Sin": float(sin(2 * pi * month / 12.0)),
            "Month_Cos": float(cos(2 * pi * month / 12.0)),
            "Day_Sin": float(sin(2 * pi * day / 31.0)),
            "Day_Cos": float(cos(2 * pi * day / 31.0)),
            "Week_Sin": float(sin(2 * pi * week / 52.0)),
            "Week_Cos": float(cos(2 * pi * week / 52.0)),
        }
    )

    channel = _normalize_channel(payload.get("acquisition_channel", "Direct_Website"))
    payment = _normalize_payment(payload.get("payment_schedule", "Annual_Upfront"))
    employment = _normalize_employment(payload.get("employment_status", "Employed"))

    row["Is_National_Corporate"] = 1.0 if channel == "Corporate_Partner" else 0.0
    row["Acquisition_Channel_Corporate_Partner"] = 1.0 if channel == "Corporate_Partner" else 0.0
    row["Acquisition_Channel_Direct_Website"] = 1.0 if channel == "Direct_Website" else 0.0
    row["Acquisition_Channel_Local_Broker"] = 1.0 if channel == "Local_Broker" else 0.0
    row["Acquisition_Channel_Affiliate_Group"] = 1.0 if channel == "Affiliate_Group" else 0.0

    row["Payment_Schedule_Annual_Upfront"] = 1.0 if payment == "Annual_Upfront" else 0.0
    row["Payment_Schedule_Quarterly_Invoice"] = 1.0 if payment == "Quarterly_Invoice" else 0.0

    row["Employment_Status_Self_Employed"] = 1.0 if employment == "Self_Employed" else 0.0
    row["Employment_Status_Contractor"] = 1.0 if employment == "Contractor" else 0.0
    row["Employment_Status_Unemployed"] = 1.0 if employment == "Unemployed" else 0.0

    region = str(payload.get("region_code", "Unknown")).strip().upper() or "Unknown"
    broker = str(payload.get("broker_id", "Unknown")).strip() or "Unknown"

    region_freq = prep.get("region_freq", {})
    broker_freq = prep.get("broker_freq", {})

    row["Region_Code_Freq"] = float(region_freq.get(region, region_freq.get("Unknown", 0.0)))
    row["Broker_ID_Freq"] = float(broker_freq.get(broker, broker_freq.get("Unknown", 0.0)))

    ordered_row = {col: row.get(col, 0.0) for col in assets.feature_columns}
    return pd.DataFrame([ordered_row], columns=assets.feature_columns)


def _predict_probabilities(x_df: pd.DataFrame, assets: ModelAssets) -> np.ndarray:
    models = assets.model_dict.get("models", [])
    weights = assets.model_dict.get("weights", [1.0] * len(models))

    if not models:
        raise RuntimeError("No model found in model.pkl")

    total = np.zeros(10, dtype=float)
    weight_sum = 0.0

    for model, weight in zip(models, weights):
        probs = model.predict_proba(x_df)[0]
        total += probs * float(weight)
        weight_sum += float(weight)

    if weight_sum == 0:
        return total

    return total / weight_sum


def _search_pdf_context(assets: ModelAssets, query: str, top_k: int = 2) -> List[str]:
    if not assets.pdf_chunks:
        return []

    tokens = {t for t in query.lower().split() if len(t) > 2}
    if not tokens:
        return assets.pdf_chunks[:top_k]

    scored: List[Tuple[int, str]] = []
    for chunk in assets.pdf_chunks:
        lower = chunk.lower()
        score = sum(lower.count(token) for token in tokens)
        if score > 0:
            scored.append((score, chunk))

    if not scored:
        return assets.pdf_chunks[:top_k]

    scored.sort(key=lambda item: item[0], reverse=True)
    return [text for _, text in scored[:top_k]]


def predict_bundle(payload: dict) -> dict:
    assets = _load_assets()

    x_df = _build_feature_row(payload, assets)
    probs = _predict_probabilities(x_df, assets)
    top_indices = np.argsort(probs)[::-1][:3]

    top_recommendations = []
    for idx in top_indices:
        bundle_code, bundle_name = BUNDLE_META.get(int(idx), (f"B-{idx:03d}", f"Bundle {idx}"))
        top_recommendations.append(
            {
                "bundle_id": int(idx),
                "bundle_code": bundle_code,
                "bundle_name": bundle_name,
                "confidence": round(float(probs[idx]), 4),
            }
        )

    best = top_recommendations[0]
    query_for_context = f"{best['bundle_name']} {payload.get('notes', '')}".strip()
    snippets = _search_pdf_context(assets, query_for_context, top_k=2)

    reasoning = (
        f"Based on profile signals (income, dependents, claims, quote freshness, and selected coverage preferences), "
        f"the model ranked {best['bundle_name']} as the best fit with {best['confidence'] * 100:.1f}% confidence."
    )

    return {
        "recommended_bundle_id": best["bundle_id"],
        "recommended_bundle_code": best["bundle_code"],
        "recommended_bundle_name": best["bundle_name"],
        "confidence": best["confidence"],
        "reasoning": reasoning,
        "top_recommendations": top_recommendations,
        "context_snippets": snippets,
    }
