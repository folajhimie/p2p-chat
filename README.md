# P2P Chat Application

A real-time peer-to-peer chat application built with Nuxt 2 and Node.js/Feathers.js.

## Features

- User registration with email and mobile number
- Real-time direct messaging
- Online/offline status indicators
- Offline message storage and delivery
- Contact search by email or mobile
- Clean, responsive UI

## Tech Stack

- Frontend: Nuxt 2, Vue.js, Vuex
- Backend: Node.js, Feathers.js, Socket.io
- Authentication: JWT
- Storage: In-memory (for demo purposes)

## Setup Instructions

### Backend Setup

1. Navigate to backend directory:

```bash
cd backend

# Test health endpoint
curl http://localhost:3030/api/health

1. First, clear all existing users:

curl -X POST http://localhost:3030/api/debug/clear-users

2. Check if users are cleared:


curl http://localhost:3030/api/debug/users

3. Now register your first user:

curl -X POST http://localhost:3030/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dev",
    "email": "dev@example.com",
    "mobile": "1234567890",
    "password": "password123"
}'

4. Register second user:

curl -X POST http://localhost:3030/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "mobile": "0987654321",
    "password": "password123"
}'

5. Or add demo users automatically:

curl -X POST http://localhost:3030/api/debug/add-demo-users

6. Verify all users are registered:

curl http://localhost:3030/api/debug/users
```
