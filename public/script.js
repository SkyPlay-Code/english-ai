// --- "COSMIC SCHOLAR" FRONTEND SCRIPT (v6 - FINAL) ---
// This file is complete. You can replace your existing script with it.

// --- 1. DOM ELEMENT REFERENCES ---
const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const downloadBtn = document.getElementById('download-btn');
const pdfUploadInput = document.getElementById('pdf-upload');

// --- 2. STATE VARIABLES ---
let uploadedFile = null;
let thinkingIndicatorElement = null;
let promptHistory = []; 
let historyIndex = 0;   
let conversationHistory = [];

// --- 3. BACKEND URLS ---
const TEXT_API_URL = '/api/generate-text';
const PDF_API_URL = '/api/analyze-pdf';

// --- 4. UI/HELPER FUNCTIONS ---

/**
 * Creates and displays the NEW "thinking" animation.
 */
const showThinkingIndicator = () => {
    if (thinkingIndicatorElement) return;

    // The thinking indicator is still an AI message bubble
    thinkingIndicatorElement = document.createElement('div');
    thinkingIndicatorElement.className = 'message ai-message';
    
    // Inject the new HTML structure for the loader
    thinkingIndicatorElement.innerHTML = `
        <div class="message-content">
            <div class="loader">
              <div class="circle">
                <div class="dot"></div>
                <div class="outline"></div>
              </div>
              <div class="circle">
                <div class="dot"></div>
                <div class="outline"></div>
              </div>
              <div class="circle">
                <div class="dot"></div>
                <div class="outline"></div>
              </div>
              <div class="circle">
                <div class="dot"></div>
                <div class="outline"></div>
              </div>
            </div>
        </div>
    `;
    
    chatContainer.appendChild(thinkingIndicatorElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
};

// The rest of the file is unchanged.
const hideThinkingIndicator = () => { if (thinkingIndicatorElement) { thinkingIndicatorElement.remove(); thinkingIndicatorElement = null; } };
const addMessageToChat = (message, sender) => { const messageWrapper = document.createElement('div'); messageWrapper.className = `message ${sender}-message`; const messageContent = document.createElement('div'); messageContent.className = 'message-content'; if (sender === 'ai') { messageContent.innerHTML = `<div class="prose">${marked.parse(message)}</div>`; } else { messageContent.appendChild(document.createTextNode(message)); } messageWrapper.appendChild(messageContent); chatContainer.appendChild(messageWrapper); chatContainer.scrollTop = chatContainer.scrollHeight; };
const handleSendMessage = async () => { const userMessage = userInput.value.trim(); if (!userMessage && !uploadedFile) return; if (userMessage) { addMessageToChat(userMessage, 'user'); promptHistory.push(userMessage); historyIndex = promptHistory.length; } userInput.value = ''; userInput.style.height = 'auto'; showThinkingIndicator(); try { let response; if (uploadedFile) { conversationHistory = []; const promptText = userMessage || "Analyze this document thoroughly."; const formData = new FormData(); formData.append('prompt', promptText); formData.append('pdfFile', uploadedFile); response = await fetch(PDF_API_URL, { method: 'POST', body: formData }); } else { const userMessageForHistory = { role: "user", parts: [{ text: userMessage }] }; const historyToSend = [...conversationHistory]; conversationHistory.push(userMessageForHistory); response = await fetch(TEXT_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: userMessage, history: historyToSend }), }); } hideThinkingIndicator(); if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || 'The request to the server failed.'); } const data = await response.json(); addMessageToChat(data.message, 'ai'); if (!uploadedFile) { conversationHistory.push({ role: "model", parts: [{ text: data.message }] }); } } catch (error) { hideThinkingIndicator(); console.error("Error during API call:", error); addMessageToChat(`My apologies, a cosmic rift occurred: ${error.message}. Please check your local server and try again.`, 'ai'); } finally { uploadedFile = null; pdfUploadInput.value = ''; } };
const handleDownload = () => { const chatToPrint = document.getElementById('chat-container'); const headerElement = document.querySelector('header'); const pdfContainer = document.createElement('div'); pdfContainer.style.background = '#FFFFFF'; pdfContainer.style.color = '#000000'; pdfContainer.style.padding = '20px'; const headerClone = headerElement.cloneNode(true); headerClone.style.color = '#000000'; headerClone.querySelector('p').style.color = '#333333'; pdfContainer.appendChild(headerClone); pdfContainer.appendChild(chatToPrint.cloneNode(true)); document.body.appendChild(pdfContainer); const opt = { margin: 0.5, filename: 'cosmic-scholar-chat.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, letterRendering: true, backgroundColor: null }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } }; html2pdf().from(pdfContainer).set(opt).save().then(() => { document.body.removeChild(pdfContainer); }); };
sendBtn.addEventListener('click', handleSendMessage);
downloadBtn.addEventListener('click', handleDownload);
pdfUploadInput.addEventListener('change', (event) => { uploadedFile = event.target.files[0]; if (uploadedFile) { addMessageToChat(`Document selected: **${uploadedFile.name}**. The AI's memory has been cleared for this new task.`, 'ai'); userInput.focus(); } });
userInput.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSendMessage(); return; } if (promptHistory.length > 0) { if (event.key === 'ArrowUp') { event.preventDefault(); if (historyIndex > 0) { historyIndex--; userInput.value = promptHistory[historyIndex]; userInput.selectionStart = userInput.selectionEnd = userInput.value.length; } } else if (event.key === 'ArrowDown') { event.preventDefault(); if (historyIndex < promptHistory.length - 1) { historyIndex++; userInput.value = promptHistory[historyIndex]; userInput.selectionStart = userInput.selectionEnd = userInput.value.length; } else if (historyIndex === promptHistory.length - 1) { historyIndex++; userInput.value = ''; } } } });
userInput.addEventListener('input', () => { userInput.style.height = 'auto'; userInput.style.height = (userInput.scrollHeight) + 'px'; });
window.addEventListener('load', () => { userInput.focus(); });