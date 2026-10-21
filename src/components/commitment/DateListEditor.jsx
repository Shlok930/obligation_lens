import { Plus, Trash2 } from 'lucide-react'
import { DATE_TYPES, SUGGESTED_DATE_TYPES } from '../../data/catalog.js'
import { emptyDateRow } from '../../utils/commitmentModel.js'
import { Button } from '../ui/Button.jsx'
import { Field, SelectInput, TextInput } from '../ui/Field.jsx'

export function DateListEditor({
  rows,
  category,
  errors = {},
  warnings = {},
  onChange,
}) {
  const suggested = SUGGESTED_DATE_TYPES[category] ?? ['custom']
  const orderedTypes = [
    ...DATE_TYPES.filter((item) => suggested.includes(item.value)),
    ...DATE_TYPES.filter((item) => !suggested.includes(item.value)),
  ]

  function updateRow(index, patch) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function removeRow(index) {
    onChange(rows.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <p className="text-sm text-muted">
          No dates added. Skip this section if none apply yet.
        </p>
      ) : (
        rows.map((row, index) => (
          <div
            key={row.key}
            className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-12"
          >
            <div className="sm:col-span-4">
              <Field
                id={`${row.key}-type`}
                label="Date type"
                error={errors[index]?.type}
              >
                <SelectInput
                  value={row.type}
                  onChange={(event) => updateRow(index, { type: event.target.value })}
                >
                  {orderedTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>
            <div className="sm:col-span-3">
              <Field
                id={`${row.key}-date`}
                label="Date"
                error={errors[index]?.date}
                warning={warnings[index]?.date}
              >
                <TextInput
                  type="date"
                  value={row.date}
                  onChange={(event) => updateRow(index, { date: event.target.value })}
                />
              </Field>
            </div>
            <div className="sm:col-span-4">
              <Field id={`${row.key}-note`} label="Short explanation">
                <TextInput
                  value={row.note}
                  onChange={(event) => updateRow(index, { note: event.target.value })}
                  placeholder="Why this date matters"
                />
              </Field>
            </div>
            <div className="flex items-end sm:col-span-1">
              <Button
                variant="ghost"
                className="w-full px-2"
                onClick={() => removeRow(index)}
                aria-label={`Remove date ${index + 1}`}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        ))
      )}
      <Button variant="secondary" onClick={() => onChange([...rows, emptyDateRow()])}>
        <Plus className="size-4" aria-hidden="true" />
        Add a date
      </Button>
    </div>
  )
}
