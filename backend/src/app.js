const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class P2PChatService {
    constructor() {
        this.users = new Map();
        this.userLookup = new Map();
        this.connections = new Map();
        this.offlineMessages = new Map();
        this.onlineUsers = new Set();

        // Initialize with demo users
        this.initializeDemoUsers();
    }

    async initializeDemoUsers() {
        // Clear any existing users to start fresh
        this.users.clear();
        this.userLookup.clear();

        console.log('🔄 Initializing demo users...');
        const demoUsers = [
            { name: 'Alice Johnson', email: 'alice@example.com', mobile: '1111111111', password: 'password123' },
            { name: 'Bob Smith', email: 'bob@example.com', mobile: '2222222222', password: 'password123' },
            { name: 'Carol Davis', email: 'carol@example.com', mobile: '3333333333', password: 'password123' }
        ];

        for (const userData of demoUsers) {
            try {
                await this.registerUser(userData, true);
            } catch (error) {
                console.log('User already exists:', userData.email);
            }
        }
        console.log('✅ Demo users initialized');
        this.listAllUsers();
    }

    async registerUser(userData, isDemo = false) {
        const { email, mobile, password, name } = userData;

        const normalizedEmail = email.toLowerCase().trim();
        const normalizedMobile = mobile.trim();
        const normalizedName = name.trim();

        if (this.userLookup.has(normalizedEmail)) {
            throw new Error('User already exists with this email');
        }
        if (this.userLookup.has(normalizedMobile)) {
            throw new Error('User already exists with this mobile number');
        }

        const userId = uuidv4();
        const hashedPassword = await bcrypt.hash(password, 12);

        const user = {
            id: userId,
            email: normalizedEmail,
            mobile: normalizedMobile,
            password: hashedPassword,
            name: normalizedName,
            createdAt: new Date()
        };

        this.users.set(userId, user);
        this.userLookup.set(user.email, userId);
        this.userLookup.set(user.mobile, userId);

        if (!isDemo) {
            console.log(`✅ New user registered: ${user.name} (${user.email})`);
            console.log(`📊 Total users: ${this.users.size}`);
            this.listAllUsers();
        }

        return { id: userId, email: user.email, mobile: user.mobile, name: user.name };
    }

    // NEW: Update user profile method
    async updateUserProfile(userId, updateData) {
        console.log(`🔄 Updating profile for user: ${userId}`, updateData);
        
        const user = this.users.get(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const { name, email } = updateData;
        let updatedFields = {};

        // Update name if provided
        if (name && name.trim() !== '') {
            updatedFields.name = name.trim();
        }

        // Update email if provided and changed
        if (email && email.toLowerCase().trim() !== user.email) {
            const newEmail = email.toLowerCase().trim();
            
            // Check if new email is already taken by another user
            if (this.userLookup.has(newEmail) && this.userLookup.get(newEmail) !== userId) {
                throw new Error('Email is already taken by another user');
            }

            // Remove old email from lookup
            this.userLookup.delete(user.email);
            
            // Update email
            updatedFields.email = newEmail;
            this.userLookup.set(newEmail, userId);
        }

        // Update user object
        const updatedUser = {
            ...user,
            ...updatedFields,
            updatedAt: new Date()
        };

        this.users.set(userId, updatedUser);

        console.log(`✅ Profile updated for user: ${updatedUser.name} (${updatedUser.email})`);

        // Return user data without password
        const { password: _, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
    }

    async authenticateUser(credentials) {
        const { email, mobile, password } = credentials;

        const searchEmail = email ? email.toLowerCase().trim() : null;
        const searchMobile = mobile ? mobile.trim() : null;

        const userId = this.userLookup.get(searchEmail) || this.userLookup.get(searchMobile);

        if (!userId) throw new Error('User not found');

        const user = this.users.get(userId);
        if (!user) throw new Error('User not found');

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) throw new Error('Invalid password');

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET || 'p2p-chat-secret-key',
            { expiresIn: '24h' }
        );

        console.log(`🔑 User authenticated: ${user.name} (${user.id})`);
        return { token, user: { id: user.id, email: user.email, mobile: user.mobile, name: user.name } };
    }

    async searchUsers(query = '', currentUserId = null) {
        const results = [];
        const searchTerm = query.toLowerCase().trim();

        console.log(`🔍 User ${currentUserId} searching for: "${searchTerm}"`);
        console.log(`📊 Total users in database: ${this.users.size}`);

        for (let [userId, user] of this.users) {
            // Skip current user
            if (currentUserId && userId === currentUserId) {
                continue;
            }

            // If no search term, include all users
            if (!searchTerm) {
                results.push({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    mobile: user.mobile,
                    isOnline: this.onlineUsers.has(userId)
                });
                continue;
            }

            // Check if user matches search term
            const emailMatch = user.email.toLowerCase().includes(searchTerm);
            const mobileMatch = user.mobile.includes(searchTerm);
            const nameMatch = user.name.toLowerCase().includes(searchTerm);

            if (emailMatch || mobileMatch || nameMatch) {
                results.push({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    mobile: user.mobile,
                    isOnline: this.onlineUsers.has(userId)
                });
            }
        }

        console.log(`✅ Found ${results.length} users for search`);
        return results;
    }

    connectUser(userId, socket) {
        console.log(`🔗 Connecting user: ${userId}`);

        // Remove any existing connection for this user
        if (this.connections.has(userId)) {
            const oldSocket = this.connections.get(userId);
            if (oldSocket && oldSocket !== socket) {
                console.log(`🔄 Replacing old connection for user: ${userId}`);
                oldSocket.disconnect();
            }
        }

        // Store new connection
        this.connections.set(userId, socket);
        this.onlineUsers.add(userId);

        const user = this.users.get(userId);
        if (user) {
            console.log(`✅ User connected: ${user.name} (${userId})`);
        }

        // Deliver any pending messages
        this.deliverPendingMessages(userId, socket);

        // Broadcast online status to all other users
        this.broadcastUserStatus(userId, true);

        console.log(`📊 Online users: ${this.onlineUsers.size}`);
        console.log(`🟢 Online users:`, Array.from(this.onlineUsers));
    }

    disconnectUser(userId) {
        this.connections.delete(userId);
        this.onlineUsers.delete(userId);

        const user = this.users.get(userId);
        if (user) {
            console.log(`🔴 User disconnected: ${user.name} (${userId})`);
        }

        this.broadcastUserStatus(userId, false);
        console.log(`📊 Online users: ${this.onlineUsers.size}`);
    }

    async sendMessage(senderId, recipientId, messageContent) {
        try {
            console.log(`📨 Sending message from ${senderId} to ${recipientId}`);
            console.log(`Content: "${messageContent}"`);

            const sender = this.users.get(senderId);
            const recipient = this.users.get(recipientId);

            if (!sender) {
                throw new Error(`Sender not found: ${senderId}`);
            }
            if (!recipient) {
                throw new Error(`Recipient not found: ${recipientId}`);
            }

            const message = {
                id: uuidv4(),
                senderId,
                recipientId,
                content: messageContent,
                timestamp: new Date(),
                delivered: false
            };

            console.log(`👤 Sender: ${sender.name}, Recipient: ${recipient.name}`);

            const recipientSocket = this.connections.get(recipientId);

            if (recipientSocket && recipientSocket.connected) {
                // Recipient is online - deliver immediately
                console.log(`✅ Recipient ${recipient.name} is online, delivering message...`);

                try {
                    recipientSocket.emit('message', message);
                    message.delivered = true;
                    console.log(`📬 Message delivered successfully to ${recipient.name}`);
                } catch (error) {
                    console.error('❌ Error delivering message to socket:', error);
                    // Fallback to offline storage if delivery fails
                    this.storeMessageOffline(recipientId, message);
                }
            } else {
                // Recipient is offline - store message
                console.log(`💤 Recipient ${recipient.name} is offline, storing message...`);
                this.storeMessageOffline(recipientId, message);
            }

            return message;
        } catch (error) {
            console.error('💥 Error in sendMessage:', error);
            throw error; // Re-throw to be caught by the caller
        }
    }

    deliverPendingMessages(userId, socket) {
        if (this.offlineMessages.has(userId)) {
            const pendingMessages = this.offlineMessages.get(userId);
            console.log(`📬 Delivering ${pendingMessages.length} pending messages to user ${userId}`);

            pendingMessages.forEach(message => {
                message.delivered = true;
                socket.emit('message', message);
            });

            this.offlineMessages.delete(userId);
        }
    }

    broadcastUserStatus(userId, isOnline) {
        const user = this.users.get(userId);
        if (!user) return;

        const statusUpdate = {
            userId,
            isOnline,
            timestamp: new Date(),
            userName: user.name
        };

        console.log(`📢 Broadcasting: ${user.name} is ${isOnline ? 'online' : 'offline'}`);

        // Notify all connected users except the one who changed status
        this.connections.forEach((socket, id) => {
            if (id !== userId) {
                socket.emit('userStatus', statusUpdate);
            }
        });
    }

    // NEW: Broadcast profile updates to all connected clients
    broadcastProfileUpdate(updatedUser) {
        console.log(`📢 Broadcasting profile update for: ${updatedUser.name}`);

        const updateData = {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            mobile: updatedUser.mobile,
            updatedAt: updatedUser.updatedAt
        };

        // Notify all connected users
        this.connections.forEach((socket, userId) => {
            socket.emit('user_profile_updated', updateData);
        });
    }

    listAllUsers() {
        console.log('\n=== 📋 ALL REGISTERED USERS ===');
        if (this.users.size === 0) {
            console.log('No users registered yet.');
        } else {
            this.users.forEach((user, userId) => {
                const onlineStatus = this.onlineUsers.has(userId) ? '🟢 ONLINE' : '🔴 OFFLINE';
                console.log(`- ${user.name} (${user.email}) - ${onlineStatus} - ID: ${userId}`);
            });
        }
        console.log(`=== 📊 Total: ${this.users.size} users ===\n`);
    }

    getSystemStats() {
        return {
            totalUsers: this.users.size,
            onlineUsers: this.onlineUsers.size,
            activeConnections: this.connections.size,
            pendingMessages: Array.from(this.offlineMessages.values()).reduce((acc, msgs) => acc + msgs.length, 0)
        };
    }

    storeMessageOffline(recipientId, message) {
        if (!this.offlineMessages.has(recipientId)) {
            this.offlineMessages.set(recipientId, []);
        }
        this.offlineMessages.get(recipientId).push(message);
        console.log(`💾 Message stored for offline user. Total pending: ${this.offlineMessages.get(recipientId).length}`);
    }
}

