
import { FlightData, FlightStatus, Operator, OperatorProfile, FlightLog, ChatMessage, Vehicle, LogType } from '../types';

// Helper para criar logs
const createLog = (minutesAgo: number, type: LogType, message: string, author: string = 'SISTEMA'): FlightLog => ({
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date(new Date().getTime() - minutesAgo * 60000),
    type,
    message,
    author
});

// Helper para criar mensagens de chat
const createMsg = (minutesAgo: number, sender: string, text: string, isManager: boolean = false): ChatMessage => ({
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date(new Date().getTime() - minutesAgo * 60000),
    sender,
    text,
    isManager
});

const DELAY_REASONS = [
    "Atraso Chegada Aeronave (Late Arrival)",
    "Solicitação Cia Aérea (Abastecimento Parcial)",
    "Manutenção Equipamento Abastecimento",
    "Manutenção Aeronave (Mecânica)",
    "Indisponibilidade de Posição/Balizamento",
    "Restrição Meteorológica (Raios)",
    "Atraso Operacional (Equipe)",
    "Fluxo Lento / Pressão Hidrante Baixa"
];



export const GOL_B737_7_PREFIXES = [
  'PR-GEA', 'PR-GEC', 'PR-GED', 'PR-GEH', 'PR-GEI', 'PR-GEJ', 'PR-GEK', 'PR-GEQ', 'PR-GIH', 'PR-GOQ', 'PR-GOR', 'PR-VBQ'
];

export const GOL_B737_8_PREFIXES = [
  'PR-GGE', 'PR-GGF', 'PR-GGH', 'PR-GGL', 'PR-GGM', 'PR-GGP', 'PR-GGQ', 'PR-GGR', 'PR-GGX', 'PR-GKA', 'PR-GKB', 'PR-GKC', 'PR-GKD', 'PR-GKE', 'PR-GTC', 'PR-GTE', 'PR-GTG', 'PR-GTH', 'PR-GTL', 'PR-GTM', 'PR-GUB', 'PR-GUC', 'PR-GUE', 'PR-GUF', 'PR-GUH', 'PR-GUI', 'PR-GUJ', 'PR-GUK', 'PR-GUL', 'PR-GUM', 'PR-GUN', 'PR-GUP', 'PR-GUR', 'PR-GUT', 'PR-GUU', 'PR-GUV', 'PR-GUX', 'PR-GUY', 'PR-GUZ', 'PR-GXA', 'PR-GXB', 'PR-GXC', 'PR-GXD', 'PR-GXE', 'PR-GXH', 'PR-GXI', 'PR-GXJ', 'PR-GXL', 'PR-GXM', 'PR-GXN', 'PR-GXP', 'PR-GXQ', 'PR-GXR', 'PR-GXT', 'PR-GXU', 'PR-GXV', 'PR-GXW', 'PR-GXX', 'PR-GYA', 'PR-GYD', 'PR-GZH', 'PR-GZI', 'PR-GZS', 'PR-GZU', 'PR-GZV', 'PR-VBF', 'PR-VBG', 'PR-VBK', 'PS-GFA', 'PS-GFB', 'PS-GFC', 'PS-GFD', 'PS-GFE', 'PS-GFF', 'PS-GFG', 'PS-GFH', 'PS-GFI', 'PR-XMA', 'PR-XMB', 'PR-XMC', 'PR-XMD', 'PR-XME', 'PR-XMF', 'PR-XMG', 'PR-XMH', 'PR-XMI', 'PR-XMJ', 'PR-XMK', 'PR-XML', 'PR-XMM', 'PR-XMN', 'PR-XMO', 'PR-XMP', 'PR-XMQ', 'PR-XMR', 'PR-XMS', 'PR-XMT', 'PR-XMU', 'PR-XMV', 'PR-XMW', 'PR-XMX', 'PR-XMY', 'PR-XMZ', 'PS-GOL', 'PS-GPA', 'PS-GPB', 'PS-GPC', 'PS-GPD', 'PS-GPE', 'PS-GPF', 'PS-GPG', 'PS-GPH', 'PS-GPI', 'PS-GPJ', 'PS-GPK', 'PS-GPL', 'PS-GPM', 'PS-GPN', 'PS-GPO', 'PS-GPP', 'PS-GPQ', 'PS-GPR', 'PS-GRA', 'PS-GRB', 'PS-GRC', 'PS-GRD', 'PS-GRE', 'PS-GRF', 'PS-GRG', 'PS-GRH', 'PS-GRI', 'PS-GRJ', 'PS-GRK', 'PS-GRL', 'PS-GRO', 'PS-GRQ', 'PS-GRR', 'PS-GRS', 'PS-GRT', 'PS-GRU', 'PS-GRV', 'PS-GRW', 'PS-GRY', 'PS-GRZ'
];

