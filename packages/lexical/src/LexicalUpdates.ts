import { EditorUpdateOptions, LexicalEditor } from './LexicalEditor';

let activeEditor: null | LexicalEditor = null;

export function internalGetActiveEditor(): LexicalEditor | null {
  return activeEditor;
}

function addTags(editor: LexicalEditor, tags: undefined | string | string[]) {
  if (!tags) {
    return;
  }
  const updateTags = editor._updateTags;
  let tags_ = tags;
  if (!Array.isArray(tags)) {
    tags_ = [tags];
  }
  for (const tag of tags_) {
    updateTags.add(tag);
  }
}

function $beginUpdate(
  editor: LexicalEditor,
  updateFn: () => void,
  options?: EditorUpdateOptions
): void {
  const updateTags = editor._updateTags;
  let onUpdate;
  let skipTransforms = false;
  let discrete = false;

  if (options !== undefined) {
    onUpdate = options.onUpdate;
    addTags(editor, options.tag);

    skipTransforms = options.skipTransforms || false;
    discrete = options.discrete || false;
  }

  // TODO: continue here
}

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
