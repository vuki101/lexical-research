import { LexicalEditor } from './LexicalEditor';
import { getWindow } from './LexicalUtils';

let lastTextEntryTimeStamp = 0;

function updateTimeStamp(event: Event) {
  lastTextEntryTimeStamp = event.timeStamp;
}

function initTextEntryListener(editor: LexicalEditor): void {
  if (lastTextEntryTimeStamp === 0) {
    // TODO: Why can we not just use window object normally?
    getWindow(editor).addEventListener('textInput', updateTimeStamp, true);
  }
}

export function initMutationObserver(editor: LexicalEditor): void {
  initTextEntryListener(editor);
  // TODO: Continue here
}
