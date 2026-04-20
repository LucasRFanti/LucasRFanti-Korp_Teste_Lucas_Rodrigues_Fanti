# Guia rápido de Docker (este projeto)

## 1) Pré-requisitos
- Instalar **Docker Desktop**
- Abrir o Docker Desktop e esperar ficar com status **Running**

> No seu caso, o erro atual foi exatamente esse: daemon do Docker não estava ativo.

## 2) Subir tudo
No diretório raiz do projeto (onde está o `docker-compose.yml`):

Antes, crie o arquivo de variáveis locais:

```powershell
Copy-Item .env.example .env
```

Edite o `.env` e ajuste senha/chave JWT para o seu ambiente.

```powershell
docker compose up -d --build
```

Isso sobe:
- `sqlserver` (banco SQL Server)
- `backend-estoque` (porta 5001)
- `backend-faturamento` (porta 5090)
- `frontend` (porta 4200)

## 3) Acessos
- Frontend: http://localhost:4200
- Swagger estoque: http://localhost:5001/swagger
- Swagger faturamento: http://localhost:5090/swagger

## 4) Comandos úteis
Ver containers:

```powershell
docker compose ps
```

Ver logs de todos:

```powershell
docker compose logs -f
```

Ver logs de um serviço:

```powershell
docker compose logs -f backend-faturamento
```

Parar tudo:

```powershell
docker compose down
```

Parar e apagar volumes (zera o banco):

```powershell
docker compose down -v
```

## 5) Observações importantes
- As migrations rodam no startup dos backends.
- As connection strings são injetadas pelo `docker-compose.yml`.
- O frontend usa Nginx com proxy para as APIs (`/api/...`), então funciona direto em produção no Docker.

## 6) Troubleshooting

- Aviso `The "MSSQL_SA_PASSWORD" variable is not set`:
	- Crie o arquivo `.env` na raiz: `Copy-Item .env.example .env`
	- Suba novamente: `docker compose up -d --build`

- Erro SQL `Login failed for user 'sa'` repetindo nos logs:
	- Geralmente a senha do `.env` foi alterada, mas o volume existente mantém estado anterior.
	- Faça reset local: `docker compose down -v`
	- Suba de novo: `docker compose up -d --build`
