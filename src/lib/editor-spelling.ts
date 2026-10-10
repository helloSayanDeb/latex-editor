import { StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view';
export type SpellingIssue = { from: number; to: number; word: string };
export const setSpelling = StateEffect.define<SpellingIssue[]>();
export const spellingField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, transaction) {
    if (transaction.docChanged) value = Decoration.none;
    for (const effect of transaction.effects) if (effect.is(setSpelling)) {
      value = Decoration.set(effect.value.map(issue => Decoration.mark({ class: 'cm-spelling', attributes: { title: `Check spelling: ${issue.word}` } }).range(issue.from, issue.to)), true);
    }
    return value;
  },
  provide: field => EditorView.decorations.from(field),
});
