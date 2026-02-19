from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="Ayurnod Backend")

class Symptom(BaseModel):
    text: str

class LabParameter(BaseModel):
    name: str
    value: float
    unit: str

class ExplanationRequest(BaseModel):
    symptoms: List[Symptom]
    labs: List[LabParameter]

class ExplanationResponse(BaseModel):
    explanation: str
    disclaimer: str
    next_steps: List[str]

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/explain", response_model=ExplanationResponse)
def explain(request: ExplanationRequest):
    """
    Mock AI explanation endpoint.
    In production, this would call LLM with safety checks.
    """
    symptom_texts = [s.text for s in request.symptoms]
    lab_names = [l.name for l in request.labs]

    explanation = (
        f"Based on your symptoms ({', '.join(symptom_texts)}) and lab results ({', '.join(lab_names)}), "
        "this is a preliminary educational interpretation. "
        "Please consult a doctor for diagnosis."
    )

    next_steps = [
        "Review these results with your doctor",
        "Track any changes in symptoms",
        "Follow up with recommended tests if needed"
    ]

    return ExplanationResponse(
        explanation=explanation,
        disclaimer="This is not medical advice. For emergencies, call your local emergency number.",
        next_steps=next_steps
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
