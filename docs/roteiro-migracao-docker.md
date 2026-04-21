# Roteiro de migracao Docker

Este roteiro deixa o ZapTalk pronto para sair de um PC e voltar a subir em outro PC
com apenas Docker Desktop instalado.

## O que fica no Git

- codigo-fonte
- `docker-compose.dockerized.yml`
- `Dockerfile` do backend e do frontend
- scripts de backup e restore
- documentacao de migracao

## O que fica fora do Git

- banco local do backend
- tokens e segredos
- sessoes do WhatsApp
- volumes do Postgres, Redis e Evolution

## Estrutura de backup

O backup gerado pelos scripts vai para:

```text
portable-backup/
  YYYYMMDD-HHMMSS/
    manifest.json
    compose.config.txt
    files/
      backend-zaptalk.db
      backend.env
      root.env
    volumes/
      zaptalk_evolution_instances.tar.gz
      zaptalk_evolution_store.tar.gz
      zaptalk_evolution_postgres_data.tar.gz
      zaptalk_evolution_redis_data.tar.gz
```

## Como usar no PC de origem

1. Rode o backup no projeto.
2. Copie o projeto e a pasta `portable-backup` para o novo PC.

```powershell
PowerShell -ExecutionPolicy Bypass -File .\scripts\backup.ps1
```

## Como usar no PC de destino

1. Instale apenas o Docker Desktop.
2. Clone ou copie o projeto.
3. Rode o restore.

```powershell
PowerShell -ExecutionPolicy Bypass -File .\scripts\restore.ps1
```

4. Abra:

- http://localhost:5173
- http://localhost:8000/docs

## Observacoes

- O backup pausa o stack Docker para manter os volumes consistentes.
- O restore recria os volumes e sobe o stack novamente.
- Se o WhatsApp pedir novo QR, basta reconectar pela tela de administracao.
