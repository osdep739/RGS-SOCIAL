// Configuración de Estado y Sonido
let currentPin = "";
let DEFAULT_PIN = "1234";
let enableSound = localStorage.getItem('rsg_sound') !== 'false';
let enableVibrate = localStorage.getItem('rsg_vibrate') !== 'false';

let transactions = JSON.parse(localStorage.getItem('rsg_demo_tx') || '[]');
let cards = JSON.parse(localStorage.getItem('rsg_demo_cards') || '[{"name":"BBVA Visa Signature","closeDay":25,"dueDay":5}]');
let tempExtractedRows = [];

// Audio Context para clicks de teclado
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function triggerFeedback() {
  if (enableVibrate && navigator.vibrate) {
    try { navigator.vibrate(30); } catch(e){}
  }
  if (enableSound) {
    try {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.04);
    } catch(e){}
  }
}

// Teclado PIN
function pressKey(num) {
  triggerFeedback();
  if (currentPin.length < 4) {
    currentPin += num;
    updateDots();
  }
  if (currentPin.length === 4) {
    setTimeout(checkPin, 150);
  }
}

function clearPin() {
  triggerFeedback();
  currentPin = "";
  updateDots();
}

function updateDots() {
  for (let i = 1; i <= 4; i++) {
    const dot = document.getElementById(`dot-${i}`);
    if (i <= currentPin.length) dot.classList.add('filled');
    else dot.classList.remove('filled');
  }
}

function checkPin() {
  const activePin = localStorage.getItem('rsg_pin') || DEFAULT_PIN;
  if (currentPin === activePin) {
    document.getElementById('lockScreen').style.display = 'none';
    document.getElementById('appMain').style.display = 'block';
    initApp();
  } else {
    alert(`PIN incorrecto. El PIN por defecto es ${activePin}`);
    clearPin();
  }
}

function lockApp() {
  triggerFeedback();
  clearPin();
  document.getElementById('appMain').style.display = 'none';
  document.getElementById('lockScreen').style.display = 'flex';
}

function authenticateBiometric() {
  triggerFeedback();
  if (window.PublicKeyCredential) {
    checkPin();
  }
}

// Navegación
function switchTab(tabId) {
  triggerFeedback();
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  event.currentTarget.classList.add('active');
}

// Inicializar App
function initApp() {
  renderTransactions();
  renderCards();
  checkCardAlerts();
  loadUserSettings();
}

// Guardar Movimiento Manual
document.getElementById('txForm')?.addEventListener('submit', function(e) {
  e.preventDefault();
  const tx = {
    id: 'RSG-' + Math.floor(Math.random() * 9000 + 1000),
    date: new Date().toISOString().slice(0, 10),
    amount: parseFloat(document.getElementById('txAmount').value),
    currency: document.getElementById('txCurrency').value,
    detail: document.getElementById('txDetail').value,
    category: document.getElementById('txCategory').value,
    method: document.getElementById('txMethod').value
  };
  transactions.unshift(tx);
  localStorage.setItem('rsg_demo_tx', JSON.stringify(transactions));
  document.getElementById('txForm').reset();
  renderTransactions();
  alert("Movimiento registrado con éxito.");
});

