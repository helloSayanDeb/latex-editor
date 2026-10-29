export const BUILD_RECIPES = [
  { value: 'standard', label: 'Standard', detail: 'Resolve references and run BibTeX or Biber when needed.' },
  { value: 'quick', label: 'Quick preview', detail: 'One TeX pass. Citations and references may remain unresolved.' },
  { value: 'final', label: 'Final document', detail: 'Bibliography plus bounded extra passes for stable references.' },
] as const;
export type BuildRecipe = typeof BUILD_RECIPES[number]['value'];
export function buildRecipe(value: unknown): BuildRecipe {
  if (value === undefined) return 'standard';
  if (!BUILD_RECIPES.some(item => item.value === value)) throw new Error('Unsupported build recipe.');
  return value as BuildRecipe;
}
export async function runBuildRecipe(recipe: BuildRecipe, compile: () => Promise<unknown>, bibliography: () => Promise<boolean>, log: () => string, index: () => Promise<boolean> = async () => false): Promise<number> {
  let passes = 0;
  const pass = async () => { await compile(); passes++; };
  await pass();
  if (recipe === 'quick') return passes;
  const hasBibliography = await bibliography();
  const hasIndex = await index();
  if (hasBibliography || hasIndex) await pass();
  await pass();
  if (recipe === 'final') {
    while (passes < 5 && /Rerun to get cross-references right|Label\(s\) may have changed|Please rerun LaTeX/i.test(log())) await pass();
  }
  return passes;
}
