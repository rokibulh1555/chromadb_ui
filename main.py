import uuid
from typing import Dict

import chromadb
from fastapi import FastAPI, Request, UploadFile, File
from fastapi import HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from jinja2 import Environment, FileSystemLoader
from pydantic import BaseModel

from connection import connections, ConnectionClass, get_connections

app = FastAPI()

env = Environment(loader=FileSystemLoader("templates"))

env.globals['zip'] = zip

app.mount("/static", StaticFiles(directory="static"), name="static")

chroma_client = chromadb.PersistentClient(path="./chromadb_data")


@app.get("/get_connections")
async def fetch_connections():
    """Fetch all saved connections."""
    return get_connections()


@app.post("/create_connection")
async def create_connection(data: Dict[str, str]):
    """Create a new connection."""
    conn = ConnectionClass(**data)
    connections.create_client(conn)

    return JSONResponse(content={"message": "Connection created successfully"}, status_code=201)


@app.post("/delete_connection/{name}")
async def delete_connection_route(name: str):
    print(f"Debugging: Deleting connection with name: {name}")
    connections.delete_client(name)
    # return JSONResponse(content={"message": "Connection deleted successfully"}, status_code=200)
    return RedirectResponse("/", status_code=303)


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    collection_names = chroma_client.list_collections()
    collections = [{"name": name} for name in collection_names]

    template = env.get_template("index.html")
    return template.render(request=request, collections=collections, results={"documents": [[]], "metadatas": [[]]})


from fastapi.responses import JSONResponse


def mapper(data):
    return {"id": data[1], "document": data[0], "meta": data[2]}


@app.get("/collection/{name}")
async def view_collection(name: str):
    """View all documents in a specific collection."""
    collection = chroma_client.get_collection(name)
    documents = collection.get()

    data = list(map(mapper, zip(documents["documents"], documents["ids"], documents["metadatas"])))
    return data


@app.get("/collection-list")
async def get_collections(connection_name: str):
    """Fetch all collections related to a specific connection."""
    try:
        all_collections = connections.get_client(
            connection_name).list_collections()  # Now returns a list of collection names

        # Include debug logs in the response
        return {
            "collections": all_collections,
            "filtered": all_collections
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class CollectionRequest(BaseModel):
    collection_name: str
    connection_name: str


@app.post("/add_collection")
async def add_collection(request: CollectionRequest):
    """Create a collection under a specific connection in ChromaDB."""
    connection_name = request.connection_name
    collection_name = request.collection_name

    # Create a unique identifier for collections under connections
    full_collection_name = f"{connection_name}_{collection_name}"

    try:
        chroma_client.get_or_create_collection(full_collection_name)
        return {"message": f"Collection '{collection_name}' created under connection '{connection_name}'"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/delete_collection/{name}")
async def delete_collection(name: str):
    chroma_client.delete_collection(name)
    return RedirectResponse("/", status_code=303)


class Doc(BaseModel):
    metadata: str
    document: str


@app.post("/add_document/{collection_name}")
async def add_document(collection_name: str, doc: Doc):
    collection = chroma_client.get_or_create_collection(collection_name)
    doc_id = str(uuid.uuid4())
    collection.add(documents=[doc.document], metadatas=[{"info": doc.metadata}], ids=[doc_id])
    # return {**doc.model_dump(), "status": "created"}

    return RedirectResponse(f"/collection/{collection_name}", status_code=303)


@app.post("/delete_document/{collection_name}/{doc_id}")
async def delete_document(collection_name: str, doc_id: str):
    collection = chroma_client.get_or_create_collection(collection_name)
    collection.delete([doc_id])
    return RedirectResponse(f"/collection/{collection_name}", status_code=303)


@app.post("/upload_file/{collection_name}")
async def upload_file(collection_name: str, file: UploadFile = File(...)):
    collection = chroma_client.get_or_create_collection(collection_name)

    content = await file.read()
    text = content.decode("utf-8")

    doc_id = str(uuid.uuid4())
    collection.add(documents=[text], metadatas=[{"filename": file.filename}], ids=[doc_id])

    return RedirectResponse(f"/collection/{collection_name}", status_code=303)


@app.get("/search/{collection_name}", response_class=JSONResponse)
async def search(collection_name: str, query: str):
    collection = chroma_client.get_or_create_collection(collection_name)
    documents = collection.query(query_texts=[query], n_results=2)
    print(documents)
    data = list(map(mapper, zip(documents["documents"][0], documents["ids"][0], documents["metadatas"][0])))
    return data


@app.get("/search_all", response_class=HTMLResponse)
async def search_all(request: Request, query: str):
    all_documents = []
    all_metadatas = []

    for collection_name in chroma_client.list_collections():
        collection = chroma_client.get_or_create_collection(collection_name)
        search_results = collection.query(query_texts=[query], n_results=2)

        if search_results["documents"]:
            all_documents.extend(search_results["documents"][0])
            all_metadatas.extend(search_results["metadatas"][0])

    results = {
        "documents": [all_documents],
        "metadatas": [all_metadatas]
    }

    template = env.get_template("index.html")
    return template.render(request=request, collection_name="All Collections", query=query, results=results)


@app.delete("/{collection_name}/documents/{id}")
async def delete_document_by_id(collection_name: str, id: str):
    collection = chroma_client.get_or_create_collection(collection_name)
    collection.delete([id])
    return "done"


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
