-- ==============================================================================
-- SISTEMA DE AUXÍLIO À LOGÍSTICA FERTIPAR
-- Script de Inicialização do Banco de Dados PostgreSQL (Supabase)
-- Custo: R$ 0,00 | Camada de Armazenamento em Nuvem
-- ==============================================================================

-- 1. Criação da Tabela de Pedidos-Mãe (Contratos de Cooperativas e Clientes)
CREATE TABLE IF NOT EXISTS public.pedidos_mae (
    id TEXT PRIMARY KEY,
    numero_contrato VARCHAR(50) NOT NULL UNIQUE,
    cliente_nome VARCHAR(255) NOT NULL,
    cliente_cnpj VARCHAR(20) NOT NULL,
    cliente_ie VARCHAR(30) NOT NULL,
    cliente_uf VARCHAR(2) NOT NULL,
    produto VARCHAR(150) NOT NULL,
    quantidade_total_ton NUMERIC(12, 2) NOT NULL,
    quantidade_retirada_ton NUMERIC(12, 2) DEFAULT 0.00,
    quantidade_saldo_ton NUMERIC(12, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'CONCLUIDO', 'CANCELADO')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criação da Tabela de Pedidos-Filhos (Ordens de Carregamento por Caminhão)
CREATE TABLE IF NOT EXISTS public.pedidos_filho (
    id TEXT PRIMARY KEY,
    numero_ordem VARCHAR(50) NOT NULL UNIQUE,
    pedido_mae_id TEXT NOT NULL REFERENCES public.pedidos_mae(id) ON DELETE CASCADE,
    pedido_mae_numero VARCHAR(50) NOT NULL,
    cliente_nome VARCHAR(255) NOT NULL,
    cliente_cnpj VARCHAR(20) NOT NULL,
    cliente_ie VARCHAR(30) NOT NULL,
    cliente_uf VARCHAR(2) NOT NULL,
    motorista_nome VARCHAR(150) NOT NULL,
    motorista_cpf VARCHAR(20) NOT NULL,
    placa_veiculo VARCHAR(15) NOT NULL,
    transportadora VARCHAR(150) NOT NULL,
    produto VARCHAR(150) NOT NULL,
    quantidade_programada_ton NUMERIC(10, 2) NOT NULL,
    quantidade_ordem_ton NUMERIC(10, 2) NOT NULL,
    divergencia_ton NUMERIC(10, 2) DEFAULT 0.00,
    status VARCHAR(40) DEFAULT 'PENDENTE_CONFERENCIA' CHECK (
        status IN ('PENDENTE_CONFERENCIA', 'LIBERADO', 'REJEITADO_DIVERGENCIA', 'REJEITADO_FISCAL', 'EM_RESSUBMISSAO')
    ),
    sintegra_status VARCHAR(30) DEFAULT 'NAO_VALIDADO' CHECK (
        sintegra_status IN ('NAO_VALIDADO', 'REGULAR', 'IRREGULAR', 'EM_ANALISE', 'FALHA_CONSULTA')
    ),
    sintegra_detalhes TEXT,
    sintegra_tempo_ms INTEGER,
    motivo_rejeicao TEXT,
    justificativa_ressubmissao TEXT,
    liberado_em TIMESTAMPTZ,
    liberado_por VARCHAR(100),
    historico JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criação da Tabela de Notificações e Avisos em Tela (Simultâneas Logística & Comercial)
CREATE TABLE IF NOT EXISTS public.notificacoes (
    id TEXT PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL CHECK (
        tipo IN ('DIVERGENCIA_PESO', 'SINTEGRA_IRREGULAR', 'RESSUBMISSAO', 'LIBERADO', 'INFO')
    ),
    titulo VARCHAR(255) NOT NULL,
    mensagem TEXT NOT NULL,
    pedido_filho_id TEXT,
    numero_ordem VARCHAR(50),
    destinatario VARCHAR(30) DEFAULT 'TODOS' CHECK (destinatario IN ('TODOS', 'LOGISTICA', 'COMERCIAL')),
    lida BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Índices para Otimização de Consultas Rápidas (< 5s)
CREATE INDEX IF NOT EXISTS idx_pedidos_filho_status ON public.pedidos_filho(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_filho_cnpj ON public.pedidos_filho(cliente_cnpj);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON public.notificacoes(lida);

-- 5. Habilitação de Políticas de Acesso (Row Level Security - RLS)
ALTER TABLE public.pedidos_mae ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_filho ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Políticas públicas para anon key (Frontend React)
CREATE POLICY "Permitir leitura geral pedidos_mae" ON public.pedidos_mae FOR SELECT USING (true);
CREATE POLICY "Permitir insercao/edicao pedidos_mae" ON public.pedidos_mae FOR ALL USING (true);

CREATE POLICY "Permitir leitura geral pedidos_filho" ON public.pedidos_filho FOR SELECT USING (true);
CREATE POLICY "Permitir insercao/edicao pedidos_filho" ON public.pedidos_filho FOR ALL USING (true);

CREATE POLICY "Permitir leitura geral notificacoes" ON public.notificacoes FOR SELECT USING (true);
CREATE POLICY "Permitir insercao/edicao notificacoes" ON public.notificacoes FOR ALL USING (true);
