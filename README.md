# Ben: Desafio Molecular no Supermercado

Jogo educacional em HTML5 no qual Ben explora um supermercado, empurra um carrinho e investiga produtos do cotidiano para reconhecer funções orgânicas.

Esta primeira versão apresenta a **Missão 1 — Encontre produtos relacionados aos álcoois**.

## Objetivo pedagógico

O jogo aproxima a classificação das funções orgânicas do cotidiano. Nesta missão, o estudante precisa reconhecer produtos que contenham compostos da função álcool ou usem etanol como componente importante, além de diferenciar álcool, cetona, ácido carboxílico, éster e composto iônico.

Os feedbacks reforçam que produtos comerciais são misturas e não correspondem necessariamente a uma única substância.

## Mecânica

1. Explore os corredores do supermercado.
2. Aproxime Ben de um produto.
3. Analise o produto com **Espaço**, **Enter** ou o botão virtual.
4. Leia o feedback com composto, fórmula molecular, estrutura condensada e função química.
5. Encontre os três produtos corretos.
6. Leve o carrinho ao caixa para finalizar.

Pontuação:

- produto correto: **+100 pontos**;
- produto incorreto: **−25 pontos**, sem permitir total abaixo de zero;
- lista completa: **+150 pontos** ao finalizar no caixa;
- bônus de tempo: até **+180 pontos**.

A classificação final usa três, duas ou uma molécula de acordo com precisão e tempo.

## Controles

| Ação | Computador | Dispositivo com toque |
| --- | --- | --- |
| Mover | `WASD` ou setas | Controle direcional |
| Interagir | `Espaço` ou `Enter` | Botão **Analisar** |
| Pausar/continuar | `P`, `Esc` ou botão `Ⅱ` | Botão `Ⅱ` |
| Ativar/silenciar | Botão `♪` | Botão `♪` |

O som só é habilitado após uma interação do usuário. Todas as informações também são apresentadas visualmente.

## Tecnologias

- HTML5 semântico;
- CSS3 responsivo;
- JavaScript moderno, sem framework;
- Canvas 2D para o supermercado e a jogabilidade;
- Web Audio API para efeitos originais;
- nenhuma dependência externa, API, banco de dados ou servidor.

Canvas 2D puro foi adotado no lugar de Phaser para manter esta primeira versão autocontida, permitir abertura direta por `index.html` e evitar que uma CDN indisponível bloqueie o jogo.

## Estrutura

```text
index.html       Telas e componentes acessíveis
style.css        Direção visual e responsividade
js/
  data.js        Missão, produtos e conteúdo científico
  ui.js          Telas, HUD, modais e resultados
  game.js        Loop Canvas, movimento, colisões, áudio e regras
tests/
  run-tests.mjs Verificações comportamentais
assets/
  ben.png        Imagem oficial do personagem
LICENSE          Licença do repositório
README.md        Este documento
TESTS.md         Registro da validação executada
```

## Como executar localmente

Não há etapa de instalação ou compilação.

Opção direta:

1. baixe ou clone o repositório;
2. abra `index.html` em um navegador moderno.

Opção com servidor local (recomendada para reproduzir o ambiente do GitHub Pages):

```bash
python -m http.server 8000
```

Depois acesse `http://localhost:8000`.

## Publicação no GitHub Pages

1. Envie a branch revisada para o GitHub.
2. Integre as alterações na branch escolhida para publicação apenas após a revisão.
3. Em **Settings → Pages**, selecione **Deploy from a branch**.
4. Escolha a branch e a pasta `/ (root)`.
5. Salve e aguarde o endereço publicado pelo GitHub.

Como `index.html` está na raiz e todos os caminhos são relativos, nenhuma configuração adicional é necessária.

## Testes

Execute as verificações automatizadas com:

```bash
node tests/run-tests.mjs
```

O relatório detalhado da validação desta versão está em [`TESTS.md`](TESTS.md).

## Acessibilidade

- uso completo por teclado;
- controles por toque em dispositivos compatíveis;
- foco visível;
- botões identificados por texto ou rótulo acessível;
- mensagens também expostas a tecnologias assistivas;
- contraste alto;
- pausa manual e automática ao ocultar a aba;
- preferência `prefers-reduced-motion` respeitada;
- compreensão completa sem áudio.

## Limitações desta primeira versão

- contém uma missão e uma função orgânica principal;
- não há salvamento de progresso ou ranking persistente;
- os produtos e o carrinho são ilustrações vetoriais feitas no Canvas;
- não há narração ou música de fundo;
- no modo vertical, a câmera acompanha Ben e mostra apenas parte do supermercado de cada vez;
- controles de toque e áudio ainda precisam de uma rodada adicional em aparelhos físicos variados.

## Próximos passos

- adicionar missões para hidrocarbonetos, aldeídos, cetonas, ácidos carboxílicos, ésteres e aminas;
- criar níveis de dificuldade e modo de revisão;
- incluir mais mapas e produtos;
- adicionar opção de alto contraste e remapeamento de controles;
- criar testes automatizados de regressão visual;
- persistir conquistas localmente, com consentimento do usuário.

## Créditos

- Personagem Ben: imagem oficial `assets/ben.png` fornecida no projeto.
- Concepção e conteúdo: projeto **Ben: Desafio Molecular**.
- Implementação visual, mecânica e sons: recursos originais desta versão.

## Licença sugerida

O repositório já inclui uma licença MIT. Para distribuição pública, recomenda-se manter a MIT para o código e documentar separadamente a autorização de uso da imagem oficial do Ben, caso ela possua termos próprios.
