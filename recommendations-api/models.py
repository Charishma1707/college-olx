from pydantic import BaseModel, Field
from typing import List, Optional


class RecommendationsRequest(BaseModel):
    user_id: str = Field(..., min_length=1)


class ProductOut(BaseModel):
    id: str
    name: str
    price: float
    image: Optional[str] = None


class RecommendationsResponse(BaseModel):
    user_id: str
    recommendations: List[ProductOut]
    source: str  # "collab" | "bestsellers"


class SmartSuggestRequest(BaseModel):
    query: str = Field(..., min_length=1)


class SmartSuggestResponse(BaseModel):
    categories: List[str]

