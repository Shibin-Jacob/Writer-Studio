const API_BASE = "/api/content";
const urlParams = new URLSearchParams(window.location.search);
const storyId = urlParams.get('story_id');

// Check auth
const token = localStorage.getItem('token') || sessionStorage.getItem('token');
if (!token || !storyId) {
    window.location.href = '/dashboard.html';
}

document.getElementById('backToInfo').href = `/story_info.html?story_id=${storyId}`;

function switchTab(tabId) {
    // Hide all panels
    document.querySelectorAll('.view-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    // Remove active from nav
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
    });

    // Show selected panel
    document.getElementById(`view-${tabId}`).classList.add('active');
    document.getElementById(`nav-${tabId}`).classList.add('active');
}

async function fetchChapters() {
    try {
        const res = await fetch(`${API_BASE}/stories/${storyId}/chapters`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const chapters = await res.json();
            renderChapters(chapters);
        }
    } catch(e) {
        console.error(e);
    }
}

function renderChapters(chapters) {
    // Populate Scene Chapter Dropdowns
    const sceneFilter = document.getElementById('scenesChapterFilter');
    const sceneSelect = document.getElementById('sceneChapterSelect');
    if (sceneFilter && sceneSelect) {
        let filterHtml = '<option value="All">All Chapters</option>';
        let selectHtml = '<option value="">-- No Chapter --</option>';
        
        chapters.forEach(ch => {
            filterHtml += `<option value="${ch.id}">${ch.title}</option>`;
            selectHtml += `<option value="${ch.id}">${ch.title}</option>`;
        });
        
        // Preserve current values if possible
        const oldFilter = sceneFilter.value;
        const oldSelect = sceneSelect.value;
        
        sceneFilter.innerHTML = filterHtml;
        sceneSelect.innerHTML = selectHtml;
        
        sceneFilter.value = oldFilter;
        sceneSelect.value = oldSelect;
    }

    const container = document.getElementById('chapterList');
    if (chapters.length === 0) {
        container.innerHTML = `<div class="placeholder-state" style="height:40vh;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            <h3>No chapters found</h3>
            <p>Start writing your story by creating a new chapter.</p>
        </div>`;
        return;
    }
    
    container.innerHTML = chapters.map(ch => {
        let typeClass = 'type-standard';
        let typeName = ch.type || 'Standard Chapter';
        if (typeName === "Author's Note") typeClass = 'type-author';
        else if (typeName === "Explanation") typeClass = 'type-explanation';
        else if (typeName === "Prologue") typeClass = 'type-prologue';
        else if (typeName === "Epilogue") typeClass = 'type-epilogue';
        
        return `<div class="chapter-item" draggable="true" data-id="${ch.id}" onclick="openChapter(${ch.id})" style="cursor: pointer;">
            <div class="chapter-title-wrapper">
                <span class="drag-handle" title="Drag to reorder" onclick="event.stopPropagation()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>
                </span>
                <span class="chapter-title">${ch.title} <span class="type-badge ${typeClass}">${typeName}</span></span>
            </div>
            <span style="color: var(--text-muted); font-size: 0.9rem;">Click to edit &rarr;</span>
        </div>
    `}).join('');

    initDragAndDrop(container);
}

