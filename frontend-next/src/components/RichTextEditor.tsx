'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';
import { List, ListOrdered, Undo2, Redo2 } from 'lucide-react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        padding: '3px 7px',
        border: 'none',
        borderRadius: 3,
        background: active ? '#e8f0fe' : 'transparent',
        color: active ? '#0052cc' : '#42526e',
        fontWeight: active ? 700 : 400,
        cursor: 'pointer',
        fontSize: '0.82rem',
        lineHeight: 1,
        fontFamily: 'inherit',
        minWidth: 26,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Placeholder.configure({ placeholder: placeholder ?? 'Descreva a atividade em detalhes...' }),
    ],
    content: value || '',
    onUpdate({ editor }) {
      const html = editor.isEmpty ? '' : editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        style: [
          'min-height:96px',
          'padding:8px 10px',
          'outline:none',
          'font-size:0.9rem',
          'line-height:1.6',
          'color:#172b4d',
          'font-family:inherit',
        ].join(';'),
      },
    },
  });

  // Sync external value changes (e.g. when modal opens with an existing task)
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? '' : editor.getHTML();
    if (current !== value) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div
      style={{
        border: '1px solid #dfe1e6',
        borderRadius: 3,
        background: '#fff',
        overflow: 'hidden',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          padding: '4px 6px',
          borderBottom: '1px solid #dfe1e6',
          background: '#fafbfc',
          flexWrap: 'wrap',
        }}
      >
        <ToolbarButton title="Negrito (Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <b>B</b>
        </ToolbarButton>
        <ToolbarButton title="Itálico (Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <i>I</i>
        </ToolbarButton>
        <ToolbarButton title="Sublinhado (Ctrl+U)" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <u>U</u>
        </ToolbarButton>
        <ToolbarButton title="Tachado" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <s>S</s>
        </ToolbarButton>

        <div style={{ width: 1, height: 18, background: '#dfe1e6', margin: '0 4px' }} />

        <ToolbarButton title="Título grande" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          H1
        </ToolbarButton>
        <ToolbarButton title="Título médio" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          H2
        </ToolbarButton>
        <ToolbarButton title="Título pequeno" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          H3
        </ToolbarButton>

        <div style={{ width: 1, height: 18, background: '#dfe1e6', margin: '0 4px' }} />

        <ToolbarButton title="Lista com marcadores" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={14} />
        </ToolbarButton>
        <ToolbarButton title="Lista numerada" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={14} />
        </ToolbarButton>

        <div style={{ width: 1, height: 18, background: '#dfe1e6', margin: '0 4px' }} />

        <ToolbarButton title="Desfazer (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={13} />
        </ToolbarButton>
        <ToolbarButton title="Refazer (Ctrl+Y)" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={13} />
        </ToolbarButton>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />

      {/* Scoped styles */}
      <style>{`
        .tiptap p { margin: 0 0 4px; }
        .tiptap p:last-child { margin-bottom: 0; }
        .tiptap h1 { font-size: 1.4rem; font-weight: 700; margin: 8px 0 4px; }
        .tiptap h2 { font-size: 1.15rem; font-weight: 700; margin: 6px 0 4px; }
        .tiptap h3 { font-size: 1rem; font-weight: 700; margin: 4px 0 4px; }
        .tiptap ul, .tiptap ol { padding-left: 20px; margin: 4px 0; }
        .tiptap li { margin: 2px 0; }
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  );
}
