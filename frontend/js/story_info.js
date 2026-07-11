const API_BASE = "/api/content";
const urlParams = new URLSearchParams(window.location.search);
const storyId = urlParams.get('story_id');

let currentStory = null;
let currentChapters = [];

// Check auth
const token = localStorage.getItem('token') || sessionStorage.getItem('token');
if (!token || !storyId) {
    window.location.href = '/dashboard.html';
}

function getGradientFromTitle(title) {
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
        hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `linear-gradient(135deg, hsl(${hue}, 70%, 40%), hsl(${(hue + 40) % 360}, 80%, 20%))`;
}

async function fetchStoryInfo() {
    try {
        const res = await fetch(`${API_BASE}/stories/${storyId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            alert("Failed to load story");
            window.location.href = '/dashboard.html';
            return;
        }
        currentStory = await res.json();
        renderStoryInfo();
        fetchChapters();
    } catch (e) {
        console.error(e);
    }
}

async function fetchChapters() {
    try {
        const res = await fetch(`${API_BASE}/stories/${storyId}/chapters`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            currentChapters = await res.json();
            renderChapters(currentChapters);
        }
    } catch(e) {
        console.error(e);
    }
}

function renderStoryInfo() {
    document.getElementById('storyTitle').textContent = currentStory.title;
    const summaryEl = document.getElementById('storySummary');
    const readMoreBtn = document.getElementById('readMoreBtn');
    
    summaryEl.textContent = currentStory.summary || "No description provided.";
    
    // Check if text is clamped after rendering
    setTimeout(() => {
        if (summaryEl.scrollHeight > summaryEl.clientHeight) {
            readMoreBtn.style.display = 'inline-block';
        } else {
            readMoreBtn.style.display = 'none';
        }
    }, 10);
    
    // Cover logic
    const coverFallback = document.getElementById('coverFallback');
    const storyCover = document.getElementById('storyCover');
    if (currentStory.cover_image) {
        storyCover.src = currentStory.cover_image;
        storyCover.style.display = 'block';
        coverFallback.style.display = 'none';
    } else {
        const gradient = getGradientFromTitle(currentStory.title);
        coverFallback.style.background = gradient;
        coverFallback.textContent = currentStory.title.charAt(0).toUpperCase();
        coverFallback.style.display = 'flex';
        storyCover.style.display = 'none';
    }
    
    // Badges
    const badgesContainer = document.getElementById('metaBadges');
    badgesContainer.innerHTML = '';
    
    if (currentStory.genre) {
        badgesContainer.innerHTML += `<div class="badge"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg> ${currentStory.genre}</div>`;
    }
    if (currentStory.fandom) {
        badgesContainer.innerHTML += `<div class="badge"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg> ${currentStory.fandom}</div>`;
    }
    
    if (currentStory.tags) {
        const tags = currentStory.tags.split(',').map(t => t.trim()).filter(t => t);
        tags.forEach(tag => {
            badgesContainer.innerHTML += `<div class="badge tag">#${tag}</div>`;
        });
    }
}

function renderChapters(chapters) {
    const container = document.getElementById('chapterList');
    if (chapters.length === 0) {
        container.innerHTML = `<p style="color: #666; font-style: italic;">No chapters found. Start writing to add chapters.</p>`;
        return;
    }
    
    container.innerHTML = chapters.map(ch => {
        let typeClass = 'type-standard';
        let typeName = ch.type || 'Standard Chapter';
        if (typeName === "Author's Note") typeClass = 'type-author';
        else if (typeName === "Explanation") typeClass = 'type-explanation';
        else if (typeName === "Prologue") typeClass = 'type-prologue';
        else if (typeName === "Epilogue") typeClass = 'type-epilogue';

        return `
        <div class="chapter-item" onclick="window.location.href='/reader.html?story_id=${storyId}&chapter_id=${ch.id}'" style="cursor: pointer;">
            <span class="chapter-title">${ch.title}</span>
            <span class="type-badge ${typeClass}">${typeName}</span>
        </div>
        `;
    }).join('');
}

