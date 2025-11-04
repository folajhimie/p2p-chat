export const state = () => ({
    user: null,
    token: null,
    isAuthenticated: false,
    contacts: [],
    currentChat: null,
    messages: [],
    onlineUsers: new Set()
})

export const mutations = {
    SET_USER(state, user) {
        state.user = user
        state.isAuthenticated = !!user
    },

    SET_TOKEN(state, token) {
        state.token = token
        if (process.client && token) {
            localStorage.setItem('authToken', token)
        }
    },

    SET_CONTACTS(state, contacts) {
        state.contacts = contacts
    },

    SET_CURRENT_CHAT(state, contact) {
        state.currentChat = contact
        state.messages = [] // Clear messages when switching chats
    },

    ADD_MESSAGE(state, message) {
        // Check if message already exists to prevent duplicates
        const messageExists = state.messages.some(m => m.id === message.id);

        if (!messageExists) {
            console.log('➕ Adding message to store:', message.id, message.content);
            state.messages.push(message);
        } else {
            console.log('⚠️ Message already exists, skipping:', message.id);
        }
    },

    UPDATE_USER_STATUS(state, { userId, isOnline }) {
        if (isOnline) {
            state.onlineUsers.add(userId)
        } else {
            state.onlineUsers.delete(userId)
        }
    },

    // NEW: Update user profile mutation
    UPDATE_USER_PROFILE(state, userData) {
        if (state.user) {
            console.log('🔄 Updating user profile in store:', userData);
            state.user = { ...state.user, ...userData };
        }
    },

    // NEW: Update contact profile in contacts list
    UPDATE_CONTACT_PROFILE(state, userData) {
        const contactIndex = state.contacts.findIndex(contact => contact.id === userData.id);
        if (contactIndex !== -1) {
            console.log('🔄 Updating contact profile in store:', userData);
            state.contacts[contactIndex] = { ...state.contacts[contactIndex], ...userData };
            
            // Update current chat if it's the same user
            if (state.currentChat && state.currentChat.id === userData.id) {
                console.log('🔄 Also updating current chat profile');
                state.currentChat = { ...state.currentChat, ...userData };
            }
        }
    },

    CLEAR_AUTH(state) {
        state.user = null
        state.token = null
        state.isAuthenticated = false
        if (process.client) {
            localStorage.removeItem('authToken')
        }
    }
}

export const actions = {
    // User Registration
    async register({ commit }, userData) {
        try {
            const response = await this.$axios.post('/api/register', userData)
            return { success: true, data: response.data }
        } catch (error) {
            return { success: false, error: error.response?.data?.error || error.message }
        }
    },

    // User Login
    async login({ commit }, credentials) {
        try {
            console.log("🔑 Logging in user:", credentials);
            const response = await this.$axios.post('/api/login', credentials);
            console.log("✅ Login successful:", response.data);

            const { token, user } = response.data;

            commit('SET_TOKEN', token);
            commit('SET_USER', user);

            // Authenticate socket immediately after login
            if (this.$socket) {
                console.log('🔑 Authenticating socket after login...');
                this.$socket.authenticate(token);

                // Load contacts after a short delay to ensure authentication
                setTimeout(() => {
                    this.dispatch('searchUsers', '');
                }, 1000);
            }

            return { success: true };
        } catch (error) {
            console.error("❌ Login error:", error);
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    },

    async updateUserProfile({ commit, state }, userData) {
        try {
            console.log('🔄 Updating user profile:', userData);
            
            const response = await this.$axios.put('/api/user/profile', userData, {
                headers: {
                    Authorization: `Bearer ${state.token}`
                }
            });

            if (response.data.success) {
                console.log('✅ Profile updated successfully:', response.data.user);
                
                // Update user in store
                commit('UPDATE_USER_PROFILE', response.data.user);
                
                // Emit socket event to notify other users
                if (this.$socket) {
                    this.$socket.emit('user_profile_updated', response.data.user);
                }
                
                return { 
                    success: true, 
                    user: response.data.user,
                    message: 'Profile updated successfully'
                };
            } else {
                console.error('❌ Profile update failed:', response.data.error);
                return { 
                    success: false, 
                    error: response.data.error || 'Failed to update profile' 
                };
            }
        } catch (error) {
            console.error('❌ Error updating profile:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to update profile';
            return { 
                success: false, 
                error: errorMessage 
            };
        }
    },

    // User Logout
    logout({ commit }) {
        commit('CLEAR_AUTH')
        commit('SET_CONTACTS', [])
        commit('SET_CURRENT_CHAT', null)

        if (this.$socket) {
            this.$socket.disconnect()
        }
    },

    // Search Users
    async searchUsers({ commit, state }, query) {
        return new Promise((resolve) => {
            if (!this.$socket) {
                console.error('❌ Socket not available');
                resolve([]);
                return;
            }

            const token = state.token || (process.client ? localStorage.getItem('authToken') : null);
            if (!token) {
                console.error('❌ No authentication token available');
                resolve([]);
                return;
            }

            console.log('🔍 Searching users with query:', query || '[all users]');

            this.$socket.emit('searchUsers', {
                query: query || '',
                token
            }, (results) => {
                console.log('✅ Search results received:', results.length, 'users');
                commit('SET_CONTACTS', results);
                resolve(results);
            });

            // Fallback timeout
            setTimeout(() => {
                console.log('⏱️ Search timeout - no response from server');
                resolve([]);
            }, 5000);
        });
    },

    // Send Message
    sendMessage({ commit, state }, { recipientId, message }) {
        return new Promise((resolve) => {
            // Get socket from the root context (injected by Nuxt)
            const socket = this.app.$socket || this.$socket;

            if (!socket) {
                console.error('❌ Socket not available');
                resolve({ error: 'Socket not connected' });
                return;
            }

            if (!state.user) {
                console.error('❌ User not logged in');
                resolve({ error: 'Not authenticated' });
                return;
            }

            if (!recipientId) {
                console.error('❌ No recipient specified');
                resolve({ error: 'No recipient selected' });
                return;
            }

            if (!message || message.trim() === '') {
                console.error('❌ Empty message');
                resolve({ error: 'Message cannot be empty' });
                return;
            }

            console.log('📤 Preparing to send message:');
            console.log('  From:', state.user.id, `(${state.user.name})`);
            console.log('  To:', recipientId);
            console.log('  Content:', message);

            let responseReceived = false;

            socket.emit('sendMessage', {
                senderId: state.user.id,
                recipientId: recipientId,
                message: message
            }, (response) => {
                responseReceived = true;
                console.log('📨 Send message response received:', response);

                if (!response) {
                    console.error('❌ No response received from server');
                    resolve({ error: 'No response from server' });
                    return;
                }

                if (response.error) {
                    console.error('❌ Server returned error:', response.error);
                    resolve({ error: response.error });
                } else {
                    console.log('✅ Message sent successfully, adding to store:', response.id);

                    // Add the real message from server
                    commit('ADD_MESSAGE', { ...response, isOwn: true });
                    resolve(response);
                }
            });

            // Timeout after 5 seconds
            setTimeout(() => {
                if (!responseReceived) {
                    console.error('⏱️ Send message timeout - no response from server after 5s');
                    resolve({ error: 'Message delivery timeout - server not responding' });
                }
            }, 5000);
        });
    },

    // NEW: Handle incoming profile updates from socket
    handleUserProfileUpdate({ commit }, updatedUser) {
        console.log('📨 Received user profile update:', updatedUser);
        commit('UPDATE_CONTACT_PROFILE', updatedUser);
    }
}