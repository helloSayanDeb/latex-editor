'use client';

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, StateField, StateEffect, Annotation, Prec, Compartment } from '@codemirror/state';
import { findHighlights } from '@/lib/editor-search';
import { spellingField } from '@/lib/editor-spelling';
import { formatLatex } from '@/lib/latex-format';
import { aiReviewField, aiReviewKeys, protectAIReview, setAIReview, type InlineReview } from '@/lib/editor-ai-review';
import { keymap, Decoration, DecorationSet } from '@codemirror/view';
import { indentWithTab, isolateHistory } from '@codemirror/commands';
import { tags } from '@lezer/highlight';
import { HighlightStyle, syntaxHighlighting, StreamLanguage } from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { oneDark } from '@codemirror/theme-one-dark';
import { autocompletion, completeFromList, snippet, type CompletionContext } from '@codemirror/autocomplete';
import { buildProjectIndex, referenceContext, type ProjectIndex } from '@/lib/project-index';

const externalUpdate = Annotation.define<boolean>();

// Autocompletion snippets for common LaTeX structures
const latexCompletions = [
  { label: '\\begin', detail: 'Environment block', apply: snippet('\\begin{${env}}\n\t${}\n\\end{${env}}') },
  { label: '\\equation', detail: 'Display equation', apply: snippet('\\begin{equation}\n\t${}\n\\end{equation}') },
  { label: '\\align', detail: 'Aligned equations', apply: snippet('\\begin{align}\n\t${}\n\\end{align}') },
  { label: '\\figure', detail: 'Figure environment', apply: snippet('\\begin{figure}[h]\n\t\\centering\n\t\\includegraphics[width=0.8\\linewidth]{${filename}}\n\t\\caption{${caption}}\n\t\\label{fig:${label}}\n\\end{figure}') },
  { label: '\\table', detail: 'Table environment', apply: snippet('\\begin{table}[h]\n\t\\centering\n\t\\begin{tabular}{${cols}}\n\t\t${}\n\t\\end{tabular}\n\t\\caption{${caption}}\n\t\\label{tab:${label}}\n\\end{table}') },
  { label: '\\cite', detail: 'Citation reference', apply: snippet('\\cite{${key}}') },
  { label: '\\ref', detail: 'Cross-reference', apply: snippet('\\ref{${label}}') },
  { label: '\\section', detail: 'Section heading', apply: snippet('\\section{${title}}') },
  { label: '\\subsection', detail: 'Subsection heading', apply: snippet('\\subsection{${title}}') },
  { label: '\\textbf', detail: 'Bold text', apply: snippet('\\textbf{${text}}') },
  { label: '\\textit', detail: 'Italic text', apply: snippet('\\textit{${text}}') },
  { label: '\\frac', detail: 'Fraction', apply: snippet('\\frac{${num}}{${den}}') },
  { label: '\\sum', detail: 'Summation', apply: snippet('\\sum_{${i=1}}^{${n}} ${}') },
  { label: '\\int', detail: 'Definite integral', apply: snippet('\\int_{${a}}^{${b}} ${} \\, d${x}') },
  { label: '\\circuitikz', detail: 'CircuiTikZ diagram', apply: snippet('\\begin{circuitikz}\n\t\\draw (0,0) to[${element}] (2,0);\n\\end{circuitikz}') },
];

// State effects for Diff and Line Flash
export const setDiffEffect = StateEffect.define<{ from: number; to: number; isDiff: boolean } | null>();
export const flashLineEffect = StateEffect.define<number | null>();

const diffField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(diffs, tr) {
    diffs = diffs.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setDiffEffect)) {
        if (!e.value) {
          diffs = Decoration.none;
        } else {
          const deco = Decoration.mark({ class: 'cm-diff-added' });
          diffs = Decoration.set([deco.range(e.value.from, e.value.to)]);
        }
      }
    }
    return diffs;
  },
  provide: f => EditorView.decorations.from(f),
});

const flashField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(lines, tr) {
    lines = lines.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(flashLineEffect)) {
        if (e.value === null) {
          lines = Decoration.none;
        } else {
          const linePos = e.value;
          const deco = Decoration.line({ class: 'flash-line-highlight' });
          lines = Decoration.set([deco.range(linePos)]);
        }
      }
    }
    return lines;
  },
  provide: f => EditorView.decorations.from(f),
});

export interface CodeEditorHandle {
  getValue: () => string;
  setValue: (value: string) => void;
  insertAtCursor: (text: string) => void;
  getSelection: () => { text: string; from: number; to: number };
  replaceSelection: (text: string) => void;
  jumpToLine: (line: number, col?: number) => void;
  focus: () => void;
  showDiff: (from: number, to: number) => void;
  clearDiff: () => void;
  getEditorView: () => EditorView | null;
  formatCode: () => boolean;
  previewAIEdit: (review: InlineReview | null) => void;
}

