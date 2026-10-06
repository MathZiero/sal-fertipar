import { useSyncExternalStore } from 'react';

export type NivelLog = 'info' | 'warn' | 'error';
export type OrigemLog = 'auth' | 'consulta' | 'ordem' | 'sistema';

export interface EventoLog {
  id: string;
  ts: string;
  nivel: NivelLog;
  origem: OrigemLog;
  mensagem: string;
  usuario?: string;
  duracao_ms?: number;
}

const STORAGE_KEY = 'sal_eventos_v1';
const MAX_EVENTOS = 500;

let eventos: EventoLog[] = carregar();
let snapshot: EventoLog[] = eventos;
const listeners = new Set<() => void>();

function carregar(): EventoLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as EventoLog[]) : [];
  } catch {
    return [];
  }
}

function emitir() {
  snapshot = [...eventos];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(eventos));
  } catch {
    /* armazenamento cheio: ignora */
  }
  listeners.forEach((l) => l());
}

export function registrar(
  nivel: NivelLog,
  origem: OrigemLog,
  mensagem: string,
  extra: { usuario?: string; duracao_ms?: number } = {}
) {
  eventos = [
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ts: new Date().toISOString(),
      nivel,
      origem,
      mensagem,
      ...extra,
    },
    ...eventos,
  ].slice(0, MAX_EVENTOS);
  emitir();
}

export function limparEventos() {
  eventos = [];
  emitir();
}

export function useEventos(): EventoLog[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => snapshot
  );
}

export interface MetricasConsulta {
  total: number;
  sucessos: number;
  falhas: number;
  taxaSucesso: number;
  latenciaMedia: number;
  latenciaP95: number;
  dentroDoLimite: number;
}

/** Métricas das consultas cadastrais registradas nas últimas `horas` horas. */
export function calcularMetricasConsulta(lista: EventoLog[], horas = 24): MetricasConsulta {
  const desde = Date.now() - horas * 3600 * 1000;
  const consultas = lista.filter((e) => e.origem === 'consulta' && e.duracao_ms !== undefined && new Date(e.ts).getTime() >= desde);
  const total = consultas.length;
  const falhas = consultas.filter((e) => e.nivel === 'error').length;
  const duracoes = consultas.map((e) => e.duracao_ms as number).sort((a, b) => a - b);
  const media = total ? duracoes.reduce((a, b) => a + b, 0) / total : 0;
  const p95 = total ? duracoes[Math.min(total - 1, Math.ceil(total * 0.95) - 1)] : 0;
  const dentro = duracoes.filter((d) => d <= 5000).length;
  return {
    total,
    sucessos: total - falhas,
    falhas,
    taxaSucesso: total ? ((total - falhas) / total) * 100 : 100,
    latenciaMedia: Math.round(media),
    latenciaP95: Math.round(p95),
    dentroDoLimite: total ? (dentro / total) * 100 : 100,
  };
}
