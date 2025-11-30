const API_URL = window.location.origin;
let currentConfig = {
    iconUrl: null,
    headerImageUrl: null,
    agentImageUrl: null,
    bannerImageUrl: null,
    primaryColor: '#667eea',
    widgetCode: ''
};

// Load user info
async function loadUserInfo() {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = '/pricing.html';
            return;
        }

        const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            window.location.href = '/pricing.html';
            return;
        }

        const data = await response.json();
        const user = data.user;

        const initial = user.name.charAt(0).toUpperCase();
        document.getElementById('userInitial').textContent = initial;
        document.getElementById('profileInitial').textContent = initial;
        document.getElementById('userEmail').textContent = user.email;
        document.getElementById('userGreeting').textContent = `Hi, ${user.name.split(' ')[0]}!`;

        await loadConfig();
    } catch (error) {
        console.error('Error loading user info:', error);
        window.location.href = '/pricing.html';
    }
}

// Load chatbot configuration
async function loadConfig() {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_URL}/api/chatbot/config`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            currentConfig = await response.json();
            updateAllPreviews();
            updateCodeSnippet();
        }
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

// Update all previews
function updateAllPreviews() {
    updateColorPreview();
    updateHeaderImage();
    updateAgentImage();
    updateBannerImage();
    updateChatbotWidget();
}

// Update color preview
function updateColorPreview() {
    const colorPreview = document.getElementById('colorPreviewBox');
    const chatbotHeader = document.querySelector('.vfrc-header');
    const chatbotLauncher = document.getElementById('chatbotLauncher');
    const containerInner = document.getElementById('chatbotContainerInner');
    
    if (colorPreview) colorPreview.style.background = currentConfig.primaryColor;
    if (chatbotHeader) chatbotHeader.style.background = currentConfig.primaryColor;
    if (chatbotLauncher) chatbotLauncher.style.background = currentConfig.primaryColor;
    
    // Update CSS variables for color palette
    if (containerInner) {
        const color = currentConfig.primaryColor;
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        // Generate color palette shades
        containerInner.style.setProperty('--_1bof89n0', `rgb(${Math.min(255, r + 30)}, ${Math.min(255, g + 30)}, ${Math.min(255, b + 30)})`);
        containerInner.style.setProperty('--_1bof89n5', color);
    }
    
    document.getElementById('colorPicker').value = currentConfig.primaryColor;
    document.getElementById('colorInput').value = currentConfig.primaryColor;
}

// Update header image
function updateHeaderImage() {
    const preview = document.getElementById('headerImagePreview');
    const headerIcon = document.getElementById('headerIcon');
    
    if (currentConfig.headerImageUrl) {
        if (preview) {
            preview.src = currentConfig.headerImageUrl;
            preview.style.display = 'block';
        }
        if (headerIcon) {
            headerIcon.src = currentConfig.headerImageUrl;
            headerIcon.style.display = 'block';
        }
    } else {
        if (preview) preview.style.display = 'none';
        if (headerIcon) {
            headerIcon.src = 'https://cdn.voiceflow.com/widget-next/vf_chat.png';
            headerIcon.style.display = 'block';
        }
    }
}

// Update agent image
function updateAgentImage() {
    const preview = document.getElementById('agentImagePreview');
    const agentImg = document.getElementById('agentPreviewImg');
    
    if (currentConfig.agentImageUrl) {
        if (preview) {
            preview.src = currentConfig.agentImageUrl;
            preview.style.display = 'block';
        }
        if (agentImg) {
            agentImg.src = currentConfig.agentImageUrl;
            agentImg.style.display = 'block';
        }
    } else {
        if (preview) preview.style.display = 'none';
        if (agentImg) {
            agentImg.src = 'https://cdn.voiceflow.com/widget-next/vf_chat.png';
            agentImg.style.display = 'block';
        }
    }
}

// Update banner image
function updateBannerImage() {
    const preview = document.getElementById('bannerImagePreview');
    const bannerSection = document.getElementById('chatbotBanner');
    
    if (currentConfig.bannerImageUrl) {
        if (preview) {
            preview.src = currentConfig.bannerImageUrl;
            preview.style.display = 'block';
        }
        if (bannerSection) {
            bannerSection.style.backgroundImage = `url(${currentConfig.bannerImageUrl})`;
            bannerSection.style.backgroundSize = 'cover';
            bannerSection.style.backgroundPosition = 'center';
        }
    } else {
        if (preview) preview.style.display = 'none';
        if (bannerSection) {
            bannerSection.style.backgroundImage = 'none';
            bannerSection.style.background = '#f9f9f9';
        }
    }
}

// Update chatbot widget
function updateChatbotWidget() {
    const launcherIcon = document.getElementById('launcherIcon');
    const launcherChevron = document.getElementById('launcherChevron');
    
    if (currentConfig.iconUrl) {
        launcherIcon.src = currentConfig.iconUrl;
        launcherIcon.style.display = 'block';
        if (launcherChevron) launcherChevron.style.display = 'block';
    } else {
        launcherIcon.style.display = 'none';
        if (launcherChevron) launcherChevron.style.display = 'block';
    }
}

// Color picker handlers
document.getElementById('colorPicker').addEventListener('input', (e) => {
    document.getElementById('colorInput').value = e.target.value;
    updateColor(e.target.value);
});

document.getElementById('colorInput').addEventListener('input', (e) => {
    const color = e.target.value;
    if (/^#[0-9A-F]{6}$/i.test(color)) {
        document.getElementById('colorPicker').value = color;
        updateColor(color);
    }
});

async function updateColor(color) {
    currentConfig.primaryColor = color;
    updateColorPreview();
    await saveConfig();
}

// Image upload handlers
function setupImageUpload(inputId, endpoint, previewId, configKey) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const uploadAreaId = inputId.replace('File', 'Upload');
    const uploadArea = document.getElementById(uploadAreaId);
    
    if (uploadArea) {
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleImageUpload(files[0], endpoint, previewId, configKey);
            }
        });
    }
    
    input.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleImageUpload(e.target.files[0], endpoint, previewId, configKey);
        }
    });
}

async function handleImageUpload(file, endpoint, previewId, configKey) {
    const formData = new FormData();
    formData.append(endpoint.includes('icon') ? 'icon' : 'image', file);

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_URL}/api/chatbot/${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            currentConfig[configKey] = data[configKey];
            const preview = document.getElementById(previewId);
            if (preview && data[configKey]) {
                preview.src = data[configKey];
                preview.style.display = 'block';
            }
            updateAllPreviews();
        } else {
            const errorData = await response.json();
            alert(errorData.error || 'Failed to upload image');
        }
    } catch (error) {
        console.error('Error uploading image:', error);
        alert('Error uploading image');
    }
}

// Setup all image uploads
setupImageUpload('headerImageFile', 'upload-header-image', 'headerImagePreview', 'headerImageUrl');
setupImageUpload('agentImageFile', 'upload-agent-image', 'agentImagePreview', 'agentImageUrl');
setupImageUpload('bannerImageFile', 'upload-banner-image', 'bannerImagePreview', 'bannerImageUrl');

// Banner text handlers
document.getElementById('bannerHeaderInput').addEventListener('input', (e) => {
    document.getElementById('bannerHeaderPreview').textContent = e.target.value;
    document.getElementById('bannerHeaderText').textContent = e.target.value;
});

document.getElementById('bannerDescriptionInput').addEventListener('input', (e) => {
    document.getElementById('bannerDescPreview').textContent = e.target.value;
    document.getElementById('bannerDescriptionText').textContent = e.target.value;
});

// Toggle handlers
document.getElementById('headerImageToggle').addEventListener('change', (e) => {
    document.getElementById('headerImageSection').style.display = e.target.checked ? 'block' : 'none';
});

document.getElementById('agentImageToggle').addEventListener('change', (e) => {
    document.getElementById('agentImageSection').style.display = e.target.checked ? 'block' : 'none';
});

document.getElementById('bannerToggle').addEventListener('change', (e) => {
    document.getElementById('bannerSection').style.display = e.target.checked ? 'block' : 'none';
    document.getElementById('chatbotBanner').style.display = e.target.checked ? 'flex' : 'none';
});

// Provider search
let providers = [];
async function loadProviders() {
    try {
        const response = await fetch(`${API_URL}/api/chatbot/providers`);
        providers = await response.json();
        displayProviders(providers);
    } catch (error) {
        console.error('Error loading providers:', error);
    }
}

function displayProviders(providerList) {
    const container = document.getElementById('providerIcons');
    container.innerHTML = '';
    
    providerList.forEach(provider => {
        const div = document.createElement('div');
        div.className = 'provider-icon';
        div.title = provider.name;
        div.innerHTML = `<img src="${provider.icon}" alt="${provider.name}">`;
        div.onclick = () => {
            window.location.href = provider.blogUrl;
        };
        container.appendChild(div);
    });
}

document.getElementById('providerSearch').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = providers.filter(p => p.name.toLowerCase().includes(query));
    displayProviders(filtered);
});

// Copy code
function copyCode() {
    const code = document.getElementById('codeSnippet').textContent;
    navigator.clipboard.writeText(code).then(() => {
        const btn = document.querySelector('.copy-btn');
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        document.getElementById('copySuccess').classList.add('active');
        
        setTimeout(() => {
            btn.textContent = 'Copy Code';
            btn.classList.remove('copied');
            document.getElementById('copySuccess').classList.remove('active');
        }, 2000);
    });
}

// Update code snippet
function updateCodeSnippet() {
    const code = currentConfig.widgetCode || generateDefaultCode();
    document.getElementById('codeSnippet').textContent = code;
}

function generateDefaultCode() {
    return `<script>
  (function() {
    var chatbot = document.createElement('div');
    chatbot.id = 'ai-chatbot-widget';
    document.body.appendChild(chatbot);
    
    var script = document.createElement('script');
    script.src = '${API_URL}/widget.js';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;
}

// Save config
async function saveConfig() {
    try {
        const token = localStorage.getItem('authToken');
        await fetch(`${API_URL}/api/chatbot/config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                primaryColor: currentConfig.primaryColor,
                widgetCode: currentConfig.widgetCode,
                headerImageUrl: currentConfig.headerImageUrl,
                agentImageUrl: currentConfig.agentImageUrl,
                bannerImageUrl: currentConfig.bannerImageUrl
            })
        });
    } catch (error) {
        console.error('Error saving config:', error);
    }
}

// Toggle chatbot popup
function toggleChatbot() {
    const window = document.getElementById('chatbotWindow');
    if (window.style.display === 'none' || !window.style.display) {
        window.style.display = 'flex';
        window.classList.add('active');
    } else {
        window.style.display = 'none';
        window.classList.remove('active');
    }
}

// Toggle user popup
function toggleUserPopup() {
    document.getElementById('userPopup').classList.toggle('active');
}

// Initialize
window.addEventListener('load', async () => {
    await loadUserInfo();
    await loadProviders();
});

