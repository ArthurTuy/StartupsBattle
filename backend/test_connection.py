from database import connect_to_mongo

db = connect_to_mongo()
collection = db["test_collection"]

# Inserindo um dado simples
collection.insert_one({"mensagem": "Conectado ao Atlas!"})

# Buscando para testar
item = collection.find_one()
print(item)