// === LISTA DE OPERADORES ===
export const MOCK_OPERATORS: Operator[] = [
    { id: 'op_horacio', name: 'Horácio', status: 'OCUPADO', vehicleType: 'SERVIDOR' },
    { id: 'op_carlos', name: 'Carlos', status: 'OCUPADO', vehicleType: 'SERVIDOR' },
    { id: 'op_bruno', name: 'Bruno', status: 'OCUPADO', vehicleType: 'SERVIDOR' },
    { id: 'op_felipe', name: 'Felipe', status: 'DISPONÍVEL', vehicleType: 'SERVIDOR' },
    { id: 'op_andre', name: 'André', status: 'OCUPADO', vehicleType: 'SERVIDOR' },
    { id: 'op_gabriel', name: 'Gabriel', status: 'OCUPADO', vehicleType: 'SERVIDOR' },
    { id: 'op_rodrigo', name: 'Rodrigo', status: 'OCUPADO', vehicleType: 'SERVIDOR' },
    { id: 'op_marcelo', name: 'Marcelo', status: 'DISPONÍVEL', vehicleType: 'SERVIDOR' },
    { id: 'op_sergio', name: 'Sérgio', status: 'DISPONÍVEL', vehicleType: 'SERVIDOR' },
    { id: 'op_ricardo', name: 'Ricardo', status: 'OCUPADO', vehicleType: 'SERVIDOR' },
    { id: 'op_betao', name: 'Betão', status: 'ENCHIMENTO', vehicleType: 'CTA' },
    { id: 'op_tiago', name: 'Tiago', status: 'ENCHIMENTO', vehicleType: 'CTA' },
    { id: 'op_lucas', name: 'Lucas', status: 'DISPONÍVEL', vehicleType: 'CTA' },
    { id: 'op_eduardo', name: 'Eduardo', status: 'OCUPADO', vehicleType: 'CTA' },
    { id: 'op_roberto', name: 'Roberto', status: 'DISPONÍVEL', vehicleType: 'CTA' },
    { id: 'op_mariana', name: 'Mariana', status: 'OCUPADO', vehicleType: 'CTA' },
];

// === CONFIGURAÇÃO DAS SUAS IMAGENS LOCAIS ===
// Mapeamento direto das imagens fornecidas para os operadores
// SALVE AS IMAGENS NA PASTA /public/avatars/ COM OS NOMES ABAIXO
const USER_DEFINED_AVATARS: Record<string, string> = {
    'Horácio': 'face_1.png',
    'Carlos': 'face_2.png',
    'Bruno': 'face_3.png',
    'Felipe': 'face_4.png',
    'André': 'face_5.png',
    'Gabriel': 'face_6.png',
    'Rodrigo': 'face_7.png',
    'Marcelo': 'face_8.png',
    'Sérgio': 'face_9.png',
    'Ricardo': 'face_10.png',
    'Betão': 'face_11.png',
    'Tiago': 'face_12.png',
    'Lucas': 'face_13.png',
    'Eduardo': 'face_14.png',
    'Roberto': 'face_15.png',
    'Mariana': 'face_16.png',
    // Novos mapeamentos para sincronia
    'Paulo': 'face_1.png',
    'Alex': 'face_2.png',
    'Douglas': 'face_3.png',
    'Tavares': 'face_4.png',
    'Julio': 'face_5.png',
    'Sandro': 'face_6.png',
    'Cléber': 'face_7.png',
    'Jose': 'face_8.png',
    'Calazans': 'face_9.png',
    'Silva': 'face_10.png',
    'Manoel': 'face_11.png',
    'Ronald': 'face_12.png',
    'Vinicius': 'face_14.png',
    'Rodolfo': 'face_15.png',
    'Leonardo': 'face_16.png',
    'Michel': 'face_1.png',
    'Joao': 'face_2.png',
    'Adauto': 'face_3.png',
    'Ewerton': 'face_4.png',
    'Guilherme': 'face_5.png',
    'Ildo': 'face_6.png',
    'Peterson': 'face_7.png',
    'Renilson': 'face_8.png',
    'Vagner': 'face_9.png',
    'Medeiros': 'face_10.png',
    'Cesar': 'face_11.png',
    'Flavio': 'face_12.png',
    'Ramos': 'face_13.png',
    'Belentani': 'face_14.png',
    'Eules': 'face_15.png',
    'Souza': 'face_16.png',
    'Luna': 'face_1.png',
    'Huan': 'face_2.png',
    'Luis': 'face_3.png',
    'Luciano': 'face_4.png',
    'Idenilson': 'face_5.png',
    'Kleysson': 'face_6.png',
    'Bastos': 'face_7.png',
    'Elton': 'face_8.png',
    'Wesley': 'face_9.png',
    'Junior': 'face_10.png',
    'Caio': 'face_11.png',
    'Pettinelli': 'face_12.png',
    'Fredison': 'face_13.png',
    'Alves': 'face_14.png',
    'Leandro': 'face_15.png',
    'Feitosa': 'face_16.png',
    'Lopes': 'face_1.png',
    'Givani': 'face_2.png',
    'Renato': 'face_3.png',
    'Costa': 'face_4.png',
    'Gilvan': 'face_5.png',
    'Marques': 'face_6.png',
    'Horacio': 'face_1.png',
    'Laercio': 'face_7.png',
    'Milton': 'face_8.png',
    'Norman': 'face_9.png',
    'Rafael': 'face_10.png',
    'Dourado': 'face_11.png',
    'Venancio': 'face_12.png',
    'Diogo': 'face_13.png',
    'Willian': 'face_14.png',
    'Silverio': 'face_15.png',
    'Regis': 'face_16.png',
    'Cesario': 'face_1.png',
    'Martinez': 'face_2.png',
    'Paschoal': 'face_3.png',
    'Spedini': 'face_4.png',
    'Jonatana': 'face_5.png',
    'Pereira': 'face_6.png',
    'Gustavo': 'face_7.png',
    'Fernando': 'face_8.png',
    'Valdina': 'face_9.png',
    'Renata': 'face_10.png',
    'Zago': 'face_11.png',
    'Torres': 'face_12.png',
    'Solange': 'face_13.png',
    'Loyola': 'face_14.png',
    'Norival': 'face_15.png',
    'Pires': 'face_16.png'
};

