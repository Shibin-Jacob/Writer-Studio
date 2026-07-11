const urlParams = new URLSearchParams(window.location.search);
const seriesId = urlParams.get('series_id');
const token = localStorage.getItem('token') || sessionStorage.getItem('token');

if (!token) window.location.href = '/index.html';
if (!seriesId) window.location.href = '/dashboard.html';

const API_BASE = 'http://127.0.0.1:8000/api';

let currentSeries = null;
let allStories = [];

async function init() {
    await fetchSeriesInfo();
    await fetchStories();
    
    // Form handler
    document.getElementById('editSeriesForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const updated = {
            title: document.getElementById('editTitle').value,
            description: document.getElementById('editDescription').value,
            tags: document.getElementById('editTags').value,
            cover_image: currentSeries.cover_image,
            copyright_type: currentSeries.copyright_type
        };
        try {
            const res = await fetch(`${API_BASE}/content/series/${seriesId}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updated)
            });
            if (res.ok) {
                currentSeries = await res.json();
                updateSidebar();
                alert('Series updated successfully!');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to update series.');
        }
    });
}

async function fetchSeriesInfo() {
    try {
        const res = await fetch(`${API_BASE}/content/series`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        currentSeries = data.find(s => s.id == seriesId);
        
        if (currentSeries) {
            updateSidebar();
        }
    } catch(err) {
        console.error(err);
    }
}

function updateSidebar() {
    document.getElementById('navSeriesTitle').innerText = currentSeries.title;
    document.getElementById('sidebarSeriesTitle').innerText = currentSeries.title;
    
    document.getElementById('editTitle').value = currentSeries.title || '';
    document.getElementById('editDescription').value = currentSeries.description || '';
    document.getElementById('editTags').value = currentSeries.tags || '';

    const coverContainer = document.getElementById('seriesCoverContainer');
    if (currentSeries.cover_image) {
        coverContainer.innerHTML = `<img src="${currentSeries.cover_image}" alt="Cover" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else {
        coverContainer.innerHTML = 'No Cover';
    }
}

async function fetchStories() {
    try {
        const res = await fetch(`${API_BASE}/content/stories`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        allStories = await res.json();
        renderStories();
    } catch(err) {
        console.error(err);
    }
}

function renderStories() {
    const linkedList = document.getElementById('linkedStoriesList');
    const unlinkedList = document.getElementById('unlinkedStoriesList');
    
    linkedList.innerHTML = '';
    unlinkedList.innerHTML = '';
    
    const linked = allStories.filter(s => s.series_id == seriesId);
    const unlinked = allStories.filter(s => s.series_id != seriesId);
    
    if (linked.length === 0) {
        linkedList.innerHTML = '<p style="text-align: center; color: #888; padding: 40px;">No stories linked yet. Add one to get started!</p>';
    } else {
        linked.forEach(story => {
            const el = document.createElement('div');
            el.className = 'story-card-mini';
            el.innerHTML = `
                <div style="flex: 1;" onclick="window.location.href='/story_info.html?story_id=${story.id}'">
                    <h4 style="margin: 0 0 4px 0;">${story.title}</h4>
                    <span style="font-size: 0.85rem; color: #666;">${story.summary ? story.summary.substring(0, 80) + '...' : 'No summary'}</span>
                </div>
                <button class="btn btn-danger" style="padding: 6px 12px; margin-left: 12px; background: #e53935;" onclick="unlinkStory(${story.id})">Unlink</button>
            `;
            linkedList.appendChild(el);
        });
    }
    
    if (unlinked.length === 0) {
        unlinkedList.innerHTML = '<p style="text-align: center; color: #888;">No other stories available to link.</p>';
    } else {
        unlinked.forEach(story => {
            const el = document.createElement('div');
            el.className = 'unlinked-story-item';
            el.innerHTML = `
                <div>
                    <strong>${story.title}</strong>
                    <div style="font-size: 0.85rem; color: #666;">${story.summary ? story.summary.substring(0, 50) + '...' : ''}</div>
                </div>
                <button class="btn" style="padding: 6px 16px;" onclick="linkStory(${story.id})">Link</button>
            `;
            unlinkedList.appendChild(el);
        });
    }
}

async function linkStory(storyId) {
    const story = allStories.find(s => s.id == storyId);
    if (!story) return;
    
    // Build update payload
    const payload = {
        title: story.title,
        summary: story.summary,
        tags: story.tags,
        genre: story.genre,
        fandom: story.fandom,
        copyright_type: story.copyright_type,
        crossover: story.crossover,
        cover_image: story.cover_image,
        is_archived: story.is_archived,
        series_id: parseInt(seriesId)
    };
    
    try {
        const res = await fetch(`${API_BASE}/content/stories/${storyId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            story.series_id = parseInt(seriesId);
            renderStories();
            closeLinkModal();
        } else {
            alert('Failed to link story');
        }
    } catch(err) {
        console.error(err);
    }
}

async function unlinkStory(storyId) {
    if (!confirm('Are you sure you want to remove this story from the series?')) return;
    
    const story = allStories.find(s => s.id == storyId);
    if (!story) return;
    
    const payload = {
        title: story.title,
        summary: story.summary,
        tags: story.tags,
        genre: story.genre,
        fandom: story.fandom,
        copyright_type: story.copyright_type,
        crossover: story.crossover,
        cover_image: story.cover_image,
        is_archived: story.is_archived,
        series_id: null
    };
    
    try {
        const res = await fetch(`${API_BASE}/content/stories/${storyId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            story.series_id = null;
            renderStories();
        } else {
            alert('Failed to unlink story');
        }
    } catch(err) {
        console.error(err);
    }
}

function openLinkModal() {
    document.getElementById('linkModal').classList.add('active');
}

function closeLinkModal() {
    document.getElementById('linkModal').classList.remove('active');
}

async function exportSeries() {
    const linked = allStories.filter(s => s.series_id == seriesId);
    
    const exportData = {
        series: currentSeries,
        stories: linked,
        exported_at: new Date().toISOString()
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", (currentSeries.title || "series").replace(/\\s+/g, '_') + ".wseries");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

// Start
init();
