import { IndicatorConfig, DiagnosticConfig } from './types';

export const vaccineInfoMap: { [key: string]: any } = {
    tetano: { name: "Tétano e Difteria (dT/dTpa)", info: "Reforço a cada 10 anos. dTpa recomendada para gestantes a cada gestação e para pessoas que convivem com bebês.", intervalYears: 10, doseInfo: "Reforço a cada 10 anos. dTpa para gestantes e contactantes de bebês." },
    'hepatite-b': { name: "Hepatite B", info: "Esquema de 3 doses (0, 1, 6 meses) se não vacinado ou esquema incompleto. Verificar necessidade com exames (Anti-HBs).", requiresScheme: true, doseInfo: "3 doses (0, 1, 6 meses). Checar Anti-HBs." },
    influenza: { name: "Influenza (Gripe)", info: "Dose anual, especialmente para grupos de risco (idosos, gestantes, portadores de doenças crônicas).", isAnnual: true, doseInfo: "Anual." },
    'triplice-viral': { name: "Tríplice Viral (Sarampo, Caxumba, Rubéola - SCR)", info: "Duas doses ao longo da vida (geralmente na infância). Adultos não vacinados ou com esquema incompleto devem verificar com profissional.", ageDependent: true, requiresScheme: true, doseInfo: "2 doses na vida (verificar histórico)." },
    'febre-amarela': { name: "Febre Amarela", info: "Dose única para residentes ou viajantes para áreas de risco. Verificar recomendação para sua região.", ageDependent: true, doseInfo: "Dose única para áreas de risco." },
    hpv: { name: "HPV", info: "Recomendada para meninas e meninos (9-14 anos) e grupos específicos de adultos. Esquema de 2 ou 3 doses dependendo da idade e condição.", ageDependent: true, requiresScheme: true, intervalMonths: 6, doseInfo: "2-3 doses (verificar idade/condição)." },
    pneumococica: { name: "Pneumocócica", info: "Recomendada para idosos (60+) e grupos de risco (doenças crônicas). Esquemas variam (VPC13, VPP23).", ageDependent: true, requiresScheme: true, doseInfo: "Para 60+ e grupos de risco." },
    meningococica: { name: "Meningocócica (ACWY/B)", info: "Recomendada para adolescentes e adultos jovens, ou em situações de surto. Verificar necessidade específica.", ageDependent: true, requiresScheme: true, doseInfo: "Para adolescentes/jovens e surtos." },
    varicela: { name: "Varicela (Catapora)", info: "Duas doses para quem não teve a doença. Geralmente aplicada na infância.", ageDependent: true, requiresScheme: true, doseInfo: "2 doses se não teve a doença." },
    'hepatite-a': { name: "Hepatite A", info: "Esquema de 2 doses (intervalo de 6 meses) para grupos de risco ou viajantes.", ageDependent: true, requiresScheme: true, intervalMonths: 6, doseInfo: "2 doses (intervalo 6 meses) para risco/viajantes." },
    'herpes-zoster': { name: "Herpes Zóster", info: "Recomendada para pessoas com 50 anos ou mais. Esquema de 1 ou 2 doses dependendo da vacina.", ageDependent: true, requiresScheme: true, doseInfo: "Para 50+ (1 ou 2 doses)." },
    'covid-19': { name: "COVID-19", info: "Seguir recomendações atualizadas do Ministério da Saúde para doses de reforço conforme faixa etária e condição.", isAnnual: true, requiresScheme: true, doseInfo: "Conforme calendário oficial (reforços)." },
    dengue: { name: "Dengue", info: "Recomendada para faixas etárias específicas em áreas endêmicas, conforme definição do Ministério da Saúde. Esquema de 2 doses com intervalo de 3 meses.", ageDependent: true, requiresScheme: true, intervalMonths: 3, doseInfo: "Para áreas endêmicas (2 doses, intervalo 3 meses)." }
};

