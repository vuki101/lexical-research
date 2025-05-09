import invariant from '../../shared/src/invariant';
import { Klass, KlassConstructor, LexicalEditor } from './LexicalEditor';
import { $getNodeByKey } from './LexicalUtils';

export class LexicalNode {
  ['constructor']!: KlassConstructor<typeof LexicalNode>;
  __type: string;
  __key: string;
  __parent: null | NodeKey;

  isAttached(): boolean {
    let nodeKey: string | null = this.__key;
    while (nodeKey !== null) {
      if (nodeKey === 'root') {
        return true;
      }

      const node: LexicalNode | null = $getNodeByKey(nodeKey);

      if (node === null) {
        break;
      }
      nodeKey = node.__parent;
    }
    return false;
  }

  getLatest(): this {
    const latest = $getNodeByKey<this>(this.__key);
    if (latest === null) {
      invariant(
        false,
        'Lexical node does not exist in active editor state. Avoid using the same node references between nested closures from editorState.read/editor.update.'
      );
    }
    return latest;
  }

  static getType(): string {
    invariant(
      false,
      'LexicalNode: Node %s does not implement .getType().',
      this.name
    );
  }

  static transform(): ((node: LexicalNode) => void) | null {
    return null;
  }

  static importDOM?: () => DOMConversionMap<any> | null;
}

export type NodeKey = string;

export type NodeMap = Map<NodeKey, LexicalNode>;

// **** EXPORT ****

export type DOMExportOutput = {
  after?: (
    generatedElement: HTMLElement | DocumentFragment | Text | null | undefined
  ) => HTMLElement | Text | null | undefined;
  element: HTMLElement | DocumentFragment | Text | null;
};

export type DOMExportOutputMap = Map<
  Klass<LexicalNode>,
  (editor: LexicalEditor, target: LexicalNode) => DOMExportOutput
>;

// **** IMPORT ****

export type DOMChildConversion = (
  lexicalNode: LexicalNode,
  parentLexicalNode: LexicalNode | null | undefined
) => LexicalNode | null | undefined;

export type DOMConversionOutput = {
  after?: (childLexicalNodes: Array<LexicalNode>) => Array<LexicalNode>;
  forChild?: DOMChildConversion;
  node: null | LexicalNode | Array<LexicalNode>;
};

export type DOMConversionFn<T extends HTMLElement = HTMLElement> = (
  element: T
) => DOMConversionOutput | null;

export type DOMConversion<T extends HTMLElement = HTMLElement> = {
  conversion: DOMConversionFn<T>;
  priority?: 0 | 1 | 2 | 3 | 4;
};

type NodeName = string;

export type DOMConversionMap<T extends HTMLElement = HTMLElement> = Record<
  NodeName,
  (node: T) => DOMConversion<T> | null
>;
