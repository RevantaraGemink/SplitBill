// script.js - SplitBill Logic (dibuat oleh Kgaaa)

const state = {
  peopleCount: 4,
  peopleNames: [],
  items: [], // {name, price, qty, participants: []}
  finalTotal: 0,
  totals: {}
};

// --- Utils ---
function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(num);
}

function parseCurrency(str) {
  return parseFloat(str.replace(/[^0-9]/g, '')) || 0;
}

function formatInputCurrency(e) {
  let value = e.target.value.replace(/[^0-9]/g, '');
  if (value === '') {
    e.target.value = '';
    return;
  }
  e.target.value = new Intl.NumberFormat('id-ID').format(value);
}

// --- Navigation ---
function showStep(stepNumber) {
  document.querySelectorAll('.step-bar').forEach(el => {
    const s = parseInt(el.dataset.step, 10);
    el.classList.toggle('active', s === stepNumber);
    el.classList.toggle('completed', s < stepNumber);
  });
  
  document.querySelectorAll('.step-section').forEach(sec => {
    const id = parseInt(sec.id.split('-')[1], 10);
    sec.classList.toggle('active', id === stepNumber);
  });
  
  window.scrollTo(0, 0);
}

// --- STEP 1: Setup ---
const peopleDisplay = document.getElementById('people-count-display');
const namesContainer = document.getElementById('names-container');

function renderNameInputs() {
  namesContainer.innerHTML = '';
  for (let i = 0; i < state.peopleCount; i++) {
    const group = document.createElement('div');
    group.className = 'input-group';
    group.style.marginBottom = '0.75rem';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = i === 0 ? 'Saya' : `Nama Peserta ${i + 1}`;
    input.className = 'person-name-input';
    input.value = state.peopleNames[i] || (i === 0 ? 'Saya' : '');
    
    group.appendChild(input);
    namesContainer.appendChild(group);
  }
}

document.getElementById('people-plus').addEventListener('click', () => {
  state.peopleCount++;
  peopleDisplay.textContent = state.peopleCount;
  renderNameInputs();
});

document.getElementById('people-minus').addEventListener('click', () => {
  if (state.peopleCount > 1) {
    state.peopleCount--;
    peopleDisplay.textContent = state.peopleCount;
    renderNameInputs();
  }
});

document.getElementById('add-manual-person').addEventListener('click', () => {
  state.peopleCount++;
  peopleDisplay.textContent = state.peopleCount;
  renderNameInputs();
});

document.getElementById('to-step-2').addEventListener('click', () => {
  const inputs = document.querySelectorAll('.person-name-input');
  state.peopleNames = Array.from(inputs).map((input, i) => input.value.trim() || `Peserta ${i + 1}`);
  showStep(2);
});

// --- STEP 2: Items ---
const itemNameInput = document.getElementById('item-name');
const itemPriceInput = document.getElementById('item-price');
const itemQtyInput = document.getElementById('item-qty');
const itemsList = document.getElementById('items-list');
const runningSubtotal = document.getElementById('running-subtotal');
const itemCountBadge = document.getElementById('item-count-badge');

itemPriceInput.addEventListener('input', formatInputCurrency);

function updateRunningSubtotal() {
  const subtotal = state.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  runningSubtotal.textContent = formatRupiah(subtotal);
  itemCountBadge.textContent = `${state.items.length} barang`;
}

function renderItemsList() {
  itemsList.innerHTML = '';
  state.items.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'bill-item';
    div.innerHTML = `
      <div class="item-icon">🍽️</div>
      <div class="item-info">
        <div class="name">${item.name}</div>
        <div class="sub">${item.qty} x ${formatRupiah(item.price)}</div>
      </div>
      <div class="item-price-total">${formatRupiah(item.price * item.qty)}</div>
      <button class="btn-clear" onclick="removeItem(${idx})" style="background:none; border:none; cursor:pointer; margin-left:10px;">✕</button>
    `;
    itemsList.appendChild(div);
  });
  updateRunningSubtotal();
}

