<template>
    <div class="chat-container">
        <!-- Sidebar -->
        <div class="sidebar">
            <div class="user-header">
                <div>

                    <img src="@/assets/image/logochat.svg" alt="P2P Chat Application Logo" class="logo" />
                    <div class="user-info">
                        <h2>{{ user.name }}</h2>
                        <p>{{ user.email }}</p>
                    </div>
                </div>
                <button @click="handleLogout" class="logout-btn">Logout</button>
            </div>

            <!-- <div class="search-section">
                <input v-model="searchQuery" @input="handleSearch" type="text" class="search-input"
                    placeholder="Search users by name, email or mobile...">
            </div> -->
            <div class="search-section">
                <div class="search-input-container">
                    <input v-model="searchQuery" @input="handleSearch" type="text" class="search-input"
                        placeholder="Search users by name, email">
                    <span class="search-icon">🔍</span>
                    <!-- You can replace this with an actual icon or background image -->
                </div>
            </div>


            <div class="contacts-list">
                <div v-if="contacts.length === 0" class="no-contacts">
                    No users found
                </div>
                <div class="contact">
                    <div v-for="contact in contacts" :key="contact.id"
                        :class="['contact-item', { active: currentChat?.id === contact.id }]"
                        @click="selectContact(contact)">
                        <div class="contact-avatar">
                            {{ getInitials(contact.name) }}
                        </div>
                        <div class="contact-info">
                            <div class="contact-name">{{ contact.name }}</div>
                            <div class="contact-details">{{ contact.email }}</div>
                        </div>
                        <div v-if="contact.isOnline" class="online-status" title="Online"></div>
                        <div v-else class="offline-status" title="Offline"></div>
                    </div>

                </div>
                <button @click="showUpdateModal = true" class="update-user">
                    <div>🛞</div>
                    <div>Settings</div>
                </button>


            </div>

        </div>

        <!-- Chat Area -->
        <div class="chat-area">
            <div v-if="currentChat" class="chat-active">
                <div class="chat-header">
                    <div class="chat-header-info">
                        <h3>{{ currentChat.name }}</h3>
                        <div class="chat-status">
                            <span :class="['status-dot', currentChat.isOnline ? 'online' : 'offline']"></span>
                            {{ currentChat.isOnline ? 'Online' : 'Offline' }}
                        </div>
                    </div>
                </div>

                <div ref="messagesContainer" class="messages-container">
                    <div v-if="messages.length === 0" class="no-messages">
                        <p>No messages yet. Start the conversation!</p>
                    </div>

                    <div class="message-container">
                        <div v-for="message in messages" :key="message.id"
                            :class="['message', message.isOwn ? 'own' : 'other']">
                            <div class="message-content">{{ message.content }}</div>
                            <div class="message-time">
                                {{ formatTime(message.timestamp) }}
                                <span v-if="message.delivered" class="delivered-check">✓✓ Delivered</span>
                                <span v-else class="pending-indicator">Sent</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="message-input-container">
                    <div class="input-wrapper">
                        <textarea v-model="newMessage" @keypress.enter.prevent="sendMessage" class="message-input"
                            placeholder="Type a message..." rows="1"></textarea>
                        <button @click="sendMessage" class="send-button" :disabled="!newMessage.trim()">
                            <img src="@/assets/image/Send.svg" alt="Send Message" class="send-icon" />
                        </button>
                    </div>
                </div>


            </div>

            <div v-else class="chat-welcome">
                <div class="welcome-content">
                    <h2>Welcome to P2P Chat</h2>
                    <p>Select a contact to start chatting</p>
                </div>
            </div>
        </div>

        <UpdateUserModal :show-update-modal="showUpdateModal" :current-user="user" @close="showUpdateModal = false"
            @profile-updated="handleProfileUpdated" />
    </div>
</template>

<script>
import { mapState, mapMutations, mapActions } from 'vuex'
import UpdateUserModal from './UpdateUserModal.vue';

