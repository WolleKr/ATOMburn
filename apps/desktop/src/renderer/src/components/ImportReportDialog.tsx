import type { ImportedDocument } from "../../../domain/import";

export function ImportReportDialog({ imported, onClose }: { imported: ImportedDocument; onClose: () => void }) {
  return <div className="dialog-backdrop" role="presentation"><section className="import-report" role="dialog" aria-modal="true" aria-labelledby="import-report-title">
    <header><div><span className="simulator-dialog__eyebrow">Sanitized local import</span><h2 id="import-report-title">Import report</h2></div><button type="button" onClick={onClose}>Close</button></header>
    <dl><div><dt>Source</dt><dd>{imported.sourceName}</dd></div><div><dt>Format</dt><dd>{imported.format}</dd></div><div><dt>Layers</dt><dd>{imported.layers.length}</dd></div><div><dt>Objects</dt><dd>{imported.objects.length}</dd></div></dl>
    {imported.diagnostics.length ? <ul className="import-diagnostics">{imported.diagnostics.map((diagnostic,index)=><li key={`${diagnostic.code}-${index}`} className={`import-diagnostics--${diagnostic.severity}`}><strong>{diagnostic.code}</strong><span>{diagnostic.message}</span>{diagnostic.count ? <small>{diagnostic.count} occurrence(s)</small> : null}</li>)}</ul> : <p className="import-report__success">No unsupported or unsafe elements were found.</p>}
    <p className="simulator-warning">Imported artwork is editable geometry only. Import never generates or starts a laser job automatically.</p>
  </section></div>;
}
