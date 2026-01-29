// API Base URL - CONFIGURADO PARA SEU BACKEND
const API_BASE_URL = 'https://extratos-backend-222535452929.southamerica-east1.run.app';

let currentResultId = null;

// Event Listeners
document.getElementById('btn-processar').addEventListener('click', processarExtratos);
document.getElementById('btn-enviar-chat').addEventListener('click', enviarPerguntaChat);
document.getElementById('btn-download').addEventListener('click', baixarExcel);
document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') enviarPerguntaChat();
});

// Atualizar display dos inputs de arquivo
document.getElementById('arquivo-a').addEventListener('change', function(e) {
    const fileName = e.target.files[0]?.name || 'Selecione o arquivo Excel';
    this.parentElement.querySelector('.file-text').textContent = fileName;
});

document.getElementById('arquivo-b').addEventListener('change', function(e) {
    const fileName = e.target.files[0]?.name || 'Selecione o arquivo Excel';
    this.parentElement.querySelector('.file-text').textContent = fileName;
});

async function processarExtratos() {
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
    
    document.getElementById('loading').style.display = 'flex';
    document.getElementById('btn-processar').disabled = true;
    
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
        document.getElementById('loading').style.display = 'none';
        document.getElementById('btn-processar').disabled = false;
    }
}

async function carregarRelatorio() {
    const response = await fetch(`${API_BASE_URL}/v1/report/${currentResultId}`);
    const data = await response.json();
    
    // Exibir relatório
    document.getElementById('relatorio-content').textContent = data.relatorio;
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
                // Scroll para o chat
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
    const input = document.getElementById('chat-input');
    const pergunta = input.value.trim();
    
    if (!pergunta) return;
    
    const messagesDiv = document.getElementById('chat-messages');
    
    // Mensagem do usuário
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-message chat-user';
    userMsg.textContent = pergunta;
    messagesDiv.appendChild(userMsg);
    
    input.value = '';
    
    // Scroll para o final
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
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
        
        // Mensagem do bot
        const botMsg = document.createElement('div');
        botMsg.className = 'chat-message chat-bot';
        botMsg.textContent = data.resposta;
        messagesDiv.appendChild(botMsg);
        
        // Scroll para o final
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
    } catch (error) {
        alert('Erro ao enviar pergunta: ' + error.message);
        console.error('Erro completo:', error);
    }
}

async function baixarExcel() {
    window.open(`${API_BASE_URL}/v1/download/${currentResultId}`, '_blank');
}