export default {
    name: 'ChatInterface',
    components: {
        UpdateUserModal
    },
    data() {
        return {
            searchQuery: '',
            newMessage: '',
            searchTimeout: null,
            showUpdateModal: false
        }
    },
    computed: {
        ...mapState(['user', 'contacts', 'currentChat', 'messages', 'onlineUsers'])
    },
    async mounted() {
        console.log('💻 ChatInterface mounted - initializing...');

        // Test socket connection first
        if (this.$socket) {
            console.log('🔍 Checking socket connection...');
            console.log('Socket connected:', this.$socket.connected);
            console.log('Socket ID:', this.$socket.id);

            // Test ping
            this.$socket.emit('ping', { test: 'connection' }, (response) => {
                console.log('🏓 Ping test result:', response);
            });
        }

        this.setupSocketListeners();

        // Wait for socket to be ready, then load contacts
        setTimeout(() => {
            console.log('📋 Loading initial contacts...');
            this.loadInitialContacts();
        }, 2000);
    },
    beforeDestroy() {
        this.cleanupSocketListeners()
    },
    watch: {
        messages() {
            this.$nextTick(() => {
                this.scrollToBottom()
            })
        }
    },
    methods: {
        ...mapMutations(['SET_CURRENT_CHAT', 'ADD_MESSAGE', 'UPDATE_USER_STATUS', 'UPDATE_CONTACT_PROFILE']),
        ...mapActions(['searchUsers', 'sendMessage', 'logout']),

        setupSocketListeners() {
            if (this.$socket) {
                console.log('🔧 Setting up socket listeners...');
                console.log('📡 Socket connected:', this.$socket.connected);
                console.log('🆔 Socket ID:', this.$socket.id);

                this.$socket.on('connect', () => {
                    console.log('✅ Socket connected in component');
                });

                this.$socket.on('disconnect', () => {
                    console.log('❌ Socket disconnected in component');
                });

                this.$socket.on('message', (message) => {
                    console.log('📨 Incoming message received:', message);
                    this.handleIncomingMessage(message);
                });

                this.$socket.on('userStatus', (status) => {
                    console.log('👤 User status update:', status);
                    this.handleUserStatus(status);
                });

                this.$socket.on('authenticated', (data) => {
                    console.log('🔑 Authentication result in component:', data);
                    if (data.success) {
                        console.log('✅ Socket authenticated, reloading contacts...');
                        this.loadInitialContacts();
                    }
                });

                // Test if socket is working
                console.log('🧪 Testing socket connection...');
                this.$socket.emit('ping', { test: 'hello' }, (response) => {
                    console.log('🏓 Ping response:', response);
                });

            } else {
                console.error('❌ Socket not available for setting up listeners');
            }
        },

        cleanupSocketListeners() {
            if (this.$socket) {
                this.$socket.off('message', this.handleIncomingMessage)
                this.$socket.off('userStatus', this.handleUserStatus)
            }
        },

        handleIncomingMessage(message) {
            // Only add message if it's from the current chat
            if (this.currentChat && message.senderId === this.currentChat.id) {
                this.ADD_MESSAGE({ ...message, isOwn: false })
            }
        },

        handleUserStatus(status) {
            this.UPDATE_USER_STATUS(status)
        },

        handleSearch() {
            clearTimeout(this.searchTimeout)
            this.searchTimeout = setTimeout(() => {
                this.searchUsers(this.searchQuery)
            }, 300)
        },

        async loadInitialContacts() {
            console.log('🔄 Loading contacts...');
            this.loading = true;

            try {
                const results = await this.searchUsers('');
                console.log('✅ Contacts loaded successfully:', results.length, 'users');

                // Debug: Check if current user is in the list
                if (this.user) {
                    console.log('👤 Current user ID:', this.user.id);
                    console.log('🟢 Is current user online?', this.isOnline(this.user.id));
                }
            } catch (error) {
                console.error('❌ Error loading contacts:', error);
            }

            this.loading = false;
        },

        selectContact(contact) {
            this.SET_CURRENT_CHAT(contact)
            // this.userInfo = contact;
            console.log('👥 Selected contact:', contact);
        },
        handleProfileUpdated() {
            console.log('✅ Profile updated successfully')
            // The modal will close automatically
        },

        handleUserProfileUpdate(updatedUser) {
            // Update contact list if this user is in our contacts
            this.UPDATE_CONTACT_PROFILE(updatedUser)

            // Show notification
            this.$toast.info(`${updatedUser.name} updated their profile`)
        },

        handleIncomingMessage(message) {
            console.log('📨 Incoming message received:', message);

            // Check if this is a duplicate message (might be our own message coming back)
            const isDuplicate = this.messages.some(m => m.id === message.id);

            if (isDuplicate) {
                console.log('⚠️ Duplicate message received, ignoring:', message.id);
                return;
            }

            // Only add message if it's from the current chat
            if (this.currentChat && message.senderId === this.currentChat.id) {
                console.log('✅ Adding incoming message to current chat');
                this.ADD_MESSAGE({ ...message, isOwn: false });
            } else {
                console.log('ℹ️ Message from different chat, not displaying');
            }
        },

        async sendMessage() {
            if (!this.newMessage.trim()) {
                console.log('⚠️ Cannot send empty message');
                return;
            }

            if (!this.currentChat) {
                console.error('❌ No contact selected for messaging');
                alert('Please select a contact to message');
                return;
            }

            const message = this.newMessage.trim();
            this.newMessage = '';

            console.log('🚀 Sending message to:', this.currentChat.name);
            console.log("user message..", message, this.currentChat.id);

            try {
                const result = await this.$store.dispatch('sendMessage', {
                    recipientId: this.currentChat.id,
                    message: message,
                    socket: this.$socket  // Pass socket explicitly
                });

                console.log("good result ..", result);

                if (result && result.error) {
                    console.error('❌ Message failed:', result.error);
                    this.showError(`Failed to send message: ${result.error}`);
                } else if (result) {
                    console.log('🎉 Message sent successfully!');
                } else {
                    console.error('❌ No result returned from sendMessage');
                    this.showError('Failed to send message: No response from server');
                }
            } catch (error) {
                console.error('💥 Unexpected error sending message:', error);
                this.showError('Unexpected error sending message: ' + error.message);
            }
        },

        showError(message) {
            // Use a simple alert or console error
            alert(message);
            console.error('💬 Error:', message);
        },

        getInitials(name) {
            return name.split(' ').map(n => n[0]).join('').toUpperCase()
        },

        formatTime(timestamp) {
            return new Date(timestamp).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            })
        },

        scrollToBottom() {
            const container = this.$refs.messagesContainer
            if (container) {
                container.scrollTop = container.scrollHeight
            }
        },

        handleLogout() {
            this.logout()
            this.$router.push('/')
        }
    }
}
</script>

<style scoped>
.logout-btn {
    background: #8bcad9;
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
}

.logout-btn:hover {
    background: rgba(255, 255, 255, 0.3);
}

.no-messages {
    text-align: center;
    padding: 40px;
    color: #666;
    font-style: italic;
}
</style>