function initDragAndDrop(container) {
    const draggables = container.querySelectorAll('.chapter-item');
    
    draggables.forEach(draggable => {
        draggable.addEventListener('dragstart', () => {
            draggable.classList.add('dragging');
        });
        
        draggable.addEventListener('dragend', () => {
            draggable.classList.remove('dragging');
            document.querySelectorAll('.chapter-item').forEach(item => item.classList.remove('drag-over'));
            saveNewOrder();
        });
    });
    
    container.addEventListener('dragover', e => {
        e.preventDefault();
        const afterElement = getDragAfterElement(container, e.clientY);
        const draggable = document.querySelector('.dragging');
        if (!draggable) return;
        
        document.querySelectorAll('.chapter-item').forEach(item => item.classList.remove('drag-over'));
        
        if (afterElement == null) {
            container.appendChild(draggable);
        } else {
            container.insertBefore(draggable, afterElement);
            afterElement.classList.add('drag-over');
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.chapter-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

async function saveNewOrder() {
    const container = document.getElementById('chapterList');
    const items = [...container.querySelectorAll('.chapter-item')];
    const newOrderIds = items.map(item => parseInt(item.getAttribute('data-id')));
    
    try {
        const res = await fetch(`${API_BASE}/stories/${storyId}/chapters/reorder`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ chapter_ids: newOrderIds })
        });
        if (!res.ok) {
            console.error("Failed to reorder");
        }
    } catch(e) {
        console.error(e);
    }
}


async function createNewChapter() {
    try {
        const res = await fetch(`${API_BASE}/stories/${storyId}/chapters`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
                title: "New Chapter",
                content: ""
            })
        });
        
        if (res.ok) {
            const chapter = await res.json();
            window.location.href = `/editor.html?story_id=${storyId}&chapter_id=${chapter.id}`;
        }
    } catch (e) {
        console.error(e);
        alert("Failed to create chapter");
    }
}

function openChapter(chapterId) {
    window.location.href = `/reader.html?story_id=${storyId}&chapter_id=${chapterId}`;
}

// User Profile initialization
async function fetchUserProfile() {
    try {
        const res = await fetch('/api/auth/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const user = await res.json();
            if (user.username) {
                const el = document.getElementById('profileInitial');
                if (el) el.textContent = user.username.charAt(0).toUpperCase();
            }
        }
    } catch (e) {
        console.error("Failed to load user profile", e);
    }
}
fetchUserProfile();

// Theme Toggle
const themeToggleBtn = document.getElementById('themeToggleBtn');
const moonIcon = document.getElementById('moonIcon');
const sunIcon = document.getElementById('sunIcon');

function updateThemeIcons() {
    if (document.body.classList.contains('dark')) {
        moonIcon.style.display = 'block';
        sunIcon.style.display = 'none';
    } else {
        moonIcon.style.display = 'none';
        sunIcon.style.display = 'block';
    }
}

if (themeToggleBtn) {
    updateThemeIcons();
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        const isDark = document.body.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateThemeIcons();
    });
}

// Initializer
fetchChapters();
fetchNotes(); // Fetch notes initially too
fetchCharacters();
fetchScenes();
loadStoryboard();

// --- Main Notes Logic ---
let allNotes = [];
let currentNoteId = null;
let noteSaveTimeout = null;

async function fetchNotes() {
    try {
        const res = await fetch(`${API_BASE}/stories/${storyId}/notes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            allNotes = await res.json();
            renderNotes();
        }
    } catch(e) {
        console.error(e);
    }
}

function renderNotes() {
    const filter = document.getElementById('notesCategoryFilter').value;
    const container = document.getElementById('notesList');
    
    let filteredNotes = allNotes;
    if (filter !== "All") {
        filteredNotes = allNotes.filter(n => n.category === filter);
    }
    
    if (filteredNotes.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); font-style: italic; padding: 12px; text-align: center;">No notes found.</p>`;
        return;
    }
    
    container.innerHTML = filteredNotes.map(note => `
        <div class="note-list-item ${currentNoteId === note.id ? 'active' : ''}" onclick="selectNote(${note.id})">
            <div class="note-list-title">${note.title || 'Untitled Note'}</div>
            <div class="note-list-meta">
                <span class="note-badge">${note.category || 'General'}</span>
            </div>
        </div>
    `).join('');
}

document.getElementById('notesCategoryFilter')?.addEventListener('change', renderNotes);

function selectNote(noteId) {
    currentNoteId = noteId;
    renderNotes(); // update active state
    
    const note = allNotes.find(n => n.id === noteId);
    if (!note) return;
    
    document.getElementById('noteEditorEmpty').classList.add('hidden');
    document.getElementById('noteEditorForm').classList.remove('hidden');
    
    document.getElementById('noteTitle').value = note.title || '';
    document.getElementById('noteContent').value = note.content || '';
    document.getElementById('noteCategory').value = note.category || 'General';
    document.getElementById('noteSaveStatus').textContent = 'Saved';
    document.getElementById('noteSaveStatus').style.opacity = '1';
}

async function createNewNote() {
    try {
        const res = await fetch(`${API_BASE}/stories/${storyId}/notes`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
                title: "New Note",
                content: "",
                category: document.getElementById('notesCategoryFilter').value === "All" ? "General" : document.getElementById('notesCategoryFilter').value,
                story_id: parseInt(storyId)
            })
        });
        
        if (res.ok) {
            const note = await res.json();
            allNotes.push(note);
            selectNote(note.id);
        }
    } catch(e) {
        console.error("Failed to create note", e);
    }
}

