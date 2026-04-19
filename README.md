# Korp Teste Técnico — Portal Admin (Angular + .NET)

Projeto full stack com:
- **Frontend** em Angular
- **Backend de Faturamento** em ASP.NET Core + EF Core + SQL Server
- **Backend de Estoque** em ASP.NET Core + EF Core + SQL Server
- **Docker Compose** para subir tudo integrado

---

## Sumário

- [Visão geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Como executar com Docker (recomendado)](#como-executar-com-docker-recomendado)
- [Como executar local (sem Docker)](#como-executar-local-sem-docker)
- [Autenticação](#autenticação)
- [Admin default](#admin-default)
- [Concorrência e idempotência](#concorrência-e-idempotência)
- [Principais endpoints](#principais-endpoints)
- [Fluxo de negócio (resumo)](#fluxo-de-negócio-resumo)
- [Observações importantes](#observações-importantes)

---

## Visão geral

Sistema administrativo para:
- Login com JWT
- Gestão de funcionários
- Gestão de produtos e saldo de estoque
- Emissão de notas fiscais com itens
- Impressão de nota (com baixa de estoque)
- Histórico de notas fiscais

---

## Arquitetura

### Serviços

1. **frontend** (Angular + Nginx)
2. **backend-faturamento** (API principal de notas, auth e funcionários)
3. **backend-estoque** (API de produtos/saldo)
4. **sqlserver** (banco de dados)

### Comunicação

- Frontend chama APIs via `/api/...`
- Backend de faturamento chama backend de estoque para dedução de saldo na impressão

---

## Funcionalidades

### Frontend
- Login
- Dashboard com KPIs e últimas notas
- CRUD de Funcionários
- CRUD de Produtos
- Notas fiscais pendentes para impressão
- Histórico de notas fiscais com filtros e busca
- Modais de confirmação para ações destrutivas
- Toasts para feedback visual

### Backend Faturamento
- Autenticação JWT
- CRUD de funcionários
- Criação de notas fiscais
- Impressão de nota fiscal
- Descarte de nota pendente
- Limpeza de histórico (notas fechadas)
- Idempotência persistida para criar/imprimir nota

### Backend Estoque
- CRUD de produtos
- Dedução de saldo com operação atômica (concorrência)

---

## Tecnologias

- **Angular**
- **ASP.NET Core 8**
- **Entity Framework Core**
- **SQL Server**
- **Docker / Docker Compose**
- **JWT**
- **BCrypt**

---

## Estrutura de pastas

```text
backend-estoque/
backend-faturamento/
frontend/
docker-compose.yml
README-DOCKER.md
```

---

## Como executar com Docker (recomendado)

### Pré-requisitos
- Docker Desktop instalado e em execução

### Subir ambiente
Na raiz do projeto:

```bash
cp .env.example .env
```

> No Windows (PowerShell): `Copy-Item .env.example .env`
>
> Ajuste os valores do `.env` (senha SQL e chave JWT) antes de subir.

```bash
docker compose up -d --build
```

### Acessos
- Frontend: http://localhost:4200
- Swagger Estoque: http://localhost:5001/swagger
- Swagger Faturamento: http://localhost:5090/swagger

### Comandos úteis

```bash
docker compose ps
docker compose logs -f
docker compose logs -f backend-faturamento
docker compose down
docker compose down -v
```

> `down -v` remove volumes e zera o banco.

---

## Como executar local (sem Docker)

### Pré-requisitos
- .NET SDK 8+
- Node.js 18+
- SQL Server local

### 1) Backend Estoque
No diretório `backend-estoque`:

```bash
dotnet restore
dotnet run
```

### 2) Backend Faturamento
No diretório `backend-faturamento`:

```bash
dotnet restore
dotnet run
```

### 3) Frontend
No diretório `frontend`:

```bash
npm install
npm start
```

---

## Autenticação

- Login gera token JWT
- Frontend salva token no `localStorage`
- Interceptor adiciona `Authorization: Bearer <token>`

---

## Admin default

Ao subir o backend de faturamento, se não houver usuário, é criado automaticamente:

- **E-mail:** `admin@portal.com`
- **Senha:** `123456`

---

## Concorrência e idempotência

### Concorrência (Estoque)
A dedução de saldo usa operação atômica no banco para evitar inconsistência quando duas requisições tentam consumir o mesmo saldo simultaneamente.

### Idempotência (Faturamento)
Operações de:
- `POST /api/notasfiscais` (criar)
- `POST /api/notasfiscais/{id}/imprimir` (imprimir)

aceitam `Idempotency-Key` e persistem o controle em tabela própria (`IdempotencyRequests`), evitando efeitos duplicados em retries/requisições repetidas.

---

## Principais endpoints

### Auth (Faturamento)
- `POST /api/auth/login`

### Funcionários (Faturamento)
- `GET /api/employess`
- `GET /api/employess/{id}`
- `POST /api/employess`
- `PUT /api/employess/{id}`
- `DELETE /api/employess/{id}`

### Notas fiscais (Faturamento)
- `GET /api/notasfiscais`
- `GET /api/notasfiscais/{id}`
- `POST /api/notasfiscais`
- `POST /api/notasfiscais/{id}/imprimir`
- `POST /api/notasfiscais/{id}/descartar`
- `DELETE /api/notasfiscais/historico`

### Produtos (Estoque)
- `GET /api/produtos`
- `GET /api/produtos/{id}`
- `POST /api/produtos`
- `PUT /api/produtos/{id}`
- `DELETE /api/produtos/{id}`
- `PATCH /api/produtos/{id}/deduzir-saldo`

---

## Fluxo de negócio (resumo)

1. Usuário cria nota fiscal com itens
2. Nota fica pendente de impressão
3. Ao imprimir:
   - Faturamento chama Estoque para deduzir saldo de cada item
   - Se houver erro de saldo/integração, impressão falha
   - Se tudo OK, nota é fechada
4. Nota fechada entra no histórico

---

## Observações importantes

- Migrations rodam no startup dos backends.
- Em Docker, variáveis de ambiente e connection strings são injetadas via `docker-compose.yml`.
- Frontend em Docker usa Nginx com proxy para `/api/...`.
- O projeto usa rota de funcionários como `/api/employess` (nome atual no código).

---

Se você for publicar no GitHub, este README já pode ser usado como documentação principal do repositório.
