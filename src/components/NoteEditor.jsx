import { useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { Button } from './ui/button';
import { useNoteStore } from '../lib/store';
import { debounce } from '../lib/utils';
import { updateNote } from '../services/noteService';
import { useAuth } from '../contexts/AuthContext';
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo,
  Link
} from 'lucide-react';

// Create an instance of lowlight with common languages
const lowlight = createLowlight(common);

const NoteEditor = ({ note, onSave }) => {
  const { currentUser } = useAuth();
  const updateActiveNote = useNoteStore(state => state.updateActiveNote);
  
  const debouncedSave = useCallback(
    debounce((noteId, content) => {
      if (currentUser && noteId) {
        updateNote(noteId, { content })
          .then(updatedNote => {
            onSave && onSave(updatedNote);
          })
          .catch(error => {
            console.error('Error saving note:', error);
          });
      }
    }, 1000),
    [currentUser, onSave]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        languageClassPrefix: 'language-',
      }),
    ],
    content: note?.content || '',
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      // Update local state immediately
      updateActiveNote({ content });
      // Debounce save to database
      debouncedSave(note?.id, content);
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-xl focus:outline-none max-w-none min-h-[300px] p-4',
      },
    },
  }, [note?.id]);

  useEffect(() => {
    if (editor && note?.content && editor.getHTML() !== note.content) {
      editor.commands.setContent(note.content);
    }
  }, [editor, note?.id, note?.content]);

  if (!editor) {
    return <div className="h-96 w-full flex items-center justify-center">Loading editor...</div>;
  }

  return (
    <div className="flex flex-col h-full border rounded-md shadow-sm">
      <div className="border-b p-2 flex flex-wrap gap-1">
        <EditorToolbarButton 
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          icon={<Bold className="h-4 w-4" />}
          title="Bold"
        />
        <EditorToolbarButton 
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          icon={<Italic className="h-4 w-4" />}
          title="Italic"
        />
        <EditorToolbarButton 
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          icon={<Underline className="h-4 w-4" />}
          title="Underline"
        />
        <div className="w-px h-6 bg-border mx-1" />
        <EditorToolbarButton 
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          icon={<Heading1 className="h-4 w-4" />}
          title="Heading 1"
        />
        <EditorToolbarButton 
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          icon={<Heading2 className="h-4 w-4" />}
          title="Heading 2"
        />
        <EditorToolbarButton 
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          icon={<Heading3 className="h-4 w-4" />}
          title="Heading 3"
        />
        <div className="w-px h-6 bg-border mx-1" />
        <EditorToolbarButton 
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          icon={<List className="h-4 w-4" />}
          title="Bullet List"
        />
        <EditorToolbarButton 
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          icon={<ListOrdered className="h-4 w-4" />}
          title="Ordered List"
        />
        <EditorToolbarButton 
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          icon={<Quote className="h-4 w-4" />}
          title="Blockquote"
        />
        <EditorToolbarButton 
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          icon={<Code className="h-4 w-4" />}
          title="Code Block"
        />
        <div className="w-px h-6 bg-border mx-1" />
        <EditorToolbarButton 
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          icon={<Undo className="h-4 w-4" />}
          title="Undo"
        />
        <EditorToolbarButton 
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          icon={<Redo className="h-4 w-4" />}
          title="Redo"
        />
      </div>
      <div className="flex-grow overflow-y-auto bg-background">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
};

const EditorToolbarButton = ({ onClick, isActive, disabled, icon, title }) => {
  return (
    <Button
      type="button"
      variant={isActive ? "secondary" : "ghost"}
      size="icon"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="h-8 w-8"
    >
      {icon}
    </Button>
  );
};

export default NoteEditor; 