// Initialize server
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    }
});

const chatService = new P2PChatService();

// Middleware
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));
app.use(express.json());

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ success: false, error: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'p2p-chat-secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }
};

// REST API Endpoints
app.post('/api/register', async (req, res) => {
    try {
        console.log("📝 Registration request:", req.body);

        const { name, email, mobile, password } = req.body;

        if (!name || !email || !mobile || !password) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required: name, email, mobile, password'
            });
        }

        const result = await chatService.registerUser(req.body);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ Registration error:', error.message);
        res.status(400).json({ success: false, error: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        console.log("🔑 Login request:", req.body);
        const result = await chatService.authenticateUser(req.body);

        // List all users after login for debugging
        chatService.listAllUsers();

        res.json({
            success: true,
            ...result,
            message: 'Login successful'
        });
    } catch (error) {
        console.error('❌ Login error:', error.message);
        res.status(401).json({ success: false, error: error.message });
    }
});

// NEW: Update user profile endpoint
app.put('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        console.log("🔄 Profile update request:", req.body);
        
        const { name, email } = req.body;
        const userId = req.user.userId;

        if (!name && !email) {
            return res.status(400).json({
                success: false,
                error: 'At least one field (name or email) is required for update'
            });
        }

        const updatedUser = await chatService.updateUserProfile(userId, { name, email });
        
        // Broadcast the update to all connected clients
        chatService.broadcastProfileUpdate(updatedUser);

        res.json({
            success: true,
            user: updatedUser,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('❌ Profile update error:', error.message);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Search endpoint (REST version for testing)
app.get('/api/search', async (req, res) => {
    try {
        const { q: query, token } = req.query;
        let currentUserId = null;

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'p2p-chat-secret-key');
                currentUserId = decoded.userId;
            } catch (error) {
                console.log('Invalid token for search');
            }
        }

        const results = await chatService.searchUsers(query || '', currentUserId);
        res.json({ success: true, results });
    } catch (error) {
        console.error('❌ Search error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Debug endpoints
app.get('/api/debug/users', (req, res) => {
    const users = [];
    chatService.users.forEach((user, userId) => {
        users.push({
            id: userId,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
            isOnline: chatService.onlineUsers.has(userId)
        });
    });
    res.json({
        success: true,
        users,
        total: users.length,
        online: chatService.onlineUsers.size,
        stats: chatService.getSystemStats()
    });
});

// Reset server (for testing)
app.post('/api/debug/reset', (req, res) => {
    chatService.initializeDemoUsers();
    res.json({ success: true, message: 'Server reset to initial state' });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'P2P Chat Server is running',
        stats: chatService.getSystemStats(),
        endpoints: {
            register: 'POST /api/register',
            login: 'POST /api/login',
            profile: 'PUT /api/user/profile',
            search: 'GET /api/search?q=query&token=token',
            debug: 'GET /api/debug/users',
            reset: 'POST /api/debug/reset'
        }
    });
});

// Debug: Check user connections
app.get('/api/debug/connections', (req, res) => {
    const connections = [];
    chatService.connections.forEach((socket, userId) => {
        const user = chatService.users.get(userId);
        connections.push({
            userId,
            userName: user?.name,
            socketId: socket.id,
            connected: socket.connected
        });
    });

    res.json({
        success: true,
        connections,
        total: connections.length
    });
});

// Debug: Check specific user status
app.get('/api/debug/user/:userId', (req, res) => {
    const { userId } = req.params;
    const user = chatService.users.get(userId);
    const isOnline = chatService.onlineUsers.has(userId);
    const hasConnection = chatService.connections.has(userId);
    const pendingMessages = chatService.offlineMessages.get(userId) || [];

    res.json({
        success: true,
        user,
        isOnline,
        hasConnection,
        pendingMessages: pendingMessages.length,
        connectionDetails: hasConnection ? {
            socketId: chatService.connections.get(userId).id,
            connected: chatService.connections.get(userId).connected
        } : null
    });
});

// Socket.io Event Handlers
io.on('connection', (socket) => {
    console.log('🔌 New client connected:', socket.id);

    // Authentication handler
    socket.on('authenticate', (data) => {
        try {
            console.log('🔑 Authentication attempt for socket:', socket.id);
            const decoded = jwt.verify(data.token, process.env.JWT_SECRET || 'p2p-chat-secret-key');

            // Connect the user
            chatService.connectUser(decoded.userId, socket);
            socket.userId = decoded.userId;

            socket.emit('authenticated', {
                success: true,
                userId: decoded.userId,
                message: 'Authentication successful'
            });

            console.log(`✅ User ${decoded.userId} authenticated successfully`);

        } catch (error) {
            console.error('❌ Authentication failed:', error.message);
            socket.emit('authenticated', {
                success: false,
                error: 'Invalid token'
            });
        }
    });

    // User search handler
    socket.on('searchUsers', (data, callback) => {
        console.log('🔍 Search request from socket:', data);

        try {
            const decoded = jwt.verify(data.token, process.env.JWT_SECRET || 'p2p-chat-secret-key');
            chatService.searchUsers(data.query, decoded.userId)
                .then(callback)
                .catch(error => {
                    console.error('Search error:', error);
                    callback([]);
                });
        } catch (error) {
            console.error('Search authentication error:', error.message);
            callback([]);
        }
    });

    // Message sending handler
    socket.on('sendMessage', (data, callback) => {
        console.log('📨 Send message request received:');
        console.log('  Sender:', data.senderId);
        console.log('  Recipient:', data.recipientId);
        console.log('  Message:', data.message);

        // Validate that callback is a function
        if (typeof callback !== 'function') {
            console.error('❌ No callback function provided');
            return;
        }

        // Validate required fields
        if (!data.senderId || !data.recipientId || !data.message) {
            console.error('❌ Missing required fields for message');
            callback({ error: 'Missing required fields: senderId, recipientId, or message' });
            return;
        }

        chatService.sendMessage(data.senderId, data.recipientId, data.message)
            .then(messageData => {
                console.log('✅ Message processed successfully:', messageData.id);
                callback(messageData || { error: 'Message processed but no data returned' });
            })
            .catch(error => {
                console.error('❌ Message sending error:', error.message);
                callback({ error: error.message || 'Unknown error occurred' });
            });
    });

    // Add ping endpoint for testing socket connection
    socket.on('ping', (data, callback) => {
        console.log('🏓 Ping received:', data);
        callback({ status: 'pong', received: data, timestamp: new Date() });
    });

    // Disconnection handler
    socket.on('disconnect', (reason) => {
        console.log('🔌 Client disconnected:', socket.id, 'Reason:', reason);

        if (socket.userId) {
            chatService.disconnectUser(socket.userId);
        } else {
            // Fallback: find user by socket
            for (let [userId, userSocket] of chatService.connections) {
                if (userSocket === socket) {
                    chatService.disconnectUser(userId);
                    break;
                }
            }
        }
    });
});

// Error handling
app.use((error, req, res, next) => {
    console.error('💥 Server error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
});

app.use('*', (req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Start server
const PORT = process.env.PORT || 3030;
server.listen(PORT, () => {
    console.log(`🚀 P2P Chat Server running on port ${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
    console.log(`\n🔧 Debug endpoints:`);
    console.log(`   http://localhost:${PORT}/api/debug/users - List all users`);
    console.log(`   http://localhost:${PORT}/api/health - Server status`);
    console.log(`\n👤 Demo users (password: password123):`);
    console.log(`   - alice@example.com`);
    console.log(`   - bob@example.com`);
    console.log(`   - carol@example.com`);
});