async function deleteCurrentNote() {
    if (!currentNoteId) return;
    if (!confirm("Are you sure you want to delete this note?")) return;
    
    try {
        const res = await fetch(`${API_BASE}/notes/${currentNoteId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            allNotes = allNotes.filter(n => n.id !== currentNoteId);
            currentNoteId = null;
            renderNotes();
            document.getElementById('noteEditorEmpty').classList.remove('hidden');
            document.getElementById('noteEditorForm').classList.add('hidden');
        }
    } catch(e) {
        console.error("Failed to delete note", e);
    }
}

// Auto-saving logic
function handleNoteEdit() {
    document.getElementById('noteSaveStatus').textContent = 'Unsaved changes...';
    document.getElementById('noteSaveStatus').style.opacity = '0.7';
    
    clearTimeout(noteSaveTimeout);
    noteSaveTimeout = setTimeout(() => {
        autoSaveNote();
    }, 1000); // 1s debounce
}

async function autoSaveNote() {
    if (!currentNoteId) return;
    
    const title = document.getElementById('noteTitle').value;
    const content = document.getElementById('noteContent').value;
    const category = document.getElementById('noteCategory').value;
    
    document.getElementById('noteSaveStatus').textContent = 'Saving...';
    document.getElementById('noteSaveStatus').style.opacity = '0.7';
    
    try {
        const res = await fetch(`${API_BASE}/notes/${currentNoteId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
                title, content, category
            })
        });
        
        if (res.ok) {
            const updatedNote = await res.json();
            // Update local state
            const index = allNotes.findIndex(n => n.id === currentNoteId);
            if (index !== -1) {
                allNotes[index] = updatedNote;
                renderNotes(); // Update title/category in sidebar
            }
            
            document.getElementById('noteSaveStatus').textContent = 'Saved';
            document.getElementById('noteSaveStatus').style.opacity = '1';
        }
    } catch(e) {
        console.error("Auto-save failed", e);
        document.getElementById('noteSaveStatus').textContent = 'Save failed';
    }
}

// Attach event listeners for auto-save
document.getElementById('noteTitle')?.addEventListener('input', handleNoteEdit);
document.getElementById('noteContent')?.addEventListener('input', handleNoteEdit);

// --- Storyboard Logic ---
let storyboardData = null;
let cards = [];
let isDragging = false;
let draggedCard = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let saveStoryboardTimeout = null;

async function loadStoryboard() {
    try {
        const res = await fetch(`${API_BASE}/stories/${storyId}/storyboards`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const list = await res.json();
            if (list.length > 0) {
                storyboardData = list[0];
                if (storyboardData.content) {
                    try { cards = JSON.parse(storyboardData.content); } catch(e) { cards = []; }
                } else {
                    cards = [];
                }
            } else {
                // create initial
                const createRes = await fetch(`${API_BASE}/storyboards`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ story_id: parseInt(storyId), content: "[]" })
                });
                if (createRes.ok) {
                    storyboardData = await createRes.json();
                    cards = [];
                }
            }
            renderStoryboard();
        }
    } catch(e) { console.error(e); }
}