// Função para buscar a imagem local
const getAvatarPath = (warName: string) => {
    const filename = USER_DEFINED_AVATARS[warName];
    if (filename) {
        return `/avatars/${filename}`; // Caminho absoluto para a pasta public/avatars
    }
    return ''; // Retorna vazio se não encontrar, o componente usará o ícone padrão
};

// Gerador de perfis usando as imagens locais
const createProfile = (id: string, name: string, warName: string, category: 'AERODROMO' | 'VIP' | 'ILHA', status: any, shift: any): OperatorProfile => {
    // Determine fleet capability based on category
    let fleetCapability: 'CTA' | 'SRV' = 'SRV';
    if (category === 'VIP') fleetCapability = 'CTA';
    if (category === 'ILHA') fleetCapability = 'CTA';
    if (category === 'AERODROMO') fleetCapability = Math.random() > 0.3 ? 'SRV' : 'CTA';

    // Random last flight end time within last 2 hours
    const lastFlightEnd = new Date(Date.now() - Math.floor(Math.random() * 120) * 60000);

    return {
        id, fullName: name, warName, companyId: `FUNC-${Math.floor(Math.random()*9000)+1000}`, gruId: '237293', vestNumber: '0000', 
        
        // AQUI ESTÁ A MUDANÇA: Usando a função que busca seu arquivo local
        photoUrl: getAvatarPath(warName), 
        
        status, category, lastPosition: 'SBGR',
        shift: { cycle: shift, start: '06:00', end: '15:00' }, airlines: ['LATAM'], ratings: { speed: 5, safety: 5, airlineSpecific: {} }, expertise: { servidor: 95, cta: 60 },
        stats: { flightsWeekly: 42, flightsMonthly: 180, volumeWeekly: 650000, volumeMonthly: 2800000 },
        fleetCapability,
        lastFlightEnd
    };
};

