import { Plus, Trash2 } from 'lucide-react'
import { emptyActionRow } from '../../utils/commitmentModel.js'
import { Button } from '../ui/Button.jsx'
import { Field, TextInput } from '../ui/Field.jsx'

export function ActionListEditor({ rows, errors = {}, onChange }) {
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
          No actions yet. Add steps you need to take, or leave this empty.
        </p>
      ) : (
        rows.map((row, index) => (
          <div
            key={row.key}
            className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-12"
          >
            <div className="sm:col-span-6">
              <Field
                id={`${row.key}-title`}
                label="Action"
                error={errors[index]?.title}
              >
                <TextInput
                  value={row.title}
                  onChange={(event) => updateRow(index, { title: event.target.value })}
                  placeholder="Save the booking confirmation"
                />
              </Field>
            </div>
            <div className="sm:col-span-3">
              <Field
                id={`${row.key}-due`}
                label="Due date"
                error={errors[index]?.dueDate}
              >
                <TextInput
                  type="date"
                  value={row.dueDate}
                  onChange={(event) => updateRow(index, { dueDate: event.target.value })}
                />
              </Field>
            </div>
            <div className="flex items-end justify-between gap-2 sm:col-span-3">
              <label className="flex items-center gap-2 pb-2 text-sm text-ink">
                <input
                  type="checkbox"
                  className="size-4 accent-accent"
                  checked={row.completed}
                  onChange={(event) =>
                    updateRow(index, { completed: event.target.checked })
                  }
                />
                Done
              </label>
              <Button
                variant="ghost"
                className="px-2"
                onClick={() => removeRow(index)}
                aria-label={`Remove action ${index + 1}`}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        ))
      )}
      <Button variant="secondary" onClick={() => onChange([...rows, emptyActionRow()])}>
        <Plus className="size-4" aria-hidden="true" />
        Add an action
      </Button>
    </div>
  )
}
