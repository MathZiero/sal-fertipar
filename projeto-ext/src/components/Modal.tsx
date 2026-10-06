import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  titulo: string;
  onClose: () => void;
  children: ReactNode;
  rodape: ReactNode;
  onSubmit?: () => void;
}

export function Modal({ titulo, onClose, children, rodape, onSubmit }: Props) {
  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="modal-wrap">
        <form
          className="modal"
          role="dialog"
          aria-label={titulo}
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit?.();
          }}
        >
          <header className="modal-head">
            <h2>{titulo}</h2>
            <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Fechar">
              <X size={18} />
            </button>
          </header>
          <div className="modal-body">{children}</div>
          <footer className="modal-foot">{rodape}</footer>
        </form>
      </div>
    </>
  );
}
