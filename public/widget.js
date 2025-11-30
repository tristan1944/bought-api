(function() {
  'use strict';

  // Find widget container
  var widgetContainer = document.getElementById('ai-chatbot-widget');
  if (!widgetContainer) {
    console.error('Chatbot widget container not found');
    return;
  }

  // Get userId from data attribute
  var userId = widgetContainer.getAttribute('data-user-id');
  if (!userId) {
    console.error('User ID not found in widget container');
    return;
  }

  // Get API base URL
  var scriptTag = document.querySelector('script[src*="widget.js"]');
  var scriptSrc = scriptTag ? scriptTag.src : '';
  var apiBaseUrl = scriptSrc.substring(0, scriptSrc.lastIndexOf('/')) || window.location.origin;

  // Widget state
  var isOpen = false;
  var config = {
    iconUrl: null,
    headerImageUrl: null,
    agentImageUrl: null,
    bannerImageUrl: null,
    bannerHeader: 'Your AI agent',
    bannerDescription: 'How can I help you today?',
    primaryColor: '#667eea'
  };

  // Inject custom CSS styles
  function injectStyles() {
    if (document.getElementById('chatbot-widget-styles')) return;

    var style = document.createElement('style');
    style.id = 'chatbot-widget-styles';
    style.textContent = `
      #ai-chatbot-widget {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        position: fixed;
        bottom: 0;
        right: 0;
        z-index: 9999;
      }
      
      .chatbot-launcher {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        overflow: hidden;
      }
      
      .chatbot-launcher:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }
      
      .chatbot-launcher-icon {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
      }
      
      .chatbot-launcher-default {
        width: 32px;
        height: 32px;
        fill: white;
      }
      
      .chatbot-window {
        position: fixed;
        bottom: 100px;
        right: 24px;
        width: 380px;
        max-width: calc(100vw - 48px);
        height: 600px;
        max-height: calc(100vh - 120px);
        background: white;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        display: none;
        flex-direction: column;
        overflow: hidden;
      }
      
      .chatbot-window.open {
        display: flex;
      }
      
      .chatbot-header {
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        border-bottom: 1px solid #e5e7eb;
        flex-shrink: 0;
      }
      
      .chatbot-header-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        object-fit: cover;
        background: #f3f4f6;
      }
      
      .chatbot-header-info {
        flex: 1;
        min-width: 0;
      }
      
      .chatbot-header-title {
        font-size: 16px;
        font-weight: 600;
        color: #111827;
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .chatbot-header-subtitle {
        font-size: 12px;
        color: #6b7280;
        margin: 2px 0 0 0;
      }
      
      .chatbot-header-close {
        width: 32px;
        height: 32px;
        border: none;
        background: transparent;
        cursor: pointer;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6b7280;
        transition: background 0.2s;
      }
      
      .chatbot-header-close:hover {
        background: #f3f4f6;
      }
      
      .chatbot-banner {
        padding: 24px 20px;
        text-align: center;
        position: relative;
        background: #f9fafb;
        flex-shrink: 0;
      }
      
      .chatbot-banner-image {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        z-index: 0;
      }
      
      .chatbot-banner-content {
        position: relative;
        z-index: 1;
      }
      
      .chatbot-banner-avatar {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        object-fit: cover;
        margin: 0 auto 12px;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      
      .chatbot-banner-title {
        font-size: 18px;
        font-weight: 600;
        color: #111827;
        margin: 0 0 4px 0;
      }
      
      .chatbot-banner-description {
        font-size: 14px;
        color: #6b7280;
        margin: 0;
      }
      
      .chatbot-messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        background: #ffffff;
      }
      
      .chatbot-message {
        margin-bottom: 16px;
        display: flex;
        flex-direction: column;
      }
      
      .chatbot-message-bubble {
        background: #f3f4f6;
        padding: 12px 16px;
        border-radius: 12px;
        max-width: 85%;
        word-wrap: break-word;
      }
      
      .chatbot-message-bubble p {
        margin: 0;
        font-size: 14px;
        line-height: 1.5;
        color: #111827;
      }
      
      .chatbot-input-area {
        padding: 16px 20px;
        border-top: 1px solid #e5e7eb;
        background: white;
        flex-shrink: 0;
      }
      
      .chatbot-input-wrapper {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #f9fafb;
        border-radius: 24px;
        padding: 8px 12px;
        border: 1px solid #e5e7eb;
      }
      
      .chatbot-input {
        flex: 1;
        border: none;
        background: transparent;
        outline: none;
        font-size: 14px;
        color: #111827;
        font-family: inherit;
        resize: none;
        max-height: 100px;
      }
      
      .chatbot-input::placeholder {
        color: #9ca3af;
      }
      
      .chatbot-send-button {
        width: 32px;
        height: 32px;
        border: none;
        background: transparent;
        cursor: pointer;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6b7280;
        transition: background 0.2s, color 0.2s;
        flex-shrink: 0;
      }
      
      .chatbot-send-button:hover {
        background: #e5e7eb;
        color: #111827;
      }
      
      .chatbot-send-button svg {
        width: 18px;
        height: 18px;
      }
      
      @media (max-width: 480px) {
        .chatbot-window {
          width: 100%;
          height: 100%;
          max-height: 100vh;
          bottom: 0;
          right: 0;
          border-radius: 0;
        }
        
        .chatbot-launcher {
          bottom: 16px;
          right: 16px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Create widget HTML structure
  function createWidget() {
    widgetContainer.innerHTML = '';

    // Launcher button
    var launcher = document.createElement('button');
    launcher.className = 'chatbot-launcher';
    launcher.id = 'chatbotLauncher';
    launcher.setAttribute('aria-label', 'Open chatbot');
    launcher.onclick = toggleChatbot;

    var launcherIcon = document.createElement('img');
    launcherIcon.className = 'chatbot-launcher-icon';
    launcherIcon.id = 'launcherIcon';
    launcherIcon.style.display = 'none';
    launcherIcon.alt = 'Chat';

    var defaultIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    defaultIcon.className = 'chatbot-launcher-default';
    defaultIcon.setAttribute('viewBox', '0 0 24 24');
    defaultIcon.id = 'launcherDefaultIcon';
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z');
    defaultIcon.appendChild(path);

    launcher.appendChild(launcherIcon);
    launcher.appendChild(defaultIcon);
    widgetContainer.appendChild(launcher);

    // Chat window
    var chatWindow = document.createElement('div');
    chatWindow.className = 'chatbot-window';
    chatWindow.id = 'chatbotWindow';

    // Header
    var header = document.createElement('div');
    header.className = 'chatbot-header';

    var headerAvatar = document.createElement('img');
    headerAvatar.className = 'chatbot-header-avatar';
    headerAvatar.id = 'headerAvatar';
    headerAvatar.alt = 'Agent';
    headerAvatar.src = 'https://cdn.voiceflow.com/widget-next/vf_chat.png';

    var headerInfo = document.createElement('div');
    headerInfo.className = 'chatbot-header-info';

    var headerTitle = document.createElement('h3');
    headerTitle.className = 'chatbot-header-title';
    headerTitle.id = 'headerTitle';
    headerTitle.textContent = 'Your AI agent';

    var headerSubtitle = document.createElement('p');
    headerSubtitle.className = 'chatbot-header-subtitle';
    headerSubtitle.textContent = 'Online';

    headerInfo.appendChild(headerTitle);
    headerInfo.appendChild(headerSubtitle);

    var closeButton = document.createElement('button');
    closeButton.className = 'chatbot-header-close';
    closeButton.setAttribute('aria-label', 'Close');
    closeButton.onclick = toggleChatbot;
    closeButton.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

    header.appendChild(headerAvatar);
    header.appendChild(headerInfo);
    header.appendChild(closeButton);

    // Banner
    var banner = document.createElement('div');
    banner.className = 'chatbot-banner';
    banner.id = 'chatbotBanner';

    var bannerImage = document.createElement('img');
    bannerImage.className = 'chatbot-banner-image';
    bannerImage.id = 'bannerImage';
    bannerImage.style.display = 'none';

    var bannerContent = document.createElement('div');
    bannerContent.className = 'chatbot-banner-content';

    var bannerAvatar = document.createElement('img');
    bannerAvatar.className = 'chatbot-banner-avatar';
    bannerAvatar.id = 'bannerAvatar';
    bannerAvatar.alt = 'Agent';
    bannerAvatar.src = 'https://cdn.voiceflow.com/widget-next/vf_chat.png';

    var bannerTitle = document.createElement('h2');
    bannerTitle.className = 'chatbot-banner-title';
    bannerTitle.id = 'bannerTitle';
    bannerTitle.textContent = 'Your AI agent';

    var bannerDescription = document.createElement('p');
    bannerDescription.className = 'chatbot-banner-description';
    bannerDescription.id = 'bannerDescription';
    bannerDescription.textContent = 'How can I help you today?';

    bannerContent.appendChild(bannerAvatar);
    bannerContent.appendChild(bannerTitle);
    bannerContent.appendChild(bannerDescription);
    banner.appendChild(bannerImage);
    banner.appendChild(bannerContent);

    // Messages area
    var messagesArea = document.createElement('div');
    messagesArea.className = 'chatbot-messages';
    messagesArea.id = 'messagesArea';

    var welcomeMessage = document.createElement('div');
    welcomeMessage.className = 'chatbot-message';
    var bubble = document.createElement('div');
    bubble.className = 'chatbot-message-bubble';
    var p = document.createElement('p');
    p.textContent = "Hi there! I'm an AI agent trained on docs, help articles, and other important content. How can I best help you today?";
    bubble.appendChild(p);
    welcomeMessage.appendChild(bubble);
    messagesArea.appendChild(welcomeMessage);

    // Input area
    var inputArea = document.createElement('div');
    inputArea.className = 'chatbot-input-area';

    var inputWrapper = document.createElement('div');
    inputWrapper.className = 'chatbot-input-wrapper';

    var input = document.createElement('textarea');
    input.className = 'chatbot-input';
    input.id = 'chatbotInput';
    input.placeholder = 'Type a message...';
    input.rows = 1;

    var sendButton = document.createElement('button');
    sendButton.className = 'chatbot-send-button';
    sendButton.type = 'button';
    sendButton.setAttribute('aria-label', 'Send message');
    sendButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';

    inputWrapper.appendChild(input);
    inputWrapper.appendChild(sendButton);
    inputArea.appendChild(inputWrapper);

    chatWindow.appendChild(header);
    chatWindow.appendChild(banner);
    chatWindow.appendChild(messagesArea);
    chatWindow.appendChild(inputArea);
    widgetContainer.appendChild(chatWindow);
  }

  // Apply configuration
  function applyConfig() {
    var launcher = document.getElementById('chatbotLauncher');
    var launcherIcon = document.getElementById('launcherIcon');
    var launcherDefaultIcon = document.getElementById('launcherDefaultIcon');
    var header = document.querySelector('.chatbot-header');
    var headerAvatar = document.getElementById('headerAvatar');
    var headerTitle = document.getElementById('headerTitle');
    var banner = document.getElementById('chatbotBanner');
    var bannerAvatar = document.getElementById('bannerAvatar');
    var bannerImage = document.getElementById('bannerImage');
    var bannerTitle = document.getElementById('bannerTitle');
    var bannerDescription = document.getElementById('bannerDescription');

    // Apply primary color
    if (launcher) {
      launcher.style.background = config.primaryColor;
    }
    if (header) {
      header.style.borderBottomColor = config.primaryColor;
      header.style.borderBottomWidth = '2px';
    }

    // Apply icon
    if (config.iconUrl && launcherIcon) {
      launcherIcon.src = apiBaseUrl + config.iconUrl;
      launcherIcon.style.display = 'block';
      if (launcherDefaultIcon) {
        launcherDefaultIcon.style.display = 'none';
      }
    } else if (launcherDefaultIcon) {
      launcherDefaultIcon.style.display = 'block';
    }

    // Apply header image
    if (config.headerImageUrl && headerAvatar) {
      headerAvatar.src = apiBaseUrl + config.headerImageUrl;
    }

    // Apply agent image
    if (config.agentImageUrl && bannerAvatar) {
      bannerAvatar.src = apiBaseUrl + config.agentImageUrl;
    }

    // Apply banner image
    if (config.bannerImageUrl && bannerImage) {
      bannerImage.src = apiBaseUrl + config.bannerImageUrl;
      bannerImage.style.display = 'block';
      if (banner) {
        banner.style.background = 'transparent';
      }
    }

    // Apply banner text
    if (bannerTitle && config.bannerHeader) {
      bannerTitle.textContent = config.bannerHeader;
    }
    if (bannerDescription && config.bannerDescription) {
      bannerDescription.textContent = config.bannerDescription;
    }
    if (headerTitle && config.bannerHeader) {
      headerTitle.textContent = config.bannerHeader;
    }
  }

  // Toggle chatbot
  function toggleChatbot() {
    isOpen = !isOpen;
    var chatWindow = document.getElementById('chatbotWindow');
    if (chatWindow) {
      if (isOpen) {
        chatWindow.classList.add('open');
      } else {
        chatWindow.classList.remove('open');
      }
    }
  }

  // Fetch configuration
  async function loadConfig() {
    try {
      var response = await fetch(apiBaseUrl + '/api/chatbot/widget-config/' + userId);
      if (response.ok) {
        config = await response.json();
        applyConfig();
      }
    } catch (error) {
      console.error('Error loading widget config:', error);
    }
  }

  // Initialize widget
  function init() {
    injectStyles();
    createWidget();
    loadConfig();
  }

  // Start initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
