import { useMemo, useRef, useState } from 'react'
import { Archive, Download, FileUp, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react'
import { Button } from '../components/ui/Button.jsx'
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx'
import { useCommitments } from '../context/CommitmentContext.jsx'
import { todayIso } from '../utils/format.js'
import { applyImport, exportCommitments, isLikelyDuplicate, previewImportCommitments } from '../utils/commitmentStorage.js'
import { createDemoData, DEMO_COMMITMENT_IDS } from '../data/demoCommitments.js'

export function SettingsPage() {
  const { commitments, storageError, replaceCommitments, applyCommitmentImport, loadSampleData, seedDemoData, removeDemoData } = useCommitments()
  const [message, setMessage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [mode, setMode] = useState('merge')
  const [conflictStrategy, setConflictStrategy] = useState('keep_existing')
  const [busy, setBusy] = useState(false)
  const [confirmReplace, setConfirmReplace] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [confirmDemoLoad, setConfirmDemoLoad] = useState(false)
  const [confirmDemoRemove, setConfirmDemoRemove] = useState(false)
  const fileInputRef = useRef(null)
  const actionCount = commitments.reduce((total, record) => total + (record.actions?.length ?? 0), 0)
  const dateCount = commitments.reduce((total, record) => total + (record.importantDates?.length ?? 0), 0)
  const conflicts = useMemo(() => {
    return preview?.valid.filter((record) => commitments.some((current) => current.id === record.id || isLikelyDuplicate(current, record))) ?? []
  }, [commitments, preview])
  const isSampleOnly = commitments.length > 0 && commitments.every((record) => record.source === 'sample')
  const demoCount = commitments.filter((record) => DEMO_COMMITMENT_IDS.includes(record.id)).length

  function handleExport() {
    setMessage(null)
    const result = exportCommitments(commitments)
    if (!result.ok) {
      setMessage({ type: 'error', text: result.error })
      return
    }
    let url
    try {
      const blob = new Blob([result.contents], { type: 'application/json' })
      url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `obligation-lens-backup-${todayIso()}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setMessage({ type: 'success', text: `Backup downloaded with ${commitments.length} commitment${commitments.length === 1 ? '' : 's'}.` })
    } catch {
      setMessage({ type: 'error', text: 'Your backup could not be downloaded in this browser.' })
    } finally {
      if (url) window.setTimeout(() => URL.revokeObjectURL(url), 0)
    }
  }

  async function handleFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    setMessage(null)
    setPreview(null)
    try {
      const contents = await file.text()
      const result = previewImportCommitments(contents)
      if (!result.ok) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setPreview({ ...result, filename: file.name })
        setMode('merge')
        setConflictStrategy('keep_existing')
      }
    } catch {
      setMessage({ type: 'error', text: 'The selected file could not be read.' })
    } finally {
      setBusy(false)
    }
  }

  function applyPreview() {
    if (!preview) return
    const result = applyImport(commitments, preview.valid, { mode, conflictStrategy, relationships: preview.relationships })
    if (!result.ok) {
      setMessage({ type: 'error', text: result.error })
      return
    }
    const saved = mode === 'replace'
      ? replaceCommitments(result.records, preview.relationships)
      : applyCommitmentImport(preview.valid, { mode, conflictStrategy, relationships: preview.relationships })
    if (!saved.ok) {
      setMessage({ type: 'error', text: saved.error })
      return
    }
    setMessage({
      type: 'success',
      text: mode === 'replace'
        ? `Replaced ${result.replaced} existing record${result.replaced === 1 ? '' : 's'} with ${result.added} imported record${result.added === 1 ? '' : 's'}. ${preview.invalid.length} invalid record${preview.invalid.length === 1 ? ' was' : 's were'} excluded.`
        : `Added ${saved.added} record${saved.added === 1 ? '' : 's'}; kept ${saved.skipped} conflicting record${saved.skipped === 1 ? '' : 's'}. ${preview.invalid.length} invalid record${preview.invalid.length === 1 ? ' was' : 's were'} excluded.`,
    })
    setPreview(null)
    setConfirmReplace(false)
  }

  function handleLoadSamples() {
    const result = loadSampleData()
    setMessage(result.ok
      ? { type: 'success', text: 'Sample commitments were loaded.' }
      : { type: 'error', text: result.error })
  }

  return (
    <div className="page-wrap space-y-6">
      <header>
        <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">Local data and backups</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">Manage the commitments saved in this browser, or move them with a JSON backup you control.</p>
      </header>
      {(storageError || message) && <p role={message?.type === 'error' || storageError ? 'alert' : 'status'} className={`rounded-2xl border px-4 py-3 text-sm ${message?.type === 'error' || storageError ? 'border-warn/20 bg-warn-soft text-warn' : 'border-calm/20 bg-calm-soft text-calm'}`}>{message?.text ?? storageError}</p>}

      <section className="surface-card p-5 sm:p-6" aria-labelledby="storage-heading">
        <div className="flex items-start gap-3"><span className="rounded-xl bg-accent-soft p-2 text-accent"><ShieldCheck className="size-5" aria-hidden="true" /></span><div><h3 id="storage-heading" className="text-lg font-semibold text-ink">Storage overview</h3><p className="mt-1 text-sm text-muted">Stored locally in this browser.</p></div></div>
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3"><Count label="Commitments" value={commitments.length} /><Count label="Actions" value={actionCount} /><Count label="Important dates" value={dateCount} /></dl>
        <ul className="mt-5 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted"><li>Data does not automatically sync across devices.</li><li>Clearing this browser’s data or profile may remove these records.</li><li>Browser storage is not a cloud backup; export a file to keep a separate copy.</li><li>Only this browser profile can access these records unless you move a backup.</li></ul>
      </section>

      <section className="surface-card p-5 sm:p-6" aria-labelledby="backup-heading">
        <div className="flex items-start gap-3"><span className="rounded-xl bg-accent-soft p-2 text-accent"><Archive className="size-5" aria-hidden="true" /></span><div><h3 id="backup-heading" className="text-lg font-semibold text-ink">Backup and restore</h3><p className="mt-1 text-sm text-muted">Export a JSON copy or preview one before importing it.</p></div></div>
        <div className="mt-5 flex flex-wrap gap-2"><Button onClick={handleExport} disabled={Boolean(storageError)}><Download className="size-4" aria-hidden="true" />Export all data</Button><Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={busy}><FileUp className="size-4" aria-hidden="true" />{busy ? 'Reading file…' : 'Choose backup file'}</Button><input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleFile} className="sr-only" aria-label="Choose a JSON backup file" /></div>
        {preview && <div className="mt-5 rounded-2xl border border-line bg-surface p-4" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-semibold text-ink">Import preview</h4><p className="mt-1 break-all text-xs text-muted">{preview.filename}{preview.legacy ? ' · legacy list format' : ''}</p></div><Button variant="ghost" className="px-2" onClick={() => setPreview(null)}>Cancel</Button></div>
          <div className="mt-4 grid grid-cols-3 gap-2"><Count label="Valid" value={preview.valid.length} /><Count label="Invalid" value={preview.invalid.length} /><Count label="Possible duplicates" value={conflicts.length} /></div>
          {preview.invalid.length > 0 && <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold text-warn">Review {preview.invalid.length} invalid record{preview.invalid.length === 1 ? '' : 's'}</summary><ul className="mt-2 space-y-2 text-xs text-muted">{preview.invalid.map((item) => <li key={`${item.index}-${item.title}`}><span className="font-semibold">Record {item.index + 1}{item.title ? ` · ${item.title}` : ''}:</span> {item.errors.join(' ')}</li>)}</ul></details>}
          {preview.invalidRelationships?.length > 0 && <p role="alert" className="mt-3 rounded-xl bg-warn-soft p-3 text-sm text-warn">Some dependency links were invalid or cyclic, so none of those links will be restored.</p>}
          {conflicts.length > 0 && <div className="mt-4"><label className="block text-sm font-semibold text-ink" htmlFor="conflict-choice">How to handle possible duplicates</label><select id="conflict-choice" value={conflictStrategy} onChange={(event) => setConflictStrategy(event.target.value)} disabled={mode === 'replace'} className="mt-2 w-full rounded-xl border border-line bg-raised px-3 py-2 text-sm text-ink disabled:opacity-60"><option value="keep_existing">Keep existing record and skip likely duplicates</option><option value="import_new">Import each conflict as a separate copy with new IDs</option></select><p className="mt-1 text-xs text-muted">Likely matches use title, category, merchant, date, and reference. Check the preview and backup before proceeding.</p></div>}
          <fieldset className="mt-4"><legend className="text-sm font-semibold text-ink">Import mode</legend><div className="mt-2 grid gap-2 sm:grid-cols-2"><label className="flex cursor-pointer items-start gap-2 rounded-xl border border-line bg-raised p-3 text-sm"><input type="radio" name="import-mode" value="merge" checked={mode === 'merge'} onChange={() => setMode('merge')} className="mt-0.5 accent-accent" /><span><strong>Merge</strong><span className="block text-xs text-muted">Keep current data and add selected imported records.</span></span></label><label className="flex cursor-pointer items-start gap-2 rounded-xl border border-line bg-raised p-3 text-sm"><input type="radio" name="import-mode" value="replace" checked={mode === 'replace'} onChange={() => setMode('replace')} className="mt-0.5 accent-accent" /><span><strong>Replace</strong><span className="block text-xs text-muted">Replace the current collection with valid imported records.</span></span></label></div></fieldset>
          <p className="mt-3 text-xs leading-relaxed text-muted">Invalid records are excluded and listed above. No changes are made until you apply this preview.</p>
          <Button className="mt-4" disabled={preview.valid.length === 0} onClick={() => mode === 'replace' ? setConfirmReplace(true) : applyPreview()}>{mode === 'replace' ? 'Review replacement' : 'Apply merge'}</Button>
        </div>}
      </section>

      <section className="surface-card p-5 sm:p-6" aria-labelledby="samples-heading">
        <h3 id="samples-heading" className="text-lg font-semibold text-ink">Sample data</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">Sample records are labeled as samples and remain separate from user-created records. {isSampleOnly ? 'Your current collection contains sample records only.' : 'Sample records can only be loaded when the collection is empty.'}</p>
        <Button variant="secondary" className="mt-4" onClick={handleLoadSamples} disabled={commitments.length > 0 || Boolean(storageError)}><RotateCcw className="size-4" aria-hidden="true" />Load sample commitments</Button>
      </section>

      <section className="surface-card p-5 sm:p-6" aria-labelledby="demo-heading">
        <h3 id="demo-heading" className="text-lg font-semibold text-ink">End-to-end demo dataset</h3>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">Adds 10 fictional Indian-context commitments, 22 actions, and 8 dependency links using today-relative dates. Existing commitments and unrelated local data are preserved. {demoCount ? `${demoCount} of 10 demo records are currently present.` : 'No demo records are currently loaded.'}</p>
        <div className="mt-4 flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setConfirmDemoLoad(true)} disabled={Boolean(storageError) || demoCount === 10}>{demoCount === 10 ? 'Demo data already loaded' : 'Load Demo Data'}</Button>{demoCount > 0 && <Button variant="danger" onClick={() => setConfirmDemoRemove(true)} disabled={Boolean(storageError)}>Remove demo data</Button>}</div>
        {demoCount === 10 && <p className="mt-2 text-xs text-muted">Loading again will not duplicate demo records.</p>}
      </section>

      <section className="rounded-2xl border border-warn/30 bg-warn-soft/40 p-5 sm:p-6" aria-labelledby="reset-heading">
        <div className="flex items-start gap-3"><span className="rounded-xl bg-warn-soft p-2 text-warn"><Trash2 className="size-5" aria-hidden="true" /></span><div><h3 id="reset-heading" className="text-lg font-semibold text-ink">Delete all local commitments</h3><p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">Remove the {commitments.length} commitment{commitments.length === 1 ? '' : 's'} stored by Obligation Lens in this browser. Other browser data is not affected.</p></div></div>
        <Button variant="danger" className="mt-4" onClick={() => setResetOpen(true)} disabled={commitments.length === 0 && !storageError}>Delete all local commitments</Button>
      </section>

      <ConfirmDialog open={resetOpen} title="Delete all local commitments?" body={`This permanently removes ${commitments.length} readable commitment${commitments.length === 1 ? '' : 's'} from Obligation Lens in this browser${storageError ? ', and replaces any unreadable data under its storage key' : ''}. Other localStorage entries remain untouched.`} confirmLabel="Delete all" danger onConfirm={confirmResetData} onCancel={() => setResetOpen(false)} />
      <ConfirmDialog open={confirmReplace} title="Replace current records?" body={`This replaces all ${commitments.length} current commitment${commitments.length === 1 ? '' : 's'} with ${preview?.valid.length ?? 0} valid record${preview?.valid.length === 1 ? '' : 's'} from the selected backup. Invalid records will be excluded as shown in the preview.`} confirmLabel="Replace records" danger onConfirm={applyPreview} onCancel={() => setConfirmReplace(false)} />
      <ConfirmDialog open={confirmDemoLoad} title="Add fictional demo data?" body="This adds 10 labeled fictional demo commitments, 22 actions, and 8 dependency links. It will not replace existing records. Dates are calculated from your local date when you confirm. Existing user records are left untouched." confirmLabel="Add demo data" onConfirm={confirmLoadDemoData} onCancel={() => setConfirmDemoLoad(false)} />
      <ConfirmDialog open={confirmDemoRemove} title="Remove demo records only?" body={`This removes only the ${demoCount} records with the stable IDs created by the Obligation Lens demo seeder, plus dependency links whose endpoints are removed. Other commitments and localStorage data remain untouched.`} confirmLabel="Remove demo data" danger onConfirm={confirmRemoveDemoData} onCancel={() => setConfirmDemoRemove(false)} />
    </div>
  )

  function confirmResetData() {
    const result = replaceCommitments([])
    if (result.ok) setMessage({ type: 'success', text: 'All local commitments were deleted.' })
    else setMessage({ type: 'error', text: result.error })
    setResetOpen(false)
  }

  function confirmLoadDemoData() {
    const demo = createDemoData(todayIso())
    const result = seedDemoData(demo.commitments, demo.relationships)
    if (!result.ok) setMessage({ type: 'error', text: result.error })
    else if (result.alreadyLoaded) setMessage({ type: 'success', text: 'The demo dataset is already present; no duplicate records were added.' })
    else setMessage({ type: 'success', text: `Added ${result.added} demo commitments and ${result.addedRelationships} demo dependencies. Existing records were preserved.` })
    setConfirmDemoLoad(false)
  }

  function confirmRemoveDemoData() {
    const result = removeDemoData(DEMO_COMMITMENT_IDS)
    if (!result.ok) setMessage({ type: 'error', text: result.error })
    else setMessage({ type: 'success', text: `Removed ${result.removed} demo commitment${result.removed === 1 ? '' : 's'} and relationships with removed endpoints.` })
    setConfirmDemoRemove(false)
  }
}

function Count({ label, value }) {
  return <div className="rounded-xl border border-line bg-raised p-3"><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 text-xl font-semibold text-ink">{value}</dd></div>
}
