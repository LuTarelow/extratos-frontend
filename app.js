// API Base URL - CONFIGURADO PARA SEU BACKEND
const API_BASE_URL = 'https://extratos-backend-222535452929.southamerica-east1.run.app';

let currentResultId = null;
let isProcessing = false;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Testar conexão ao carregar
    testarConexao();
    
    document.getElementById('btn-processar').addEventListener('click', processarExtratos);
    document.getElementById('btn-enviar-chat').addEventListener('click', enviarPerguntaChat);
    document.getElementById('btn-download').addEventListener('click', baixarExcel);
    
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !isProcessing) {
            enviarPerguntaChat();
        }
    });
    
    document.getElementById('arquivo-a').addEventListener('change', function(e) {
        const fileName = e.target.files[0]?.name || 'Selecione o arquivo Excel';
        this.parentElement.querySelector('.file-text').textContent = fileName;
    });
    
    document.getElementById('arquivo-b').addEventListener('change', function(e) {
        const fileName = e.target.files[0]?.name || 'Selecione o arquivo Excel';
        this.parentElement.querySelector('.file-text').textContent = fileName;
    });
});

// NOVO: Testar conexão com backend
async function testarConexao() {
    try {
        console.log('🔍 Testando conexão com backend...');
        const response = await fetch(`${API_BASE_URL}/`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Backend conectado:', data);
        } else {
            console.error('❌ Backend retornou erro:', response.status);
            mostrarErroConexao('Backend retornou erro ' + response.status);
        }
    } catch (error) {
        console.error('❌ Erro ao conectar com backend:', error);
        mostrarErroConexao(error.message);
    }
}

function mostrarErroConexao(mensagem) {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: #DC3545;
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1000;
        max-width: 600px;
    `;
    alertDiv.innerHTML = `
        <strong>⚠️ Problema de Conexão</strong><br>
        ${mensagem}<br>
        <small>Verifique sua conexão com a internet ou tente novamente mais tarde.</small>
    `;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => alertDiv.remove(), 5000);
}

async function processarExtratos() {
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
    
    isProcessing = true;
    document.getElementById('loading').style.display = 'flex';
    document.getElementById('btn-processar').disabled = true;
    document.getElementById('btn-processar').textContent = 'Processando...';
    
    document.getElementById('loading').scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    try {
        console.log('📤 Enviando requisição para:', `${API_BASE_URL}/v1/process`);
        
        const response = await fetch(`${API_BASE_URL}/v1/process`, {
            method: 'POST',
            body: formData
        });
        
        console.log('📥 Resposta recebida:', response.status);
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: `Erro ${response.status}` }));
            throw new Error(error.detail || `Erro ${response.status}`);
        }
        
        const result = await response.json();
        currentResultId = result.result_id;
        
        console.log('✅ Processamento concluído:', result);
        
        await carregarRelatorio();
        
    } catch (error) {
        console.error('❌ Erro completo:', error);
        
        let mensagemErro = 'Erro ao processar extratos: ' + error.message;
        
        // Diagnóstico específico
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            mensagemErro = `
❌ Erro de Conexão com o Backend

Possíveis causas:
1. Você está sem internet
2. O backend está fora do ar
3. Firewall/Proxy bloqueando a requisição
4. CORS não configurado corretamente

🔧 Soluções:
• Verifique sua conexão com internet
• Aguarde alguns minutos e tente novamente
• Abra o Console (F12) para ver detalhes
• Entre em contato com o administrador do sistema

Detalhes técnicos: ${error.message}
            `;
        }
        
        alert(mensagemErro);
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
    
    const relatorioHtml = renderMarkdown(data.relatorio);
    document.getElementById('relatorio-content').innerHTML = relatorioHtml;
    document.getElementById('report-section').style.display = 'block';
    
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
    
    document.getElementById('chat-section').style.display = 'block';
    document.getElementById('download-section').style.display = 'block';
    
    document.getElementById('report-section').scrollIntoView({ behavior: 'smooth' });
}

async function enviarPerguntaChat() {
    if (isProcessing) return;
    
    const input = document.getElementById('chat-input');
    const pergunta = input.value.trim();
    
    if (!pergunta) return;
    
    const messagesDiv = document.getElementById('chat-messages');
    
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-message chat-user';
    userMsg.textContent = pergunta;
    messagesDiv.appendChild(userMsg);
    
    input.value = '';
    input.disabled = true;
    document.getElementById('btn-enviar-chat').disabled = true;
    
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'chat-message chat-bot typing-indicator';
    typingIndicator.innerHTML = '<span class="typing-dots"><span>•</span><span>•</span><span>•</span></span>';
    messagesDiv.appendChild(typingIndicator);
    
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
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
            throw new Error(`Erro ${response.status}`);
        }
        
        const data = await response.json();
        
        typingIndicator.remove();
        
        const botMsg = document.createElement('div');
        botMsg.className = 'chat-message chat-bot';
        botMsg.innerHTML = renderMarkdown(data.resposta);
        messagesDiv.appendChild(botMsg);
        
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
    } catch (error) {
        typingIndicator.remove();
        
        const errorMsg = document.createElement('div');
        errorMsg.className = 'chat-message chat-error';
        errorMsg.textContent = '❌ Erro ao enviar pergunta: ' + error.message;
        messagesDiv.appendChild(errorMsg);
        
        console.error('Erro completo:', error);
    } finally {
        isProcessing = false;
        input.disabled = false;
        document.getElementById('btn-enviar-chat').disabled = false;
        input.focus();
    }
}

async function baixarExcel() {
    window.open(`${API_BASE_URL}/v1/download/${currentResultId}`, '_blank');
}

function renderMarkdown(text) {
    if (!text) return '';
    
    let html = text;
    
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    html = html.replace(/^• (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    return html;
}
