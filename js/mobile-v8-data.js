(() => {
  "use strict";
  const productCatalog = {
    perfume: {
      id: "perfume", name: "Perfume", emoji: "🧴", kind: "Produto comercial: mistura de componentes",
      compound: "Etanol", formula: "C₂H₆O", condensed: "CH₃CH₂OH", answer: "Álcool",
      options: ["Álcool", "Cetona", "Éster", "Fenol"],
      hint: "Procure o grupo hidroxila ligado a um carbono saturado.",
      explanation: "O etanol é um álcool e atua como solvente comum em perfumes. A fórmula apresentada é do composto representativo, não do produto comercial inteiro.",
      mixture: true, mission: true, model: "ethanol"
    },
    removedor: {
      id: "removedor", name: "Removedor", emoji: "🧴", kind: "Produto comercial: composição variável",
      compound: "Acetona", formula: "C₃H₆O", condensed: "CH₃COCH₃", answer: "Cetona",
      options: ["Álcool", "Cetona", "Aldeído", "Éter"],
      hint: "Observe o grupo carbonila C=O entre dois carbonos.",
      explanation: "A acetona é uma cetona. O removedor pode conter outros componentes; aqui a acetona é o composto representativo.",
      mixture: true, mission: false, model: "acetone"
    },
    gel: {
      id: "gel", name: "Álcool em gel", emoji: "🧴", kind: "Produto comercial: mistura de componentes",
      compound: "Etanol", formula: "C₂H₆O", condensed: "CH₃CH₂OH", answer: "Álcool",
      options: ["Álcool", "Ácido carboxílico", "Cetona", "Amina"],
      hint: "O grupo –OH é a pista principal.",
      explanation: "O etanol pertence à função álcool. O gel também contém água, espessantes e outros componentes.",
      mixture: true, mission: true, model: "ethanol"
    },
    antiseptico: {
      id: "antiseptico", name: "Antisséptico", emoji: "🧴", kind: "Produto comercial: mistura de componentes",
      compound: "Isopropanol", formula: "C₃H₈O", condensed: "(CH₃)₂CHOH", answer: "Álcool",
      options: ["Fenol", "Álcool", "Cetona", "Amida"],
      hint: "A hidroxila está ligada ao carbono central.",
      explanation: "O isopropanol é um álcool secundário e pode estar presente em formulações antissépticas.",
      mixture: true, mission: true, model: "isopropanol"
    },
    vinagre: {
      id: "vinagre", name: "Vinagre", emoji: "🍶", kind: "Produto comercial: solução aquosa",
      compound: "Ácido acético", formula: "C₂H₄O₂", condensed: "CH₃COOH", answer: "Ácido carboxílico",
      options: ["Álcool", "Ácido carboxílico", "Éster", "Cetona"],
      hint: "Procure o grupo –COOH.",
      explanation: "O ácido acético é um ácido carboxílico. O vinagre é uma solução aquosa e não possui uma única fórmula como produto.",
      mixture: true, mission: false, model: "acetic"
    },
    oleo: {
      id: "oleo", name: "Óleo vegetal", emoji: "🫗", kind: "Produto comercial: mistura de triacilgliceróis",
      compound: "Classe representativa: triacilgliceróis", formula: "", condensed: "", answer: "Éster",
      options: ["Álcool", "Éster", "Aldeído", "Amina"],
      hint: "Os triacilgliceróis apresentam ligações éster.",
      explanation: "Óleos vegetais são misturas. Sua classe estrutural predominante contém grupos éster, mas não existe uma fórmula molecular única para o produto.",
      mixture: true, mission: false, model: null
    }
  };

  const stops = [
    { sign: "ENTRADA", left: null, right: null, tip: "Toque em ▲ para avançar pelo corredor." },
    { sign: "HIGIENE E BELEZA", left: "perfume", right: "removedor", tip: "Há dois produtos próximos. Escolha um lado e toque em Analisar." },
    { sign: "CUIDADOS PESSOAIS", left: "gel", right: "antiseptico", tip: "Observe os produtos de cuidados pessoais." },
    { sign: "MERCEARIA", left: "vinagre", right: "oleo", tip: "Nem todo produto comercial possui uma fórmula única." },
    { sign: "CAIXA", left: null, right: null, tip: "Carrinho completo: finalize a missão no caixa." }
  ];

  const models = {
    ethanol: `9
ethanol
C -0.748 0.015 0.024
C 0.748 -0.015 -0.024
O 1.396 1.195 0.016
H -1.129 -0.608 0.842
H -1.129 -0.439 -0.906
H -1.103 1.048 0.132
H 1.109 -0.601 0.837
H 1.109 -0.468 -0.908
H 2.344 1.071 -0.003`,
    isopropanol: `12
isopropanol
C 0.000 0.000 0.000
C -1.445 -0.220 0.020
C 1.445 -0.220 -0.020
O 0.000 1.430 0.000
H 0.000 -0.420 1.030
H -1.890 0.770 0.050
H -1.820 -0.760 0.900
H -1.820 -0.790 -0.840
H 1.890 0.770 -0.050
H 1.820 -0.790 0.840
H 1.820 -0.760 -0.900
H 0.000 1.830 0.850`,
    acetone: `10
acetone
C 0.000 0.000 0.000
O 0.000 1.220 0.000
C -1.420 -0.720 0.000
C 1.420 -0.720 0.000
H -1.770 -1.180 0.930
H -2.160 0.020 -0.220
H -1.360 -1.520 -0.750
H 1.770 -1.180 -0.930
H 2.160 0.020 0.220
H 1.360 -1.520 0.750`,
    acetic: `8
acetic acid
C 0.000 0.000 0.000
O 0.000 1.220 0.000
O 1.180 -0.760 0.000
C -1.420 -0.720 0.000
H -1.760 -1.200 0.930
H -2.180 0.020 -0.180
H -1.360 -1.510 -0.760
H 1.970 -0.210 0.000`
  };
  window.V8_DATA = { productCatalog, stops, models };
})();
