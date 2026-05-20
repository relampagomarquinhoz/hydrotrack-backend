# HydroTrack — Backend

API REST em **Node.js + Express + PostgreSQL** com autenticação JWT, Bcrypt e tunnel via Ngrok.

---

## 📋 Pré-requisitos

- [Node.js 18+](https://nodejs.org)
- [PostgreSQL](https://www.postgresql.org/download/) + PGAdmin instalados
- Conta gratuita em [ngrok.com](https://ngrok.com)

---

## 🗄️ 1. Criar o banco no PGAdmin

1. Abra o **PGAdmin**
2. Clique com botão direito em **Databases → Create → Database**
3. Nome: `hydrotrack` → Salvar
4. Clique com botão direito em `hydrotrack` → **Query Tool**
5. Abra o arquivo `src/db/schema.sql`, cole o conteúdo e pressione **F5**
6. Confirme que as tabelas foram criadas na aba "Messages"

---

## ⚙️ 2. Configurar variáveis de ambiente

```bash
# Copie o arquivo de exemplo
cp .env.example .env
```

Edite o `.env` com suas informações:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hydrotrack
DB_USER=postgres
DB_PASSWORD=SUA_SENHA_DO_POSTGRES

JWT_SECRET=coloque_uma_string_longa_e_aleatoria_aqui

PORT=3000

NGROK_AUTHTOKEN=seu_token_do_ngrok
```

> **JWT_SECRET**: use qualquer string longa (ex: `openssl rand -base64 32` no terminal)
> **NGROK_AUTHTOKEN**: pegue em https://dashboard.ngrok.com/get-started/your-authtoken

---

## 📦 3. Instalar dependências

```bash
npm install
```

---

## 🚀 4. Rodar o servidor

```bash
# Só o servidor (sem ngrok)
npm run dev

# Servidor + ngrok ao mesmo tempo (recomendado para testar no celular)
npm run dev:tunnel
```

---

## 🔗 5. Conectar o app React Native

Quando o ngrok iniciar, você verá no terminal:

```
🔗 URL pública: https://xxxx-xxx-xxx.ngrok-free.app
```

No seu app React Native, crie um arquivo `src/config/api.ts`:

```typescript
// Troque pela URL do ngrok (ou localhost para emulador Android)
export const API_URL = 'https://xxxx-xxx-xxx.ngrok-free.app';

export const api = {
  headers: (token?: string) => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }),
};
```

---

## 📡 Endpoints

### Autenticação
| Método | Rota | Proteção | Descrição |
|--------|------|----------|-----------|
| POST | `/auth/register` | — | Criar conta |
| POST | `/auth/login` | — | Login |
| GET | `/auth/me` | ✅ JWT | Dados do usuário |
| PUT | `/auth/me` | ✅ JWT | Atualizar perfil |

### Hidratação
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/hydration/log` | Registrar água (body: `{ amount_ml, note? }`) |
| GET | `/hydration/today` | Resumo do dia (total, meta, %) |
| GET | `/hydration/history?days=7` | Histórico por dia |
| GET | `/hydration/streak` | Dias seguidos batendo a meta |
| DELETE | `/hydration/log/:id` | Apagar registro |

### Notificações
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/notifications/settings` | Buscar configurações |
| PUT | `/notifications/settings` | Salvar configurações |
| POST | `/notifications/toggle` | Liga/desliga rápido |

---

## 🔒 Segurança implementada

- **Bcrypt** (salt 12) — senhas nunca salvas em texto puro
- **JWT** — tokens com expiração de 7 dias
- **Helmet** — headers HTTP de segurança
- **Rate limiting** — 100 req/15min global; 10 req/15min em login/register
- **express-validator** — validação de inputs
- **CORS** configurado

---

## 🧪 Testando com curl

```bash
# Cadastro
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Pedro","email":"pedro@test.com","password":"123456","weight_kg":75}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"pedro@test.com","password":"123456"}'

# Registrar água (use o token retornado no login)
curl -X POST http://localhost:3000/hydration/log \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount_ml":250}'

# Resumo do dia
curl http://localhost:3000/hydration/today \
  -H "Authorization: Bearer SEU_TOKEN"
```
