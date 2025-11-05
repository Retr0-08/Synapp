// ====================
// 🤖 SYNA IA Inteligente com Aprendizado + Datas, Horas, Cálculos
// ====================

let db;
let aguardandoEnsino = null;

// Base de conhecimento inicial
const conhecimentoBase = {
  "qual é a capital do brasil": "A capital do Brasil é Brasília 🇧🇷.",
  "quem descobriu o brasil": "Pedro Álvares Cabral descobriu o Brasil em 1500.",
  "quantos planetas existem": "O Sistema Solar possui 8 planetas 🌍.",
  "quem inventou a lâmpada": "Thomas Edison é reconhecido como o inventor da lâmpada elétrica.",
  "quem é você": "Sou a Syna 🤖, sua assistente virtual pessoal.",
  "qual é o seu nome": "Eu me chamo Syna 🤖.",
  "como você está": "Estou operando normalmente 😄",
  "o que é javascript": "JavaScript é a linguagem que dá vida às páginas web.",
  "quantos estados tem o brasil": "O Brasil tem 26 estados e um Distrito Federal 🇧🇷.",
  "quem é o presidente do brasil": "O presidente atual do Brasil é Luiz Inácio Lula da Silva (desde 2023).",
  "o que é html": "HTML é a linguagem usada para estruturar o conteúdo de sites.",
  "o que é css": "CSS define o estilo e o layout de páginas web.",
  "o que é arduino": "Arduino é uma plataforma usada para criar projetos eletrônicos interativos.",
  "quem criou você": "Fui criada como um experimento de chatbot para evoluir para uma IA avançada 💻.",
  "quem é elon musk": "Elon Musk é o fundador da Tesla e SpaceX, entre outras empresas.",
  "o que é inteligência artificial": "IA é a capacidade de máquinas aprenderem e tomarem decisões.",
  "o que é github": "GitHub é uma plataforma para hospedar e colaborar em códigos.",
  "o que é python": "Python é uma linguagem de programação simples e poderosa 🐍.",
  "o que é php": "PHP é uma linguagem usada para criar sites dinâmicos e conectar com bancos de dados.",
  "o que é react": "React é uma biblioteca JavaScript para criar interfaces de usuário.",
  "o que é api": "API é uma forma de diferentes sistemas se comunicarem.",
  "quem inventou o computador": "Charles Babbage é considerado o pai do computador.",
  "quem inventou o telefone": "Alexander Graham Bell inventou o telefone em 1876.",
  "o que é o chatgpt": "ChatGPT é uma IA criada pela OpenAI capaz de conversar e gerar textos.",
  "o que é vr": "VR significa Realidade Virtual, tecnologia que simula ambientes digitais imersivos.",
  "o que é o metaverso": "Metaverso é um universo digital interativo, onde pessoas interagem em 3D."
};

// Frases padrão quando não souber responder
const respostasGerais = [
  "Ainda não sei responder com precisão. Você pode me ensinar a resposta?",
  "Não tenho essa informação no momento. Quer me ensinar para eu aprender?",
  "Posso aprender sobre isso se você me ensinar agora."
];

