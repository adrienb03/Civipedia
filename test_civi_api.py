from fastapi import FastAPI
from pydantic import BaseModel

from test_civi3 import response
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add this **before any route definitions**
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # your frontend URL
    allow_credentials=True,
    allow_methods=["*"],   # allow all HTTP methods (GET, POST, OPTIONS, etc.)
    allow_headers=["*"],   # allow all headers
)


class Question(BaseModel):
    text: str
    collection: str
    n: int = 1

@app.post("/ask")
def ask(q: Question):
    answer = response(q.text, q.collection, q.n)
    # `response` may return a dict {'answer': str, 'sources': [...]}
    if isinstance(answer, dict) and 'answer' in answer:
        return {"answer": answer.get('answer'), "sources": answer.get('sources', [])}
    return {"answer": answer}

# uvicorn test_civi_api:app --reload
# source .venv/bin/activate
# npm run dev:tmux      