function renderStoryboard() {
    const canvas = document.getElementById('storyboardCanvas');
    if (!canvas) return;
    canvas.innerHTML = '';
    
    cards.forEach(card => {
        const el = document.createElement('div');
        el.className = 'storyboard-card';
        el.style.position = 'absolute';
        el.style.left = card.x + 'px';
        el.style.top = card.y + 'px';
        el.style.width = '250px';
        el.style.backgroundColor = card.color || 'var(--surface)';
        el.style.border = '1px solid var(--border)';
        el.style.borderRadius = '8px';
        el.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
        el.style.display = 'flex';
        el.style.flexDirection = 'column';
        el.style.cursor = 'grab';
        
        el.innerHTML = `
            <div class="card-header" style="padding: 10px; border-bottom: 1px solid var(--border); display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.02);">
                <input type="text" value="${card.title}" style="border:none; background:transparent; font-weight:bold; width: 100%; outline: none;" onchange="updateCard(${card.id}, 'title', this.value)">
                <button onclick="deleteCard(${card.id})" style="border:none; background:transparent; color:red; cursor:pointer;">&times;</button>
            </div>
            <textarea style="border:none; resize:none; padding:10px; height:120px; outline:none; background:transparent;" onchange="updateCard(${card.id}, 'content', this.value)">${card.content}</textarea>
        `;
        
        // Dragging logic
        const header = el.querySelector('.card-header');
        header.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
            isDragging = true;
            draggedCard = card.id;
            const rect = el.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left + canvasRect.left;
            dragOffsetY = e.clientY - rect.top + canvasRect.top;
            el.style.cursor = 'grabbing';
            el.style.zIndex = 1000;
        });
        
        canvas.appendChild(el);
    });
}

function updateCard(id, field, value) {
    const card = cards.find(c => c.id === id);
    if (card) {
        card[field] = value;
        autoSaveStoryboard();
    }
}

function deleteCard(id) {
    cards = cards.filter(c => c.id !== id);
    renderStoryboard();
    autoSaveStoryboard();
}

function addStoryboardCard() {
    const newCard = {
        id: Date.now(),
        x: Math.random() * 200 + 100,
        y: Math.random() * 200 + 100,
        title: 'New Card',
        content: '',
        color: 'var(--surface)'
    };
    cards.push(newCard);
    renderStoryboard();
    autoSaveStoryboard();
}

