const { createApp } = Vue;

const API_BASE_URL = 'http://localhost:5000';

createApp({
    data() {
        return {
            // Authentication
            isAuthenticated: false,
            currentUser: null,
            authToken: null,
            
            // UI State
            activeTab: 'files',
            loading: false,
            error: null,
            isDarkMode: false,
            selectedFile: null,
            
            // Login
            loginForm: {
                username: '',
                password: ''
            },
            
            // Files
            files: [],
            searchQuery: '',
            selectedTags: [],
            
            // Tags
            tags: [],
            
            // Users
            users: [],
            
            // Modals
            showUploadModal: false,
            showTagFilterModal: false,
            showCreateTagModal: false,
            showCreateUserModal: false,
            showFilePreview: false,
            
            // Upload
            uploadFile: null,
            uploadTags: [],
            
            // New items
            newTagName: '',
            newUser: {
                username: '',
                email: '',
                password: '',
                role: 2
            }
        };
    },
    
    computed: {
        isAdmin() {
            return this.currentUser?.role === 3;
        },
        
        canUpload() {
            return this.currentUser?.role >= 2;
        },
        
        filteredFiles() {
            let filtered = this.files;
            
            // Search filter
            if (this.searchQuery) {
                const query = this.searchQuery.toLowerCase();
                filtered = filtered.filter(file => 
                    file.fileName.toLowerCase().includes(query)
                );
            }
            
            // Tag filter
            if (this.selectedTags.length > 0) {
                filtered = filtered.filter(file => {
                    if (!file.tags || file.tags.length === 0) return false;
                    return this.selectedTags.some(tag => file.tags.includes(tag));
                });
            }
            
            return filtered;
        }
    },
    
    async mounted() {
        // Initialize theme
        this.initTheme();
        
        // Check for stored auth token
        const token = localStorage.getItem('authToken');
        if (token) {
            this.authToken = token;
            try {
                await this.verifyToken();
            } catch (error) {
                localStorage.removeItem('authToken');
            }
        }
    },
    
    methods: {
        // API Helper
        async apiCall(endpoint, options = {}) {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            };
            
            if (this.authToken) {
                config.headers.Authorization = `Bearer ${this.authToken}`;
            }
            
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }
            
            return response.json();
        },
        
        // Authentication
        async login() {
            this.loading = true;
            this.error = null;
            
            try {
                const response = await this.apiCall('/api/auth/login', {
                    method: 'POST',
                    body: JSON.stringify(this.loginForm)
                });
                
                this.authToken = response.token;
                this.currentUser = response.user;
                this.isAuthenticated = true;
                
                localStorage.setItem('authToken', this.authToken);
                
                // Load initial data
                await Promise.all([
                    this.refreshFiles(),
                    this.refreshTags()
                ]);
                
                if (this.isAdmin) {
                    await this.refreshUsers();
                }
                
            } catch (error) {
                this.error = error.message;
            } finally {
                this.loading = false;
            }
        },
        
        async verifyToken() {
            const response = await this.apiCall('/api/auth/profile');
            this.currentUser = response;
            this.isAuthenticated = true;
            
            // Load initial data
            await Promise.all([
                this.refreshFiles(),
                this.refreshTags()
            ]);
            
            if (this.isAdmin) {
                await this.refreshUsers();
            }
        },
        
        logout() {
            this.isAuthenticated = false;
            this.currentUser = null;
            this.authToken = null;
            this.loginForm = { username: '', password: '' };
            localStorage.removeItem('authToken');
        },
        
        // Files
        async refreshFiles() {
            this.loading = true;
            try {
                const filesData = await this.apiCall('/api/blobstorage/list-with-metadata');
                
                // Get tags for each file
                for (const file of filesData) {
                    try {
                        const tagsResponse = await this.apiCall(`/api/blobstorage/tags/${encodeURIComponent(file.fileName)}`);
                        file.tags = tagsResponse.tags;
                    } catch (error) {
                        file.tags = [];
                    }
                }
                
                this.files = filesData;
            } catch (error) {
                this.error = error.message;
            } finally {
                this.loading = false;
            }
        },
        
        selectFile(file) {
            this.selectedFile = file;
            this.showFilePreview = true;
        },

        async downloadFile() {
            if (!this.selectedFile) return;
            
            // Ensure we have a fresh token from localStorage if needed
            if (!this.authToken) {
                this.authToken = localStorage.getItem('authToken');
            }
            
            if (!this.authToken) {
                this.error = 'Please log in to download files';
                return;
            }
            
            this.loading = true;
            this.error = null;
            
            try {
                // Download file with proper authorization
                const response = await fetch(`${API_BASE_URL}/api/blobstorage/download/${encodeURIComponent(this.selectedFile.fileName)}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`
                    }
                });
                
                if (!response.ok) {
                    if (response.status === 401) {
                        this.error = 'Authentication failed. Please log in again.';
                        this.logout();
                        return;
                    }
                    const errorText = await response.text();
                    throw new Error(`Download failed: ${response.status} - ${errorText}`);
                }
                
                // Get the file as a blob
                const blob = await response.blob();
                
                // Create download link
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = this.selectedFile.fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                
            } catch (error) {
                this.error = `Download failed: ${error.message}`;
                console.error('Download error:', error);
            } finally {
                this.loading = false;
            }
        },
        
        handleFileSelect(event) {
            this.uploadFile = event.target.files[0];
        },
        
        toggleUploadTag(tagName) {
            const index = this.uploadTags.indexOf(tagName);
            if (index === -1) {
                this.uploadTags.push(tagName);
            } else {
                this.uploadTags.splice(index, 1);
            }
        },
        
        async uploadFileAction() {
            if (!this.uploadFile) return;
            
            this.loading = true;
            this.error = null;
            
            try {
                const formData = new FormData();
                formData.append('file', this.uploadFile);
                formData.append('tags', JSON.stringify(this.uploadTags));
                
                await fetch(`${API_BASE_URL}/api/blobstorage/upload`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`
                    },
                    body: formData
                });
                
                this.showUploadModal = false;
                this.uploadFile = null;
                this.uploadTags = [];
                await this.refreshFiles();
                
            } catch (error) {
                this.error = error.message;
            } finally {
                this.loading = false;
            }
        },
        
        // Tags
        async refreshTags() {
            try {
                this.tags = await this.apiCall('/api/tags');
            } catch (error) {
                this.error = error.message;
            }
        },
        
        toggleTagFilter(tagName) {
            const index = this.selectedTags.indexOf(tagName);
            if (index === -1) {
                this.selectedTags.push(tagName);
            } else {
                this.selectedTags.splice(index, 1);
            }
        },
        
        async createTag() {
            if (!this.newTagName) return;
            
            this.loading = true;
            this.error = null;
            
            try {
                await this.apiCall('/api/tags', {
                    method: 'POST',
                    body: JSON.stringify({ name: this.newTagName })
                });
                
                this.showCreateTagModal = false;
                this.newTagName = '';
                await this.refreshTags();
                
            } catch (error) {
                this.error = error.message;
            } finally {
                this.loading = false;
            }
        },
        
        async deleteTag(tagId) {
            if (!confirm('Are you sure you want to delete this tag?')) return;
            
            try {
                await this.apiCall(`/api/tags/${tagId}`, {
                    method: 'DELETE'
                });
                
                await this.refreshTags();
            } catch (error) {
                this.error = error.message;
            }
        },
        
        // Users
        async refreshUsers() {
            try {
                this.users = await this.apiCall('/api/user');
            } catch (error) {
                this.error = error.message;
            }
        },
        
        async createUser() {
            this.loading = true;
            this.error = null;
            
            try {
                await this.apiCall('/api/auth/register', {
                    method: 'POST',
                    body: JSON.stringify(this.newUser)
                });
                
                this.showCreateUserModal = false;
                this.newUser = { username: '', email: '', password: '', role: 2 };
                await this.refreshUsers();
                
            } catch (error) {
                this.error = error.message;
            } finally {
                this.loading = false;
            }
        },
        
        async deleteUser(userId) {
            if (!confirm('Are you sure you want to delete this user?')) return;
            
            try {
                await this.apiCall(`/api/user/${userId}`, {
                    method: 'DELETE'
                });
                
                await this.refreshUsers();
            } catch (error) {
                this.error = error.message;
            }
        },
        
        editUser(user) {
            // Simple role toggle for demo
            const newRole = user.role === 3 ? 2 : user.role + 1;
            this.updateUserRole(user.id, newRole);
        },
        
        async updateUserRole(userId, role) {
            try {
                await this.apiCall(`/api/user/${userId}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        role: role,
                        isActive: true
                    })
                });
                
                await this.refreshUsers();
            } catch (error) {
                this.error = error.message;
            }
        },
        
        // Utility
        formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },
        
        formatDate(dateString) {
            return new Date(dateString).toLocaleDateString();
        },
        
        getRoleName(role) {
            const roles = { 1: 'Viewer', 2: 'Contributor', 3: 'Admin' };
            return roles[role] || 'Unknown';
        },

        // Theme Management
        initTheme() {
            // Check for saved theme preference or default to system preference
            const savedTheme = localStorage.getItem('theme');
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            
            if (savedTheme) {
                this.isDarkMode = savedTheme === 'dark';
            } else {
                this.isDarkMode = systemPrefersDark;
            }
            
            this.applyTheme();
            
            // Listen for system theme changes
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!localStorage.getItem('theme')) {
                    this.isDarkMode = e.matches;
                    this.applyTheme();
                }
            });
        },

        toggleTheme() {
            this.isDarkMode = !this.isDarkMode;
            this.applyTheme();
            localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
        },

        applyTheme() {
            if (this.isDarkMode) {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
        }
    }
}).mount('#app');