// Navigation & Actions
function openEditor() {
    if (currentChapters && currentChapters.length > 0) {
        // Open the most recently created chapter (assuming ID sort or array order)
        const latestChapter = currentChapters[currentChapters.length - 1];
        window.location.href = `/editor.html?story_id=${storyId}&chapter_id=${latestChapter.id}`;
    } else {
        // If no chapters exist, go to workspace to create one
        window.location.href = `/workspace.html?story_id=${storyId}`;
    }
}

function exportStory() {
    window.location.href = `/export.html?story_id=${storyId}`;
}

async function deleteStory() {
    if(!confirm("Are you sure you want to delete this story? This action cannot be undone.")) return;
    try {
        const res = await fetch(`${API_BASE}/stories/${storyId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            window.location.href = '/dashboard.html';
        }
    } catch(e) { console.error(e); }
}

// Modal Logic
function openEditModal() {
    document.getElementById('editTitle').value = currentStory.title || '';
    document.getElementById('editSummary').value = currentStory.summary || '';
    document.getElementById('editTags').value = currentStory.tags || '';
    document.getElementById('editGenre').value = currentStory.genre || '';
    document.getElementById('editFandom').value = currentStory.fandom || '';
    
    if (currentStory.cover_image) {
        document.getElementById('modalCoverPreview').src = currentStory.cover_image;
        document.getElementById('modalCoverPreview').style.display = 'block';
        document.getElementById('coverBase64').value = currentStory.cover_image;
    } else {
        document.getElementById('modalCoverPreview').style.display = 'none';
        document.getElementById('coverBase64').value = '';
    }
    
    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

// Cover Upload in Modal
document.getElementById('coverUploadInput').addEventListener('change', async function(e) {
    let file = e.target.files[0];
    if (file) {
        try {
            if (window.openImageCropper) {
                // Use 16:9 for story covers
                file = await window.openImageCropper(file, 16 / 9);
            }
        } catch(err) {
            console.log('Cropping cancelled', err);
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(evt) {
            document.getElementById('modalCoverPreview').src = evt.target.result;
            document.getElementById('modalCoverPreview').style.display = 'block';
            document.getElementById('coverBase64').value = evt.target.result;
        }
        reader.readAsDataURL(file);
    }
});

// Submit Edit Form
document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const payload = {
        title: document.getElementById('editTitle').value,
        summary: document.getElementById('editSummary').value,
        tags: document.getElementById('editTags').value,
        genre: document.getElementById('editGenre').value,
        fandom: document.getElementById('editFandom').value,
        cover_image: document.getElementById('coverBase64').value
    };
    
    try {
        const res = await fetch(`${API_BASE}/stories/${storyId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (res.ok) {
            closeEditModal();
            fetchStoryInfo(); // refresh
        } else {
            alert("Failed to update story");
        }
    } catch(err) {
        console.error(err);
    }
});

// Theme Toggle
const themeBtn = document.getElementById('themeToggleBtn');
if (themeBtn) {
    themeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        const isDark = document.body.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        
        document.getElementById('moonIcon').style.display = isDark ? 'block' : 'none';
        document.getElementById('sunIcon').style.display = isDark ? 'none' : 'block';
    });
    
    // Init icons
    const isDark = document.body.classList.contains('dark');
    document.getElementById('moonIcon').style.display = isDark ? 'block' : 'none';
    document.getElementById('sunIcon').style.display = isDark ? 'none' : 'block';
}

fetchStoryInfo();

// Summary Collapse Logic
window.toggleSummary = function(event) {
    if (event) event.stopPropagation();
    const summaryEl = document.getElementById('storySummary');
    const btnEl = document.getElementById('readMoreBtn');
    
    if (summaryEl.classList.contains('expanded')) {
        summaryEl.classList.remove('expanded');
        btnEl.textContent = 'Read more';
    } else {
        summaryEl.classList.add('expanded');
        btnEl.textContent = 'Read less';
    }
};

// Click outside to collapse summary
document.addEventListener('click', function(event) {
    const summaryEl = document.getElementById('storySummary');
    const btnEl = document.getElementById('readMoreBtn');
    const container = document.getElementById('summaryContainer');
    
    if (summaryEl && summaryEl.classList.contains('expanded')) {
        if (!container.contains(event.target)) {
            summaryEl.classList.remove('expanded');
            btnEl.textContent = 'Read more';
        }
    }
});
