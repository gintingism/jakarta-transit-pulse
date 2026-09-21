/**
 * Database & Pure Lookup Helpers for Platform & Transfer Guidance in Jakarta Transit Pulse.
 * Accurately grounded in official KAI Commuter (SO-7 Manggarai & station layouts)
 * and TransJakarta integrated hub configurations.
 */

export interface PlatformGuidance {
  stationId: string;
  stationName: string;
  platform: string; // e.g. "Jalur 1 & 2", "Peron 5", "Lantai 1"
  level: string; // e.g. "Lantai Dasar (At-Grade)", "Lantai Layang (Lt 2)", "Lantai 4 & 5"
  direction: string; // e.g. "Arah Angke / Duri / Kampung Bandan"
  transferTips: string; // e.g. "Gunakan eskalator/lift tengah peron untuk turun ke lantai dasar."
  gateInfo?: string; // e.g. "Gate Barat (Jl. Manggarai Barat) & Gate Timur (Jl. Saharjo)"
  facilities?: string[];
}

export interface StationPlatformRule {
  stationId: string;
  lineIds?: string[];
  targetStationIds?: string[];
  guidance: PlatformGuidance;
}

export const PLATFORM_GUIDANCE_RULES: StationPlatformRule[] = [
  // -------------------------------------------------------------------------
  // 1. STASIUN MANGGARAI (SO-7 Layout)
  // -------------------------------------------------------------------------
  // Cikarang Line towards Tanah Abang / Angke / Kampung Bandan
  {
    stationId: 'krl_manggarai',
    lineIds: ['krl-cikarang'],
    targetStationIds: [
      'krl_sudirman',
      'krl_karet',
      'krl_tanah_abang',
      'krl_duri',
      'krl_angke',
      'krl_kampung_bandan',
    ],
    guidance: {
      stationId: 'krl_manggarai',
      stationName: 'Stasiun Manggarai',
      platform: 'Jalur 1 & 2',
      level: 'Lantai Dasar (At-Grade)',
      direction: 'Arah Tanah Abang / Duri / Kampung Bandan',
      transferTips: 'Gunakan eskalator/lift di tengah peron atau tangga utama untuk turun ke Lantai Dasar.',
      gateInfo: 'Gate Barat (arah Halte Busway Manggarai) & Gate Timur (arah Saharjo/Pasar Raya).',
      facilities: ['Eskalator', 'Lift Prioritas', 'Toilet', 'Musholla', 'Ruang Laktasi'],
    },
  },
  // Cikarang Line towards Bekasi / Cikarang
  {
    stationId: 'krl_manggarai',
    lineIds: ['krl-cikarang'],
    targetStationIds: [
      'krl_matraman',
      'krl_jatinegara',
      'krl_klender',
      'krl_buaran',
      'krl_cakung',
      'krl_kranji',
      'krl_bekasi',
      'krl_tambun',
      'krl_cibitung',
      'krl_cikarang',
    ],
    guidance: {
      stationId: 'krl_manggarai',
      stationName: 'Stasiun Manggarai',
      platform: 'Jalur 3 & 4',
      level: 'Lantai Dasar (At-Grade)',
      direction: 'Arah Bekasi / Cikarang via Jatinegara',
      transferTips: 'Gunakan eskalator/lift di area concourse lantai 1 untuk turun ke Jalur 3 & 4 lantai dasar.',
      gateInfo: 'Gate Barat & Gate Timur.',
      facilities: ['Eskalator', 'Lift Prioritas', 'Toilet', 'Musholla'],
    },
  },
  // Basoetta (KA Bandara) at Manggarai
  {
    stationId: 'krl_manggarai',
    lineIds: ['kai-bandara'],
    guidance: {
      stationId: 'krl_manggarai',
      stationName: 'Stasiun Manggarai',
      platform: 'Jalur 7 & 8',
      level: 'Lantai Dasar (At-Grade)',
      direction: 'Arah Bandara Soekarno-Hatta (Basoetta)',
      transferTips: 'Masuk melalui gate khusus KA Bandara di concourse lantai 1 menuju peron Jalur 7 & 8.',
      gateInfo: 'Gate Khusus KA Bandara (Concourse Lantai 1).',
      facilities: ['Waiting Lounge KA Bandara', 'Eskalator', 'Lift', 'Toilet'],
    },
  },
  // Bogor Line towards Jakarta Kota
  {
    stationId: 'krl_manggarai',
    lineIds: ['krl-bogor'],
    targetStationIds: [
      'krl_cikini',
      'krl_gondangdia',
      'krl_gambir',
      'krl_juanda',
      'krl_sawah_besar',
      'krl_manggabesar',
      'krl_jayakarta',
      'krl_jakarta_kota',
    ],
    guidance: {
      stationId: 'krl_manggarai',
      stationName: 'Stasiun Manggarai',
      platform: 'Jalur 9 & 10',
      level: 'Lantai Layang (Elevated / Lt 2)',
      direction: 'Arah Jakarta Kota',
      transferTips: 'Naik ke Lantai Layang (Lt 2) menggunakan eskalator atau lift di concourse lantai 1.',
      gateInfo: 'Gate Barat & Gate Timur (akses concourse lt 1).',
      facilities: ['Eskalator', 'Lift Prioritas', 'Toilet', 'Musholla'],
    },
  },
  // Bogor Line towards Depok / Bogor / Nambo
  {
    stationId: 'krl_manggarai',
    lineIds: ['krl-bogor'],
    targetStationIds: [
      'krl_tebet',
      'krl_cawang',
      'krl_duren_kalibata',
      'krl_pasar_minggu',
      'krl_tanjung_barat',
      'krl_lenteng_agung',
      'krl_universitas_indonesia',
      'krl_pondok_cina',
      'krl_depok',
      'krl_depok_baru',
      'krl_citayam',
      'krl_bojonggede',
      'krl_cilebut',
      'krl_bogor',
      'krl_nambo',
    ],
    guidance: {
      stationId: 'krl_manggarai',
      stationName: 'Stasiun Manggarai',
      platform: 'Jalur 11 & 12',
      level: 'Lantai Layang (Elevated / Lt 2)',
      direction: 'Arah Depok / Bogor / Nambo',
      transferTips: 'Naik ke Lantai Layang (Lt 2) menggunakan eskalator/lift di tengah concourse menuju Jalur 11 & 12.',
      gateInfo: 'Gate Barat & Gate Timur.',
      facilities: ['Eskalator', 'Lift Prioritas', 'Toilet', 'Musholla'],
    },
  },

  // -------------------------------------------------------------------------
  // 2. STASIUN TANAH ABANG
  // -------------------------------------------------------------------------
  // Rangkasbitung Line
  {
    stationId: 'krl_tanah_abang',
    lineIds: ['krl-rangkasbitung'],
    guidance: {
      stationId: 'krl_tanah_abang',
      stationName: 'Stasiun Tanah Abang',
      platform: 'Peron 5 & 6',
      level: 'Bangunan Lama (Sisi Barat)',
      direction: 'Arah Serpong / Parung Panjang / Rangkasbitung',
      transferTips: 'Gunakan jembatan penyeberangan orang (JPO) berkanopi atau hall tengah menuju Peron 5 & 6.',
      gateInfo: 'Gate JPO Timur (Pasar Tanah Abang) & Gate Barat (Jl. Jatibaru Raya).',
      facilities: ['Eskalator', 'Lift', 'Toilet', 'Musholla'],
    },
  },
  // Cikarang Line towards Duri / Kampung Bandan
  {
    stationId: 'krl_tanah_abang',
    lineIds: ['krl-cikarang'],
    targetStationIds: ['krl_duri', 'krl_angke', 'krl_kampung_bandan', 'krl_rajawali'],
    guidance: {
      stationId: 'krl_tanah_abang',
      stationName: 'Stasiun Tanah Abang',
      platform: 'Peron 1',
      level: 'Bangunan Baru (Sisi Utara)',
      direction: 'Arah Duri / Angke / Kampung Bandan',
      transferTips: 'Menuju Peron 1 di sisi bangunan baru. Perhatikan papan pengumuman jalur.',
      gateInfo: 'Gate Barat & Gate Timur.',
      facilities: ['Eskalator', 'Toilet', 'Musholla'],
    },
  },
  // Cikarang Line towards Manggarai / Bekasi / Cikarang
  {
    stationId: 'krl_tanah_abang',
    lineIds: ['krl-cikarang'],
    targetStationIds: ['krl_karet', 'krl_sudirman', 'krl_manggarai', 'krl_bekasi', 'krl_cikarang'],
    guidance: {
      stationId: 'krl_tanah_abang',
      stationName: 'Stasiun Tanah Abang',
      platform: 'Peron 2',
      level: 'Bangunan Baru',
      direction: 'Arah Manggarai / Bekasi / Cikarang',
      transferTips: 'Menuju Peron 2 bangunan baru untuk KRL tujuan Manggarai dan Bekasi.',
      gateInfo: 'Gate Barat & Gate Timur.',
      facilities: ['Eskalator', 'Lift', 'Toilet'],
    },
  },

  // -------------------------------------------------------------------------
  // 3. STASIUN DURI
  // -------------------------------------------------------------------------
  // Tangerang Line
  {
    stationId: 'krl_duri',
    lineIds: ['krl-tangerang'],
    guidance: {
      stationId: 'krl_duri',
      stationName: 'Stasiun Duri',
      platform: 'Peron 5',
      level: 'Lantai Atas / Akses JPO',
      direction: 'Arah Tangerang (Lin Tangerang)',
      transferTips: 'Naik tangga atau eskalator menuju JPO atas lalu turun ke Peron 5 khusus keberangkatan Tangerang.',
      gateInfo: 'Gate Barat (Jl. Duri Utara) & Gate Timur (Jl. Kalianyar).',
      facilities: ['Eskalator', 'Lift Prioritas', 'Toilet', 'Musholla'],
    },
  },
  // Cikarang Line towards Tanah Abang / Manggarai
  {
    stationId: 'krl_duri',
    lineIds: ['krl-cikarang'],
    targetStationIds: ['krl_tanah_abang', 'krl_sudirman', 'krl_manggarai', 'krl_bekasi'],
    guidance: {
      stationId: 'krl_duri',
      stationName: 'Stasiun Duri',
      platform: 'Peron 2',
      level: 'Lantai Dasar',
      direction: 'Arah Tanah Abang / Manggarai / Bekasi',
      transferTips: 'Gunakan Peron 2 lantai dasar untuk KRL arah Tanah Abang dan Manggarai.',
      gateInfo: 'Gate Barat & Gate Timur.',
      facilities: ['Toilet', 'Musholla'],
    },
  },
  // Cikarang Line towards Angke / Kampung Bandan
  {
    stationId: 'krl_duri',
    lineIds: ['krl-cikarang'],
    targetStationIds: ['krl_angke', 'krl_kampung_bandan', 'krl_rajawali'],
    guidance: {
      stationId: 'krl_duri',
      stationName: 'Stasiun Duri',
      platform: 'Peron 1',
      level: 'Lantai Dasar',
      direction: 'Arah Angke / Kampung Bandan / Pasar Senen',
      transferTips: 'Menuju Peron 1 lantai dasar.',
      gateInfo: 'Gate Barat & Gate Timur.',
      facilities: ['Toilet', 'Musholla'],
    },
  },
  // KA Bandara at Duri
  {
    stationId: 'krl_duri',
    lineIds: ['kai-bandara'],
    guidance: {
      stationId: 'krl_duri',
      stationName: 'Stasiun Duri',
      platform: 'Peron 3 & 4',
      level: 'Lantai Dasar',
      direction: 'Arah Bandara Soetta / Manggarai',
      transferTips: 'Gunakan peron khusus KA Bandara di Peron 3 atau 4.',
      gateInfo: 'Gate Khusus KA Bandara.',
      facilities: ['Waiting Lounge KA Bandara', 'Eskalator', 'Toilet'],
    },
  },

  // -------------------------------------------------------------------------
  // 4. STASIUN JATINEGARA
  // -------------------------------------------------------------------------
  // Towards Bekasi / Cikarang
  {
    stationId: 'krl_jatinegara',
    lineIds: ['krl-cikarang', 'krl-cikarang-senen'],
    targetStationIds: ['krl_klender', 'krl_buaran', 'krl_cakung', 'krl_kranji', 'krl_bekasi', 'krl_cikarang'],
    guidance: {
      stationId: 'krl_jatinegara',
      stationName: 'Stasiun Jatinegara',
      platform: 'Jalur 1 & 2',
      level: 'Lantai Dasar (Akses Concourse Atas)',
      direction: 'Arah Bekasi / Cikarang',
      transferTips: 'Turun dari skybridge concourse baru menggunakan eskalator/lift menuju peron Jalur 1 & 2.',
      gateInfo: 'Gate Utama Gedung Baru (Jl. Bekasi Barat) & Pintu Selatan.',
      facilities: ['Eskalator', 'Lift Prioritas', 'Toilet', 'Musholla', 'Minimarket'],
    },
  },
  // Towards Manggarai / Pasar Senen
  {
    stationId: 'krl_jatinegara',
    lineIds: ['krl-cikarang', 'krl-cikarang-senen'],
    targetStationIds: ['krl_matraman', 'krl_manggarai', 'krl_pondok_jati', 'krl_pasar_senen'],
    guidance: {
      stationId: 'krl_jatinegara',
      stationName: 'Stasiun Jatinegara',
      platform: 'Jalur 2 & 3',
      level: 'Lantai Dasar',
      direction: 'Arah Manggarai / Pasar Senen / Kampung Bandan',
      transferTips: 'Gunakan Jalur 2 untuk arah Manggarai atau Jalur 3/4 untuk arah Pasar Senen via skybridge concourse.',
      gateInfo: 'Gate Utama Gedung Baru.',
      facilities: ['Eskalator', 'Lift', 'Toilet'],
    },
  },

  // -------------------------------------------------------------------------
  // 5. STASIUN JAKARTA KOTA
  // -------------------------------------------------------------------------
  {
    stationId: 'krl_jakarta_kota',
    lineIds: ['krl-bogor'],
    guidance: {
      stationId: 'krl_jakarta_kota',
      stationName: 'Stasiun Jakarta Kota',
      platform: 'Jalur 10, 11, & 12',
      level: 'Lantai Dasar (Stasiun Ujung / Terminus)',
      direction: 'Arah Manggarai / Depok / Bogor',
      transferTips: 'KRL Lin Bogor umumnya diberangkatkan dari Jalur 10 s.d. 12 di hall utama.',
      gateInfo: 'Gate Utama Gedung Cagar Budaya (pintu selatan) & Gate Terowongan Bawah Tanah (arah Halte TJ Kota).',
      facilities: ['Terowongan Bawah Tanah Penyeberangan', 'Toilet', 'Musholla'],
    },
  },

  // -------------------------------------------------------------------------
  // 6. HALTE CSW / STASIUN MRT ASEAN (Transit Hub Modern)
  // -------------------------------------------------------------------------
  // TransJakarta Koridor 1 (Blok M - Kota)
  {
    stationId: 'tj_csw',
    lineIds: ['tj-corridor-1'],
    guidance: {
      stationId: 'tj_csw',
      stationName: 'Halte CSW 1 (Blok M - Kota)',
      platform: 'Lantai 1',
      level: 'Lantai Bawah (At-Grade)',
      direction: 'Koridor 1: Arah Blok M / Monas / Kota',
      transferTips: 'Untuk transfer ke Koridor 13 (Tendean - Ciledug), gunakan lift atau eskalator menuju Lantai 4 & 5. Untuk ke MRT ASEAN, gunakan skybridge di Lantai 2.',
      gateInfo: 'Gate Masuk Lantai 1 & Skybridge Lantai 2.',
      facilities: ['Eskalator Integrasi', 'Lift Prioritas', 'Toilet', 'Musholla', 'Area Ritel Komersial'],
    },
  },
  // TransJakarta Koridor 13 at CSW
  {
    stationId: 'tj_csw_2',
    lineIds: ['tj-corridor-13'],
    guidance: {
      stationId: 'tj_csw_2',
      stationName: 'Halte CSW 2 (Koridor 13 Melayang)',
      platform: 'Lantai 4 & 5',
      level: 'Lantai Atas (Elevated)',
      direction: 'Koridor 13: Arah Tendean / CBD Ciledug',
      transferTips: 'Turun ke Lantai 1 via eskalator/lift untuk Koridor 1, atau Lantai 2 untuk Stasiun MRT ASEAN.',
      gateInfo: 'Gate Tiket Lantai 4.',
      facilities: ['Lift Integrasi CSW', 'Eskalator', 'Toilet'],
    },
  },

  // -------------------------------------------------------------------------
  // 7. DUKUH ATAS MULTI-MODAL HUB (KRL Sudirman, TJ Dukuh Atas, LRT & MRT)
  // -------------------------------------------------------------------------
  {
    stationId: 'krl_sudirman',
    guidance: {
      stationId: 'krl_sudirman',
      stationName: 'Stasiun Sudirman',
      platform: 'Peron 1 (Arah Manggarai) / Peron 2 (Arah Duri)',
      level: 'Lantai Dasar',
      direction: 'Lin Cikarang',
      transferTips: 'Gunakan Jembatan Penyeberangan Multiguna (JPO Dukuh Atas) untuk transfer mudah ke Halte TJ Galunggung/Dukuh Atas, Stasiun LRT Dukuh Atas, dan MRT Dukuh Atas BNI tanpa keluar ke jalan raya.',
      gateInfo: 'Gate Terowongan Kendal & Gate JPO Multiguna.',
      facilities: ['JPO Multiguna Terintegrasi', 'Eskalator', 'Toilet', 'Musholla'],
    },
  },
  {
    stationId: 'tj_dukuh_atas_1',
    guidance: {
      stationId: 'tj_dukuh_atas_1',
      stationName: 'Halte Dukuh Atas',
      platform: 'Peron Busway Koridor 1',
      level: 'Lantai Atas Terowongan',
      direction: 'Arah Blok M / Kota',
      transferTips: 'Ikuti jembatan integrasi menuju Stasiun KRL Sudirman atau Halte Galunggung (Koridor 4/6).',
      gateInfo: 'Gate Jembatan Penyeberangan Dukuh Atas.',
      facilities: ['Jembatan Integrasi', 'Tap In/Out Gate'],
    },
  },

  // -------------------------------------------------------------------------
  // 8. CIKOKO / STASIUN CAWANG (Integrasi KRL, TJ Kor 9, & LRT Jabodebek)
  // -------------------------------------------------------------------------
  {
    stationId: 'krl_cawang',
    guidance: {
      stationId: 'krl_cawang',
      stationName: 'Stasiun Cawang',
      platform: 'Peron 1 (Arah Jakarta Kota) / Peron 2 (Arah Bogor)',
      level: 'Lantai Dasar',
      direction: 'Lin Bogor',
      transferTips: 'Gunakan skybridge terintegrasi di sisi timur untuk langsung berpindah ke Halte Transjakarta Cikoko (Koridor 9) dan Stasiun LRT Jabodebek Cikoko.',
      gateInfo: 'Gate Skybridge Terintegrasi LRT/TJ & Gate Jalan Tebet Timur.',
      facilities: ['Skybridge Terintegrasi', 'Eskalator', 'Lift', 'Toilet'],
    },
  },
  {
    stationId: 'tj_cikoko_st_cawang',
    guidance: {
      stationId: 'tj_cikoko_st_cawang',
      stationName: 'Halte Cikoko',
      platform: 'Peron Koridor 9 (Jl. MT Haryono)',
      level: 'Lantai Jembatan Busway',
      direction: 'Koridor 9: Arah Pinang Ranti / Pluit',
      transferTips: 'Terhubung langsung via skybridge beratap ke Stasiun KRL Cawang dan Stasiun LRT Cikoko.',
      gateInfo: 'Gate Skybridge Cikoko.',
      facilities: ['Skybridge Antarmoda', 'Lift Aksesibilitas', 'Toilet'],
    },
  },
];

