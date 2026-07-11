const API_BASE = "/api/content";
const urlParams = new URLSearchParams(window.location.search);
const storyId = urlParams.get('story_id');
const chapterId = urlParams.get('chapter_id');
const token = localStorage.getItem('token') || sessionStorage.getItem('token');

if (!token || !storyId || !chapterId) {
    window.location.href = '/dashboard.html';
}

// Setup Back button
document.getElementById('backToWorkspace').href = `/workspace.html?story_id=${storyId}`;

// Register custom Comment blot
var Inline = Quill.import('blots/inline');
class CommentBlot extends Inline {
  static create(value) {
    let node = super.create();
    node.setAttribute('data-comment-id', value);
    return node;
  }
  static formats(node) {
    return node.getAttribute('data-comment-id');
  }
}
CommentBlot.blotName = 'comment';
CommentBlot.tagName = 'span';
CommentBlot.className = 'comment-marker';
Quill.register(CommentBlot);

// Custom Image Handler
const imageHandler = () => {
    const url = prompt("Enter Image URL (leave blank to upload a file instead):");
    if (url) {
        const range = quill.getSelection(true);
        quill.insertEmbed(range.index, 'image', url);
        return;
    }
    
    // File upload fallback
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
        const file = input.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('file', file);
            
            try {
                const res = await fetch(`${API_BASE}/upload/image`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                
                if (res.ok) {
                    const data = await res.json();
                    const range = quill.getSelection(true);
                    quill.insertEmbed(range.index, 'image', data.url);
                } else {
                    alert("Image upload failed");
                }
            } catch (err) {
                console.error(err);
                alert("Upload failed");
            }
        }
    };
};

// Determine toolbar options based on settings
const mediaEnabled = localStorage.getItem('mediaEnabled') !== 'false';
const mediaToolbar = mediaEnabled ? ['blockquote', 'image', 'video'] : ['blockquote'];

// Initialize Quill
var quill = new Quill('#editor-container', {
    modules: {
        formula: true,
        toolbar: {
            container: [
                [{ header: [1, 2, 3, 4, 5, 6, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                mediaToolbar,
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'align': [] }],
                ['clean']
            ],
            handlers: {
                image: imageHandler
            }
        }
    },
    placeholder: 'Start writing your chapter here...',
    theme: 'snow'
});

// UI Elements
const titleInput = document.getElementById('chapterTitle');
const saveStatus = document.getElementById('saveStatus');

let saveTimeout = null;
let isSaving = false;

// Icons for save status
const iconSaved = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Saved`;
const iconSaving = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg> Saving...`;
const iconUnsaved = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Unsaved Changes`;

function updateSaveStatus(state) {
    if (state === 'saved') {
        saveStatus.innerHTML = iconSaved;
        saveStatus.style.color = 'var(--text-muted)';
    } else if (state === 'saving') {
        saveStatus.innerHTML = iconSaving;
        saveStatus.style.color = 'var(--accent-color)';
    } else if (state === 'unsaved') {
        saveStatus.innerHTML = iconUnsaved;
        saveStatus.style.color = '#ff9800';
    }
}

// Fetch Chapter Data
async function loadChapter() {
    try {
        const res = await fetch(`${API_BASE}/chapters/${chapterId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const chapter = await res.json();
            titleInput.value = chapter.title;
            const typeSelect = document.getElementById('chapterTypeSelect');
            if(typeSelect && chapter.type) {
                typeSelect.value = chapter.type;
            }
            if (chapter.content) {
                quill.clipboard.dangerouslyPasteHTML(chapter.content);
            }
            quill.history.clear();
            setTimeout(renderCommentGutterIcons, 100);
        }
    } catch(e) {
        console.error(e);
    }
}

// Autosave Logic (Debounce 5 seconds)
function triggerAutosave() {
    updateSaveStatus('unsaved');
    if (saveTimeout) clearTimeout(saveTimeout);
    
    saveTimeout = setTimeout(() => {
        performSave();
    }, 5000);
}

