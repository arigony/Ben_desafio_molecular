# Registro de testes

Data: **22 de julho de 2026**

## Resultado automatizado

Comando executado:

```bash
node tests/run-tests.mjs
```

Resultado final: **72/72 verificações aprovadas**.

A suíte executa `data.js`, `game.js` e `molecule3d.js` com DOM/Canvas simulados e também inspeciona a integração estática de HTML, CSS e JavaScript.

| Área | Verificações executadas |
| --- | --- |
| Interação | `KeyE`, Espaço, Enter, bloqueio de `repeat`, uma interação por keydown, ausência de produto próximo |
| Análise | abertura sem pontos, pergunta exata, quatro alternativas, classificação oculta e duas pistas configuráveis |
| Respostas | correta sem pista (+100), com uma (+80), com duas (+60), incorreta (−15) e piso zero |
| Revisão | acesso direto à resposta e explicação, nova resposta opcional, preservação da primeira tentativa e ausência de repontuação ou novos erros |
| Estado | respostas por produto, itens revisados, reinício completo e execução com `mission.required` igual a 2 |
| Movimento | separação Ben/carrinho, distâncias, profundidade, hitboxes, colisão do carrinho |
| Animação | `walkTime`, parada, `wheelAngle`, parada e sentidos opostos |
| Química | fórmulas conferidas, subscritos HTML, classificações, símbolos funcionais e contagens XYZ dos seis modelos |
| Feedback | rótulo explícito de produto comercial, natureza da mistura, escopo da representação e destaque não dependente apenas de cor |
| 3D | versão explícita da CDN, modal e fallback sem 3Dmol/WebGL |
| Fluxo | controles móveis, botão Analisar, cronômetro pausado, caixa bloqueado e resultado final sem bônus paralelo |
| Interface responsiva | HUD completo, gaveta móvel, painel desktop recolhível, foco preso/restaurado, safe areas, botões de 48 px, orientação e ponteiros coarse |
| Cenário flat 3D | quatro estandes setorizados, caixa, produtos sobre prateleiras, destaque por proximidade e unidade Ben–carrinho |
| Asset do Ben | WebP válido e menor, PNG preservado, dimensões intrínsecas, carregamento lazy e reutilização da imagem pelo Canvas |
| Navegação e colisão | malha navegável, acesso a todos os produtos, interação em cada estande e chegada ao caixa |
| Desempenho | cenário estático reutilizado, ausência de gradientes/ordenações por frame, pausa do loop e `devicePixelRatio` limitado a 2 |
| Publicação | caminhos relativos, `index.html` na raiz, PNG e LICENSE preservados |

## Verificação científica do conteúdo

