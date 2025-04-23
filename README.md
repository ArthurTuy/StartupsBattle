Startups-Dell

Requisitos para rodar o projeto
    Node.js (recomendado: versão LTS)
    Python (recomendado: 3.11 ou superior)
    pip (gerenciador de pacotes do Python)

Como executar (BACKEND)
1. Navegue até o backend
    Vai depender da pasta que voce estiver, mas normalmente será só
    comando: cd backend

2. Backend (FastAPI)
    Crie um ambiente virtual
    comando: python -m venv venv
    comando: source venv/bin/activate ou 'venv\Scripts\activate' no Windows

3. Instale as dependências
    comando: pip install -r requirements.txt

4. Execute o backend
    comando: uvicorn main:app --reload

Como executar (FRONTEND)
1. Acesse a pasta do frontend
    comando: cd frontend

2. Instale as dependências
    npm install

3. Execute o frontend
    npm run dev

Com o frontned e o backend rodando, acesse a URL que indicará no terminal, normalmente é http://localhost:3000/ e você poderá usar o sistema