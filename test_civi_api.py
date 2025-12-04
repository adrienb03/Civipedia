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
    return {"answer": answer}

