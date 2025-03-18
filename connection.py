import json
from typing import Literal, Optional, List

import chromadb
from pydantic import BaseModel


class ConnectionClass(BaseModel):
    name: str
    type: Literal["file", "http"]
    db_path: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None


CONNECTION_JSON_STORE = "./connections.json"


def get_connections() -> List[ConnectionClass]:
    with open(CONNECTION_JSON_STORE, 'r') as file:
        conns = json.load(file)
    conns = [ConnectionClass(**conn) for conn in conns]
    return conns


def create_connection(data: ConnectionClass):
    conns = [conn.model_dump() for conn in get_connections()]
    conns.append(data.model_dump())
    with open(CONNECTION_JSON_STORE, 'w') as file:
        json.dump(conns, file)


def delete_connection(name: str):
    connections = [conn.model_dump() for conn in get_connections()]
    new_connections = []
    for conn in connections:
        if conn["name"] == name:
            continue
        new_connections.append(conn)
    with open(CONNECTION_JSON_STORE, 'w') as file:
        json.dump(new_connections, file)


class Connections:

    def __init__(self):
        connection_list = get_connections()
        self.connections = {}
        for conn in connection_list:
            self.connections[conn.name] = self.__create_client(conn)

    def __create_client(self, conn: ConnectionClass) -> chromadb.PersistentClient:
        conn = json.loads(json.dumps(conn.model_dump()))
        if conn["type"] == "file":
            return chromadb.PersistentClient(path=conn["db_path"])
        elif conn["type"] == "http":
            return chromadb.HttpClient(host=conn["host"], port=conn["port"])

    def get_client(self, name):
        return self.connections[name]

    def create_client(self, data: ConnectionClass):
        if data.name in self.connections:
            raise ValueError("already exists")
        create_connection(data)
        self.connections[data.name] = self.__create_client(data)

    def delete_client(self, name):
        delete_connection(name)
        del self.connections[name]


connections = Connections()