# Manual do Usuário - JETFUEL-SIM

Bem-vindo ao **JETFUEL-SIM**, o sistema de gestão de combustível de aviação projetado para alta fidelidade, controle em tempo real e eficiência logística extrema. Este manual explica todas as seções do sistema, suas funções e as regras de negócio aplicadas.

---

## 1. Visão Geral do Sistema

O JETFUEL-SIM foi desenvolvido para atuar como um centro de comando (Dashboard de Missão Crítica) para operações de abastecimento de aeronaves em solo. Ele permite o monitoramento de frotas (Servidores e CTAs), gestão da equipe de operadores, acompanhamento da malha aérea e controle de volume de combustível.

**Princípios de Design:**
- **High Fidelity & Dark Mode:** Interface baseada em tons escuros (Slate-900) com contrastes fortes (Emerald, Red, Amber) para reduzir a fadiga visual e destacar informações críticas.
- **Mínima Carga Cognitiva:** Informações agrupadas de forma lógica, com indicadores visuais claros.

---

## 2. Seções do Sistema

### 2.1. Monitor Frotas (Dashboard Principal)
Esta é a tela central do sistema, onde você acompanha o status em tempo real de todos os ativos móveis.

**O que faz:**
Exibe cards detalhados para cada veículo da frota, divididos em duas categorias principais:
- **Servidores:** Caminhões que bombeiam combustível diretamente da rede de hidrantes do aeroporto para a aeronave.
- **CTAs (Caminhões Tanque Abastecedores):** Caminhões que possuem tanque próprio (15.000L ou 20.000L) para abastecimento em áreas sem hidrantes ou setor VIP.

**Como funciona:**
Cada card de CTA exibe:
- **Identificação:** Prefixo do veículo e status atual (Disponível, Ocupado, Manutenção, etc.).
- **Indicador Visual de Volume (Tanque):** Um demonstrador gráfico que ilustra o nível de combustível atual.
- **Indicadores Numéricos:** Três blocos empilhados verticalmente mostrando os volumes em **LITROS**, **KG** e **LBS**.
  - **Contábil:** O volume bruto registrado no sistema.
  - **Real:** O volume utilizável (Volume Contábil subtraído o Volume Morto de 300L).

**Regras de Cores do Tanque (Por que as cores mudam?):**
O tanque muda de cor automaticamente para alertar o operador sobre o nível de combustível:
- **Verde (Emerald):** Nível de combustível >= 75%.
- **Azul:** Nível de combustível >= 50%.
- **Amarelo (Amber):** Nível de combustível > 5.000L e < 50%.
- **Vermelho Fixo:** Nível de combustível <= 5.000L (Nível crítico que exige atenção para reabastecimento).
- **Vermelho Pulsante + Alerta "V. MORTO":** Nível de combustível <= 300L. Indica que o combustível atingiu o Volume Morto (inutilizável). A fatia inferior do tanque é destacada.
- **Vermelho Pulsante + Ícone de Alerta:** Volume atual excede a capacidade máxima do tanque (Erro de leitura ou transbordo).

### 2.2. Malha (Malha Aérea)
**O que faz:**
Exibe a programação de voos (chegadas e partidas), permitindo que a equipe de solo antecipe a demanda de abastecimento.

**Como funciona:**
Lista os voos com seus respectivos prefixos de aeronave (ex: GOL B737-7/8, LATAM, AZUL), portões/posições de parada e horários previstos. A equipe pode usar essa tela para alocar Servidores ou CTAs preventivamente.

### 2.3. Radar & Aeródromo
**O que faz:**
Fornece uma visão espacial e logística do pátio do aeroporto.

**Como funciona:**
- **Radar:** Monitoramento em tempo real (telemetria) da posição exata de cada caminhão e aeronave.
- **Aeródromo:** Mapa interativo mostrando as posições de estacionamento (Stands/Gates), rede de hidrantes e ilhas de enchimento de CTAs.

### 2.4. Equipe (Gestão de Operadores)
**O que faz:**
Gerencia os operadores de abastecimento (motoristas e técnicos).

**Como funciona:**
Permite ver quem está em turno, qual veículo estão operando no momento e seu status (Ocupado, Disponível, Em Pausa). Facilita a designação rápida de um operador ocioso para um voo que acaba de pousar.

### 2.5. Relatórios & Mensagens
**O que faz:**
- **Relatórios:** Gera logs de abastecimento, histórico de manutenção dos veículos e métricas de performance (tempo de resposta, volume abastecido por turno).
- **Mensagens:** Chat integrado para comunicação em tempo real entre o Líder de Solo (Dispatcher) e os operadores nos caminhões.

---

## 3. Regras de Negócio e Fórmulas

- **Volume Morto:** Fixado em **300 Litros**. É a quantidade de combustível no fundo do tanque que não pode ser bombeada para a aeronave para evitar o envio de impurezas ou água decantada.
- **Volume Real:** `Volume Contábil - 300L`.
- **Conversão para KG:** `Volume * Densidade` (A densidade padrão varia, mas é ajustável no painel superior, ex: 0.803).
- **Conversão para LBS (Libras):** `KG * 2.20462`.
- **Frota GOL:** Todos os voos da Gol Linhas Aéreas utilizam o prefixo "RG" (ex: RG-1234) no sistema de chamadas, respeitando a padronização interna.

---

## 4. Como Exportar/Fazer Backup do Sistema

Como o JETFUEL-SIM roda em um ambiente de desenvolvimento em nuvem (AI Studio), você pode gerar um backup completo do código-fonte a qualquer momento:

1. Acesse o menu de **Configurações (Settings)** ou clique no ícone de opções no painel do AI Studio.
2. Selecione a opção **Export to ZIP** (Exportar para ZIP) ou **Export to GitHub**.
3. O download do arquivo `.zip` será iniciado, contendo toda a estrutura de pastas, componentes React, banco de dados local e configurações do Tailwind CSS.

---
*JETFUEL-SIM - Engenharia de Dados e Alta Fidelidade Operacional.*
