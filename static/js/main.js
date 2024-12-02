function copyToClipboard() {
    const promptContent = document.querySelector('.prompt-content pre').textContent;
    navigator.clipboard.writeText(promptContent).then(() => {
        // Visual feedback first
        const copyBtn = document.querySelector('.btn-primary[onclick="copyToClipboard()"]');
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        
        // Track the copy
        fetch(`/track-copy/${promptId}`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const copyCount = document.querySelector('[data-type="copies"]');
                if (copyCount) {
                    copyCount.textContent = data.count;
                }
            }
        })
        .finally(() => {
            // Reset button text after 2 seconds regardless of tracking success
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 2000);
        });
    });
}

// Track view on page load
document.addEventListener('DOMContentLoaded', function() {
    const promptId = document.getElementById('promptId').value;
    
    fetch(`/track-view/${promptId}`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            const viewCount = document.querySelector('[data-type="views"]');
            viewCount.textContent = data.count;
        }
    });
}); 