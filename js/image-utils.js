// Image Utilities
export const imageUtils = {
    // Convert file to base64 data URL
    fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    // Handle file input change
    async handleFileInput(files) {
        const { setState } = await import('./store.js');

        const newImages = [];
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                try {
                    const dataUrl = await this.fileToDataUrl(file);
                    newImages.push({
                        file,
                        dataUrl,
                        name: file.name
                    });
                } catch (error) {
                    console.error('Error processing image:', error);
                }
            }
        }
        
        if (newImages.length > 0) {
            setState((state) => ({
                attachedImages: [...state.attachedImages, ...newImages]
            }));
        }
        // Image preview will update automatically via subscription
    },

    // Remove image from attached images
    async removeImage(index) {
        const { setState } = await import('./store.js');

        setState((state) => ({
            attachedImages: state.attachedImages.filter((_, i) => i !== index)
        }));
        // Image preview will update automatically via subscription
    },

    // Handle paste event in textarea
    async handlePaste(event) {
        const items = event.clipboardData?.items;
        if (!items) return;

        const imageFiles = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    imageFiles.push(file);
                }
            }
        }

        if (imageFiles.length > 0) {
            event.preventDefault(); // Prevent default paste behavior
            await this.handleFileInput(imageFiles);
        }
    },

    // Handle drag and drop
    handleDragOver(event) {
        event.preventDefault();
        event.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
    },

    handleDragLeave(event) {
        event.preventDefault();
        event.currentTarget.style.backgroundColor = '';
    },

    async handleDrop(event) {
        event.preventDefault();
        event.currentTarget.style.backgroundColor = '';

        const files = Array.from(event.dataTransfer.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length > 0) {
            await this.handleFileInput(imageFiles);
        }
    }
};
