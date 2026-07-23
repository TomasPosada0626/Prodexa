'use client';

import { useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import { TextStyle } from '@tiptap/extension-text-style';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ImagePlus,
  Loader2,
} from 'lucide-react';
import { ApiError, uploadImage } from '@/lib/api';
import { useToast } from '@/context/toast-context';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
const API_ORIGIN = API_URL.replace(/\/api\/v1\/?$/, '');

/** Las imagenes suben al backend y quedan con una URL relativa (/uploads/...): la resolvemos
 * contra el origen de la API para que el <img> del editor apunte al servidor correcto. */
export function resolveImageUrl(url: string): string {
  return url.startsWith('/') ? `${API_ORIGIN}${url}` : url;
}

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/**
 * Extiende la marca textStyle de Tiptap con atributos fontSize y fontFamily, aplicados
 * ambos como estilo inline. Se hace a mano (en vez de usar el paquete @tiptap/extension-font-family)
 * porque dos extensiones separadas registrando la misma marca "textStyle" chocan entre si
 * y una de las dos termina sin sus comandos disponibles.
 */
const CustomTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.fontSize || null,
        renderHTML: (attributes: { fontSize?: string | null }) => {
          if (!attributes.fontSize) return {};
          return { style: `font-size: ${attributes.fontSize}` };
        },
      },
      fontFamily: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.fontFamily || null,
        renderHTML: (attributes: { fontFamily?: string | null }) => {
          if (!attributes.fontFamily) return {};
          return { style: `font-family: ${attributes.fontFamily}` };
        },
      },
    };
  },
});

const FONT_FAMILIES = [
  { label: 'Por defecto', value: '' },
  { label: 'Sans (Inter)', value: 'Inter, sans-serif' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Monoespaciada', value: '"Courier New", monospace' },
];

const FONT_SIZES = [
  { label: 'Tamano', value: '' },
  { label: '10px', value: '10px' },
  { label: '12px', value: '12px' },
  { label: '14px', value: '14px' },
  { label: '16px', value: '16px' },
  { label: '18px', value: '18px' },
  { label: '20px', value: '20px' },
  { label: '24px', value: '24px' },
  { label: '28px', value: '28px' },
  { label: '32px', value: '32px' },
  { label: '40px', value: '40px' },
];

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`grid h-7 w-7 place-items-center rounded-md text-sm font-semibold transition ${
        active
          ? 'bg-sky-700 text-white dark:bg-[#8B5CF6]'
          : 'text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-0.5 my-1 w-px bg-slate-200 dark:bg-white/10" />;
}

function Toolbar({ editor }: { editor: Editor }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);

  function handleImagePick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      editor.chain().focus().setImage({ src: resolveImageUrl(url) }).run();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'No se pudo subir la imagen.', 'error');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 p-1.5 dark:border-white/10">
      <ToolbarButton label="Negrita" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-3.5 w-3.5" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        label="Cursiva"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-3.5 w-3.5" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        label="Subrayado"
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-3.5 w-3.5" aria-hidden />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        label="Alinear a la izquierda"
        active={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
      >
        <AlignLeft className="h-3.5 w-3.5" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        label="Centrar"
        active={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
      >
        <AlignCenter className="h-3.5 w-3.5" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        label="Alinear a la derecha"
        active={editor.isActive({ textAlign: 'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
      >
        <AlignRight className="h-3.5 w-3.5" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        label="Justificar"
        active={editor.isActive({ textAlign: 'justify' })}
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
      >
        <AlignJustify className="h-3.5 w-3.5" aria-hidden />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        label="Lista numerada"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-3.5 w-3.5" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        label="Lista con vinetas"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-3.5 w-3.5" aria-hidden />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton label={uploading ? 'Subiendo imagen...' : 'Adjuntar imagen'} onClick={handleImagePick}>
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <ImagePlus className="h-3.5 w-3.5" aria-hidden />
        )}
      </ToolbarButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        disabled={uploading}
        onChange={handleFileSelected}
      />

      <ToolbarDivider />

      <select
        aria-label="Tipografia"
        className="h-7 rounded-md border border-slate-200 bg-white px-1 text-xs text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
        value={editor.getAttributes('textStyle').fontFamily ?? ''}
        onChange={(e) => {
          editor.chain().focus().setMark('textStyle', { fontFamily: e.target.value || null }).run();
        }}
      >
        {FONT_FAMILIES.map((font) => (
          <option key={font.label} value={font.value} className="text-slate-900" style={{ fontFamily: font.value || undefined }}>
            {font.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Tamano de letra"
        className="h-7 rounded-md border border-slate-200 bg-white px-1 text-xs text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
        value={editor.getAttributes('textStyle').fontSize ?? ''}
        onChange={(e) => {
          editor.chain().focus().setMark('textStyle', { fontSize: e.target.value || null }).run();
        }}
      >
        {FONT_SIZES.map((size) => (
          <option key={size.label} value={size.value} className="text-slate-900">
            {size.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function RichTextEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ HTMLAttributes: { class: 'rounded-lg max-w-full' } }),
      CustomTextStyle,
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none min-h-32 px-3 py-2 focus:outline-none',
        'data-placeholder': placeholder ?? '',
      },
    },
    onUpdate: ({ editor: updatedEditor }) => onChange(updatedEditor.getHTML()),
  });

  if (!editor) {
    return <div className="min-h-32 rounded-lg border border-slate-300 bg-slate-50 dark:border-white/10 dark:bg-white/3" />;
  }

  return (
    <div className="rounded-lg border border-slate-300 bg-white dark:border-white/10 dark:bg-white/5">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