export const MOCK_TEAM_PROFILES: OperatorProfile[] = [
    // --- 05:00 - 14:00 (MANHÃ) ---
    createProfile('op_michel', 'Michel', 'Michel', 'AERODROMO', 'INATIVO', 'MANHÃ'),
    createProfile('op_joao', 'Joao', 'Joao', 'AERODROMO', 'INATIVO', 'MANHÃ'),
    createProfile('op_adauto', 'Adauto', 'Adauto', 'AERODROMO', 'INATIVO', 'MANHÃ'),
    createProfile('op_ewerton', 'Ewerton', 'Ewerton', 'AERODROMO', 'INATIVO', 'MANHÃ'),

    // --- 06:00 - 15:00 (MANHÃ) ---
    createProfile('op_paulo', 'Paulo', 'Paulo', 'AERODROMO', 'OCUPADO', 'MANHÃ'),
    createProfile('op_alex', 'Alex Barbosa', 'Alex', 'AERODROMO', 'OCUPADO', 'MANHÃ'),
    createProfile('op_douglas', 'Douglas', 'Douglas', 'AERODROMO', 'DISPONÍVEL', 'MANHÃ'),
    createProfile('op_tavares', 'Tavares', 'Tavares', 'AERODROMO', 'OCUPADO', 'MANHÃ'),
    createProfile('op_julio', 'Julio', 'Julio', 'AERODROMO', 'DISPONÍVEL', 'MANHÃ'),
    createProfile('op_sandro', 'Sandro', 'Sandro', 'AERODROMO', 'OCUPADO', 'MANHÃ'),
    createProfile('op_cleber', 'Cléber', 'Cléber', 'AERODROMO', 'OCUPADO', 'MANHÃ'),
    createProfile('op_jose', 'Jose', 'Jose', 'AERODROMO', 'DISPONÍVEL', 'MANHÃ'),
    createProfile('op_calazans', 'Calazans', 'Calazans', 'AERODROMO', 'OCUPADO', 'MANHÃ'),
    createProfile('op_silva', 'Silva', 'Silva', 'AERODROMO', 'OCUPADO', 'MANHÃ'),
    createProfile('op_guilherme', 'Guilherme', 'Guilherme', 'AERODROMO', 'DISPONÍVEL', 'MANHÃ'),
    createProfile('op_ildo', 'Ildo', 'Ildo', 'AERODROMO', 'OCUPADO', 'MANHÃ'),
    createProfile('op_peterson', 'Peterson', 'Peterson', 'AERODROMO', 'OCUPADO', 'MANHÃ'),
    createProfile('op_renilson', 'Renilson', 'Renilson', 'AERODROMO', 'DISPONÍVEL', 'MANHÃ'),
    createProfile('op_carlos_m', 'Carlos', 'Carlos', 'AERODROMO', 'OCUPADO', 'MANHÃ'),
    createProfile('op_vagner', 'Vagner', 'Vagner', 'AERODROMO', 'OCUPADO', 'MANHÃ'),
    createProfile('op_medeiros', 'Medeiros', 'Medeiros', 'AERODROMO', 'DISPONÍVEL', 'MANHÃ'),
    createProfile('op_cesar', 'Cesar JC', 'Cesar', 'AERODROMO', 'OCUPADO', 'MANHÃ'),
    createProfile('op_flavio', 'Flavio', 'Flavio', 'AERODROMO', 'OCUPADO', 'MANHÃ'),
    createProfile('op_ramos', 'Ramos', 'Ramos', 'AERODROMO', 'DISPONÍVEL', 'MANHÃ'),
    createProfile('op_belentani', 'Belentani', 'Belentani', 'AERODROMO', 'OCUPADO', 'MANHÃ'),
    createProfile('op_eules', 'Eules', 'Eules', 'AERODROMO', 'OCUPADO', 'MANHÃ'),
    createProfile('op_souza', 'Souza', 'Souza', 'AERODROMO', 'DISPONÍVEL', 'MANHÃ'),
    createProfile('op_luna', 'Luna', 'Luna', 'AERODROMO', 'OCUPADO', 'MANHÃ'),
    createProfile('op_huan', 'Huan', 'Huan', 'AERODROMO', 'OCUPADO', 'MANHÃ'),

    // --- 06:00 - 16:00 (MANHÃ) ---
    createProfile('op_luis', 'Luis', 'Luis', 'AERODROMO', 'OCUPADO', 'MANHÃ'),
    createProfile('op_luciano', 'Luciano', 'Luciano', 'AERODROMO', 'DISPONÍVEL', 'MANHÃ'),
    createProfile('op_idenilson', 'Idenilson', 'Idenilson', 'AERODROMO', 'OCUPADO', 'MANHÃ'),

    // --- 14:30 - 23:30 (TARDE - ILHA/AERODROMO) ---
    createProfile('op_manoel', 'Manoel', 'Manoel', 'ILHA', 'ENCHIMENTO', 'TARDE'),
    createProfile('op_ronald', 'Ronald', 'Ronald', 'ILHA', 'ENCHIMENTO', 'TARDE'),
    createProfile('op_kleysson', 'Kleysson', 'Kleysson', 'ILHA', 'DISPONÍVEL', 'TARDE'),
    createProfile('op_vinicius', 'Vinicius', 'Vinicius', 'ILHA', 'ENCHIMENTO', 'TARDE'),
    createProfile('op_bastos', 'Bastos', 'Bastos', 'ILHA', 'DISPONÍVEL', 'TARDE'),
    createProfile('op_elton', 'Elton', 'Elton', 'ILHA', 'ENCHIMENTO', 'TARDE'),

    // --- 14:42 - 23:30 (TARDE) ---
    createProfile('op_rodolfo', 'Rodolfo', 'Rodolfo', 'AERODROMO', 'INATIVO', 'TARDE'),
    createProfile('op_leonardo', 'Leonardo', 'Leonardo', 'AERODROMO', 'INATIVO', 'TARDE'),
    createProfile('op_wesley', 'Wesley', 'Wesley', 'AERODROMO', 'INATIVO', 'TARDE'),
    createProfile('op_junior', 'Junior', 'Junior', 'AERODROMO', 'INATIVO', 'TARDE'),
    createProfile('op_lucas_t', 'Lucas', 'Lucas', 'AERODROMO', 'INATIVO', 'TARDE'),
    createProfile('op_caio', 'Caio', 'Caio', 'AERODROMO', 'INATIVO', 'TARDE'),
    createProfile('op_pettinelli', 'Pettinelli', 'Pettinelli', 'AERODROMO', 'INATIVO', 'TARDE'),

    // --- 15:15 - 00:00 (TARDE) ---
    createProfile('op_fredison', 'Fredison', 'Fredison', 'AERODROMO', 'INATIVO', 'TARDE'),
    createProfile('op_alves', 'Alves', 'Alves', 'AERODROMO', 'INATIVO', 'TARDE'),
    createProfile('op_leandro', 'Leandro Eufra', 'Leandro', 'AERODROMO', 'INATIVO', 'TARDE'),
    createProfile('op_jose_edson', 'Jose Edson', 'Jose', 'AERODROMO', 'INATIVO', 'TARDE'),
    createProfile('op_feitosa', 'Feitosa', 'Feitosa', 'AERODROMO', 'INATIVO', 'TARDE'),
    createProfile('op_lopes', 'Lopes', 'Lopes', 'AERODROMO', 'INATIVO', 'TARDE'),
    createProfile('op_givani', 'Givani', 'Givani', 'AERODROMO', 'INATIVO', 'TARDE'),
    createProfile('op_renato', 'Renato', 'Renato', 'AERODROMO', 'INATIVO', 'TARDE'),
    createProfile('op_costa', 'Costa', 'Costa', 'AERODROMO', 'INATIVO', 'TARDE'),
    createProfile('op_gilvan', 'Gilvan', 'Gilvan', 'AERODROMO', 'INATIVO', 'TARDE'),

    // --- 16:00 - 00:37 (TARDE) ---
    createProfile('op_marques', 'Marques', 'Marques', 'AERODROMO', 'INATIVO', 'TARDE'),
    createProfile('op_horacio_t', 'Horacio', 'Horacio', 'AERODROMO', 'INATIVO', 'TARDE'),
    createProfile('op_laercio', 'Laercio', 'Laercio', 'AERODROMO', 'INATIVO', 'TARDE'),

    // --- 21:12 - 06:00 (NOITE) ---
    createProfile('op_milton', 'Milton', 'Milton', 'AERODROMO', 'INATIVO', 'NOITE'),
    createProfile('op_norman', 'Norman', 'Norman', 'AERODROMO', 'INATIVO', 'NOITE'),
    createProfile('op_rafael', 'Rafael', 'Rafael', 'AERODROMO', 'INATIVO', 'NOITE'),
    createProfile('op_dourado', 'Dourado', 'Dourado', 'AERODROMO', 'INATIVO', 'NOITE'),
    createProfile('op_venancio', 'Venancio', 'Venancio', 'AERODROMO', 'INATIVO', 'NOITE'),
    createProfile('op_diogo', 'Diogo', 'Diogo', 'AERODROMO', 'INATIVO', 'NOITE'),
    createProfile('op_willian', 'Willian', 'Willian', 'AERODROMO', 'INATIVO', 'NOITE'),
    createProfile('op_silverio', 'Silverio', 'Silverio', 'AERODROMO', 'INATIVO', 'NOITE'),
    createProfile('op_regis', 'Regis', 'Regis', 'AERODROMO', 'INATIVO', 'NOITE'),

    // --- LIDERES ---
    createProfile('op_cesario', 'Cesario', 'Cesario', 'AERODROMO', 'OCUPADO', 'MANHÃ'),
    createProfile('op_martinez', 'Martinez', 'Martinez', 'AERODROMO', 'DISPONÍVEL', 'MANHÃ'),
    createProfile('op_paschoal', 'Paschoal', 'Paschoal', 'AERODROMO', 'OCUPADO', 'MANHÃ'),
    createProfile('op_spedini', 'Spedini', 'Spedini', 'AERODROMO', 'INATIVO', 'TARDE'),
    createProfile('op_jonatana', 'Jonatana', 'Jonatana', 'AERODROMO', 'INATIVO', 'TARDE'),
    createProfile('op_pereira', 'Pereira', 'Pereira', 'AERODROMO', 'INATIVO', 'NOITE'),
    createProfile('op_gustavo', 'Gustavo', 'Gustavo', 'AERODROMO', 'INATIVO', 'NOITE'),

    // --- PATIO VIP ---
    createProfile('op_fernando', 'Fernando', 'Fernando', 'VIP', 'OCUPADO', 'MANHÃ'),
    createProfile('op_valdina', 'Valdina', 'Valdina', 'VIP', 'DISPONÍVEL', 'MANHÃ'),
    createProfile('op_renata', 'Renata', 'Renata', 'VIP', 'OCUPADO', 'MANHÃ'),
    createProfile('op_zago', 'Zago', 'Zago', 'VIP', 'DISPONÍVEL', 'MANHÃ'),
    createProfile('op_torres', 'Torres', 'Torres', 'VIP', 'INATIVO', 'TARDE'),
    createProfile('op_solange', 'Solange', 'Solange', 'VIP', 'INATIVO', 'TARDE'),
    createProfile('op_loyola', 'Loyola', 'Loyola', 'VIP', 'INATIVO', 'TARDE'),
    createProfile('op_norival', 'Norival', 'Norival', 'VIP', 'INATIVO', 'NOITE'),
    createProfile('op_pires', 'Pires', 'Pires', 'VIP', 'INATIVO', 'NOITE'),
].map(p => {
    // Ajustar horários específicos
    if (['Michel', 'Joao', 'Adauto', 'Ewerton'].includes(p.warName)) { p.shift = { cycle: 'MANHÃ', start: '05:00', end: '14:00' }; }
    else if (['Luis', 'Luciano', 'Idenilson'].includes(p.warName)) { p.shift = { cycle: 'MANHÃ', start: '06:00', end: '16:00' }; }
    else if (['Manoel', 'Ronald', 'Kleysson', 'Vinicius', 'Bastos', 'Elton'].includes(p.warName)) { p.shift = { cycle: 'TARDE', start: '14:30', end: '23:30' }; }
    else if (['Rodolfo', 'Leonardo', 'Wesley', 'Junior', 'Lucas', 'Caio', 'Pettinelli'].includes(p.warName)) { p.shift = { cycle: 'TARDE', start: '14:42', end: '23:30' }; }
    else if (['Fredison', 'Alves', 'Leandro', 'Jose', 'Feitosa', 'Lopes', 'Givani', 'Renato', 'Costa', 'Gilvan'].includes(p.warName)) { p.shift = { cycle: 'TARDE', start: '15:15', end: '00:00' }; }
    else if (['Marques', 'Horacio', 'Laercio'].includes(p.warName)) { p.shift = { cycle: 'TARDE', start: '16:00', end: '00:37' }; }
    else if (['Milton', 'Norman', 'Rafael', 'Dourado', 'Venancio', 'Diogo', 'Willian', 'Silverio', 'Regis'].includes(p.warName)) { p.shift = { cycle: 'NOITE', start: '21:12', end: '06:00' }; }
    else if (['Norival'].includes(p.warName)) { p.shift = { cycle: 'NOITE', start: '21:00', end: '06:00' }; }
    else if (['Pires'].includes(p.warName)) { p.shift = { cycle: 'NOITE', start: '22:00', end: '06:00' }; }
    
    return p;
});

