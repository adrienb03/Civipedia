from llama_index.llms.openai import OpenAI
from qdrant_client import QdrantClient, models
from llama_index.vector_stores.qdrant import QdrantVectorStore
from llama_index.core.settings import Settings
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.llms.openai_like import OpenAILike
from llama_index.core.schema import NodeWithScore
from llama_index.core.retrievers import BaseRetriever
from typing import List
import os
import json
from urllib.parse import quote

# Qdrant configuration: prefer environment variables but fall back to provided defaults.
# You can override by setting `QDRANT_API_KEY` and `QDRANT_ENDPOINT` in the environment.
# Provided values (from user) are set as sensible defaults here.
QDRANT_API_KEY = os.getenv(
    "QDRANT_API_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.A-e2jD95__4qACd4kTdDZBFT4iMU6hzPBUON-jkCcsg",
)
QDRANT_ENDPOINT = os.getenv("QDRANT_ENDPOINT") or os.getenv(
    "QDRANT_URL",
    "https://59a64664-c203-4145-b0f4-25f4aa53c3a7.eu-west-1-0.aws.cloud.qdrant.io",
)


def get_qdrant_client():
    """Return a configured QdrantClient using environment variables or defaults.

    Use this helper from other scripts (eg. `scripts/reindex_vectors.py`) so
    the Qdrant connection is centralized and easy to override in CI/dev.
    """
    # Some Qdrant cloud endpoints may optionally require port 6333; the
    # endpoint default provided here omits the port. If you need the port,
    # set `QDRANT_ENDPOINT` to include it (eg. "https://...:6333").
    return QdrantClient(url=QDRANT_ENDPOINT, api_key=QDRANT_API_KEY)

class CustomNodeRetriever(BaseRetriever):
    def __init__(self, nodes):
        self.nodes = nodes

    def _retrieve(self, query_bundle) -> List[NodeWithScore]:
        # Convertir les nodes en NodeWithScore (score=1.0)
        return [NodeWithScore(node=node, score=1.0) for node in self.nodes]


qdrant_client = get_qdrant_client()
api_key_mistral = "kNHnuIR8MYfrrWUG3FP8Hl13QH0jFUMF"
llm = OpenAILike(  model="mistral-large-latest",api_base="https://api.mistral.ai/v1",api_key=api_key_mistral,is_chat_model=True, )

collection_name = "knowledge_base_civipedia"
model_name = "BAAI/bge-base-en-v1.5"

def preselect(prompt,collection,n_limit) :
    results = qdrant_client.query_points(collection_name=collection,query=models.Document(text=prompt, model=model_name),limit=n_limit,)
    return results


def response(prompt,collection,n_lim) :
    results = preselect(prompt,collection,n_lim)

    # Build sources list from Qdrant point payloads (defensive extraction)
    sources = []
    pts = getattr(results, 'points', []) or []
    for p in pts:
        payload = getattr(p, 'payload', {}) or {}
        # Try common field names for title / filename
        title = payload.get('file_name') or payload.get('title') or payload.get('name') or None

        # Try to parse node content JSON if present
        if not title:
            nc = payload.get('_node_content') or payload.get('node_content')
            if isinstance(nc, str):
                try:
                    obj = json.loads(nc)
                    title = (
                        obj.get('extra_info', {}).get('file_name')
                        or obj.get('metadata', {}).get('file_name')
                        or obj.get('source')
                        or obj.get('title')
                    )
                except Exception:
                    pass

        # Fallback to file path fields
        file_path = payload.get('file_path') or payload.get('path') or payload.get('source') or payload.get('file_url')
        if not title and file_path:
            try:
                title = os.path.basename(file_path)
            except Exception:
                title = None

        if not title:
            # Last resort: use point id as title
            title = f"doc_{getattr(p, 'id', 'unknown')}"

        # Extract date and author if available
        date = payload.get('creation_date') or payload.get('date') or payload.get('created_at') or None
        author = payload.get('author') or None

        # Build download URL pointing to the Documents route
        safe_name = title
        download_url = f"/api/documents/download/{quote(safe_name)}"

        sources.append({
            'title': title,
            'author': author,
            'date': date,
            'download_url': download_url,
        })

    # Build the answer text using the Retriever + LLM pipeline
    vector_store = QdrantVectorStore(client=qdrant_client,collection_name=collection)
    nodes = vector_store.get_nodes([point.id for point in pts])
    retriever = CustomNodeRetriever(nodes)
    query_engine = RetrieverQueryEngine.from_args(retriever=retriever,llm=llm)
    resp = query_engine.query(prompt)

    # Try to extract a plain text answer from the LlamaIndex response object.
    # Handle several possible shapes: string, object with 'response' or 'text', etc.
    answer_text = ''
    try:
        if isinstance(resp, str):
            answer_text = resp
        else:
            # prefer common attributes
            if hasattr(resp, 'response') and getattr(resp, 'response'):
                answer_text = getattr(resp, 'response')
            elif hasattr(resp, 'text') and getattr(resp, 'text'):
                answer_text = getattr(resp, 'text')
            else:
                # fallback to string representation
                answer_text = str(resp)
    except Exception:
        try:
            answer_text = str(resp)
        except Exception:
            answer_text = ''

    return {'answer': answer_text, 'sources': sources}

question = "le titre du document"
print(response(question,collection_name,2))

''' Lier le code au front-end via fastapi '''