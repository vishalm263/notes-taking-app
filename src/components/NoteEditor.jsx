import { useCallback, useEffect, useState } from 'react';
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
  const [editorReady, setEditorReady] = useState(false);
  
  const debouncedSave = useCallback(
    debounce((noteId, content) => {
      if (currentUser && noteId && noteId !== 'temp-new-note') {
        updateNote(noteId, { content })
          .then(updatedNote => {
            onSave && onSave(updatedNote);
          })
          .catch(error => {
            console.error('Error saving note:', error);
          });
      } else if (noteId === 'temp-new-note' && onSave) {
        // For new notes, just pass the content up to the parent
        onSave(content);
      }
    }, 1000),
    [currentUser, onSave]
  );

  // Safe content update function
  const safeUpdateContent = useCallback((content) => {
    try {
      if (!content) return;
      
      // Remove any problematic characters or patterns if needed
      const sanitizedContent = content;
      
      // Update the active note in the store
      updateActiveNote({ content: sanitizedContent });
      
      // Save to backend if applicable
      if (note?.id) {
        debouncedSave(note.id, sanitizedContent);
      }
    } catch (error) {
      console.error('Error updating content:', error);
    }
  }, [note?.id, debouncedSave, updateActiveNote]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    content: note?.content || '<p></p>',
    onUpdate: ({ editor }) => {
      try {
        const content = editor.getHTML();
        safeUpdateContent(content);
      } catch (error) {
        console.error('Error in editor update:', error);
      }
    },
    onFocus: () => {
      // Add any focus handling here if needed
    },
    onBlur: () => {
      // Add any blur handling here if needed
    },
    editorProps: {
      handleDOMEvents: {
        // Add error handling for key events
        keydown: (view, event) => {
          try {
            // Normal key handling
            return false; // Let the default handler work
          } catch (error) {
            console.error('Error handling keydown in editor:', error);
            return true; // Prevent default to avoid cascading errors
          }
        }
      },
      // Add error handling for cursor position issues
      handleClick: (view, pos, event) => {
        try {
          // Validate position is within bounds
          const docSize = view.state.doc.content.size;
          if (pos > docSize) {
            console.warn(`Invalid position ${pos}, doc size is ${docSize}`);
            return true; // Prevent default
          }
          return false; // Let default handler work
        } catch (error) {
          console.error('Error handling click in editor:', error);
          return true; // Prevent default
        }
      }
    }
  }, [note?.content]);

  // Update editor content when the note changes
  useEffect(() => {
    if (editor && note?.content && !editorReady) {
      try {
        // Check if content needs to be updated
        if (editor.getHTML() !== note.content) {
          editor.commands.setContent(note.content);
        }
        setEditorReady(true);
      } catch (error) {
        console.error('Error setting editor content:', error);
        // Fallback to a simple paragraph if there's an error
        editor.commands.setContent('<p></p>');
      }
    }
  }, [editor, note?.content, editorReady]);

  if (!editor) {
    return <div className="p-4">Loading editor...</div>;
  }

  return (
    <div className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none">
      <div className="border-b pb-2 mb-4 flex flex-wrap gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active bg-muted' : ''}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active bg-muted' : ''}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'is-active bg-muted' : ''}
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'is-active bg-muted' : ''}
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? 'is-active bg-muted' : ''}
        >
          <Heading3 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'is-active bg-muted' : ''}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'is-active bg-muted' : ''}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={editor.isActive('codeBlock') ? 'is-active bg-muted' : ''}
        >
          <Code className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive('blockquote') ? 'is-active bg-muted' : ''}
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>
      <div 
        className="min-h-[300px] focus-within:outline-none"
        onClick={() => {
          try {
            editor.commands.focus('end');
          } catch (error) {
            console.error('Error focusing editor:', error);
            // Try a safer focus method
            try {
              editor.commands.focus();
            } catch (innerError) {
              console.error('Failed to focus editor:', innerError);
            }
          }
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default NoteEditor; 