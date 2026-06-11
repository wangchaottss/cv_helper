// ============================================================
// List (bullet/numbered) handling for contentEditable text elements
// Supports: bullet (ul), numbered (ol)
// Key behaviors:
//   Enter  → auto-continue same-level prefix (browser default)
//   Tab    → indent to deeper nesting level
//   Backspace at start of item → outdent or remove prefix
// ============================================================

/**
 * Find the closest ancestor element matching `tagName`.
 */
function findAncestor<T extends HTMLElement = HTMLElement>(node: Node | null, tagName: string): T | null {
  let current: Node | null = node;
  while (current) {
    if (current.nodeType === Node.ELEMENT_NODE && (current as HTMLElement).tagName === tagName) {
      return current as T;
    }
    current = current.parentNode;
  }
  return null;
}

/**
 * Check whether the cursor is at the very beginning of a list item (offset 0).
 */
export function isAtStartOfListItem(): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;

  const range = sel.getRangeAt(0);
  if (!range.collapsed) return false;

  // Walk from startContainer upward; if we're inside an LI, check offset
  const li = findAncestor<HTMLLIElement>(range.startContainer, 'LI');
  if (!li) return false;

  // Check if the cursor is at offset 0 in the start container
  if (range.startOffset !== 0) return false;

  // If the startContainer is the <li> itself, offset 0 means at the very start
  if (range.startContainer === li) return true;

  // If the startContainer is a child of <li>, offset 0 means it's before any text
  // But we also need to ensure there's no text node before this child
  // Walk to see if there's any non-empty text node before the cursor position
  let node: Node | null = li.firstChild;
  while (node && node !== range.startContainer) {
    if (node.nodeType === Node.TEXT_NODE && (node.textContent?.length ?? 0) > 0) {
      return false; // There's text before the cursor
    }
    node = node.nextSibling;
  }

  return true;
}

/**
 * Toggle bullet (unordered) list on the current selection.
 * If inside a <ul>, unwrap it. Otherwise wrap in <ul>.
 */
export function toggleBulletList(): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const range = sel.getRangeAt(0);

  // If already inside a <ul>, unwrap it
  const ul = findAncestor<HTMLUListElement>(range.commonAncestorContainer, 'UL');
  if (ul) {
    unwrapList(ul);
    return;
  }

  // If inside an <ol>, switch to <ul>
  const ol = findAncestor<HTMLOListElement>(range.commonAncestorContainer, 'OL');
  if (ol) {
    switchListType(ol, 'ul');
    return;
  }

  // Not in any list — wrap in <ul>
  wrapSelectionInList('ul');
}

/**
 * Toggle ordered (numbered) list on the current selection.
 */
export function toggleOrderedList(): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const range = sel.getRangeAt(0);

  // If already inside an <ol>, unwrap it
  const ol = findAncestor<HTMLOListElement>(range.commonAncestorContainer, 'OL');
  if (ol) {
    unwrapList(ol);
    return;
  }

  // If inside a <ul>, switch to <ol>
  const ul = findAncestor<HTMLUListElement>(range.commonAncestorContainer, 'UL');
  if (ul) {
    switchListType(ul, 'ol');
    return;
  }

  // Not in any list — wrap in <ol>
  wrapSelectionInList('ol');
}

/**
 * Check if the cursor is currently inside a bullet list.
 */
export function isInBulletList(): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  return findAncestor<HTMLUListElement>(range.commonAncestorContainer, 'UL') !== null;
}

/**
 * Check if the cursor is currently inside a numbered list.
 */
export function isInOrderedList(): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  return findAncestor<HTMLOListElement>(range.commonAncestorContainer, 'OL') !== null;
}

/**
 * Handle keydown events for list operations within contentEditable.
 * Returns `true` if the event was handled (caller should preventDefault + stopPropagation).
 */
export function handleListKeyDown(e: { key: string; shiftKey: boolean }): boolean {
  if (e.key === 'Tab' && !e.shiftKey) {
    return handleTabIndent();
  }

  if (e.key === 'Tab' && e.shiftKey) {
    return handleBackspaceOutdent();
  }

  if (e.key === 'Backspace') {
    if (isAtStartOfListItem()) {
      return handleBackspaceOutdent();
    }
  }

  return false;
}

// ============================================================
// Internal helpers
// ============================================================

