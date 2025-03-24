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
  _nodes: RegisteredNodes;
  _config: EditorConfig;
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
    // TODO: Add listeners

    // Editor configuration for theme/context.
    this._config = config;
    // Mapping of types to their nodes
    this._nodes = nodes;

    this._onError = onError;
  }
}
