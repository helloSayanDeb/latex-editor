// Migrate recognized preferences by schema suffix on this app's origin.
// Keep existing values and leave the previous entry available as a rollback copy.
export function readPreference(key: string): string | null {
  const current = localStorage.getItem(key);
  if (current !== null) return current;
  const suffix = key.slice('lemmata'.length);
  if (!['_ai_profiles', '_ai_config', '_assistant_width', '_mobile_continue', '-spelling-ignored'].includes(suffix)) return null;
  const candidates = Object.keys(localStorage).filter(name => name !== key && name.endsWith(suffix));
  if (candidates.length !== 1) return null;
  const saved = localStorage.getItem(candidates[0]);
  if (saved !== null) localStorage.setItem(key, saved);
  return saved;
}
