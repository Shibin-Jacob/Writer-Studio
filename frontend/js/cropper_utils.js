(function() {
    // 1. Inject cropper CSS & JS
    if (!document.getElementById('cropper-css')) {
        const link = document.createElement('link');
        link.id = 'cropper-css';
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.css';
        document.head.appendChild(link);
    }

    if (!document.getElementById('cropper-js')) {
        const script = document.createElement('script');
        script.id = 'cropper-js';
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.js';
        document.head.appendChild(script);
    }

    // 2. Inject Modal HTML
    const modalHtml = `
    <div id="cropperOverlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; align-items: center; justify-content: center;">
        <div style="background: var(--surface-white, #fff); padding: 24px; border-radius: 12px; width: 90%; max-width: 600px; max-height: 90vh; display: flex; flex-direction: column;">
            <h3 style="margin-top: 0; color: var(--text-color, #111);">Crop Image</h3>
            <div style="flex: 1; min-height: 300px; max-height: 60vh; overflow: hidden; background: #eee; margin-bottom: 16px; border-radius: 8px;">
                <img id="cropperImage" style="display: block; max-width: 100%;">
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 12px;">
                <button class="btn" id="cropperCancelBtn" style="background: var(--surface-gray, #f3f4f6); color: var(--text-color, #111);">Cancel</button>
                <button class="btn" id="cropperSaveBtn">Crop & Save</button>
            </div>
        </div>
    </div>
    `;
    
    // Append modal to body once DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectModal);
    } else {
        injectModal();
    }

    function injectModal() {
        if (!document.getElementById('cropperOverlay')) {
            const div = document.createElement('div');
            div.innerHTML = modalHtml;
            document.body.appendChild(div.firstElementChild);
        }
    }

    // 3. Expose global function
    window.openImageCropper = function(file, aspectRatio) {
        return new Promise((resolve, reject) => {
            // Wait for script to load if it hasn't
            if (typeof Cropper === 'undefined') {
                const script = document.getElementById('cropper-js');
                if (script) {
                    script.onload = () => initCropper(file, aspectRatio, resolve, reject);
                    script.onerror = () => reject(new Error('Failed to load Cropper.js'));
                    return;
                } else {
                    reject(new Error('Cropper script not found'));
                    return;
                }
            }
            initCropper(file, aspectRatio, resolve, reject);
        });
    };

    let currentCropper = null;

    function initCropper(file, aspectRatio, resolve, reject) {
        if (!file) {
            reject(new Error('No file provided'));
            return;
        }
        
        const overlay = document.getElementById('cropperOverlay');
        const img = document.getElementById('cropperImage');
        const cancelBtn = document.getElementById('cropperCancelBtn');
        const saveBtn = document.getElementById('cropperSaveBtn');

        // Create object URL
        const url = URL.createObjectURL(file);
        img.src = url;

        overlay.style.display = 'flex';

        if (currentCropper) {
            currentCropper.destroy();
        }

        // Initialize Cropper when image loads
        img.onload = () => {
            currentCropper = new Cropper(img, {
                aspectRatio: aspectRatio, // 1, 16/9, NaN (free), etc.
                viewMode: 2,
                dragMode: 'move',
                background: false,
                autoCropArea: 0.9,
            });
        };

        // Cleanup function
        const cleanup = () => {
            overlay.style.display = 'none';
            if (currentCropper) {
                currentCropper.destroy();
                currentCropper = null;
            }
            URL.revokeObjectURL(url);
            
            // Remove listeners
            cancelBtn.removeEventListener('click', onCancel);
            saveBtn.removeEventListener('click', onSave);
        };

        const onCancel = () => {
            cleanup();
            reject(new Error('User cancelled cropping'));
        };

        const onSave = () => {
            if (!currentCropper) return;
            
            // Get cropped canvas
            const canvas = currentCropper.getCroppedCanvas({
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high',
                maxWidth: 1920,
                maxHeight: 1920
            });
            
            // Convert to Blob
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Failed to crop image'));
                    cleanup();
                    return;
                }
                
                // Keep original filename and type if possible, or default to jpeg
                const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                // create a File object
                const croppedFile = new File([blob], file.name, { type: type, lastModified: Date.now() });
                
                resolve(croppedFile);
                cleanup();
            }, file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9);
        };

        cancelBtn.addEventListener('click', onCancel);
        saveBtn.addEventListener('click', onSave);
    }
})();