interface CodeEditorProps {
  wordWrap?: boolean;
  readOnly?: boolean;
  initialValue?: string;
  onChange?: (value: string) => void;
  onCursorChange?: (line: number, col: number) => void;
  onSelectionChange?: (text: string) => void;
  onCompileShortcut?: () => void;
  onFindShortcut?: () => void;
  onFormatShortcut?: () => void;
  className?: string;
  projectFiles?: Record<string, string>;
  onReady?: () => void;
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  (
    {
      initialValue = '',
      wordWrap = true,
      readOnly = false,
      onChange,
      onCursorChange,
      onSelectionChange,
      onCompileShortcut,
      onFindShortcut,
      onFormatShortcut,
      className = '',
      projectFiles = {},
      onReady,
    },
    ref
  ) => {
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const readOnlyConfig = useRef(new Compartment());
    const wrapConfig = useRef(new Compartment());
    useEffect(() => {
      viewRef.current?.dispatch({ effects: wrapConfig.current.reconfigure(wordWrap ? EditorView.lineWrapping : []) });
    }, [wordWrap]);
    const index = useRef<ProjectIndex>({ citations: [], labels: [] });
    useEffect(() => { index.current = buildProjectIndex(projectFiles); }, [projectFiles]);
    const readyCallback = useRef(onReady);
    useEffect(() => { readyCallback.current = onReady; }, [onReady]);
    useEffect(() => {
      viewRef.current?.dispatch({ effects: readOnlyConfig.current.reconfigure(EditorState.readOnly.of(readOnly)) });
    }, [readOnly]);

    const callbacks = useRef({ onChange, onCursorChange, onSelectionChange, onCompileShortcut, onFindShortcut, onFormatShortcut });
    useEffect(() => { callbacks.current = { onChange, onCursorChange, onSelectionChange, onCompileShortcut, onFindShortcut, onFormatShortcut }; });
    useEffect(() => {
      const view = viewRef.current;
      if (view && view.state.doc.toString() !== initialValue) {
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: initialValue }, annotations: externalUpdate.of(true) });
      }
    }, [initialValue]);

    // Imperative methods exposed to parent
    useImperativeHandle(ref, () => ({
      formatCode: () => {
        const view = viewRef.current;
        if (!view || view.state.readOnly) return false;
        const source = view.state.doc.toString();
        const formatted = formatLatex(source);
        if (formatted === source) return false;
        // Only replace leading whitespace per line. CodeMirror maps the cursor/selection
        // through those changes and records formatting as one undoable edit.
        const lines = formatted.split('\n');
        const changes = [];
        for (let index = 1; index <= view.state.doc.lines; index++) {
          const line = view.state.doc.line(index);
          if (line.text === lines[index - 1]) continue;
          const before = line.text.match(/^\s*/)?.[0] || '';
          const after = lines[index - 1].match(/^\s*/)?.[0] || '';
          changes.push({ from: line.from, to: line.from + before.length, insert: after });
        }
        view.dispatch({ changes, userEvent: 'input.format', annotations: isolateHistory.of('full'), scrollIntoView: true });
        return true;
      },
      getValue: () => {
        return viewRef.current ? viewRef.current.state.doc.toString() : '';
      },
      setValue: (value: string) => {
        if (viewRef.current) {
          const currentVal = viewRef.current.state.doc.toString();
          if (currentVal !== value) {
            viewRef.current.dispatch({
              changes: { from: 0, to: currentVal.length, insert: value },
              annotations: externalUpdate.of(true),
            });
          }
        }
      },
      insertAtCursor: (text: string) => {
        if (viewRef.current) {
          const state = viewRef.current.state;
          const { from, to } = state.selection.main;
          viewRef.current.dispatch({
            changes: { from, to, insert: text },
            selection: { anchor: from + text.length },
          });
          viewRef.current.focus();
        }
      },
      getSelection: () => {
        if (viewRef.current) {
          const state = viewRef.current.state;
          const { from, to } = state.selection.main;
          const text = state.sliceDoc(from, to);
          return { text, from, to };
        }
        return { text: '', from: 0, to: 0 };
      },
      replaceSelection: (text: string) => {
        if (viewRef.current) {
          const state = viewRef.current.state;
          const { from, to } = state.selection.main;
          viewRef.current.dispatch({
            changes: { from, to, insert: text },
            selection: { anchor: from + text.length },
          });
        }
      },
      jumpToLine: (lineNum: number, col = 1) => {
        if (viewRef.current) {
          const doc = viewRef.current.state.doc;
          const safeLine = Math.max(1, Math.min(lineNum, doc.lines));
          const line = doc.line(safeLine);
          const pos = Math.min(line.from + Math.max(0, col - 1), line.to);

          viewRef.current.dispatch({
            selection: { anchor: pos },
            scrollIntoView: true,
            effects: [flashLineEffect.of(line.from)],
          });
          viewRef.current.focus();

          // Clear flash highlight after 1.8s
          setTimeout(() => {
            if (viewRef.current) {
              viewRef.current.dispatch({ effects: [flashLineEffect.of(null)] });
            }
          }, 1800);
        }
      },
      focus: () => {
        viewRef.current?.focus();
      },
      showDiff: (from: number, to: number) => {
        viewRef.current?.dispatch({
          effects: [setDiffEffect.of({ from, to, isDiff: true })],
        });
      },
      clearDiff: () => {
        viewRef.current?.dispatch({
          effects: [setDiffEffect.of(null)],
        });
      },
      getEditorView: () => viewRef.current,
      previewAIEdit: review => {
        const view = viewRef.current;
        if (!view) return;
        view.dispatch({ effects: [setAIReview.of(review), ...(review ? [EditorView.scrollIntoView(review.to, { y: 'center' })] : [])] });
        if (review) view.scrollDOM.scrollLeft = 0;
      },
    }));

    useEffect(() => {
      if (!editorContainerRef.current) return;

      const updateListener = EditorView.updateListener.of(update => {
        if (update.docChanged && !update.transactions.some(tr => tr.annotation(externalUpdate))) {
          callbacks.current.onChange?.(update.state.doc.toString());
        }

        if (update.selectionSet || update.docChanged) {
          const main = update.state.selection.main;
          const line = update.state.doc.lineAt(main.head);
          const col = main.head - line.from + 1;

          if (callbacks.current.onCursorChange) {
            callbacks.current.onCursorChange(line.number, col);
          }

          if (callbacks.current.onSelectionChange) {
            const selText = update.state.sliceDoc(main.from, main.to);
            callbacks.current.onSelectionChange(selText);
          }
        }
      });

      const customKeymaps = keymap.of([
        indentWithTab,
        { key: 'Mod-Shift-f', run: () => { callbacks.current.onFormatShortcut?.(); return true; } },
        {
          key: 'Mod-Enter',
          run: () => {
            callbacks.current.onCompileShortcut?.();
            return true;
          },
        },
        {
          key: 'Mod-f',
          run: () => {
            callbacks.current.onFindShortcut?.();
            return true;
          },
        },
        {
          key: 'Mod-h',
          run: () => {
            callbacks.current.onFindShortcut?.();
            return true;
          },
        },
      ]);

      const startState = EditorState.create({
        doc: initialValue,
        extensions: [
          basicSetup,
          wrapConfig.current.of(wordWrap ? EditorView.lineWrapping : []),
          StreamLanguage.define(stex),
          oneDark,
          syntaxHighlighting(HighlightStyle.define([{tag:[tags.keyword,tags.tagName,tags.attributeName,tags.number,tags.string,tags.operator,tags.function(tags.variableName)],color:'var(--accent-text)'}])),
          autocompletion({
            override: [(context: CompletionContext) => {
              const prefix = context.state.sliceDoc(Math.max(0, context.pos - 1500), context.pos);
              const reference = referenceContext(prefix);
              if (!reference) return completeFromList(latexCompletions)(context);
              const used = prefix.match(/\{([^{}]*)$/)?.[1].split(',').slice(0, -1).map(key => key.trim()) || [];
              const entries = index.current[reference.kind].filter(entry => !used.includes(entry.key));
              const unique = new Map(entries.map(entry => [entry.key, entry]));
              return { from: context.pos - reference.fragment.length, validFor: /^[^{}\s,]*$/, options: [...unique.values()].map(entry => ({
                label: entry.key, type: 'constant', detail: entry.detail.slice(0, 90), info: `${entry.detail}\n${entry.file}:${entry.line}`,
              })) };
            }],
          }),
          Prec.highest(aiReviewKeys),
          Prec.highest(customKeymaps),
          aiReviewField,
          protectAIReview,
          updateListener,
          diffField,
          flashField,
          spellingField,
          findHighlights,
          readOnlyConfig.current.of(EditorState.readOnly.of(readOnly)),
        ],
      });

      const view = new EditorView({
        state: startState,
        parent: editorContainerRef.current,
      });

      viewRef.current = view;
      readyCallback.current?.();

      return () => {
        view.destroy();
        viewRef.current = null;
      };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
      <div
        ref={editorContainerRef}
        className={`w-full h-full relative overflow-hidden ${className}`}
        style={{ minHeight: '100%' }}
      />
    );
  }
);

CodeEditor.displayName = 'CodeEditor';
