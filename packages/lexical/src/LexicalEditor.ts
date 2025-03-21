import { createEmptyEditorState } from './LexicalEditorState';
import { internalGetActiveEditor } from './LexicalUpdates';

export type EditorThemeClasses = {};

export type CreateEditorArgs = {
  disableEvents?: boolean;
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
  // TODO: continue here

  return new LexicalEditor();
}

export class LexicalEditor {}