export const indicatorConfigsPreventiva: IndicatorConfig[] = [
    {
        id: 'glicemia', name: 'Glicemia em Jejum', unit: 'mg/dL',
        barMin: 50, barMax: 150, optimalMin: 70, optimalMax: 99,
        zones: [
            {min: 0, max: 69, label: "Baixa", colorClass: "status-warning"},
            {min: 70,max: 99, label: "Normal", colorClass: "status-ok"},
            {min:100, max:125, label: "Pré-Diabetes", colorClass: "status-warning"},
            {min:126, max:Infinity, label: "Diabetes", colorClass: "status-overdue"}
        ]
    },
    {
        id: 'hdl', name: 'HDL Colesterol', unit: 'mg/dL',
        barMin: 20, barMax: 100, optimalMin: 60, optimalMax: Infinity, reversedGradient: true,
        zones: [
            {min:0, max:39, label: "Baixo", colorClass: "status-overdue"},
            {min:40, max:59, label: "Limítrofe", colorClass: "status-warning"},
            {min:60, max:Infinity, label: "Ótimo", colorClass: "status-ok"}
        ]
    },
    {
        id: 'ldl', name: 'LDL Colesterol', unit: 'mg/dL',
        barMin: 50, barMax: 200, optimalMin: 0, optimalMax: 99,
        zones: [
            {min:0, max:99, label: "Ótimo", colorClass: "status-ok"},
            {min:100, max:129, label: "Desejável", colorClass: "status-ok"},
            {min:130, max:159, label: "Limítrofe", colorClass: "status-warning"},
            {min:160, max:189, label: "Alto", colorClass: "status-overdue"},
            {min:190, max:Infinity, label: "Muito Alto", colorClass: "status-overdue"}
        ]
    },
    {
        id: 'colesterol', name: 'Colesterol Total', unit: 'mg/dL',
        barMin: 100, barMax: 300, optimalMin: 0, optimalMax: 199,
        zones: [
            {min:0, max:199, label: "Desejável", colorClass: "status-ok"},
            {min:200, max:239, label: "Limítrofe", colorClass: "status-warning"},
            {min:240, max:Infinity, label: "Alto", colorClass: "status-overdue"}
        ]
    },
    {
        id: 'triglicerideos', name: 'Triglicerídeos', unit: 'mg/dL',
        barMin: 50, barMax: 500, optimalMin: 0, optimalMax: 149,
        zones: [
            {min:0, max:149, label: "Normal", colorClass: "status-ok"},
            {min:150, max:199, label: "Limítrofe", colorClass: "status-warning"},
            {min:200, max:499, label: "Alto", colorClass: "status-overdue"},
            {min:500, max:Infinity, label: "Muito Alto", colorClass: "status-overdue"}
        ]
    },
    {
        id: 'vitd', name: 'Vitamina D (25-OH)', unit: 'ng/mL',
        barMin: 10, barMax: 100, optimalMin: 30, optimalMax: 60, reversedGradient: true,
        zones: [
            {min:0, max:19, label: "Deficiência", colorClass: "status-overdue"},
            {min:20, max:29, label: "Insuficiência", colorClass: "status-warning"},
            {min:30, max:100, label: "Suficiente", colorClass: "status-ok"}
        ]
    },
    {
        id: 'tsh', name: 'TSH (Hormônio Tireoestimulante)', unit: 'µUI/mL',
        barMin: 0.1, barMax: 10, optimalMin: 0.4, optimalMax: 4.0,
        zones: [
            {min:0, max:0.39, label: "Baixo (Sugestivo de Hipertireoidismo)", colorClass: "status-warning"},
            {min:0.4, max:4.0, label: "Normal", colorClass: "status-ok"},
            {min:4.01, max:10, label: "Elevado (Sugestivo de Hipotireoidismo Subclínico)", colorClass: "status-warning"},
            {min:10.01, max:Infinity, label: "Muito Elevado (Sugestivo de Hipotireoidismo)", colorClass: "status-overdue"}
        ]
    },
    {
        id: 'creatinina', name: 'Creatinina', unit: 'mg/dL',
        barMin: 0.4, barMax: 1.5,
        optimalMin: 0.6, optimalMax: 1.2,
        zones: [
             {min:0, max:0.59, label: "Baixo (Verificar contexto)", colorClass: "status-warning"},
             {min:0.6, max:1.3, label: "Normal (Geral)", colorClass: "status-ok"},
             {min:1.31, max:Infinity, label: "Alto (Avaliar Função Renal)", colorClass: "status-overdue"}
        ]
    },
    {
        id: 'acidourico', name: 'Ácido Úrico', unit: 'mg/dL',
        barMin: 2, barMax: 10,
        optimalMin: 2.5, optimalMax: 6.0,
        zones: [
            {min:0, max:2.4, label: "Baixo", colorClass: "status-check"},
            {min:2.5, max:6.0, label: "Normal (Mulher)", colorClass: "status-ok"},
            {min:2.5, max:7.0, label: "Normal (Homem)", colorClass: "status-ok"},
            {min:6.1, max:Infinity, label: "Alto (Mulher - Avaliar Gota)", colorClass: "status-overdue"},
            {min:7.1, max:Infinity, label: "Alto (Homem - Avaliar Gota)", colorClass: "status-overdue"}
        ]
    },
    {
        id: 'pcr', name: 'PCR Ultrassensível', unit: 'mg/L',
        barMin: 0, barMax: 10, optimalMin: 0, optimalMax: 0.9,
        zones: [
            {min:0, max:0.9, label: "Baixo Risco Cardiovascular", colorClass: "status-ok"},
            {min:1.0, max:2.9, label: "Risco Cardiovascular Médio", colorClass: "status-warning"},
            {min:3.0, max:Infinity, label: "Alto Risco Cardiovascular / Inflamação", colorClass: "status-overdue"}
        ]
    },
    {
        id: 'ferritina', name: 'Ferritina', unit: 'ng/mL',
        barMin: 10, barMax: 400,
        optimalMin: 50, optimalMax: 150, reversedGradient: true,
        zones: [
            {min:0, max:29, label: "Baixo (Sugestivo de Deficiência de Ferro)", colorClass: "status-overdue"},
            {min:30, max:200, label: "Normal (Mulher)", colorClass: "status-ok"},
            {min:30, max:300, label: "Normal (Homem)", colorClass: "status-ok"},
            {min:201, max:Infinity, label: "Elevado (Mulher - Avaliar Causa)", colorClass: "status-warning"},
            {min:301, max:Infinity, label: "Elevado (Homem - Avaliar Causa)", colorClass: "status-warning"}
        ]
    },
    {
        id: 'b12', name: 'Vitamina B12', unit: 'pg/mL',
        barMin: 100, barMax: 1000, optimalMin: 400, optimalMax: 900, reversedGradient: true,
        zones: [
            {min:0, max:199, label: "Deficiência", colorClass: "status-overdue"},
            {min:200, max:399, label: "Limítrofe/Subótimo", colorClass: "status-warning"},
            {min:400, max:900, label: "Normal/Ótimo", colorClass: "status-ok"},
            {min:901, max:Infinity, label: "Elevado (Raro, verificar suplementação)", colorClass: "status-check"}
        ]
    },
    {
        id: 'gordura_bio', name: 'Gordura Corporal (Bioimpedância)', unit: '%',
        barMin: 5, barMax: 50,
        optimalMin: 10, optimalMax: 20,
        zones: [
            {min:0, max:14, label: "Muito Baixo/Atleta (M)", colorClass: "status-ok"},
            {min:15, max:20, label: "Bom (M)", colorClass: "status-ok"},
            {min:21, max:25, label: "Aceitável (M)", colorClass: "status-warning"},
            {min:26, max:Infinity, label: "Obeso (M)", colorClass: "status-overdue"},
            {min:0, max:21, label: "Muito Baixo/Atleta (F)", colorClass: "status-ok"},
            {min:22, max:25, label: "Bom (F)", colorClass: "status-ok"},
            {min:26, max:31, label: "Aceitável (F)", colorClass: "status-warning"},
            {min:32, max:Infinity, label: "Obesa (F)", colorClass: "status-overdue"}
        ]
    },
    {
        id: 'massamagra_bio', name: 'Massa Magra (Bioimpedância)', unit: 'kg',
        barMin: 30, barMax: 90, optimalMin: 50, optimalMax: 80, reversedGradient: true,
        zones: [
            {min:0, max:40, label: "Baixa", colorClass: "status-warning"},
            {min:41, max:80, label: "Adequada", colorClass: "status-ok"},
            {min:81, max:Infinity, label: "Alta", colorClass: "status-ok"}
        ]
    }
];

export const diagnosticConfigs: DiagnosticConfig[] = [
    {
        id: 'exame-prostata',
        name: 'Exame de Próstata (PSA/Toque)',
        hasSeverity: false
    },
    {
        id: 'mamografia',
        name: 'Mamografia',
        hasType: true,
        hasSeverity: true
    },
    {
        id: 'papanicolau',
        name: 'Papanicolau (Preventivo)',
        hasSeverity: true
    },
    {
        id: 'colonoscopia',
        name: 'Colonoscopia',
        hasType: true,
        hasSeverity: true
    },
    {
        id: 'dermatologico',
        name: 'Exame Dermatológico (Pele)',
        hasSeverity: true
    },
    {
        id: 'oftalmologico',
        name: 'Exame Oftalmológico (Visão)',
        hasType: true,
        hasSeverity: false
    },
    {
        id: 'odontologico',
        name: 'Check-up Odontológico',
        hasType: true,
        hasSeverity: true
    },
    {
        id: 'densitometria',
        name: 'Densitometria Óssea',
        hasSeverity: true
    },
    {
        id: 'audiometria',
        name: 'Audiometria',
        hasSeverity: true
    }
];