// Renderizar Histórico y Saldos
function renderTransactions() {
  let totARS = 0, totUSD = 0;
  const tbody = document.getElementById('historyRows');
  tbody.innerHTML = '';

  transactions.forEach(t => {
    if (t.currency === 'ARS') totARS += t.amount;
    else totUSD += t.amount;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${t.date}</td>
      <td>${t.detail}</td>
      <td><small>${t.category}</small></td>
      <td><small>${t.method}</small></td>
      <td style="color:var(--gold); font-weight:bold;">${t.currency === 'ARS' ? '$' : 'US$'}${t.amount.toLocaleString()}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('totalARS').innerText = `$ ${totARS.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
  document.getElementById('totalUSD').innerText = `US$ ${totUSD.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
}

// Lector de Resúmenes
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

dropZone?.addEventListener('click', () => { triggerFeedback(); fileInput.click(); });
fileInput?.addEventListener('change', handleFileUpload);

function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
    const reader = new FileReader();
    reader.onload = function(evt) { parseCSV(evt.target.result); };
    reader.readAsText(file);
  } else {
    simulateParsedSummary(file.name);
  }
}

function parseCSV(text) {
  const lines = text.split('\n');
  tempExtractedRows = [];
  lines.forEach((line, idx) => {
    if (idx > 0 && line.trim()) {
      const parts = line.split(',');
      if (parts.length >= 3) {
        tempExtractedRows.push({
          date: parts[0] || new Date().toISOString().slice(0,10),
          detail: parts[1] || 'Consumo Tarjeta',
          amount: parseFloat(parts[2]) || 15000.00
        });
      }
    }
  });
  displayExtractedPreview();
}

function simulateParsedSummary(fileName) {
  tempExtractedRows = [
    { date: new Date().toISOString().slice(0,10), detail: `Consumo Resumen (${fileName})`, amount: 35400.00 },
    { date: new Date().toISOString().slice(0,10), detail: "Servicio / Suscripción Detectada", amount: 12800.00 }
  ];
  displayExtractedPreview();
}

function displayExtractedPreview() {
  const tbody = document.getElementById('extractedRows');
  tbody.innerHTML = '';
  tempExtractedRows.forEach((row, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.date}</td>
      <td>${row.detail}</td>
      <td>$ ${row.amount.toLocaleString()}</td>
      <td><input type="checkbox" checked id="chk_${i}"></td>
    `;
    tbody.appendChild(tr);
  });
  document.getElementById('extractedPreview').style.display = 'block';
}

function importExtractedData() {
  triggerFeedback();
  tempExtractedRows.forEach((row, i) => {
    const chk = document.getElementById(`chk_${i}`);
    if (chk && chk.checked) {
      transactions.unshift({
        id: 'RSG-IMP-' + Math.floor(Math.random() * 8000),
        date: row.date,
        amount: row.amount,
        currency: 'ARS',
        detail: row.detail,
        category: 'Varios',
        method: 'BBVA Visa Signature'
      });
    }
  });
  localStorage.setItem('rsg_demo_tx', JSON.stringify(transactions));
  document.getElementById('extractedPreview').style.display = 'none';
  renderTransactions();
  alert("Consumos importados con éxito a la app.");
}

// Alertas de Vencimiento de Tarjetas
function checkCardAlerts() {
  const today = new Date();
  const currentDay = today.getDate();
  const alertBox = document.getElementById('alertList');
  alertBox.innerHTML = '';

  cards.forEach(card => {
    let closeDiff = card.closeDay - currentDay;
    let dueDiff = card.dueDay - currentDay;

    let msg = "";
    if (closeDiff >= 0 && closeDiff <= 5) {
      msg = `💳 <b>${card.name}</b>: Cierra en <b>${closeDiff === 0 ? 'HOY' : closeDiff + ' días'}</b> (Día ${card.closeDay}).`;
    } else if (dueDiff >= 0 && dueDiff <= 7) {
      msg = `⚠️ <b>${card.name}</b>: Vence en <b>${dueDiff === 0 ? 'HOY' : dueDiff + ' días'}</b> (Día ${card.dueDay}). ¡Evitá intereses!`;
    } else {
      msg = `✅ <b>${card.name}</b>: Próximo cierre Día ${card.closeDay} | Vencimiento Día ${card.dueDay}.`;
    }

    const div = document.createElement('div');
    div.className = 'alert-item';
    div.innerHTML = msg;
    alertBox.appendChild(div);
  });
}

document.getElementById('cardForm')?.addEventListener('submit', function(e) {
  e.preventDefault();
  const newCard = {
    name: document.getElementById('cardName').value,
    closeDay: parseInt(document.getElementById('cardCloseDay').value),
    dueDay: parseInt(document.getElementById('cardDueDay').value)
  };
  cards.push(newCard);
  localStorage.setItem('rsg_demo_cards', JSON.stringify(cards));
  document.getElementById('cardForm').reset();
  renderCards();
  checkCardAlerts();
});

function renderCards() {
  const container = document.getElementById('cardList');
  if (!container) return;
  container.innerHTML = '';
  cards.forEach(c => {
    const div = document.createElement('div');
    div.className = 'card';
    div.style.marginTop = '8px';
    div.innerHTML = `<strong>${c.name}</strong><br><small>Cierre: Día ${c.closeDay} | Vencimiento: Día ${c.dueDay}</small>`;
    container.appendChild(div);
  });
}

// Exportar a Excel
function exportToExcel() {
  triggerFeedback();
  if (transactions.length === 0) {
    alert("No hay movimientos registrados para exportar.");
    return;
  }
  let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
  csvContent += "ID,Fecha,Tipo,Categoría,Detalle,Medio,Monto ARS,Monto USD\n";

  transactions.forEach(t => {
    let row = [
      t.id,
      t.date,
      "Gasto",
      `"${t.category}"`,
      `"${t.detail}"`,
      `"${t.method}"`,
      t.currency === 'ARS' ? t.amount : 0,
      t.currency === 'USD' ? t.amount : 0
    ].join(",");
    csvContent += row + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `RSG_Social_Export_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Reiniciar datos de prueba
function resetDemoData() {
  triggerFeedback();
  if (confirm("¿Querés reiniciar la demo? Se borrarán los datos ficticios registrados en este dispositivo.")) {
    localStorage.removeItem('rsg_demo_tx');
    transactions = [];
    renderTransactions();
    alert("Demo reiniciada correctamente.");
  }
}

// Ajustes de Usuario
function changeTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }
  localStorage.setItem('rsg_theme', theme);
  triggerFeedback();
}

function changeAvatar(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('avatarPreview').src = e.target.result;
      document.getElementById('headerAvatar').src = e.target.result;
      localStorage.setItem('rsg_avatar', e.target.result);
    };
    reader.readAsDataURL(file);
    triggerFeedback();
  }
}

