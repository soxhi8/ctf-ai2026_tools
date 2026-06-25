// ==UserScript==
// @name        Chat Exporter (ChatGPT, Claude, Gemini)
// @namespace    tweeks.io
// @version      1.2.0_custom-ctf@ai2026
// @description Export conversations from ChatGPT, Claude, and Gemini. Copy to clipboard or download as markdown.
// @author       NextByte
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @match        https://claude.ai/*
// @match        https://gemini.google.com/*
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ============================================================
  // CONFIGURATION & STATE
  // ============================================================

  const CONFIG = {
    UI_POSITION: { bottom: '20px', right: '20px' },
    TOAST_DURATION: 3000,
  };

  const PLATFORM = detectPlatform();

  // ============================================================
  // PLATFORM DETECTION
  // ============================================================

  function detectPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('chatgpt.com') || hostname.includes('chat.openai.com')) {
      return {
        name: 'ChatGPT',
        id: 'chatgpt',
        assistantName: 'ChatGPT',
      };
    }
    if (hostname.includes('claude.ai')) {
      return {
        name: 'Claude',
        id: 'claude',
        assistantName: 'Claude',
      };
    }
    if (hostname.includes('gemini.google.com')) {
      return {
        name: 'Gemini',
        id: 'gemini',
        assistantName: 'Gemini',
      };
    }
    return null;
  }

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================

  function sanitizeFilename(name) {
    return name
      .replace(/[/\\:*?"<>|]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
  }

  function getFormattedDate() {
    const now = new Date();
    //return now.toISOString().split('T')[0];
    return now.toISOString().replace(/:/g, '-');
  }

  function getFormattedDateTime() {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substring(0, 19);
  }

  function getChatTitle() {
    let title = '';

    switch (PLATFORM?.id) {
      case 'chatgpt':
        // Try to get from page title or sidebar
        title = document.title?.replace(' | ChatGPT', '').replace('ChatGPT', '').trim();
        if (!title || title === 'ChatGPT') {
          const activeChat = document.querySelector('nav [class*="bg-"] a[href*="/c/"]');
          title = activeChat?.textContent?.trim() || '';
        }
        break;

      case 'claude':
        // Get from page title
        title = document.title?.replace(' - Claude', '').trim();
        if (!title || title === 'Claude') {
          title = '';
        }
        break;

      case 'gemini':
        // Get from page title or conversation header
        title = document.title?.replace(' - Google Gemini', '').replace('Gemini', '').trim();
        break;
    }

    return title || 'Conversation';
  }

  function isStreaming() {
    switch (PLATFORM?.id) {
      case 'chatgpt':
        return !!document.querySelector('[data-is-streaming="true"]');
      case 'claude':
        return !!document.querySelector('[data-is-streaming="true"]');
      case 'gemini':
        return !!document.querySelector('.loading-indicator, [aria-busy="true"]');
      default:
        return false;
    }
  }

  // ============================================================
  // HTML TO MARKDOWN CONVERTER
  // ============================================================

  const MarkdownConverter = {
    convert(element) {
      if (!element) return '';
      return this.processNode(element).trim();
    },

    processNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
      }

      const tag = node.tagName.toLowerCase();
      const children = () =>
        Array.from(node.childNodes)
          .map((child) => this.processNode(child))
          .join('');

      switch (tag) {
        // Headings
        case 'h1':
          return `\n# ${children()}\n\n`;
        case 'h2':
          return `\n## ${children()}\n\n`;
        case 'h3':
          return `\n### ${children()}\n\n`;
        case 'h4':
          return `\n#### ${children()}\n\n`;
        case 'h5':
          return `\n##### ${children()}\n\n`;
        case 'h6':
          return `\n###### ${children()}\n\n`;

        // Text formatting
        case 'strong':
        case 'b':
          return `**${children()}**`;
        case 'em':
        case 'i':
          return `*${children()}*`;
        case 'u':
          return `<u>${children()}</u>`;
        case 's':
        case 'strike':
        case 'del':
          return `~~${children()}~~`;

        // Code
        case 'code':
          // Check if inside a pre (code block) - if so, return raw content
          if (node.parentElement?.tagName.toLowerCase() === 'pre') {
            return this.getCodeContent(node);
          }
          // Inline code
          const inlineCode = node.textContent;
          // Use more backticks if content contains backticks
          if (inlineCode.includes('`')) {
            return `\`\` ${inlineCode} \`\``;
          }
          return `\`${inlineCode}\``;

        case 'pre':
          return this.processCodeBlock(node);

        // Links and images
        case 'a':
          const href = node.getAttribute('href') || '';
          const linkText = children() || href;
          return `[${linkText}](${href})`;

        case 'img':
          const alt = node.getAttribute('alt') || 'image';
          const src = node.getAttribute('src') || '';
          return `![${alt}](${src})`;

        // Lists
        case 'ul':
          return '\n' + this.processList(node, false) + '\n';
        case 'ol':
          return '\n' + this.processList(node, true) + '\n';
        case 'li':
          return children();

        // Blockquote
        case 'blockquote':
          const quoteContent = children().trim();
          return (
            '\n' +
            quoteContent
              .split('\n')
              .map((line) => `> ${line}`)
              .join('\n') +
            '\n\n'
          );

        // Table
        case 'table':
          return '\n' + this.processTable(node) + '\n';

        // Paragraphs and divs
        case 'p':
          return `\n${children()}\n`;
        case 'br':
          return '\n';
        case 'hr':
          return '\n---\n';

        // Containers - just process children
        case 'div':
        case 'span':
        case 'article':
        case 'section':
        case 'main':
        case 'header':
        case 'footer':
          return children();

        // Skip these elements
        case 'script':
        case 'style':
        case 'svg':
        case 'button':
        case 'input':
        case 'textarea':
          return '';

        default:
          return children();
      }
    },

    getCodeContent(codeElement) {
      // Extract text content, handling syntax highlighting spans
      let content = '';
      const walker = document.createTreeWalker(
        codeElement,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      let node;
      while ((node = walker.nextNode())) {
        content += node.textContent;
      }
      return content;
    },

    processCodeBlock(preElement) {
      const codeElement = preElement.querySelector('code');
      let code = codeElement
        ? this.getCodeContent(codeElement)
        : preElement.textContent;

      // Try to detect language from class
      let language = '';
      const classes = (codeElement?.className || preElement.className || '').split(' ');
      for (const cls of classes) {
        if (cls.startsWith('language-')) {
          language = cls.replace('language-', '');
          break;
        }
        if (cls.startsWith('hljs-')) continue;
        if (cls.match(/^(javascript|python|java|cpp|c|ruby|go|rust|typescript|html|css|json|yaml|xml|sql|bash|shell|md|markdown)$/i)) {
          language = cls.toLowerCase();
          break;
        }
      }

      // Also check for language indicator in sibling elements (ChatGPT style)
      if (!language) {
        const langIndicator = preElement
          .closest('div')
          ?.querySelector('[class*="text-xs"]');
        if (langIndicator) {
          const langText = langIndicator.textContent?.trim().toLowerCase();
          if (langText && !langText.includes('copy')) {
            language = langText;
          }
        }
      }

      // Clean up the code
      code = code.replace(/^\n+|\n+$/g, '');

      return `\n\`\`\`${language}\n${code}\n\`\`\`\n`;
    },

    processList(listElement, ordered) {
      const items = Array.from(listElement.children).filter(
        (el) => el.tagName.toLowerCase() === 'li'
      );
      return items
        .map((item, index) => {
          const prefix = ordered ? `${index + 1}. ` : '- ';
          const content = this.processListItem(item);
          return prefix + content;
        })
        .join('\n');
    },

    processListItem(liElement) {
      let result = '';
      for (const child of liElement.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          result += child.textContent;
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const tag = child.tagName.toLowerCase();
          if (tag === 'ul' || tag === 'ol') {
            // Nested list - indent
            const nested = this.processList(child, tag === 'ol');
            result +=
              '\n' +
              nested
                .split('\n')
                .map((line) => '  ' + line)
                .join('\n');
          } else {
            result += this.processNode(child);
          }
        }
      }
      return result.trim();
    },

    processTable(tableElement) {
      const rows = Array.from(tableElement.querySelectorAll('tr'));
      if (rows.length === 0) return '';

      const result = [];

      rows.forEach((row, rowIndex) => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        const cellContents = cells.map((cell) =>
          this.processNode(cell).replace(/\n/g, ' ').trim()
        );
        result.push('| ' + cellContents.join(' | ') + ' |');

        // Add separator after header row
        if (rowIndex === 0) {
          result.push('| ' + cells.map(() => '---').join(' | ') + ' |');
        }
      });

      return result.join('\n');
    },
  };

  // ============================================================
  // CHATGPT EXTRACTOR
  // ============================================================

  const ChatGPTExtractor = {
    extract() {
      const messages = [];
      const turns = document.querySelectorAll('[data-testid^="conversation-turn-"]');

      turns.forEach((turn) => {
        const userMsg = turn.querySelector('[data-message-author-role="user"]');

        if (userMsg) {
          const content = userMsg.querySelector('.whitespace-pre-wrap');
          if (content) {
            messages.push({
              role: 'user',
              content: content.textContent.trim(),
            });
          }
        }

        const assistantMsgs = turn.querySelectorAll('[data-message-author-role="assistant"]');
        if (assistantMsgs.length > 0) {
          const parts = [];
          assistantMsgs.forEach((msg) => {
            msg.querySelectorAll('.markdown').forEach((markdownContainer) => {
              const converted = MarkdownConverter.convert(markdownContainer);
              if (converted.trim()) parts.push(converted);
            });
          });
          if (parts.length > 0) {
            messages.push({
              role: 'assistant',
              content: parts.join('\n\n'),
            });
          }
        }
      });

      return messages;
    },
  };

  // ============================================================
  // CLAUDE EXTRACTOR
  // ============================================================

  const ClaudeExtractor = {
    extract() {
      const messages = [];

      // Find all message containers
      // User messages have data-testid="user-message"
      // Assistant responses are in .font-claude-response containers

      const container = document.querySelector('main') || document.body;
      const messageGroups = container.querySelectorAll('[data-test-render-count]');

      messageGroups.forEach((group) => {
        // Check for user message
        const userMsg = group.querySelector('[data-testid="user-message"]');
        if (userMsg) {
          const textContent = userMsg.querySelector('p.whitespace-pre-wrap');
          if (textContent) {
            messages.push({
              role: 'user',
              content: textContent.textContent.trim(),
            });
          }
          return;
        }

        // Check for assistant response
        const assistantResponse = group.querySelector('.font-claude-response');
        if (assistantResponse) {
          const markdownContainers = assistantResponse.querySelectorAll(
            '.standard-markdown, .progressive-markdown'
          );

          if (markdownContainers.length > 0) {
            const parts = [];
            markdownContainers.forEach((container) => {
              const converted = MarkdownConverter.convert(container);
              if (converted.trim()) parts.push(converted);
            });

            if (parts.length > 0) {
              messages.push({
                role: 'assistant',
                content: parts.join('\n\n'),
              });
            }
          }
        }
/*        const assistantResponse = group.querySelector('.font-claude-response');
        if (assistantResponse) {
          const markdownContainer = assistantResponse.querySelector(
            '.standard-markdown, .progressive-markdown'
          );
          if (markdownContainer) {
            messages.push({
              role: 'assistant',
              content: MarkdownConverter.convert(markdownContainer),
            });
          }
        }*/
      });

      // Alternative extraction if the above doesn't find messages
      if (messages.length === 0) {
        // Try finding messages by structure
        const allUserMsgs = document.querySelectorAll('[data-testid="user-message"]');
        const allAssistantMsgs = document.querySelectorAll('.font-claude-response .standard-markdown');

        // Interleave user and assistant messages
        const maxLen = Math.max(allUserMsgs.length, allAssistantMsgs.length);
        for (let i = 0; i < maxLen; i++) {
          if (allUserMsgs[i]) {
            const text = allUserMsgs[i].querySelector('p.whitespace-pre-wrap');
            if (text) {
              messages.push({
                role: 'user',
                content: text.textContent.trim(),
              });
            }
          }
          if (allAssistantMsgs[i]) {
            messages.push({
              role: 'assistant',
              content: MarkdownConverter.convert(allAssistantMsgs[i]),
            });
          }
        }
      }

      return messages;
    },
  };

  // ============================================================
  // GEMINI EXTRACTOR
  // ============================================================

  const GeminiExtractor = {
    extract() {
      const messages = [];

      // Gemini uses Angular components
      const conversationContainers = document.querySelectorAll('.conversation-container');

      conversationContainers.forEach((container) => {
        // User query
        const userQuery = container.querySelector('user-query');
        if (userQuery) {
          const queryText = userQuery.querySelector('.query-text');
          if (queryText) {
            messages.push({
              role: 'user',
              content: queryText.textContent.trim(),
            });
          }
        }

        // Model response
        const modelResponse = container.querySelector('model-response');
        if (modelResponse) {
          const messageContent = modelResponse.querySelector('message-content .markdown');
          if (messageContent) {
            messages.push({
              role: 'assistant',
              content: MarkdownConverter.convert(messageContent),
            });
          }
        }
      });

      // Alternative extraction method
      if (messages.length === 0) {
        const userQueries = document.querySelectorAll('user-query .query-text');
        const modelResponses = document.querySelectorAll('message-content .markdown');

        const maxLen = Math.max(userQueries.length, modelResponses.length);
        for (let i = 0; i < maxLen; i++) {
          if (userQueries[i]) {
            messages.push({
              role: 'user',
              content: userQueries[i].textContent.trim(),
            });
          }
          if (modelResponses[i]) {
            messages.push({
              role: 'assistant',
              content: MarkdownConverter.convert(modelResponses[i]),
            });
          }
        }
      }

      return messages;
    },
  };

  // ============================================================
  // CONVERSATION BUILDER
  // ============================================================

  function extractMessages() {
    switch (PLATFORM?.id) {
      case 'chatgpt':
        return ChatGPTExtractor.extract();
      case 'claude':
        return ClaudeExtractor.extract();
      case 'gemini':
        return GeminiExtractor.extract();
      default:
        return [];
    }
  }

  function buildMarkdown(messages) {
    if (!messages || messages.length === 0) {
      return null;
    }

    const title = getChatTitle();
    const dateTime = getFormattedDateTime();
    const platformName = PLATFORM?.name || 'AI Chat';
    const assistantName = PLATFORM?.assistantName || 'Assistant';

    let markdown = `# ${platformName} Conversation: ${title}\n`;
    markdown += `**Exported:** ${dateTime}\n\n`;
    markdown += `---\n\n`;

    messages.forEach((msg) => {
      const roleName = msg.role === 'user' ? 'User' : assistantName;
      markdown += `<!-- message:${msg.role} -->\n`;
      markdown += `## ${roleName}\n\n`;
      markdown += msg.content.trim();
      markdown += '\n\n';
    });

    return markdown;
  }

  // ============================================================
  // EXPORT ACTIONS
  // ============================================================

  function copyToClipboard() {
    if (isStreaming()) {
      showToast('Please wait for the response to complete', 'warning');
      return;
    }

    const messages = extractMessages();
    const markdown = buildMarkdown(messages);

    if (!markdown) {
      showToast('No conversation found to export', 'error');
      return;
    }

    GM_setClipboard(markdown, 'text');
    showToast('Conversation copied to clipboard!', 'success');
  }

  function downloadFile() {
    if (isStreaming()) {
      showToast('Please wait for the response to complete', 'warning');
      return;
    }

    const messages = extractMessages();
    const markdown = buildMarkdown(messages);

    if (!markdown) {
      showToast('No conversation found to export', 'error');
      return;
    }

    const title = getChatTitle();
    const date = getFormattedDate();
    const platformName = PLATFORM?.name || 'Chat';
    const filename = `${sanitizeFilename(platformName)}-${sanitizeFilename(title)}-${date}.md`;

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`Downloaded: ${filename}`, 'success');
  }

  // ============================================================
  // TOAST NOTIFICATIONS
  // ============================================================

  function showToast(message, type = 'info') {
    // Remove existing toasts
    const existingToast = document.getElementById('ai-exporter-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'ai-exporter-toast';

    const colors = {
      success: { bg: '#10b981', text: '#ffffff' },
      error: { bg: '#ef4444', text: '#ffffff' },
      warning: { bg: '#f59e0b', text: '#000000' },
      info: { bg: '#3b82f6', text: '#ffffff' },
    };

    const color = colors[type] || colors.info;

    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      padding: 12px 20px;
      background: ${color.bg};
      color: ${color.text};
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 2147483647;
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 0.2s ease, transform 0.2s ease;
    `;

    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    // Remove after duration
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 200);
    }, CONFIG.TOAST_DURATION);
  }

  // ============================================================
  // UI CREATION (Trusted Types compliant - no innerHTML)
  // ============================================================

  function createSvgElement(tag, attributes = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attributes)) {
      el.setAttribute(key, value);
    }
    return el;
  }

  function createCopyIcon(color) {
    const svg = createSvgElement('svg', {
      width: '18',
      height: '18',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: color,
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    });
    const rect = createSvgElement('rect', {
      x: '9',
      y: '9',
      width: '13',
      height: '13',
      rx: '2',
      ry: '2',
    });
    const path = createSvgElement('path', {
      d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
    });
    svg.appendChild(rect);
    svg.appendChild(path);
    return svg;
  }

  function createDownloadIcon(color) {
    const svg = createSvgElement('svg', {
      width: '18',
      height: '18',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: color,
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    });
    const path = createSvgElement('path', {
      d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',
    });
    const polyline = createSvgElement('polyline', {
      points: '7 10 12 15 17 10',
    });
    const line = createSvgElement('line', {
      x1: '12',
      y1: '15',
      x2: '12',
      y2: '3',
    });
    svg.appendChild(path);
    svg.appendChild(polyline);
    svg.appendChild(line);
    return svg;
  }

  function createUI() {
    if (!PLATFORM) return;

    // Check if UI already exists
    if (document.getElementById('ai-exporter-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'ai-exporter-panel';

    // Detect dark mode
    const isDarkMode =
      document.documentElement.classList.contains('dark') ||
      document.documentElement.getAttribute('data-mode') === 'dark' ||
      document.body.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    const bgColor = isDarkMode ? '#2d2d2d' : '#ffffff';
    const textColor = isDarkMode ? '#e0e0e0' : '#333333';
    const hoverBg = isDarkMode ? '#404040' : '#f0f0f0';
    const borderColor = isDarkMode ? '#404040' : '#e0e0e0';

    panel.style.cssText = `
      position: fixed;
      bottom: ${CONFIG.UI_POSITION.bottom};
      right: ${CONFIG.UI_POSITION.right};
      display: flex;
      gap: 4px;
      padding: 6px;
      background: ${bgColor};
      border: 1px solid ${borderColor};
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
      z-index: 2147483646;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Copy button
    const copyBtn = createButton(
      'Copy to Clipboard',
      createCopyIcon(textColor),
      copyToClipboard,
      { textColor, hoverBg }
    );

    // Download button
    const downloadBtn = createButton(
      'Download as Markdown',
      createDownloadIcon(textColor),
      downloadFile,
      { textColor, hoverBg }
    );

    panel.appendChild(copyBtn);
    panel.appendChild(downloadBtn);
    document.body.appendChild(panel);
  }

  function createButton(title, iconElement, onClick, styles) {
    const btn = document.createElement('button');
    btn.title = title;
    btn.appendChild(iconElement);

    btn.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: ${styles.textColor};
      cursor: pointer;
      transition: background 0.15s ease;
    `;

    btn.addEventListener('mouseenter', () => {
      btn.style.background = styles.hoverBg;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'transparent';
    });

    btn.addEventListener('click', onClick);

    return btn;
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  function init() {
    if (!PLATFORM) {
      console.log('[AI Chat Exporter] Unsupported platform');
      return;
    }

    console.log(`[AI Chat Exporter] Initialized for ${PLATFORM.name}`);

    // Create UI after a short delay to ensure page is loaded
    setTimeout(createUI, 1000);

    // Watch for SPA navigation (URL changes without page reload)
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        // Recreate UI after navigation
        setTimeout(() => {
          const existingPanel = document.getElementById('ai-exporter-panel');
          if (!existingPanel) {
            createUI();
          }
        }, 500);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Also check periodically in case the panel was removed
    setInterval(() => {
      if (!document.getElementById('ai-exporter-panel')) {
        createUI();
      }
    }, 2000);
  }

  // Start the script
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
