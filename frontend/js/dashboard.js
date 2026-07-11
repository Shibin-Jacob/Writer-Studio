const API_BASE = "/api";
let currentTab = 'stories';
let currentItems = []; // Store fetched items
let editMode = false;
let isListView = localStorage.getItem('listView') === 'true'; // View state

// Check auth
const token = localStorage.getItem('token') || sessionStorage.getItem('token');
if (!token) {
    window.location.href = '/index.html';
}

function logout() {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    window.location.href = '/index.html';
}

// User Profile fetch
async function fetchProfile() {
    try {
        const response = await fetch(`${API_BASE}/auth/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            const profileInitial = document.getElementById('profileInitial');
            const profileImage = document.getElementById('profileImage');
            if (data.profile_photo_url) {
                profileImage.src = data.profile_photo_url;
                profileImage.style.display = 'block';
                profileInitial.style.display = 'none';
            } else {
                profileInitial.textContent = data.username ? data.username.charAt(0).toUpperCase() : 'U';
                profileImage.style.display = 'none';
                profileInitial.style.display = 'block';
            }
        }
    } catch (e) {
        console.error("Profile fetch error", e);
    }
}

// Fetch Content (Stories or Series)
async function fetchContent() {
    try {
        const endpoint = currentTab === 'stories' ? '/content/stories' : '/content/series';
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        const data = await response.json();
        currentItems = data;
        renderContent(data);
    } catch (err) {
        console.error("Failed to fetch content", err);
    }
}

// Generate a random gradient color based on string
function getGradientFromTitle(title) {
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
        hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `linear-gradient(135deg, hsl(${hue}, 70%, 40%), hsl(${(hue + 40) % 360}, 80%, 20%))`;
}

// Time formatting helper
function timeAgo(dateString) {
    if (!dateString) return "Recently updated";
    
    // SQLite might return '2023-10-01 12:00:00' without timezone
    let date = dateString;
    if (typeof date === 'string' && !date.includes('Z') && !date.includes('+')) {
        date = date.replace(' ', 'T') + 'Z';
    }
    
    const past = new Date(date);
    const now = new Date();
    
    if (isNaN(past.getTime())) return "Recently updated";
    
    const diffMs = now - past;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);
    
    if (diffDays > 0) {
        if (diffDays === 1) return "Updated 1 day ago";
        if (diffDays < 30) return `Updated ${diffDays} days ago`;
        const diffMonths = Math.floor(diffDays / 30);
        if (diffMonths === 1) return "Updated 1 month ago";
        if (diffMonths < 12) return `Updated ${diffMonths} months ago`;
        const diffYears = Math.floor(diffDays / 365);
        if (diffYears === 1) return "Updated 1 year ago";
        return `Updated ${diffYears} years ago`;
    } else if (diffHrs > 0) {
        if (diffHrs === 1) return "Updated 1 hour ago";
        return `Updated ${diffHrs} hours ago`;
    } else if (diffMins > 0) {
        if (diffMins === 1) return "Updated 1 min ago";
        return `Updated ${diffMins} mins ago`;
    } else {
        return "Updated just now";
    }
}

// Render the grid
function renderContent(items) {
    const grid = document.getElementById('contentGrid');
    grid.innerHTML = '';
    
    if (items.length === 0) {
        grid.innerHTML = `<p style="color: #666; font-size: 1.1rem; text-align:center; width:100%; grid-column: 1 / -1; padding: 40px;">No ${currentTab} found. Create one to get started!</p>`;
        return;
    }
    
    if (isListView) {
        grid.classList.add('list-view');
        const btnList = document.getElementById('btnList');
        const btnGrid = document.getElementById('btnGrid');
        if (btnList) btnList.classList.add('active');
        if (btnGrid) btnGrid.classList.remove('active');
    } else {
        grid.classList.remove('list-view');
        const btnList = document.getElementById('btnList');
        const btnGrid = document.getElementById('btnGrid');
        if (btnGrid) btnGrid.classList.add('active');
        if (btnList) btnList.classList.remove('active');
    }
    
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'story-card';
        
        // Check if there's a cover image
        const hasCover = item.cover_image && item.cover_image.trim().length > 0;
        const coverHtml = hasCover 
            ? `<div class="card-cover" style="background-image: url('${item.cover_image}')"></div>`
            : `<div class="card-cover no-image" style="background: ${getGradientFromTitle(item.title)}"><span class="card-cover-text">${item.title.charAt(0).toUpperCase()}</span></div>`;
            
        // Mini actions
        const editAction = `<button class="mini-btn edit" onclick="openEditModal(${item.id}, event)" title="Edit Info"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></button>`;
        const writeAction = currentTab === 'stories' 
            ? `<button class="mini-btn write" onclick="goToEditor(${item.id}, event)" title="Write Chapter"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></button>`
            : '';
        const delAction = `<button class="mini-btn delete" onclick="deleteItem(${item.id}, event)" title="Delete"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>`;

        card.innerHTML = `
            ${coverHtml}
            <div class="card-info">
                <div class="info-content">
                    <h3>${item.title}</h3>
                    <p>${item.genre || item.tags || "Story"}</p>
                </div>
                <div class="card-bottom" style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="meta-text" style="font-size: 0.75rem; color: #64748b;">${timeAgo(item.updated_at)}</span>
                    <div class="mini-actions" onclick="event.stopPropagation()">
                        ${editAction}
                        ${writeAction}
                        ${delAction}
                    </div>
                </div>
            </div>
        `;
        
        // Click on the card to go to story info / series info
        card.onclick = (e) => {
            // Prevent if clicked on a button
            if (e.target.closest('button')) return;
            
            if (currentTab === 'stories') {
                window.location.href = `/story_info.html?story_id=${item.id}&v=2`;
            } else {
                window.location.href = `/series_info.html?series_id=${item.id}`;
            }
        };
        
        grid.appendChild(card);
    });
}

function goToEditor(id, event) {
    event.stopPropagation();
    window.location.href = `/editor.html?story_id=${id}`;
}

async function deleteItem(id, event) {
    event.stopPropagation();
    if (!confirm("Are you sure you want to delete this?")) return;
    
    try {
        const endpoint = currentTab === 'stories' ? `/content/stories/${id}` : `/content/series/${id}`;
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            fetchContent();
        } else {
            alert("Failed to delete.");
        }
    } catch (e) {
        console.error(e);
    }
}

function switchTab(tab) {
    currentTab = tab;
    document.getElementById('pageTitle').innerText = tab === 'stories' ? 'My Stories' : 'My Series';
    
    // Update active nav items
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active');
    });
    const desktopNav = document.getElementById(`nav-${tab}`);
    if (desktopNav) desktopNav.classList.add('active');
    
    // also do mobile nav
    document.querySelectorAll('.mobile-nav .nav-item').forEach(el => {
        if (el.innerText.toLowerCase().includes(tab)) el.classList.add('active');
    });
    
    fetchContent();
}

function setViewMode(isList) {
    isListView = isList;
    localStorage.setItem('listView', isListView);
    renderContent(currentItems);
}

// Modal Logic
function openCreateModal() {
    editMode = false;
    document.getElementById('modalTitle').innerText = currentTab === 'stories' ? 'Create New Story' : 'Create New Series';
    document.getElementById('createForm').reset();
    document.getElementById('editItemId').value = '';
    
    // reset cover
    document.getElementById('coverPreview').style.display = 'none';
    document.getElementById('coverPreview').src = '';
    document.getElementById('coverBase64').value = '';
    
    document.getElementById('createModal').style.display = 'flex';
}

function openEditModal(id, event) {
    event.stopPropagation();
    editMode = true;
    const item = currentItems.find(i => i.id === id);
    if (!item) return;
    
    document.getElementById('modalTitle').innerText = currentTab === 'stories' ? 'Edit Story Info' : 'Edit Series Info';
    document.getElementById('editItemId').value = id;
    
    document.getElementById('createTitle').value = item.title;
    document.getElementById('createSummary').value = item.summary || item.description || '';
    document.getElementById('createTags').value = item.tags || '';
    document.getElementById('createGenre').value = item.genre || '';
    document.getElementById('createFandom').value = item.fandom || '';
    
    if (item.cover_image) {
        document.getElementById('coverPreview').src = item.cover_image;
        document.getElementById('coverPreview').style.display = 'block';
        document.getElementById('coverBase64').value = item.cover_image;
    } else {
        document.getElementById('coverPreview').style.display = 'none';
        document.getElementById('coverPreview').src = '';
        document.getElementById('coverBase64').value = '';
    }
    
    document.getElementById('createModal').style.display = 'flex';
}

function closeCreateModal() {
    document.getElementById('createModal').style.display = 'none';
}

// Cover Upload logic
document.getElementById('coverUploadInput').addEventListener('change', async function(e) {
    let file = e.target.files[0];
    if (file) {
        try {
            if (window.openImageCropper) {
                // Use 16:9 for dashboard covers
                file = await window.openImageCropper(file, 16 / 9);
            }
        } catch(err) {
            console.log('Cropping cancelled', err);
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(evt) {
            document.getElementById('coverPreview').src = evt.target.result;
            document.getElementById('coverPreview').style.display = 'block';
            document.getElementById('coverBase64').value = evt.target.result;
        }
        reader.readAsDataURL(file);
    }
});

// Form Submit (Create or Update)
document.getElementById('createForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editItemId').value;
    const title = document.getElementById('createTitle').value;
    const summary = document.getElementById('createSummary').value;
    const tags = document.getElementById('createTags').value;
    const genre = document.getElementById('createGenre').value;
    const fandom = document.getElementById('createFandom').value;
    const cover_image = document.getElementById('coverBase64').value;
    
    const payload = currentTab === 'stories' 
        ? { title, summary, tags, genre, fandom, cover_image } 
        : { title, description: summary, tags, cover_image };
        
    let endpoint = currentTab === 'stories' ? '/content/stories' : '/content/series';
    let method = 'POST';
    
    if (editMode && id) {
        endpoint += `/${id}`;
        method = 'PUT'; // Assumes PUT endpoint exists for updates
    }
        
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            closeCreateModal();
            fetchContent();
        } else {
            alert('Failed to save');
        }
    } catch (err) {
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


// Init
fetchProfile();
fetchContent();
