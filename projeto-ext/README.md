# Sistema de Auxílio à Logística | Fertipar

Sistema corporativo para **validação prévia obrigatória de carregamentos** de fertilizantes a granel e ensacados. O sistema atua de forma desacoplada do ERP legado da fábrica para garantir:
1. **Correspondência rigorosa de tonelagem** entre a cota contratada/programada e a ordem emitida para o caminhão.
2. **Regularidade cadastral e fiscal (Sintegra/SEFAZ)** do cliente em tempo real (&le; 5 segundos) antes de autorizar a entrada do veículo na baia de carregamento.

---

## 1. Perfis de Acesso & Credenciais de Demonstração

O sistema conta com **autenticação real (Supabase Auth)** e controle estrito de permissões baseado em funções corporativas. A função é armazenada de forma segura em `app_metadata.role`, impossibilitando qualquer elevação de privilégio pelo lado do cliente.

| Perfil | Usuário (E-mail) | Senha | Escopo de Acesso |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@sal-logistica.app` | `NY5bWUxC7ndqav` | Acesso irrestrito a todas as visões (Portaria, Contratos, Ordens) + Painel exclusivo de **Observabilidade & Auditoria**. |
| **Logística** | `logistica@sal-logistica.app` | `FabDGX95UviVEQ` | **Exclusivo da Portaria:** Fila de carregamento, conferência de peso/placa, checagem fiscal em &le; 5s e liberação de veículos. |
| **Comercial** | `comercial@sal-logistica.app` | `vwMNfdyE3cZe9p` | **Exclusivo de Vendas:** Gestão de contratos-mãe, emissão de ordens por veículo e retificação/ressubmissão de ordens retidas. |

---

## 2. Padrões de Design e Segurança

* **Design Corporativo e Limpo:** Interface enxuta e focada em produtividade operacional, baseada em tipografia Inter, superfícies neutras, drawers de detalhamento e badges informativos.
* **Isolamento de Credenciais:** A chave de serviço (`SECRET_KEY`) é de uso estrito administrativo/backend e foi totalmente excluída do bundle do navegador (`vite.config.ts`), expondo apenas `PUBLISHABLE_KEY` e `SUPABASE_URL`.
* **Zero Vazamento Técnico:** A interface não expõe termos internos de desenvolvimento, nomes de provedores de infraestrutura ou botões de teste sintéticos.
* **Política Fail-Safe Fiscal:** Em caso de oscilação ou indisponibilidade na consulta pública do Sintegra, o sistema classifica a consulta como `INDETERMINADO` (cadastro não confirmado), mantendo a carga retida por precaução e evitando falso-positivo fiscal.

---

## 3. Funcionalidades por Módulo

### A. Fila de Carregamento (Logística & Administrador)
* Visualização dos veículos aguardando na portaria da fábrica.
* Filtros rápidos por situação: *Aguardando conferência*, *Retidas* e *Liberadas*.
* Abertura de gaveta lateral com raio-x da ordem (dados do motorista, cavalo/carreta, transportadora e histórico de eventos).
* Botão **Conferir e Liberar**: executa conferência cruzada de tonelagem e consulta cadastral do CNPJ/IE na SEFAZ.

### B. Contratos de Cooperativas (Comercial & Administrador)
* Gestão dos pedidos-mãe firmados com cooperativas agrícolas (ex.: Coamo, Cocamar, C.Vale).
* Barras de progresso com saldo disponível para faturamento.
* Ação de **Emitir Ordem** vinculada ao contrato com validação de limite de saldo.

### C. Ordens & Retenções (Comercial & Administrador)
* Acompanhamento das ordens emitidas e tratamento de divergências.
* **Fluxo de Ressubmissão:** Quando a portaria detecta divergência de tonelagem, o analista comercial ajusta a quantidade, insere a justificativa e reenvia a ordem diretamente para reavaliação da logística.

### D. Observabilidade & Auditoria (Exclusivo Administrador)
* **Saúde dos Serviços:** Verificação em tempo real da disponibilidade e latência do serviço de autenticação e do banco relacional PostgreSQL.
* **Métricas de Conformidade:** Total de consultas, taxa de sucesso, latência média e percentual de atendimento à meta de tempo (&le; 5,0s).
* **Trilha de Auditoria:** Registro cronológico de logins, consultas fiscais, emissões e autorizações de carregamento com filtro por nível (info, warn, error) e módulo.

---

## 4. Estrutura do Projeto

```text
projeto-ext/
├── scripts/
│   └── seed-users.mjs          # Script de provisionamento das contas no Supabase
├── src/
│   ├── components/             # Shell corporativo, gavetas, modais e feedback toast
│   ├── data/                   # Massa inicial realista com CNPJs reais de cooperativas
│   ├── lib/                    # Formatadores de moeda, tonelagem e datas
│   ├── pages/                  # Login, Fila, Contratos, OrdensComercial, Observabilidade
│   ├── services/               # Auth, Consulta CNPJ/Sintegra, DataService e Observability
│   ├── types/                  # Definições de domínio e tipos TypeScript
│   ├── App.tsx                 # Roteamento baseado em função de usuário
│   └── index.css               # Design system corporativo enxuto
├── supabase-schema.sql         # Esquema relacional das tabelas com RLS
└── vite.config.ts              # Configuração Vite com proteção de variáveis de ambiente
```

---

## 5. Como Executar Localmente

```bash
# 1. Navegue até o diretório da aplicação
cd projeto-ext

# 2. Instale as dependências (caso necessário)
npm install

# 3. Inicie o servidor de desenvolvimento
npm run dev
```

Acesse no navegador: **`http://localhost:5173/`**
