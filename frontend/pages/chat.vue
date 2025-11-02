<template>
    <chat-interface />
</template>

<script>
import ChatInterface from '@/components/ChatInterface.vue'

export default {
    name: 'ChatPage',
    middleware: 'auth',
    components: {
        ChatInterface
    }
}
</script>