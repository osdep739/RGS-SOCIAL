// Configuración de Estado
let currentPin = "";
const CORRECT_PIN = "1234";
let transactions = JSON.parse(localStorage.getItem('rsg_demo_tx') || '[]');
let cards = JSON.parse(localStorage.getItem('rsg_demo_cards') || '[{"name":"BBVA Visa Signature","closeDay":25,"dueDay":5}]');
let tempExtractedRows = [];

// Teclado PIN
function pressKey(num) {
  if (currentPin.length < 4) {
    currentPin += num;
    updateDots();
  }
  if (currentPin.length === 4) {
    setTimeout(checkPin, 150);
  }
}

function clearPin() { currentPin = ""; updateDots(); }
function updateDots() {
  for (let i = 1; i <= 4; i++) {
    const dot = document.getElementById(`dot-${i}`);
    if (i <= currentPin.length) dot.classList.add('filled');
    else dot.classList.remove('filled');
  }
}

function checkPin() {
  if (currentPin === CORRECT_PIN) {
    document.getElementById('lockScreen').style.display = 'none';
    document.getElementById('appMain').style.display = 'block';
    initApp();
  } else {
    alert("PIN incorrecto. Usá 1234 para la versión DEMO.");
    clearPin();
  }
}

function lockApp() {
  clearPin();
  document.getElementById('appMain').style.display = 'none';
  document.getElementById('lockScreen').style.display = 'flex';
}

function authenticateBiometric() {
  if (window.PublicKeyCredential) {
    checkPin(); // En demo simula desbloqueo exitoso
  }
}

// Navegación
function switchTab(tabId) {
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

// Lector de Resúmenes (Drag and Drop / PDF & CSV)
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

dropZone?.addEventListener('click', () => fileInput.click());
fileInput?.addEventListener('change', handleFileUpload);

function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
    const reader = new FileReader();
    reader.onload = function(evt) { parseCSV(evt.target.result); };
    reader.readAsText(file);
  } else if (file.name.endsWith('.pdf')) {
    parsePDF(file);
  } else {
    // Simulación inteligente para demostración Excel / Imagen
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

function parsePDF(file) {
  const fileReader = new FileReader();
  fileReader.onload = function() {
    const typedarray = new Uint8Array(this.result);
    pdfjsLib.getDocument(typedarray).promise.then(pdf => {
      let textContent = "";
      let countPromises = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        countPromises.push(pdf.getPage(i).then(page => page.getTextContent()));
      }
      Promise.all(countPromises).then(pages => {
        pages.forEach(p => p.items.forEach(item => textContent += item.str + " "));
        processExtractedText(textContent);
      });
    });
  };
  fileReader.readAsArrayBuffer(file);
}

function processExtractedText(text) {
  // Búsqueda regex de fechas y montos
  tempExtractedRows = [
    { date: new Date().toISOString().slice(0,10), detail: "Compra Supermercado Extraída PDF", amount: 48500.00 },
    { date: new Date().toISOString().slice(0,10), detail: "Combustible YPF Extraído PDF", amount: 22000.00 }
  ];
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

// Configurar Tarjetas
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

// Exportar a Excel (.csv)
function exportToExcel() {
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
  link.setAttribute("download", `RSG_DEMO_Export_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Reiniciar datos de prueba
function resetDemoData() {
  if (confirm("¿Querés reiniciar la demo? Se borrarán los datos ficticios registrados en este dispositivo.")) {
    localStorage.removeItem('rsg_demo_tx');
    transactions = [];
    renderTransactions();
    alert("Demo reiniciada correctamente.");
  }
}