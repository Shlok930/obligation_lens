import { useEffect, useId, useRef, useState } from 'react'
import { CATEGORIES, CHANNELS, CURRENCIES, STATUSES } from '../../data/catalog.js'
import {
  buildCommitmentRecord,
  emptyCommitmentForm,
  formFromCommitment,
  validateCommitmentForm,
} from '../../utils/commitmentModel.js'
import { Button } from '../ui/Button.jsx'
import { Field, SelectInput, TextArea, TextInput } from '../ui/Field.jsx'
import { FormSection } from '../ui/FormSection.jsx'
import { ActionListEditor } from './ActionListEditor.jsx'
import { DateListEditor } from './DateListEditor.jsx'

export function CommitmentForm({
  existing,
  onCancel,
  onSave,
}) {
  const formId = useId()
  const [form, setForm] = useState(() =>
    existing ? formFromCommitment(existing) : emptyCommitmentForm(),
  )
  const [errors, setErrors] = useState({})
  const [warnings, setWarnings] = useState({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [externalChange, setExternalChange] = useState(false)
  const editedRef = useRef(false)
  const submitLock = useRef(false)
  const baseUpdatedAtRef = useRef(existing?.updatedAt)

  useEffect(() => {
    if (editedRef.current) {
      setExternalChange(true)
      return
    }
    setForm(existing ? formFromCommitment(existing) : emptyCommitmentForm())
    baseUpdatedAtRef.current = existing?.updatedAt
    setErrors({})
    setWarnings({})
    setSubmitError(null)
    setExternalChange(false)
  }, [existing])

  function patch(values) {
    editedRef.current = true
    setForm((current) => ({ ...current, ...values }))
  }

  function patchFinancial(values) {
    editedRef.current = true
    setForm((current) => ({
      ...current,
      financialExposure: { ...current.financialExposure, ...values },
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (saving || submitLock.current) return
    const result = validateCommitmentForm(form)
    setErrors(result.errors)
    setWarnings(result.warnings)
    if (!result.isValid) {
      setSubmitError('Please correct the highlighted fields. Your entries are still here.')
      return
    }
    submitLock.current = true
    setSaving(true)
    setSubmitError(null)
    const record = buildCommitmentRecord(form, { existing })
    let saved
    try {
      saved = await onSave(record, existing ? baseUpdatedAtRef.current : undefined)
    } catch {
      saved = { ok: false, error: 'The commitment could not be saved. Your entries are still here.' }
    }
    if (!saved?.ok) {
      setSubmitError(saved?.error ?? 'The commitment could not be saved.')
      submitLock.current = false
      setSaving(false)
      return
    }
    setSaving(false)
  }

  const subscriptionHint =
    form.category === 'subscription_trial'
      ? 'Renewal and trial dates are especially useful for this category — add them below if you have them.'
      : 'Add only dates that actually apply. Nothing is invented for you.'

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      <FormSection
        eyebrow="Section A"
        title="Basic information"
        description="What did you commit to, and when?"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field
              id={`${formId}-title`}
              label="Commitment title"
              required
              error={errors.title}
            >
              <TextInput
                value={form.title}
                onChange={(event) => patch({ title: event.target.value })}
                placeholder="Laptop purchase"
                autoComplete="off"
              />
            </Field>
          </div>
          <Field id={`${formId}-category`} label="Category" required>
            <SelectInput
              value={form.category}
              onChange={(event) => patch({ category: event.target.value })}
            >
              {CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field id={`${formId}-status`} label="Status">
            <SelectInput
              value={form.status}
              onChange={(event) => patch({ status: event.target.value })}
            >
              {STATUSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field
            id={`${formId}-amount`}
            label="Amount paid or committed"
            required
            hint="Use 0 if this commitment does not involve money."
            error={errors.amount}
          >
            <TextInput
              inputMode="decimal"
              value={form.amount}
              onChange={(event) => patch({ amount: event.target.value })}
              placeholder="0"
            />
          </Field>
          <Field
            id={`${formId}-currency`}
            label="Currency"
            required
            error={errors.currency}
          >
            <SelectInput
              value={form.currency}
              onChange={(event) => patch({ currency: event.target.value })}
            >
              {CURRENCIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field
            id={`${formId}-date`}
            label="Purchase or commitment date"
            required
            error={errors.commitmentDate}
          >
            <TextInput
              type="date"
              value={form.commitmentDate}
              onChange={(event) => patch({ commitmentDate: event.target.value })}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        eyebrow="Section B"
        title="Merchant or provider"
        description="Optional details that help you find the original purchase later."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${formId}-merchant`} label="Merchant, company, or service">
            <TextInput
              value={form.merchant}
              onChange={(event) => patch({ merchant: event.target.value })}
              placeholder="Store or provider name"
            />
          </Field>
          <Field id={`${formId}-reference`} label="Order, booking, or subscription ID">
            <TextInput
              value={form.referenceId}
              onChange={(event) => patch({ referenceId: event.target.value })}
              placeholder="ORDER-1001"
              autoComplete="off"
            />
          </Field>
          <Field id={`${formId}-channel`} label="Purchase channel">
            <SelectInput
              value={form.channel}
              onChange={(event) => patch({ channel: event.target.value })}
            >
              {CHANNELS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <div className="sm:col-span-2">
            <Field id={`${formId}-notes`} label="Short description">
              <TextArea
                value={form.description}
                onChange={(event) => patch({ description: event.target.value })}
                placeholder="Anything you want to remember about this commitment"
              />
            </Field>
          </div>
        </div>
      </FormSection>

      <FormSection
        eyebrow="Section C"
        title="Important dates"
        description={subscriptionHint}
      >
        <DateListEditor
          rows={form.importantDates}
          category={form.category}
          errors={errors.importantDates}
          warnings={warnings.importantDates}
          onChange={(importantDates) => patch({ importantDates })}
        />
      </FormSection>

      <FormSection
        eyebrow="Section D"
        title="Financial exposure"
        description="Store each amount separately. These fields are not added together, because the same payment can appear more than once."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id={`${formId}-refundable`}
            label="Refundable amount"
            error={errors.financialExposure?.refundableAmount}
          >
            <TextInput
              inputMode="decimal"
              value={form.financialExposure.refundableAmount}
              onChange={(event) =>
                patchFinancial({ refundableAmount: event.target.value })
              }
              placeholder="Optional"
            />
          </Field>
          <Field
            id={`${formId}-deposit`}
            label="Deposit amount"
            error={errors.financialExposure?.depositAmount}
          >
            <TextInput
              inputMode="decimal"
              value={form.financialExposure.depositAmount}
              onChange={(event) => patchFinancial({ depositAmount: event.target.value })}
              placeholder="Optional"
            />
          </Field>
          <Field
            id={`${formId}-expected-refund`}
            label="Expected refund amount"
            error={errors.financialExposure?.expectedRefundAmount}
          >
            <TextInput
              inputMode="decimal"
              value={form.financialExposure.expectedRefundAmount}
              onChange={(event) =>
                patchFinancial({ expectedRefundAmount: event.target.value })
              }
              placeholder="Optional"
            />
          </Field>
          <Field
            id={`${formId}-charge`}
            label="Potential cancellation or renewal charge"
            error={errors.financialExposure?.potentialCharge}
          >
            <TextInput
              inputMode="decimal"
              value={form.financialExposure.potentialCharge}
              onChange={(event) =>
                patchFinancial({ potentialCharge: event.target.value })
              }
              placeholder="Optional"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field id={`${formId}-finance-notes`} label="Notes on financial exposure">
              <TextArea
                value={form.financialExposure.notes}
                onChange={(event) => patchFinancial({ notes: event.target.value })}
                placeholder="What could be lost, recovered, or charged later"
              />
            </Field>
          </div>
        </div>
      </FormSection>

      <FormSection
        eyebrow="Section E"
        title="Initial actions"
        description="Optional steps to take. Nothing is scheduled or notified in this stage."
      >
        <ActionListEditor
          rows={form.actions}
          errors={errors.actions}
          onChange={(actions) => patch({ actions })}
        />
      </FormSection>

      {externalChange && existing ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-warn/20 bg-warn-soft px-4 py-3 text-sm text-warn sm:flex-row sm:items-center sm:justify-between" role="status">
          <p>This commitment changed in another tab. Your unsaved edits are preserved; reload the latest version before continuing.</p>
          <Button variant="secondary" className="shrink-0" onClick={() => { editedRef.current = false; baseUpdatedAtRef.current = existing.updatedAt; setForm(formFromCommitment(existing)); setErrors({}); setWarnings({}); setSubmitError(null); setExternalChange(false) }}>Reload latest</Button>
        </div>
      ) : null}

      {submitError ? (
        <p className="rounded-2xl border border-warn/20 bg-warn-soft px-4 py-3 text-sm text-warn" role="alert">
          {submitError}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : existing ? 'Save changes' : 'Save commitment'}
        </Button>
      </div>
    </form>
  )
}
