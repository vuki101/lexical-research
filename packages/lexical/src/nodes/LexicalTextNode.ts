import { LexicalNode } from '../LexicalNode';
import { BaseSelection, RangeSelection } from '../LexicalSelection';

export class TextNode extends LexicalNode {
  selectionTransform(
    prevSelection: null | BaseSelection,
    nextSelection: RangeSelection
  ): void {
    return;
  }
}