async function performSave() {
    if (isSaving) return;
    isSaving = true;
    updateSaveStatus('saving');
    
    const content = quill.root.innerHTML;
    const title = titleInput.value.trim() || "Untitled Chapter";
    const typeSelect = document.getElementById('chapterTypeSelect');
    const type = typeSelect ? typeSelect.value : "Standard Chapter";
    
    try {
        const res = await fetch(`${API_BASE}/chapters/${chapterId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ title, content, type })
        });
        
        if (res.ok) {
            updateSaveStatus('saved');
            renderCommentGutterIcons();
        } else {
            updateSaveStatus('unsaved');
        }
    } catch(e) {
        console.error(e);
        updateSaveStatus('unsaved');
    } finally {
        isSaving = false;
    }
}

// Notes Panel Toggle
const notesPanel = document.getElementById('notesPanel');
function toggleNotes() {
    notesPanel.classList.toggle('open');
}

// ==========================================
// Comments Logic
// ==========================================

const addCommentBtn = document.getElementById('addCommentBtn');
const viewCommentPopup = document.getElementById('viewCommentPopup');
const commentTextInput = document.getElementById('commentTextInput');
const saveCommentBtn = document.getElementById('saveCommentBtn');
const deleteCommentBtn = document.getElementById('deleteCommentBtn');

let currentSelection = null;
let activeCommentId = null;

// Hide popups when clicking outside
document.addEventListener('mousedown', (e) => {
    // If we click outside the add button and outside the popup, close them
    // Note: If clicking a gutter icon, mousedown closes the popup, but the click event immediately reopens it.
    if (!addCommentBtn.contains(e.target) && !viewCommentPopup.contains(e.target) && !e.target.closest('.gutter-comment-icon')) {
        addCommentBtn.style.display = 'none';
        viewCommentPopup.style.display = 'none';
    }
});

// Show "Add Comment" button on selection
quill.on('selection-change', function(range, oldRange, source) {
    if (range && range.length > 0) {
        const bounds = quill.getBounds(range.index, range.length);
        const wrapperRect = document.querySelector('.document-wrapper').getBoundingClientRect();
        
        addCommentBtn.style.display = 'flex';
        // Position on the right side of the document wrapper
        addCommentBtn.style.left = (wrapperRect.width - 46) + 'px'; // 36px width + 10px padding
        // Calculate top relative to document wrapper (chapterTitle is above editor)
        const editorContainer = document.getElementById('editor-container');
        addCommentBtn.style.top = (editorContainer.offsetTop + bounds.top) + 'px';
        
        currentSelection = range;
    } else {
        if (!viewCommentPopup.contains(document.activeElement)) {
            addCommentBtn.style.display = 'none';
        }
    }
});

// Click "Add Comment" -> Highlight text and open popup
addCommentBtn.addEventListener('click', () => {
    if (currentSelection) {
        const tempId = 'new';
        quill.formatText(currentSelection.index, currentSelection.length, 'comment', tempId);
        
        activeCommentId = tempId;
        commentTextInput.value = "";
        
        const bounds = quill.getBounds(currentSelection.index);
        const wrapperRect = document.querySelector('.document-wrapper').getBoundingClientRect();
        const editorContainer = document.getElementById('editor-container');
        
        viewCommentPopup.style.display = 'flex';
        
        // Position it nicely inside the document wrapper
        const popupWidth = 312; // 280 + 32 padding
        viewCommentPopup.style.left = (wrapperRect.width - popupWidth - 30) + 'px';
        viewCommentPopup.style.top = (editorContainer.offsetTop + bounds.top) + 'px';
        
        addCommentBtn.style.display = 'none';
        deleteCommentBtn.style.display = 'none'; // Cannot delete unsaved comment
        commentTextInput.focus();
    }
});

// Render side-icons for all comments
function renderCommentGutterIcons() {
    const gutter = document.getElementById('commentsGutter');
    if (!gutter) return;
    
    gutter.innerHTML = '';
    const renderedIds = new Set();
    const markers = document.querySelectorAll('.comment-marker');
    
    const positionOffsets = {};

    markers.forEach(marker => {
        const commentId = marker.getAttribute('data-comment-id');
        if (!commentId || commentId === 'new') return;
        if (renderedIds.has(commentId)) return;
        
        renderedIds.add(commentId);
        
        const icon = document.createElement('div');
        icon.className = 'gutter-comment-icon';
        icon.setAttribute('data-icon-id', commentId);
        // It's just a blue dot now, no SVG needed
        icon.innerHTML = '';
        
        const editorContainer = document.getElementById('editor-container');
        const wrapperRect = document.querySelector('.document-wrapper').getBoundingClientRect();
        const markerRect = marker.getBoundingClientRect();
        
        // Calculate top position relative to document-wrapper
        let topPos = Math.round(markerRect.top - wrapperRect.top);
        
        // If there's already a dot at this exact position (or very close), shift it down
        let offset = 0;
        while (positionOffsets[topPos + offset]) {
            offset += 16;
        }
        positionOffsets[topPos + offset] = true;
        
        icon.style.top = (topPos + offset) + 'px';
        
        icon.addEventListener('click', async (e) => {
            activeCommentId = commentId;
            deleteCommentBtn.style.display = 'inline-block';
            
            viewCommentPopup.style.display = 'flex';
            
            // Position popup relative to document-wrapper
            const popupWidth = 312;
            viewCommentPopup.style.left = (wrapperRect.width - popupWidth - 30) + 'px';
            viewCommentPopup.style.top = icon.offsetTop + 'px';
            
            try {
                const res = await fetch(`${API_BASE}/chapters/${chapterId}/comments`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const comments = await res.json();
                    const comment = comments.find(c => c.id == commentId);
                    if (comment) {
                        commentTextInput.value = comment.content;
                    }
                }
            } catch (err) {
                console.error(err);
            }
        });
        
        gutter.appendChild(icon);
    });
}

// Cancel Comment
const cancelCommentBtn = document.getElementById('cancelCommentBtn');
cancelCommentBtn.addEventListener('click', () => {
    viewCommentPopup.style.display = 'none';
    if (activeCommentId === 'new' && currentSelection) {
        // Remove formatting if it was unsaved
        quill.formatText(currentSelection.index, currentSelection.length, 'comment', false);
    }
});

// Save Comment
saveCommentBtn.addEventListener('click', async () => {
    const text = commentTextInput.value.trim();
    if (!text) return;

    if (activeCommentId === 'new') {
        // Create new comment
        const selectedText = quill.getText(currentSelection.index, currentSelection.length);
        try {
            const res = await fetch(`${API_BASE}/chapters/${chapterId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    selected_text: selectedText,
                    content: text
                })
            });
            if (res.ok) {
                const newComment = await res.json();
                quill.formatText(currentSelection.index, currentSelection.length, 'comment', newComment.id);
                viewCommentPopup.style.display = 'none';
                triggerAutosave();
                renderCommentGutterIcons();
            } else {
                alert('Failed to save comment: ' + await res.text());
            }
        } catch(e) { 
            console.error(e);
            alert('Error saving comment.');
        }
    } else {
        // Update existing comment
        try {
            const res = await fetch(`${API_BASE}/comments/${activeCommentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ content: text })
            });
            if (res.ok) {
                viewCommentPopup.style.display = 'none';
            } else {
                alert('Failed to update comment: ' + await res.text());
            }
        } catch(e) { 
            console.error(e);
            alert('Error updating comment.');
        }
    }
});

// Delete Comment
deleteCommentBtn.addEventListener('click', async () => {
    if (activeCommentId && activeCommentId !== 'new') {
        try {
            const res = await fetch(`${API_BASE}/comments/${activeCommentId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                // Remove formatting from all elements with this comment ID
                const elements = document.querySelectorAll(`.comment-marker[data-comment-id="${activeCommentId}"]`);
                elements.forEach(el => {
                    const blot = Quill.find(el);
                    if (blot) {
                        const index = quill.getIndex(blot);
                        quill.formatText(index, blot.length(), 'comment', false);
                    }
                });
                viewCommentPopup.style.display = 'none';
                triggerAutosave();
                renderCommentGutterIcons();
            }
        } catch(e) { console.error(e); }
    }
});

// Event Listeners for Autosave and Re-render
quill.on('text-change', function(delta, oldDelta, source) {
    if (source === 'user') {
        triggerAutosave();
    }
    // Debounce the render for performance
    setTimeout(renderCommentGutterIcons, 50);
});
titleInput.addEventListener('input', triggerAutosave);
const typeSelectEl = document.getElementById('chapterTypeSelect');
if(typeSelectEl) {
    typeSelectEl.addEventListener('change', triggerAutosave);
}

// Load Chapter on initialization
loadChapter();
