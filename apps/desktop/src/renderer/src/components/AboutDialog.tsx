import { useEffect, useRef } from "react";
import type { AppInfo } from "../../../shared/contracts";
import { Brand } from "./Brand";
import { getBridge } from "../platform";

const REPOSITORY = "https://github.com/WolleKr/ATOMburn";

export function AboutDialog({ info, onClose }: { info: AppInfo; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="about-dialog" role="dialog" aria-modal="true" aria-labelledby="about-title">
        <div className="about-dialog__header">
          <span className="about-dialog__eyebrow">ABOUT THE WORKSPACE</span>
          <Brand/>
          <span className="about-dialog__signal" aria-hidden="true"><span /></span>
        </div>
        <div className="about-dialog__intro">
          <h2 id="about-title">Precision laser workspace</h2>
          <p>Local tools for designing, aligning, previewing and supervising your ATOMSTACK X30 Pro.</p>
        </div>
        <dl className="about-dialog__details"><div><dt>Version</dt><dd>{info.version}</dd></div><div><dt>Platform</dt><dd>{info.platform} · {info.architecture ?? "unknown"}</dd></div><div><dt>Project owner</dt><dd>WolleKr</dd></div></dl>
        <div className="about-dialog__repository">
          <span className="about-dialog__label">Project repository</span>
          <div className="about-dialog__repository-row">
            <button className="link-button" type="button" onClick={() => void getBridge().openRepository?.()}>{REPOSITORY}</button>
            <button className="about-dialog__copy" type="button" onClick={() => void getBridge().copyRepositoryLink?.()}>Copy link</button>
          </div>
        </div>
        <div className="dialog-actions"><button ref={closeRef} type="button" onClick={onClose}>Close</button></div>
      </section>
    </div>
  );
}
