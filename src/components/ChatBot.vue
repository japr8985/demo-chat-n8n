<script setup>
import '@n8n/chat/style.css'
import { createChat } from '@n8n/chat'
import { onMounted } from 'vue';

const props = defineProps({
    url: String
})

const sendAudioMessage = async (audioBlob, sessionId) => {
    const fd = new FormData();
    fd.append('sessionId', sessionId);
    fd.append('type', 'audio')
    fd.append('chatInput', audioBlob, 'audio.webm')

    try {
        const response = await fetch(props.url, {
            method: 'post',
            body: fd
        })
        
        const data = await response.json();
        
        const botResponseText = data.output;
        return botResponseText;
        
    } catch (error) {
        console.log(error)
    }
}
const insertMessageToChat = (chat, text, sender = 'bot', file = null) => {
    const msg = { id: crypto.randomUUID(), sender, text };

    if (file) {
        msg.files = [file]
    }
    
    chat.config.globalProperties.$chat.messages.value.push(msg)
}
onMounted(() => {
  const chatOptions = {
    webhookUrl: props.url, //'https://gsatek.app.n8n.cloud/webhook/cb398a6b-c11d-434d-ad62-765d1cd88340/chat',
    chatSessionKey: 'sessionId',
    allowFileUploads: true,
  }
  const chat = createChat(chatOptions)
  
  // Cada 500ms verificamos si ya cargó el DOM
  const interval = setInterval(() => {
    const controls = document.querySelector('.chat-inputs-controls')
    const stopSVG = `<img src="/record.svg" alt="Stop" width="20" height="20" />`
    const myMicSVG = `<img src="/microphone.svg" alt="Record" width="20" height="20" />`
    if (controls) {
      clearInterval(interval)

      // Crear botón
      const recordButton = document.createElement('button')
      recordButton.id = 'recordAudioButton'
      // svg image
      recordButton.innerHTML = myMicSVG
      recordButton.style.marginLeft = '10px'
      recordButton.style.cursor = 'pointer'
      controls.appendChild(recordButton)

      // Crear contenedor para ondas
      const wavesContainer = document.createElement('div')
      wavesContainer.id = 'audioWaves'
      wavesContainer.style.display = 'none'
      controls.appendChild(wavesContainer)

      // Agregamos 3 barras animadas
      for (let i = 0; i < 3; i++) {
        const bar = document.createElement('div')
        bar.style.width = '4px'
        bar.style.height = '10px'
        bar.style.background = '#4caf50'
        bar.style.animation = `wave 1s infinite ease-in-out ${i * 0.2}s`
        wavesContainer.appendChild(bar)
      }

      // Estilos CSS para ondas
      const style = document.createElement('style')
      style.innerHTML = `
            @keyframes wave {
              0%, 100% { transform: scaleY(0.5); }
              50% { transform: scaleY(1.5); }
            }
          `
      document.head.appendChild(style)

      // Lógica grabación
      let mediaRecorder
      let audioChunks = []
      let recording = false
      let animationId
      let audioContext
      let analyser
      let source
      let dataArray

      recordButton.addEventListener('click', async () => {
        if (!recording) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            mediaRecorder = new MediaRecorder(stream)
            mediaRecorder.start()
            audioChunks = []

            // 🎧 Configurar Web Audio API para animar basado en el sonido
            audioContext = new AudioContext()
            source = audioContext.createMediaStreamSource(stream)
            analyser = audioContext.createAnalyser()
            source.connect(analyser)
            analyser.fftSize = 256
            const bufferLength = analyser.frequencyBinCount
            dataArray = new Uint8Array(bufferLength)

            // Función para animar las ondas en tiempo real
            function animateWaves() {
              analyser.getByteTimeDomainData(dataArray)

              let sum = 0
              for (let i = 0; i < bufferLength; i++) {
                const value = (dataArray[i] - 128) / 128 // Normalizar
                sum += value * value
              }
              const rms = Math.sqrt(sum / bufferLength) // Root Mean Square (nivel de volumen)

              const scale = Math.max(1, rms * 10) // Escalamos volumen
              const bars = document.querySelectorAll('#audioWaves div')
              bars.forEach((bar) => {
                bar.style.transform = `scaleY(${scale})`
              })

              animationId = requestAnimationFrame(animateWaves)
            }

            animateWaves() // ¡Empieza animación viva!

            mediaRecorder.addEventListener('dataavailable', (event) => {
              audioChunks.push(event.data)
            })

            mediaRecorder.addEventListener('stop', async () => {
              const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
              const file = new File([audioBlob], 'audio.webm', { type: 'audio/webm' })
              
              // Detener animación de ondas
              cancelAnimationFrame(animationId)
              audioContext.close()
              wavesContainer.style.display = 'none'
                
              chat.config.globalProperties.$chat.waitingForResponse.value = true;
              insertMessageToChat(chat, `🔊 audio`, 'user', file)
              
              const botResponse = await sendAudioMessage(audioBlob, chat.config.globalProperties.$chat.currentSessionId.value)
              
              insertMessageToChat(chat, botResponse, 'bot')
              chat.config.globalProperties.$chat.waitingForResponse.value = false;
            });

            // Activar animación
            recording = true
            recordButton.innerHTML = stopSVG
            wavesContainer.style.display = 'flex'
          } catch (err) {
            console.error('Error accediendo al micrófono:', err)
          }
        } else {
          mediaRecorder.stop()
          recording = false
          recordButton.innerHTML = myMicSVG
        }
      })
    }
  }, 500) // Cada 500ms verificamos si ya cargó el DOM
})
</script>
<template>
    <div></div>
</template>