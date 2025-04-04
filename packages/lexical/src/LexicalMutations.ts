import { LexicalEditor } from './LexicalEditor';
import { updateEditorSync } from './LexicalUpdates';
import { getWindow } from './LexicalUtils';

const TEXT_MUTATION_VARIANCE = 100;

let isProcessingMutations = false;
let lastTextEntryTimeStamp = 0;

function updateTimeStamp(event: Event) {
  lastTextEntryTimeStamp = event.timeStamp;
}

function initTextEntryListener(editor: LexicalEditor): void {
  if (lastTextEntryTimeStamp === 0) {
    getWindow(editor).addEventListener('textInput', updateTimeStamp, true);
  }
}

function flushMutations(
  editor: LexicalEditor,
  mutations: Array<MutationRecord>,
  observer: MutationObserver
): void {
  isProcessingMutations = true;
  const shouldFlushTextMutations =
    performance.now() - lastTextEntryTimeStamp > TEXT_MUTATION_VARIANCE;

  try {
    updateEditorSync(editor, () => {
      // TODO: complete this function
    });
  } finally {
    isProcessingMutations = false;
  }
}

export function initMutationObserver(editor: LexicalEditor): void {
  initTextEntryListener(editor);
  editor._observer = new MutationObserver(
    (mutations: Array<MutationRecord>, observer: MutationObserver) => {
      flushMutations(editor, mutations, observer);
    }
  );
}