function autoSaveStoryboard() {
    if (!storyboardData) return;
    if (saveStoryboardTimeout) clearTimeout(saveStoryboardTimeout);
    
    saveStoryboardTimeout = setTimeout(async () => {
        try {
            await fetch(`${API_BASE}/storyboards/${storyboardData.id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: JSON.stringify(cards) })
            });
        } catch(e) { console.error("Storyboard save failed", e); }
    }, 1000);
}

// Global mouse events for dragging
document.addEventListener('mousemove', (e) => {
    if (isDragging && draggedCard !== null) {
        const canvas = document.getElementById('storyboardCanvas');
        const canvasRect = canvas.getBoundingClientRect();
        
        // Calculate new X and Y relative to canvas
        let newX = e.clientX - canvasRect.left - dragOffsetX + canvasRect.left;
        let newY = e.clientY - canvasRect.top - dragOffsetY + canvasRect.top;
        
        // Update in state
        const card = cards.find(c => c.id === draggedCard);
        if (card) {
            card.x = Math.max(0, newX);
            card.y = Math.max(0, newY);
            renderStoryboard();
        }
    }
});

document.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        draggedCard = null;
        autoSaveStoryboard();
    }
});

function toggleStoryboardView(view) {
    document.getElementById('btnViewBoard').classList.remove('active');
    document.getElementById('btnViewBoard').style.background = 'transparent';
    document.getElementById('btnViewBoard').style.color = 'var(--text-muted)';
    
    document.getElementById('btnViewTimeline').classList.remove('active');
    document.getElementById('btnViewTimeline').style.background = 'transparent';
    document.getElementById('btnViewTimeline').style.color = 'var(--text-muted)';
    
    document.getElementById('storyboardCanvasContainer').classList.add('hidden');
    document.getElementById('storyboardTimelineContainer').classList.add('hidden');
    
    document.getElementById('btnAddBoardCard').classList.add('hidden');
    document.getElementById('btnAddTimelineEvent').classList.add('hidden');
    
    if (view === 'board') {
        document.getElementById('btnViewBoard').classList.add('active');
        document.getElementById('btnViewBoard').style.background = 'var(--surface)';
        document.getElementById('btnViewBoard').style.color = 'var(--text-color)';
        document.getElementById('storyboardCanvasContainer').classList.remove('hidden');
        document.getElementById('btnAddBoardCard').classList.remove('hidden');
    } else {
        document.getElementById('btnViewTimeline').classList.add('active');
        document.getElementById('btnViewTimeline').style.background = 'var(--surface)';
        document.getElementById('btnViewTimeline').style.color = 'var(--text-color)';
        document.getElementById('storyboardTimelineContainer').classList.remove('hidden');
        document.getElementById('btnAddTimelineEvent').classList.remove('hidden');
        fetchTimelineEvents();
    }
}

let allTimelineEvents = [];
let currentTimelineEventId = null;

async function fetchTimelineEvents() {
    try {
        const res = await fetch(`${API_BASE}/stories/${storyId}/timeline`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            allTimelineEvents = await res.json();
            renderTimeline();
        }
    } catch (e) {
        console.error('Error fetching timeline events:', e);
    }
}

function renderTimeline() {
    const timelineList = document.getElementById('timelineEventsList');
    
    if (allTimelineEvents.length === 0) {
        timelineList.innerHTML = '<div class="empty-state-list" style="margin-left: 20px;">No events available. Click "+ Add Event" to create one.</div>';
        return;
    }
    
    timelineList.innerHTML = allTimelineEvents.map((event, i) => `
        <div style="position: relative; margin-bottom: 30px; padding-left: 40px; cursor: pointer;" onclick="editTimelineEvent(${event.id})">
            <div style="position: absolute; left: -6px; top: 5px; width: 14px; height: 14px; border-radius: 50%; background: ${event.importance === 'Major' ? 'var(--brand-orange)' : (event.importance === 'Minor' ? 'var(--text-muted)' : 'var(--primary)')}; border: 3px solid var(--bg-color);"></div>
            <div class="timeline-card" style="background: var(--surface); padding: 15px; border-radius: 8px; border: 1px solid var(--border); box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <h4 style="margin: 0 0 5px 0; color: var(--text-color);">${event.title || 'Untitled Event'}</h4>
                    <button class="btn btn-sm" style="color: var(--brand-red); background: none; border: none; padding: 0;" onclick="event.stopPropagation(); deleteTimelineEvent(${event.id})">Delete</button>
                </div>
                <p style="margin: 0; font-size: 0.9rem; color: var(--brand-teal); font-weight: 500;">${event.event_date || 'No Date'}</p>
                <div style="margin-top: 10px; font-size: 0.9rem; color: var(--text-muted);">${event.description || ''}</div>
            </div>
        </div>
    `).join('');
}

function openTimelineEventModal() {
    currentTimelineEventId = null;
    document.getElementById('timelineEventModalTitle').innerText = 'Add Timeline Event';
    document.getElementById('timelineTitleInput').value = '';
    document.getElementById('timelineDateInput').value = '';
    document.getElementById('timelineImportanceInput').value = 'Normal';
    document.getElementById('timelineDescriptionInput').value = '';
    document.getElementById('timelineEventModal').classList.remove('hidden');
}

function closeTimelineEventModal() {
    document.getElementById('timelineEventModal').classList.add('hidden');
}

function editTimelineEvent(id) {
    const event = allTimelineEvents.find(e => e.id === id);
    if (!event) return;
    
    currentTimelineEventId = id;
    document.getElementById('timelineEventModalTitle').innerText = 'Edit Timeline Event';
    document.getElementById('timelineTitleInput').value = event.title || '';
    document.getElementById('timelineDateInput').value = event.event_date || '';
    document.getElementById('timelineImportanceInput').value = event.importance || 'Normal';
    document.getElementById('timelineDescriptionInput').value = event.description || '';
    document.getElementById('timelineEventModal').classList.remove('hidden');
}

async function saveTimelineEvent() {
    const eventData = {
        story_id: storyId,
        title: document.getElementById('timelineTitleInput').value || 'Untitled',
        event_date: document.getElementById('timelineDateInput').value,
        importance: document.getElementById('timelineImportanceInput').value,
        description: document.getElementById('timelineDescriptionInput').value
    };
    
    const method = currentTimelineEventId ? 'PUT' : 'POST';
    const url = currentTimelineEventId ? `${API_BASE}/timeline/${currentTimelineEventId}` : `${API_BASE}/timeline`;
    
    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(eventData)
        });
        if (res.ok) {
            closeTimelineEventModal();
            fetchTimelineEvents();
        } else {
            alert('Error saving timeline event');
        }
    } catch (e) {
        console.error(e);
        alert('Failed to save timeline event');
    }
}

async function deleteTimelineEvent(id) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
        const res = await fetch(`${API_BASE}/timeline/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            fetchTimelineEvents();
        }
    } catch (e) {
        console.error(e);
    }
}


// --- Characters Logic ---
let allCharacters = [];
let currentCharacterId = null;
let charSaveTimeout = null;

async function fetchCharacters() {
    try {
        const res = await fetch(`${API_BASE}/stories/${storyId}/characters`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            allCharacters = await res.json();
            renderCharacters();
        }
    } catch (e) {
        console.error(e);
    }
}

function renderCharacters() {
    const container = document.getElementById('characterList');
    const filter = document.getElementById('characterSearch')?.value.toLowerCase() || "";
    
    let filteredChars = allCharacters;
    if (filter) {
        filteredChars = allCharacters.filter(c => c.name.toLowerCase().includes(filter) || (c.aliases && c.aliases.toLowerCase().includes(filter)));
    }
    
    if (filteredChars.length === 0) {
        container.innerHTML = '<div class="empty-state-list">No characters found.</div>';
        return;
    }
    
    container.innerHTML = filteredChars.map(char => `
        <div class="note-list-item ${char.id === currentCharacterId ? 'active' : ''}" onclick="selectCharacter(${char.id})">
            <div style="font-weight: 500;">${char.name || 'Unnamed Character'}</div>
            <div class="note-list-category" style="margin-top: 4px;">${char.role || 'No role assigned'}</div>
        </div>
    `).join('');
}

document.getElementById('characterSearch')?.addEventListener('input', renderCharacters);

function selectCharacter(id) {
    currentCharacterId = id;
    renderCharacters(); // update active state
    
    const char = allCharacters.find(c => c.id === id);
    if (!char) return;
    
    document.getElementById('characterEditorEmpty').classList.add('hidden');
    document.getElementById('characterEditorForm').classList.remove('hidden');
    document.getElementById('charAvatarPreview').src = char.avatar_image || '/assets/default_avatar.svg';
    document.getElementById('charName').value = char.name || '';
    document.getElementById('charAliases').value = char.aliases || '';
    document.getElementById('charRole').value = char.role || '';
    document.getElementById('charDob').value = char.dob || '';
    document.getElementById('charPhysical').value = char.physical_description || '';
    document.getElementById('charPersonality').value = char.personality || '';
    document.getElementById('charBackstory').value = char.backstory || '';
    document.getElementById('charGoals').value = char.goals_and_motivations || '';
    document.getElementById('charConflicts').value = char.conflicts || '';
    
    document.getElementById('charAvatarInput').value = '';
    
    document.getElementById('charSaveStatus').textContent = '';
    document.getElementById('charSaveStatus').style.opacity = '0';
}

async function createNewCharacter() {
    try {
        const res = await fetch(`${API_BASE}/characters`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                story_id: parseInt(storyId),
                name: 'New Character'
            })
        });
        if (res.ok) {
            const char = await res.json();
            allCharacters.push(char);
            selectCharacter(char.id);
        }
    } catch (e) {
        console.error(e);
    }
}