function saveUserProfile() {
  const name = document.getElementById('userNameInput').value;
  localStorage.setItem('rsg_username', name);
  if (name) {
    document.getElementById('headerSubtitle').innerText = `¡Hola, ${name}!`;
  }
}

function saveFeedbackSettings() {
  enableSound = document.getElementById('chkSound').checked;
  enableVibrate = document.getElementById('chkVibrate').checked;
  localStorage.setItem('rsg_sound', enableSound);
  localStorage.setItem('rsg_vibrate', enableVibrate);
  triggerFeedback();
}

function changePin(e) {
  e.preventDefault();
  triggerFeedback();
  const oldP = document.getElementById('oldPin').value;
  const newP = document.getElementById('newPin').value;
  const activePin = localStorage.getItem('rsg_pin') || DEFAULT_PIN;

  if (oldP !== activePin) {
    alert("El PIN actual es incorrecto.");
    return;
  }
  if (newP.length !== 4 || isNaN(newP)) {
    alert("El nuevo PIN debe ser de 4 números.");
    return;
  }

  localStorage.setItem('rsg_pin', newP);
  alert("¡PIN actualizado con éxito!");
  document.getElementById('changePinForm').reset();
}

function loadUserSettings() {
  const savedTheme = localStorage.getItem('rsg_theme') || 'dark';
  document.getElementById('themeSelect').value = savedTheme;
  changeTheme(savedTheme);

  const savedAvatar = localStorage.getItem('rsg_avatar');
  if (savedAvatar) {
    document.getElementById('avatarPreview').src = savedAvatar;
    document.getElementById('headerAvatar').src = savedAvatar;
  }

  const savedName = localStorage.getItem('rsg_username');
  if (savedName) {
    document.getElementById('userNameInput').value = savedName;
    document.getElementById('headerSubtitle').innerText = `¡Hola, ${savedName}!`;
  }

  document.getElementById('chkSound').checked = enableSound;
  document.getElementById('chkVibrate').checked = enableVibrate;
}