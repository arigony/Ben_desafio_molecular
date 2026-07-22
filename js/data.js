(function () {
  "use strict";

  const models = {
    ethanol: `9
Etanol
C -0.748 0.000 0.000
C 0.748 0.000 0.000
O 1.421 1.170 0.000
H -1.120 -0.520 0.890
H -1.120 -0.520 -0.890
H -1.120 1.030 0.000
H 1.110 -0.520 0.890
H 1.110 -0.520 -0.890
H 2.360 1.030 0.000`,
    isopropanol: `12
Isopropanol
C 0.000 0.000 0.000
C -1.515 -0.210 0.000
C 1.515 -0.210 0.000
O 0.000 1.430 0.000
H 0.000 -0.540 0.920
H -1.920 0.230 0.910
H -1.920 0.230 -0.910
H -1.790 -1.280 0.000
H 1.920 0.230 0.910
H 1.920 0.230 -0.910
H 1.790 -1.280 0.000
H 0.000 1.830 0.890`,
    aceticAcid: `8
Ácido acético
C -0.770 0.000 0.000
C 0.735 0.000 0.000
O 1.390 1.075 0.000
O 1.360 -1.130 0.000
H -1.140 0.520 0.890
H -1.140 0.520 -0.890
H -1.140 -1.030 0.000
H 2.310 -0.980 0.000`,
    acetone: `10
Acetona
C 0.000 0.000 0.000
O 0.000 1.225 0.000
C -1.485 -0.430 0.000
C 1.485 -0.430 0.000
H -1.850 0.010 0.930
H -1.850 0.010 -0.930
H -1.720 -1.500 0.000
H 1.850 0.010 0.930
H 1.850 0.010 -0.930
H 1.720 -1.500 0.000`,
    sodiumChloride: `2
Par iônico simplificado de cloreto de sódio
Na -1.180 0.000 0.000
Cl 1.180 0.000 0.000`,
    esterFragment: `11
Fragmento didático de ligação éster
C -1.850 0.000 0.000
C -0.380 0.000 0.000
O 0.280 1.080 0.000
O 0.270 -1.120 0.000
C 1.700 -1.120 0.000
H -2.220 0.520 0.890
H -2.220 0.520 -0.890
H -2.220 -1.030 0.000
H 2.060 -1.650 0.890
H 2.060 -1.650 -0.890
H 2.060 -0.080 0.000`
  };

  const quizQuestion = "Qual é a função orgânica principal deste composto?";
  const optionCatalog = {
    alcohol: "Álcool",
    phenol: "Fenol",
    ether: "Éter",
    ketone: "Cetona",
    aldehyde: "Aldeído",
    carboxylicAcid: "Ácido carboxílico",
    ester: "Éster",
    amine: "Amina",
    ionic: "Composto iônico — não é função orgânica",
    mixture: "Mistura — sem função orgânica única"
  };

  function createQuiz(correctOptionId, optionIds, hints, structuralEvidence, commercialRelation) {
    return {
      question: quizQuestion,
      options: optionIds.map((id) => ({ id, label: optionCatalog[id] })),
      correctOptionId,
      hints,
      structuralEvidence,
      commercialRelation
    };
  }

  window.BEN_GAME_DATA = {
    mission: {
      title: "Missão 1 — Encontre produtos relacionados aos álcoois",
      objective:
        "Ajude Ben a encontrar produtos que contenham compostos pertencentes à função álcool ou que utilizem o etanol como componente importante.",
      required: 3,
      scoring: {
        correctWithoutHint: 100,
        correctAfterOneHint: 80,
        correctAfterTwoHints: 60,
        incorrectPenalty: 15
      }
    },
    models,
    products: [
      {
        id: "alcohol-gel",
        name: "Álcool em gel",
        shortLabel: "ÁLCOOL\nEM GEL",
        correct: true,
        compound: "Etanol (composto de referência)",
        formula: "C₂H₆O",
        formulaAccessible: "C dois H seis O",
        structure: "CH₃–CH₂–OH",
        organicFunction: "Álcool",
        functionalGroup: "Hidroxila",
        functionalGroupSymbol: "–OH",
        highlight: "–OH",
        commercialNature:
          "Mistura comercial em gel, formada por álcool, água, espessantes e outros componentes.",
        representationScope:
          "A fórmula C₂H₆O e a estrutura CH₃–CH₂–OH correspondem ao etanol relacionado, não ao álcool em gel inteiro.",
        explanation:
          "O etanol apresenta uma hidroxila (–OH) ligada a carbono saturado e pertence à função álcool. Formulações comerciais também contêm água, espessantes e outros componentes.",
        quiz: createQuiz(
          "alcohol",
          ["alcohol", "phenol", "ether", "ketone"],
          ["Procure um átomo de oxigênio ligado a um hidrogênio.", "Observe que o grupo –OH está ligado a um carbono saturado."],
          "A estrutura apresenta uma hidroxila (–OH) ligada diretamente a um carbono saturado.",
          "O etanol é o agente antisséptico relacionado ao álcool em gel; o produto comercial também contém água, espessante e outros componentes."
        ),
        color: "#39bca7",
        icon: "gel",
        standId: "personal-care",
        modelKeys: ["ethanol"],
        x: 730,
        y: 262
      },
      {
        id: "perfume",
        name: "Perfume",
        shortLabel: "PERFUME",
        correct: true,
        compound: "Etanol usado como solvente relacionado",
        formula: "C₂H₆O",
        formulaAccessible: "C dois H seis O",
        structure: "CH₃–CH₂–OH",
        organicFunction: "Álcool",
        functionalGroup: "Hidroxila",
        functionalGroupSymbol: "–OH",
        highlight: "–OH",
        commercialNature:
          "Mistura comercial de solventes e substâncias aromáticas; muitos perfumes utilizam etanol.",
        representationScope:
          "A fórmula C₂H₆O e a estrutura CH₃–CH₂–OH correspondem ao etanol relacionado, não ao perfume inteiro.",
        explanation:
          "Muitos perfumes utilizam etanol como solvente. Sua hidroxila ligada a carbono saturado caracteriza a função álcool.",
        quiz: createQuiz(
          "alcohol",
          ["ether", "alcohol", "aldehyde", "ester"],
          ["Identifique o grupo que contém oxigênio e hidrogênio juntos.", "O –OH aparece ligado a um carbono saturado da cadeia."],
          "A hidroxila (–OH) está ligada a carbono saturado na estrutura do etanol.",
          "O etanol é usado como solvente em muitos perfumes e ajuda a dissolver e dispersar substâncias aromáticas."
        ),
        color: "#d268b4",
        icon: "perfume",
        standId: "hygiene-beauty",
        modelKeys: ["ethanol"],
        x: 245,
        y: 262
      },
      {
        id: "vinegar",
        name: "Vinagre",
        shortLabel: "VINAGRE",
        correct: false,
        compound: "Ácido acético (ácido etanoico)",
        formula: "C₂H₄O₂",
        formulaAccessible: "C dois H quatro O dois",
        structure: "CH₃–COOH",
        organicFunction: "Ácido carboxílico",
        functionalGroup: "Carboxila",
        functionalGroupSymbol: "–COOH",
        highlight: "–COOH",
        commercialNature:
          "Mistura homogênea: solução aquosa que contém ácido acético e outros componentes em pequenas quantidades.",
        representationScope:
          "A fórmula C₂H₄O₂ e a estrutura CH₃–COOH correspondem ao ácido acético relacionado, não ao vinagre inteiro.",
        explanation:
          "O vinagre contém ácido acético. A carboxila (–COOH) caracteriza um ácido carboxílico, não um álcool.",
        quiz: createQuiz(
          "carboxylicAcid",
          ["alcohol", "carboxylicAcid", "aldehyde", "ester"],
          ["Observe o carbono ligado a dois oxigênios.", "A extremidade –COOH reúne carbonila e hidroxila no mesmo carbono."],
          "A estrutura contém o grupo carboxila (–COOH), com carbonila e hidroxila no mesmo carbono.",
          "O ácido acético é o composto responsável pela acidez e pelo odor característico do vinagre, que é uma solução aquosa."
        ),
        color: "#f0b54d",
        icon: "bottle",
        standId: "grocery",
        modelKeys: ["aceticAcid"],
        x: 225,
        y: 372
      },
      {
        id: "antiseptic",
        name: "Antisséptico alcoólico",
        shortLabel: "ANTISSÉPTICO",
        correct: true,
        compound: "Etanol ou isopropanol",
        formula: "C₂H₆O ou C₃H₈O",
        formulaAccessible: "C dois H seis O ou C três H oito O",
        structure: "CH₃–CH₂–OH ou CH₃–CH(OH)–CH₃",
        organicFunction: "Álcool",
        functionalGroup: "Hidroxila",
        functionalGroupSymbol: "–OH",
        highlight: "OH",
        commercialNature:
          "Mistura comercial que pode usar etanol ou isopropanol como agente antisséptico, além de água e outros componentes.",
        representationScope:
          "As fórmulas e estruturas apresentadas correspondem aos dois álcoois relacionados possíveis, não ao antisséptico inteiro.",
        explanation:
          "Antissépticos alcoólicos podem usar etanol ou isopropanol. Ambos têm hidroxila ligada a carbono saturado e pertencem à função álcool.",
        quiz: createQuiz(
          "alcohol",
          ["alcohol", "phenol", "ketone", "amine"],
          ["As duas estruturas possíveis possuem o mesmo grupo com oxigênio e hidrogênio.", "Em ambos os compostos, a hidroxila está ligada a carbono saturado."],
          "Tanto o etanol quanto o isopropanol apresentam hidroxila (–OH) ligada a carbono saturado.",
          "Etanol ou isopropanol podem ser os agentes antissépticos da formulação comercial, acompanhados de água e outros componentes."
        ),
        color: "#487bd8",
        icon: "spray",
        standId: "personal-care",
        modelKeys: ["ethanol", "isopropanol"],
        modelLabels: ["Etanol", "Isopropanol"],
        x: 920,
        y: 262
      },
      {
        id: "acetone",
        name: "Removedor à base de acetona",
        shortLabel: "REMOVEDOR",
        correct: false,
        compound: "Acetona (propanona)",
        formula: "C₃H₆O",
        formulaAccessible: "C três H seis O",
        structure: "CH₃–C(=O)–CH₃",
        organicFunction: "Cetona",
        functionalGroup: "Carbonila de cetona",
        functionalGroupSymbol: "C=O",
        highlight: "C(=O)",
        commercialNature:
          "Mistura comercial à base de acetona; a formulação pode incluir água, fragrâncias e outros solventes.",
        representationScope:
          "A fórmula C₃H₆O e a estrutura CH₃–C(=O)–CH₃ correspondem à acetona relacionada, não ao removedor inteiro.",
        explanation:
          "A carbonila ligada a dois átomos de carbono caracteriza uma cetona. Por isso, a acetona não atende à missão dos álcoois.",
        quiz: createQuiz(
          "ketone",
          ["aldehyde", "ketone", "alcohol", "ether"],
          ["Procure uma ligação dupla entre carbono e oxigênio.", "A carbonila está entre dois grupos de carbono, e não na extremidade da cadeia."],
          "A carbonila (C=O) está ligada a dois carbonos, característica estrutural de cetonas.",
          "A acetona é um solvente presente em alguns removedores; o produto comercial pode conter também água, fragrância e outros solventes."
        ),
        color: "#9a72d5",
        icon: "bottle",
        standId: "hygiene-beauty",
        modelKeys: ["acetone"],
        x: 445,
        y: 262
      },
      {
        id: "oil",
        name: "Óleo vegetal",
        shortLabel: "ÓLEO\nVEGETAL",
        correct: false,
        compound: "Triacilgliceróis",
        formula: "Sem fórmula molecular única",
        formulaAccessible: "Sem fórmula molecular única",
        structure: "Fragmento geral: R–COO–R′",
        organicFunction: "Éster",
        functionalGroup: "Ligação éster",
        functionalGroupSymbol: "–COO–",
        highlight: "–COO–",
        commercialNature:
          "Mistura natural formada predominantemente por diferentes triacilgliceróis.",
        representationScope:
          "O fragmento R–COO–R′ representa uma ligação éster presente nos triacilgliceróis; não é a estrutura do óleo vegetal inteiro.",
        explanation:
          "Óleos vegetais são formados predominantemente por triacilgliceróis, que contêm ligações éster. Eles não representam a função álcool nesta missão.",
        quiz: createQuiz(
          "ester",
          ["ether", "ester", "carboxylicAcid", "alcohol"],
          ["Observe um carbono ligado por dupla a oxigênio e também por ligação simples a outro oxigênio.", "O fragmento característico é R–COO–R′."],
          "Os triacilgliceróis contêm ligações –COO– entre resíduos de ácidos graxos e glicerol.",
          "Óleos vegetais são misturas de triacilgliceróis; o fragmento exibido representa uma das ligações éster dessas moléculas."
        ),
        viewerNote: "Fragmento didático, não molécula completa do óleo.",
        color: "#e2a01c",
        icon: "oil",
        standId: "grocery",
        modelKeys: ["esterFragment"],
        x: 390,
        y: 372
      },
      {
        id: "salt",
        name: "Sal de cozinha",
        shortLabel: "SAL",
        correct: false,
        compound: "Cloreto de sódio",
        formula: "NaCl",
        formulaAccessible: "Na Cl, cloreto de sódio",
        structure: "Na⁺  Cl⁻",
        organicFunction: "Composto iônico",
        functionalGroup: "Não possui grupo funcional orgânico",
        functionalGroupSymbol: "Não se aplica",
        highlight: "",
        commercialNature:
          "Produto predominantemente constituído por cloreto de sódio; versões comerciais podem conter iodo e antiumectantes.",
        representationScope:
          "A fórmula NaCl e os íons Na⁺ e Cl⁻ representam o cloreto de sódio relacionado, não eventuais aditivos do produto comercial.",
        explanation:
          "O cloreto de sódio é um composto iônico, não uma substância orgânica e não pertence à função álcool.",
        quiz: createQuiz(
          "ionic",
          ["alcohol", "amine", "ionic", "carboxylicAcid"],
          ["A representação mostra partículas com cargas opostas.", "Não há cadeia carbônica nem grupo funcional orgânico: aparecem Na⁺ e Cl⁻."],
          "A representação contém íons Na⁺ e Cl⁻ e não apresenta cadeia carbônica ou grupo funcional orgânico.",
          "O sal de cozinha é constituído principalmente por cloreto de sódio, um composto iônico."
        ),
        viewerNote: "Representação didática de um par iônico simplificado.",
        color: "#5aa3d6",
        icon: "box",
        standId: "grocery",
        modelKeys: ["sodiumChloride"],
        x: 555,
        y: 372
      },
      {
        id: "soda",
        name: "Refrigerante",
        shortLabel: "REFRIGERANTE",
        correct: false,
        compound: "Mistura complexa",
        formula: "Sem fórmula molecular única",
        formulaAccessible: "Sem fórmula molecular única",
        structure: "Não possui fórmula estrutural única",
        organicFunction: "Mistura; sem função orgânica única",
        functionalGroup: "Não se aplica à mistura completa",
        functionalGroupSymbol: "Não se aplica",
        highlight: "",
        commercialNature:
          "Mistura comercial de água carbonatada, açúcares ou edulcorantes, acidulantes, aromas e outros componentes.",
        representationScope:
          "Não existe uma única fórmula molecular ou estrutura condensada que represente o refrigerante inteiro.",
        explanation:
          "Refrigerante é uma mistura de água, açúcares ou edulcorantes, acidulantes, aromas e outros componentes. Não representa diretamente a função álcool.",
        quiz: createQuiz(
          "mixture",
          ["alcohol", "carboxylicAcid", "ester", "mixture"],
          ["Pergunte se todo o produto pode ser representado por uma única molécula.", "Água, açúcares, acidulantes e aromas formam um conjunto de substâncias."],
          "O produto completo não possui uma única estrutura: é formado por diferentes substâncias.",
          "O refrigerante é uma mistura comercial de água, açúcares ou edulcorantes, acidulantes, aromas e outros componentes."
        ),
        viewerNote: "Mistura complexa — não existe uma única estrutura molecular que represente o produto.",
        color: "#e45055",
        icon: "can",
        standId: "beverages",
        modelKeys: [],
        x: 790,
        y: 372
      }
    ]
  };
})();
