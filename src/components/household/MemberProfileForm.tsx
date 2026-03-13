import { useState } from 'react'
import {
  useMemberProfiles,
  useCreateMemberProfile,
  useUpdateMemberProfile,
  useDeleteMemberProfile,
} from '../../hooks/useHousehold'
import type { MemberProfile } from '../../types/database'

interface ProfileFormState {
  name: string
  is_child: boolean
  birth_year: string
}

const emptyForm: ProfileFormState = { name: '', is_child: true, birth_year: '' }

export function MemberProfileForm() {
  const { data: profiles, isPending } = useMemberProfiles()
  const createProfile = useCreateMemberProfile()
  const updateProfile = useUpdateMemberProfile()
  const deleteProfile = useDeleteMemberProfile()

  const [form, setForm] = useState<ProfileFormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)

  function startEdit(profile: MemberProfile) {
    setEditingId(profile.id)
    setForm({
      name: profile.name,
      is_child: profile.is_child,
      birth_year: profile.birth_year?.toString() ?? '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const birthYear = form.birth_year ? parseInt(form.birth_year, 10) : null

    if (editingId) {
      updateProfile.mutate(
        {
          id: editingId,
          updates: { name: form.name.trim(), is_child: form.is_child, birth_year: birthYear },
        },
        {
          onSuccess: () => cancelEdit(),
        }
      )
    } else {
      createProfile.mutate(
        { name: form.name.trim(), is_child: form.is_child, birth_year: birthYear },
        {
          onSuccess: () => setForm(emptyForm),
        }
      )
    }
  }

  const mutationError = createProfile.error ?? updateProfile.error

  return (
    <div className="flex flex-col gap-6">
      {/* Existing profiles */}
      {isPending ? (
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-card bg-secondary" />
          ))}
        </div>
      ) : profiles && profiles.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {profiles.map((profile) => (
            <li
              key={profile.id}
              className="flex items-center justify-between rounded-card border border-accent/30 bg-surface px-4 py-3"
            >
              <div>
                <p className="font-semibold text-text">{profile.name}</p>
                <p className="text-xs text-text/50">
                  {profile.is_child ? 'Child' : 'Managed member'}
                  {profile.birth_year ? ` · Born ${profile.birth_year}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(profile)}
                  className="rounded-btn border border-primary/40 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteProfile.mutate(profile.id)}
                  disabled={deleteProfile.isPending}
                  className="rounded-btn border border-red-300 px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text/50">No managed profiles yet.</p>
      )}

      {/* Add / edit form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h4 className="text-sm font-semibold text-text">
          {editingId ? 'Edit profile' : 'Add a child or managed member'}
        </h4>

        <div className="flex flex-col gap-1">
          <label htmlFor="profile-name" className="text-sm font-medium text-text">
            Name
          </label>
          <input
            id="profile-name"
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Sophie"
            required
            className="rounded-btn border border-accent/40 bg-surface px-3 py-2 text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            id="is-child"
            type="checkbox"
            checked={form.is_child}
            onChange={(e) => setForm((f) => ({ ...f, is_child: e.target.checked }))}
            className="h-4 w-4 accent-primary"
          />
          <label htmlFor="is-child" className="text-sm text-text">
            Child profile
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="birth-year" className="text-sm font-medium text-text">
            Birth year <span className="text-text/40">(optional)</span>
          </label>
          <input
            id="birth-year"
            type="number"
            value={form.birth_year}
            onChange={(e) => setForm((f) => ({ ...f, birth_year: e.target.value }))}
            placeholder="e.g. 2018"
            min={1900}
            max={new Date().getFullYear()}
            className="rounded-btn border border-accent/40 bg-surface px-3 py-2 text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {mutationError && (
          <p className="text-sm text-red-500">
            {mutationError instanceof Error
              ? mutationError.message
              : 'Failed to save profile.'}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={createProfile.isPending || updateProfile.isPending || !form.name.trim()}
            className="rounded-btn bg-primary px-4 py-2 font-semibold text-surface transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {editingId
              ? updateProfile.isPending
                ? 'Saving…'
                : 'Save Changes'
              : createProfile.isPending
                ? 'Adding…'
                : 'Add Profile'}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-btn border border-accent/40 px-4 py-2 font-semibold text-text transition-opacity hover:opacity-80"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