/**
 * Pure function to resolve platform guidance based on station ID, line ID, and optional target station ID.
 */
export function getPlatformGuidance(
  stationId: string,
  lineId?: string,
  targetStationId?: string
): PlatformGuidance | null {
  if (!stationId) return null;

  const normalizedStationId = stationId.toLowerCase();

  // 1. Try exact match by stationId + lineId + targetStationId
  if (lineId && targetStationId) {
    const matchedWithTarget = PLATFORM_GUIDANCE_RULES.find((rule) => {
      if (rule.stationId !== normalizedStationId) return false;
      if (rule.lineIds && !rule.lineIds.includes(lineId)) return false;
      if (rule.targetStationIds && !rule.targetStationIds.includes(targetStationId.toLowerCase())) {
        return false;
      }
      return true;
    });

    if (matchedWithTarget) {
      return matchedWithTarget.guidance;
    }
  }

  // 2. Try match by stationId + lineId
  if (lineId) {
    const matchedLine = PLATFORM_GUIDANCE_RULES.find((rule) => {
      if (rule.stationId !== normalizedStationId) return false;
      if (rule.lineIds && rule.lineIds.includes(lineId)) return true;
      return false;
    });

    if (matchedLine) {
      return matchedLine.guidance;
    }
  }

  // 3. Fallback: match by stationId only
  const fallbackMatch = PLATFORM_GUIDANCE_RULES.find(
    (rule) => rule.stationId === normalizedStationId
  );

  return fallbackMatch ? fallbackMatch.guidance : null;
}
