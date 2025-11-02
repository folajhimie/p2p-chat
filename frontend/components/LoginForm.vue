<template>
  <form @submit.prevent="handleLogin" class="auth-form">
    <div v-if="error" class="error-message">{{ error }}</div>
    
    <div class="form-group">
      <!-- <label>Email or Mobile Number</label> -->
      <input
        v-model="credentials.email"
        type="text"
        class="form-control"
        required
        placeholder="Enter your email or mobile number"
      >
    </div>
    
    <div class="form-group">
      <!-- <label>Password</label> -->
      <input
        v-model="credentials.password"
        type="password"
        class="form-control"
        required
        placeholder="Enter your password"
      >
    </div>
    
    <button type="submit" class="btn btn-primary" :disabled="loading">
      {{ loading ? 'Signing In...' : 'Sign In' }}
    </button>
  </form>
</template>

<script>
export default {
  name: 'LoginForm',
  data() {
    return {
      credentials: {
        email: '',
        password: ''
      },
      loading: false,
      error: ''
    }
  },
  methods: {
    async handleLogin() {
      this.loading = true
      this.error = ''
      
      const result = await this.$store.dispatch('login', this.credentials)
      
      if (!result.success) {
        this.error = result.error
      }
      
      this.loading = false
    }
  }
}
</script>