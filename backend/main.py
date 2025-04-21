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
confrontos_atuais = db["confrontos_atuais"]
confrontos_anteriores = db["confrontos_anteriores"]

@app.post("/startups")
def cadastrar_startup(startup: StartupCreate):
    if startups_collection.find_one({"nome": startup.nome}):
        raise HTTPException(status_code=400, detail="Startup já cadastrada.")
    nova = startup.dict()
    nova.update({
        "pontos": 70,
        "pitch": 0,
        "bugs": 0,
        "tracao": 0,
        "investidor_irritado": 0,
        "fake_news": 0
    })
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
    if confrontos_atuais.find_one({"encerrado": False}):
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
        confrontos_atuais.insert_one(confronto)

    return {"message": "Batalhas geradas com sucesso."}

@app.post("/confrontos")
def salvar_confronto(confronto: dict):
    filtro = {
        "startup_a.nome": confronto["startup_a"]["nome"],
        "startup_b.nome": confronto["startup_b"]["nome"],
        "encerrado": False
    }

    r = confrontos_atuais.update_one(filtro, {
        "$set": {
            "encerrado": True,
            "vencedor": confronto["vencedor"],
            "eventos": confronto.get("eventos", []),
            "fase": confronto.get("fase", 1)
        }
    })

    if r.modified_count == 0:
        raise HTTPException(status_code=404, detail="Confronto não encontrado ou já encerrado.")

    # Atualiza pontos e estatísticas
    for key in ["startup_a", "startup_b", "vencedor"]:
        s = confronto.get(key)
        if s:
            update = {
                "pontos": s["pontos"],
                "pitch": s.get("pitch", 0),
                "bugs": s.get("bugs", 0),
                "tracao": s.get("tracao", 0),
                "investidor_irritado": s.get("investidor_irritado", 0),
                "fake_news": s.get("fake_news", 0),
            }
            startups_collection.update_one({"nome": s["nome"]}, {"$set": update})

    # Se todos os confrontos da fase foram encerrados, move para "anteriores"
    fase = confronto.get("fase", 1)
    total = confrontos_atuais.count_documents({"fase": fase})
    encerrados = confrontos_atuais.count_documents({"fase": fase, "encerrado": True})
    if total == encerrados:
        todos = list(confrontos_atuais.find({"fase": fase}))
        if todos:
            confrontos_anteriores.insert_many(todos)
            confrontos_atuais.delete_many({"fase": fase})

    return {"message": "Confronto encerrado com sucesso."}

@app.post("/confrontos/gerar-proxima-fase")
def gerar_proxima_fase():
    ultimos = list(confrontos_anteriores.find({}, {"_id": 0}))
    if not ultimos:
        raise HTTPException(status_code=400, detail="Nenhuma fase finalizada.")

    ultima_fase = max(c.get("fase", 1) for c in ultimos)
    if confrontos_atuais.find_one({"encerrado": False}):
        return {"message": "Já existe fase em andamento."}


    vencedores = [c["vencedor"] for c in ultimos if c.get("fase") == ultima_fase]

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

    nova_fase = ultima_fase + 1
    random.shuffle(classificados)
    for i in range(0, len(classificados), 2):
        confronto = {
            "startup_a": classificados[i],
            "startup_b": classificados[i + 1],
            "encerrado": False,
            "vencedor": None,
            "fase": nova_fase
        }
        confrontos_atuais.insert_one(confronto)

    print("Gerando próxima fase com classificados:", classificados)


    return {"message": "Nova fase gerada.", "fase": nova_fase}

@app.get("/confrontos")
def listar_confrontos():
    todos = list(confrontos_atuais.find({}, {"_id": 0}))
    if not todos:
        return []

    startups = list(startups_collection.find({}, {"_id": 0}))
    pontos = {s["nome"]: s["pontos"] for s in startups}

    for c in todos:
        for lado in ["startup_a", "startup_b", "vencedor"]:
            if c.get(lado) and c[lado]["nome"] in pontos:
                c[lado]["pontos"] = pontos[c[lado]["nome"]]

    return todos

@app.get("/confrontos/classificados")
def listar_classificados():
    ultimos = list(confrontos_anteriores.find({}, {"_id": 0}))
    if not ultimos:
        return []

    maior_fase = max(c.get("fase", 1) for c in ultimos)
    vencedores = [c["vencedor"] for c in ultimos if c.get("fase", 1) == maior_fase]

    nomes = list(set(s["nome"] for s in vencedores))
    total_batalhas = len([c for c in ultimos if c["fase"] == maior_fase])
    if len(nomes) == 1 and total_batalhas == len(vencedores):
        campeao = vencedores[0]
        dados = startups_collection.find_one({"nome": campeao["nome"]}, {"_id": 0, "slogan": 1})
        if dados:
            campeao["slogan"] = dados.get("slogan", "")
        campeao["campeao"] = True
        return [campeao]

    return vencedores

@app.get("/relatorio-final")
def relatorio_final():
    startups = list(startups_collection.find({}, {"_id": 0}))
    startups.sort(key=lambda s: s["pontos"], reverse=True)

    campea = startups[0] if startups else None
    if campea:
        campea["campeao"] = True

    return {"ranking": startups, "campeao": campea}

@app.delete("/confrontos/limpar")
def limpar_confrontos():
    confrontos_atuais.delete_many({})
    confrontos_anteriores.delete_many({})
    startups_collection.update_many({}, {"$set": {
        "pontos": 70,
        "pitch": 0,
        "bugs": 0,
        "tracao": 0,
        "investidor_irritado": 0,
        "fake_news": 0,
        "vaga_direta": False
    }})
    return {"message": "Resetado com sucesso."}