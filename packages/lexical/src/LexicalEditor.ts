import { createEmptyEditorState, EditorState } from './LexicalEditorState';
import { internalGetActiveEditor } from './LexicalUpdates';
import { createUID } from './LexicalUtils';

export type EditorThemeClasses = {};

export type CreateEditorArgs = {
  disableEvents?: boolean;
  editorState?: EditorState;
  namespace?: string;
  parentEditor?: LexicalEditor;
  theme?: EditorThemeClasses;
};

export function createEditor(editorConfig?: CreateEditorArgs) {
  const config = editorConfig || {};
  const activeEditor = internalGetActiveEditor();
  const theme = config.theme || {};
  const parentEditor =
    editorConfig === undefined ? activeEditor : config.parentEditor || null;
  const disableEvents = config.disableEvents || false;
  const editorState = createEmptyEditorState();
  const namespace =
    config.namespace ||
    (parentEditor !== null ? parentEditor._config.namespace : createUID());
  const initialEditorState = config.editorState;
  // TODO: continue here

  return new LexicalEditor();
}

export type EditorConfig = {
  disableEvents?: boolean;
  namespace: string;
  theme: EditorThemeClasses;
};

export class LexicalEditor {
  _config: EditorConfig;
}
