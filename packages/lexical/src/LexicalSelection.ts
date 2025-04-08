import { LexicalEditor } from './LexicalEditor';
import { getIsProcessingMutations } from './LexicalMutations';
import { LexicalNode, NodeKey } from './LexicalNode';
import { getActiveEditor } from './LexicalUpdates';
import {
  $getNodeFromDOM,
  getDOMSelection,
  getWindow,
  isSelectionWithinEditor,
} from './LexicalUtils';
import { $isDecoratorNode } from './nodes/LexicalDecoratorNode';
import { ElementNode } from './nodes/LexicalElementNode';
import { TextNode } from './nodes/LexicalTextNode';

export interface BaseSelection {
  _cachedNodes: Array<LexicalNode> | null;
  dirty: boolean;

  clone(): BaseSelection;
}

export type TextPointType = {
  _selection: BaseSelection;
  getNode: () => TextNode;
  is: (point: PointType) => boolean;
  isBefore: (point: PointType) => boolean;
  key: NodeKey;
  offset: number;
  set: (
    key: NodeKey,
    offset: number,
    type: 'text' | 'element',
    onlyIfChanged?: boolean
  ) => void;
  type: 'text';
};

export type ElementPointType = {
  _selection: BaseSelection;
  getNode: () => ElementNode;
  is: (point: PointType) => boolean;
  isBefore: (point: PointType) => boolean;
  key: NodeKey;
  offset: number;
  set: (
    key: NodeKey,
    offset: number,
    type: 'text' | 'element',
    onlyIfChanged?: boolean
  ) => void;
  type: 'element';
};

export type PointType = TextPointType | ElementPointType;

export class Point {
  key: NodeKey;
  offset: number;
  type: 'text' | 'element';
  _selection: BaseSelection | null;

  constructor(key: NodeKey, offset: number, type: 'text' | 'element') {
    this._selection = null;
    this.key = key;
    this.offset = offset;
    this.type = type;
  }
}

export function $createPoint(
  key: NodeKey,
  offset: number,
  type: 'text' | 'element'
): PointType {
  // @ts-expect-error: intentionally cast as we use a class for perf reasons
  return new Point(key, offset, type);
}

export class RangeSelection implements BaseSelection {
  format: number;
  style: string;
  anchor: PointType;
  focus: PointType;
  _cachedNodes: Array<LexicalNode> | null;
  dirty: boolean;

  constructor(
    anchor: PointType,
    focus: PointType,
    format: number,
    style: string
  ) {
    this.anchor = anchor;
    this.focus = focus;
    anchor._selection = this;
    focus._selection = this;
    this._cachedNodes = null;
    this.format = format;
    this.style = style;
    this.dirty = false;
  }

  clone(): RangeSelection {
    const anchor = this.anchor;
    const focus = this.focus;
    const selection = new RangeSelection(
      $createPoint(anchor.key, anchor.offset, anchor.type),
      $createPoint(focus.key, focus.offset, focus.type),
      this.format,
      this.style
    );
    return selection;
  }
}

export function $isRangeSelection(x: unknown): x is RangeSelection {
  return x instanceof RangeSelection;
}

function resolveSelectionPointOnBoundary(
  point: TextPointType,
  isBackward: boolean,
  isCollapsed: boolean
): void {}

function $normalizeSelectionPointsForBoundaries(
  anchor: PointType,
  focus: PointType,
  lastSelection: null | BaseSelection
): void {
  if (anchor.type === 'text' && focus.type === 'text') {
    const isBackward = anchor.isBefore(focus);
    const isCollapsed = anchor.is(focus);

    // Attempt to normalize the offset to the previous sibling if we're at the
    // start of a text node and the sibling is a text node or inline element.
    resolveSelectionPointOnBoundary(anchor, isBackward, isCollapsed);
    resolveSelectionPointOnBoundary(focus, !isBackward, isCollapsed);

    if (isCollapsed) {
      focus.set(anchor.key, anchor.offset, anchor.type);
    }
    const editor = getActiveEditor();

    if (
      editor.isComposing() &&
      editor._compositionKey !== anchor.key &&
      $isRangeSelection(lastSelection)
    ) {
      const lastAnchor = lastSelection.anchor;
      const lastFocus = lastSelection.focus;
      anchor.set(lastAnchor.key, lastAnchor.offset, lastAnchor.type, true);
      focus.set(lastFocus.key, lastFocus.offset, lastFocus.type, true);
    }
  }
}

export function $internalResolveSelectionPoint(
  dom: Node,
  offset: number,
  lastPoint: null | PointType,
  editor: LexicalEditor
): null | PointType {
  return null;

  // TODO: implement this function
}

