// script.js - Logika SplitBill (HTML/CSS/JS murni)

// State penyimpanan sementara
const state = {
  peopleCount: 0,
  peopleNames: [],
  items: [], // array of {name, price, qty, participants: []}
  discount: 0, // ini sekarang berarti TOTAL AKHIR yang dibayar
  totals: {} 
};

function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num);
}

function formatInputRupiah(e) {
  let value = e.target.value.replace(/[^0-9]/g, '');
  if (value === '') {
    e.target.value = '';
    return;
  }
  e.target.value = new Intl.NumberFormat('id-ID').format(value);
}

function showStep(stepNumber) {
  document.querySelectorAll('.step').forEach(el => {
    const s = parseInt(el.dataset.step, 10);
    el.classList.toggle('active', s === stepNumber);
  });
  document.querySelectorAll('.step-section').forEach(sec => {
    const id = sec.id.split('-')[1];
    sec.classList.toggle('active', parseInt(id, 10) === stepNumber);
  });
}

// ---------- STEP 1: Jumlah Orang ----------
const peopleInput = document.getElementById('people-count');
const generateNamesBtn = document.getElementById('generate-names');
const namesContainer = document.getElementById('names-container');
const toStep2Btn = document.getElementById('to-step-2');

generateNamesBtn.addEventListener('click', () => {
  const count = parseInt(peopleInput.value, 10);
  if (isNaN(count) || count <= 0) {
    alert('Masukkan jumlah orang yang valid (>0)');
    return;
  }
  namesContainer.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'person-name-input';
    input.placeholder = `Nama Orang ke-${i + 1}`;
    namesContainer.appendChild(input);
  }
  toStep2Btn.style.display = 'block';
});

toStep2Btn.addEventListener('click', () => {
  const count = parseInt(peopleInput.value, 10);
  state.peopleCount = count;
  state.peopleNames = [];
  const nameInputs = document.querySelectorAll('.person-name-input');
  nameInputs.forEach((input, index) => {
    const val = input.value.trim();
    state.peopleNames.push(val !== '' ? val : `Orang ${index + 1}`);
  });
  showStep(2);
});

// ---------- STEP 2: Input Barang ----------
const itemNameInput = document.getElementById('item-name');
const itemPriceInput = document.getElementById('item-price');
itemPriceInput.addEventListener('input', formatInputRupiah);
const itemQtyInput = document.getElementById('item-qty');
const itemsList = document.getElementById('items-list');

document.getElementById('add-item').addEventListener('click', () => {
  const name = itemNameInput.value.trim();
  const price = parseFloat(itemPriceInput.value.replace(/[^0-9]/g, ''));
  const qty = parseInt(itemQtyInput.value, 10);
  if (!name) { alert('Nama barang wajib diisi'); return; }
  if (isNaN(price) || price < 0) { alert('Harga harus angka >=0'); return; }
  if (isNaN(qty) || qty <= 0) { alert('Kuantitas harus >0'); return; }

  const item = { name, price, qty, participants: [] };
  state.items.push(item);

  itemNameInput.value = '';
  itemPriceInput.value = '';
  itemQtyInput.value = '';

  const li = document.createElement('li');
  li.textContent = `${name} – ${formatRupiah(price)} x ${qty}`;
  itemsList.appendChild(li);
});

document.getElementById('to-step-3').addEventListener('click', () => {
  if (state.items.length === 0) {
    alert('Tambahkan setidaknya satu barang sebelum lanjut');
    return;
  }
  renderAssignmentUI();
  showStep(3);
});

// ---------- STEP 3: Pembagian Barang ----------
function renderAssignmentUI() {
  const container = document.getElementById('assignment-container');
  container.innerHTML = '';
  state.items.forEach((item, itemIdx) => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'assignment-item';
    itemDiv.innerHTML = `<h4>${item.name} (${item.qty}x)</h4>`;
    
    const participantsDiv = document.createElement('div');
    participantsDiv.className = 'participants';
    for (let i = 0; i < state.peopleCount; i++) {
      const label = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = i;
      if (item.participants.includes(i)) cb.checked = true;
      
      cb.addEventListener('change', (e) => {
         const pIdx = parseInt(e.target.value, 10);
         if (e.target.checked) {
            if (!item.participants.includes(pIdx)) item.participants.push(pIdx);
         } else {
            item.participants = item.participants.filter(p => p !== pIdx);
         }
      });
      
      label.appendChild(cb);
      label.appendChild(document.createTextNode(` ${state.peopleNames[i]}`));
      participantsDiv.appendChild(label);
    }
    itemDiv.appendChild(participantsDiv);
    container.appendChild(itemDiv);
  });
}

document.getElementById('to-step-4').addEventListener('click', () => {
  // Validasi: pastikan setiap item ada yang memesan
  const unassigned = state.items.find(item => item.participants.length === 0);
  if (unassigned) {
    alert(`Barang "${unassigned.name}" belum dibagikan ke siapapun!`);
    return;
  }
  showStep(4);
});

// ---------- STEP 4: Total Akhir (Diskon/Pajak) ----------
const discountInput = document.getElementById('discount-value');
discountInput.addEventListener('input', formatInputRupiah);
document.getElementById('calculate').addEventListener('click', () => {
  const totalPaid = parseFloat(discountInput.value.replace(/[^0-9]/g, ''));
  if (isNaN(totalPaid) || totalPaid < 0) {
    alert('Total pembayaran harus angka >=0');
    return;
  }
  state.discount = totalPaid;
  calculateTotals();
  renderResults();
  showStep(5);
});

// ---------- PERHITUNGAN ----------
function calculateTotals() {
  state.totals = {};
  for (let i = 0; i < state.peopleCount; i++) {
    state.totals[i] = 0;
  }

  let totalBruto = 0;
  state.items.forEach(item => {
    const itemTotal = item.price * item.qty;
    totalBruto += itemTotal;
    const share = itemTotal / item.participants.length;
    item.participants.forEach(pIdx => {
      state.totals[pIdx] += share;
    });
  });

  const totalPayment = state.discount;
  const factor = totalBruto > 0 ? (totalPayment / totalBruto) : 0;
  
  for (let i = 0; i < state.peopleCount; i++) {
    state.totals[i] = Math.round(state.totals[i] * factor);
  }
}

// ---------- TAMPILKAN HASIL ----------
function renderResults() {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';
  for (let i = 0; i < state.peopleCount; i++) {
    const card = document.createElement('div');
    card.className = 'result-card';
    const header = document.createElement('h3');
    header.textContent = state.peopleNames[i];
    const amount = document.createElement('p');
    amount.textContent = formatRupiah(state.totals[i]);
    card.appendChild(header);
    card.appendChild(amount);
    resultsDiv.appendChild(card);
  }
}

// ---------- RESET ----------
document.getElementById('reset').addEventListener('click', () => {
  state.peopleCount = 0;
  state.peopleNames = [];
  state.items = [];
  state.discount = 0;
  state.totals = {};
  peopleInput.value = '';
  namesContainer.innerHTML = '';
  toStep2Btn.style.display = 'none';
  itemsList.innerHTML = '';
  discountInput.value = '';
  document.getElementById('assignment-container').innerHTML = '';
  showStep(1);
});

showStep(1);
