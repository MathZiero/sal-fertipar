# Briefing do Projeto

## 1. Visão geral
- **Nome do projeto:** Sistema de Auxilio à Logistica Fertipar
- **Descrição resumida:** Sistema auxiliar desenvolvido para validação prévia de carregamentos, garantindo a correspondência correta de tonelagem entre pedidos-mãe e pedidos-filhos e a regularidade cadastral fiscal (Sintegra) do cliente antes do carregamento físico e do faturamento.
- **Problema que resolve:** 
  - Descasamento de quantidades entre a ordem emitida para o caminhão (pedido-filho) e o volume contratado/programado do pedido-mãe (ex.: programado 28t, mas emitida ordem de 32t), percebido tardiamente apenas no momento do faturamento após o veículo já estar carregado.
  - Carregamentos realizados para clientes cuja Inscrição Estadual (Sintegra) se tornou irregular entre o momento do agendamento e o momento da execução do carregamento, gerando transtornos e travamento fiscal no faturamento após a carga efetuada.
- **Objetivo principal:** Antecipar as validações operacionais de volume e as checagens fiscais para a etapa anterior ao carregamento, notificando os operadores e evitando transtornos, retrabalhos e gargalos no faturamento para Logística, Comercial e Clientes.

---

## 2. Contexto
- **Situação atual:** O processo de checagem e conferência é realizado de forma manual. Grandes cooperativas realizam pedidos volumosos ("pedidos-mãe", ex.: 1.000 toneladas), retirados fracionadamente via "pedidos-filhos". Devido ao controle manual e a deficiências do sistema principal, divergências de tonelagem e irregularidades fiscais no Sintegra passam despercebidas até a tentativa de emissão de NF no faturamento.
- **Por que o projeto é necessário:** Para suprir as deficiências do sistema principal de forma autônoma e sem custos adicionais, evitando caminhões carregados parados na expedição, despesas com descarregamento/retrabalho e atritos comerciais com cooperativas e clientes.
- **Público/usuários envolvidos:** Equipes de Logística e Comercial da Fertipar.

---

## 3. Escopo
### Incluído
- Validação e conferência entre as quantidades do pedido-mãe e as ordens emitidas nos pedidos-filhos antes da liberação do carregamento.
- Consulta e checagem da situação cadastral da Inscrição Estadual (Sintegra) do cliente no momento que antecede a liberação do carregamento.
- Emissão de avisos/notificações em tela para os usuários de Logística e Comercial caso seja detectada divergência de quantidade ou irregularidade fiscal.
- Fluxo de reenvio/ressubmissão do pedido para nova conferência de liberação após a correção das inconsistências.

### Não incluído
- O sistema é estritamente auxiliar e não tem integração direta com o sistema principal da empresa:
  - Não executa ações diretas nem altera registros no sistema principal (não substitui o ERP).
  - Não possui poder de bloqueio automatizado no sistema principal.
  - Não realiza faturamento nem emissão de Notas Fiscais (NF-e).
  - Não faz controle físico de balança/pesagem ou renegociação contratual de pedidos.

---

## 4. Usuários
- **Quem utilizará o sistema:** Equipes de Logística e Comercial.
- **Perfis de usuário:**
  - **Logística:** Operadores responsáveis pela portaria, agendamentos, verificação da situação cadastral do cliente e conferência das ordens de saída.
  - **Comercial:** Vendedores e analistas responsáveis pela gestão dos pedidos-mãe, liberação e acompanhamento dos pedidos-filhos das cooperativas.
- **Principais necessidades de cada perfil:**
  - **Logística:** Receber em até 5 segundos a confirmação se a Inscrição Estadual do cliente está regular no Sintegra e garantir que a quantidade autorizada do pedido-filho bata com a ordem antes de carregar o caminhão; visualizar avisos claros em caso de inconsistência.
  - **Comercial:** Ser notificado imediatamente sobre divergências de quantidade ou impedimentos fiscais, possibilitando ajustes rápidos e ressubmissão do pedido para nova conferência sem prejudicar a relação com o cliente.