// Função auxiliar para verificar se um operador está no turno em um dado horário
const isOperatorInShift = (operator: OperatorProfile, date: Date): boolean => {
    const [sH, sM] = operator.shift.start.split(':').map(Number);
    const [eH, eM] = operator.shift.end.split(':').map(Number);
    
    const startMins = sH * 60 + sM;
    const endMins = eH * 60 + eM;
    const currentMins = date.getHours() * 60 + date.getMinutes();

    if (startMins < endMins) {
        return currentMins >= startMins && currentMins <= endMins;
    } else {
        // Turno noturno (ex: 21:00 - 06:00)
        return currentMins >= startMins || currentMins <= endMins;
    }
};

// Função para obter um operador aleatório válido para o horário
const getRandomOperatorForTime = (date: Date, vehicleType: 'CTA' | 'SERVIDOR' = 'SERVIDOR'): OperatorProfile | undefined => {
    const validOperators = MOCK_TEAM_PROFILES.filter(op => {
        // Verifica turno
        if (!isOperatorInShift(op, date)) return false;
        
        // Verifica capacidade do veículo (simplificado)
        if (vehicleType === 'CTA' && op.fleetCapability === 'SRV') return false;
        if (vehicleType === 'SERVIDOR' && op.fleetCapability === 'CTA') return false;
        
        return true;
    });

    if (validOperators.length === 0) return undefined;
    return validOperators[Math.floor(Math.random() * validOperators.length)];
};

