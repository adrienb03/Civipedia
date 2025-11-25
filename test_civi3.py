from qdrant_client import QdrantClient, models
from qdrant_client.models import Distance, VectorParams,PointStruct
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex,StorageContext
from llama_index.core.tools import QueryEngineTool
from llama_index.core.settings import Settings
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.vector_stores.simple import SimpleVectorStore as QdrantVectorStore
from llama_index.embeddings.openai.base import OpenAIEmbedding as HuggingFaceEmbedding
from llama_index.core.llms.loading import OpenAI as OpenAILike
from llama_index.core.agent.workflow import ReActAgent,AgentStream
from llama_index.core.schema import NodeWithScore
from llama_index.core.retrievers import BaseRetriever
from typing import List
from llama_index.core.workflow import Context
import os
import asyncio

class CustomNodeRetriever(BaseRetriever):
    def __init__(self, nodes):
        self.nodes = nodes

    def _retrieve(self, query_bundle) -> List[NodeWithScore]:
        # Convertir les nodes en NodeWithScore (score=1.0)
        return [NodeWithScore(node=node, score=1.0) for node in self.nodes]


qdrant_client = QdrantClient(
    url="https://59a64664-c203-4145-b0f4-25f4aa53c3a7.eu-west-1-0.aws.cloud.qdrant.io:6333", 
    api_key="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.A-e2jD95__4qACd4kTdDZBFT4iMU6hzPBUON-jkCcsg",
)
api_key_mistral = "kNHnuIR8MYfrrWUG3FP8Hl13QH0jFUMF"
llm = OpenAILike(  model="mistral-large-latest",api_base="https://api.mistral.ai/v1",api_key=api_key_mistral,is_chat_model=True, )

collection_name = "knowledge_base_civipedia"
model_name = "BAAI/bge-base-en-v1.5"
embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-base-en-v1.5",device="cuda",embed_batch_size=8,)
Settings.embed_model = embed_model


def create_collection (name,taille) :
    qdrant_client.create_collection(collection_name=name,vectors_config=models.VectorParams(size=taille, distance=models.Distance.COSINE))
    return None




def add_doc (doc_path, collection) :
    documents = SimpleDirectoryReader(input_files=[doc_path]).load_data()
    vector_store = QdrantVectorStore(client=qdrant_client,collection_name=collection)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    index = VectorStoreIndex.from_documents(documents,storage_context=storage_context,show_progress=True)
    print("Document ajouté avec succès !")
    return None

#create_collection("knowledge_base_civipedia",768)
#add_doc("./Documents/resumer_abonnement.pdf",collection_name)

"""
dossier_a_parcourir = "./Documents"
if os.path.exists(dossier_a_parcourir):
        for nom_fichier in os.listdir(dossier_a_parcourir):
            chemin_complet = os.path.join(dossier_a_parcourir, nom_fichier)
            add_doc(chemin_complet,collection_name)
"""



def preselect(prompt,collection,n_limit) :
    results = qdrant_client.query_points(collection_name=collection,query=models.Document(text=prompt, model=model_name),limit=n_limit,)
    return results



def response (prompt,n_lim) :
    results = preselect(prompt,collection_name,n_lim)
    vector_store = QdrantVectorStore(client=qdrant_client,collection_name=collection_name)
    nodes = vector_store.get_nodes([point.id for point in results.points])
    retriever = CustomNodeRetriever(nodes)
    #query_engine = RetrieverQueryEngine.from_args(retriever=retriever,llm=llm,response_mode="compact") # ton modèle LLM (Mistral, OpenAI, etc.)response_mode="compact"
    query_engine = RetrieverQueryEngine.from_args(retriever=retriever,llm=llm)
    response = query_engine.query(prompt)
    return response

question = "A qui appartiern l'abonnement naolib ?"
print(response(question,1))

