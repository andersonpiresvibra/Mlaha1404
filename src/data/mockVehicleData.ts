import { Vehicle } from '../types';

// Baseado no inventário completo da frota JETFUEL-SIM (36 ativos)

const getRandomFlowRate = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const MOCK_VEHICLES: Vehicle[] = [
  // === SERVIDORES (Abastecimento via Hidrante) - 27 unidades ===
  // --- FORD ---
  { id: '2104', type: 'SERVIDOR', manufacturer: 'FORD', status: 'DISPONÍVEL', maxFlowRate: getRandomFlowRate(950, 1100), hasPlatform: true },
  { id: '2108', type: 'SERVIDOR', manufacturer: 'FORD', status: 'DISPONÍVEL', maxFlowRate: getRandomFlowRate(950, 1100), hasPlatform: true },
  { id: '2111', type: 'SERVIDOR', manufacturer: 'FORD', status: 'INATIVO', maxFlowRate: getRandomFlowRate(950, 1100), hasPlatform: true, operatorName: 'Manutenção' },
  { id: '2113', type: 'SERVIDOR', manufacturer: 'FORD', status: 'DISPONÍVEL', maxFlowRate: getRandomFlowRate(950, 1100), hasPlatform: true },

  // --- MERCEDES-BENZ ---
  { id: '2122', type: 'SERVIDOR', manufacturer: 'MERCEDES-BENZ', status: 'DISPONÍVEL', maxFlowRate: getRandomFlowRate(950, 1100), hasPlatform: true },
  { id: '2123', type: 'SERVIDOR', manufacturer: 'MERCEDES-BENZ', status: 'OCUPADO', maxFlowRate: getRandomFlowRate(950, 1100), hasPlatform: true, operatorName: 'R. ALMEIDA', currentPosition: 'REM-654' },
  { id: '2124', type: 'SERVIDOR', manufacturer: 'MERCEDES-BENZ', status: 'DISPONÍVEL', maxFlowRate: getRandomFlowRate(950, 1100), hasPlatform: true },
  { id: '2125', type: 'SERVIDOR', manufacturer: 'MERCEDES-BENZ', status: 'DISPONÍVEL', maxFlowRate: getRandomFlowRate(950, 1100), hasPlatform: true },
  { id: '2126', type: 'SERVIDOR', manufacturer: 'MERCEDES-BENZ', status: 'DISPONÍVEL', maxFlowRate: getRandomFlowRate(950, 1100), hasPlatform: true },
  { id: '2127', type: 'SERVIDOR', manufacturer: 'MERCEDES-BENZ', status: 'OCUPADO', maxFlowRate: getRandomFlowRate(950, 1100), hasPlatform: true, operatorName: 'C. MOURA', currentPosition: 'REM-632' },
  { id: '2128', type: 'SERVIDOR', manufacturer: 'MERCEDES-BENZ', status: 'DISPONÍVEL', maxFlowRate: getRandomFlowRate(950, 1100), hasPlatform: true },
  { id: '2129', type: 'SERVIDOR', manufacturer: 'MERCEDES-BENZ', status: 'DISPONÍVEL', maxFlowRate: getRandomFlowRate(950, 1100), hasPlatform: true },
  { id: '2130', type: 'SERVIDOR', manufacturer: 'MERCEDES-BENZ', status: 'INATIVO', maxFlowRate: getRandomFlowRate(950, 1100), hasPlatform: true, operatorName: 'Manutenção' },
  { id: '2131', type: 'SERVIDOR', manufacturer: 'MERCEDES-BENZ', status: 'DISPONÍVEL', maxFlowRate: getRandomFlowRate(950, 1100), hasPlatform: true },
  { id: '2132', type: 'SERVIDOR', manufacturer: 'MERCEDES-BENZ', status: 'DISPONÍVEL', maxFlowRate: getRandomFlowRate(950, 1100), hasPlatform: true },
  { id: '2133', type: 'SERVIDOR', manufacturer: 'MERCEDES-BENZ', status: 'DISPONÍVEL', maxFlowRate: getRandomFlowRate(950, 1100), hasPlatform: true },
  { id: '2135', type: 'SERVIDOR', manufacturer: 'MERCEDES-BENZ', status: 'DISPONÍVEL', maxFlowRate: getRandomFlowRate(950, 1100), hasPlatform: true },
  { id: '2136', type: 'SERVIDOR', manufacturer: 'MERCEDES-BENZ', status: 'DISPONÍVEL', maxFlowRate: getRandomFlowRate(950, 1100), hasPlatform: true },
  { id: '2137', type: 'SERVIDOR', manufacturer: 'MERCEDES-BENZ', status: 'DISPONÍVEL', maxFlowRate: getRandomFlowRate(950, 1100), hasPlatform: true },

  // --- VOLKSWAGEN ---
  { id: '2140', type: 'SERVIDOR', manufacturer: 'VOLKSWAGEN', status: 'DISPONÍVEL', maxFlowRate: getRandomFlowRate(950, 1100), hasPlatform: true },
  { id: '2145', type: 'SERVIDOR', manufacturer: 'VOLKSWAGEN', status: 'OCUPADO', maxFlowRate: getRandomFlowRate(950, 1100), hasPlatform: true, operatorName: 'F. SANTOS', currentPosition: 'REM-618' },
  { id: '2160', type: 'SERVIDOR', manufacturer: 'VOLKSWAGEN', status: 'DISPONÍVEL', maxFlowRate: getRandomFlowRate(950, 1100), hasPlatform: true },
  { id: '2161', type: 'SERVIDOR', manufacturer: 'VOLKSWAGEN', status: 'DISPONÍVEL', maxFlowRate: getRandomFlowRate(950, 1100), hasPlatform: true },
  { id: '2164', type: 'SERVIDOR', manufacturer: 'VOLKSWAGEN', status: 'DISPONÍVEL', maxFlowRate: getRandomFlowRate(950, 1100), hasPlatform: true },
  { id: '2165', type: 'SERVIDOR', manufacturer: 'VOLKSWAGEN', status: 'DISPONÍVEL', maxFlowRate: getRandomFlowRate(950, 1100), hasPlatform: true },
  { id: '2174', type: 'SERVIDOR', manufacturer: 'VOLKSWAGEN', status: 'DISPONÍVEL', maxFlowRate: getRandomFlowRate(950, 1100), hasPlatform: true },
  { id: '2177', type: 'SERVIDOR', manufacturer: 'VOLKSWAGEN', status: 'DISPONÍVEL', maxFlowRate: getRandomFlowRate(950, 1100), hasPlatform: true },

  // === CTAs (Caminhões Tanque Abastecedores) - 9 unidades ===
  { id: '1405', type: 'CTA', manufacturer: 'VOLVO', status: 'DISPONÍVEL', maxFlowRate: getRandomFlowRate(750, 900), hasPlatform: false, capacity: 15000 },
  { id: '1425', type: 'CTA', manufacturer: 'SCANIA', status: 'OCUPADO', maxFlowRate: getRandomFlowRate(750, 900), hasPlatform: false, capacity: 20000, operatorName: 'L. PEREIRA', currentPosition: 'ILHA' },
  { id: '1426', type: 'CTA', manufacturer: 'SCANIA', status: 'DISPONÍVEL', maxFlowRate: getRandomFlowRate(750, 900), hasPlatform: false, capacity: 20000 },
  { id: '1428', type: 'CTA', manufacturer: 'SCANIA', status: 'ENCHIMENTO', maxFlowRate: getRandomFlowRate(750, 900), hasPlatform: false, capacity: 20000, operatorName: 'G. OLIVEIRA', currentPosition: 'ILHA' },
  { id: '1435', type: 'CTA', manufacturer: 'VOLVO', status: 'DISPONÍVEL', maxFlowRate: getRandomFlowRate(750, 900), hasPlatform: false, capacity: 20000 },
  { id: '1437', type: 'CTA', manufacturer: 'IVECO', status: 'DISPONÍVEL', maxFlowRate: getRandomFlowRate(750, 900), hasPlatform: false, capacity: 20000 },
  { id: '1439', type: 'CTA', manufacturer: 'IVECO', status: 'DISPONÍVEL', maxFlowRate: getRandomFlowRate(750, 900), hasPlatform: false, capacity: 20000 },
  { id: '1499', type: 'CTA', manufacturer: 'SCANIA', status: 'INATIVO', maxFlowRate: getRandomFlowRate(750, 900), hasPlatform: false, capacity: 20000 },
  { id: '1517', type: 'CTA', manufacturer: 'VOLVO', status: 'DISPONÍVEL', maxFlowRate: getRandomFlowRate(750, 900), hasPlatform: false, capacity: 20000 },
];

