// forum.js - Complete Frontend JavaScript

class ForumManager {
    constructor() {
        this.posts = [];
        this.isSecretMode = this.checkSecretMode();
        this.isEncrypting = false;
        this.currentFilter = 'hot';
        this.currentTimeFilter = 'today';
        this.page = 1;
        this.postsPerPage = 10;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialPosts();
        this.updateSecretModeUI();
        this.startTicker();
        this.checkServiceHealth();
        this.hideLoadingScreen();
        this.setupCharCounters();
    }

    hideLoadingScreen() {
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
                setTimeout(() => loadingScreen.remove(), 500);
            }
        }, 1500);
    }

    setupCharCounters() {
        const titleInput = document.getElementById('postTitle');
        const contentInput = document.getElementById('postContent');
        const titleCounter = document.getElementById('titleCounter');
        const contentCounter = document.getElementById('contentCounter');

        titleInput.addEventListener('input', (e) => {
            titleCounter.textContent = `${e.target.value.length}/100`;
        });

        contentInput.addEventListener('input', (e) => {
            contentCounter.textContent = `${e.target.value.length}/500`;
        });
    }

    async checkServiceHealth() {
        try {
            const response = await fetch('/api/health');
            const data = await response.json();
            
            if (data.status !== 'ready') {
                this.showNotification('🔥 AI Encryption warming up... Please wait', 'info');
            } else {
                console.log('✅ AI Service Ready');
            }
        } catch (error) {
            console.error('Health check failed:', error);
            this.showNotification('⚠️ AI Service offline. Using fallback encryption.', 'warning');
        }
    }

    checkSecretMode() {
        return document.cookie.includes('secret_mode=unlocked');
    }

    setupEventListeners() {
        // Post buttons
        document.getElementById('postBtn').addEventListener('click', () => this.createPost(false));
        document.getElementById('encryptBtn').addEventListener('click', () => this.createPost(true));
        document.getElementById('previewBtn').addEventListener('click', () => this.previewPost());
        
        // Filter tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.filterPosts(e.target.dataset.filter);
            });
        });

        // Time filter
        document.getElementById('timeFilter').addEventListener('change', (e) => {
            this.currentTimeFilter = e.target.value;
            this.renderPosts();
        });

        // Secret mode toggle
        document.getElementById('secretStatus').addEventListener('click', () => this.toggleSecretMode());
        
        // Load more button
        document.getElementById('loadMoreBtn').addEventListener('click', () => this.loadMorePosts());
        
        // Modal close
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                this.createPost(true);
            }
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.createPost(false);
            }
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });

        // Auto-save draft
        setInterval(() => this.saveDraft(), 30000);
    }

    saveDraft() {
        const title = document.getElementById('postTitle').value;
        const content = document.getElementById('postContent').value;
        
        if (title || content) {
            localStorage.setItem('obliq_draft', JSON.stringify({ title, content }));
            console.log('Draft saved');
        }
    }

    loadDraft() {
        const draft = localStorage.getItem('obliq_draft');
        if (draft) {
            const { title, content } = JSON.parse(draft);
            document.getElementById('postTitle').value = title || '';
            document.getElementById('postContent').value = content || '';
            this.showNotification('📝 Draft restored', 'info');
        }
    }

    async createPost(encrypt = false) {
        const title = document.getElementById('postTitle').value.trim();
        const content = document.getElementById('postContent').value.trim();

        if (!title || !content) {
            this.showNotification('Drop some alpha first, bro! 📉', 'error');
            this.shakeElement(title ? 'postContent' : 'postTitle');
            return;
        }

        if (title.length > 100 || content.length > 500) {
            this.showNotification('Keep it concise! Character limit exceeded 📊', 'error');
            return;
        }

        if (this.isEncrypting) {
            this.showNotification('Already encrypting... Diamond hands! 💎', 'warning');
            return;
        }

        let processedContent = content;
        let isEncrypted = encrypt;

        if (encrypt) {
            this.isEncrypting = true;
            this.showLoadingState(true);
            
            try {
                processedContent = await this.encryptContent(content);
                this.showNotification('🔐 Message encrypted with GLM-4.5 AI!', 'success');
            } catch (error) {
                this.showNotification('AI offline. Using fallback encryption... 🔄', 'warning');
                processedContent = this.fallbackEncrypt(content);
            } finally {
                this.isEncrypting = false;
                this.showLoadingState(false);
            }
        }

        const post = {
            id: Date.now(),
            title: title,
            content: processedContent,
            originalContent: content,
            author: this.generateBroName(),
            timestamp: new Date(),
            likes: Math.floor(Math.random() * 500),
            comments: Math.floor(Math.random() * 100),
            encrypted: isEncrypted,
            gains: this.generateGains(),
            awards: this.generateAwards()
        };

        this.posts.unshift(post);
        this.renderPosts();
        this.clearForm();
        localStorage.removeItem('obliq_draft');
        
        if (!encrypt) {
            this.showNotification('Alpha dropped! 🚀 TO THE MOON!', 'success');
        }

        this.animateNewPost(post.id);
    }

    async encryptContent(content) {
        const response = await fetch('/api/encrypt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: content })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Encryption failed');
        }
        
        const data = await response.json();
        return data.encrypted || content;
    }

    fallbackEncrypt(text) {
        // Sophisticated fallback encryption
        const words = text.split(' ');
        const financeTerms = ['BULL', 'BEAR', 'MOON', 'HODL', 'YOLO', 'CALLS', 'PUTS', 'STONK', 'APE', 'GAIN'];
        const codes = words.map((word, i) => {
            const term = financeTerms[i % financeTerms.length];
            const code = btoa(word).substring(0, 4).toUpperCase();
            return `${term}-${code}`;
        });
        return codes.join(' ');
    }

    async decryptContent(encryptedText, postId) {
        if (!this.isSecretMode) {
            this.showNotification('🔒 Secret mode required! Activate ALPHA MODE first.', 'error');
            this.pulseElement('secretStatus');
            return;
        }

        this.showLoadingState(true, postId);

        try {
            const response = await fetch('/api/decrypt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ encrypted: encryptedText })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Decryption failed');
            }
            
            const data = await response.json();
            
            // Update the post content in UI with animation
            const postElement = document.querySelector(`[data-post-id="${postId}"]`);
            if (postElement) {
                const contentElement = postElement.querySelector('.post-content');
                
                // Fade out
                contentElement.style.opacity = '0';
                
                setTimeout(() => {
                    contentElement.textContent = data.decrypted || 'Decryption failed';
                    contentElement.classList.remove('encrypted-text');
                    contentElement.classList.add('decrypted');
                    
                    // Fade in
                    contentElement.style.opacity = '1';
                    
                    // Remove decrypt button
                    const decryptBtn = postElement.querySelector('.decrypt-btn');
                    if (decryptBtn) {
                        decryptBtn.style.display = 'none';
                    }
                }, 300);
                
                this.showNotification('🔓 Alpha revealed! Welcome to the inner circle.', 'success');
            }
        } catch (error) {
            console.error('Decryption failed:', error);
            this.showNotification(error.message || 'Decryption failed. Diamond hands only! 💎', 'error');
        } finally {
            this.showLoadingState(false, postId);
        }
    }

    previewPost() {
        const title = document.getElementById('postTitle').value || 'Preview Title';
        const content = document.getElementById('postContent').value || 'Preview content...';
        
        const modal = document.getElementById('previewModal');
        const previewContent = document.getElementById('previewContent');
        
        previewContent.innerHTML = `
            <div class="post">
                <div class="post-header">
                    <div class="post-meta">
                        <span class="post-author">${this.generateBroName()}</span>
                        <span class="post-time">now</span>
                    </div>
                    <span class="post-gains" style="color: var(--accent-green)">+69.42%</span>
                </div>
                <h3 class="post-title">${this.escapeHtml(title)}</h3>
                <div class="post-content">${this.escapeHtml(content)}</div>
                <div class="post-actions-bar">
                    <button class="action-btn">🚀 0</button>
                    <button class="action-btn">💬 0</button>
                    <button class="action-btn">📊 Share DD</button>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    }

    closeModal() {
        document.getElementById('previewModal').classList.remove('active');
    }

    showLoadingState(show, postId = null) {
        if (postId) {
            const post = document.querySelector(`[data-post-id="${postId}"]`);
            if (post) {
                if (show) {
                    post.classList.add('loading-pulse');
                } else {
                    post.classList.remove('loading-pulse');
                }
            }
        } else {
            const encryptBtn = document.getElementById('encryptBtn');
            if (show) {
                encryptBtn.innerHTML = `
                    <span class="encrypt-icon">⏳</span>
                    <span>AI ENCRYPTING...</span>
                `;
                encryptBtn.disabled = true;
            } else {
                encryptBtn.innerHTML = `
                    <span class="encrypt-icon">🔐</span>
                    <span>AI ENCRYPT</span>
                `;
                encryptBtn.disabled = false;
            }
        }
    }

    renderPosts() {
        const container = document.getElementById('postsContainer');
        const filteredPosts = this.getFilteredPosts();
        const paginatedPosts = filteredPosts.slice(0, this.page * this.postsPerPage);
        
        container.innerHTML = '';

        if (paginatedPosts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No alpha yet... Be the first! 🚀</h3>
                    <p>Drop some insider knowledge above</p>
                </div>
            `;
            return;
        }

        paginatedPosts.forEach(post => {
            const postElement = this.createPostElement(post);
            container.appendChild(postElement);
        });

        // Hide/show load more button
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (paginatedPosts.length < filteredPosts.length) {
            loadMoreBtn.style.display = 'flex';
        } else {
            loadMoreBtn.style.display = 'none';
        }
    }

    getFilteredPosts() {
        let filtered = [...this.posts];
        
        // Filter by type
        switch(this.currentFilter) {
            case 'encrypted':
                filtered = filtered.filter(p => p.encrypted);
                break;
            case 'gains':
                filtered = filtered.sort((a, b) => parseFloat(b.gains) - parseFloat(a.gains));
                break;
            case 'new':
                filtered = filtered.sort((a, b) => b.timestamp - a.timestamp);
                break;
            case 'dd':
                filtered = filtered.filter(p => p.content.length > 200);
                break;
            case 'hot':
            default:
                filtered = filtered.sort((a, b) => b.likes - a.likes);
        }
        
        // Filter by time
        const now = new Date();
        switch(this.currentTimeFilter) {
            case 'today':
                filtered = filtered.filter(p => 
                    (now - p.timestamp) < 24 * 60 * 60 * 1000
                );
                break;
            case 'week':
                filtered = filtered.filter(p => 
                    (now - p.timestamp) < 7 * 24 * 60 * 60 * 1000
                );
                break;
            case 'month':
                filtered = filtered.filter(p => 
                    (now - p.timestamp) < 30 * 24 * 60 * 60 * 1000
                );
                break;
        }
        
        return filtered;
    }

    createPostElement(post) {
        const div = document.createElement('div');
        div.className = `post ${post.encrypted ? 'encrypted' : ''}`;
        div.dataset.postId = post.id;
        
        const timeAgo = this.getTimeAgo(post.timestamp);
        const awards = post.awards ? post.awards.map(a => `<span>${a}</span>`).join('') : '';
        
        div.innerHTML = `
            <div class="post-header">
                <div class="post-meta">
                    <span class="post-author">${post.author}</span>
                    <span class="post-time">${timeAgo}</span>
                    ${post.encrypted ? '<span class="post-badge">🔐 AI ENCRYPTED</span>' : ''}
                    ${awards}
                </div>
                <span class="post-gains" style="color: ${parseFloat(post.gains) > 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${post.gains}</span>
            </div>
            <h3 class="post-title">${this.escapeHtml(post.title)}</h3>
            <div class="post-content ${post.encrypted ? 'encrypted-text' : ''}">${this.escapeHtml(post.content)}</div>
            <div class="post-actions-bar">
                <button class="action-btn ${post.liked ? 'liked' : ''}" onclick="forum.likePost(${post.id})">
                    <span>🚀</span>
                    <span>${post.likes}</span>
                </button>
                <button class="action-btn" onclick="forum.commentPost(${post.id})">
                    <span>💬</span>
                    <span>${post.comments}</span>
                </button>
                <button class="action-btn" onclick="forum.sharePost(${post.id})">
                    <span>📊</span>
                    <span>Share DD</span>
                </button>
                <button class="action-btn" onclick="forum.awardPost(${post.id})">
                    <span>🏆</span>
                    <span>Award</span>
                </button>
                ${post.encrypted && this.isSecretMode ? `
                    <button class="action-btn decrypt-btn" onclick="forum.decryptContent('${post.content.replace(/'/g, "\\'")}', ${post.id})">
                        <span>🔓</span>
                        <span>DECRYPT</span>
                    </button>
                ` : ''}
                ${post.encrypted && !this.isSecretMode ? `
                    <button class="action-btn locked-btn" disabled>
                        <span>🔒</span>
                        <span>ALPHA ONLY</span>
                    </button>
                ` : ''}
            </div>
        `;
        
        return div;
    }

    likePost(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (post) {
            if (!post.liked) {
                post.likes++;
                post.liked = true;
                this.showNotification('🚀 Rocket launched!', 'success');
            } else {
                post.likes--;
                post.liked = false;
            }
            this.renderPosts();
        }
    }

    commentPost(postId) {
        this.showNotification('💬 Comments coming soon!', 'info');
    }

    sharePost(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (post) {
            const url = `${window.location.origin}/post/${postId}`;
            navigator.clipboard.writeText(url);
            this.showNotification('📋 Link copied! Share that alpha!', 'success');
        }
    }

    awardPost(postId) {
        const awards = ['💎', '🏆', '🔥', '⭐', '👑'];
        const randomAward = awards[Math.floor(Math.random() * awards.length)];
        
        const post = this.posts.find(p => p.id === postId);
        if (post) {
            if (!post.awards) post.awards = [];
            post.awards.push(randomAward);
            this.renderPosts();
            this.showNotification(`${randomAward} Award given!`, 'success');
        }
    }

    filterPosts(filter) {
        // Update active tab
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        
        this.currentFilter = filter;
        this.page = 1;
        this.renderPosts();
    }

    loadMorePosts() {
        this.page++;
        this.renderPosts();
    }

    toggleSecretMode() {
        if (this.isSecretMode) {
            document.cookie = 'secret_mode=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            this.isSecretMode = false;
            this.showNotification('🔒 Alpha mode deactivated. Back to normie status.', 'info');
        } else {
            document.cookie = 'secret_mode=unlocked; path=/; max-age=86400';
            this.isSecretMode = true;
            this.showNotification('🔓 Alpha mode activated! You can now decrypt messages.', 'success');
        }
        this.updateSecretModeUI();
        this.renderPosts();
    }

    updateSecretModeUI() {
        const indicator = document.getElementById('secretStatus');
        const text = document.getElementById('secretText');
        
        if (this.isSecretMode) {
            indicator.classList.add('unlocked');
            text.textContent = 'ALPHA MODE';
            document.querySelector('.lock-icon').textContent = '🔓';
        } else {
            indicator.classList.remove('unlocked');
            text.textContent = 'NORMIE MODE';
            document.querySelector('.lock-icon').textContent = '🔒';
        }
    }

    generateBroName() {
        const prefixes = ['Diamond', 'Wall', 'Moon', 'Rocket', 'Alpha', 'Whale', 'Bull', 'Giga', 'Sigma', 'Options'];
        const suffixes = ['Hands', 'Ape', 'Trader', 'Chad', 'King', 'Master', 'Samurai', 'Warrior', 'Hunter', 'Lord'];
        const numbers = ['69', '420', '88', '007', '13', '777', '100x', '247', '365', ''];
        
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        const number = numbers[Math.floor(Math.random() * numbers.length)];
        
        return `${prefix}${suffix}${number}`;
    }

    generateGains() {
        const isPositive = Math.random() > 0.2;
        const value = (Math.random() * 200).toFixed(2);
        return isPositive ? `+${value}%` : `-${value}%`;
    }

    generateAwards() {
        const allAwards = ['💎', '🏆', '🔥', '⭐', '👑', '🚀', '💰'];
        const numAwards = Math.floor(Math.random() * 3);
        const awards = [];
        for (let i = 0; i < numAwards; i++) {
            awards.push(allAwards[Math.floor(Math.random() * allAwards.length)]);
        }
        return awards;
    }

    getTimeAgo(timestamp) {
        const seconds = Math.floor((new Date() - timestamp) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 30) return `${days}d ago`;
        return `${Math.floor(days / 30)}mo ago`;
    }

    clearForm() {
        document.getElementById('postTitle').value = '';
        document.getElementById('postContent').value = '';
        document.getElementById('titleCounter').textContent = '0/100';
        document.getElementById('contentCounter').textContent = '0/500';
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        }[type];
        
        notification.innerHTML = `<span>${icon}</span><span>${message}</span>`;
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    shakeElement(elementId) {
        const element = document.getElementById(elementId);
        element.style.animation = 'shake 0.5s';
        setTimeout(() => element.style.animation = '', 500);
    }

    pulseElement(elementId) {
        const element = document.getElementById(elementId);
        element.style.animation = 'pulse 1s';
        setTimeout(() => element.style.animation = '', 1000);
    }

    animateNewPost(postId) {
        setTimeout(() => {
            const post = document.querySelector(`[data-post-id="${postId}"]`);
            if (post) {
                post.style.animation = 'slideIn 0.5s ease';
            }
        }, 100);
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    startTicker() {
        const ticker = document.getElementById('tickerContent');
        if (ticker) {
            // Duplicate content for seamless loop
            ticker.innerHTML += ticker.innerHTML;
            
            // Update ticker values periodically
            setInterval(() => {
                this.updateTickerValues();
            }, 10000);
        }
    }

    updateTickerValues() {
        // Simulate real-time price updates
        const tickers = document.querySelectorAll('.ticker-content span');
        tickers.forEach(ticker => {
            if (Math.random() > 0.5) {
                const match = ticker.textContent.match(/([+-]?\d+\.?\d*%?)/);
                if (match) {
                    const oldValue = parseFloat(match[1]);
                    const change = (Math.random() - 0.5) * 5;
                    const newValue = (oldValue + change).toFixed(2);
                    ticker.textContent = ticker.textContent.replace(match[1], newValue);
                }
            }
        });
    }

    loadInitialPosts() {
        // Load some initial sample posts
        const samplePosts = [
            {
                id: Date.now() - 1000000,
                title: "🚨 LEAKED: Fed Minutes Suggest Major Policy Shift",
                content: "Just got word from my contact at the Fed. They're discussing unprecedented measures. Load up on commodities NOW. This is not a drill.",
                author: "FedWhisperer",
                timestamp: new Date(Date.now() - 3600000),
                likes: 2847,
                comments: 342,
                encrypted: false,
                gains: "+327.8%",
                awards: ['💎', '🔥', '🏆']
            },
            {
                id: Date.now() - 2000000,
                title: "🔥 The Next 1000x Crypto Gem (ENCRYPTED ALPHA)",
                content: "BULL-Q1BT MOON-DEFI APE-PROT HODL-NEXT YOLO-GEM",
                originalContent: "Check out this new DeFi protocol launching next week",
                author: "CryptoOracle_420",
                timestamp: new Date(Date.now() - 7200000),
                likes: 5243,
                comments: 891,
                encrypted: true,
                gains: "+8927.3%",
                awards: ['👑', '💎']
            },
            {
                id: Date.now() - 3000000,
                title: "My $5M YOLO Play - SPY 500c Weekly",
                content: "Putting my entire portfolio into SPY 500c expiring Friday. Either yacht or cardboard box. No in between. See you degenerates in Valhalla or behind Wendy's. 🚀💎🙌",
                author: "GigaChadTrader",
                timestamp: new Date(Date.now() - 10800000),
                likes: 12341,
                comments: 2103,
                encrypted: false,
                gains: "+69.42%",
                awards: ['🚀', '💎', '🔥', '⭐']
            },
            {
                id: Date.now() - 4000000,
                title: "Technical Analysis: Why BTC Will Hit $100k This Month",
                content: "Looking at the charts with my proprietary indicators (trust me bro), we're about to see the mother of all breakouts. The golden cross on the 4h is aligning with Mercury in retrograde. Bullish AF.",
                author: "ChartWizard88",
                timestamp: new Date(Date.now() - 14400000),
                likes: 3421,
                comments: 567,
                encrypted: false,
                gains: "+142.7%",
                awards: ['📊']
            },
            {
                id: Date.now() - 5000000,
                title: "🔐 Insider Info from Wall Street (ALPHA MEMBERS ONLY)",
                content: "CALLS-M&A BEAR-LEAK STONK-DEAL PUTS-FAKE GAIN-REAL",
                originalContent: "Major acquisition happening next week",
                author: "WallStInsider",
                timestamp: new Date(Date.now() - 18000000),
                likes: 8932,
                comments: 1247,
                encrypted: true,
                gains: "+567.8%",
                awards: ['🔐', '💰', '👑']
            }
        ];
        
        this.posts = samplePosts;
        this.renderPosts();
        
        // Check for draft
        this.loadDraft();
    }
}

// Add shake animation to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
`;
document.head.appendChild(style);

// Initialize forum when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.forum = new ForumManager();
    });
} else {
    window.forum = new ForumManager();
}