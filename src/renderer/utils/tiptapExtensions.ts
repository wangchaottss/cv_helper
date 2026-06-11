import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/core';

// Global reference to the currently focused editor, for use by
// PropertyPanel and other UI that lives outside the editor component.
let _activeEditor: Editor | null = null;

export function getActiveEditor(): Editor | null { return _activeEditor; }
export function setActiveEditor(ed: Editor | null) { _activeEditor = ed; }

// Custom FontSize extension — TiPat doesn't have an official one.
// Uses style attribute on <span> tags, compatible with TextStyle.
export const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el) => el.style.fontSize?.replace(/['"]/g, '') || null,
            renderHTML: (attrs) => {
              if (!attrs.fontSize) return {};
              return { style: `font-size: ${attrs.fontSize}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});
