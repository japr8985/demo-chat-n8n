<script setup>
import { RouterLink, RouterView } from 'vue-router'
import HelloWorld from './components/HelloWorld.vue'
import '@n8n/chat/style.css'
import { createChat } from '@n8n/chat'
import { onMounted } from 'vue'

// const sessionId = crypto.randomUUID().replace(/-/g, '');
const URL = 'http://localhost:5678/webhook/7f7f0a20-c0dd-482c-89e6-0c0fbd853f28/chat'
const sendAudioMessage = async (audioBlob, sessionId) => {
    const fd = new FormData();
    fd.append('sessionId', sessionId);
    fd.append('type', 'audio')
    fd.append('chatInput', audioBlob, 'audio.webm')

    try {
        const response = await fetch(URL, {
            method: 'post',
            body: fd
        })
        const data = await response.json();
        
        const botResponseText = data.output;
        return botResponseText;
        // messages.value.push({type: 'text', content: data.output, sender: 'agent'})
    } catch (error) {
        console.log(error)
    }
}
onMounted(() => {
  const chatOptions = {
    webhookUrl: URL, //'https://gsatek.app.n8n.cloud/webhook/cb398a6b-c11d-434d-ad62-765d1cd88340/chat',
    chatSessionKey: 'sessionId',
    allowFileUploads: true,
  }
  const chat = createChat(chatOptions)
console.log(chat.config.globalProperties.$chat)
  // Cada 500ms verificamos si ya cargó el DOM
  const interval = setInterval(() => {
    const controls = document.querySelector('.chat-inputs-controls')
    const stopSVG = `<img src="/src/assets/record.svg" alt="Stop" width="20" height="20" />`
    const myMicSVG = `<img src="/src/assets/microphone.svg" alt="Record" width="20" height="20" />`
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

              const userMessage = {
                id: crypto.randomUUID(),
                sender: 'user',
                text: `🔊 audio`,
                files: [file]
              }
              chat.config.globalProperties.$chat.messages.value.push(userMessage)
              // chat.config.globalProperties.$chat.sendMessage('audio', [file])
              const botResponse = await sendAudioMessage(audioBlob, chat.config.globalProperties.$chat.currentSessionId.value)
              
              const msg = {
                id: crypto.randomUUID(),
                sender: 'bot',
                text: botResponse
              }
              chat.config.globalProperties.$chat.messages.value.push(msg)
            })

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

// onMounted(() => {
//   ;(function (d, t) {
//     var BASE_URL = 'https://app.chatwoot.com'
//     var g = d.createElement(t),
//       s = d.getElementsByTagName(t)[0]
//     g.src = BASE_URL + '/packs/js/sdk.js'
//     g.defer = true
//     g.async = true
//     s.parentNode.insertBefore(g, s)
//     g.onload = function () {00000
//       window.chatwootSDK.run({
//         websiteToken: 'VUBFF4MFUnTkpU6p4ftJHJLe',
//         baseUrl: BASE_URL,
//       })
//     }
//   })(document, 'script')
// })
</script>

<template>
  <header>
    <img alt="Vue logo" class="logo" src="@/assets/logo.svg" width="125" height="125" />

    <div class="wrapper">
      <HelloWorld msg="You did it!" />

      <nav>
        <RouterLink to="/">Home</RouterLink>
        
      </nav>
    </div>
  </header>

  <RouterView />
</template>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  nav {
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;

    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
