const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Poker Live</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:#0a0e1a;color:#e8eaf0;font-family:system-ui,-apple-system,sans-serif;overflow:hidden}
.layout{display:grid;grid-template-columns:3fr 2fr;height:100vh}
.left{padding:28px 24px;display:flex;flex-direction:column;gap:18px;overflow:hidden;border-right:1px solid #2a3548}
.right{padding:24px 20px;overflow-y:auto;background:#080c17}
.tag{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#6b7490;margin-bottom:6px}
.big-level{font-size:56px;font-weight:800;color:#4f7cff;line-height:1}
.ante-row{font-size:18px;color:#8ab0d0;margin-top:6px}
.timer-wrap{line-height:1}
.timer{font-size:100px;font-weight:800;font-variant-numeric:tabular-nums;color:#e8eaf0;display:block}
.timer.warning{color:#f97316}
.timer.danger{color:#ef4444}
.next-lbl{font-size:16px;color:#6b7490;margin-top:6px}
.next-lbl b{color:#9ba3b8;font-weight:600}
.players-section{flex:1;overflow-y:auto;min-height:0}
.sec-hdr{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7490;margin-bottom:6px;margin-top:10px;padding-bottom:4px;border-bottom:1px solid #2a3548}
.p-row{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;margin-bottom:3px;background:#111827}
.p-row.out{opacity:.32;background:transparent;padding:5px 10px}
.p-pos{font-size:12px;color:#6b7490;min-width:26px;font-weight:700}
.p-name{flex:1;font-size:15px;font-weight:500}
.p-pts{font-size:13px;font-weight:700;color:#4f7cff}
.badge{font-size:10px;padding:2px 6px;border-radius:4px;font-weight:700;margin-left:5px}
.b-green{background:rgba(34,197,94,.15);color:#22c55e;border:1px solid rgba(34,197,94,.3)}
.b-orange{background:rgba(249,115,22,.15);color:#f97316;border:1px solid rgba(249,115,22,.3)}
.no-data{color:#6b7490;font-size:13px;padding:20px 0}
.updated{font-size:11px;color:#2a3548;margin-top:auto;padding-top:8px}
/* Standings */
h2{font-size:15px;font-weight:700;color:#c0d0e8;margin-bottom:14px;letter-spacing:.03em}
.s-row{display:flex;align-items:center;gap:8px;padding:9px 4px;border-bottom:1px solid #141c2e}
.s-sym{font-size:18px;min-width:30px}
.s-name{flex:1;font-size:14px;font-weight:500;color:#d0d8ec}
.s-gpts{font-size:12px;font-weight:700;color:#7aabff;margin-right:4px}
.s-pts{font-size:17px;font-weight:700;color:#4f7cff}
.s-lbl{font-size:11px;color:#6b7490;margin-left:2px}
@media(max-width:640px){
  .layout{grid-template-columns:1fr;grid-template-rows:auto 1fr;height:auto;overflow:auto}
  .left{border-right:none;border-bottom:1px solid #2a3548}
  .timer{font-size:72px}
  html,body{overflow:auto;height:auto}
}
</style>
</head>
<body>
<div class="layout">
  <div class="left">
    <div>
      <div class="tag">Current Blinds</div>
      <div class="big-level" id="blinds-disp">--</div>
      <div class="ante-row" id="ante-disp"></div>
    </div>
    <div class="timer-wrap">
      <span class="timer" id="timer-disp">--:--</span>
      <div class="next-lbl" id="next-disp"></div>
    </div>
    <div class="players-section" id="players-panel"><div class="no-data">Waiting for game data&hellip;</div></div>
    <div class="updated" id="updated-disp"></div>
  </div>
  <div class="right">
    <h2>Season Standings</h2>
    <div id="standings-panel"><div class="no-data">No season data yet</div></div>
  </div>
</div>
<script>
var state = null;

function fmt(s) {
  var m = Math.floor(s / 60), sec = s % 60;
  return (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
}
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function currentSecs() {
  if (!state || !state.timer) return 0;
  var s = state.timer.secsLeft || 0;
  if (state.timer.running && state.pushedAt) {
    s = Math.max(0, s - Math.floor((Date.now() - state.pushedAt) / 1000));
  }
  return s;
}

function renderTimer() {
  if (!state) return;
  var s = currentSecs();
  var el = document.getElementById('timer-disp');
  el.textContent = fmt(s);
  el.className = 'timer' + (s <= 30 ? ' danger' : s <= 60 ? ' warning' : '');
}

function renderAll() {
  if (!state) return;
  var levels  = state.levels || [];
  var lvlIdx  = (state.timer && state.timer.lvlIdx) || 0;
  var level   = levels[lvlIdx];
  var nextLvl = levels[lvlIdx + 1];
  var game    = state.game || null;

  // Blinds
  var blindsEl = document.getElementById('blinds-disp');
  var anteEl   = document.getElementById('ante-disp');
  var nextEl   = document.getElementById('next-disp');
  if (level) {
    if (level.type === 'break') {
      blindsEl.textContent = 'BREAK';
      blindsEl.style.color = '#f5c842';
      anteEl.textContent = '';
    } else {
      blindsEl.textContent = level.sb + ' / ' + level.bb;
      blindsEl.style.color = '#4f7cff';
      anteEl.textContent = level.ante > 0 ? 'Ante: ' + level.ante : '';
    }
  }
  if (nextLvl) {
    var nLabel = nextLvl.type === 'break' ? 'Break' : nextLvl.sb + '/' + nextLvl.bb;
    nextEl.innerHTML = 'Next: <b>' + nLabel + '</b>';
  } else {
    nextEl.textContent = levels.length ? 'Final level' : '';
  }

  renderTimer();

  // Players
  var pp = document.getElementById('players-panel');
  if (!game) {
    pp.innerHTML = '<div class="no-data">No game in progress</div>';
  } else {
    var bustOrder = game.bustOrder || [];
    var bustedSet = {};
    bustOrder.forEach(function(n){ bustedSet[n] = true; });
    var active = (game.players || []).filter(function(n){ return !bustedSet[n]; });
    var kos    = game.knockouts || {};
    var mult   = game.mult || 1;

    // Compute game pts for busted players
    var gamePts = {};
    bustOrder.forEach(function(name, i){
      gamePts[name] = (i+1)*mult + (kos[name]||0)*0.5*mult;
    });

    var html = '<div class="sec-hdr">Still in &mdash; ' + active.length + ' remaining</div>';
    active.forEach(function(name){
      var koTag = (kos[name]||0) > 0 ? '<span class="badge b-orange">' + kos[name] + ' KO</span>' : '';
      html += '<div class="p-row"><span class="p-name">' + esc(name) + koTag + '</span><span class="badge b-green">in</span></div>';
    });

    if (bustOrder.length) {
      html += '<div class="sec-hdr">Eliminated</div>';
      var total = (game.players||[]).length;
      bustOrder.slice().reverse().forEach(function(name){
        var place = total - bustOrder.indexOf(name);
        var pts   = gamePts[name] || 0;
        html += '<div class="p-row out"><span class="p-pos">#' + place + '</span>' +
                '<span class="p-name">' + esc(name) + '</span>' +
                (pts ? '<span class="p-pts">' + pts + ' pts</span>' : '') + '</div>';
      });
    }
    pp.innerHTML = html;
  }

  // Season standings
  var sp = document.getElementById('standings-panel');
  var standings = state.standings || [];
  if (!standings.length) {
    sp.innerHTML = '<div class="no-data">No season data yet</div>';
  } else {
    var gamePtsMap = {};
    if (game) {
      var bo = game.bustOrder || [];
      var mkos = game.knockouts || {};
      var mm = game.mult || 1;
      bo.forEach(function(name,i){ gamePtsMap[name] = (i+1)*mm + (mkos[name]||0)*0.5*mm; });
    }
    var bustedSet2 = {};
    if (game) (game.bustOrder||[]).forEach(function(n){ bustedSet2[n]=true; });
    var syms = ['🏆','🥈','🥉'];
    sp.innerHTML = standings.map(function(p,i){
      var gp = gamePtsMap[p.name] || 0;
      var gpTag = gp > 0 ? '<span class="s-gpts">(+' + gp + ')</span>' : '';
      var inGame = game && (game.players||[]).indexOf(p.name) >= 0 && !bustedSet2[p.name];
      var inTag  = inGame ? '<span class="badge b-green">in</span>' : '';
      var sym = syms[i] || (i+1)+'.';
      return '<div class="s-row"><span class="s-sym">' + sym + '</span>' +
             '<span class="s-name">' + esc(p.name) + inTag + '</span>' +
             gpTag +
             '<span class="s-pts">' + p.pts + '</span><span class="s-lbl">pts</span></div>';
    }).join('');
  }

  // Last updated
  var updEl = document.getElementById('updated-disp');
  if (state.pushedAt) {
    var ago = Math.floor((Date.now() - state.pushedAt) / 1000);
    updEl.textContent = 'Last updated: ' + (ago < 5 ? 'just now' : ago + 's ago');
  }
}

function pollState() {
  fetch('/state', {cache: 'no-store'})
    .then(function(r){ return r.json(); })
    .then(function(data){ if (data) { state = data; renderAll(); } })
    .catch(function(){});
}

setInterval(renderTimer, 1000);
setInterval(renderAll,   1000);
setInterval(pollState,   5000);
pollState();
</script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const cors = {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    // ── POST /update  (poker app pushes state) ────────────────────────────────
    if (url.pathname === '/update' && request.method === 'POST') {
      const provided = (request.headers.get('Authorization') || '').replace('Bearer ', '');
      if (!env.WRITE_KEY || provided !== env.WRITE_KEY) {
        return new Response('Unauthorized', { status: 401, headers: cors });
      }
      const body = await request.text();
      await env.POKER_KV.put('state', body);
      return new Response('ok', { headers: cors });
    }

    // ── GET /state  (display page polls for data) ─────────────────────────────
    if (url.pathname === '/state') {
      const state = await env.POKER_KV.get('state');
      return new Response(state || 'null', {
        headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    // ── GET /  (serve the public display page) ────────────────────────────────
    return new Response(HTML, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};
