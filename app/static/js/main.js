document.addEventListener('DOMContentLoaded', function() {
    const promptId = document.getElementById('promptId').value;
    
    fetch(`/prompt/${promptId}/view`, {
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

function submitFeedback(type, promptId) {
    fetch(`/feedback/${promptId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            type: type
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            // Refresh the page to update all stats
            location.reload();
        }
    })
    .catch(error => console.error('Error:', error));
}

function copyToClipboard() {
    const promptContent = document.querySelector('.prompt-content pre').textContent;
    navigator.clipboard.writeText(promptContent).then(() => {
        // Visual feedback first
        const copyBtn = document.querySelector('.btn-primary[onclick="copyToClipboard()"]');
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        
        // Track the copy
        fetch(`/prompt/${promptId}/copy`, {
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
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 2000);
        });
    });
}

function showCommentForm(action) {
    document.getElementById('feedbackAction').value = action;
    document.getElementById('feedbackForm').style.display = 'block';
}

function hideCommentForm() {
    document.getElementById('feedbackForm').style.display = 'none';
}