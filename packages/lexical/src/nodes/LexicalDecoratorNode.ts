import { LexicalNode } from '../LexicalNode';

export class DecoratorNode<T> extends LexicalNode {}

export function $isDecoratorNode<T>(
  node: LexicalNode | null | undefined
): node is DecoratorNode<T> {
  return node instanceof DecoratorNode;
}
