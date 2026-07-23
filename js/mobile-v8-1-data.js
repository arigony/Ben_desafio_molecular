(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const products = {
    perfume: {
      id:"perfume", name:"Perfume", asset:"perfume", kind:"Produto comercial: mistura de componentes",
      compound:"Etanol", formula:"C₂H₆O", condensed:"CH₃CH₂OH", answer:"Álcool",
      options:["Álcool","Cetona","Éster","Fenol"], hint:"Procure o grupo hidroxila ligado a um carbono saturado.",
      explanation:"O etanol é um álcool e atua como solvente comum em perfumes. A fórmula pertence ao composto representativo, não ao perfume inteiro.",
      mixture:true, mission:true, model:"ethanol"
    },
    removedor: {
      id:"removedor", name:"Removedor", asset:"removedor", kind:"Produto comercial: composição variável",
      compound:"Acetona", formula:"C₃H₆O", condensed:"CH₃COCH₃", answer:"Cetona",
      options:["Álcool","Cetona","Aldeído","Éter"], hint:"Observe a carbonila C=O entre dois carbonos.",
      explanation:"A acetona é uma cetona. O removedor pode conter outros componentes; aqui ela é o composto representativo.",
      mixture:true, mission:false, model:"acetone"
    },
    gel: {
      id:"gel", name:"Álcool em gel", asset:"alcool-gel", kind:"Produto comercial: mistura de componentes",
      compound:"Etanol", formula:"C₂H₆O", condensed:"CH₃CH₂OH", answer:"Álcool",
      options:["Álcool","Ácido carboxílico","Cetona","Amina"], hint:"O grupo –OH é a principal pista estrutural.",
      explanation:"O etanol pertence à função álcool. O gel também contém água, espessantes e outros componentes.",
      mixture:true, mission:true, model:"ethanol"
    },
    antiseptico: {
      id:"antiseptico", name:"Antisséptico", asset:"antisseptico", kind:"Produto comercial: mistura de componentes",
      compound:"Isopropanol", formula:"C₃H₈O", condensed:"(CH₃)₂CHOH", answer:"Álcool",
      options:["Fenol","Álcool","Cetona","Amida"], hint:"A hidroxila está ligada ao carbono central.",
      explanation:"O isopropanol é um álcool secundário e pode estar presente em formulações antissépticas.",
      mixture:true, mission:true, model:"isopropanol"
    },
    vinagre: {
      id:"vinagre", name:"Vinagre", asset:"vinagre", kind:"Produto comercial: solução aquosa",
      compound:"Ácido acético", formula:"C₂H₄O₂", condensed:"CH₃COOH", answer:"Ácido carboxílico",
      options:["Álcool","Ácido carboxílico","Éster","Cetona"], hint:"Procure o grupo –COOH.",
      explanation:"O ácido acético é um ácido carboxílico. O vinagre é uma solução aquosa e não possui uma única fórmula como produto.",
      mixture:true, mission:false, model:"acetic"
    },
    oleo: {
      id:"oleo", name:"Óleo vegetal", asset:"oleo-vegetal", kind:"Produto comercial: mistura de triacilgliceróis",
      compound:"Triacilgliceróis", formula:"", condensed:"", answer:"Éster",
      options:["Álcool","Éster","Aldeído","Amina"], hint:"Os triacilgliceróis apresentam ligações éster.",
      explanation:"Óleos vegetais são misturas. A classe estrutural predominante contém grupos éster, mas não existe uma fórmula molecular única para o produto.",
      mixture:true, mission:false, model:null
    },
    sal: {
      id:"sal", name:"Sal de cozinha", asset:"sal", kind:"Composto predominantemente iônico",
      compound:"Cloreto de sódio", formula:"NaCl", condensed:"", answer:"Composto iônico",
      options:["Álcool","Composto iônico","Cetona","Éster"], hint:"O sódio forma cátion e o cloro forma ânion.",
      explanation:"O cloreto de sódio é um composto iônico, não uma substância orgânica. Produtos comerciais podem conter pequenas quantidades de aditivos.",
      mixture:false, mission:false, model:"nacl"
    },
    refrigerante: {
      id:"refrigerante", name:"Refrigerante", asset:"refrigerante", kind:"Produto comercial: mistura de componentes",
      compound:"Não há um único composto representativo", formula:"", condensed:"", answer:"Mistura comercial",
      options:["Álcool puro","Mistura comercial","Cetona pura","Éster puro"], hint:"Considere água, açúcares ou adoçantes, acidulantes, gás e aromas.",
      explanation:"Refrigerante é uma mistura comercial. Não é correto atribuir uma única fórmula molecular ao produto inteiro.",
      mixture:true, mission:false, model:null
    }
  };

  const stops = [
    {sign:"ENTRADA", products:[], tip:"Toque em Avançar para visitar o primeiro setor."},
    {sign:"HIGIENE E BELEZA", products:["perfume","removedor"], tip:"Toque diretamente em uma das embalagens."},
    {sign:"CUIDADOS PESSOAIS", products:["gel","antiseptico"], tip:"Compare as formas das embalagens e investigue a química."},
    {sign:"MERCEARIA", products:["vinagre","oleo"], tip:"Produtos comerciais podem ser soluções ou misturas complexas."},
    {sign:"BEBIDAS E COZINHA", products:["sal","refrigerante"], tip:"Nem todo produto do mercado pertence à química orgânica."},
    {sign:"CAIXA", products:[], tip:"Finalize quando o carrinho tiver três produtos relacionados a álcoois."}
  ];

  const models = {
    ethanol:`9\nethanol\nC -0.748 0.015 0.024\nC 0.748 -0.015 -0.024\nO 1.396 1.195 0.016\nH -1.129 -0.608 0.842\nH -1.129 -0.439 -0.906\nH -1.103 1.048 0.132\nH 1.109 -0.601 0.837\nH 1.109 -0.468 -0.908\nH 2.344 1.071 -0.003`,
    isopropanol:`12\nisopropanol\nC 0.000 0.000 0.000\nC -1.445 -0.220 0.020\nC 1.445 -0.220 -0.020\nO 0.000 1.430 0.000\nH 0.000 -0.420 1.030\nH -1.890 0.770 0.050\nH -1.820 -0.760 0.900\nH -1.820 -0.790 -0.840\nH 1.890 0.770 -0.050\nH 1.820 -0.790 0.840\nH 1.820 -0.760 -0.900\nH 0.000 1.830 0.850`,
    acetone:`10\nacetone\nC 0.000 0.000 0.000\nO 0.000 1.220 0.000\nC -1.420 -0.720 0.000\nC 1.420 -0.720 0.000\nH -1.770 -1.180 0.930\nH -2.160 0.020 -0.220\nH -1.360 -1.520 -0.750\nH 1.770 -1.180 -0.930\nH 2.160 0.020 0.220\nH 1.360 -1.520 0.750`,
    acetic:`8\nacetic acid\nC 0.000 0.000 0.000\nO 0.000 1.220 0.000\nO 1.180 -0.760 0.000\nC -1.420 -0.720 0.000\nH -1.760 -1.200 0.930\nH -2.180 0.020 -0.180\nH -1.360 -1.510 -0.760\nH 1.970 -0.210 0.000`,
    nacl:`2\nsodium chloride\nNa -1.15 0.000 0.000\nCl 1.15 0.000 0.000`
  };

  let svgSequence=0;
  function packageSvg(type,variant="scene"){
    const id=`p${++svgSequence}`;
    const cls=`package-art ${variant}`;
    const common=`class="${cls}" viewBox="0 0 180 260" role="img" aria-hidden="true"`;
    const defs=(a,b)=>`<defs><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`;
    const shadow=`<ellipse cx="90" cy="242" rx="58" ry="9" fill="#092838" opacity=".18"/>`;
    if(type==="perfume")return `<svg ${common}>${defs("#ffeaf3","#f5a9c7")}${shadow}<path d="M45 76h90l18 26-12 126H39L27 102z" fill="url(#${id}g)" stroke="#a76d82" stroke-width="6"/><path d="M65 17h50l15 18-13 35H63L50 35z" fill="#fff9fc" stroke="#b99aa5" stroke-width="6"/><rect x="69" y="57" width="42" height="28" rx="7" fill="#dca72d"/><rect x="80" y="39" width="20" height="24" fill="#f3c44b"/><rect x="57" y="120" width="66" height="69" rx="12" fill="#fff8fb" stroke="#d984a8" stroke-width="5"/><circle cx="90" cy="155" r="12" fill="#e85c91"/><g fill="#e85c91"><circle cx="90" cy="136" r="12"/><circle cx="108" cy="149" r="12"/><circle cx="101" cy="170" r="12"/><circle cx="79" cy="170" r="12"/><circle cx="72" cy="149" r="12"/></g><path d="M48 103l12 115M132 103l-12 115" stroke="#fff" opacity=".55" stroke-width="5"/></svg>`;
    if(type==="removedor")return `<svg ${common}>${defs("#d9b7ff","#8752bd")}${shadow}<rect x="53" y="20" width="74" height="38" rx="10" fill="#6f3a9f" stroke="#4e2576" stroke-width="6"/><path d="M47 61h86l12 25v139H35V86z" fill="url(#${id}g)" stroke="#62338b" stroke-width="6"/><rect x="49" y="103" width="82" height="82" rx="10" fill="#fff" opacity=".92"/><path d="M90 122c-20 27-28 37-28 49a28 28 0 0056 0c0-12-8-22-28-49z" fill="#9a5cd0"/><path d="M119 120l5 12 12 5-12 5-5 12-5-12-12-5 12-5z" fill="#7b42b1"/><path d="M45 210h90" stroke="#6b318f" stroke-width="10" opacity=".45"/></svg>`;
    if(type==="alcool-gel")return `<svg ${common}>${defs("#e9fbff","#6bd4ef")}${shadow}<path d="M59 62h62v25l13 18v122H46V105l13-18z" fill="url(#${id}g)" stroke="#1684a4" stroke-width="6"/><rect x="68" y="30" width="44" height="38" rx="7" fill="#19a9c8" stroke="#13708a" stroke-width="5"/><path d="M80 31V15h66v16h-35" fill="none" stroke="#13708a" stroke-width="10" stroke-linecap="round"/><rect x="58" y="112" width="64" height="79" rx="10" fill="#fff" stroke="#2ba7c5" stroke-width="5"/><path d="M90 127v30M75 142h30" stroke="#169fc2" stroke-width="12"/><path d="M90 166c-12 15-16 22-16 29a16 16 0 0032 0c0-7-4-14-16-29z" fill="#17a8d1"/><circle cx="60" cy="212" r="4" fill="#fff" opacity=".8"/><circle cx="118" cy="202" r="5" fill="#fff" opacity=".7"/></svg>`;
    if(type==="antisseptico")return `<svg ${common}>${defs("#b9f0e8","#3db9a9")}${shadow}<rect x="61" y="24" width="58" height="35" rx="7" fill="#15998b" stroke="#0c6f65" stroke-width="6"/><path d="M58 59h64l22 27v139H36V86z" fill="url(#${id}g)" stroke="#0b8177" stroke-width="6"/><rect x="52" y="104" width="76" height="80" rx="10" fill="#fff" opacity=".94"/><path d="M90 119v34M73 136h34" stroke="#29b8a4" stroke-width="12"/><path d="M52 178c30-19 47 16 76-5v22H52z" fill="#38b9a9"/></svg>`;
    if(type==="vinagre")return `<svg ${common}>${defs("#fff7cf","#e7b443")}${shadow}<rect x="74" y="19" width="32" height="34" rx="7" fill="#b77b20" stroke="#80500f" stroke-width="5"/><path d="M72 51h36l4 27 16 25v124H52V103l16-25z" fill="url(#${id}g)" stroke="#b98527" stroke-width="6"/><rect x="60" y="129" width="60" height="65" rx="8" fill="#fffdf0" stroke="#9d6b1e" stroke-width="4"/><path d="M90 148c19-13 31 8 23 27-8 19-38 19-46 0-8-19 4-40 23-27z" fill="#e65c4f"/><path d="M91 145c0-9 7-14 14-16" fill="none" stroke="#397d35" stroke-width="6"/><path d="M101 132c8-7 16-4 19 2-8 5-15 5-19-2z" fill="#4a963c"/></svg>`;
    if(type==="oleo-vegetal")return `<svg ${common}>${defs("#fff08a","#f2b300")}${shadow}<rect x="70" y="18" width="40" height="31" rx="6" fill="#4e9a32" stroke="#2e6d1e" stroke-width="5"/><path d="M66 49h48l5 25 13 16v137H48V90l13-16z" fill="url(#${id}g)" stroke="#b88600" stroke-width="6"/><path d="M52 90h76M52 113h76M52 136h76" stroke="#fff" opacity=".45" stroke-width="5"/><rect x="58" y="145" width="64" height="66" rx="8" fill="#fff8d4" stroke="#8c6a00" stroke-width="4"/><path d="M90 157c-15 20-21 29-21 39a21 21 0 0042 0c0-10-6-19-21-39z" fill="#f1b400"/><path d="M58 205l31-21 33 21v6H58z" fill="#5c9a35"/></svg>`;
    if(type==="sal")return `<svg ${common}>${defs("#ffffff","#dbeeff")}${shadow}<path d="M41 54h98v173H41z" fill="url(#${id}g)" stroke="#1779b9" stroke-width="6"/><path d="M41 54h98v32H41z" fill="#1687cf"/><path d="M90 111l42 43-42 43-42-43z" fill="#1687cf"/><path d="M66 169c6-24 42-24 48 0z" fill="#fff"/><circle cx="75" cy="154" r="4" fill="#fff"/><circle cx="91" cy="145" r="5" fill="#fff"/><circle cx="105" cy="156" r="3" fill="#fff"/><path d="M48 203h84" stroke="#8bc7ec" stroke-width="7" stroke-dasharray="3 5"/></svg>`;
    return `<svg ${common}>${defs("#ff6b62","#c81f2a")}${shadow}<path d="M53 40h74l9 16v169H44V56z" fill="url(#${id}g)" stroke="#86131c" stroke-width="6"/><path d="M54 40h72" stroke="#c7d0d4" stroke-width="12"/><path d="M48 204h84" stroke="#c7d0d4" stroke-width="10"/><path d="M49 147c28-24 54 26 83-2" fill="none" stroke="#fff" stroke-width="13" opacity=".9"/><circle cx="79" cy="118" r="13" fill="#fff"/><circle cx="107" cy="92" r="7" fill="#fff"/><circle cx="115" cy="174" r="5" fill="#fff" opacity=".8"/></svg>`;
  }

  window.V81_DATA={products,stops,models,packageSvg};
})();
