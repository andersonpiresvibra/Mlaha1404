# Documentação do Banco de Dados - MALHA

O sistema **MALHA** utiliza o **Firebase Firestore** como banco de dados NoSQL em tempo real. Abaixo estão as definições das coleções e campos.

## 1. Coleção: `flights` (Voos Ativos)

Armazena todos os voos que estão em operação no momento.

| Campo | Tipo | Exemplo | Descrição |
|---|---|---|---|
| `id` | string | `uuid` | Identificador único do voo |
| `airlineCode` | string | `LA` | Código da Companhia Aérea |
| `airlineName` | string | `LATAM` | Nome da Companhia Aérea |
| `flightNumber` | string | `LA-1234` | Número do voo de chegada |
| `departureFlightNumber` | string | `LA-4321` | Número do voo de saída |
| `registration` | string | `PT-XBX` | Prefixo da aeronave |
| `model` | string | `A320` | Modelo da aeronave |
| `destination` | string | `SBGR` | ICAO do aeroporto (Destino/Origem) |
| `eta` | string | `14:30` | Horário estimado de chegada |
| `etd` | string | `15:45` | Horário estimado de saída |
| `actualArrivalTime` | string | `14:35` | Horário de calço (ATA) |
| `positionId` | string | `123` | Posição de estacionamento |
| `positionType` | string | `SRV` | Tipo de posição (SRV ou CTA) |
| `status` | string | `FILA` | Status atual (CHEGADA, FILA, etc.) |
| `operator` | string | `Marcio` | Nome de guerra do operador designado |
| `fleet` | string | `1234` | Número da frota do veículo |
| `fleetType` | string | `SRV` | Tipo de veículo (SRV ou CTA) |
| `maxFlowRate` | number | `1000` | Vazão máxima registrada (L/min) |
| `logs` | array | `[...]` | Lista de eventos (Caixa Preta) |

## 2. Coleção: `operators` (Operadores do Turno)

Gerencia os operadores ativos no turno atual.

| Campo | Tipo | Exemplo | Descrição |
|---|---|---|---|
| `id` | string | `uuid` | Identificador único |
| `warName` | string | `Marcio` | Nome de guerra |
| `fleet` | string | `1234` | Número da frota |
| `category` | string | `AERODROMO` | Categoria (AERODROMO, VIP, CTA) |
| `status` | string | `DISPONÍVEL` | Status operacional |
| `photoUrl` | string | `url` | Link para a foto do operador |

## 3. Coleção: `finalized_flights` (Histórico)

Quando um voo é finalizado, ele é movido para esta coleção para fins de auditoria e relatórios. Contém todos os campos da coleção `flights` acrescidos de:

| Campo | Tipo | Exemplo | Descrição |
|---|---|---|---|
| `finalizedAt` | timestamp | `serverTimestamp` | Data/Hora da finalização |
| `totalVolume` | number | `5000` | Volume total abastecido (L) |

## 4. Regras de Segurança (Firestore Rules)

- **Leitura:** Permitida para qualquer usuário autenticado (incluindo anônimo).
- **Escrita:** Permitida para usuários autenticados.
- **Exclusão:** Restrita a administradores.

## 5. Instruções de Conexão

O arquivo de configuração `src/firebase.ts` inicializa a conexão usando as credenciais fornecidas em `firebase-applet-config.json`. O sistema utiliza `onSnapshot` para garantir que qualquer alteração no banco de dados seja refletida instantaneamente em todos os terminais conectados.

---
*MALHA - Database Schema v1.0*