---

## 5. Funcionalidades principais
- **Funcionalidade A (Validação de Pedidos):** Conferência e validação de quantidade e saldo entre pedido-mãe e pedido-filho, identificando qualquer descasamento de ordem.
- **Funcionalidade B (Consulta Sintegra):** Validação ágil (em até 5 segundos) da regularidade da Inscrição Estadual do cliente junto ao Sintegra/SEFAZ antes da autorização do carregamento.
- **Funcionalidade C (Notificação e Alertas em Tela):** Exibição de avisos e notificações simultâneas nas telas da Logística e do Comercial ao detectar divergência de peso ou irregularidade fiscal.
- **Funcionalidade D (Ressubmissão para Conferência):** Recurso para submeter novamente o pedido para nova conferência de liberação após as correções necessárias.

---

## 6. Regras e restrições
- **Regras de negócio importantes:**
  - A ordem de carregamento emitida para o pedido-filho deve corresponder exatamente à quantidade autorizada e ser devidamente abatida do pedido-mãe.
  - A checagem fiscal do Sintegra deve ser realizada obrigatoriamente antes do carregamento físico.
  - Caso seja detectado erro de peso ou Sintegra irregular, o sistema não bloqueará o sistema principal (por falta de integração), mas emitirá notificação de aviso em tela para os usuários de Logística e Comercial.
  - Uma vez notificado o erro, o pedido corrigido deve ser obrigatoriamente ressubmetido para nova conferência antes da liberação.
- **Restrições técnicas:**
  - Sistema desacoplado (sem integração direta com o sistema principal/ERP atual).
  - Tempo limite de validação de até 5 segundos.
- **Restrições de custo:**
  - O custo deve ser de **R$ 0,00**.
- **Restrições de infraestrutura:**
  - Aplicação deve operar com armazenamento em nuvem no Supabase e hospedagem/deploy na Vercel.

---

## 7. Requisitos não funcionais
- **Segurança:** Autenticação e controle de acesso para os perfis de Logística e Comercial via Supabase Auth / políticas de segurança.
- **Performance:** Tempo de resposta da validação/consulta de no máximo 5 segundos para não gerar gargalos ou filas na expedição/portaria.
- **Disponibilidade:** Alta disponibilidade provida pela infraestrutura de nuvem (Vercel e Supabase).
- **Escalabilidade:** Arquitetura serverless e banco de dados relacional na nuvem dimensionados para a demanda operacional.
- **Manutenibilidade:** Código modular e fortemente tipado utilizando React e TypeScript.

---

## 8. Tecnologias
- **Linguagem:** TypeScript
- **Framework:** React.js
- **Banco de dados:** PostgreSQL (via Supabase)
- **Infraestrutura:** Armazenamento em nuvem via Supabase e deploy via Vercel (custo R$ 0,00)
- **APIs/serviços externos:** 
  - Consulta ao Sintegra / SEFAZ (decisão de implementação/provedor gratuito pendente)
  - Sistema principal/ERP (informação não disponível / sem integração direta)

---

## 9. Critérios de sucesso
- Zero ocorrências de bloqueio de faturamento decorrentes de divergência entre pedido-filho e pedido-mãe após o caminhão estar carregado.
- Zero ocorrências de carregamento realizado para clientes com Inscrição Estadual irregular no Sintegra.
- Não há outros KPIs adicionais previstos.

---

## 10. Estado atual
- **O que já existe:** O processo atual é realizado de forma 100% manual.
- **O que já foi implementado:** Nada implementado até o momento.
- **O que está pendente:** O sistema auxiliar está sendo criado do zero para resolver deficiências do sistema principal; pendente definir a estratégia técnica de consulta ao Sintegra/SEFAZ (com custo zero e retorno em até 5s) e desenvolver a aplicação.
