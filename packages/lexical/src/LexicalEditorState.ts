import { NodeMap } from './LexicalNode';
import { BaseSelection } from './LexicalSelection';
import { $createRootNode } from './nodes/LexicalRootNode';

export function cloneEditorState(current: EditorState): EditorState {
  return new EditorState(new Map(current._nodeMap));
}

export function createEmptyEditorState(): EditorState {
  return new EditorState(new Map([['root', $createRootNode()]]));
}

export class EditorState {
  _nodeMap: NodeMap;
  _selection: null | BaseSelection;
  _flushSync: boolean;
  _readOnly: boolean;

  constructor(nodeMap: NodeMap, selection?: null | BaseSelection) {
    this._nodeMap = nodeMap;
    this._selection = selection || null;
    this._flushSync = false;
    this._readOnly = false;
  }
}
