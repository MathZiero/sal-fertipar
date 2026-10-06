import { useEffect, useState } from 'react';
import { dataService } from './dataService';

/** Mantém a interface sincronizada com o armazenamento de dados. */
export function useDados() {
  const ler = () => ({
    contratos: dataService.getPedidosMae(),
    ordens: dataService.getPedidosFilho(),
    notificacoes: dataService.getNotificacoes(),
    indicadores: dataService.obterIndicadores(),
  });
  const [dados, setDados] = useState(ler);

  useEffect(() => dataService.subscribe(() => setDados(ler())), []);

  return dados;
}
