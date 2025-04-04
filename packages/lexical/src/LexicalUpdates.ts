import { EditorUpdateOptions, LexicalEditor } from './LexicalEditor';

let activeEditor: null | LexicalEditor = null;

export function internalGetActiveEditor(): LexicalEditor | null {
  return activeEditor;
}

function $beginUpdate(
  editor: LexicalEditor,
  updateFn: () => void,
  options?: EditorUpdateOptions
): void {}

/**
 * A variant of updateEditor that will not defer if it is nested in an update
 * to the same editor, much like if it was an editor.dispatchCommand issued
 * within an update
 */
export function updateEditorSync(
  editor: LexicalEditor,
  updateFn: () => void,
  options?: EditorUpdateOptions
): void {
  if (activeEditor === editor && options === undefined) {
    updateFn();
  } else {
    $beginUpdate(editor, updateFn, options);
  }
}
