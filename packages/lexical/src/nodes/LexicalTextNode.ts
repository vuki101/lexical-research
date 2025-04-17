import { IS_UNMERGEABLE } from '../LexicalConstants';
import { LexicalNode } from '../LexicalNode';
import { BaseSelection, RangeSelection } from '../LexicalSelection';

export class TextNode extends LexicalNode {
  __mode: 0 | 1 | 2 | 3;
  __detail: number;

  selectionTransform(
    prevSelection: null | BaseSelection,
    nextSelection: RangeSelection
  ): void {
    return;
  }

  isSimpleText(): boolean {
    return this.__type === 'text' && this.__mode === 0;
  }

  isUnmergeable(): boolean {
    const self = this.getLatest();
    return (self.__detail & IS_UNMERGEABLE) !== 0;
  }
}

export function $isTextNode(
  node: LexicalNode | null | undefined
): node is TextNode {
  return node instanceof TextNode;
}