// ====================
// UTIL: normaliza texto
// ====================
function normalize(text = "") {
  return text.toString().toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Stopwords para filtrar palavras irrelevantes
const STOPWORDS = new Set([
  "o","a","os","as","um","uma","uns","umas",
  "de","do","da","dos","das","em","no","na","nos","nas",
  "por","com","para","pra","e","ou","que","quem","qual","quais",
  "como","quando","onde","se","esta","esta","está","é","ao","aos",
  "me","te","lhe","você","voce","seu","sua","seus","suas","esse","essa",
  "isso","isto","mas","tambem","também","já","ja","mais","menos","pq","por que"
]);

function tokenizeImportant(text) {
  const norm = normalize(text);
  return norm.split(/\s+/).filter(w => w.length >= 3 && !STOPWORDS.has(w));
}

// ====================
// INDEXEDDB
// ====================
const request = indexedDB.open("SynaDB", 2);

request.onupgradeneeded = function (e) {
  db = e.target.result;
  if (!db.objectStoreNames.contains("conhecimento")) {
    db.createObjectStore("conhecimento", { keyPath: "pergunta" });
  }
  const store = e.target.transaction.objectStore("conhecimento");
  for (const p in conhecimentoBase) {
    store.put({ pergunta: p, resposta: conhecimentoBase[p] });
  }
};

request.onsuccess = function (e) {
  db = e.target.result;
  console.log("IndexedDB aberta com sucesso.");
};

request.onerror = function () {
  console.error("Erro ao abrir IndexedDB.");
};

// ====================
// BUSCAR RESPOSTA
// ====================
function buscarResposta(pergunta, callback) {
  const pNorm = normalize(pergunta);
  for (const chave in conhecimentoBase) {
    if (normalize(chave) === pNorm) {
      callback(conhecimentoBase[chave]);
      return;
    }
  }
  const queryTokens = tokenizeImportant(pergunta);
  if (queryTokens.length > 0) {
    for (const chave in conhecimentoBase) {
      const keyTokens = tokenizeImportant(chave);
      if (keyTokens.length === 0) continue;
      const matches = keyTokens.filter(kw => queryTokens.includes(kw)).length;
      const ratio = matches / keyTokens.length;
      if (ratio >= 0.6 || matches >= 2) {
        callback(conhecimentoBase[chave]);
        return;
      }
    }
  }

  if (!db) {
    callback(null);
    return;
  }

  const tx = db.transaction(["conhecimento"], "readonly");
  const store = tx.objectStore("conhecimento");
  const req = store.getAll();

  req.onsuccess = () => {
    const items = req.result || [];

    for (const it of items) {
      if (normalize(it.pergunta) === pNorm) {
        callback(it.resposta);
        return;
      }
    }

    const qTokens = tokenizeImportant(pergunta);
    if (qTokens.length > 0) {
      for (const it of items) {
        const keyTokens = tokenizeImportant(it.pergunta);
        if (keyTokens.length === 0) continue;
        let matches = 0;
        for (const kw of keyTokens) if (qTokens.includes(kw)) matches++;
        const ratio = matches / keyTokens.length;
        if (ratio >= 0.6 || matches >= 2) {
          callback(it.resposta);
          return;
        }
      }
    }

    for (const it of items) {
      const keyNorm = normalize(it.pergunta);
      if (pNorm.includes(keyNorm) || keyNorm.includes(pNorm)) {
        callback(it.resposta);
        return;
      }
    }

    callback(null);
  };

  req.onerror = () => callback(null);
}

// ====================
// SALVAR CONHECIMENTO
// ====================
function salvarConhecimento(pergunta, resposta) {
  if (!db) return;
  const key = normalize(pergunta);
  const tx = db.transaction(["conhecimento"], "readwrite");
  const store = tx.objectStore("conhecimento");
  store.put({ pergunta: key, resposta });
  tx.oncomplete = () => console.log("Conhecimento salvo:", key);
  tx.onerror = (e) => console.error("Erro ao salvar conhecimento:", e);
}

// ====================
// INTENÇÕES LOCAIS
// ====================
function gerarRespostaLocal(pergunta) {
  const p = normalize(pergunta);

  // Saudações
  const sauda = ["oi","ola","eae","opa","salve","bom dia","boa tarde","boa noite"];
  if (sauda.some(s => p.includes(normalize(s)))) {
    const respostas = [
      "Olá! Tudo bem? 😊 Como posso ajudar hoje?",
      "Oi! Seja bem-vindo(a). Em que posso ajudar?",
      "Olá! Pronto para conversar."
    ];
    return respostas[Math.floor(Math.random() * respostas.length)];
  }

  // Despedidas
  const despedidas = ["tchau","ate mais","falou","ate logo","ate"];
  if (despedidas.some(s => p.includes(normalize(s)))) {
    const respostas = [
      "Até logo! 👋",
      "Tchau! Volte sempre.",
      "Até mais — foi bom conversar."
    ];
    return respostas[Math.floor(Math.random() * respostas.length)];
  }

  // Identidade
  if (p.includes("quem e voce") || p.includes("quem é voce") || p.includes("quem é você") || p.includes("seu nome") || p.includes("qual seu nome")) {
    return "Eu me chamo Syna 🤖, sua assistente virtual pessoal.";
  }

  // Criador
  if (p.includes("quem criou") || p.includes("quem te criou") || p.includes("quem fez voce")) {
    return "Fui criada como um experimento de chatbot para evoluir para uma IA avançada 💻.";
  }

  // Função
  if (p.includes("como voce esta") || p.includes("tudo bem") || p.includes("como você está")) {
    return "Estou operando normalmente 😄";
  }
  if (p.includes("o que voce faz") || p.includes("qual sua funcao") || p.includes("qual sua função")) {
    return "Respondo perguntas, aprendo com quem me ensina e ajudo com informações gerais.";
  }

  return null;
}

// ====================
// FUNÇÃO: TRATAR DATA, HORA E DIA DA SEMANA
// ====================
function tratarData(message) {
  const hoje = new Date();
  const diasSemana = ["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
  const p = normalize(message);

  // Hoje
  if ((p.includes("que dia") && p.includes("hoje")) || (p.includes("data") && p.includes("hoje")) || (p.includes("dia da semana") && p.includes("hoje"))) {
    const dia = hoje.getDate();
    const mes = hoje.getMonth()+1;
    const ano = hoje.getFullYear();
    const diaSemana = diasSemana[hoje.getDay()];
    return `Hoje é dia ${dia}/${mes}/${ano}, e é ${diaSemana}.`;
  }

  // Hora
  if (p.includes("que horas") || p.includes("hora")) {
    const h = hoje.getHours().toString().padStart(2,"0");
    const m = hoje.getMinutes().toString().padStart(2,"0");
    const s = hoje.getSeconds().toString().padStart(2,"0");
    return `Agora são ${h}:${m}:${s}.`;
  }

  // Dia da semana de uma data futura
  const matchData = p.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if(matchData){
    const d = parseInt(matchData[1]);
    const m = parseInt(matchData[2])-1;
    const y = parseInt(matchData[3]);
    const dt = new Date(y,m,d);
    const diaSemana = diasSemana[dt.getDay()];
    return `O dia ${d}/${m+1}/${y} cairá em ${diaSemana}.`;
  }

  return null;
}

// ====================
// FUNÇÃO: CÁLCULO SIMPLES
// ====================
function calcularExpressao(message){
  try{
    const expr = message.replace(/[^0-9+\-*/().]/g,"");
    if(expr){
      const resultado = Function(`return ${expr}`)();
      if(resultado !== undefined && !isNaN(resultado)){
        return `O resultado de ${expr} é ${resultado}.`;
      }
    }
  }catch(e){}
  return null;
}

// ====================
// HISTÓRICO DE MENSAGENS
// ====================
function showHistory(message, reply){
  const history = document.getElementById("history");
  const userDiv = document.createElement("div");
  userDiv.className = "box-my-message";
  const pUser = document.createElement("p");
  pUser.className = "my-message";
  pUser.textContent = message;
  userDiv.appendChild(pUser);
  history.appendChild(userDiv);

  const botDiv = document.createElement("div");
  botDiv.className = "box-response-message";
  const pBot = document.createElement("p");
  pBot.className = "response-message";
  pBot.textContent = reply || "";
  botDiv.appendChild(pBot);
  history.appendChild(botDiv);

  history.scrollTop = history.scrollHeight;
}

// ====================
// ENVIO DE MENSAGEM
// ====================
function sendMessage(){
  const messageEl = document.getElementById("message-input");
  const status = document.getElementById("status");
  const messageRaw = messageEl.value || "";
  const message = messageRaw.trim();
  if(!message) return;

  messageEl.value="";
  status.style.display="block";
  status.innerText="Syna está digitando... 💭";

  setTimeout(()=>{
    status.style.display="none";
    
    if(aguardandoEnsino){
      salvarConhecimento(aguardandoEnsino,message);
      showHistory(`(Ensinando) ${aguardandoEnsino}`,"Entendido! Aprendi algo novo 😄");
      aguardandoEnsino = null;
      return;
    }

    const respostaData = tratarData(message);
    if(respostaData){ showHistory(message,respostaData); return; }

    const respostaCalc = calcularExpressao(message);
    if(respostaCalc){ showHistory(message,respostaCalc); return; }

    const respostaLocal = gerarRespostaLocal(message);
    if(respostaLocal){ showHistory(message,respostaLocal); return; }

    buscarResposta(message,(respostaDB)=>{
      if(respostaDB){ showHistory(message,respostaDB); }
      else{
        const pedidoEnsino = respostasGerais[0];
        showHistory(message,pedidoEnsino);
        aguardandoEnsino = normalize(message);
      }
    });

  },600);
}

// ====================
// LIMPAR CHAT AO INICIAR
// ====================
window.onload = ()=>{
  const history = document.getElementById("history");
  if(history) history.innerHTML="";
  const status = document.getElementById("status");
  if(status){
    status.innerText="Syna está online 💫";
    setTimeout(()=>status.innerText="",1600);
  }
};
