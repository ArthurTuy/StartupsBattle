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

#cadastrar startups
@app.post("/startups")
def cadastrar_startup(startup: StartupCreate):
    total = startups_collection.count_documents({})
    if total >= 8:
        raise HTTPException(status_code=400, detail="Limite de 8 startups atingido.")
    
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

#lista as startups
@app.get("/startups")
def listar_startups():
    return list(startups_collection.find({}, {"_id": 0}))

#exclui as startups
@app.delete("/startups/{nome}")
def excluir_startup(nome: str = Path(...)):
    r = startups_collection.delete_one({"nome": nome})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Startup não encontrada.")
    return {"message": "Excluída com sucesso."}

#gera as batalhas
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

#salva os confrontos
@app.post("/confrontos")
def salvar_confronto(confronto: dict):
    confronto_original = confrontos_atuais.find_one({
        "startup_a.nome": confronto["startup_a"]["nome"],
        "startup_b.nome": confronto["startup_b"]["nome"],
        "encerrado": False
    })

    if not confronto_original:
        print("Confronto não encontrado.")
        raise HTTPException(status_code=404, detail="Confronto não encontrado ou já encerrado.")

    fase = confronto_original.get("fase", 1)

    confrontos_atuais.update_one(
        {"_id": confronto_original["_id"]},
        {"$set": {
            "encerrado": True,
            "vencedor": confronto["vencedor"],
            "eventos": confronto.get("eventos", []),
            "fase": fase
        }}
    )

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

    total_batalhas = confrontos_atuais.count_documents({"fase": fase})
    encerradas = confrontos_atuais.count_documents({"fase": fase, "encerrado": True})
    print(f"Total: {total_batalhas}, Encerradas: {encerradas}")

    if total_batalhas == 0 or encerradas < total_batalhas:
        print("Ainda há batalhas em andamento.")
        return {"message": "Confronto encerrado com sucesso. Ainda há batalhas em andamento."}

    encerrados_docs = list(confrontos_atuais.find({"fase": fase}))
    for doc in encerrados_docs:
        doc.pop("_id", None)
    confrontos_anteriores.insert_many(encerrados_docs)
    confrontos_atuais.delete_many({"fase": fase})

    vencedores = [c["vencedor"] for c in encerrados_docs if "vencedor" in c]

    nomes_unicos = set()
    classificados = []
    for s in vencedores:
        if s["nome"] not in nomes_unicos:
            nomes_unicos.add(s["nome"])
            classificados.append(s)

    vaga_direta = startups_collection.find_one({"vaga_direta": True})
    aviso = None
    if vaga_direta:
        vaga_direta.pop("_id", None)
        startups_collection.update_one({"nome": vaga_direta["nome"]}, {"$set": {"vaga_direta": False}})
        classificados.append(vaga_direta)
        aviso = f"{vaga_direta['nome']} avançou direto para a próxima fase."
        print(aviso)

    if len(classificados) % 2 != 0:
        bye = random.choice(classificados)
        bye["vaga_direta"] = True
        startups_collection.update_one({"nome": bye["nome"]}, {"$set": {"vaga_direta": True}})
        classificados = [c for c in classificados if c["nome"] != bye["nome"]]
        aviso = f"{bye['nome']} avançou direto para a próxima fase."
        print(aviso)

    if len(classificados) >= 2:
        nova_fase = fase + 1
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
            print(f"Nova batalha: {classificados[i]['nome']} vs {classificados[i+1]['nome']} (Fase {nova_fase})")

    return {"message": "Confronto encerrado com sucesso.", "aviso": aviso}

#checa se existe alguma startups com vaga direta
@app.get("/vaga-direta")
def verificar_vaga_direta():
    vaga = startups_collection.find_one({"vaga_direta": True}, {"_id": 0, "nome": 1})
    if vaga:
        return {"vaga_direta": vaga["nome"]}
    return {"vaga_direta": None}

#lista os confrontos em andamento
@app.get("/confrontos")
def listar_confrontos():
    todos = list(confrontos_atuais.find({}))
    startups = list(startups_collection.find({}, {"_id": 0}))
    pontos = {s["nome"]: s["pontos"] for s in startups}

    for c in todos:
        c.pop("_id", None)
        for lado in ["startup_a", "startup_b", "vencedor"]:
            if c.get(lado) and c[lado]["nome"] in pontos:
                c[lado]["pontos"] = pontos[c[lado]["nome"]]

    return todos

#lista os classificados da fase anteriores
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

#relatório final
@app.get("/relatorio-final")
def relatorio_final():
    startups = list(startups_collection.find({}, {"_id": 0}))
    startups.sort(key=lambda s: s["pontos"], reverse=True)

    campea = startups[0] if startups else None
    if campea:
        campea["campeao"] = True

    return {"ranking": startups, "campeao": campea}

#reseta tudo
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