# Manual do Usuário - MALHA

Bem-vindo ao **MALHA**, o sistema de gestão operacional de abastecimento de aeronaves para o Aeroporto Internacional de Guarulhos (SBGR). Este manual detalha todas as funcionalidades e como interagir com o sistema.

## 1. Visão Geral da Interface

A interface é dividida em três seções principais:
- **Cabeçalho Principal:** Contém o logotipo, relógio em tempo real, busca global e botão de sincronização.
- **Seção de Operadores do Turno:** Localizada logo abaixo do cabeçalho, permite gerenciar os operadores ativos no turno.
- **Malha Operacional (GridOps):** A seção central onde todos os voos são gerenciados através de abas de status.

## 2. Seção de Operadores do Turno

Nesta seção, você gerencia quem está trabalhando no momento.

### Como Adicionar um Operador:
1. No campo **"Adicione operador..."**, digite o nome de guerra do operador.
2. No campo **"Frota"**, digite o número do veículo.
3. Clique no botão **"SRV"** ou **"CTA"** para definir o tipo de veículo. O botão só fica disponível após digitar a frota.
4. Clique em **"ADICIONAR"**. O novo operador aparecerá no início da lista.

### Como Gerenciar Operadores:
- **Status:** Clique no status colorido (ex: DISPONÍVEL) para alternar entre os estados (DISPONÍVEL, OCUPADO, INTERVALO, ILHA, DESCONECTADO).
- **Remover:** Clique no ícone de lixeira para remover um operador do turno.

## 3. Malha Operacional (GridOps)

A malha é organizada em abas que representam o ciclo de vida do abastecimento.

### Abas de Status:
- **GERAL:** Visão completa de todos os voos ativos.
- **CHEGADA:** Voos que acabaram de ser criados ou detectados.
- **FILA:** Voos aguardando designação de operador.
- **DESIGNADO:** Voos com operador atribuído, mas ainda não em atendimento.
- **AGUARDANDO:** Operador na posição aguardando a aeronave ou autorização.
- **ABASTECENDO:** Abastecimento em curso (exibe vazão em tempo real).
- **FINALIZADOS:** Histórico de voos concluídos no turno.

### Interações em Voos:
- **Designar:** Na aba FILA, clique no botão azul **"DESIGNAR"** para abrir o modal de seleção rápida de operadores disponíveis.
- **Detalhes:** Clique em qualquer linha de voo para abrir o modal de detalhes completo.
- **Ações Rápidas:** Use os botões na coluna "AÇÕES" para avançar o status do voo (ex: Enviar para Fila, Iniciar Abastecimento, Finalizar).

## 4. Busca e Filtros

### Busca Global:
- Localizada no cabeçalho principal.
- Ao pesquisar, o sistema filtra os resultados com base na seção ativa.
- Se você estiver na aba "GERAL", buscará por voos.
- Se você estiver na seção "Operadores do Turno", buscará por nome ou frota.

## 5. Modal de Detalhes do Voo

Ao clicar em um voo, você pode:
- **Editar Horários:** Clique nos horários de ETA ou Calço para editar.
- **Alterar Posição:** Clique na posição (ex: 123) para mudar.
- **Gerenciar Operadores:** Altere o operador principal ou adicione um operador de apoio.
- **Logs:** Visualize a "Caixa Preta" do voo com todos os eventos registrados.
- **Finalizar/Cancelar:** Botões para encerrar a operação do voo.

## 6. Sincronização (Botão Sinc)

O sistema utiliza sincronização em tempo real (Firebase). O botão **"SINC"** no cabeçalho serve para garantir que todos os dados locais foram persistidos e para forçar uma atualização visual da malha.

---
*MALHA - SBGR Operational Management System*
