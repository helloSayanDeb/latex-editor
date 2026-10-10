import { EditorState, StateEffect, StateField } from '@codemirror/state';
import { Decoration, EditorView, WidgetType, keymap } from '@codemirror/view';

export type InlineReview = { from: number; to: number; code: string; accept: () => void; reject: () => void };
export const setAIReview = StateEffect.define<InlineReview | null>();

class ReviewWidget extends WidgetType {
  private observer?: ResizeObserver;
  constructor(readonly review: InlineReview) { super(); }
  eq(other: ReviewWidget) { return other.review === this.review; }
  toDOM(view: EditorView) {
    const panel = document.createElement('div');
    panel.className = 'cm-ai-review';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Proposed TeX Sage edit');
    const code = document.createElement('pre');
    code.className = 'cm-ai-proposed-code';
    code.textContent = this.review.code || '(Delete selected code)';
    panel.appendChild(code);
    const actions = document.createElement('div');
    actions.className = 'cm-ai-review-actions';
    const label = document.createElement('span');
    label.textContent = 'TeX Sage · proposed change';
    actions.appendChild(label);
    for (const [text, action] of [['Accept', this.review.accept], ['Reject', this.review.reject]] as const) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = text;
      button.className = text === 'Accept' ? 'cm-ai-accept' : 'cm-ai-reject';
      button.addEventListener('mousedown', event => event.preventDefault());
      button.addEventListener('click', event => { event.preventDefault(); action(); });
      actions.appendChild(button);
    }
    panel.appendChild(actions);
    const resize = () => {
      const gutters = view.scrollDOM.querySelector('.cm-gutters')?.getBoundingClientRect().width || 0;
      panel.style.width = `${Math.max(180, view.scrollDOM.clientWidth - gutters - 16)}px`;
    };
    resize();
    this.observer = new ResizeObserver(resize);
    this.observer.observe(view.scrollDOM);
    return panel;
  }
  destroy() { this.observer?.disconnect(); }
  ignoreEvent() { return true; }
}

export const aiReviewField = StateField.define<InlineReview | null>({
  create: () => null,
  update(review, transaction) {
    for (const effect of transaction.effects) if (effect.is(setAIReview)) review = effect.value;
    return review;
  },
  provide: field => EditorView.decorations.from(field, review => {
    if (!review) return Decoration.none;
    const decorations = [];
    if (review.to > review.from) decorations.push(Decoration.mark({ class: 'cm-ai-original-code' }).range(review.from, review.to));
    decorations.push(Decoration.widget({ widget: new ReviewWidget(review), block: true, side: 1 }).range(review.to));
    return Decoration.set(decorations, true);
  }),
});

export const aiReviewKeys = keymap.of([
  { key: 'Escape', run: view => { const review = view.state.field(aiReviewField); if (!review) return false; review.reject(); return true; } },
]);

// Preview is not a document change: typing/undo cannot invalidate its captured offsets.
export const protectAIReview = EditorState.transactionFilter.of(transaction =>
  transaction.startState.field(aiReviewField, false) && transaction.docChanged && !transaction.effects.some(effect => effect.is(setAIReview) && effect.value === null) ? [] : transaction
);
