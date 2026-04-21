# ZapTalk — WhatsApp Multi-atendente (MVP)

Backend Python (FastAPI) + Evolution API + React. Roda 100% local, sem Docker.

---

## Pré-requisitos

| Ferramenta | Versão mínima | Download |
|---|---|---|
| Python | 3.10+ | https://www.python.org/downloads/ |
| Node.js | 18+ (LTS) | https://nodejs.org |
| Git | qualquer | https://git-scm.com/download/win |

> ⚠️ Durante a instalação do Python, marque **"Add Python to PATH"**.  
> ⚠️ Durante a instalação do Node.js, marque **"Add to PATH"** também.

---

## Setup (primeira vez)

### Passo 1 — Instalar a Evolution API

Dê dois cliques em **`setup_evolution.bat`**

Isso vai:
- Clonar o repositório da Evolution API do GitHub
- Instalar as dependências Node
- Configurar o `.env` automaticamente
- Gerar o banco SQLite da Evolution API

> ⏱️ Pode demorar 3–5 minutos dependendo da sua internet.

### Passo 2 — Configurar o backend Python

Abra um terminal na pasta `zaptalk` e rode:

```bat
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python seed.py
```

### Passo 3 — Instalar o frontend

```bat
cd frontend
npm install
```

---

## Rodando o projeto (uso diário)

Abra **3 terminais** na pasta `zaptalk`:

| Terminal | Comando | O que faz |
|---|---|---|
| 1 | `start_evolution.bat` | Sobe a Evolution API (WhatsApp) |
| 2 | `start_backend.bat` | Sobe o backend Python |
| 3 | `start_frontend.bat` | Sobe o painel React |

---

## Acessos

| Serviço | URL |
|---|---|
| Painel de atendimento | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Documentação Swagger | http://localhost:8000/docs |
| Evolution API | http://localhost:8080 |

---

## Conectando o WhatsApp (primeiro acesso)

1. Acesse http://localhost:5173 e faça login:
   - **E-mail:** `admin@zaptalk.com`
   - **Senha:** `admin123`

2. Abra o Swagger em http://localhost:8000/docs
   - Clique em **Authorize** e cole o token do login

3. Crie uma instância WhatsApp:
   ```
   POST /api/v1/instances
   { "name": "principal" }
   ```

4. Gere o QR Code:
   ```
   GET /api/v1/instances/principal/qrcode
   ```

5. No campo `base64` da resposta, copie o conteúdo e cole em:
   https://www.base64-image.de  (para visualizar o QR)

6. Escaneie com o WhatsApp do número que será usado

7. Verifique a conexão:
   ```
   GET /api/v1/instances/principal/status
   ```
   Aguarde o estado `open`

8. Mande uma mensagem para o número → ela aparece no painel em tempo real!

---

## Estrutura do projeto

```
zaptalk/
├── setup_evolution.bat      ← Instala a Evolution API (rodar 1x)
├── start_evolution.bat      ← Terminal 1: sobe o WhatsApp
├── start_backend.bat        ← Terminal 2: sobe o Python
├── start_frontend.bat       ← Terminal 3: sobe o React
├── evolution-api/           ← Criado pelo setup_evolution.bat
├── backend/
│   ├── .env
│   ├── requirements.txt
│   ├── seed.py
│   └── app/
│       ├── main.py
│       ├── core/            ← config, security, deps
│       ├── db/              ← SQLAlchemy async
│       ├── models/          ← User, Sector, Contact, Conversation, Message
│       ├── schemas/         ← Pydantic
│       ├── services/        ← auth, conversation, evolution, webhook
│       ├── api/v1/endpoints/← auth, conversations, webhook, instances, sectors, ws
│       └── websocket/       ← ConnectionManager
└── frontend/
    └── src/
        ├── pages/           ← LoginPage, DashboardPage
        ├── components/      ← Sidebar, ChatArea
        ├── stores/          ← authStore, chatStore (Zustand)
        ├── hooks/           ← useWebSocket
        └── services/        ← api.js (axios)
```

---

## Credenciais padrão

| Campo | Valor |
|---|---|
| Admin e-mail | admin@zaptalk.com |
| Admin senha | admin123 |
| Evolution API Key | zaptalk_secret_key_change_me |

> ⚠️ Troque as credenciais antes de usar em produção ou expor na rede.

---

## Problemas comuns

**"Python não encontrado"**  
→ Reinstale o Python marcando "Add Python to PATH"

**"npm não é reconhecido"**  
→ Reinstale o Node.js e reinicie o terminal

**"git não é reconhecido"**  
→ Instale o Git: https://git-scm.com/download/win

**QR Code não aparece / erro na Evolution API**  
→ Certifique-se de que o Terminal 1 está rodando antes de gerar o QR

**Mensagens não chegam no painel**  
→ Verifique se os 3 terminais estão rodando  
→ Confirme que o WhatsApp está conectado (status = "open")

---

## Migracao para outro PC com Docker

Se voce quiser levar o projeto para outra maquina e subir apenas com Docker, use:

- `scripts/backup.ps1`
- `scripts/restore.ps1`
- `docs/roteiro-migracao-docker.md`

Fluxo rapido:

1. Rode o backup no PC atual.
2. Copie o projeto e a pasta `portable-backup` para o outro PC.
3. Instale Docker Desktop.
4. Rode o restore.
5. Abra `http://localhost:5173`.

Os dados que realmente importam ficam em:

- `backend/zaptalk.db`
- `backend/.env`
- volumes da Evolution / Postgres / Redis

# zaptalk
