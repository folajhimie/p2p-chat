<template>
  <form @submit.prevent="handleRegister" class="auth-form">
    <div v-if="error" class="error-message">{{ error }}</div>
    
    <div class="form-group">
      <!-- <label>Full Name</label> -->
      <input
        v-model="userData.name"
        type="text"
        class="form-control"
        required
        placeholder="Enter your full name"
      >
    </div>
    
    <div class="form-group">
      <!-- <label>Email Address</label> -->
      <input
        v-model="userData.email"
        type="email"
        class="form-control"
        required
        placeholder="Enter your email address"
      >
    </div>
    
    <div class="form-group">
      <!-- <label>Mobile Number</label> -->
      <input
        v-model="userData.mobile"
        type="tel"
        class="form-control"
        required
        placeholder="Enter your mobile number"
      >
    </div>
    
    <div class="form-group">
      <!-- <label>Password</label> -->
      <input
        v-model="userData.password"
        type="password"
        class="form-control"
        required
        placeholder="Create a password (min. 6 characters)"
        minlength="6"
      >
    </div>
    
    <button type="submit" class="btn btn-primary" :disabled="loading">
      {{ loading ? 'Creating Account...' : 'Sign Up' }}
    </button>
  </form>
</template>

<script>
export default {
  name: 'RegisterForm',
  data() {
    return {
      userData: {
        name: '',
        email: '',
        mobile: '',
        password: ''
      },
      loading: false,
      error: ''
    }
  },
  methods: {
    async handleRegister() {
      this.loading = true
      this.error = ''
      
      const result = await this.$store.dispatch('register', this.userData)
      
      if (result.success) {
        this.$emit('switch-to-login')
        this.$toast.success('Account created successfully! Please sign in.')
      } else {
        this.error = result.error
      }
      
      this.loading = false
    }
  }
}
</script>