"use client";

import { Extension } from "@tiptap/core";
import Bold from "@tiptap/extension-bold";
import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import Italic from "@tiptap/extension-italic";
import Link from "@tiptap/extension-link";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Underline from "@tiptap/extension-underline";
import { UndoRedo } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  BoldIcon,
  ItalicIcon,
  Redo2Icon,
  UnderlineIcon,
  Undo2Icon,
} from "lucide-react";
import { useEffect, useRef } from "react";

import { Label } from "@/components/ui/label";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  EditorLinkButton,
  EditorToolbarButton,
  VariableMenu,
} from "./email-markdown-editor-controls";

export type EmailTemplateVariable = {
  label: string;
  value: string;
};

type EmailMarkdownEditorProps = {
  label: string;
  onChange: (value: string) => void;
  value: string;
  variables: EmailTemplateVariable[];
};

type MarkdownEditor = Editor & {
  getMarkdown: () => string;
};

const variablePattern = /\{\{?[a-zA-Z0-9_.-]+\}\}?/g;

const VariableHighlight = Extension.create({
  name: "variableHighlight",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations(state) {
            return buildVariableDecorations(state.doc);
          },
        },
      }),
    ];
  },
});

export function EmailMarkdownEditor({
  label,
  onChange,
  value,
  variables,
}: EmailMarkdownEditorProps) {
  const editor = useEmailMarkdownEditor(value, onChange, label);

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-2">
        <Label>{label}</Label>
        <EmailEditorSurface editor={editor} variables={variables} />
      </div>
    </TooltipProvider>
  );
}

function useEmailMarkdownEditor(
  value: string,
  onChange: (value: string) => void,
  label: string,
) {
  const editor = useEditor({
    content: markdownToEditorContent(value),
    contentType: "markdown",
    editorProps: {
      attributes: {
        "aria-label": label,
        class:
          "min-h-72 px-3 py-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&_a]:cursor-text [&_a]:text-blue-600 [&_a]:underline [&_p]:my-0 [&_p+br]:hidden",
        dir: "auto",
      },
    },
    extensions: [
      Markdown,
      Document,
      Paragraph,
      Text,
      Bold,
      Italic,
      Underline,
      UndoRedo,
      Link.configure({
        HTMLAttributes: {
          class: "text-blue-600 underline",
          "data-turbo": "false",
        },
        openOnClick: false,
      }),
      HardBreak.extend({
        addKeyboardShortcuts() {
          return {
            Enter: () => this.editor.commands.setHardBreak(),
          };
        },
      }),
      VariableHighlight,
    ],
    immediatelyRender: false,
    onUpdate: ({ editor: nextEditor }) =>
      onChange((nextEditor as MarkdownEditor).getMarkdown()),
  });

  useEffect(() => {
    if (!editor || editor.isFocused) {
      return;
    }

    const currentMarkdown = (editor as MarkdownEditor).getMarkdown();

    if (currentMarkdown !== value) {
      editor.commands.setContent(markdownToEditorContent(value), {
        emitUpdate: false,
        contentType: "markdown",
      });
    }
  }, [editor, value]);

  return editor;
}

function EmailEditorSurface({
  editor,
  variables,
}: {
  editor: Editor | null;
  variables: EmailTemplateVariable[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--auth-input-border)] bg-card focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50">
      <EmailEditorToolbar editor={editor} variables={variables} />
      {editor ? (
        <>
          <SelectionBubbleMenu editor={editor} />
          <EditorContent editor={editor} />
        </>
      ) : (
        <div
          aria-live="polite"
          className="min-h-72 px-3 py-4 text-sm text-muted-foreground"
          role="status"
        >
          Loading editor…
        </div>
      )}
    </div>
  );
}

