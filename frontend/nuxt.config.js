export default {
    mode: 'spa',
    head: {
        title: 'P2P Chat App',
        meta: [
            { charset: 'utf-8' },
            { name: 'viewport', content: 'width=device-width, initial-scale=1' },
            { name: 'description', content: 'Peer-to-Peer Chat Application' }
        ],
        link: [
            { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
        ]
    },
    css: [
        '@/assets/css/main.css'
    ],
    plugins: [
        '@/plugins/socket.io'
    ],
    components: true,
    buildModules: [],
    modules: [
        '@nuxtjs/axios'
    ],
    axios: {
        baseURL: process.env.BASE_URL || 'http://localhost:3030',
        credentials: false,
        proxy: false
    },
    build: {
        extend(config, ctx) { }
    },
    // Add server configuration for development
    server: {
        port: 3000,
        host: '0.0.0.0'
    }
}