import json
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq

load_dotenv(Path(__file__).parent / ".env")

api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    raise RuntimeError("GROQ_API_KEY must be set in backend/.env")

client = Groq(api_key=api_key)

app = FastAPI(
    title="PathMapper",
    description="AI life decision simulator backend for PathMapper",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    paths: list[str]
    values: list[str]
    situation: str
    fears: str

class WhatIfRequest(BaseModel):
    original_paths: list[str]
    original_situation: str
    original_fears: str
    what_if_question: str

@app.post("/analyze")
def analyze(request: AnalyzeRequest):
    system_prompt = """
You are PathMapper, a decision reasoning assistant.

You should:
1. Identify 2-3 hidden assumptions in the user's framing.
2. Score each path on 6 dimensions: Financial, Growth, Freedom, Risk, Identity, Reversibility.
   - Use 1-10 for each score.
   - Include reasoning and a confidence level (Low/Medium/High) for each dimension.
3. Write a 3-year narrative for each path.
4. Add a confidence level to each path projection.
5. NEVER recommend a specific path or say "you should choose X".

Return only valid JSON with this structure:
{
  "hidden_assumptions": [...],
  "paths": [
    {
      "name": "...",
      "narrative_3yr": "...",
      "dimensions": {
        "financial": {"score": 0, "reasoning": "...", "confidence": "..."},
        "growth": {"score": 0, "reasoning": "...", "confidence": "..."},
        "freedom": {"score": 0, "reasoning": "...", "confidence": "..."},
        "risk": {"score": 0, "reasoning": "...", "confidence": "..."},
        "identity": {"score": 0, "reasoning": "...", "confidence": "..."},
        "reversibility": {"score": 0, "reasoning": "...", "confidence": "..."}
      },
      "next_step": "..."
    }
  ],
  "what_i_dont_know": [...]
}
"""

    user_prompt = (
        f"Paths: {request.paths}\n"
        f"Values: {request.values}\n"
        f"Situation: {request.situation}\n"
        f"Fears: {request.fears}\n"
        "Return only valid JSON that matches the requested structure."
    )

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not completion.choices:
        raise HTTPException(status_code=500, detail="Groq did not return a completion.")

    output = completion.choices[0].message.content
    if isinstance(output, str):
        try:
            parsed = json.loads(output)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=500, detail=f"Invalid JSON response: {exc}")
    else:
        parsed = output

    return parsed

class ScheduleRequest(BaseModel):
    path_name: str
    next_step: str
    situation: str
    values: list[str]


@app.post("/schedule")
def schedule(request: ScheduleRequest):
    system_prompt = """
You are PathMapper, an action planning assistant.

Generate a realistic, specific 30/60/90-day action plan for pursuing the given path.

Instructions:
1. Each action must be concrete and specific — not vague. e.g. "spend 2 hours on Glassdoor researching salary ranges for this role in your city".
2. Actions should build on each other logically across the 3 months.
3. Days 1-30 focus on information gathering and small first steps.
4. Days 31-60 focus on commitment and preparation.
5. Days 61-90 focus on execution and momentum.
6. Include 3-4 actions per phase, not more.
7. Be realistic about time and effort required.

Return only valid JSON with this structure:
{
  "path_name": "...",
  "thirty_days": {"theme": "Getting Started", "actions": ["...", "...", "...", "..."]},
  "sixty_days": {"theme": "Building Momentum", "actions": ["...", "...", "...", "..."]},
  "ninety_days": {"theme": "Full Commitment", "actions": ["...", "...", "...", "..."]},
  "first_action_today": "..."
}
"""

    user_prompt = (
        f"Path name: {request.path_name}\n"
        f"Next step: {request.next_step}\n"
        f"Situation: {request.situation}\n"
        f"Values: {request.values}\n"
        "Return only valid JSON that matches the requested structure."
    )

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not completion.choices:
        raise HTTPException(status_code=500, detail="Groq did not return a completion.")

    output = completion.choices[0].message.content
    if isinstance(output, str):
        try:
            parsed = json.loads(output)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=500, detail=f"Invalid JSON response: {exc}")
    else:
        parsed = output

    return parsed

@app.post("/whatif")
def whatif(request: WhatIfRequest):
    system_prompt = """
You are PathMapper, a realistic scenario explorer.

You should:
1. Take the what-if question seriously and simulate that specific scenario honestly.
2. Describe what likely happens in that scenario (2-3 sentences).
3. List 2-3 realistic recovery options if things go badly.
4. Explain how this scenario changes the overall tradeoff picture.
5. Be honest about uncertainty — never pretend to know for certain.
6. NEVER say this scenario is impossible or unlikely without explaining why.

Return only valid JSON with this structure:
{
  "scenario_summary": "...",
  "likely_outcome": "...",
  "recovery_paths": ["...", "...", "..."],
  "tradeoff_impact": "...",
  "confidence": "Low/Medium/High",
  "honest_uncertainty": "..."
}
"""

    user_prompt = (
        f"Original paths: {request.original_paths}\n"
        f"Original situation: {request.original_situation}\n"
        f"Original fears: {request.original_fears}\n"
        f"What if question: {request.what_if_question}\n"
        "Return only valid JSON that matches the requested structure."
    )

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not completion.choices:
        raise HTTPException(status_code=500, detail="Groq did not return a completion.")

    output = completion.choices[0].message.content
    if isinstance(output, str):
        try:
            parsed = json.loads(output)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=500, detail=f"Invalid JSON response: {exc}")
    else:
        parsed = output

    return parsed
