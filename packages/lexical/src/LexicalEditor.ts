import { NO_DIRTY_NODES } from './LexicalConstants';
import { createEmptyEditorState, EditorState } from './LexicalEditorState';
import {
  DOMConversionMap,
  DOMExportOutput,
  DOMExportOutputMap,
  LexicalNode,
  NodeKey,
} from './LexicalNode';
import { internalGetActiveEditor } from './LexicalUpdates';
import { createUID } from './LexicalUtils';
import { LineBreakNode } from './nodes/LexicalLineBreakNode';
import { RootNode } from './nodes/LexicalRootNode';
import { TabNode } from './nodes/LexicalTabNode';
import { TextNode } from './nodes/LexicalTextNode';
import { ParagraphNode } from './nodes/LexicaParagraphNode';

type GenericConstructor<T> = new (...args: any[]) => T;

// Allow us to look up the type including static props, as well
// to solve the issue with the constructor type.
// The current type of Example.constructor is Function,
// but I feel that it should be typeof Example instead.
export type KlassConstructor<Cls extends GenericConstructor<any>> =
  GenericConstructor<InstanceType<Cls>> & { [k in keyof Cls]: Cls[k] };

// They type of the class itself, not the instance
export type Klass<T extends LexicalNode> = InstanceType<
  T['constructor']
> extends T
  ? T['constructor']
  : GenericConstructor<T> & T['constructor'];

export type LexicalNodeReplacement = {
  replace: Klass<LexicalNode>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  with: <T extends { new (...args: any): any }>(
    node: InstanceType<T>
  ) => LexicalNode;
  withKlass?: Klass<LexicalNode>;
};

export type EditorThemeClasses = {};

export type EditorUpdateOptions = {
  onUpdate?: () => void;
  skipTransforms?: true;
  tag?: string | Array<string>;
  discrete?: true;
  /** @internal */
  event?: undefined | UIEvent | Event | null;
};

export type ErrorHandler = (error: Error) => void;

export type HTMLConfig = {
  export?: DOMExportOutputMap;
  import?: DOMConversionMap;
};

export type Transform<T extends LexicalNode> = (node: T) => void;

export type RegisteredNode = {
  klass: Klass<LexicalNode>;
  transforms: Set<Transform<LexicalNode>>;
  replace: null | ((node: LexicalNode) => LexicalNode);
  replaceWithKlass: null | Klass<LexicalNode>;
  exportDOM?: (
    editor: LexicalEditor,
    targetNode: LexicalNode
  ) => DOMExportOutput;
};

export type RegisteredNodes = Map<string, RegisteredNode>;

// ****** LISTENERS ******

export type DecoratorListener<T = never> = (
  decorator: Record<NodeKey, T>
) => void;

export type NodeMutation = 'created' | 'updated' | 'destroyed';

export type MutatedNodes = Map<Klass<LexicalNode>, Map<NodeKey, NodeMutation>>;

export type MutationListener = (
  nodes: Map<NodeKey, NodeMutation>,
  payload: {
    updateTags: Set<string>;
    dirtyLeaves: Set<string>;
    prevEditorState: EditorState;
  }
) => void;

export type MutationListeners = Map<MutationListener, Klass<LexicalNode>>;

export type EditableListener = (editable: boolean) => void;

export type RootListener = (
  rootElement: null | HTMLElement,
  prevRootElement: null | HTMLElement
) => void;

export type TextContentListener = (text: string) => void;

type IntentionallyMarkedAsDirtyElement = boolean;

export interface UpdateListenerPayload {
  /**
   * A Map of NodeKeys of ElementNodes to a boolean that is true
   * if the node was intentionally mutated ('unintentional' mutations
   * are triggered when an indirect descendant is marked dirty)
   */
  dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>;
  /**
   * A Set of NodeKeys of all nodes that were marked dirty that
   * do not inherit from ElementNode.
   */
  dirtyLeaves: Set<NodeKey>;
  /**
   * The new EditorState after all updates have been processed,
   * equivalent to `editor.getEditorState()`
   */
  editorState: EditorState;
  /**
   * The Map of LexicalNode constructors to a `Map<NodeKey, NodeMutation>`,
   * this is useful when you have a mutation listener type use cases that
   * should apply to all or most nodes. Will be null if no DOM was mutated,
   * such as when only the selection changed.
   *
   * Added in v0.28.0
   */
  mutatedNodes: null | MutatedNodes;
  /**
   * For advanced use cases only.
   *
   * Tracks the keys of TextNode descendants that have been merged
   * with their siblings by normalization. Note that these keys may
   * not exist in either editorState or prevEditorState and generally
   * this is only used for conflict resolution edge cases in collab.
   */
  normalizedNodes: Set<NodeKey>;
  /**
   * The previous EditorState that is being discarded
   */
  prevEditorState: EditorState;
  /**
   * The set of tags added with update options or {@link $addUpdateTag},
   * node that this includes all tags that were processed in this
   * reconciliation which may have been added by separate updates.
   */
  tags: Set<string>;
}

export type UpdateListener = (payload: UpdateListenerPayload) => void;