/**
 * Tab pressed inside a list item — increase nesting level.
 * Wraps the current <li> in a new sub-list of the same type.
 */
function handleTabIndent(): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;

  const range = sel.getRangeAt(0);
  const li = findAncestor<HTMLLIElement>(range.commonAncestorContainer, 'LI');
  if (!li) return false;

  const parentList = li.parentElement;
  if (!parentList || (parentList.tagName !== 'UL' && parentList.tagName !== 'OL')) return false;

  // Find the <li> before this one (to nest under)
  const prevLi = li.previousElementSibling;
  if (prevLi && prevLi.tagName === 'LI') {
    // Check if prevLi already has a sublist (direct children only)
    const directChildren = Array.from(prevLi.children);
    const existingList = directChildren.find(
      (c) => c.tagName === 'UL' || c.tagName === 'OL',
    );

    if (existingList) {
      // Append to existing sublist
      existingList.appendChild(li);
    } else {
      // Create new sublist under prevLi
      const newSub = document.createElement(parentList.tagName);
      newSub.appendChild(li);
      prevLi.appendChild(newSub);
    }

    // Restore cursor inside the (now nested) <li>
    restoreCursor(li);
    return true;
  }

  // First item in the list — cannot indent further
  return false;
}

/**
 * Backspace at start of list item, or Shift+Tab — decrease nesting level.
 * If already at the top level, remove the list (convert to plain text).
 */
function handleBackspaceOutdent(): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;

  const range = sel.getRangeAt(0);
  const li = findAncestor<HTMLLIElement>(range.commonAncestorContainer, 'LI');
  if (!li) return false;

  const parentList = li.parentElement;
  if (!parentList || (parentList.tagName !== 'UL' && parentList.tagName !== 'OL')) return false;

  // Check if this <li> is nested (parent <ul>/<ol> is inside another <li>)
  const grandparentLi = parentList.parentElement?.closest('li') as HTMLLIElement | null;

  if (grandparentLi) {
    // Nested — outdent: move this <li> after the grandparent <li>
    const grandparentList = grandparentLi.parentElement;
    if (grandparentList && (grandparentList.tagName === 'UL' || grandparentList.tagName === 'OL')) {
      // Move this <li> and any following siblings after the grandparent <li>
      grandparentList.insertBefore(li, grandparentLi.nextSibling);

      // Move remaining siblings
      while (li.nextSibling) {
        grandparentList.insertBefore(li.nextSibling, grandparentLi.nextSibling);
      }

      // If the sub-list is now empty, remove it
      if (parentList.children.length === 0) {
        parentList.remove();
      }

      restoreCursor(li);
      return true;
    }
  }

  // Top-level list item — remove the prefix from this item only
  // If this is the ONLY <li> in the list, unwrap the entire list
  if (parentList.childElementCount === 1) {
    unwrapList(parentList as HTMLUListElement | HTMLOListElement);
    return true;
  }

  // Multiple items — convert only this <li> to plain text, split list
  convertSingleItemToText(li, parentList);
  return true;
}

/**
 * Unwrap a <ul> or <ol>, converting its <li> children to plain text blocks.
 */
function unwrapList(list: HTMLUListElement | HTMLOListElement): void {
  const parent = list.parentNode;
  if (!parent) return;

  const fragment = document.createDocumentFragment();

  for (const li of Array.from(list.children)) {
    // First recursively unwrap any nested lists inside this <li>
    const nestedLists = li.querySelectorAll('ul, ol');
    for (const nl of Array.from(nestedLists).reverse()) {
      unwrapList(nl as HTMLUListElement | HTMLOListElement);
    }

    // Move children out of the <li>
    while (li.firstChild) {
      fragment.appendChild(li.firstChild);
    }
    // Add a <br> separator between items
    fragment.appendChild(document.createElement('br'));
  }

  // Remove last <br> if present
  if (fragment.lastChild?.nodeName === 'BR') {
    fragment.removeChild(fragment.lastChild);
  }

  parent.replaceChild(fragment, list);
  parent.normalize();
}

/**
 * Convert a single <li> to plain text, handling list splitting.
 * The <li> becomes text content outside the list.
 * If the <li> has preceding siblings, the list is split in two.
 */
