<template>
  <div>
    <div v-if="!isAuthenticated" class="auth-container">
      <div class="auth-card">
        <img src="@/assets/image/logochat.svg" alt="P2P Chat Application Logo" class="logo" />
        <div class="auth-tabs">
          <button @click="activeTab = 'login'" :class="['tab-btn', { active: activeTab === 'login' }]">
            Login
          </button>
          <button @click="activeTab = 'register'" :class="['tab-btn', { active: activeTab === 'register' }]">
            Sign Up
          </button>
        </div>

        <LoginForm v-if="activeTab === 'login'" />
        <RegisterForm v-else />
      </div>
    </div>


    <ChatInterface v-else />
  </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
  name: 'IndexPage',
  data() {
    return {
      activeTab: 'login'
    }
  },
  computed: {
    ...mapState(['isAuthenticated'])
  }
}
</script>

<style scoped>
.auth-tabs {
  display: flex;
  margin-bottom: 30px;
  border-bottom: 1px solid #e0e0e0;
}
.logo {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  width: 150px;
  margin: 0 auto 20px auto;
}

.tab-btn {
  flex: 1;
  padding: 12px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.tab-btn.active {
  background: #6E80A4;
  color: white;
}

.tab-btn:not(.active):hover {
  background: #f8f9fa;
}
</style>
