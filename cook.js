// cook.js - polling y UI del cocinero
document.addEventListener('DOMContentLoaded', initCook);

let POLLING = null;
let MUTED = false;

function initCook(){
  document.getElementById('unlockBtn').addEventListener('click', openCook);
  document.getElementById('muteBtn').addEventListener('click', toggleMute);
}

function toggleMute(){
  MUTED = !MUTED;
  document.getElementById('muteBtn').innerText = MUTED ? 'Activar sonido' : 'Silenciar';
}

function openCook(){
  const token = document.getElementById('tokenInput').value.trim();
  if (!token) return alert('Introduce token del cocinero');
  if (token !== COOK_TOKEN) return alert('Token incorrecto');
  startPolling();
}

function startPolling(){
  document.getElementById('ordersList').innerHTML = '<p>Cargando pedidos...</p>';
  fetchAndRender();
  POLLING = setInterval(fetchAndRender, 4000); // cada 4s
}

async function fetchAndRender(){
  try{
    const res = await fetch(`${API_BASE}?fn=getOrders`);
    const data = await res.json();
    if (data && data.orders){
      renderOrders(data.orders);
      if (data.orders.length > 0 && !MUTED) notifySound();
    } else {
      document.getElementById('ordersList').innerHTML = '<p>No hay pedidos.</p>';
    }
  }catch(err){
    console.error(err);
  }
}

function renderOrders(orders){
  const list = document.getElementById('ordersList'); list.innerHTML = '';
  if (!orders.length){ list.innerHTML = '<p>No hay pedidos.</p>'; return; }
  orders.slice().reverse().forEach(o=>{ // mostrar más reciente arriba
    const card = document.createElement('div'); card.className = 'order-card';
    const badge = document.createElement('div'); badge.className = 'badge'; badge.innerText = `M${o.mesa_id}`;
    const info = document.createElement('div'); info.className = 'order-info';
    const header = document.createElement('div'); header.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div><strong>${o.order_id}</strong> <small style="color:#aaa;margin-left:8px">${new Date(o.timestamp).toLocaleTimeString()}</small></div><div class="status-pill status-${o.status.replace(' ','_')}">${o.status}</div></div>`;
    const items = document.createElement('div'); items.style.marginTop='8px';
    o.items.forEach(it=>{
      const itEl = document.createElement('div');
      itEl.innerText = `${it.qty} x ${it.name}`;
      items.appendChild(itEl);
    });
    const actions = document.createElement('div'); actions.style.marginTop='8px';
    const btnRec = createStatusBtn(o.order_id,'RECIBIDO'); const btnProc = createStatusBtn(o.order_id,'EN_PROCESO'); const btnEnt = createStatusBtn(o.order_id,'ENTREGADO');
    actions.appendChild(btnRec); actions.appendChild(btnProc); actions.appendChild(btnEnt);

    info.appendChild(header); info.appendChild(items); info.appendChild(actions);
    card.appendChild(badge); card.appendChild(info);
    list.appendChild(card);
  });
}

function createStatusBtn(orderId, status){
  const b = document.createElement('button'); b.className = 'btn small'; b.innerText = status;
  b.addEventListener('click', async ()=>{
    if (!confirm(`Cambiar estado a ${status}?`)) return;
    try{
      const res = await fetch(API_BASE, {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ fn:'updateOrderStatus', order_id: orderId, status: status })
      });
      const data = await res.json();
      if (data && data.success) fetchAndRender();
      else alert('Error al actualizar');
    }catch(err){ console.error(err); alert('Error de conexión'); }
  });
  return b;
}

function notifySound(){
  // sonido simple: beep con WebAudio
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(880, ctx.currentTime);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    o.connect(g); g.connect(ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    setTimeout(()=>{ g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35); o.stop(ctx.currentTime + 0.4); }, 350);
  }catch(e){}
}
