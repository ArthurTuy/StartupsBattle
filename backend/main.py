from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import connect_to_mongo
from schemas import StartupCreate
from typing import List
import random

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

db = connect_to_mongo()
startups_collection = db["startups"]

@app.post("/startups")
def cadastrar_startup(startup: StartupCreate):
    if startups_collection.find_one({"nome": startup.nome}):
        raise HTTPException(status_code=400, detail="Startup já cadastrada.")

    nova_startup = startup.dict()
    nova_startup["pontos"] = 70
    startups_collection.insert_one(nova_startup)

    # Não retornar diretamente o dicionário, evita conflito com ObjectId
    return {
        "message": "Startup cadastrada com sucesso!",
        "nome": nova_startup["nome"]
    }


@app.get("/startups")
def listar_startups():
    startups = list(startups_collection.find({}, {"_id": 0}))
    return startups

from fastapi import Path

@app.delete("/startups/{nome}")
def excluir_startup(nome: str = Path(..., description="Nome da startup a ser excluída")):
    resultado = startups_collection.delete_one({"nome": nome})
    if resultado.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Startup não encontrada.")
    return {"message": "Startup excluída com sucesso!"}

@app.post("/batalhas")
def gerar_batalhas():
    startups = list(startups_collection.find({}, {"_id": 0}))
    
    if len(startups) < 4 or len(startups) > 8 or len(startups) % 2 != 0:
        raise HTTPException(status_code=400, detail="É necessário ter entre 4 e 8 startups, em número par.")

    random.shuffle(startups)
    batalhas = []

    for i in range(0, len(startups), 2):
        batalha = {
            "startup_a": startups[i],
            "startup_b": startups[i+1]
        }
        batalhas.append(batalha)

    return {"batalhas": batalhas}