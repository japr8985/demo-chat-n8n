<script setup>
import '@n8n/chat/style.css'
import { createChat } from '@n8n/chat'
import { onMounted } from 'vue';
import translate from '@/i18n/index';

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
  // lang del navegador
  const browserLanguage = navigator.language.split('-')[0];
  // mensaje inicial y traduccion segun el lang. Por defecto sera el esp
  const { initialMessages, i18n } = translate[browserLanguage] || translate['es']
  
  const chatOptions = {
    webhookUrl: props.url,
    chatSessionKey: 'sessionId',
    allowFileUploads: true,
    initialMessages,
    // defaultLanguage: 'es',
    i18n: {
      en: {
        title: 'Hi there! 👋',
        subtitle: "Start a chat. We're here to help you 24/7.",
        footer: '',
        getStarted: 'New Conversation',
        inputPlaceholder: 'Type your question..',
      },
    }
  }
  // asigna el lang por defecto para el widget del chat
  chatOptions.defaultLanguage = browserLanguage
  // asigna el objeto de la traduccion de un idioma concreto
  chatOptions.i18n[browserLanguage] = i18n.default;
  // crea el widget del chat
  const chat = createChat(chatOptions)
  
  // Cada 500ms verificamos si ya cargó el DOM
  const interval = setInterval(() => {
    const controls = document.querySelector('.chat-inputs-controls')
    const stopSVG = `<img src="/record.svg" alt="Stop" width="20" height="20" />`
    const myMicSVG = `<img src="/microphone.svg" alt="Record" width="20" height="20" />`
    if (controls) {
      clearInterval(interval)
      const resizeContainer = document.createElement('div');
      
      resizeContainer.classList.add('chat-resize-bar');
      
      const chatWindow = document.querySelector('.chat-window');
      // const chatHeader = document.querySelector('.chat-header');
      const chatLayout = document.querySelector('.chat-layout.chat-wrapper');
      
      // Elemento para redimensionar
      const resizeHandler = document.createElement('div');
      resizeHandler.classList.add('chat-resize-manual');
      resizeHandler.innerHTML = '&nwarr;&searr;';

      const resizeDefaultBtns = document.createElement('div');
      resizeDefaultBtns.classList.add('chat-resize-defaults-btns')
      const resizeMax = document.createElement('div');
      
      let isMaximized = false;
      resizeMax.addEventListener('click', function(e) {
        if (!isMaximized) {
          chatWindow.style.width = '100%';
          chatWindow.style.height = '80vh';  
          isMaximized = true;
          this.innerHTML = '&#128471;'
        } else {
          this.innerHTML = '&#128470;'
          chatWindow.style.width = '';
          chatWindow.style.height = ''; 
          isMaximized = false;
        }
        
      });
      resizeMax.innerHTML = '&#128470;';
      resizeDefaultBtns.appendChild(resizeMax)
      resizeContainer.appendChild(resizeHandler);
      resizeContainer.appendChild(resizeDefaultBtns)
      
      
      let isResizing = false;
      resizeHandler.addEventListener('mousedown', (e) => {
      isResizing = true;
      document.body.style.cursor = 'nwse-resize';
      e.preventDefault();

      // Guardar las dimensiones iniciales del chat y la posición del mouse
      const initialWidth = chatWindow.offsetWidth;
      const initialHeight = chatWindow.offsetHeight;
      const initialMouseX = e.clientX;
      const initialMouseY = e.clientY;

      document.addEventListener('mousemove', (e) => {
        if (isResizing) {
          // Calcular el cambio en las coordenadas del mouse
          const deltaX =  e.clientX - initialMouseX; // Invertir el cálculo para la esquina inferior derecha
          const deltaY =  e.clientY -  initialMouseY; // Invertir el cálculo para la esquina inferior derecha

          // Ajustar el ancho y alto del chat
          const newWidth = Math.max(initialWidth - deltaX, 200); // Mínimo ancho: 200px
          const newHeight = Math.max(initialHeight - deltaY, 200); // Mínimo alto: 200px

          chatWindow.style.width = `${newWidth}px`;
          chatWindow.style.height = `${newHeight}px`;
        }
      });
      
      document.addEventListener(
        'mouseup',
        () => {
          if (isResizing) {
            isResizing = false;
            document.body.style.cursor = 'default';
          }
        },
        { once: true } // Remover el evento después de soltar el mouse
      );
    });
      chatLayout.insertBefore(resizeContainer, chatLayout.firstChild);
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
<style lang="css">
.chat-layout.chat-wrapper > .chat-resize-bar {
  width: 100%;
  /* height: 10px; */
  background-color: #0a0c1d;
  display: flex;
  justify-content: space-between;
  color:white;
  padding: 0 3px;
  box-sizing: border-box;
}
.chat-resize-wrapper {
  display: flex;
  justify-content: space-between;
}
.chat-resize-bar > .chat-resize-manual {
  width: fit-content;
  height: 100%;
  cursor: nwse-resize;
  font-weight: 800;
  display: flex;
  align-items: center;
  width: 10px;
}

.chat-resize-defaults-btns {
  display: flex;
  align-items: center;
  gap: 10px; 
  cursor: pointer;
  justify-content: flex-end;
}
.chat-resize-defaults-btns > div {
  min-width: 30px; /* Ancho mínimo para los botones */
  text-align: center; /* Centra el contenido del botón */
}
</style>