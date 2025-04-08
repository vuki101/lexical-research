import { CAN_USE_DOM } from '../../shared/src/canUseDOM';
import invariant from '../../shared/src/invariant';
import normalizeClassNames from '../../shared/src/normalizeClassNames';
import {
  DOM_DOCUMENT_FRAGMENT_TYPE,
  DOM_DOCUMENT_TYPE,
  DOM_ELEMENT_TYPE,
} from './LexicalConstants';
import { EditorThemeClasses, LexicalEditor } from './LexicalEditor';
import { EditorState } from './LexicalEditorState';
import { LexicalNode, NodeKey } from './LexicalNode';
import { getActiveEditor, getActiveEditorState } from './LexicalUpdates';

export function createUID(): string {
  return Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, '')
    .substring(0, 5);
}

export function getCachedClassNameArray(
  classNamesTheme: EditorThemeClasses,
  classNameThemeType: string
): Array<string> {
  if (classNamesTheme.__lexicalClassNameCache === undefined) {
    classNamesTheme.__lexicalClassNameCache = {};
  }
  const classNamesCache = classNamesTheme.__lexicalClassNameCache;
  const cachedClassNames = classNamesCache[classNameThemeType];
  if (cachedClassNames !== undefined) {
    return cachedClassNames;
  }
  const classNames = classNamesTheme[classNameThemeType];
  // As we're using classList, we need
  // to handle className tokens that have spaces.
  // The easiest way to do this to convert the
  // className tokens to an array that can be
  // applied to classList.add()/remove().
  if (typeof classNames === 'string') {
    const classNamesArr = normalizeClassNames(classNames);
    classNamesCache[classNameThemeType] = classNamesArr;
    return classNamesArr;
  }
  return classNames;
}

export function isDOMNode(x: unknown): x is Node {
  return (
    typeof x === 'object' &&
    x !== null &&
    'nodeType' in x &&
    typeof x.nodeType === 'number'
  );
}

export function isDOMDocumentNode(node: unknown): node is Document {
  return isDOMNode(node) && node.nodeType === DOM_DOCUMENT_TYPE;
}

export function isHTMLElement(x: unknown): x is HTMLElement {
  return isDOMNode(x) && x.nodeType === DOM_ELEMENT_TYPE;
}

export function getDOMOwnerDocument(
  target: EventTarget | null
): Document | null {
  return isDOMDocumentNode(target)
    ? target
    : isHTMLElement(target)
    ? target.ownerDocument
    : null;
}

export function getDefaultView(domElem: EventTarget | null): Window | null {
  const ownerDoc = getDOMOwnerDocument(domElem);
  return ownerDoc ? ownerDoc.defaultView : null;
}

export function getWindow(editor: LexicalEditor): Window {
  const windowObj = editor._window;
  if (windowObj === null) {
    invariant(false, 'window object not found');
  }
  return windowObj;
}

export function getDOMSelection(targetWindow: null | Window): null | Selection {
  return !CAN_USE_DOM ? null : (targetWindow || window).getSelection();
}

export function isDocumentFragment(x: unknown): x is DocumentFragment {
  return isDOMNode(x) && x.nodeType === DOM_DOCUMENT_FRAGMENT_TYPE;
}

export function getParentElement(node: Node): HTMLElement | null {
  const parentElement =
    (node as HTMLSlotElement).assignedSlot || node.parentElement;
  return isDocumentFragment(parentElement)
    ? ((parentElement as unknown as ShadowRoot).host as HTMLElement)
    : parentElement;
}

export function getNodeKeyFromDOMNode(
  dom: Node,
  editor: LexicalEditor
): NodeKey | undefined {
  const prop = `__lexicalKey_${editor._key}`;
  return (dom as Node & Record<typeof prop, NodeKey | undefined>)[prop];
}

function getNodeKeyFromDOMTree(
  // Note that node here refers to a DOM Node, not an Lexical Node
  dom: Node,
  editor: LexicalEditor
): NodeKey | null {
  let node: Node | null = dom;
  while (node != null) {
    const key = getNodeKeyFromDOMNode(node, editor);
    if (key !== undefined) {
      return key;
    }
    node = getParentElement(node);
  }
  return null;
}

export function $getNodeByKey<T extends LexicalNode>(
  key: NodeKey,
  _editorState?: EditorState
): T | null {
  const editorState = _editorState || getActiveEditorState();
  const node = editorState._nodeMap.get(key) as T;
  if (node === undefined) {
    return null;
  }
  return node;
}

export function $getNodeFromDOM(dom: Node): null | LexicalNode {
  const editor = getActiveEditor();
  const nodeKey = getNodeKeyFromDOMTree(dom, editor);
  if (nodeKey === null) {
    const rootElement = editor.getRootElement();
    if (dom === rootElement) {
      return $getNodeByKey('root');
    }
    return null;
  }
  return $getNodeByKey(nodeKey);
}

export function isSelectionWithinEditor(
  editor: LexicalEditor,
  anchorDOM: null | Node,
  focusDOM: null | Node
): boolean {
  // TODO: implement this function
  return true;
}
