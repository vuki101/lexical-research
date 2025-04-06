import { EditorUpdateOptions, LexicalEditor } from './LexicalEditor';
import { cloneEditorState, EditorState } from './LexicalEditorState';

let activeEditorState: null | EditorState = null;
let isReadOnlyMode = false;
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

  if (onUpdate) {
    editor._deferred.push(onUpdate);
  }

  const currentEditorState = editor._editorState;
  let pendingEditorState = editor._pendingEditorState;
  let editorStateWasCloned = false;

  if (pendingEditorState === null || pendingEditorState._readOnly) {
    pendingEditorState = editor._pendingEditorState = cloneEditorState(
      pendingEditorState || currentEditorState
    );
    editorStateWasCloned = true;
  }
  pendingEditorState._flushSync = discrete;

  const previousActiveEditorState = activeEditorState;
  const previousReadOnlyMode = isReadOnlyMode;
  const previousActiveEditor = activeEditor;
  const previouslyUpdating = editor._updating;

  activeEditorState = pendingEditorState;
  isReadOnlyMode = false;
  editor._updating = true;
  activeEditor = editor;
  const headless = editor._headless || editor.getRootElement() === null;

  try {
    if (editorStateWasCloned) {
      if (headless) {
        if (currentEditorState._selection !== null) {
          pendingEditorState._selection = currentEditorState._selection.clone();
        }
      } else {
        pendingEditorState._selection = $internalCreateSelection(
          editor,
          (options && options.event) || null
        );
      }
    }
  } catch (error) {
  } finally {
  }
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
