from pydantic import BaseModel

class StartupCreate(BaseModel):
    nome: str
    slogan: str
    ano_fundacao: int
