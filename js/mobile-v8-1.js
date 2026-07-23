(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const {products,stops,models,packageSvg}=window.V81_DATA;

  const state = {screen:"home",stop:0,selected:null,points:0,collected:new Set(),answered:new Set(),elapsed:0,timer:null,paused:false,moving:false};
  const screens = new Map($$(".screen").map(el => [el.dataset.screen,el]));
  const historyStack = ["home"];
  let moleculeViewer = null;

  async function loadStaticAssets(){
    const text = async path => { const r=await fetch(path,{cache:"force-cache"}); if(!r.ok) throw new Error(path); return (await r.text()).trim(); };
    const parts = async paths => (await Promise.all(paths.map(text))).join("");
    try{
      const [home,aisle,ben]=await Promise.all([
        parts(["assets/v8/home-v8-1.b64","assets/v8/home-v8-2.b64","assets/v8/home-v8-3.b64","assets/v8/home-v8-4.b64","assets/v8/home-v8-5.b64"]),
        parts(["assets/v8/supermarket-aisle-1.b64","assets/v8/supermarket-aisle-2.b64","assets/v8/supermarket-aisle-3.b64","assets/v8/supermarket-aisle-4.b64"]),
        text("assets/v8/ben-guide.b64")
      ]);
      $("#home-art").src=`data:image/webp;base64,${home}`;
      document.documentElement.style.setProperty("--aisle-bg",`url("data:image/webp;base64,${aisle}")`);
      document.documentElement.style.setProperty("--ben-avatar",`url("data:image/webp;base64,${ben}")`);
    }catch(error){ console.error("Falha ao carregar artes",error); }
  }

  function showScreen(name,push=true){
    if(!screens.has(name)) return;
    screens.forEach((screen,key)=>screen.classList.toggle("active",key===name));
    state.screen=name;
    if(push){historyStack.push(name);history.pushState({screen:name},"",`#${name}`);}
    if(name==="game") startTimer(); else stopTimer();
  }
  function goBack(){ if(historyStack.length>1) history.back(); else showScreen("home",false); }
  function formatTime(seconds){return `${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`;}
  function startTimer(){if(state.timer||state.paused)return;state.timer=setInterval(()=>{state.elapsed++;$("#time-value").textContent=formatTime(state.elapsed);},1000);}
  function stopTimer(){if(state.timer)clearInterval(state.timer);state.timer=null;}
  function updateHud(message){$("#points-value").textContent=String(state.points).padStart(3,"0");$("#items-value").textContent=`${state.collected.size}/3`;$("#time-value").textContent=formatTime(state.elapsed);if(message)$("#ben-hud-message").textContent=message;}
  function setTip(text){$("#ben-tip-text").textContent=text;}

  function renderStop(animate=false,direction=1){
    const view=$("#aisle-view"),stop=stops[state.stop],cart=$(".cart-fp");
    state.selected=null;
    view.className=`aisle-view stop-${state.stop}${animate?" moving":""}`;
    $("#sector-sign").textContent=`${stop.sign} · ${state.stop}/5`;
    setTip(stop.tip);
    $("#product-layer").innerHTML="";
    stop.products.forEach((id,index)=>{
      const product=products[id],button=document.createElement("button");
      button.type="button";button.className=`product-card ${index===0?"left":"right"}${state.answered.has(id)?" done":""}`;
      button.dataset.product=id;button.setAttribute("aria-label",`Selecionar ${product.name}`);
      button.innerHTML=`${packageSvg(product.asset)}<span class="product-label">${product.name}</span>`;
      button.addEventListener("click",()=>selectProduct(id,button));
      button.addEventListener("contextmenu",e=>e.preventDefault());
      $("#product-layer").appendChild(button);
    });
    const analyze=$("#analyze-button");
    analyze.disabled=true;analyze.textContent="Analisar produto";
    $("#move-back").disabled=state.stop===0;$("#move-forward").disabled=state.stop===5;
    if(state.stop===5){
      const missing=Math.max(0,3-state.collected.size),ready=missing===0;
      analyze.disabled=!ready;analyze.textContent=ready?"Finalizar no caixa":`Faltam ${missing} produto${missing===1?"":"s"}`;
      setTip(ready?"Excelente! Toque em Finalizar no caixa.":`Faltam ${missing} produtos. Use Voltar para retornar aos setores.`);
      updateHud(ready?"O carrinho está completo!":"Ainda faltam produtos da missão.");
    }else updateHud(state.stop===0?"Vamos começar pela entrada.":"Toque diretamente em uma embalagem.");
    if(animate){
      cart.classList.remove("bump-forward","bump-back");void cart.offsetWidth;cart.classList.add(direction>0?"bump-forward":"bump-back");
      setTimeout(()=>{view.classList.remove("moving");cart.classList.remove("bump-forward","bump-back");state.moving=false;},400);
    }
  }

  function move(delta){
    if(state.moving)return;
    const next=Math.max(0,Math.min(5,state.stop+delta));
    if(next===state.stop){setTip(delta>0?"Você chegou ao caixa.":"Você está na entrada.");return;}
    state.moving=true;state.stop=next;renderStop(true,delta);
    if(navigator.vibrate)navigator.vibrate(15);
  }

  function selectProduct(id,button){
    state.selected=id;
    $$(".product-card").forEach(card=>card.classList.remove("selected"));
    button.classList.add("selected");
    const product=products[id];
    $("#analyze-button").disabled=false;
    $("#analyze-button").textContent=state.answered.has(id)?"Revisar produto":"Analisar produto";
    setTip(`${product.name} selecionado. Toque em Analisar produto.`);
    updateHud(`${product.name} está em destaque.`);
  }

  function openAnalysis(product){
    $("#analysis-title").textContent=product.name;$("#analysis-kind").textContent=product.kind;
    $("#analysis-compound").textContent=product.compound||"—";$("#analysis-formula").textContent=product.formula||"Não se aplica";$("#analysis-condensed").textContent=product.condensed||"Não se aplica";
    $("#formula-box").hidden=!product.formula;$("#condensed-box").hidden=!product.condensed;
    $("#mixture-alert").hidden=!product.mixture;$("#mixture-alert").innerHTML=product.mixture?"<strong>Atenção:</strong> o produto é uma mistura. Fórmula e estrutura, quando mostradas, pertencem apenas ao composto representativo estudado.":"";
    $("#hint-text").hidden=true;$("#hint-text").textContent=product.hint;$("#feedback-box").hidden=true;$("#feedback-box").className="feedback-box";$("#continue-button").hidden=true;$("#viewer-section").hidden=true;
    const answers=$("#answer-list");answers.innerHTML="";
    product.options.forEach(option=>{const b=document.createElement("button");b.type="button";b.textContent=option;b.addEventListener("click",()=>answerProduct(product,option,b));answers.appendChild(b);});
    $("#analysis-dialog").showModal();
    $(".analysis-scroll").scrollTop=0;
  }

  function answerProduct(product,option,clicked){
    const correct=option===product.answer,feedback=$("#feedback-box");
    $$("#answer-list button").forEach(button=>{button.disabled=true;if(button.textContent===product.answer)button.classList.add("correct");});
    clicked.classList.add(correct?"correct":"wrong");
    if(correct){
      if(!state.answered.has(product.id)){state.points+=product.mission?120:70;state.answered.add(product.id);}
      if(product.mission&&!state.collected.has(product.id)){state.collected.add(product.id);addCartItem(product);}
      feedback.className="feedback-box correct";feedback.innerHTML=`<strong>Muito bem!</strong> ${product.explanation}`;
      updateHud(product.mission?"Acerto! O produto entrou no carrinho.":"Classificação correta. Este produto não pertence à missão.");
    }else{
      state.points=Math.max(0,state.points-20);feedback.className="feedback-box wrong";feedback.innerHTML=`<strong>Vamos revisar.</strong> ${product.hint}`;updateHud("Observe novamente a evidência estrutural.");
    }
    feedback.hidden=false;$("#continue-button").hidden=false;renderCollectedList();
    if(product.model&&window.MoleculeViewer){
      $("#viewer-section").hidden=false;
      try{moleculeViewer.load(models[product.model]);}catch(error){console.error(error);$("#viewer-section").hidden=true;}
    }
    updateHud();
    setTimeout(()=>feedback.scrollIntoView({behavior:"smooth",block:"center"}),120);
  }

  function addCartItem(product){const item=document.createElement("div");item.className="mini-package";item.title=product.name;item.innerHTML=packageSvg(product.asset,"mini");$("#cart-items").appendChild(item);}
  function renderCollectedList(){const c=$("#collected-list");c.innerHTML="";if(!state.collected.size){c.innerHTML="<p>Nenhum item correto foi coletado ainda.</p>";return;}state.collected.forEach(id=>{const p=products[id],row=document.createElement("div");row.innerHTML=`<div class="list-package">${packageSvg(p.asset,"list")}</div><span><strong>${p.name}</strong><br><small>${p.compound}</small></span>`;c.appendChild(row);});}
  function finishMission(){if(state.collected.size<3)return;stopTimer();$("#result-points").textContent=state.points;$("#result-time").textContent=formatTime(state.elapsed);const c=$("#result-products");c.innerHTML="";state.collected.forEach(id=>{const p=products[id],row=document.createElement("div");row.innerHTML=`<div class="list-package">${packageSvg(p.asset,"list")}</div><span><strong>${p.name}</strong><br><small>${p.compound} — função álcool</small></span>`;c.appendChild(row);});showScreen("results");}
  function resetGame(){stopTimer();state.stop=0;state.selected=null;state.points=0;state.elapsed=0;state.paused=false;state.moving=false;state.collected.clear();state.answered.clear();$("#cart-items").innerHTML="";renderCollectedList();updateHud("Vamos começar pela entrada.");renderStop(false);showScreen("mission");}
  function pauseGame(){if(state.screen!=="game")return;state.paused=true;stopTimer();$("#pause-dialog").showModal();}
  function resumeGame(){state.paused=false;$("#pause-dialog").close();startTimer();}

  function init(){
    loadStaticAssets();
    if(window.MoleculeViewer){try{moleculeViewer=new window.MoleculeViewer($("#molecule-canvas"));}catch(error){console.error(error);}}
    $("#home-start").addEventListener("click",()=>showScreen("mission"));$("#home-how").addEventListener("click",()=>showScreen("tutorial"));
    $$('[data-go="mission"]').forEach(b=>b.addEventListener("click",()=>showScreen("mission")));
    $$('[data-go="home"]').forEach(b=>b.addEventListener("click",()=>{$$("dialog").forEach(d=>{if(d.open)d.close();});state.paused=false;showScreen("home");}));
    $$('[data-back]').forEach(b=>b.addEventListener("click",goBack));
    $("#enter-store").addEventListener("click",()=>{state.stop=0;renderStop(false);showScreen("game");});
    $("#move-forward").addEventListener("click",()=>move(1));$("#move-back").addEventListener("click",()=>move(-1));
    $("#analyze-button").addEventListener("click",()=>{if(state.stop===5){finishMission();return;}if(state.selected)openAnalysis(products[state.selected]);});
    $("#hint-button").addEventListener("click",()=>{$("#hint-text").hidden=false;});
    $("#continue-button").addEventListener("click",()=>{$("#analysis-dialog").close();renderStop(false);if(state.collected.size>=3){setTip("Os três itens foram encontrados. Avance até o caixa.");updateHud("Carrinho completo! Siga para o caixa.");}});
    $("#zoom-out").addEventListener("click",()=>moleculeViewer?.zoomBy(.85));$("#zoom-in").addEventListener("click",()=>moleculeViewer?.zoomBy(1.18));$("#reset-view").addEventListener("click",()=>moleculeViewer?.reset());
    $("#list-button").addEventListener("click",()=>{renderCollectedList();$("#list-dialog").showModal();});$$('[data-close]').forEach(b=>b.addEventListener("click",()=>$("#"+b.dataset.close).close()));
    $("#pause-button").addEventListener("click",pauseGame);$("#resume-button").addEventListener("click",resumeGame);$("#restart-button").addEventListener("click",resetGame);
    window.addEventListener("popstate",event=>{if(historyStack.length>1)historyStack.pop();const name=event.state?.screen||historyStack.at(-1)||"home";screens.forEach((s,k)=>s.classList.toggle("active",k===name));state.screen=name;if(name==="game")startTimer();else stopTimer();});
    document.addEventListener("visibilitychange",()=>{if(document.hidden&&state.screen==="game"&&!state.paused)pauseGame();});
    document.addEventListener("contextmenu",e=>{if(e.target.closest(".game-screen"))e.preventDefault();});
    history.replaceState({screen:"home"},"","#home");renderCollectedList();updateHud();renderStop(false);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();

})();