// Gerador de Voos Massivo
const generateMockFlights = (): FlightData[] => {
    const flights: FlightData[] = [];
    const airlines = [
        { code: 'RG', name: 'GOL', models: ['B737-7', 'B737-8'] },
        { code: 'RG', name: 'GOL', models: ['B737-7', 'B737-8'] },
        { code: 'RG', name: 'GOL', models: ['B737-7', 'B737-8'] },
        { code: 'LA', name: 'LATAM', models: ['A320', 'A321', 'B767'] },
        { code: 'LA', name: 'LATAM', models: ['A320', 'A321', 'B767'] },
        { code: 'LA', name: 'LATAM', models: ['A320', 'A321', 'B767'] },
        { code: 'AD', name: 'AZUL', models: ['A320neo', 'E195-E2'] },
        { code: 'AD', name: 'AZUL', models: ['A320neo', 'E195-E2'] },
        { code: 'TP', name: 'TAP', models: ['A330-900'] },
        { code: 'AF', name: 'AIR FRANCE', models: ['B777-300'] },
        { code: 'LH', name: 'LUFTHANSA', models: ['B747-8'] },
        { code: 'CM', name: 'COPA', models: ['B737-800'] },
        { code: 'UA', name: 'UNITED', models: ['B777-200'] },
        { code: 'AA', name: 'AMERICAN', models: ['B777-300'] },
        { code: 'KL', name: 'KLM', models: ['B787-9'] },
        { code: 'DL', name: 'DELTA', models: ['A350-900', 'B767-400'] },
        { code: 'TT', name: 'TOTAL', models: ['B737-400F', 'ATR-42'] },
    ];

    const origins = ['SBGR', 'SBSP', 'SBRJ', 'SBGL', 'SBCF', 'SBSV', 'SBNT', 'SBPA', 'SBCT', 'KMIA', 'KJFK', 'EGLL', 'LFPG', 'EDDF', 'LEMD', 'LPPT'];
    
    const now = new Date();
    let flightCounter = 1000;

    // Helper para gerar lote de voos
    const generateBatch = (startHour: number, endHour: number, count: number, dayOffset: number = 0) => {
        const startTime = new Date(now);
        startTime.setDate(now.getDate() + dayOffset);
        startTime.setHours(startHour, 0, 0, 0);
        
        const endTime = new Date(now);
        endTime.setDate(now.getDate() + dayOffset);
        if (endHour === 24) {
            endTime.setHours(23, 59, 59, 999);
        } else {
            endTime.setHours(endHour, 0, 0, 0);
        }
        
        const durationMs = endTime.getTime() - startTime.getTime();
        const intervalMs = durationMs / count;

        for (let i = 0; i < count; i++) {
            flightCounter++;
            const airline = airlines[Math.floor(Math.random() * airlines.length)];
            const model = airline.models[Math.floor(Math.random() * airline.models.length)];
            const isInternational = ['TP', 'AF', 'LH', 'UA', 'AA', 'KL', 'CM', 'DL'].includes(airline.code);
            
            // ETA e ETD
            const flightTime = new Date(startTime.getTime() + (i * intervalMs) + (Math.random() * intervalMs * 0.5));
            
            const eta = new Date(flightTime);
            const groundTime = isInternational ? (120 + Math.random() * 120) : (45 + Math.random() * 45);
            const etd = new Date(eta.getTime() + groundTime * 60000);

            // Determinar Status baseado no "Agora"
            let status: FlightStatus;
            let operator: OperatorProfile | undefined = undefined;
            let designationTime: Date | undefined = undefined;
            let startTimeAb: Date | undefined = undefined;
            let endTimeAb: Date | undefined = undefined;
            let logs: FlightLog[] = [];
            let fuelStatus = 0;
            let volume = 0;

            const minutesDiff = (now.getTime() - etd.getTime()) / 60000; // Negativo = Futuro, Positivo = Passado
            const minutesToEta = (eta.getTime() - now.getTime()) / 60000;
            let actualArrivalTime: string | undefined = undefined;

            if (minutesDiff > 15) {
                // Voo já partiu (FINALIZADO ou CANCELADO)
                const isCancelled = Math.random() < 0.08; 
                status = isCancelled ? FlightStatus.CANCELADO : FlightStatus.FINALIZADO;
                fuelStatus = isCancelled ? 0 : 100;
                volume = isCancelled ? 0 : (isInternational ? Math.floor(Math.random() * 50000 + 20000) : Math.floor(Math.random() * 10000 + 2000));
                
                if (!isCancelled) {
                    actualArrivalTime = new Date(eta.getTime() + (Math.random() * 10 - 5) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }

                const fuelingTime = new Date(etd.getTime() - 40 * 60000);
                operator = getRandomOperatorForTime(fuelingTime, isInternational ? 'SERVIDOR' : 'SERVIDOR');
                
                if (operator && !isCancelled) {
                    designationTime = new Date(fuelingTime.getTime() - 20 * 60000);
                    startTimeAb = fuelingTime;
                    
                    const isDelayed = Math.random() < 0.15;
                    const delayMins = isDelayed ? Math.floor(Math.random() * 45 + 10) : 0;
                    endTimeAb = new Date(fuelingTime.getTime() + (isInternational ? 40 : 20) * 60000 + delayMins * 60000);
                    
                    if (isDelayed) {
                        logs.push(createLog(0, 'ATRASO', `Finalizado com ATRASO de ${delayMins}min. Justificativa: ${DELAY_REASONS[Math.floor(Math.random() * DELAY_REASONS.length)]}`, operator.warName));
                    } else {
                        logs.push(createLog(0, 'SISTEMA', 'Abastecimento finalizado com sucesso.', operator.warName));
                    }

                    if (Math.random() < 0.05) {
                        logs.push(createLog(10, 'ALERTA', 'Troca de operador solicitada por fadiga.', 'SISTEMA'));
                    }
                } else if (isCancelled) {
                    logs.push(createLog(0, 'SISTEMA', 'Voo cancelado pela companhia aérea.', 'SISTEMA'));
                }

            } else if (minutesDiff > -20 && minutesDiff <= 15) {
                // Voo está em solo ou partindo agora (ABASTECENDO ou FINALIZANDO)
                status = FlightStatus.ABASTECENDO;
                fuelStatus = Math.floor(Math.random() * 60 + 20);
                volume = isInternational ? Math.floor(Math.random() * 30000 + 10000) : Math.floor(Math.random() * 5000 + 1000);
                actualArrivalTime = new Date(eta.getTime() + (Math.random() * 10 - 5) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                const fuelingTime = new Date(etd.getTime() - 40 * 60000);
                operator = getRandomOperatorForTime(fuelingTime, isInternational ? 'SERVIDOR' : 'SERVIDOR');
                if (operator) {
                    designationTime = new Date(fuelingTime.getTime() - 20 * 60000);
                    startTimeAb = fuelingTime;
                    logs.push(createLog(10, 'SISTEMA', 'Abastecimento iniciado.', operator.warName));
                }
            } else if (minutesToEta <= 60 && minutesToEta > -20) {
                // Voo está chegando ou em solo (FILA ou DESIGNADO ou AGUARDANDO)
                if (minutesToEta < 0) {
                    actualArrivalTime = new Date(eta.getTime() + (Math.random() * 10 - 5) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
                const rand = Math.random();
                if (rand < 0.3) {
                    status = FlightStatus.FILA;
                    logs.push(createLog(5, 'SISTEMA', 'Voo entrou na fila de prioridade.', 'SISTEMA'));
                } else if (rand < 0.7) {
                    status = FlightStatus.DESIGNADO;
                    operator = getRandomOperatorForTime(now, isInternational ? 'SERVIDOR' : 'SERVIDOR');
                    if (operator) {
                        designationTime = new Date(now.getTime() - 10 * 60000);
                        logs.push(createLog(10, 'SISTEMA', `Operador ${operator.warName} designado para o voo.`, 'SISTEMA'));
                    }
                } else {
                    status = FlightStatus.AGUARDANDO;
                    operator = getRandomOperatorForTime(now, isInternational ? 'SERVIDOR' : 'SERVIDOR');
                    if (operator) {
                        designationTime = new Date(now.getTime() - 25 * 60000);
                        logs.push(createLog(25, 'SISTEMA', `Operador ${operator.warName} aguardando calço.`, 'SISTEMA'));
                    }
                }
            } else {
                // Voo futuro (CHEGADA)
                status = FlightStatus.CHEGADA;
            }

            let registration = `PR-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
            if (airline.code === 'RG') {
                if (model === 'B737-7') {
                    registration = GOL_B737_7_PREFIXES[Math.floor(Math.random() * GOL_B737_7_PREFIXES.length)];
                } else if (model === 'B737-8') {
                    registration = GOL_B737_8_PREFIXES[Math.floor(Math.random() * GOL_B737_8_PREFIXES.length)];
                }
            }

            flights.push({
                id: `flt-${flightCounter}`,
                flightNumber: `${airline.code}-${flightCounter}`,
                departureFlightNumber: `${airline.code}-${flightCounter + 1}`,
                airline: airline.name,
                airlineCode: airline.code,
                model: model,
                registration: registration,
                origin: origins[Math.floor(Math.random() * origins.length)],
                destination: origins[Math.floor(Math.random() * origins.length)],
                eta: eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                etd: etd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                positionId: `${Math.floor(Math.random() * 100) + 200}`,
                fuelStatus: fuelStatus,
                status: status,
                operator: operator?.warName,
                vehicleType: isInternational ? 'SERVIDOR' : 'SERVIDOR',
                volume: volume,
                designationTime: designationTime,
                startTime: startTimeAb,
                endTime: endTimeAb,
                messages: [],
                logs: logs,
                isOnGround: minutesToEta < 0,
                actualArrivalTime: actualArrivalTime
            });
        }
    };

    // --- GERAR VOOS (ONTEM E HOJE) ---
    
    // Ontem (para popular relatórios)
    generateBatch(6, 14, 100, -1);
    generateBatch(14, 22, 100, -1);
    generateBatch(22, 24, 20, -1);

    // Hoje (operação ativa)
    generateBatch(0, 6, 30);
    generateBatch(6, 14, 135);
    generateBatch(14, 22, 110);
    generateBatch(22, 24, 20);

    return flights.sort((a, b) => {
        // Ordenar por ETD
        const dateA = new Date();
        const [hA, mA] = a.etd.split(':').map(Number);
        dateA.setHours(hA, mA, 0, 0);
        
        const dateB = new Date();
        const [hB, mB] = b.etd.split(':').map(Number);
        dateB.setHours(hB, mB, 0, 0);
        
        return dateA.getTime() - dateB.getTime();
    });
};

export const MOCK_FLIGHTS: FlightData[] = generateMockFlights();