window.removeItem = (idx) => {
  state.items.splice(idx, 1);
  renderItemsList();
};

document.getElementById('add-item').addEventListener('click', () => {
  const name = itemNameInput.value.trim();
  const price = parseCurrency(itemPriceInput.value);
  const qty = parseInt(itemQtyInput.value, 10);
  
  if (!name || price <= 0 || qty <= 0) {
    alert('Mohon isi semua detail barang dengan benar');
    return;
  }
  
  state.items.push({ name, price, qty, splitMode: 'manual', assignments: {} });
  itemNameInput.value = '';
  itemPriceInput.value = '';
  itemQtyInput.value = '1';
  renderItemsList();
});

document.getElementById('to-step-3').addEventListener('click', () => {
  if (state.items.length === 0) {
    alert('Tambahkan setidaknya satu barang');
    return;
  }
  renderAssignmentUI();
  showStep(3);
});

// --- STEP 3: Assign ---
function formatPortion(val) {
  if (val === 0) return '';
  if (Number.isInteger(val)) return `${val} porsi`;
  return `${val.toFixed(2).replace(/\.?0+$/, '')} porsi`;
}

function renderAssignmentUI() {
  const container = document.getElementById('assignment-container');
  container.innerHTML = '';
  
  state.items.forEach((item, itemIdx) => {
    // Initialize assignments and splitMode if not exists
    if (!item.assignments) {
      item.assignments = {};
    }
    if (!item.splitMode) {
      item.splitMode = 'manual';
    }
    
    const card = document.createElement('div');
    card.className = 'assignment-card';
    
    let statusHTML = '';
    const isManual = item.splitMode === 'manual';
    
    if (isManual) {
      const totalAssigned = Object.values(item.assignments).reduce((sum, val) => sum + val, 0);
      const remaining = item.qty - totalAssigned;
      
      if (remaining === 0) {
        statusHTML = '<span class="status-badge assigned">✓ Terbagi</span>';
      } else if (remaining > 0) {
        statusHTML = `<span class="status-badge remaining">Sisa ${remaining}</span>`;
      } else {
        statusHTML = `<span class="status-badge incomplete">Kelebihan! (${Math.abs(remaining)})</span>`;
      }
    } else {
      const selectedCount = Object.values(item.assignments).filter(val => val > 0).length;
      if (selectedCount > 0) {
        statusHTML = `<span class="status-badge assigned">✓ Terbagi Rata (${selectedCount} orang)</span>`;
      } else {
        statusHTML = `<span class="status-badge incomplete">Belum Dibagi</span>`;
      }
    }

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
        <div>
          <h4>${item.name}</h4>
          <div class="category">${item.qty}x @ ${formatRupiah(item.price)}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 800; color: var(--primary); font-size: 1.15rem;">${formatRupiah(item.price * item.qty)}</div>
          <div style="margin-top: 6px;">${statusHTML}</div>
        </div>
      </div>
      
      <!-- Split Mode Tabs -->
      <div class="split-mode-selector">
        <button class="mode-btn ${isManual ? 'active' : ''}" data-mode="manual">Porsi Manual</button>
        <button class="mode-btn ${!isManual ? 'active' : ''}" data-mode="equal">Bagi Rata</button>
      </div>

      <div class="participants-list" style="margin-top: 1rem;"></div>
    `;
    
    // Add mode toggle listeners
    const modeButtons = card.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        if (item.splitMode === mode) return;
        
        if (mode === 'manual') {
          item.splitMode = 'manual';
          item.assignments = {};
        } else {
          // Switching to equal split mode:
          // Try to migrate current people who have assignments, or select everyone by default
          const activePIdxs = Object.keys(item.assignments).map(Number).filter(idx => item.assignments[idx] > 0);
          item.splitMode = 'equal';
          item.assignments = {};
          
          if (activePIdxs.length > 0) {
            const portion = item.qty / activePIdxs.length;
            activePIdxs.forEach(idx => {
              item.assignments[idx] = portion;
            });
          } else {
            // Default: check all people
            const N = state.peopleNames.length;
            const portion = item.qty / N;
            state.peopleNames.forEach((_, idx) => {
              item.assignments[idx] = portion;
            });
          }
        }
        renderAssignmentUI();
      });
    });
    
    const list = card.querySelector('.participants-list');
    
    if (isManual) {
      const totalAssigned = Object.values(item.assignments).reduce((sum, val) => sum + val, 0);
      const remaining = item.qty - totalAssigned;
      
      state.peopleNames.forEach((name, pIdx) => {
        const row = document.createElement('div');
        row.className = 'participant-row';
        
        const count = item.assignments[pIdx] || 0;
        const personalPrice = count * item.price;
        
        row.innerHTML = `
          <div class="participant-info">
            <div class="avatar">${name.charAt(0).toUpperCase()}</div>
            <span style="font-weight: 500;">${name}</span>
          </div>
          <div class="qty-selector">
            <button class="qty-btn minus" ${count === 0 ? 'disabled' : ''}>—</button>
            <span class="qty-val">${count}</span>
            <button class="qty-btn plus" ${remaining <= 0 ? 'disabled' : ''}>+</button>
            <div class="price" style="margin-left: 1rem;">${count > 0 ? formatRupiah(personalPrice) : ''}</div>
          </div>
        `;
        
        row.querySelector('.minus').addEventListener('click', (e) => {
          e.stopPropagation();
          if (item.assignments[pIdx] > 0) {
            item.assignments[pIdx]--;
            renderAssignmentUI();
          }
        });
        
        row.querySelector('.plus').addEventListener('click', (e) => {
          e.stopPropagation();
          if (remaining > 0) {
            item.assignments[pIdx] = (item.assignments[pIdx] || 0) + 1;
            renderAssignmentUI();
          }
        });
        
        list.appendChild(row);
      });
    } else {
      state.peopleNames.forEach((name, pIdx) => {
        const row = document.createElement('div');
        const count = item.assignments[pIdx] || 0;
        const isSelected = count > 0;
        const personalPrice = count * item.price;
        
        row.className = `participant-row clickable ${isSelected ? 'selected' : ''}`;
        
        row.innerHTML = `
          <div class="participant-info">
            <div class="check-indicator">${isSelected ? '✓' : ''}</div>
            <div class="avatar">${name.charAt(0).toUpperCase()}</div>
            <span style="font-weight: 500;">${name}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 1rem;">
            <span style="font-size: 0.85rem; color: var(--gray-500); font-weight: 500;">${formatPortion(count)}</span>
            <div class="price" style="margin-left: 0.5rem; font-weight: 600; color: var(--primary);">${count > 0 ? formatRupiah(personalPrice) : ''}</div>
          </div>
        `;
        
        row.addEventListener('click', () => {
          const currentlySelected = (item.assignments[pIdx] || 0) > 0;
          
          // Collect all indices that will be active
          const selectedPIdxs = [];
          state.peopleNames.forEach((_, idx) => {
            if (idx === pIdx) {
              if (!currentlySelected) {
                selectedPIdxs.push(idx);
              }
            } else if ((item.assignments[idx] || 0) > 0) {
              selectedPIdxs.push(idx);
            }
          });
          
          // Re-calculate portions equally
          item.assignments = {};
          if (selectedPIdxs.length > 0) {
            const portion = item.qty / selectedPIdxs.length;
            selectedPIdxs.forEach(idx => {
              item.assignments[idx] = portion;
            });
          }
          renderAssignmentUI();
        });
        
        list.appendChild(row);
      });
    }
    
    container.appendChild(card);
  });
}

document.getElementById('back-to-2').addEventListener('click', () => showStep(2));

document.getElementById('to-step-4').addEventListener('click', () => {
  // Validation: ensure everything is fully assigned or at least assigned to one
  const incomplete = state.items.find(item => {
    const total = Object.values(item.assignments || {}).reduce((sum, v) => sum + v, 0);
    return total === 0;
  });
  
  if (incomplete) {
    alert(`Item "${incomplete.name}" belum dibagikan sama sekali!`);
    return;
  }
  
  const subtotal = state.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  document.getElementById('calc-subtotal-final').textContent = formatRupiah(subtotal);
  showStep(4);
});

// --- STEP 4: Adjust ---
const finalReceiptInput = document.getElementById('final-receipt-total');
finalReceiptInput.addEventListener('input', formatInputCurrency);

document.getElementById('clear-final').addEventListener('click', () => {
  finalReceiptInput.value = '';
});

document.getElementById('back-to-3').addEventListener('click', () => showStep(3));

document.getElementById('calculate').addEventListener('click', () => {
  state.finalTotal = parseCurrency(finalReceiptInput.value);
  if (state.finalTotal <= 0) {
    alert('Mohon masukkan total akhir yang valid');
    return;
  }
  calculateFinalTotals();
  renderResults();
  showStep(5);
});

// --- Calculation ---
function calculateFinalTotals() {
  const subtotalBruto = state.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const factor = subtotalBruto > 0 ? (state.finalTotal / subtotalBruto) : 0;
  
  state.totals = {};
  state.peopleNames.forEach((_, i) => {
    state.totals[i] = {
      base: 0,
      adjusted: 0
    };
  });
  
  state.items.forEach(item => {
    const itemAssignments = item.assignments || {};
    Object.keys(itemAssignments).forEach(pIdxStr => {
      const pIdx = parseInt(pIdxStr, 10);
      const count = itemAssignments[pIdx];
      const share = count * item.price;
      state.totals[pIdx].base += share;
    });
  });
  
  state.peopleNames.forEach((_, i) => {
    state.totals[i].adjusted = Math.round(state.totals[i].base * factor);
  });
}

// --- STEP 5: Results ---
function renderResults() {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';
  
  const subtotalBruto = state.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const totalDiff = state.finalTotal - subtotalBruto;
  
  state.peopleNames.forEach((name, i) => {
    const card = document.createElement('div');
    card.className = 'result-card';
    
    // Calculate individual breakdown
    const baseShare = state.totals[i].base;
    const proportion = subtotalBruto > 0 ? (baseShare / subtotalBruto) : 0;
    const individualDiff = state.totals[i].adjusted - baseShare;
    
    card.innerHTML = `
      <div class="status">${i === 0 ? 'Pembayar' : 'Hutang'}</div>
      <h3>${name}</h3>
      <div class="total">${formatRupiah(state.totals[i].adjusted)}</div>
      <div class="result-breakdown">
        <div class="breakdown-row">
          <label>Barang Dibagi</label>
          <span>${formatRupiah(baseShare)}</span>
        </div>
        <div class="breakdown-row">
          <label>${totalDiff >= 0 ? 'Pajak & Tip' : 'Diskon'}</label>
          <span>${formatRupiah(individualDiff)}</span>
        </div>
      </div>
    `;
    resultsDiv.appendChild(card);
  });
}

document.getElementById('reset').addEventListener('click', () => {
  if (confirm('Hapus semua data dan mulai ulang?')) {
    location.reload();
  }
});

document.getElementById('share-btn').addEventListener('click', () => {
  let text = "*Ringkasan Pembayaran SplitBill*\n_dibuat oleh Kgaaa_\n\n";
  state.peopleNames.forEach((name, i) => {
    text += `${name}: ${formatRupiah(state.totals[i].adjusted)}\n`;
  });
  text += `\nTotal Akhir: ${formatRupiah(state.finalTotal)}`;
  
  if (navigator.share) {
    navigator.share({ title: 'SplitBill oleh Kgaaa', text });
  } else {
    alert('Ringkasan disalin ke papan klip!');
    navigator.clipboard.writeText(text);
  }
});

// Initial Render
renderNameInputs();
showStep(1);
