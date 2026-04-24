import { useState } from 'react'
import {
  useTemplates,
  useSaveAsTemplate,
  useLoadTemplate,
  useDeleteTemplate,
} from '../../hooks/useMealPlanTemplates'

interface TemplateManagerProps {
  planId: string
}

/**
 * Inline section on PlanPage for saving and loading meal plan templates.
 * Shown below week nav, above the plan grid, when a plan exists.
 */
export function TemplateManager({ planId }: TemplateManagerProps) {
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [confirmTemplateId, setConfirmTemplateId] = useState<string | null>(null)
  const [templateName, setTemplateName] = useState('')

  const { data: templates, isPending: templatesLoading } = useTemplates()
  const saveAsTemplate = useSaveAsTemplate()
  const loadTemplate = useLoadTemplate()
  const deleteTemplate = useDeleteTemplate()

  async function handleSave() {
    if (!templateName.trim()) return
    await saveAsTemplate.mutateAsync({ name: templateName.trim(), planId })
    setTemplateName('')
    setShowSaveModal(false)
  }

  async function handleLoadConfirm() {
    if (!confirmTemplateId) return
    await loadTemplate.mutateAsync({ templateId: confirmTemplateId, planId })
    setConfirmTemplateId(null)
    setShowLoadModal(false)
  }

  async function handleDelete(templateId: string) {
    await deleteTemplate.mutateAsync(templateId)
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <button type="button" onClick={() => setShowSaveModal(true)} className="btn btn-sm">
          Save as template
        </button>
        <button type="button" onClick={() => setShowLoadModal(true)} className="btn btn-sm">
          Load template
        </button>
      </div>

      {/* Save as template modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-[--radius-card] border border-accent/30 bg-surface p-6 shadow-lg">
            <h3 className="text-base font-bold text-primary mb-4">Save as Template</h3>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name"
              className="w-full rounded-[--radius-btn] border border-secondary bg-background px-3 py-2 text-sm text-text placeholder-text/40 focus:border-primary focus:outline-none mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowSaveModal(false); setTemplateName('') }}
                className="rounded-[--radius-btn] px-4 py-2 text-sm text-text/60 hover:text-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!templateName.trim() || saveAsTemplate.isPending}
                className="rounded-[--radius-btn] bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saveAsTemplate.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load template modal */}
      {showLoadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-[--radius-card] border border-accent/30 bg-surface p-6 shadow-lg">
            <h3 className="text-base font-bold text-primary mb-1">Load Template</h3>
            <p className="text-sm text-text/60 mb-4">Select a template to load.</p>

            {confirmTemplateId ? (
              <>
                <p className="text-sm text-text mb-4">
                  This will replace your current plan for all 7 days. Continue?
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setConfirmTemplateId(null)}
                    className="rounded-[--radius-btn] px-4 py-2 text-sm text-text/60 hover:text-text transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleLoadConfirm}
                    disabled={loadTemplate.isPending}
                    className="rounded-[--radius-btn] bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {loadTemplate.isPending ? 'Loading…' : 'Load Template'}
                  </button>
                </div>
              </>
            ) : (
              <>
                {templatesLoading ? (
                  <div className="flex flex-col gap-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-12 animate-pulse rounded-[--radius-btn] bg-secondary" />
                    ))}
                  </div>
                ) : !templates || templates.length === 0 ? (
                  <p className="text-sm text-text/50">No templates saved yet.</p>
                ) : (
                  <ul className="flex flex-col gap-2 mb-4 max-h-60 overflow-y-auto">
                    {templates.map((template) => (
                      <li
                        key={template.id}
                        className="flex items-center justify-between rounded-[--radius-btn] border border-secondary bg-background px-4 py-3"
                      >
                        <div>
                          <p className="font-semibold text-text text-sm">{template.name}</p>
                          <p className="text-xs text-text/50">
                            {new Date(template.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setConfirmTemplateId(template.id)}
                            className="rounded-[--radius-btn] bg-primary px-3 py-1 text-xs font-semibold text-white hover:bg-primary/90 transition-colors"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => handleDelete(template.id)}
                            disabled={deleteTemplate.isPending}
                            className="text-xs text-text/40 hover:text-red-500 transition-colors"
                            aria-label="Delete template"
                          >
                            &times;
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowLoadModal(false)}
                    className="rounded-[--radius-btn] px-4 py-2 text-sm text-text/60 hover:text-text transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
