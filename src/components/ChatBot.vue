<template>
    <div></div>
</template>
<script setup>
import { onMounted } from 'vue';
import { createChat } from '@n8n/chat'

const props = defineProps({ url: String});
/**
 * 
 * @param {HtmlElement} container
 * @param {}
 */
const createBtn = (container, icon) => {
    const recordButton = document.createElement('button')
    recordButton.id = 'recordAudioButton'
    recordButton.innerHTML = icon
    recordButton.style.marginLeft = '10px'
    recordButton.style.cursor = 'pointer'
    container.appendChild(recordButton)
    return recordButton;
}
onMounted(() => {
    const chatOptions = {
        webhookUrl: props.url,
        chatSessionKey: crypto.randomUUID().replace(/-/g, ''),
        allowFileUploads: true,
    }

    const chat = createChat(chatOptions);

    // Cada 500ms verificamos si ya cargó el DOM
    const interval = setInterval(() => {
        const controls = document.querySelector('.chat-inputs-controls');
        const stopSVG = `<img src="/src/assets/record.svg" alt="Stop" width="20" height="20" />`;
        const myMicSVG = `<img src="/src/assets/microphone.svg" alt="Record" width="20" height="20" />`;

        if (controls) {
            clearInterval(interval)

            const recordButton = createBtn(controls, myMicSVG);
        }
    }, 500);
})
</script>