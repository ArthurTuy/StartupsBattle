from fastapi import FastAPI, HTTPException, Path
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import connect_to_mongo
from schemas import StartupCreate
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
confrontos_collection = db["confrontos"]

@app.post("/startups")
def cadastrar_startup(startup: StartupCreate):
    if startups_collection.find_one({"nome": startup.nome}):
        raise HTTPException(status_code=400, detail="Startup já cadastrada.")
    nova = startup.dict()
    nova["pontos"] = 70
    startups_collection.insert_one(nova)
    return {"message": "Startup cadastrada com sucesso."}

@app.get("/startups")
def listar_startups():
    return list(startups_collection.find({}, {"_id": 0}))

@app.delete("/startups/{nome}")
def excluir_startup(nome: str = Path(...)):
    r = startups_collection.delete_one({"nome": nome})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Startup não encontrada.")
    return {"message": "Excluída com sucesso."}

@app.post("/batalhas")
def gerar_batalhas():
    if confrontos_collection.find_one({"encerrado": False}):
        raise HTTPException(status_code=400, detail="Já existem batalhas em andamento.")

    startups = list(startups_collection.find({}, {"_id": 0}))
    if len(startups) < 4 or len(startups) > 8 or len(startups) % 2 != 0:
        raise HTTPException(status_code=400, detail="Necessário entre 4 e 8 startups (número par).")

    random.shuffle(startups)
    for i in range(0, len(startups), 2):
        confronto = {
            "startup_a": startups[i],
            "startup_b": startups[i + 1],
            "encerrado": False,
            "vencedor": None,
            "fase": 1
        }
        confrontos_collection.insert_one(confronto)

    return {"message": "Batalhas geradas com sucesso."}

@app.post("/confrontos")
def salvar_confronto(confronto: dict):
    filtro = {
        "startup_a.nome": confronto["startup_a"]["nome"],
        "startup_b.nome": confronto["startup_b"]["nome"],
        "encerrado": False
    }

    atualizacao = {
        "$set": {
            "encerrado": True,
            "vencedor": confronto["vencedor"],
            "eventos": confronto.get("eventos", []),
            "fase": confronto.get("fase", 1)
        }
    }

    r = confrontos_collection.update_one(filtro, atualizacao)
    if r.modified_count == 0:
        raise HTTPException(status_code=404, detail="Confronto não encontrado ou já encerrado.")

    for key in ["startup_a", "startup_b", "vencedor", "perdedor"]:
        s = confronto.get(key)
        if s:
            startups_collection.update_one({"nome": s["nome"]}, {"$set": {"pontos": s["pontos"]}})
    return {"message": "Confronto encerrado com sucesso."}

@app.post("/confrontos/gerar-proxima-fase")
def gerar_proxima_fase():
    finalizados = list(confrontos_collection.find({"encerrado": True}, {"vencedor": 1, "fase": 1, "_id": 0}))
    if not finalizados:
        raise HTTPException(status_code=400, detail="Nenhum confronto finalizado.")

    ultima_fase = max(c.get("fase", 1) for c in finalizados)
    if confrontos_collection.find_one({"fase": ultima_fase + 1}):
        return {"message": "Próxima fase já gerada."}

    vencedores = [c["vencedor"] for c in finalizados if c.get("fase") == ultima_fase]

    nomes_unicos = set()
    classificados = []
    for s in vencedores:
        if s["nome"] not in nomes_unicos:
            nomes_unicos.add(s["nome"])
            classificados.append(s)

    if len(classificados) < 2:
        return {"message": "Torneio finalizado. Apenas um vencedor."}

    if len(classificados) % 2 != 0:
        bye = random.choice(classificados)
        bye["vaga_direta"] = True
        startups_collection.update_one({"nome": bye["nome"]}, {"$set": {"vaga_direta": True}})
        classificados.remove(bye)

    random.shuffle(classificados)
    for i in range(0, len(classificados), 2):
        confronto = {
            "startup_a": classificados[i],
            "startup_b": classificados[i + 1],
            "encerrado": False,
            "vencedor": None,
            "fase": ultima_fase + 1
        }
        confrontos_collection.insert_one(confronto)

    return {"message": "Nova fase gerada.", "fase": ultima_fase + 1}

@app.get("/confrontos")
def listar_confrontos():
    todos = list(confrontos_collection.find({}, {"_id": 0}))
    if not todos:
        return []

    maior_fase = max(c.get("fase", 1) for c in todos)
    fase_atual = [c for c in todos if c.get("fase", 1) == maior_fase]

    startups = list(startups_collection.find({}, {"_id": 0}))
    pontos = {s["nome"]: s["pontos"] for s in startups}

    for c in fase_atual:
        for lado in ["startup_a", "startup_b", "vencedor"]:
            if c.get(lado) and c[lado]["nome"] in pontos:
                c[lado]["pontos"] = pontos[c[lado]["nome"]]

    return fase_atual

@app.get("/confrontos/classificados")
def listar_classificados():
    encerrados = list(confrontos_collection.find({"encerrado": True}, {"_id": 0, "vencedor": 1, "fase": 1}))
    if not encerrados:
        return []

    maior_fase = max(c.get("fase", 1) for c in encerrados)
    vencedores = [c["vencedor"] for c in encerrados if c.get("fase", 1) == maior_fase]

    nomes = list(set(s["nome"] for s in vencedores))
    total_batalhas = confrontos_collection.count_documents({"fase": maior_fase})
    total_encerrados = confrontos_collection.count_documents({"fase": maior_fase, "encerrado": True})

    if len(nomes) == 1 and total_batalhas == total_encerrados:
        campeao = vencedores[0]
        dados = startups_collection.find_one({"nome": campeao["nome"]}, {"_id": 0, "slogan": 1})
        if dados:
            campeao["slogan"] = dados.get("slogan", "")
        campeao["campeao"] = True
        return [campeao]

    return vencedores

@app.delete("/confrontos/limpar")
def limpar_confrontos():
    confrontos_collection.delete_many({})
    startups_collection.update_many({}, {"$set": {"pontos": 70, "vaga_direta": False}})
    return {"message": "Resetado com sucesso."}
