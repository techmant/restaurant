document.addEventListener('DOMContentLoaded', init);

let MENU = [];
let CART = { items: [], mesa: '0' };

function init() {
  CART.mesa = detectMesa();
  document.getElementById('mesaBadge').innerText = `Mesa: ${CART.mesa}`;
  fetchMenu();
  document.getElementById('openCartBtn').addEventListener('click', openCart);
  document.getElementById('closeCartBtn').addEventListener('click', closeCart);
  document.getElementById('placeOrderBtn').addEventListener('click', placeOrderHandler);
}

function detectMesa() {
  const urlParams = new URLSearchParams(window.location.search);
  let mesa = urlParams.get('mesa');
  if (!mesa) {
    const path = window.location.pathname.split('/').filter(Boolean);
    const last = path[path.length - 1];
    if (/^\d+$/.test(last)) mesa = last;
  }
  return mesa || '0';
}

async function fetchMenu() {
  try {
    const res = await fetch(`${API_BASE}?fn=getMenu`);
    const data = await res.json();
    if (data && data.menu) {
      MENU = data.menu;
      renderMenu();
    } else {
      document.getElementById('menuArea').innerHTML = '<p>No hay items disponibles.</p>';
    }
  } catch (err) {
    console.error('Error al cargar menú:', err);
    document.getElementById('menuArea').innerHTML = '<p>Error al cargar el menú.</p>';
  }
}

function renderMenu() {
  const area = document.getElementById('menuArea');
  area.innerHTML = '';
  MENU.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="imgwrap"><img src="${item.image_url || 'https://via.placeholder.com/250x150'}" alt="${item.name}"></div>
      <div class="title">${item.name} - $${item.price}</div>
      <div class="desc">${item.description || ''}</div>
      <div class="footer">
        <button class="btn add">Añadir</button>
      </div>
    `;
    card.querySelector('.add').addEventListener('click', () => addToCart(item, 1));
    area.appendChild(card);
  });
}

function addToCart(item, qty) {
  const existing = CART.items.find(i => i.id === item.id);
  if (existing) existing.qty += qty;
  else CART.items.push({ id: item.id, name: item.name, price: Number(item.price), qty });
  updateCartUI();
}

function updateCartUI() {
  const count = CART.items.reduce((s, i) => s + i.qty, 0);
  document.getElementById('cartCount').innerText = count;
  const total = CART.items.reduce((s, i) => s + i.qty * i.price, 0);
  document.getElementById('cartTotal').innerText = total.toFixed(2);
}

function openCart() {
  const list = document.getElementById('cartItems');
  list.innerHTML = '';
  if (!CART.items.length) { list.innerHTML = '<p>No hay items.</p>'; }
  else CART.items.forEach(it => {
    const el = document.createElement('div');
    el.innerText = `${it.name} x ${it.qty} - $${(it.qty * it.price).toFixed(2)}`;
    list.appendChild(el);
  });
  document.getElementById('cartModal').classList.remove('hidden');
}

function closeCart() { document.getElementById('cartModal').classList.add('hidden'); }

async function placeOrderHandler() {
  if (!CART.items.length) return alert('Tu pedido está vacío.');
  const payload = {
    fn: 'placeOrder',
    mesa_id: CART.mesa,
    items: CART.items,
    total: CART.items.reduce((s, i) => s + i.qty * i.price, 0),
    note: document.getElementById('note').value || ''
  };
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      alert('Pedido enviado! ID: ' + data.order_id);
      CART.items = [];
      updateCartUI();
      closeCart();
    } else alert('Error al enviar pedido: ' + (data.error || 'desconocido'));
  } catch (err) {
    console.error('Error de conexión:', err);
    alert('Error de conexión al enviar pedido');
  }
}
