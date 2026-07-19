(function () {
  "use strict";

  window.BEN_GAME_DATA = {
    mission: {
      title: "Missão 1 — Encontre produtos relacionados aos álcoois",
      objective:
        "Ajude Ben a encontrar produtos que contenham compostos pertencentes à função álcool ou que utilizem o etanol como componente importante.",
      required: 3,
      correctPoints: 100,
      wrongPenalty: 25,
      completionBonus: 150
    },
    products: [
      {
        id: "alcohol-gel",
        name: "Álcool em gel",
        shortLabel: "ÁLCOOL\nEM GEL",
        correct: true,
        compound: "Etanol",
        formula: "C₂H₆O",
        structure: "CH₃–CH₂–OH",
        organicFunction: "Álcool",
        explanation:
          "Correto! O etanol apresenta um grupo hidroxila (–OH) ligado a carbono saturado e pertence à função álcool. Formulações comerciais também contêm água, espessantes e outros componentes.",
        color: "#39bca7",
        icon: "gel",
        x: 238,
        y: 266
      },
      {
        id: "perfume",
        name: "Perfume",
        shortLabel: "PERFUME",
        correct: true,
        compound: "Etanol usado como solvente",
        formula: "C₂H₆O",
        structure: "CH₃–CH₂–OH",
        organicFunction: "Álcool",
        explanation:
          "Correto! Muitos perfumes utilizam etanol como solvente. O etanol apresenta um grupo hidroxila ligado a carbono saturado e pertence à função álcool.",
        color: "#d268b4",
        icon: "perfume",
        x: 378,
        y: 266
      },
      {
        id: "vinegar",
        name: "Vinagre",
        shortLabel: "VINAGRE",
        correct: false,
        compound: "Ácido acético",
        formula: "C₂H₄O₂",
        structure: "CH₃–COOH",
        organicFunction: "Ácido carboxílico",
        explanation:
          "O vinagre contém ácido acético. Esse composto apresenta o grupo carboxila (–COOH) e pertence à função ácido carboxílico, não à função álcool.",
        color: "#f0b54d",
        icon: "bottle",
        x: 510,
        y: 266
      },
      {
        id: "antiseptic",
        name: "Antisséptico alcoólico",
        shortLabel: "ANTISSÉPTICO",
        correct: true,
        compound: "Etanol ou isopropanol",
        formula: "C₂H₆O ou C₃H₈O",
        structure: "CH₃–CH₂–OH ou CH₃–CHOH–CH₃",
        organicFunction: "Álcool",
        explanation:
          "Correto! Antissépticos alcoólicos podem usar etanol ou isopropanol. Ambos apresentam hidroxila ligada a carbono saturado e pertencem à função álcool.",
        color: "#487bd8",
        icon: "spray",
        x: 718,
        y: 266
      },
      {
        id: "acetone",
        name: "Removedor à base de acetona",
        shortLabel: "REMOVEDOR",
        correct: false,
        compound: "Acetona (propanona)",
        formula: "C₃H₆O",
        structure: "CH₃–CO–CH₃",
        organicFunction: "Cetona",
        explanation:
          "A acetona pertence à função cetona porque apresenta uma carbonila ligada a dois átomos de carbono. Por isso, o removedor à base de acetona não atende à missão.",
        color: "#9a72d5",
        icon: "bottle",
        x: 858,
        y: 266
      },
      {
        id: "oil",
        name: "Óleo vegetal",
        shortLabel: "ÓLEO\nVEGETAL",
        correct: false,
        compound: "Triacilgliceróis",
        formula: "Variável conforme os ácidos graxos",
        structure: "R–COO–CH₂ / R–COO–CH / R–COO–CH₂",
        organicFunction: "Éster",
        explanation:
          "Óleos vegetais são formados predominantemente por triacilgliceróis, moléculas que apresentam ligações éster. Eles não representam a função álcool nesta missão.",
        color: "#e2a01c",
        icon: "oil",
        x: 998,
        y: 266
      },
      {
        id: "salt",
        name: "Sal de cozinha",
        shortLabel: "SAL",
        correct: false,
        compound: "Cloreto de sódio",
        formula: "NaCl",
        structure: "Na⁺ Cl⁻",
        organicFunction: "Composto iônico",
        explanation:
          "O sal de cozinha é cloreto de sódio, um composto iônico. Não é uma substância orgânica e não pertence à função álcool.",
        color: "#5aa3d6",
        icon: "box",
        x: 246,
        y: 402
      },
      {
        id: "soda",
        name: "Refrigerante",
        shortLabel: "REFRIGERANTE",
        correct: false,
        compound: "Mistura complexa",
        formula: "Não se aplica a uma mistura",
        structure: "Não possui fórmula estrutural única",
        organicFunction: "Não representa diretamente a função álcool",
        explanation:
          "Refrigerante é uma mistura complexa de água, açúcares ou edulcorantes, acidulantes, aromas e outros componentes. Ele não representa diretamente a função álcool.",
        color: "#e45055",
        icon: "can",
        x: 454,
        y: 402
      }
    ]
  };
})();