function $internalResolveSelectionPoints(
  anchorDOM: null | Node,
  anchorOffset: number,
  focusDOM: null | Node,
  focusOffset: number,
  editor: LexicalEditor,
  lastSelection: null | BaseSelection
): null | [PointType, PointType] {
  if (
    anchorDOM === null ||
    focusDOM === null ||
    !isSelectionWithinEditor(editor, anchorDOM, focusDOM)
  ) {
    return null;
  }
  const resolvedAnchorPoint = $internalResolveSelectionPoint(
    anchorDOM,
    anchorOffset,
    $isRangeSelection(lastSelection) ? lastSelection.anchor : null,
    editor
  );
  if (resolvedAnchorPoint === null) {
    return null;
  }
  const resolvedFocusPoint = $internalResolveSelectionPoint(
    focusDOM,
    focusOffset,
    $isRangeSelection(lastSelection) ? lastSelection.focus : null,
    editor
  );
  if (resolvedFocusPoint === null) {
    return null;
  }

  if (
    resolvedAnchorPoint.type === 'element' &&
    resolvedFocusPoint.type === 'element'
  ) {
    const anchorNode = $getNodeFromDOM(anchorDOM);
    const focusNode = $getNodeFromDOM(focusDOM);
    // Ensure if we're selecting the content of a decorator that we
    // return null for this point, as it's not in the controlled scope
    // of Lexical.
    if ($isDecoratorNode(anchorNode) && $isDecoratorNode(focusNode)) {
      return null;
    }
  }

  // Handle normalization of selection when it is at the boundaries.
  $normalizeSelectionPointsForBoundaries(
    resolvedAnchorPoint,
    resolvedFocusPoint,
    lastSelection
  );

  return [resolvedAnchorPoint, resolvedFocusPoint];
}

export function $internalCreateRangeSelection(
  lastSelection: null | BaseSelection,
  domSelection: Selection | null,
  editor: LexicalEditor,
  event: UIEvent | Event | null
): null | RangeSelection {
  const windowObj = editor._window;
  if (windowObj === null) {
    return null;
  }

  // When we create a selection, we try to use the previous
  // selection where possible, unless an actual user selection
  // change has occurred. When we do need to create a new selection
  // we validate we can have text nodes for both anchor and focus
  // nodes. If that holds true, we then return that selection
  // as a mutable object that we use for the editor state for this
  // update cycle. If a selection gets changed, and requires a
  // update to native DOM selection, it gets marked as "dirty".
  // If the selection changes, but matches with the existing
  // DOM selection, then we only need to sync it. Otherwise,
  // we generally bail out of doing an update to selection during
  // reconciliation unless there are dirty nodes that need
  // reconciling.

  const windowEvent = event || windowObj.event;
  const eventType = windowEvent ? windowEvent.type : undefined;
  const isSelectionChange = eventType === 'selectionchange';
  const useDOMSelection =
    !getIsProcessingMutations() &&
    (isSelectionChange ||
      eventType === 'beforeinput' ||
      eventType === 'compositionstart' ||
      eventType === 'compositionend' ||
      (eventType === 'click' &&
        windowEvent &&
        (windowEvent as InputEvent).detail === 3) ||
      eventType === 'drop' ||
      eventType === undefined);

  let anchorDOM, focusDOM, anchorOffset, focusOffset;

  if (!$isRangeSelection(lastSelection) || useDOMSelection) {
    if (domSelection === null) {
      return null;
    }

    anchorDOM = domSelection.anchorNode;
    focusDOM = domSelection.focusNode;
    anchorOffset = domSelection.anchorOffset;
    focusOffset = domSelection.focusOffset;

    if (
      isSelectionChange &&
      $isRangeSelection(lastSelection) &&
      !isSelectionWithinEditor(editor, anchorDOM, focusDOM)
    ) {
      return lastSelection.clone();
    }
  } else {
    return lastSelection.clone();
  }

  // Let's resolve the text nodes from the offsets and DOM nodes we have from
  // native selection.

  const resolvedSelectionPoints = $internalResolveSelectionPoints(
    anchorDOM,
    anchorOffset,
    focusDOM,
    focusOffset,
    editor,
    lastSelection
  );

  if (resolvedSelectionPoints === null) {
    return null;
  }

  const [resolvedAnchorPoint, resolvedFocusPoint] = resolvedSelectionPoints;

  return new RangeSelection(
    resolvedAnchorPoint,
    resolvedFocusPoint,
    !$isRangeSelection(lastSelection) ? 0 : lastSelection.format,
    !$isRangeSelection(lastSelection) ? '' : lastSelection.style
  );
}

export function $internalCreateSelection(
  editor: LexicalEditor,
  event: UIEvent | Event | null
): null | BaseSelection {
  const currentEditorState = editor.getEditorState();
  const lastSelection = currentEditorState._selection;
  const domSelection = getDOMSelection(getWindow(editor));

  if ($isRangeSelection(lastSelection) || lastSelection == null) {
    return $internalCreateRangeSelection(
      lastSelection,
      domSelection,
      editor,
      event
    );
  }

  return lastSelection.clone();
}