async function deleteCurrentCharacter() {
    if (!currentCharacterId) return;
    if (!confirm('Are you sure you want to delete this character?')) return;
    
    try {
        const res = await fetch(`${API_BASE}/characters/${currentCharacterId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            allCharacters = allCharacters.filter(c => c.id !== currentCharacterId);
            currentCharacterId = null;
            document.getElementById('characterEditorEmpty').classList.remove('hidden');
            document.getElementById('characterEditorForm').classList.add('hidden');
            renderCharacters();
        }
    } catch (e) {
        console.error(e);
    }
}

function handleCharacterEdit() {
    document.getElementById('charSaveStatus').textContent = 'Unsaved changes...';
    document.getElementById('charSaveStatus').style.opacity = '1';
    autoSaveCharacter();
}

document.getElementById('charAvatarInput').addEventListener('change', async (e) => {
    if (!currentCharacterId) return;
    let file = e.target.files[0];
    if (!file) return;

    try {
        if (window.openImageCropper) {
            file = await window.openImageCropper(file, 1);
        }
    } catch(err) {
        console.log('Cropping cancelled', err);
        e.target.value = '';
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch(`${API_BASE}/characters/${currentCharacterId}/avatar`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (res.ok) {
            const data = await res.json();
            document.getElementById('charAvatarPreview').src = data.avatar_url;
            const charIndex = allCharacters.findIndex(c => c.id === currentCharacterId);
            if (charIndex !== -1) {
                allCharacters[charIndex].avatar_image = data.avatar_url;
                renderCharacters();
            }
        } else {
            alert('Failed to upload avatar');
        }
    } catch (error) {
        console.error('Error uploading avatar:', error);
        alert('Failed to upload avatar');
    }
});

// Auto-save listeners
const charInputs = ['charName', 'charAliases', 'charRole', 'charDob', 'charPhysical', 'charPersonality', 'charBackstory', 'charGoals', 'charConflicts'];

function autoSaveCharacter() {
    if (!currentCharacterId) return;
    
    const saveId = currentCharacterId;
    if (charSaveTimeout) clearTimeout(charSaveTimeout);
    
    charSaveTimeout = setTimeout(async () => {
        try {
            const name = document.getElementById('charName').value;
            const aliases = document.getElementById('charAliases').value;
            const role = document.getElementById('charRole').value;
            const dob = document.getElementById('charDob').value;
            const physical_description = document.getElementById('charPhysical').value;
            const personality = document.getElementById('charPersonality').value;
            const backstory = document.getElementById('charBackstory').value;
            const goals_and_motivations = document.getElementById('charGoals').value;
            const conflicts = document.getElementById('charConflicts').value;
            
            // If the user switched characters, don't overwrite the new one with old data
            if (currentCharacterId !== saveId) return;
            
            const res = await fetch(`${API_BASE}/characters/${saveId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name, aliases, role, dob, physical_description,
                    personality, backstory, goals_and_motivations, conflicts
                })
            });
            if (res.ok) {
                const updated = await res.json();
                const idx = allCharacters.findIndex(c => c.id === saveId);
                if (idx !== -1) {
                    allCharacters[idx] = updated;
                }
                if (currentCharacterId === saveId) {
                    document.getElementById('charSaveStatus').textContent = 'Saved';
                    renderCharacters();
                }
            }
        } catch(e) {
            console.error(e);
        }
    }, 1000);
}

