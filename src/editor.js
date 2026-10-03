import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Compartment } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { StreamLanguage } from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { oneDark } from '@codemirror/theme-one-dark';
import { autocompletion, completeFromList, snippet } from '@codemirror/autocomplete';

// Expose on window.CodeMirrorEditor
window.CodeMirrorEditor = {
  EditorView,
  EditorState,
  Compartment,
  basicSetup,
  keymap,
  indentWithTab,
  StreamLanguage,
  stex,
  oneDark,
  autocompletion,
  completeFromList,
  snippet
};
