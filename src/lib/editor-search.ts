import { StateEffect, StateField } from '@codemirror/state';
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view';
export const setFindHighlights = StateEffect.define<{ ranges: { from:number; to:number }[]; active:number }>();
export const findHighlights = StateField.define<DecorationSet>({
  create:()=>Decoration.none,
  update(value,transaction){
    value=value.map(transaction.changes);
    for(const effect of transaction.effects)if(effect.is(setFindHighlights)){
      value=Decoration.set(effect.value.ranges.flatMap((range,index)=>range.from>=0&&range.to>range.from&&range.to<=transaction.state.doc.length?[Decoration.mark({class:index===effect.value.active?'cm-find-match cm-find-current':'cm-find-match'}).range(range.from,range.to)]:[]),true);
    }
    return value;
  },
  provide:field=>EditorView.decorations.from(field),
});