function EmailEditorToolbar({
  editor,
  variables,
}: {
  editor: Editor | null;
  variables: EmailTemplateVariable[];
}) {
  const variableInsertion = useVariableInsertion(editor);

  return (
    <div className="flex min-h-10 items-center justify-between gap-3 border-b border-[var(--auth-input-border)] px-2 py-1.5">
      <div className="flex items-center gap-1">
        <EditorTextFormatButtons editor={editor} />
        <EditorLinkButton editor={editor} />
        <span className="mx-1 h-5 border-l border-[var(--auth-input-border)]" />
        <EditorHistoryButtons editor={editor} />
      </div>
      <VariableMenu
        disabled={!editor}
        onOpen={variableInsertion.rememberSelection}
        onSelectVariable={variableInsertion.insertVariable}
        variables={variables}
      />
    </div>
  );
}

function useVariableInsertion(editor: Editor | null) {
  const selectionRef = useRef<{ from: number; to: number } | null>(null);

  function rememberSelection() {
    if (editor) {
      const { from, to } = editor.state.selection;
      selectionRef.current = { from, to };
    }
  }

  function insertVariable(variable: string) {
    insertEmailVariable(editor, variable, selectionRef.current);
  }

  return { insertVariable, rememberSelection };
}

function EditorTextFormatButtons({ editor }: { editor: Editor | null }) {
  return (
    <>
      <EditorToolbarButton
        active={editor?.isActive("bold") ?? false}
        disabled={!editor}
        icon={<BoldIcon data-icon="icon-only" />}
        label="Bold"
        onClick={() => editor?.chain().focus().toggleBold().run()}
      />
      <EditorToolbarButton
        active={editor?.isActive("italic") ?? false}
        disabled={!editor}
        icon={<ItalicIcon data-icon="icon-only" />}
        label="Italic"
        onClick={() => editor?.chain().focus().toggleItalic().run()}
      />
      <EditorToolbarButton
        active={editor?.isActive("underline") ?? false}
        disabled={!editor}
        icon={<UnderlineIcon data-icon="icon-only" />}
        label="Underline"
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
      />
    </>
  );
}

function EditorHistoryButtons({ editor }: { editor: Editor | null }) {
  return (
    <>
      <EditorToolbarButton
        disabled={!editor}
        icon={<Undo2Icon data-icon="icon-only" />}
        label="Undo"
        onClick={() => editor?.chain().focus().undo().run()}
      />
      <EditorToolbarButton
        disabled={!editor}
        icon={<Redo2Icon data-icon="icon-only" />}
        label="Redo"
        onClick={() => editor?.chain().focus().redo().run()}
      />
    </>
  );
}

function SelectionBubbleMenu({ editor }: { editor: Editor }) {
  return (
    <BubbleMenu
      className="flex items-center gap-1 rounded-full border bg-popover p-1 text-popover-foreground shadow-lg"
      editor={editor}
    >
      <EditorToolbarButton
        active={editor.isActive("bold")}
        icon={<BoldIcon data-icon="icon-only" />}
        label="Bold"
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <EditorToolbarButton
        active={editor.isActive("italic")}
        icon={<ItalicIcon data-icon="icon-only" />}
        label="Italic"
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <EditorToolbarButton
        active={editor.isActive("underline")}
        icon={<UnderlineIcon data-icon="icon-only" />}
        label="Underline"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      />
      <EditorLinkButton editor={editor} />
    </BubbleMenu>
  );
}

function insertEmailVariable(
  editor: Editor | null,
  variable: string,
  selection: { from: number; to: number } | null,
) {
  if (!editor) {
    return;
  }

  const { from, to } = selection ?? editor.state.selection;
  const text = `{${variable}}`;

  if (variable.includes("link") && from !== to) {
    editor.chain().focus().setTextSelection({ from, to }).setLink({ href: text }).run();
    return;
  }

  editor
    .chain()
    .focus()
    .insertContentAt({ from, to }, { type: "text", text }, { updateSelection: true })
    .run();
}

function buildVariableDecorations(doc: ProseMirrorNode) {
  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return;
    }

    for (const match of node.text.matchAll(variablePattern)) {
      decorations.push(
        Decoration.inline(pos + match.index, pos + match.index + match[0].length, {
          class: "rounded bg-amber-100 px-1 py-0.5 text-[var(--auth-primary)]",
        }),
      );
    }
  });

  return DecorationSet.create(doc, decorations);
}

function markdownToEditorContent(value: string) {
  return (value || "").trim().replace(/ *\n/g, "<br>");
}
