// API Base URL - CONFIGURADO PARA SEU BACKEND
const API_BASE_URL = 'https://extratos-backend-222535452929.southamerica-east1.run.app';

let currentResultId = null;

document.getElementById('btn-processar').addEventListener('click', processarExtratos);
document.getElementById('btn-enviar-chat').addEventListener('click', enviarPerguntaChat);
document.getElementById('btn-download').addEventListener('click', baixarExcel);

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
    
    document.getElementById('loading').style.display = 'block';
    document.getElementById('btn-processar').disabled = true;
    
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
    } finally {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('btn-processar').disabled = false;
    }
}

async function carregarRelatorio() {
    const response = await fetch(`${API_BASE_URL}/v1/report/${currentResultId}`);
    const data = await response.json();
    
    document.getElementById('relatorio-content').textContent = data.relatorio;
    
    const perguntasDiv = document.getElementById('perguntas-sugeridas');
    perguntasDiv.innerHTML = '';
    data.perguntas_sugeridas.forEach(pergunta => {
        const chip = document.createElement('div');
        chip.className = 'pergunta-chip';
        chip.textContent = pergunta;
        chip.onclick = () => {
            document.getElementById('chat-input').value = pergunta;
            enviarPerguntaChat();
        };
        perguntasDiv.appendChild(chip);
    });
    
    document.getElementById('report-section').style.display = 'block';
    document.getElementById('chat-section').style.display = 'block';
    document.getElementById('download-section').style.display = 'block';
}

async function enviarPerguntaChat() {
    const input = document.getElementById('chat-input');
    const pergunta = input.value.trim();
    
    if (!pergunta) return;
    
    const messagesDiv = document.getElementById('chat-messages');
    
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-message chat-user';
    userMsg.textContent = pergunta;
    messagesDiv.appendChild(userMsg);
    
    input.value = '';
    
    const formData = new FormData();
    formData.append('result_id', currentResultId);
    formData.append('pergunta', pergunta);
    
    const response = await fetch(`${API_BASE_URL}/v1/chat`, {
        method: 'POST',
        body: formData
    });
    
    const data = await response.json();
    
    const botMsg = document.createElement('div');
    botMsg.className = 'chat-message chat-bot';
    botMsg.textContent = data.resposta;
    messagesDiv.appendChild(botMsg);
    
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function baixarExcel() {
    window.open(`${API_BASE_URL}/v1/download/${currentResultId}`, '_blank');
}