document.getElementById('charName')?.addEventListener('input', handleCharacterEdit);
document.getElementById('charAliases')?.addEventListener('input', handleCharacterEdit);

// --- Scenes Logic ---
let allScenes = [];
let currentSceneId = null;
let sceneSaveTimeout = null;

async function fetchScenes() {
    try {
        const res = await fetch(`${API_BASE}/stories/${storyId}/scenes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            allScenes = await res.json();
            renderScenes();
        }
    } catch (e) {
        console.error(e);
    }
}

function renderScenes() {
    const container = document.getElementById('sceneList');
    const chapterSelect = document.getElementById('scenesChapterFilter');
    const filter = chapterSelect ? chapterSelect.value : "All";
    
    let filteredScenes = allScenes;
    if (filter !== "All") {
        filteredScenes = allScenes.filter(s => String(s.chapter_id) === filter);
    }
    
    if (filteredScenes.length === 0) {
        container.innerHTML = '<div class="empty-state-list">No scenes found.</div>';
        return;
    }
    
    container.innerHTML = filteredScenes.map(scene => `
        <div class="note-list-item ${scene.id === currentSceneId ? 'active' : ''}" onclick="selectScene(${scene.id})">
            <div style="font-weight: 500;">${scene.title || 'Untitled Scene'}</div>
            <div class="note-list-category" style="margin-top: 4px;">Status: ${scene.status || 'Outline'}</div>
        </div>
    `).join('');
}

document.getElementById('scenesChapterFilter')?.addEventListener('change', renderScenes);

function selectScene(id) {
    currentSceneId = id;
    renderScenes(); // update active state
    
    const scene = allScenes.find(s => s.id === id);
    if (!scene) return;
    
    document.getElementById('sceneEditorEmpty').classList.add('hidden');
    document.getElementById('sceneEditorForm').classList.remove('hidden');
    
    document.getElementById('sceneTitle').value = scene.title || '';
    document.getElementById('sceneChapterSelect').value = scene.chapter_id || '';
    document.getElementById('sceneStatus').value = scene.status || 'Outline';
    document.getElementById('sceneSetting').value = scene.setting || '';
    document.getElementById('scenePov').value = scene.pov_character || '';
    document.getElementById('sceneDescription').value = scene.description || '';
    
    document.getElementById('sceneSaveStatus').textContent = '';
    document.getElementById('sceneSaveStatus').style.opacity = '0';
}

async function createNewScene() {
    try {
        const res = await fetch(`${API_BASE}/stories/${storyId}/scenes`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                story_id: parseInt(storyId),
                title: 'New Scene'
            })
        });
        if (res.ok) {
            const scene = await res.json();
            allScenes.push(scene);
            selectScene(scene.id);
        }
    } catch (e) {
        console.error(e);
    }
}

async function deleteCurrentScene() {
    if (!currentSceneId) return;
    if (!confirm('Are you sure you want to delete this scene?')) return;
    
    try {
        const res = await fetch(`${API_BASE}/scenes/${currentSceneId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            allScenes = allScenes.filter(s => s.id !== currentSceneId);
            currentSceneId = null;
            document.getElementById('sceneEditorEmpty').classList.remove('hidden');
            document.getElementById('sceneEditorForm').classList.add('hidden');
            renderScenes();
        }
    } catch (e) {
        console.error(e);
    }
}

function handleSceneEdit() {
    document.getElementById('sceneSaveStatus').textContent = 'Unsaved changes...';
    document.getElementById('sceneSaveStatus').style.opacity = '1';
    autoSaveScene();
}

function autoSaveScene() {
    if (!currentSceneId) return;
    if (sceneSaveTimeout) clearTimeout(sceneSaveTimeout);
    
    sceneSaveTimeout = setTimeout(async () => {
        try {
            const title = document.getElementById('sceneTitle').value;
            const chapter_id = document.getElementById('sceneChapterSelect').value || null;
            const status = document.getElementById('sceneStatus').value;
            const setting = document.getElementById('sceneSetting').value;
            const pov_character = document.getElementById('scenePov').value;
            const description = document.getElementById('sceneDescription').value;
            
            const res = await fetch(`${API_BASE}/scenes/${currentSceneId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title, 
                    chapter_id: chapter_id ? parseInt(chapter_id) : null,
                    status, setting, pov_character, description
                })
            });
            
            if (res.ok) {
                const updatedScene = await res.json();
                const index = allScenes.findIndex(s => s.id === currentSceneId);
                if (index !== -1) {
                    allScenes[index] = updatedScene;
                    renderScenes();
                }
                document.getElementById('sceneSaveStatus').textContent = 'Saved';
            }
        } catch(e) {
            console.error(e);
        }
    }, 1000);
}

document.getElementById('sceneTitle')?.addEventListener('input', handleSceneEdit);
document.getElementById('sceneDescription')?.addEventListener('input', handleSceneEdit);

