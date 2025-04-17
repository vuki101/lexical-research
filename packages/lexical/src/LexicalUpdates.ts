import invariant from '../../shared/src/invariant';
import { NO_DIRTY_NODES } from './LexicalConstants';
import { EditorUpdateOptions, LexicalEditor } from './LexicalEditor';
import { cloneEditorState, EditorState } from './LexicalEditorState';
import { $normalizeTextNode } from './LexicalNormalization';
import {
  $internalCreateSelection,
  applySelectionTransforms,
} from './LexicalSelection';
import { $isTextNode } from './nodes/LexicalTextNode';

let activeEditorState: null | EditorState = null;
let isReadOnlyMode = false;
let activeEditor: null | LexicalEditor = null;
let infiniteTransformCount = 0;

export function getActiveEditor(): LexicalEditor {
  if (activeEditor === null) {
    invariant(
      false,
      'Unable to find an active editor. ' +
        'This method can only be used ' +
        'synchronously during the callback of ' +
        'editor.update() or editor.read().%s'
    );
  }
  return activeEditor;
}

export function getActiveEditorState(): EditorState {
  if (activeEditorState === null) {
    invariant(
      false,
      'Unable to find an active editor state. ' +
        'State helpers or node methods can only be used ' +
        'synchronously during the callback of ' +
        'editor.update(), editor.read(), or editorState.read().%s'
    );
  }

  return activeEditorState;
}

export function internalGetActiveEditor(): LexicalEditor | null {
  return activeEditor;
}

function $normalizeAllDirtyTextNodes(
  editorState: EditorState,
  editor: LexicalEditor
): void {
  const dirtyLeaves = editor._dirtyLeaves;
  const nodeMap = editorState._nodeMap;

  for (const nodeKey of dirtyLeaves) {
    const node = nodeMap.get(nodeKey);

    if (
      $isTextNode(node) &&
      node.isAttached() &&
      node.isSimpleText() &&
      !node.isUnmergeable()
    ) {
      $normalizeTextNode(node);
    }
  }
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

function $applyAllTransforms(
  editorState: EditorState,
  editor: LexicalEditor
): void {}

function processNestedUpdates(
  editor: LexicalEditor,
  initialSkipTransforms?: boolean
): boolean {
  const queuedUpdates = editor._updates;
  let skipTransforms = initialSkipTransforms || false;

  // Updates might grow as we process them, we so we'll need
  // to handle each update as we go until the updates array is
  // empty.
  while (queuedUpdates.length !== 0) {
    const queuedUpdate = queuedUpdates.shift();
    if (queuedUpdate) {
      const [nextUpdateFn, options] = queuedUpdate;

      let onUpdate;

      if (options !== undefined) {
        onUpdate = options.onUpdate;

        if (options.skipTransforms) {
          skipTransforms = true;
        }
        if (options.discrete) {
          const pendingEditorState = editor._pendingEditorState;
          invariant(
            pendingEditorState !== null,
            'Unexpected empty pending editor state on discrete nested update'
          );
          pendingEditorState._flushSync = true;
        }

        if (onUpdate) {
          editor._deferred.push(onUpdate);
        }

        addTags(editor, options.tag);
      }

      nextUpdateFn();
    }
  }

  return skipTransforms;
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

    const startingCompositionKey = editor._compositionKey;
    updateFn();
    skipTransforms = processNestedUpdates(editor, skipTransforms);
    applySelectionTransforms(pendingEditorState, editor);

    if (editor._dirtyType !== NO_DIRTY_NODES) {
      if (skipTransforms) {
        $normalizeAllDirtyTextNodes(pendingEditorState, editor);
      } else {
        $applyAllTransforms(pendingEditorState, editor);
      }

      processNestedUpdates(editor, skipTransforms);
      // TODO: continue here
    }

    // TODO: Continue here
  } catch (error) {
  } finally {
    activeEditorState = previousActiveEditorState;
    isReadOnlyMode = previousReadOnlyMode;
    activeEditor = previousActiveEditor;
    editor._updating = previouslyUpdating;
    infiniteTransformCount = 0;
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
