from pydantic import BaseModel
from typing import List

class ChatRequest(BaseModel):
    question: str
    temperature: float = 0.2

class ChatResponse(BaseModel):
    response: str


class PredictBundleRequest(BaseModel):
    age: int
    annual_income: float
    adult_dependents: int = 1
    child_dependents: int = 0
    infant_dependents: int = 0
    existing_policyholder: bool = False
    previous_claims_filed: int = 0
    years_without_claims: int = 0
    policy_amendments_count: int = 0
    vehicles_on_policy: int = 0
    custom_riders_requested: int = 0
    deductible_tier: int = 2
    days_since_quote: int = 7
    previous_policy_duration_months: int = 0
    grace_period_extensions: int = 0
    has_employer_id: bool = False
    has_broker_id: bool = False
    broker_id: str = "Unknown"
    region_code: str = "Unknown"
    acquisition_channel: str = "Direct_Website"
    payment_schedule: str = "Annual_Upfront"
    employment_status: str = "Employed"
    notes: str = ""


class BundleScore(BaseModel):
    bundle_id: int
    bundle_code: str
    bundle_name: str
    confidence: float


class PredictBundleResponse(BaseModel):
    recommended_bundle_id: int
    recommended_bundle_code: str
    recommended_bundle_name: str
    confidence: float
    reasoning: str
    top_recommendations: List[BundleScore]
    context_snippets: List[str]


class SignUpRequest(BaseModel):
    email: str
    full_name: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class SavedPredictionResponse(BaseModel):
    id: int
    recommended_bundle_id: int
    confidence: float
    created_at: str
    input_payload: dict
    output_payload: dict
