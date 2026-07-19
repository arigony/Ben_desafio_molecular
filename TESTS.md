# Registro de testes

Data: **19 de julho de 2026**

## Ambientes usados

- navegador integrado do Codex, Chromium, em `1280 × 720`;
- simulação de viewport vertical em `390 × 844`;
- simulação de viewport horizontal em `844 × 390`;
- servidor HTTP local sem cache;
- Node.js para o conjunto de verificações comportamentais em `tests/run-tests.mjs`.

## Resultado automatizado

Comando executado:

```bash
node tests/run-tests.mjs
```

Resultado: **18 de 18 verificações aprovadas**.

O conjunto automatizado executa o código real de dados e regras com uma camada mínima que simula DOM e Canvas. Ele verifica arquivos, PNG RGBA, carregamento dos scripts, movimento, controles virtuais, interação, colisões, coleta, repetição, pontos, cronômetro, feedbacks, caixa, reinício, pausa, som, breakpoints e estruturas químicas.

## Testes no navegador

| # | Verificação | Resultado e evidência |
| --- | --- | --- |
| 1 | Abertura de `index.html` | Aprovado por servidor local: HTTP 200, título correto e fluxo inicial renderizado. |
| 2 | Carregamento de `ben.png` | Aprovado: HTTP 200, `image/png`, 1.620.497 bytes e dimensões naturais de 1024 × 1024 nas quatro instâncias da página. |
| 3 | Erros graves no console | Aprovado: nenhum erro registrado durante o fluxo completo. |
| 4 | Movimento por WASD | Aprovado no navegador: uma entrada `W` alterou a coordenada vertical registrada pelo jogo. |
| 5 | Movimento pelas setas | Aprovado no navegador: `ArrowUp` alterou `y` de 620 para 612. |
| 6 | Controles móveis | Aprovado no teste comportamental e por inspeção responsiva. O navegador de teste não emulou `pointer: coarse`; toque físico não foi executado. |
| 7 | Interação por Espaço | Aprovado: coletou “Antisséptico alcoólico”, atualizou para 100 pontos e 1/3 item. |
| 8 | Interação por Enter | Aprovado: analisou acetona como incorreta e também coletou o álcool em gel. |
| 9 | Colisões | Aprovado no teste comportamental; a rota completa também exigiu contornar prateleiras e balcão do caixa. |
| 10 | Coleta de produtos | Aprovado para os três produtos corretos. |
| 11 | Bloqueio de repetição | Aprovado: uma segunda tentativa no antisséptico manteve 100 pontos e 1/3 item, sem reabrir feedback. |
| 12 | Pontuação | Aprovado: +100 em acerto, −25 em erro, +150 no caixa e bônus de tempo. O total final observado foi 529. |
| 13 | Cronômetro | Aprovado: avançou durante o jogo e permaneceu em 00:28 durante a pausa observada. |
| 14 | Feedback correto e incorreto | Aprovado: antisséptico exibiu etanol/isopropanol; removedor exibiu acetona, `CH₃–CO–CH₃` e penalidade. |
| 15 | Conclusão no caixa | Aprovado: o caixa só finalizou após 3/3 itens e exibiu a tela de resultado. |
| 16 | Reinício | Aprovado: “Jogar novamente” restaurou pontos, tempo, itens e posição inicial. |
| 17 | Pausa | Aprovado por botão e pelo teste de teclado; modal acessível e cronômetro interrompido. |
| 18 | Som | Controle de silenciar/ativar aprovado, incluindo `aria-pressed`. A audibilidade física não foi avaliada automaticamente. |
| 19 | Responsividade | Aprovado em desktop, 390 × 844 e 844 × 390, sem rolagem durante o jogo. A câmera móvel aproximou o mapa no modo vertical. |

## Fluxo completo percorrido

1. tela inicial;
2. instruções;
3. apresentação da missão;
4. entrada no supermercado;
5. movimento por teclado;
6. coleta correta com Espaço;
7. tentativa repetida bloqueada;
8. escolha incorreta com Enter;
9. coleta dos outros dois itens corretos;
10. tela de lista completa;
11. deslocamento até o caixa;
12. cálculo da classificação;
13. tela de resultado;
14. reinício da missão.

## Limites da validação

- O navegador automatizado não emulou uma tela capacitiva real; os eventos de direção por ponteiro foram executados no teste comportamental.
- O estado do Web Audio foi validado sem erros e o botão de som foi testado, mas o áudio não foi ouvido por uma pessoa.
- Não foram testados navegadores legados.
