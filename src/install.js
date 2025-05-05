import ChatBot from "./components/ChatBot.vue"
export default {
    install(app, options = {}) {
        app.component('gsatek-chat', ChatBot)
    }
}