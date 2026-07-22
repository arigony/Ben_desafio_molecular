# Ben: Desafio Molecular no Supermercado

Jogo educacional em HTML5 no qual Ben explora um supermercado 2.5D, investiga compostos presentes no cotidiano e identifica suas funções orgânicas.

## Objetivo pedagógico

A missão aproxima as funções orgânicas do cotidiano. O estudante observa produto comercial, composto relacionado, fórmula molecular, estrutura condensada e modelo 3D antes de responder. Somente depois da resposta, o feedback revela a classificação, destaca o grupo funcional e explica a evidência estrutural e a relação comercial.

Produtos comerciais são apresentados com o devido cuidado científico: perfume, antisséptico, álcool em gel, óleo e refrigerante são misturas, não substâncias puras.

## Fluxo do jogo

1. Explore com `WASD`, setas ou controle móvel.
2. Aproxime-se de um produto.
3. Pressione `E`, `Espaço`, `Enter` ou **Analisar**.
4. Observe fórmula, estrutura e representação molecular.
5. Escolha uma das quatro alternativas ou use até duas pistas.
6. Leia o feedback científico com o grupo funcional destacado.
7. Reabra produtos já analisados para acessar diretamente a resposta e a explicação, sem alterar a pontuação.
8. Complete a quantidade definida em `mission.required` e finalize no caixa.

Pontuação:

- resposta correta sem pista: **+100**;
- resposta correta após uma pista: **+80**;
- resposta correta após duas pistas: **+60**;
- resposta incorreta: **−15**, sem permitir pontuação negativa;
- cada produto pontua somente na primeira resposta; revisões diretas ou com nova resposta são neutras.

O objetivo usa `mission.required` e conta somente os produtos relacionados à missão depois de analisados.

## Recursos

- Canvas 2D em estilo flat 3D/pseudo-isométrico, com piso em perspectiva e cenário pré-renderizado;
- estandes setorizados de Higiene e beleza, Cuidados pessoais, Mercearia, Bebidas e Caixa;
- produtos posicionados nas prateleiras e estande iluminado quando Ben entra na área de investigação;
- personagem oficial `assets/ben.png`, com recorte em memória, passo alternado e balanço independente de FPS;
- Ben e carrinho tratados como uma unidade visual, com rodas, oscilação, celebração e produtos coletados dentro do cesto;
- ficha de proximidade com composto, fórmula, estrutura e chamada **Analisar produto**;
- perguntas, quatro alternativas, pistas e explicações configuráveis em `js/data.js`;
- modal de análise acessível que pausa movimento e cronômetro;
- fórmulas moleculares com subscritos HTML e descrições próprias para leitores de tela;
- grupo funcional revelado somente após a resposta, com símbolo, contorno, fundo e sublinhado;
- aviso explícito quando a representação corresponde a um composto de uma mistura comercial, e não ao produto inteiro;
- HUD responsivo com pontuação, tempo, progresso, pausa, áudio e acesso à lista molecular;
- lista molecular em painel lateral compacto no desktop e gaveta inferior no celular;
- foco preso nos painéis modais, restauração de foco e áreas de toque de pelo menos 48 × 48 px;
- 3Dmol.js 2.5.5 carregado por CDN, com um único visualizador reutilizado;
- fallback de estrutura condensada caso CDN ou WebGL estejam indisponíveis;
- controles de teclado, mouse e toque;
- layout responsivo e compatível com GitHub Pages.
- densidade do Canvas ajustada ao `devicePixelRatio`, limitada a 2, e animação suspensa durante pausas, painéis e segundo plano.

Modelos XYZ locais:

- etanol;
- isopropanol;
- ácido acético;
- acetona;
- cloreto de sódio como par iônico simplificado;
- fragmento didático de ligação éster.

Perfume e álcool em gel usam etanol. O antisséptico permite alternar entre etanol e isopropanol. O óleo mostra apenas o fragmento didático de éster. Refrigerante exibe a explicação de que não existe uma estrutura molecular única para a mistura.

## Estrutura

```text
index.html            Telas, HUD e modais acessíveis
style.css             Direção visual e responsividade
js/
  data.js             Missão, produtos e modelos XYZ
  molecule3d.js       Visualizador 3D reutilizável e fallback
  ui.js               Telas, análise, feedback e resultados
  game.js             Canvas, movimento, colisões, áudio e regras
tests/
  run-tests.mjs       72 verificações comportamentais, visuais, químicas e responsivas
assets/
  ben.webp            Imagem otimizada usada por navegadores compatíveis
  ben.png             Imagem oficial preservada como fallback
LICENSE               Licença MIT existente
TESTS.md              Registro da validação
```

## Executar localmente

Não há compilação ou instalação:

```bash
python -m http.server 8000
```

Acesse `http://localhost:8000`. A abertura direta de `index.html` também funciona; somente o carregamento do 3D depende de acesso à CDN, e sua ausência aciona o fallback.

Para os testes automatizados:

```bash
node tests/run-tests.mjs
```

## GitHub Pages

O `index.html` fica na raiz e todos os caminhos locais são relativos, portanto o projeto pode ser publicado por **Settings → Pages → Deploy from a branch**, usando `main` e `/ (root)`.

Endereço do projeto: <https://arigony.github.io/Ben_desafio_molecular/>

### Asset do Ben

A imagem permanece em `1024 × 1024`, resolução suficiente para o maior uso no HTML e para o recorte do Canvas. Navegadores compatíveis carregam `assets/ben.webp` em modo lossless; o PNG RGBA original permanece como fallback. O Canvas reutiliza a instância da imagem já carregada pela tela inicial, evitando uma segunda transferência do mesmo asset.

- PNG original: **1.620.497 bytes**;
- WebP lossless: **1.126.084 bytes**;
- redução por carregamento: **494.413 bytes (30,51%)**;
- canal alfa e pixels visíveis: preservados sem diferença.

## Acessibilidade

- operação por teclado e toque;
- foco visível e modais com foco inicial;
- `Escape` fecha a análise sem pontuar;
- feedback não depende apenas de cor: usa texto, contorno e sublinhado;
- conteúdo essencial também é exposto a tecnologias assistivas;
- pausa manual e ao ocultar a aba;
- `prefers-reduced-motion` respeitado;
- compreensão completa sem áudio.

## Créditos e licença

O personagem Ben usa a imagem oficial `assets/ben.png` fornecida no projeto e sua conversão lossless `assets/ben.webp`. O código permanece sob a licença MIT existente; eventuais termos próprios da imagem devem ser documentados separadamente.