function convertSingleItemToText(li: HTMLLIElement, parentList: Element): void {
  const fragment = document.createDocumentFragment();

  // Unwrap any nested lists inside this <li>
  const nestedLists = li.querySelectorAll('ul, ol');
  for (const nl of Array.from(nestedLists).reverse()) {
    unwrapList(nl as HTMLUListElement | HTMLOListElement);
  }

  // Move children out of the <li>
  while (li.firstChild) {
    fragment.appendChild(li.firstChild);
  }
  // Add a <br> for line break
  fragment.appendChild(document.createElement('br'));

  // Insert the text content after the list
  parentList.parentNode?.insertBefore(fragment, parentList.nextSibling);

  // Remove the now-empty <li>
  li.remove();

  // If the list is now empty or has no <li> children, remove it
  if (parentList.children.length === 0 || parentList.querySelector('li') === null) {
    parentList.remove();
  }

  // Try to place cursor in the newly inserted text
  const sel = window.getSelection();
  if (sel) {
    const newRange = document.createRange();
    const firstText = fragment.firstChild;
    if (firstText) {
      newRange.setStart(firstText, 0);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
  }
}

/**
 * Switch a list from one type to another (ul → ol or ol → ul).
 */
function switchListType(list: HTMLUListElement | HTMLOListElement, newTag: string): void {
  const newList = document.createElement(newTag);
  while (list.firstChild) {
    newList.appendChild(list.firstChild);
  }
  // Copy attributes
  for (const attr of Array.from(list.attributes)) {
    newList.setAttribute(attr.name, attr.value);
  }
  list.parentNode?.replaceChild(newList, list);
}

/**
 * Wrap the current selection (or current line) in a list.
 */
function wrapSelectionInList(tag: 'ul' | 'ol'): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const range = sel.getRangeAt(0);
  const list = document.createElement(tag);
  const li = document.createElement('li');

  if (range.collapsed) {
    // No text selected — wrap the entire text block/line
    // Split content by <br> to create individual <li> items
    const block = getCurrentBlock(range);
    if (block) {
      // Move block contents into list, splitting by <br>
      const children = Array.from(block.childNodes);
      let currentLi = document.createElement('li');

      for (const child of children) {
        if (child.nodeName === 'BR') {
          // <br> acts as line separator → new list item
          if (currentLi.hasChildNodes() || list.children.length > 0) {
            if (!currentLi.hasChildNodes()) {
              currentLi.appendChild(document.createElement('br'));
            }
            list.appendChild(currentLi);
            currentLi = document.createElement('li');
          }
        } else {
          currentLi.appendChild(child.cloneNode(true));
        }
      }
      // Handle last item
      if (currentLi.hasChildNodes()) {
        list.appendChild(currentLi);
      }

      // Clear block and insert list
      block.innerHTML = '';
      block.appendChild(list);

      // Place cursor inside the first <li>
      const firstLi = list.firstChild;
      if (firstLi) {
        const newRange = document.createRange();
        const firstChild = firstLi.firstChild;
        if (firstChild) {
          newRange.setStart(firstChild, 0);
        } else {
          newRange.setStart(firstLi, 0);
        }
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
      return;
    }
  }

  // Has selection — wrap selected content in a single <li>
  try {
    const contents = range.extractContents();
    li.appendChild(contents);
    if (!li.hasChildNodes()) {
      li.appendChild(document.createElement('br'));
    }
    list.appendChild(li);
    range.insertNode(list);

    // Place cursor inside the <li>
    const newRange = document.createRange();
    newRange.setStart(li.firstChild || li, 0);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
  } catch {
    // Range may be invalid; silently ignore
  }
}

/**
 * Determine the current contentEditable block containing the cursor.
 */
function getCurrentBlock(range: Range): HTMLElement | null {
  const editableRoot = findAncestor(range.commonAncestorContainer, 'DIV');
  if (editableRoot && editableRoot.isContentEditable) {
    return editableRoot;
  }
  return null;
}

/**
 * Try to restore the cursor at the beginning of a given element's first text child.
 */
function restoreCursor(target: HTMLElement): void {
  const sel = window.getSelection();
  if (!sel) return;

  // Find the first text node within target
  const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
  const firstText = walker.nextNode();

  const newRange = document.createRange();
  if (firstText) {
    newRange.setStart(firstText, 0);
  } else {
    newRange.setStart(target, 0);
  }
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);
}
