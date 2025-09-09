// menu.js - carga menú y maneja carrito
document.addEventListener('DOMContentLoaded', init);

const API = window.API_BASE; // definido en index.html

let MENU = [];
let CART = { items: [], mesa: null };

function init(){
  const urlParams = new URLSearchParams(window.location.search);
  const mesa = urlParams.get('mesa') || urlParams.get('table') || '0';
  CART.mesa = mesa;
  document.getElementById('mesaBadge').innerText = (mesa && mesa!=='0') ? `Mesa: ${mesa}` : 'Mesa: --';
  fetchMenu();
  document.getElementById('openCartBtn').addEventListener('click', openCart);
  document.getElementById('closeCartBtn').addEventListener('click', closeCart);
  document.getElementById('placeOrderBtn').addEventListener('click', placeOrderHandler);
}

async function fetchMenu(){
  try{
    const res = await fetch(`${API}?fn=getMenu`);
    const data = await res.json();
    if (data && data.menu){
      MENU = data.menu;
      renderMenu();
    } else {
      document.getElementById('menuArea').innerHTML = '<p>No hay items disponibles.</p>';
    }
  }catch(err){
    console.error(err);
    document.getElementById('menuArea').innerHTML = '<p>Error al cargar el menú.</p>';
  }
}

function renderMenu(){
  const area = document.getElementById('menuArea');
  area.innerHTML = '';
  MENU.forEach(item=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="imgwrap"><img loading="lazy" src="${item.image_url || 'https://via.placeholder.com/600x400?text=Sin+imagen'}" alt="${escapeHtml(item.name)}" /></div>
      <div class="title">${escapeHtml(item.name)} <span style="float:right;font-weight:600">$${Number(item.price).toFixed(2)}</span></div>
      <div class="desc">${escapeHtml(item.description||'')}</div>
      <div class="footer">
        <div class="qty-controls">
          <button class="btn dec">-</button>
          <div class="count">0</div>
          <button class="btn inc">+</button>
        </div>
        <button class="btn primary add">Añadir</button>
      </div>
    `;
    // events
    card.querySelector('.inc').addEventListener('click', ()=>{
      const c = card.querySelector('.count');
      c.innerText = Number(c.innerText)+1;
    });
    card.querySelector('.dec').addEventListener('click', ()=>{
      const c = card.querySelector('.count');
      c.innerText = Math.max(0, Number(c.innerText)-1);
    });
    card.querySelector('.add').addEventListener('click', ()=>{
      const qty = Number(card.querySelector('.count').innerText);
      if (qty>0) addToCart(item, qty);
      card.querySelector('.count').innerText = 0;
    });
    area.appendChild(card);
  });
}

function addToCart(item, qty){
  const existing = CART.items.find(i=>i.id===item.id);
  if (existing) existing.qty += qty;
  else CART.items.push({ id: item.id, name: item.name, price: Number(item.price), qty: qty });
  updateCartUI();
  // small animation: briefly highlight badge
  const badge = document.getElementById('cartCount');
  badge.classList.add('pulse');
  setTimeout(()=>badge.classList.remove('pulse'),400);
}

function updateCartUI(){
  const count = CART.items.reduce((s,i)=>s+i.qty,0);
  document.getElementById('cartCount').innerText = count;
  const total = CART.items.reduce((s,i)=>s+(i.qty*i.price),0);
  document.getElementById('cartTotal').innerText = total.toFixed(2);
}

function openCart(){
  renderCartItems();
  document.getElementById('cartModal').classList.remove('hidden');
}
function closeCart(){
  document.getElementById('cartModal').classList.add('hidden');
}

function renderCartItems(){
  const list = document.getElementById('cartItems');
  list.innerHTML = '';
  if (CART.items.length===0) { list.innerHTML = '<p>No hay items.</p>'; return; }
  CART.items.forEach((it, idx)=>{
    const el = document.createElement('div');
    el.className = 'cart-item';
    el.style.display = 'flex'; el.style.justifyContent='space-between'; el.style.margin='8px 0';
    el.innerHTML = `<div><b>${escapeHtml(it.name)}</b> x ${it.qty}</div><div>$${(it.qty*it.price).toFixed(2)}</div>`;
    list.appendChild(el);
  });
  document.getElementById('cartTotal').innerText = CART.items.reduce((s,i)=>s+i.qty*i.price,0).toFixed(2);
}

async function placeOrderHandler(){
  if (!CART.items.length) return alert('Tu pedido está vacío.');
  const note = document.getElementById('note').value || '';
  const payload = {
    fn: 'placeOrder',
    mesa_id: CART.mesa || '0',
    items: CART.items,
    total: CART.items.reduce((s,i)=>s+i.qty*i.price,0),
    note: note
  };
  try{
    const res = await fetch(API, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data && data.success) {
      alert('Pedido enviado. ID: ' + data.order_id);
      CART.items = [];
      updateCartUI();
      closeCart();
    } else {
      alert('Error al enviar pedido');
    }
  }catch(err){
    console.error(err);
    alert('Error de conexión al enviar pedido');
  }
}

/* small helper */
function escapeHtml(text){ return String(text).replace(/[&<>"']/g, function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];}); }
