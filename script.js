    var telaEl = document.getElementsByTagName('tela')[0];
  var canvas = document.createElement('canvas');
  telaEl.appendChild(canvas);
  canvas.width = parseInt(telaEl.getAttribute('largura')) || 800;
  canvas.height = parseInt(telaEl.getAttribute('altura')) || 600;
  canvas.style.display = 'block';
  canvas.style.border = '1px solid #333';
  var ctx = canvas.getContext('2d');

  // UI (A interface escrita ao lado da tela)
  var pontosEl = document.getElementById('pontos');
  var vidasEl = document.getElementById('vidas-num');
  var nivelEl = document.getElementById('nivel-num');

  function limitar(v,a,b){return Math.max(a,Math.min(b,v));}
  function aleatorio(min,max){return Math.random()*(max-min)+min;}
  function distancia(x1,y1,x2,y2){var dx=x1-x2,dy=y1-y2;return Math.sqrt(dx*dx+dy*dy);}
  function colideRetangulos(a,b){return !(a.x+a.w<b.x||a.x>b.x+b.w||a.y+a.h<b.y||a.y>b.y+b.h);}
  function colideCirculoRetangulo(cx,cy,r,rx,ry,rw,rh){
    var nx=limitar(cx,rx,rx+rw), ny=limitar(cy,ry,ry+rh);
    var dx=cx-nx, dy=cy-ny; return dx*dx+dy*dy<=r*r;
  }

  // Status (do jogo e do jogador)
  var projeteis = []; // {x,y,vx,vy,r,cor,proprietario}
  var inimigos = [];  // {tipo,x,y,w,h,r,hp,cor,vx,vy,tags,desdeTiro}
  var jogador = { x:canvas.width/2, y:canvas.height-60, w:28, h:32, velocidade:220, vidas:2, cor:'#f13067ff', corMachucado:'#9b5c7dff', desdeMachucado:0, cooldownTiro:0.25, desdeTiro:0 };
  var pontos = 0, nivel = 1;

  // Ciração do Projétil
  function criarProj(x,y,vx,vy,r,cor,proprietario){ projeteis.push({x:x,y:y,vx:vx,vy:vy,r:r,cor:cor,proprietario:proprietario}); }

  // Criação de inimihos específicos (usa as tags do HTML para configurar)
  function criarInimigo(tipo,x,y,tags){
    tags = tags || {};
    if(tipo==='losango'){
      var w = Number(tags.tamanho||tags.w||28);
      var h = Number(tags.tamanho||tags.h||28);
      var hp = Number(tags.vida||1);
      var cor = tags.cor||'#f2c94c';
      if(typeof tags._dir==='undefined') tags._dir = 1;
      inimigos.push({ tipo:'losango', x:x, y:y, w:w, h:h, hp:hp, cor:cor, tags:tags, desdeTiro:0 });
    } else if(tipo==='quadrado'){
      var w2 = Number(tags.tamanho||tags.w||36);
      var h2 = Number(tags.tamanho||tags.h||36);
      var hp2 = Number(tags.vida||3);
      var cor2 = tags.cor||'#56ccf2';
      if(typeof tags._dir==='undefined') tags._dir = 1;
      inimigos.push({ tipo:'quadrado', x:x, y:y, w:w2, h:h2, hp:hp2, cor:cor2, tags:tags });
    } else if(tipo==='circulo'){
      var r = Number(tags.r||tags.tamanho||18);
      var hp3 = Number(tags.vida||2);
      var cor3 = tags.cor||'#9b51e0';
      var vx = (Number(tags.velocidade||120)) * (Math.random()<0.5?-1:1);
      var vy = 0;
      inimigos.push({ tipo:'circulo', x:x, y:y, r:r, hp:hp3, cor:cor3, vx:vx, vy:vy, tags:tags });
    }
  }

  // Criação da fileira (usa as tags do HTMl para configurar)
  function criarFileira(tipo, config, tags){
    var cont = Number(config.count||6);
    var espac = Number(config.spacing||70);
    var y = Number(config.y||60);
    var larguraTotal = (cont-1)*espac;
    var baseX = (canvas.width - larguraTotal)/2;
    for(var i=0;i<cont;i++){
      var x = baseX + i*espac;
      var tagsClone = {};
      for(var k in tags) tagsClone[k] = tags[k];
      if(typeof tagsClone._dir==='undefined') tagsClone._dir = 1;
      criarInimigo(tipo,x,y,tagsClone);
    }
  }

  function lerInimigosDoHTML(){
    // fileiras
    var filas = document.getElementsByTagName('fileira');
    for(var i=0;i<filas.length;i++){
      var f = filas[i];
      var tipo = f.getAttribute('tipo') || 'losango';
      var count = f.getAttribute('count') || f.getAttribute('quantidade') || 6;
      var spacing = f.getAttribute('spacing') || 70;
      var y = f.getAttribute('y') || 60;
      // tags extras
      var tags = {};
      var attrs = ['vida','projSize','projSpeed','hSpeed','velocidade','tamanho','cor'];
      for(var a=0;a<attrs.length;a++){ var name=attrs[a]; if(f.getAttribute(name)!==null) tags[name]=f.getAttribute(name); }
      criarFileira(tipo, { count:count, spacing:spacing, y:y }, tags);
    }
    // Inimigos individuais
    var els = document.getElementsByTagName('inimigo');
    for(var j=0;j<els.length;j++){
      var el = els[j];
      var tipo = el.getAttribute('tipo') || 'circulo';
      var px = Number(el.getAttribute('px') || el.getAttribute('x') || 100);
      var py = Number(el.getAttribute('py') || el.getAttribute('y') || 100);
      var tags = {};
      // atributos suportados
      var suportados = ['vida','velocidade','tamanho','r','projSize','projSpeed','hSpeed','cor'];
      for(var s=0;s<suportados.length;s++){ var n=suportados[s]; if(el.getAttribute(n)!==null) tags[n]=el.getAttribute(n); }
      criarInimigo(tipo, px, py, tags);
    }
  }

    // Inimigos padrão caso não haja nenhuma tag.
  function popularPadrao(){
    if(document.getElementsByTagName('fileira').length===0 && document.getElementsByTagName('inimigo').length===0){
      criarFileira('losango', { count:8, y:60, spacing:70 }, { vida:1, projSize:6, projSpeed:140, hSpeed:20 });
      criarFileira('quadrado', { count:6, y:130, spacing:90 }, { vida:3, hSpeed:10 });
      criarInimigo('circulo',140,200,{vida:2,velocidade:140});
      criarInimigo('circulo',400,200,{vida:2,velocidade:140});
      criarInimigo('circulo',660,200,{vida:2,velocidade:140});
    }
  }

  // Teclado
  var controle = { esquerda:false, direita:false, cima:false, baixo:false, atirar:false };
  window.addEventListener('keydown', function(e){
    if(e.key==='ArrowLeft') controle.esquerda=true;
    if(e.key==='ArrowRight') controle.direita=true;
    if(e.key==='ArrowUp') controle.cima=true;
    if(e.key==='ArrowDown') controle.baixo=true;
    if(e.code==='Space') controle.atirar=true;
  });
  window.addEventListener('keyup', function(e){
    if(e.key==='ArrowLeft') controle.esquerda=false;
    if(e.key==='ArrowRight') controle.direita=false;
    if(e.key==='ArrowUp') controle.cima=false;
    if(e.key==='ArrowDown') controle.baixo=false;
    if(e.code==='Space') controle.atirar=false;
  });

  // Colisões
  var ultimo = performance.now();
  function loop(now){
    var dt = Math.min(0.05,(now-ultimo)/1000); ultimo = now;
    atualizar(dt); desenhar(); requestAnimationFrame(loop);
  }

  function atualizar(dt){
    atualizarDecorativos(); // Objetos de fundo rebaterão nas bordas

    // Jogador
    var dx=0, dy=0;
    if(controle.esquerda) dx-=1;
    if(controle.direita) dx+=1;
    if(controle.cima) dy-=1;
    if(controle.baixo) dy+=1;
    var len = Math.hypot(dx,dy)||1;
    jogador.x += (dx/len)*jogador.velocidade*dt;
    jogador.y += (dy/len)*jogador.velocidade*dt;
    jogador.x = limitar(jogador.x,10,canvas.width-10);
    jogador.y = limitar(jogador.y,canvas.height/2,canvas.height-10);

    // Tiro
    jogador.desdeTiro += dt;
    if(controle.atirar && jogador.desdeTiro >= jogador.cooldownTiro){
      jogador.desdeTiro = 0;
      criarProj(jogador.x, jogador.y - jogador.h - 6, 0, -360, 5, '#bfefff', 'jogador');
    }
    if(jogador.desdeMachucado>0) jogador.desdeMachucado -= dt;

    // Inimigos
    for(var i=inimigos.length-1;i>=0;i--){
      var inim = inimigos[i];
      if(inim.tipo==='quadrado' || inim.tipo==='losango'){
        if(inim.tags && inim.tags.hSpeed){
          var dir = inim.tags._dir || 1;
          inim.x += dir * Number(inim.tags.hSpeed) * dt;
          if(inim.x < 10){ inim.x = 10; for(var j=0;j<inimigos.length;j++){ if(Math.abs(inimigos[j].y-inim.y)<1 && inimigos[j].tags && inimigos[j].tags.hSpeed) inimigos[j].tags._dir = 1; } }
          if(inim.x + (inim.w||0) > canvas.width - 10){ inim.x = canvas.width - 10 - (inim.w||0); for(var j2=0;j2<inimigos.length;j2++){ if(Math.abs(inimigos[j2].y-inim.y)<1 && inimigos[j2].tags && inimigos[j2].tags.hSpeed) inimigos[j2].tags._dir = -1; } }
        }
      }
      if(inim.tipo==='circulo'){
        // Ricochete do circulo
        inim.x += inim.vx * dt;
        if(inim.x - inim.r < 0){ inim.x = inim.r; inim.vx *= -1; }
        if(inim.x + inim.r > canvas.width){ inim.x = canvas.width - inim.r; inim.vx *= -1; }
        var dirx = jogador.x - inim.x, diry = jogador.y - inim.y;
        var dist = Math.max(1, Math.sqrt(dirx*dirx + diry*diry));
        var velocidadeSeek = Number((inim.tags && inim.tags.velocidade) ? inim.tags.velocidade : 120);
        inim.x += (dirx/dist) * velocidadeSeek * 0.25 * dt;
        inim.y += (diry/dist) * velocidadeSeek * 0.15 * dt;
        inim.y = limitar(inim.y,40,canvas.height-80);
      }

      // Tiro do lasango
      if(inim.tipo==='losango'){
        inim.desdeTiro = (inim.desdeTiro||0) + dt;
        var cooldown = (inim.tags && inim.tags.projCooldown) ? Number(inim.tags.projCooldown) : aleatorio(1.0,2.5);
        if(inim.desdeTiro >= cooldown){
          inim.desdeTiro = 0;
          var projSize = Number((inim.tags && inim.tags.projSize) ? inim.tags.projSize : 6);
          var projSpeed = Number((inim.tags && inim.tags.projSpeed) ? inim.tags.projSpeed : 140);
          var px = inim.x + (inim.w/2 || 14);
          var py = inim.y + (inim.h/2 || 14);
          criarProj(px, py, 0, projSpeed, projSize, '#ff7b7b', 'inimigo');
        }
      }
    }

    // Projéteis
    for(var p=projeteis.length-1;p>=0;p--){
      var proj = projeteis[p];
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      if(proj.x < -50 || proj.x > canvas.width+50 || proj.y < -50 || proj.y > canvas.height+50){ projeteis.splice(p,1); continue; }
    }

    // Tiro do jogador aos inimigos
    for(var a=projeteis.length-1;a>=0;a--){
      var projA = projeteis[a];
      if(projA.proprietario !== 'jogador') continue;
      for(var b=inimigos.length-1;b>=0;b--){
        var inimB = inimigos[b];
        var acertou = false;
        if(inimB.tipo==='circulo'){
          if(distancia(projA.x,projA.y,inimB.x,inimB.y) <= projA.r + inimB.r) acertou = true;
        } else {
          if(colideCirculoRetangulo(projA.x,projA.y,projA.r,inimB.x,inimB.y,inimB.w,inimB.h)) acertou = true;
        }
        if(acertou){
          projeteis.splice(a,1);
          inimB.hp -= 1;
          if(inimB.hp <= 0){ inimigos.splice(b,1); pontos += 10; if(pontosEl) pontosEl.textContent = pontos; }
          else { var corAnt = inimB.cor; inimB.cor = '#ffb3b3'; (function(obj,corA){ setTimeout(function(){ if(obj) obj.cor = corA; },120); })(inimB,corAnt); }
          break;
        }
      }
    }

    // Tiro dos inimigos ao jogador
    for(var c=projeteis.length-1;c>=0;c--){
      var projC = projeteis[c];
      if(projC.proprietario !== 'inimigo') continue;
      var pb = { x:projC.x-projC.r, y:projC.y-projC.r, w:projC.r*2, h:projC.r*2 };
      var jb = { x:jogador.x - jogador.w/2, y:jogador.y - jogador.h, w:jogador.w, h:jogador.h + jogador.h/2 };
      if(colideRetangulos(jb,pb)){ projeteis.splice(c,1); aplicarDanoJogador(); }
    }

    // Colisão circulo e player
    for(var d=inimigos.length-1; d>=0; d--){
      var inimD = inimigos[d];
      if(inimD.tipo !== 'circulo') continue;
      var distJD = distancia(jogador.x,jogador.y,inimD.x,inimD.y);
      if(distJD <= inimD.r + Math.max(jogador.w,jogador.h)/2){
        aplicarDanoJogador();
        var ang = Math.atan2(inimD.y - jogador.y, inimD.x - jogador.x);
        inimD.x += Math.cos(ang) * (inimD.r + 10);
        inimD.y += Math.sin(ang) * (inimD.r + 10);
        inimD.x = limitar(inimD.x, inimD.r, canvas.width - inimD.r);
        inimD.y = limitar(inimD.y, 40, canvas.height - 80);
      }
    }

    // Sem inimigos --> Nível novo
    if(inimigos.length === 0){
      nivel += 1; if(nivelEl) nivelEl.textContent = nivel;
      // Aumenta dificuldade
      criarFileira('losango', { count: 8 + nivel, y:60, spacing:70 }, { vida:1, projSize:6, projSpeed:140 + nivel*10, hSpeed:20 + nivel*5 });
      criarFileira('quadrado', { count: 5 + Math.min(8,nivel), y:130, spacing:90 }, { vida:3 + Math.floor(nivel/2), hSpeed:10 + nivel*2 });
      for(var e=0;e<3 + Math.min(3,Math.floor(nivel/2)); e++){
        criarInimigo('circulo', 120 + e*220, 200, { vida:2 + Math.floor(nivel/3), velocidade:140 + nivel*10 });
      }
    }
  }

  function aplicarDanoJogador(){
    if(jogador.desdeMachucado > 0) return;
    jogador.vidas -= 1; jogador.desdeMachucado = 0.8;
    if(jogador.vidas === 1) jogador.cor = jogador.corMachucado;
    if(vidasEl) vidasEl.textContent = jogador.vidas;
    if(jogador.vidas <= 0) reiniciarJogo();
  }

  // Desenhar
  function desenhar(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    desenharDecorativos();
    // Inimigos
    for(var i=0;i<inimigos.length;i++){
      var inim = inimigos[i];
      ctx.save();
      if(inim.tipo==='losango'){
        ctx.translate(inim.x + inim.w/2, inim.y + inim.h/2);
        ctx.rotate(Math.PI/4);
        ctx.fillStyle = inim.cor; ctx.fillRect(-inim.w/2,-inim.h/2,inim.w,inim.h);
        ctx.strokeStyle='black'; ctx.strokeRect(-inim.w/2,-inim.h/2,inim.w,inim.h);
      } else if(inim.tipo==='quadrado'){
        ctx.fillStyle = inim.cor; ctx.fillRect(inim.x,inim.y,inim.w,inim.h);
        ctx.strokeStyle='black'; ctx.strokeRect(inim.x,inim.y,inim.w,inim.h);
      } else if(inim.tipo==='circulo'){
        ctx.beginPath(); ctx.fillStyle = inim.cor; ctx.arc(inim.x,inim.y,inim.r,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='black'; ctx.stroke();
      }
      ctx.restore();
    }
    // Projéteis
    for(var p=0;p<projeteis.length;p++){ var pr=projeteis[p]; ctx.beginPath(); ctx.fillStyle=pr.cor; ctx.arc(pr.x,pr.y,pr.r,0,Math.PI*2); ctx.fill(); }
    // Jogador (triângulo)
    ctx.beginPath();
    ctx.moveTo(jogador.x, jogador.y - jogador.h);
    ctx.lineTo(jogador.x - jogador.w/2, jogador.y + jogador.h/2);
    ctx.lineTo(jogador.x + jogador.w/2, jogador.y + jogador.h/2);
    ctx.closePath();
    ctx.fillStyle = (jogador.desdeMachucado>0) ? jogador.corMachucado : jogador.cor;
    ctx.fill(); ctx.strokeStyle='black'; ctx.stroke();
  }

  // Decorativos
  function desenharDecorativos(){

    //  Arcos
    var arcos = document.getElementsByTagName('arco');
    for(var i=0;i<arcos.length;i++){
      var arc = arcos[i];
      var x = parseFloat(arc.getAttribute('px'))||20;
      var y = parseFloat(arc.getAttribute('py'))||20;
      var r = parseFloat(arc.getAttribute('raio'))||20;
      var angIni = parseFloat(arc.getAttribute('angIni'))||0;
      var angFim = parseFloat(arc.getAttribute('angFim'))||Math.PI*2;
      var cor = arc.getAttribute('cor')||'green';
      ctx.beginPath(); ctx.arc(x,y,r,angIni,angFim,false);
      ctx.fillStyle = cor; ctx.globalAlpha = 0.25; ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle='black'; ctx.stroke(); ctx.closePath();
    }
    // retangulos
    var rects = document.getElementsByTagName('retangulo');
    for(var j=0;j<rects.length;j++){
      var rEl = rects[j];
      var rx = parseFloat(rEl.getAttribute('px'))||0;
      var ry = parseFloat(rEl.getAttribute('py'))||0;
      var rw = parseFloat(rEl.getAttribute('largura'))||50;
      var rh = parseFloat(rEl.getAttribute('altura'))||30;
      var corR = rEl.getAttribute('cor')||'blue';
      ctx.fillStyle = corR; ctx.globalAlpha = 0.18; ctx.fillRect(rx,ry,rw,rh); ctx.globalAlpha = 1;
      ctx.strokeStyle='black'; ctx.strokeRect(rx,ry,rw,rh);
    }
    // poligonos
    var polys = document.getElementsByTagName('poligono');
    for(var k=0;k<polys.length;k++){
      var p = polys[k];
      var lados = parseInt(p.getAttribute('lados'))||3;
      var cx = parseFloat(p.getAttribute('px'))||200;
      var cy = parseFloat(p.getAttribute('py'))||200;
      var rr = parseFloat(p.getAttribute('raio'))||50;
      var corP = p.getAttribute('cor')||'orange';
      var rot = parseFloat(p.getAttribute('rotacao'))||0;
      ctx.beginPath();
      for(var m=0;m<lados;m++){ var ang=(2*Math.PI/lados)*m+rot; var x=cx+rr*Math.cos(ang); var y=cy+rr*Math.sin(ang); if(m===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }
      ctx.closePath(); ctx.fillStyle=corP; ctx.globalAlpha=0.18; ctx.fill(); ctx.globalAlpha=1; ctx.strokeStyle='black'; ctx.stroke();
    }
  }

  // decorativos -  atualização ao  reboter
  function atualizarDecorativos(){
    var arcos = document.getElementsByTagName('arco');
    for(var i=0;i<arcos.length;i++){
      var arc = arcos[i];
      var velX = parseFloat(arc.dataset.vx) || (arc.getAttribute('animarH') ? 1.6 : 0);
      var velY = parseFloat(arc.dataset.vy) || (arc.getAttribute('animarV') ? 1.2 : 0);
      var px = parseFloat(arc.getAttribute('px'))||0;
      var py = parseFloat(arc.getAttribute('py'))||0;
      var raio = parseFloat(arc.getAttribute('raio'))||20;
      px += velX; py += velY;
      if(px - raio < 0){ px = raio; velX = Math.abs(velX); }
      if(px + raio > canvas.width){ px = canvas.width - raio; velX = -Math.abs(velX); }
      if(py - raio < 0){ py = raio; velY = Math.abs(velY); }
      if(py + raio > canvas.height){ py = canvas.height - raio; velY = -Math.abs(velY); }
      arc.setAttribute('px', px); arc.setAttribute('py', py); arc.dataset.vx = velX; arc.dataset.vy = velY;
    }
    var rects = document.getElementsByTagName('retangulo');
    for(var j=0;j<rects.length;j++){
      var rEl = rects[j];
      var velX = parseFloat(rEl.dataset.vx) || (rEl.getAttribute('animarH') ? 1.4 : 0);
      var velY = parseFloat(rEl.dataset.vy) || (rEl.getAttribute('animarV') ? 1.0 : 0);
      var px = parseFloat(rEl.getAttribute('px'))||0;
      var py = parseFloat(rEl.getAttribute('py'))||0;
      var rw = parseFloat(rEl.getAttribute('largura'))||50;
      var rh = parseFloat(rEl.getAttribute('altura'))||30;
      px += velX; py += velY;
      if(px < 0){ px = 0; velX = Math.abs(velX); }
      if(px + rw > canvas.width){ px = canvas.width - rw; velX = -Math.abs(velX); }
      if(py < 0){ py = 0; velY = Math.abs(velY); }
      if(py + rh > canvas.height){ py = canvas.height - rh; velY = -Math.abs(velY); }
      rEl.setAttribute('px', px); rEl.setAttribute('py', py); rEl.dataset.vx = velX; rEl.dataset.vy = velY;
    }
    var polys = document.getElementsByTagName('poligono');
    for(var k=0;k<polys.length;k++){
      var p = polys[k];
      var velX = parseFloat(p.dataset.vx) || (p.getAttribute('animarH') ? 1.2 : 0);
      var velY = parseFloat(p.dataset.vy) || (p.getAttribute('animarV') ? 1.0 : 0);
      var px = parseFloat(p.getAttribute('px'))||0;
      var py = parseFloat(p.getAttribute('py'))||0;
      var rr = parseFloat(p.getAttribute('raio'))||50;
      px += velX; py += velY;
      if(px - rr < 0){ px = rr; velX = Math.abs(velX); }
      if(px + rr > canvas.width){ px = canvas.width - rr; velX = -Math.abs(velX); }
      if(py - rr < 0){ py = rr; velY = Math.abs(velY); }
      if(py + rr > canvas.height){ py = canvas.height - rr; velY = -Math.abs(velY); }
      p.setAttribute('px', px); p.setAttribute('py', py); p.dataset.vx = velX; p.dataset.vy = velY;
    }
  }

  // reiniciar
  function reiniciarJogo(){
    projeteis = []; inimigos = []; pontos = 0; nivel = 1;
    if(pontosEl) pontosEl.textContent = pontos;
    if(nivelEl) nivelEl.textContent = nivel;
    jogador.x = canvas.width/2; jogador.y = canvas.height-60; jogador.vidas = 2; jogador.cor = '#3aa0ff'; jogador.desdeMachucado = 0;
    if(vidasEl) vidasEl.textContent = jogador.vidas;
    // reler HTML (permite editar tags e recarregar)
    inimigos = [];
    lerInimigosDoHTML();
    popularPadrao();
  }

  // iimigos padrão  se não houver tags
  function popularPadrao(){
    if(inimigos.length===0){
      // se o usuário não definiu nada no HTML:
      criarFileira('losango', { count:8, y:60, spacing:70 }, { vida:1, projSize:6, projSpeed:140, hSpeed:20 });
      criarFileira('quadrado', { count:6, y:130, spacing:90 }, { vida:3, hSpeed:10 });
      criarInimigo('circulo',140,200,{vida:2,velocidade:140});
      criarInimigo('circulo',400,200,{vida:2,velocidade:140});
      criarInimigo('circulo',660,200,{vida:2,velocidade:140});
    }
  }

  // Começa o código - lê o HTML (Se não tiver tags, pega os inimigos padrão)
  lerInimigosDoHTML();
  popularPadrao();
  if(pontosEl) pontosEl.textContent = pontos;
  if(vidasEl) vidasEl.textContent = jogador.vidas;
  if(nivelEl) nivelEl.textContent = nivel;
  requestAnimationFrame(loop);
  console.log('Jogo iniciado: setas para mover, Space para atirar. Configure inimigos com <inimigo> e <fileira> no HTML.');
