# Roadmap de Implementação

Este roadmap organiza o produto em etapas pequenas, com foco em entregar valor sem refatorações grandes.

## Etapa 0 - Base do produto

- Consolidar contratos de API e fluxo de conversa existente.
- Manter o painel atual funcionando enquanto novas capacidades entram.
- Evitar mudanças estruturais desnecessárias no primeiro ciclo.

## Etapa 1 - Operação real

### 1. Filas de atendimento

- Filas por setor.
- Prioridade da conversa.
- Distribuição automática.
- Limite de atendimentos por agente.
- Devolver conversa para fila.
- Assumir conversa manualmente.

### 2. Transferência de conversa

- Transferir para outro agente.
- Transferir para outro setor.
- Registrar motivo.
- Histórico de transferências.
- Notificação visual para quem recebeu.

### 3. Painel admin completo no front

- CRUD de usuários.
- Ativar/desativar usuário.
- Papéis e permissões.
- Vínculo com setor.
- Reset de senha.
- Gestão de instâncias WhatsApp.
- Gestão de setores.

### 4. Notas internas e tags

- Observação interna.
- Tags por conversa.
- Motivo de encerramento.
- Comentário para repasse.

## Etapa 2 - Gestão e supervisão

### 5. Dashboard operacional

- Conversas por status.
- Conversas por agente.
- Conversas por setor.
- Tempo médio de primeira resposta.
- Tempo médio de resolução.
- Atendimentos finalizados hoje.
- Agentes online.

### 6. SLA e alertas

- Tempo máximo de primeira resposta.
- Alerta visual por atraso.
- Ordenação por urgência.
- Destaque de conversas paradas.

### 7. Auditoria

- Quem assumiu.
- Quem transferiu.
- Quem finalizou.
- Quando mudou setor.
- Quando alterou contato.
- Quando conectou/desconectou instância.

## Etapa 3 - Produtividade do agente

### 8. Respostas rápidas

- Templates por setor.
- Atalhos.
- Variáveis dinâmicas.
- Busca de respostas.

### 9. Filtros e busca

- Por setor.
- Por status.
- Por tag.
- Por agente.
- Por data.
- Por número/nome do contato.

### 10. Melhorias no chat

- Anexos.
- Preview de imagem/pdf.
- Mensagens internas separadas.
- Fixar conversa.
- Marcar não lida.
- Emoji.
- Reabrir atendimento.

## Etapa 4 - Inteligência de negócio

### 11. Triagem automática

- Detectar assunto.
- Mandar para setor certo.
- Criar menu inicial.
- Distribuir por regras.

### 12. CRM leve

- Dados do contato.
- Empresa.
- Origem.
- Estágio.
- Histórico consolidado.
- Responsável atual.

### 13. Relatórios

- Volume por dia.
- Por agente.
- Por setor.
- Exportação CSV/Excel.
- Ranking de performance.

### 14. IA

- Resumo da conversa.
- Sugestão de resposta.
- Classificação automática.
- Análise de sentimento.
- Resumo na transferência.

## Ordem de execução sugerida

1. Fechar a base de filas.
2. Completar a transferência.
3. Entregar o admin completo.
4. Adicionar notas internas e tags.
5. Construir dashboard e SLA.
6. Evoluir produtividade.
7. Fechar inteligência e automação.
