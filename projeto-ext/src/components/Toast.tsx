import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

type TomToast = 'ok' | 'warn' | 'err';
interface ToastItem {
  id: number;
  tom: TomToast;
  texto: string;
}

const ToastContext = createContext<(tom: TomToast, texto: string) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ToastItem[]>([]);

  const push = useCallback((tom: TomToast, texto: string) => {
    const id = Date.now() + Math.random();
    setItens((prev) => [...prev, { id, tom, texto }]);
    setTimeout(() => setItens((prev) => prev.filter((i) => i.id !== id)), 4500);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {itens.map((i) => (
          <div key={i.id} className={`toast ${i.tom}`}>
            {i.tom === 'ok' ? <CheckCircle2 size={18} /> : i.tom === 'warn' ? <AlertTriangle size={18} /> : <XCircle size={18} />}
            <span>{i.texto}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext);
