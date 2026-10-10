'use client';
import { useEffect, useRef, useState } from 'react';
type Request = { title: string; message: string; input?: boolean; confirmLabel?: string };
export function useAppDialog() {
  const [request, setRequest] = useState<Request | null>(null);
  const resolve = useRef<((value: string | null) => void) | null>(null);
  const ask = (next: Request) => new Promise<string | null>(done => {
    resolve.current?.(null); resolve.current = done; setRequest(next);
  });
  const finish = (value: string | null) => { resolve.current?.(value); resolve.current = null; setRequest(null); };
  return { ask, dialog: request ? <AppDialog request={request} onFinish={finish} /> : null };
}
function AppDialog({ request, onFinish }: { request: Request; onFinish: (value: string | null) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className="app-dialog" aria-labelledby="app-dialog-title" onCancel={event => { event.preventDefault(); onFinish(null); }}>
    <form onSubmit={event => { event.preventDefault(); const value = new FormData(event.currentTarget).get('value'); onFinish(request.input ? String(value || '').trim() : 'confirmed'); }}>
      <h2 id="app-dialog-title">{request.title}</h2><p>{request.message}</p>
      {request.input && <label>Project name<input className="input-dark" name="value" autoFocus required maxLength={100} /></label>}
      <div className="app-dialog-actions"><button type="button" className="btn-secondary" onClick={() => onFinish(null)}>Cancel</button><button type="submit" className="btn-primary">{request.confirmLabel || 'Continue'}</button></div>
    </form>
  </dialog>;
}