export interface Listeners {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  decorator: Set<DecoratorListener<any>>;
  mutation: MutationListeners;
  editable: Set<EditableListener>;
  root: Set<RootListener>;
  textcontent: Set<TextContentListener>;
  update: Set<UpdateListener>;
}

// **** COMMANDS ****

export type LexicalCommand<TPayload> = {
  type?: string;
};

export type CommandListener<P> = (payload: P, editor: LexicalEditor) => boolean;

type Commands = Map<
  LexicalCommand<unknown>,
  Array<Set<CommandListener<unknown>>>
>;

export type CreateEditorArgs = {
  disableEvents?: boolean;
  editorState?: EditorState;
  namespace?: string;
  nodes?: ReadonlyArray<Klass<LexicalNode> | LexicalNodeReplacement>;
  onError?: ErrorHandler;
  parentEditor?: LexicalEditor;
  editable?: boolean;
  theme?: EditorThemeClasses;
  html?: HTMLConfig;
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
  const nodes = [
    RootNode,
    TextNode,
    LineBreakNode,
    TabNode,
    ParagraphNode,
    ...(config.nodes || []),
  ];
  const { onError, html } = config;
  const isEditable = config.editable !== undefined ? config.editable : true;
  let registeredNodes: RegisteredNodes;

  if (editorConfig === undefined && activeEditor !== null) {
    registeredNodes = activeEditor._nodes;
  } else {
    registeredNodes = new Map();
    for (let i = 0; i < nodes.length; i++) {
      let klass = nodes[i];
      let replace: RegisteredNode['replace'] = null;
      let replaceWithKlass: RegisteredNode['replaceWithKlass'] = null;

      if (typeof klass !== 'function') {
        const options = klass;
        klass = options.replace;
        replace = options.with;
        replaceWithKlass = options.withKlass || null;
      }

      const type = klass.getType();
      const transform = klass.transform();
      const transforms = new Set<Transform<LexicalNode>>();
      if (transform !== null) {
        transforms.add(transform);
      }

      registeredNodes.set(type, {
        exportDOM: html && html.export ? html.export.get(klass) : undefined,
        klass,
        replace,
        replaceWithKlass,
        transforms,
      });
    }
  }

  return new LexicalEditor(
    editorState,
    parentEditor,
    registeredNodes,
    {
      disableEvents,
      namespace,
      theme,
    },
    onError ? onError : console.error
  );
}

export type EditorConfig = {
  disableEvents?: boolean;
  namespace: string;
  theme: EditorThemeClasses;
};

export class LexicalEditor {
  ['constructor']!: KlassConstructor<typeof LexicalEditor>;

  _parentEditor: null | LexicalEditor;
  _rootElement: null | HTMLElement;
  _editorState: EditorState;
  _pendingEditorState: null | EditorState;
  _compositionKey: null | NodeKey;
  _deferred: Array<() => void>;
  _keyToDOMMap: Map<NodeKey, HTMLElement>;
  _updates: Array<[() => void, EditorUpdateOptions | undefined]>;
  _updating: boolean;
  _listeners: Listeners;
  _commands: Commands;
  _nodes: RegisteredNodes;
  _decorators: Record<NodeKey, unknown>;
  _pendingDecorators: null | Record<NodeKey, unknown>;
  _config: EditorConfig;
  _dirtyType: 0 | 1 | 2;
  _cloneNotNeeded: Set<NodeKey>;
  _dirtyLeaves: Set<NodeKey>;
  _dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>;
  _normalizedNodes: Set<NodeKey>;
  _updateTags: Set<string>;
  _onError: ErrorHandler;

  constructor(
    editorState: EditorState,
    parentEditor: null | LexicalEditor,
    nodes: RegisteredNodes,
    config: EditorConfig,
    onError: ErrorHandler
  ) {
    this._parentEditor = parentEditor;
    // The root element associated with this editor
    this._rootElement = null;
    // The current editor state
    this._editorState = editorState;
    // Handling of drafts and updates
    this._pendingEditorState = null;
    // Used to help co-ordinate selection and events
    this._compositionKey = null;
    this._deferred = [];
    // Used during reconciliation
    this._keyToDOMMap = new Map();
    this._updates = [];
    this._updating = false;
    // Listeners
    this._listeners = {
      decorator: new Set(),
      editable: new Set(),
      mutation: new Map(),
      root: new Set(),
      textcontent: new Set(),
      update: new Set(),
    };
    // Commands
    this._commands = new Map();
    // Editor configuration for theme/context.
    this._config = config;
    // Mapping of types to their nodes
    this._nodes = nodes;
    // React node decorators for portals
    this._decorators = {};
    this._pendingDecorators = null;
    // Used to optimize reconciliation
    this._dirtyType = NO_DIRTY_NODES;
    this._cloneNotNeeded = new Set();
    this._dirtyLeaves = new Set();
    this._dirtyElements = new Map();
    this._normalizedNodes = new Set();
    this._updateTags = new Set();
    // TODO: continue here

    this._onError = onError;
  }
}