As fórmulas e classificações foram comparadas com os registros do PubChem para [etanol, CID 702](https://pubchem.ncbi.nlm.nih.gov/compound/702), [isopropanol, CID 3776](https://pubchem.ncbi.nlm.nih.gov/compound/3776), [ácido acético, CID 176](https://pubchem.ncbi.nlm.nih.gov/compound/176), [acetona, CID 180](https://pubchem.ncbi.nlm.nih.gov/compound/180), [cloreto de sódio, CID 5234](https://pubchem.ncbi.nlm.nih.gov/compound/5234) e [trioleína como exemplo de triacilglicerol, CID 5497163](https://pubchem.ncbi.nlm.nih.gov/compound/5497163).

Também foram conferidos o uso de etanol ou isopropanol em formulações antissépticas nas [formulações recomendadas pela OMS](https://www.who.int/publications/i/item/WHO-IER-PSP-2010.5) e a natureza multicomponente dos [refrigerantes descrita pela FDA](https://www.fda.gov/food/buy-store-serve-safe-food/carbonated-soft-drinks-what-you-should-know).

Resultados específicos desta etapa:

- `C₂H₆O`, `C₃H₆O` e `C₂H₄O₂` são renderizadas com elementos HTML `<sub>`;
- o texto acessível anuncia as fórmulas sem depender da aparência dos subscritos;
- o painel anterior à resposta não contém a classificação nem o grupo funcional;
- após a resposta, álcool mostra `–OH`, cetona `C=O`, ácido carboxílico `–COOH` e éster `–COO–`;
- produtos comerciais multicomponentes informam que são misturas e delimitam qual composto ou fragmento está sendo representado;
- contorno, fundo, sublinhado e rótulo textual acompanham o destaque por cor.

## Validação visual da fase 2

Ambiente: Chromium do navegador integrado, servido por HTTP local sem etapa de build.

Foram verificados os cinco viewports solicitados. Em todos eles, o documento permaneceu exatamente no tamanho da viewport, com `overflow: hidden`, sem rolagem indesejada ou sobreposição real no HUD.

- o HUD preservou pontuação, tempo, progresso, pausa, áudio e o botão **Lista**;
- pausa e áudio mediram `48 × 48 px`; **Lista** mediu `60 × 48 px` no celular e `68 × 48 px` no desktop;
- a lista móvel abriu como gaveta inferior, fechou pelo botão dedicado e devolveu o foco ao botão **Lista**;
- a gaveta mostrou um produto resolvido com `Função: Álcool` e `CH₃–CH₂–OH`, mantendo os dois itens pendentes explicitamente não resolvidos;
- no desktop, o painel lateral mediu `230 px`; ao recolhê-lo, o Canvas cresceu de `1008 px` para `1252 px` em `1280 × 720`;
- o painel de investigação abriu por teclado, manteve quatro alternativas, rolou internamente e deixou as ações visíveis;
- o fechamento da investigação restaurou o foco ao elemento que a precedeu;
- em `844 × 390`, o painel de investigação mediu `818,7 × 346,4 px`, teve `561 px` de conteúdo rolável e todos os seus botões mediram `48 px` de altura;
- em `390 × 844`, o painel mediu `374,4 × 800 px`, com `975 px` de conteúdo rolável e controles de `48 px`.

Medições do layout principal:

| Viewport | Área jogável / lista | Resultado |
| --- | --- | --- |
| 390 × 844 | Canvas `376,4 × 501,9 px`; gaveta `374,4 × 385,5 px` | Aprovado |
| 430 × 932 | Canvas `416,4 × 555,2 px`; gaveta fechada fora da área visível | Aprovado |
| 844 × 390 | Canvas `830 × 318,4 px`; gaveta `844 × 264,8 px` | Aprovado |
| 1280 × 720 | Canvas `1008 × 618 px`; painel lateral `230 × 618 px` | Aprovado |
| 1920 × 1080 | Canvas `1648 × 978 px`; painel lateral `230 × 978 px` | Aprovado |

## Validação visual da fase 3

O cenário flat 3D foi percorrido no navegador integrado. Ben saiu da entrada, atravessou o corredor central e chegou à área de interação da Mercearia usando somente as teclas direcionais. O estande inteiro recebeu destaque luminoso, o produto permaneceu sobre a prateleira e a ficha **Analisar produto** apareceu normalmente.

Foram observados:

- quatro estandes com base, faces laterais, profundidade, prateleiras, placa setorial, produtos e sombra;
- Caixa visualmente separado, com balcão, esteira e terminal;
- Ben sobreposto parcialmente ao carrinho, com alça conectada e ambos movidos pela mesma posição lógica;
- itens coletados renderizados no interior do carrinho;
- cenário estático construído uma vez por densidade de tela e reutilizado nos frames seguintes;
- troca entre câmera móvel vertical e visão completa horizontal sem alterar a malha de colisão;
- nenhuma mensagem de erro ou aviso no console durante carregamento, navegação, mudança de viewport e interação.

| Viewport | Área do Canvas | Documento | Resultado |
| --- | --- | --- | --- |
| 390 × 844 | `376,4 × 501,9 px`, câmera vertical | `390 × 844`, sem rolagem | Aprovado |
| 430 × 932 | `416,4 × 555,2 px`, câmera vertical | `430 × 932`, sem rolagem | Aprovado |
| 844 × 390 | `830 × 318,4 px`, visão completa | `844 × 390`, sem rolagem | Aprovado |
| 1280 × 720 | contêiner `1008 × 618 px` | `1280 × 720`, sem rolagem | Aprovado |
| 1920 × 1080 | contêiner `1648 × 978 px` | `1920 × 1080`, sem rolagem | Aprovado |

## Auditoria final da branch `redesign-pedagogico-v1`

O percurso real no navegador cobriu tela inicial, instruções, missão, entrada no supermercado, WASD, setas, E, Espaço, Enter, investigação, respostas correta e incorreta, uma e duas pistas, revisão sem repontuação, lista molecular, pausa, áudio, conclusão da lista, caixa, resultado e reinício. A validação responsiva repetiu os cinco viewports registrados acima.

Falhas encontradas inicialmente:

- a posição inicial `x = 600` deixava Ben alguns pixels fora do eixo livre entre os estandes e bloqueava o primeiro movimento para cima;
- a investigação ocultava seu acionador antes de registrá-lo, fazendo o foco voltar ao `body` ao fechar o painel aberto pelo botão móvel;
- um toque direcional muito curto podia terminar antes do próximo frame e não gerar deslocamento;
- o estado efetivo do loop de animação não estava exposto para inspeção do navegador.

Correções e regressões adicionadas:

- entrada reposicionada em `x = 630`, com movimento imediato por `W` ou seta para cima;
- acionador preservado antes de ocultar o prompt e foco inicial/restauração realizados de modo determinístico;
- `pointerdown` aplica um pequeno deslocamento imediato e continua sustentando o movimento enquanto pressionado, sem mover durante pausa ou sobreposições;
- `data-animation-active` acompanha o agendamento real do Canvas e fica `false` em investigação, lista móvel, pausa e resultado;
- teste científico integral dos oito produtos e suas fórmulas, classificações e pertinência à missão.

Resultado após as correções: **72/72 verificações automatizadas aprovadas**.

## Limitações declaradas

- `pointer: coarse` e `any-pointer: coarse` são cobertos pela suíte e pelo CSS responsivo, mas não houve aparelho capacitivo físico nesta validação.
- As safe areas foram verificadas pela presença e aplicação das regras CSS; o ambiente não emulou o recorte físico de um iPhone.
- O estado e os controles de áudio foram testados, mas a audibilidade não foi avaliada por uma pessoa.
- Não foram testados navegadores legados.
