from pymongo import MongoClient

def connect_to_mongo():
    uri = "mongodb+srv://arthursauer10:ru8VOsbq9VQ5dP2j@cluster0.rwghsve.mongodb.net/"
    client = MongoClient(uri)
    return client["startup_rush"]
