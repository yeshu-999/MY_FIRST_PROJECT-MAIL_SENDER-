// Interactive Learning Notifier Application
class InteractiveLearningNotifier {
    constructor() {
        this.tasks = [];
        this.notifications = [];
        this.activityLog = [];
        this.socket = null;
        this.isConnected = false;
        this.autoSaveInterval = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initWebSocket();
        this.loadFromLocalStorage();
        this.updateUI();
        this.startRealTimeUpdates();
        this.hideLoadingScreen();
        this.addCustomStyles();
        
        // Add welcome activity
        this.addActivity('Welcome to Interactive Learning Notifier!', 'success');
    }

    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // Help modal
        document.getElementById('helpBtn').addEventListener('click', () => this.showHelpModal());
        document.querySelector('.modal-close').addEventListener('click', () => this.hideHelpModal());
        
        // Task management
        document.getElementById('addTaskBtn').addEventListener('click', () => this.addTask());
        document.getElementById('taskInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });
        
        // Quick actions
        document.getElementById('newNotificationBtn').addEventListener('click', () => this.createNewNotification());
        document.getElementById('quickSendBtn').addEventListener('click', () => this.quickSend());
        document.getElementById('addSampleTasksBtn').addEventListener('click', () => this.addSampleTasks());
        
        // Email validation
        document.getElementById('validateEmailBtn').addEventListener('click', () => this.validateEmail());
        document.getElementById('receiverEmail').addEventListener('input', () => this.updateEmailStatus());
        
        // Notification sending
        document.getElementById('sendNotificationBtn').addEventListener('click', () => this.sendNotification());
        document.getElementById('testSendBtn').addEventListener('click', () => this.sendTestNotification());
        
        // Draft management
        document.getElementById('saveDraftBtn').addEventListener('click', () => this.saveDraft());
        document.getElementById('loadDraftBtn').addEventListener('click', () => this.loadDraft());
        document.getElementById('clearFormBtn').addEventListener('click', () => this.clearForm());
        
        // Chat
        document.getElementById('sendChatBtn').addEventListener('click', () => this.sendChatMessage());
        document.getElementById('quickChatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });
        
        // Comments character count
        document.getElementById('commentsInput').addEventListener('input', (e) => {
            this.updateCharCount(e.target.value);
            this.updatePreview();
        });
        
        // Task actions
        document.getElementById('clearTasksBtn').addEventListener('click', () => this.clearAllTasks());
        document.getElementById('sortTasksBtn').addEventListener('click', () => this.sortTasks());
        document.getElementById('prioritizeBtn').addEventListener('click', () => this.autoPrioritize());
        
        // Preview toggle
        document.getElementById('togglePreviewBtn').addEventListener('click', () => this.togglePreview());
        
        // Template buttons
        document.querySelectorAll('.template-use-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const template = e.target.closest('.template-item').dataset.template;
                this.applyTemplate(template);
            });
        });
        
        // Settings toggles
        document.getElementById('soundToggle').addEventListener('change', (e) => this.toggleSound(e.target.checked));
        document.getElementById('autosaveToggle').addEventListener('change', (e) => this.toggleAutosave(e.target.checked));
        document.getElementById('previewToggle').addEventListener('change', (e) => this.togglePreviewAuto(e.target.checked));
        
        // Text editor buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const command = e.target.closest('.tool-btn').dataset.command;
                this.formatText(command);
            });
        });
        
        // Notification type selection
        document.querySelectorAll('.type-option input').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.updatePreview();
                this.addActivity(`Notification style changed to ${e.target.value.replace('_', ' ')}`, 'info');
            });
        });
        
        // Update real-time
        document.getElementById('senderName').addEventListener('input', () => {
            document.getElementById('userName').textContent = document.getElementById('senderName').value || 'Student';
            this.updatePreview();
        });
        document.querySelectorAll('#taskInput, #receiverEmail').forEach(input => {
            input.addEventListener('input', () => this.updatePreview());
        });
        
        // Click outside modal to close
        document.querySelector('.modal-overlay').addEventListener('click', () => this.hideHelpModal());
    }

    initWebSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            this.isConnected = true;
            this.updateConnectionStatus(true);
            this.addActivity('Connected to real-time server', 'success');
        });
        
        this.socket.on('disconnect', () => {
            this.isConnected = false;
            this.updateConnectionStatus(false);
            this.addActivity('Disconnected from server', 'warning');
        });
        
        this.socket.on('connection_established', (data) => {
            this.addLiveUpdate('System', data.message);
        });
        
        this.socket.on('notification_status', (data) => {
            this.handleNotificationStatus(data);
        });
        
        this.socket.on('new_message', (data) => {
            this.addLiveUpdate(data.sender, data.message);
        });
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const appContainer = document.getElementById('appContainer');
        
        setTimeout(() => {
            loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                appContainer.style.display = 'block';
                this.addActivity('Application loaded successfully', 'success');
            }, 500);
        }, 1000);
    }

    addTask() {
        const taskInput = document.getElementById('taskInput');
        const taskText = taskInput.value.trim();
        
        if (!taskText) {
            this.showToast('Please enter a task', 'warning');
            taskInput.focus();
            return;
        }
        
        if (taskText.length > 200) {
            this.showToast('Task is too long (max 200 characters)', 'warning');
            return;
        }
        
        const task = {
            id: Date.now(),
            text: taskText,
            priority: this.determinePriority(taskText),
            timestamp: new Date().toISOString(),
            completed: false
        };
        
        this.tasks.push(task);
        taskInput.value = '';
        this.updateUI();
        this.playSound('add');
        this.showToast(`Task added: "${taskText.substring(0, 30)}..."`, 'success');
        this.addActivity(`Added task: "${taskText}"`, 'info');
    }

    determinePriority(text) {
        if (text.startsWith('!') || text.toLowerCase().includes('urgent')) return 'high';
        if (text.toLowerCase().includes('important')) return 'medium';
        return 'low';
    }

    removeTask(taskId) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex > -1) {
            const removedTask = this.tasks.splice(taskIndex, 1)[0];
            this.updateUI();
            this.playSound('remove');
            this.showToast('Task removed', 'info');
            this.addActivity(`Removed task: "${removedTask.text.substring(0, 30)}..."`, 'warning');
        }
    }

    async validateEmail() {
        const emailInput = document.getElementById('receiverEmail');
        const email = emailInput.value.trim();
        
        if (!email) {
            this.showToast('Please enter an email address', 'warning');
            return;
        }
        
        try {
            const response = await fetch('/api/validate-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });
            
            const result = await response.json();
            
            if (result.valid) {
                emailInput.style.borderColor = '#10b981';
                this.showToast('Email format is valid', 'success');
                this.addActivity('Email validated successfully', 'success');
            } else {
                emailInput.style.borderColor = '#ef4444';
                this.showToast('Invalid email format', 'error');
                this.addActivity('Email validation failed', 'error');
            }
        } catch (error) {
            this.showToast('Error validating email', 'error');
            console.error('Validation error:', error);
        }
    }

    updateEmailStatus() {
        const email = document.getElementById('receiverEmail').value.trim();
        const statusBadge = document.getElementById('emailStatus');
        
        if (!email) {
            statusBadge.textContent = 'Ready';
            statusBadge.className = 'status-badge active';
        } else if (email.includes('@') && email.includes('.')) {
            statusBadge.textContent = 'Valid Format';
            statusBadge.className = 'status-badge active';
        } else {
            statusBadge.textContent = 'Check Format';
            statusBadge.className = 'status-badge warning';
        }
    }

    async sendNotification() {
        const receiverEmail = document.getElementById('receiverEmail').value.trim();
        const senderName = document.getElementById('senderName').value.trim() || 'Student';
        const comments = document.getElementById('commentsInput').value.trim();
        const notificationType = document.querySelector('input[name="notificationType"]:checked').value;
        
        // Validation
        if (!receiverEmail) {
            this.showToast('Please enter receiver email address', 'error');
            this.shakeElement('receiverEmail');
            return;
        }
        
        if (this.tasks.length === 0) {
            this.showToast('Please add at least one task', 'error');
            this.shakeElement('taskInput');
            return;
        }
        
        // Show sending animation
        this.showSendingAnimation();
        
        // Prepare data
        const taskTexts = this.tasks.map(t => t.text);
        
        const notificationData = {
            receiver_email: receiverEmail,
            tasks: taskTexts,
            comments: comments,
            sender_name: senderName,
            notification_type: notificationType
        };
        
        try {
            const response = await fetch('/api/send-notification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(notificationData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Notification sent successfully!', 'success');
                this.addActivity(`Notification sent to ${receiverEmail}`, 'success');
                this.addToHistory(notificationData);
                this.updateStats();
                this.playSound('success');
            } else {
                this.showToast(result.message, 'error');
                this.addActivity(`Failed: ${result.message}`, 'error');
                this.playSound('error');
            }
        } catch (error) {
            this.showToast(`Network error: ${error.message}`, 'error');
            this.addActivity(`Network error: ${error.message}`, 'error');
            this.playSound('error');
        } finally {
            this.hideSendingAnimation();
        }
    }

    showSendingAnimation() {
        const sendBtn = document.getElementById('sendNotificationBtn');
        const originalContent = sendBtn.innerHTML;
        
        sendBtn.innerHTML = `
            <div class="sending-spinner"></div>
            <div class="btn-text">
                <span>Sending...</span>
                <small>Please wait</small>
            </div>
        `;
        sendBtn.disabled = true;
        
        // Store original content
        sendBtn.dataset.originalContent = originalContent;
    }

    hideSendingAnimation() {
        const sendBtn = document.getElementById('sendNotificationBtn');
        if (sendBtn.dataset.originalContent) {
            sendBtn.innerHTML = sendBtn.dataset.originalContent;
        }
        sendBtn.disabled = false;
    }

    addSampleTasks() {
        const sampleTasks = [
            "!Complete Python functions chapter",
            "Practice Django models and queries",
            "Review machine learning basics",
            "Build a small project with React",
            "Study algorithms: Sorting and searching",
            "Learn about Docker containers"
        ];
        
        sampleTasks.forEach(task => {
            this.tasks.push({
                id: Date.now() + Math.random(),
                text: task,
                priority: this.determinePriority(task),
                timestamp: new Date().toISOString(),
                completed: false
            });
        });
        
        this.updateUI();
        this.showToast('Sample tasks added', 'success');
        this.addActivity('Added sample tasks', 'info');
    }

    updateUI() {
        this.updateTaskCount();
        this.updateTaskList();
        this.updateProgressRing();
        this.updateStats();
        this.updatePreview();
        this.updateTime();
        this.saveToLocalStorage();
    }

    updateTaskCount() {
        const taskCount = this.tasks.length;
        document.getElementById('liveTaskCount').textContent = taskCount;
        document.getElementById('taskCount').textContent = taskCount;
        document.getElementById('taskCounter').innerHTML = `
            <i class="fas fa-list-check"></i>
            <span>${taskCount}</span> ${taskCount === 1 ? 'task' : 'tasks'}
        `;
    }

    updateTaskList() {
        const container = document.getElementById('tasksContainer');
        const emptyState = document.getElementById('emptyTasksState');
        
        if (this.tasks.length === 0) {
            container.innerHTML = '';
            container.appendChild(emptyState);
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        
        container.innerHTML = '';
        this.tasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            container.appendChild(taskElement);
        });
    }

    createTaskElement(task) {
        const div = document.createElement('div');
        div.className = `task-item priority-${task.priority}`;
        div.dataset.id = task.id;
        
        div.innerHTML = `
            <div class="task-content">
                <div class="task-text">
                    <span class="task-priority">${this.getPriorityIcon(task.priority)}</span>
                    <span>${this.escapeHtml(task.text)}</span>
                </div>
                <div class="task-meta">
                    <span class="task-time">${this.formatTime(task.timestamp)}</span>
                    <span class="task-status ${task.completed ? 'completed' : 'pending'}">
                        ${task.completed ? '✓ Completed' : '○ Pending'}
                    </span>
                </div>
            </div>
            <div class="task-actions">
                <button class="edit-btn" onclick="app.editTask(${task.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-btn" onclick="app.removeTask(${task.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        return div;
    }

    getPriorityIcon(priority) {
        const icons = {
            'high': '⚠️',
            'medium': '📝',
            'low': '📌'
        };
        return icons[priority] || '📌';
    }

    updateProgressRing() {
        const circle = document.getElementById('progressCircle');
        const percent = document.getElementById('progressPercent');
        const completedCount = document.getElementById('completedCount');
        const pendingCount = document.getElementById('pendingCount');
        
        const completed = this.tasks.filter(t => t.completed).length;
        const total = this.tasks.length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        // Update progress circle
        const circumference = 2 * Math.PI * 54;
        const offset = circumference - (progress / 100) * circumference;
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        circle.style.strokeDashoffset = offset;
        
        percent.textContent = `${progress}%`;
        completedCount.textContent = completed;
        pendingCount.textContent = total - completed;
    }

    updatePreview() {
        const preview = document.getElementById('emailPreview');
        const tasks = this.tasks;
        const senderName = document.getElementById('senderName').value || 'Student';
        const receiverEmail = document.getElementById('receiverEmail').value || 'recipient@example.com';
        const notificationType = document.querySelector('input[name="notificationType"]:checked').value;
        
        if (tasks.length === 0) {
            preview.innerHTML = `
                <div class="preview-placeholder">
                    <i class="fas fa-envelope-open-text"></i>
                    <p>Add tasks to see a preview of your notification</p>
                </div>
            `;
            return;
        }
        
        const typeNames = {
            'daily_update': 'Daily Update',
            'progress_report': 'Progress Report',
            'weekly_review': 'Weekly Review',
            'urgent': 'Urgent Notification'
        };
        
        preview.innerHTML = `
            <div class="preview-email">
                <div class="preview-header">
                    <div class="preview-sender">
                        <strong>From:</strong> ${senderName}
                    </div>
                    <div class="preview-receiver">
                        <strong>To:</strong> ${receiverEmail}
                    </div>
                    <div class="preview-type">
                        <span class="type-badge">${typeNames[notificationType]}</span>
                    </div>
                </div>
                
                <div class="preview-body">
                    <h4>📋 Learning Tasks (${tasks.length})</h4>
                    <div class="preview-tasks">
                        ${tasks.slice(0, 4).map((task, i) => `
                            <div class="preview-task ${task.priority}">
                                <span class="task-number">${i + 1}</span>
                                <span class="task-text">${this.escapeHtml(task.text.substring(0, 40))}${task.text.length > 40 ? '...' : ''}</span>
                            </div>
                        `).join('')}
                        ${tasks.length > 4 ? `<div class="preview-more">+ ${tasks.length - 4} more tasks</div>` : ''}
                    </div>
                    
                    <div class="preview-stats">
                        <div class="stat">
                            <i class="fas fa-flag"></i>
                            <span>${tasks.filter(t => t.priority === 'high').length} High Priority</span>
                        </div>
                        <div class="stat">
                            <i class="fas fa-clock"></i>
                            <span>${this.estimateCompletionTime()} minutes</span>
                        </div>
                    </div>
                </div>
                
                <div class="preview-footer">
                    <p><i class="fas fa-info-circle"></i> This is a preview. The actual email will include full formatting.</p>
                </div>
            </div>
        `;
    }

    estimateCompletionTime() {
        return this.tasks.length * 30; // 30 minutes per task
    }

    updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('currentTime').textContent = timeString;
        
        // Update last saved
        document.getElementById('lastSavedStatus').innerHTML = `
            <i class="fas fa-save"></i> Last saved: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        `;
    }

    startRealTimeUpdates() {
        // Update time every minute
        setInterval(() => this.updateTime(), 60000);
        
        // Auto-save every 30 seconds
        this.autoSaveInterval = setInterval(() => {
            if (document.getElementById('autosaveToggle').checked) {
                this.saveToLocalStorage();
            }
        }, 30000);
        
        // Update live task count
        setInterval(() => {
            document.getElementById('liveTaskCount').textContent = this.tasks.length;
            document.getElementById('notificationCount').textContent = this.notifications.length;
        }, 5000);
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${this.getToastIcon(type)}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    getToastIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    playSound(type) {
        if (!document.getElementById('soundToggle').checked) return;
        
        // Create a simple beep sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = type === 'success' ? 800 : type === 'error' ? 400 : 600;
        gainNode.gain.value = 0.1;
        
        oscillator.start();
        setTimeout(() => oscillator.stop(), 200);
    }

    shakeElement(elementId) {
        const element = document.getElementById(elementId);
        element.classList.add('shake');
        setTimeout(() => element.classList.remove('shake'), 500);
    }

    addLiveUpdate(sender, message) {
        const feed = document.getElementById('liveFeed');
        const item = document.createElement('div');
        
        item.className = 'feed-item';
        item.innerHTML = `
            <div class="feed-icon">
                <i class="fas fa-${sender === 'System' ? 'server' : 'user'}"></i>
            </div>
            <div class="feed-content">
                <p><strong>${sender}:</strong> ${message}</p>
                <span class="feed-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        `;
        
        feed.insertBefore(item, feed.firstChild);
        
        // Keep only last 10 items
        while (feed.children.length > 10) {
            feed.removeChild(feed.lastChild);
        }
    }

    addActivity(message, type = 'info') {
        const timeline = document.getElementById('activityTimeline');
        const activity = {
            id: Date.now(),
            message: message,
            type: type,
            timestamp: new Date().toISOString()
        };
        
        this.activityLog.push(activity);
        
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <div class="activity-icon">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            </div>
            <div class="activity-content">
                <p>${message}</p>
                <span class="activity-time">Just now</span>
            </div>
        `;
        
        timeline.insertBefore(activityItem, timeline.firstChild);
        
        // Keep only last 5 items
        while (timeline.children.length > 5) {
            timeline.removeChild(timeline.lastChild);
        }
        
        this.saveToLocalStorage();
    }

    updateCharCount(text) {
        const charCount = document.getElementById('charCount');
        charCount.textContent = text.length;
        
        if (text.length > 900) {
            charCount.style.color = '#ef4444';
        } else if (text.length > 800) {
            charCount.style.color = '#f59e0b';
        } else {
            charCount.style.color = 'var(--text-secondary)';
        }
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        const serverStatus = document.getElementById('serverStatus');
        
        if (connected) {
            statusElement.innerHTML = '<i class="fas fa-circle connected"></i><span>Connected</span>';
            serverStatus.innerHTML = '<i class="fas fa-server"></i> Server: Connected';
            statusElement.style.color = '#10b981';
        } else {
            statusElement.innerHTML = '<i class="fas fa-circle"></i><span>Disconnected</span>';
            serverStatus.innerHTML = '<i class="fas fa-server"></i> Server: Disconnected';
            statusElement.style.color = '#ef4444';
        }
    }

    saveToLocalStorage() {
        const data = {
            tasks: this.tasks,
            notifications: this.notifications.slice(0, 20),
            activityLog: this.activityLog.slice(-20),
            senderName: document.getElementById('senderName').value,
            receiverEmail: document.getElementById('receiverEmail').value,
            comments: document.getElementById('commentsInput').value,
            notificationType: document.querySelector('input[name="notificationType"]:checked').value,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('learningNotifierData', JSON.stringify(data));
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('learningNotifierData');
            if (saved) {
                const data = JSON.parse(saved);
                this.tasks = data.tasks || [];
                this.notifications = data.notifications || [];
                this.activityLog = data.activityLog || [];
                
                // Load form data
                if (data.senderName) document.getElementById('senderName').value = data.senderName;
                if (data.receiverEmail) document.getElementById('receiverEmail').value = data.receiverEmail;
                if (data.comments) document.getElementById('commentsInput').value = data.comments;
                if (data.notificationType) {
                    document.querySelector(`input[value="${data.notificationType}"]`).checked = true;
                }
                
                // Update user name
                document.getElementById('userName').textContent = data.senderName || 'Student';
                
                // Load theme
                const savedTheme = localStorage.getItem('theme') || 'light';
                document.documentElement.setAttribute('data-theme', savedTheme);
                
                const icon = document.querySelector('#themeToggle i');
                icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
                document.querySelector('#themeToggle span').textContent = savedTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
                
                this.addActivity('Data loaded from previous session', 'system');
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        const icon = document.querySelector('#themeToggle i');
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        document.querySelector('#themeToggle span').textContent = newTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
        
        this.addActivity(`Switched to ${newTheme} theme`, 'info');
    }

    showHelpModal() {
        const modal = document.getElementById('helpModal');
        const modalBody = modal.querySelector('.modal-body');
        
        modalBody.innerHTML = `
            <div class="help-section">
                <h4>Getting Started</h4>
                <ol>
                    <li>Enter your name and recipient's email</li>
                    <li>Add learning tasks using the task input field</li>
                    <li>Choose a notification style</li>
                    <li>Add comments or questions if needed</li>
                    <li>Preview your notification</li>
                    <li>Click "Send Notification" to deliver</li>
                </ol>
            </div>
            <div class="help-section">
                <h4>Features</h4>
                <ul>
                    <li><strong>Real-time updates:</strong> See notification status instantly</li>
                    <li><strong>Auto-save:</strong> Your work is saved automatically</li>
                    <li><strong>Multiple templates:</strong> Quick templates for common scenarios</li>
                    <li><strong>Dark/Light theme:</strong> Toggle between themes</li>
                    <li><strong>Progress tracking:</strong> Visual progress indicators</li>
                </ul>
            </div>
            <div class="help-section">
                <h4>Tips</h4>
                <ul>
                    <li>Use "!" at the start of tasks to mark them as urgent</li>
                    <li>Save drafts to continue later</li>
                    <li>Use the preview feature before sending</li>
                    <li>Check the activity timeline for recent actions</li>
                </ul>
            </div>
        `;
        
        modal.style.display = 'block';
    }

    hideHelpModal() {
        document.getElementById('helpModal').style.display = 'none';
    }

    formatText(command) {
        const textarea = document.getElementById('commentsInput');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        
        let formattedText = '';
        
        switch(command) {
            case 'bold':
                formattedText = `**${selectedText}**`;
                break;
            case 'italic':
                formattedText = `*${selectedText}*`;
                break;
            case 'insertunorderedlist':
                formattedText = selectedText.split('\n').map(line => `• ${line}`).join('\n');
                break;
            case 'insertorderedlist':
                formattedText = selectedText.split('\n').map((line, i) => `${i + 1}. ${line}`).join('\n');
                break;
            case 'insertQuestion':
                formattedText = `❓ ${selectedText || 'Your question here...'}`;
                break;
            case 'insertIdea':
                formattedText = `💡 ${selectedText || 'Your idea here...'}`;
                break;
            default:
                formattedText = selectedText;
        }
        
        textarea.value = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end);
        textarea.focus();
        textarea.setSelectionRange(start, start + formattedText.length);
        this.updateCharCount(textarea.value);
    }

    addToHistory(notificationData) {
        this.notifications.unshift({
            id: Date.now(),
            ...notificationData,
            timestamp: new Date().toISOString()
        });
        
        this.updateHistoryList();
    }

    updateHistoryList() {
        const list = document.getElementById('historyList');
        const recent = this.notifications.slice(0, 5);
        
        if (recent.length === 0) {
            list.innerHTML = `
                <div class="history-empty">
                    <i class="fas fa-inbox"></i>
                    <p>No notifications sent yet</p>
                </div>
            `;
            return;
        }
        
        list.innerHTML = recent.map(notification => `
            <div class="history-item">
                <div class="history-header">
                    <i class="fas fa-envelope"></i>
                    <span>${notification.receiver_email}</span>
                </div>
                <div class="history-body">
                    <small>${notification.tasks.length} tasks • ${notification.notification_type.replace('_', ' ')}</small>
                </div>
                <div class="history-time">
                    ${this.formatTime(notification.timestamp)}
                </div>
            </div>
        `).join('');
    }

    updateStats() {
        const today = new Date().toDateString();
        const todayNotifications = this.notifications.filter(n => 
            new Date(n.timestamp).toDateString() === today
        );
        
        document.getElementById('notificationCount').textContent = todayNotifications.length;
    }

    clearForm() {
        if (confirm('Are you sure you want to clear the form? This will remove all tasks and comments.')) {
            this.tasks = [];
            document.getElementById('receiverEmail').value = '';
            document.getElementById('commentsInput').value = '';
            this.updateUI();
            this.showToast('Form cleared', 'info');
            this.addActivity('Cleared form', 'info');
        }
    }

    clearAllTasks() {
        if (this.tasks.length === 0) return;
        
        if (confirm(`Are you sure you want to remove all ${this.tasks.length} tasks?`)) {
            this.tasks = [];
            this.updateUI();
            this.showToast('All tasks cleared', 'info');
            this.addActivity('Cleared all tasks', 'info');
        }
    }

    sortTasks() {
        this.tasks.sort((a, b) => a.text.localeCompare(b.text));
        this.updateUI();
        this.showToast('Tasks sorted alphabetically', 'info');
        this.addActivity('Sorted tasks alphabetically', 'info');
    }

    autoPrioritize() {
        this.tasks.forEach(task => {
            task.priority = this.determinePriority(task.text);
        });
        this.updateUI();
        this.showToast('Tasks auto-prioritized', 'info');
        this.addActivity('Auto-prioritized tasks', 'info');
    }

    sendChatMessage() {
        const chatInput = document.getElementById('quickChatInput');
        const message = chatInput.value.trim();
        
        if (!message) return;
        
        if (this.socket && this.socket.connected) {
            this.socket.emit('send_message', {
                message: message,
                sender: document.getElementById('senderName').value || 'Anonymous'
            });
        }
        
        this.addLiveUpdate('You', message);
        chatInput.value = '';
    }

    createNewNotification() {
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.showToast('Create new notification', 'info');
    }

    quickSend() {
        // Use default values for quick send
        if (this.tasks.length === 0) {
            this.addSampleTasks();
        }
        
        if (!document.getElementById('receiverEmail').value) {
            document.getElementById('receiverEmail').value = 'your_email@gmail.com';
        }
        
        this.showToast('Quick send prepared', 'info');
        this.addActivity('Prepared quick send', 'info');
    }

    sendTestNotification() {
        // Send to a test email
        document.getElementById('receiverEmail').value = 'test@example.com';
        this.validateEmail();
        this.sendNotification();
    }

    applyTemplate(template) {
        switch(template) {
            case 'coding_session':
                this.tasks = [
                    { id: Date.now(), text: "!Complete Python functions practice", priority: "high", completed: false },
                    { id: Date.now() + 1, text: "Debug current project issues", priority: "high", completed: false },
                    { id: Date.now() + 2, text: "Write unit tests for new features", priority: "medium", completed: false },
                    { id: Date.now() + 3, text: "Review code documentation", priority: "low", completed: false }
                ];
                break;
            case 'study_group':
                this.tasks = [
                    { id: Date.now(), text: "!Prepare study group agenda", priority: "high", completed: false },
                    { id: Date.now() + 1, text: "Review chapter 5 materials", priority: "medium", completed: false },
                    { id: Date.now() + 2, text: "Prepare discussion questions", priority: "medium", completed: false }
                ];
                break;
            case 'exam_prep':
                this.tasks = [
                    { id: Date.now(), text: "!Review all chapters for exam", priority: "high", completed: false },
                    { id: Date.now() + 1, text: "Practice previous exam papers", priority: "high", completed: false },
                    { id: Date.now() + 2, text: "Create study notes summary", priority: "medium", completed: false }
                ];
                break;
        }
        
        this.updateUI();
        this.showToast(`Applied ${template.replace('_', ' ')} template`, 'success');
        this.addActivity(`Applied ${template.replace('_', ' ')} template`, 'info');
    }

    toggleSound(enabled) {
        this.showToast(enabled ? 'Sound notifications enabled' : 'Sound notifications disabled', 'info');
    }

    toggleAutosave(enabled) {
        this.showToast(enabled ? 'Auto-save enabled' : 'Auto-save disabled', 'info');
    }

    togglePreviewAuto(enabled) {
        this.showToast(enabled ? 'Live preview enabled' : 'Live preview disabled', 'info');
    }

    togglePreview() {
        const previewContainer = document.getElementById('previewContainer');
        const isHidden = previewContainer.classList.contains('hidden');
        
        if (isHidden) {
            previewContainer.classList.remove('hidden');
            this.showToast('Preview shown', 'info');
        } else {
            previewContainer.classList.add('hidden');
            this.showToast('Preview hidden', 'info');
        }
    }

    editTask(taskId) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex > -1) {
            const newText = prompt('Edit task:', this.tasks[taskIndex].text);
            if (newText !== null) {
                this.tasks[taskIndex].text = newText.trim();
                this.tasks[taskIndex].priority = this.determinePriority(newText);
                this.updateUI();
                this.showToast('Task updated', 'success');
                this.addActivity('Edited task', 'info');
            }
        }
    }

    async saveDraft() {
        const draftData = {
            tasks: this.tasks,
            receiverEmail: document.getElementById('receiverEmail').value,
            senderName: document.getElementById('senderName').value,
            comments: document.getElementById('commentsInput').value,
            notificationType: document.querySelector('input[name="notificationType"]:checked').value,
            timestamp: new Date().toISOString()
        };
        
        try {
            const response = await fetch('/api/save-draft', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(draftData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Draft saved successfully', 'success');
                localStorage.setItem('lastDraftId', result.session_id);
            }
        } catch (error) {
            this.showToast('Error saving draft', 'error');
        }
    }

    async loadDraft() {
        const lastDraftId = localStorage.getItem('lastDraftId');
        if (!lastDraftId) {
            this.showToast('No draft found', 'warning');
            return;
        }
        
        try {
            const response = await fetch(`/api/load-draft/${lastDraftId}`);
            const result = await response.json();
            
            if (result.success) {
                const data = result.data;
                this.tasks = data.tasks || [];
                document.getElementById('receiverEmail').value = data.receiverEmail || '';
                document.getElementById('senderName').value = data.senderName || '';
                document.getElementById('commentsInput').value = data.comments || '';
                document.getElementById('userName').textContent = data.senderName || 'Student';
                
                if (data.notificationType) {
                    document.querySelector(`input[value="${data.notificationType}"]`).checked = true;
                }
                
                this.updateUI();
                this.showToast('Draft loaded successfully', 'success');
            }
        } catch (error) {
            this.showToast('Error loading draft', 'error');
        }
    }

    handleNotificationStatus(data) {
        const statusContainer = document.getElementById('statusContainer');
        
        if (data.success) {
            statusContainer.innerHTML = `
                <div class="status-success">
                    <i class="fas fa-check-circle"></i>
                    <span>${data.message}</span>
                    <small>Sent to ${data.receiver} at ${new Date(data.timestamp).toLocaleTimeString()}</small>
                </div>
            `;
            
            this.addLiveUpdate('System', `Notification delivered to ${data.receiver}`);
        } else {
            statusContainer.innerHTML = `
                <div class="status-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>${data.message}</span>
                </div>
            `;
            
            this.addLiveUpdate('System', `Notification failed: ${data.message}`);
        }
        
        setTimeout(() => {
            statusContainer.innerHTML = '';
        }, 5000);
    }

    formatTime(timestamp) {
        const now = new Date();
        const past = new Date(timestamp);
        const diffMs = now - past;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays === 1) return 'yesterday';
        return `${diffDays}d ago`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    addCustomStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .toast {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 1rem 1.5rem;
                background: var(--bg-secondary);
                border-left: 4px solid var(--primary);
                border-radius: var(--radius-md);
                box-shadow: var(--shadow-lg);
                display: flex;
                align-items: center;
                gap: 0.75rem;
                transform: translateX(150%);
                transition: transform 0.3s ease;
                z-index: 1001;
            }
            
            .toast.show {
                transform: translateX(0);
            }
            
            .toast-success { border-color: var(--accent); }
            .toast-error { border-color: var(--danger); }
            .toast-warning { border-color: var(--warning); }
            .toast-info { border-color: var(--primary); }
            
            .sending-spinner {
                width: 20px;
                height: 20px;
                border: 2px solid rgba(255,255,255,0.3);
                border-top-color: white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            .shake {
                animation: shake 0.5s ease;
            }
            
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
            
            .type-badge {
                padding: 0.25rem 0.75rem;
                background: var(--primary);
                color: white;
                border-radius: var(--radius-full);
                font-size: 0.875rem;
                font-weight: 500;
            }
            
            .status-success, .status-error {
                padding: 1rem;
                border-radius: var(--radius-md);
                display: flex;
                align-items: center;
                gap: 0.75rem;
                margin: 1rem 0;
            }
            
            .status-success {
                background: rgba(16, 185, 129, 0.1);
                border: 1px solid var(--accent);
                color: var(--accent);
            }
            
            .status-error {
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid var(--danger);
                color: var(--danger);
            }
            
            .preview-task {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem;
                margin: 0.5rem 0;
                background: var(--bg-secondary);
                border-radius: var(--radius-sm);
            }
            
            .preview-task.high {
                border-left: 3px solid var(--danger);
            }
            
            .preview-task.medium {
                border-left: 3px solid var(--warning);
            }
            
            .preview-task.low {
                border-left: 3px solid var(--accent);
            }
            
            .task-number {
                width: 24px;
                height: 24px;
                background: var(--primary);
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.75rem;
                font-weight: bold;
            }
            
            .preview-more {
                text-align: center;
                padding: 0.5rem;
                color: var(--text-secondary);
                font-size: 0.875rem;
            }
            
            .preview-stats {
                display: flex;
                gap: 1rem;
                margin-top: 1rem;
                padding: 1rem;
                background: var(--bg-tertiary);
                border-radius: var(--radius-md);
            }
            
            .stat {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.875rem;
            }
            
            .task-priority {
                margin-right: 0.5rem;
            }
            
            .task-time {
                font-size: 0.75rem;
                color: var(--text-secondary);
            }
            
            .task-status {
                font-size: 0.75rem;
                padding: 0.25rem 0.5rem;
                border-radius: var(--radius-full);
                background: var(--bg-tertiary);
            }
            
            .task-status.completed {
                background: var(--accent);
                color: white;
            }
            
            .history-item {
                padding: 1rem;
                background: var(--bg-tertiary);
                border-radius: var(--radius-md);
                margin-bottom: 0.75rem;
            }
            
            .history-header {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                margin-bottom: 0.5rem;
            }
            
            .history-time {
                font-size: 0.75rem;
                color: var(--text-secondary);
                margin-top: 0.25rem;
            }
            
            .help-section {
                margin-bottom: 1.5rem;
            }
            
            .help-section h4 {
                margin-bottom: 0.75rem;
                color: var(--primary);
            }
            
            .help-section ol, .help-section ul {
                padding-left: 1.5rem;
                margin-bottom: 0.75rem;
            }
            
            .help-section li {
                margin-bottom: 0.5rem;
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new InteractiveLearningNotifier();
});