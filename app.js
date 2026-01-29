// API Base URL - CONFIGURADO PARA SEU BACKEND
const API_BASE_URL = 'https://extratos-backend-222535452929.southamerica-east1.run.app';

let currentResultId = null;
let isProcessing = false; // ← NOVO: Previne múltiplos envios

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-processar').addEventListener('click', processarExtratos);
    document.getElementById('btn-enviar-chat').addEventListener('click', enviarPerguntaChat);
    document.getElementById('btn-download').addEventListener('click', baixarExcel);
    
    // Enter para enviar no chat
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !isProcessing) {
            enviarPerguntaChat();
        }
    });
    
    // Atualizar display dos arquivos
    document.getElementById('arquivo-a').addEventListener('change', function(e) {
        const fileName = e.target.files[0]?.name || 'Selecione o arquivo Excel';
        this.parentElement.querySelector('.file-text').textContent = fileName;
    });
    
    document.getElementById('arquivo-b').addEventListener('change', function(e) {
        const fileName = e.target.files[0]?.name || 'Selecione o arquivo Excel';
        this.parentElement.querySelector('.file-text').textContent = fileName;
    });
});

async function processarExtratos() {
    // Prevenir múltiplos cliques
    if (isProcessing) return;
    
    const arquivoA = document.getElementById('arquivo-a').files[0];
    const arquivoB = document.getElementById('arquivo-b').files[0];
    const labelA = document.getElementById('label-a').value.trim();
    const labelB = document.getElementById('label-b').value.trim();
    const hipoteses = document.getElementById('hipoteses').value.trim();
    
    if (!arquivoA || !arquivoB) {
        alert('Por favor, selecione ambos os arquivos Excel.');
        return;
    }
    
    if (!labelA || !labelB) {
        alert('Por favor, informe os labels YYYYMM para ambos os extratos.');
        return;
    }
    
    if (!/^\d{6}$/.test(labelA) || !/^\d{6}$/.test(labelB)) {
        alert('Labels devem estar no formato YYYYMM (ex: 202601).');
        return;
    }
    
    const formData = new FormData();
    formData.append('arquivo_a', arquivoA);
    formData.append('arquivo_b', arquivoB);
    formData.append('label_a', labelA);
    formData.append('label_b', labelB);
    if (hipoteses) formData.append('hipoteses', hipoteses);
    
    // Bloquear UI
    isProcessing = true;
    document.getElementById('loading').style.display = 'flex';
    document.getElementById('btn-processar').disabled = true;
    document.getElementById('btn-processar').textContent = 'Processando...';
    
    // Scroll suave para o loading
    document.getElementById('loading').scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    try {
        const response = await fetch(`${API_BASE_URL}/v1/process`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Erro ao processar');
        }
        
        const result = await response.json();
        currentResultId = result.result_id;
        
        await carregarRelatorio();
        
    } catch (error) {
        alert('Erro: ' + error.message);
        console.error('Erro completo:', error);
    } finally {
        isProcessing = false;
        document.getElementById('loading').style.display = 'none';
        document.getElementById('btn-processar').disabled = false;
        document.getElementById('btn-processar').textContent = '🚀 Processar Extratos';
    }
}

async function carregarRelatorio() {
    const response = await fetch(`${API_BASE_URL}/v1/report/${currentResultId}`);
    const data = await response.json();
    
    // Renderizar relatório com markdown
    const relatorioHtml = renderMarkdown(data.relatorio);
    document.getElementById('relatorio-content').innerHTML = relatorioHtml;
    document.getElementById('report-section').style.display = 'block';
    
    // Exibir perguntas sugeridas
    const perguntasDiv = document.getElementById('perguntas-sugeridas');
    perguntasDiv.innerHTML = '';
    
    if (data.perguntas_sugeridas && data.perguntas_sugeridas.length > 0) {
        data.perguntas_sugeridas.forEach(pergunta => {
            const chip = document.createElement('div');
            chip.className = 'pergunta-chip';
            chip.textContent = pergunta;
            chip.onclick = () => {
                document.getElementById('chat-input').value = pergunta;
                document.getElementById('chat-input').focus();
                document.getElementById('chat-section').scrollIntoView({ behavior: 'smooth' });
            };
            perguntasDiv.appendChild(chip);
        });
        document.getElementById('questions-section').style.display = 'block';
    }
    
    // Exibir seções
    document.getElementById('chat-section').style.display = 'block';
    document.getElementById('download-section').style.display = 'block';
    
    // Scroll suave para o relatório
    document.getElementById('report-section').scrollIntoView({ behavior: 'smooth' });
}

async function enviarPerguntaChat() {
    // Prevenir envios duplicados
    if (isProcessing) return;
    
    const input = document.getElementById('chat-input');
    const pergunta = input.value.trim();
    
    if (!pergunta) return;
    
    const messagesDiv = document.getElementById('chat-messages');
    
    // Mensagem do usuário
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-message chat-user';
    userMsg.textContent = pergunta;
    messagesDiv.appendChild(userMsg);
    
    // Limpar input e desabilitar
    input.value = '';
    input.disabled = true;
    document.getElementById('btn-enviar-chat').disabled = true;
    
    // Indicador de "digitando..."
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'chat-message chat-bot typing-indicator';
    typingIndicator.innerHTML = '<span class="typing-dots"><span>•</span><span>•</span><span>•</span></span>';
    messagesDiv.appendChild(typingIndicator);
    
    // Scroll para o final
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    // Bloquear novos envios
    isProcessing = true;
    
    try {
        const formData = new FormData();
        formData.append('result_id', currentResultId);
        formData.append('pergunta', pergunta);
        
        const response = await fetch(`${API_BASE_URL}/v1/chat`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Erro ao enviar pergunta');
        }
        
        const data = await response.json();
        
        // Remover indicador de digitando
        typingIndicator.remove();
        
        // Mensagem do bot com markdown renderizado
        const botMsg = document.createElement('div');
        botMsg.className = 'chat-message chat-bot';
        botMsg.innerHTML = renderMarkdown(data.resposta);
        messagesDiv.appendChild(botMsg);
        
        // Scroll para o final
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
    } catch (error) {
        // Remover indicador de digitando
        typingIndicator.remove();
        
        // Mostrar erro
        const errorMsg = document.createElement('div');
        errorMsg.className = 'chat-message chat-error';
        errorMsg.textContent = '❌ Erro ao enviar pergunta: ' + error.message;
        messagesDiv.appendChild(errorMsg);
        
        console.error('Erro completo:', error);
    } finally {
        // Reabilitar input
        isProcessing = false;
        input.disabled = false;
        document.getElementById('btn-enviar-chat').disabled = false;
        input.focus();
    }
}

async function baixarExcel() {
    window.open(`${API_BASE_URL}/v1/download/${currentResultId}`, '_blank');
}

// ============================================
// RENDERIZADOR DE MARKDOWN SIMPLES
// ============================================
function renderMarkdown(text) {
    if (!text) return '';
    
    let html = text;
    
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Negrito
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Itálico
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Bullets
    html = html.replace(/^• (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // Quebras de linha
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    
    // Links (se houver)
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    return html;
}
