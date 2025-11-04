<template>
  <div v-if="showUpdateModal" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Update Profile</h3>
        <button class="close-btn" @click="closeModal">×</button>
      </div>
      
      <div class="modal-body">
        <form @submit.prevent="updateProfile">
          <div class="form-group">
            <label for="username">Username</label>
            <input
              id="username"
              v-model="formData.name"
              type="text"
              class="form-input"
              placeholder="Enter your username"
              required
            >
          </div>
          
          <div class="form-group">
            <label for="email">Email</label>
            <input
              id="email"
              v-model="formData.email"
              type="email"
              class="form-input"
              placeholder="Enter your email"
              required
            >
          </div>

          <div v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>

          <div class="form-actions">
            <button type="button" class="cancel-btn" @click="closeModal" :disabled="updating">
              Cancel
            </button>
            <button 
              type="submit" 
              class="update-btn" 
              :disabled="!isFormValid || updating"
            >
              {{ updating ? 'Updating...' : 'Update Profile' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'UpdateUserModal',
  props: {
    showUpdateModal: Boolean,
    currentUser: Object
  },
  data() {
    return {
      formData: {
        name: '',
        email: ''
      },
      updating: false,
      errorMessage: ''
    }
  },
  computed: {
    isFormValid() {
      return this.formData.name.trim() && this.formData.email.trim();
    },
    hasChanges() {
      return this.formData.name !== this.currentUser?.name || 
             this.formData.email !== this.currentUser?.email;
    }
  },
  watch: {
    currentUser: {
      immediate: true,
      handler(user) {
        if (user) {
          this.formData = {
            name: user.name || '',
            email: user.email || ''
          };
          this.errorMessage = '';
        }
      }
    },
    showUpdateModal: {
      handler(newVal) {
        if (!newVal) {
          // Reset form when modal closes
          this.errorMessage = '';
          this.updating = false;
        }
      }
    }
  },
  methods: {
    async updateProfile() {
      if (!this.isFormValid) return;
      
      // Check if there are actual changes
      if (!this.hasChanges) {
        this.$emit('close');
        return;
      }

      this.updating = true;
      this.errorMessage = '';
      
      try {
        const result = await this.$store.dispatch('updateUserProfile', this.formData);
        
        if (result.success) {
          this.$emit('profile-updated');
          this.closeModal();
          
          // Show success message
          if (this.$toast) {
            this.$toast.success('Profile updated successfully!');
          } else {
            console.log('✅ Profile updated successfully!');
          }
        } else {
          this.errorMessage = result.error || 'Failed to update profile';
          if (this.$toast) {
            this.$toast.error(this.errorMessage);
          }
        }
      } catch (error) {
        console.error('Error updating profile:', error);
        this.errorMessage = error.message || 'Failed to update profile. Please try again.';
        if (this.$toast) {
          this.$toast.error(this.errorMessage);
        }
      } finally {
        this.updating = false;
      }
    },
    
    closeModal() {
      this.$emit('close');
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  color: #374151;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #374151;
  background: #f3f4f6;
  border-radius: 50%;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 14px;
  border: 1px solid #fecaca;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.cancel-btn, .update-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  min-width: 100px;
}

.cancel-btn {
  background: #f3f4f6;
  color: #374151;
}

.cancel-btn:hover:not(:disabled) {
  background: #e5e7eb;
}

.cancel-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.update-btn {
  background: #3b82f6;
  color: white;
}

.update-btn:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}

.update-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
}
</style>