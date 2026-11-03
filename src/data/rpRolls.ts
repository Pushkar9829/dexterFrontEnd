export interface RpRollRecord {
  id: string
  sn: number
  atmId: string
  siteId: string
  franchiseeName: string
  hubLocations: string
  frName: string
  frAddressWithPin: string
  frNumber: string
  state: string
  pinCode: string
  despatchChallanNo: string
  dispatchedViaCourierName: string
  docketNo: string
  dispatchDate: string
  deliveryStatusDate: string
  remarks: string
  documentName?: string
  status?: string
}

export const KNOWN_ATMS = [
  {
    atmId: 'MCRM0389',
    siteId: 'MCRM1943',
    franchiseeName: 'Siddhant Shakya',
    hubLocations: 'MAINPURI - MCRM1943',
    frName: 'Dexter India Management & Services Pvt. Ltd.',
    frAddressWithPin: 'Anil Automobiles, Chaudhary Petrol Pump, Kachehari Road Mainpuri, U.P. 205001',
    frNumber: '8755555003',
    state: 'UTTAR PRADESH',
    pinCode: '205001',
  },
  {
    atmId: 'MBP13124',
    siteId: 'ST-UP-LKO-00305',
    franchiseeName: 'Awadh Banking Point',
    hubLocations: 'LUCKNOW - MCRM2045',
    frName: 'Dexter India Management & Services Pvt. Ltd.',
    frNumber: '9415030518',
    frAddressWithPin: 'Hazratganj, Ashok Marg, Lucknow, Uttar Pradesh 226001',
    state: 'UTTAR PRADESH',
    pinCode: '226001',
  },
  {
    atmId: 'DX-MH-01482',
    siteId: 'ST-MH-PUN-00124',
    franchiseeName: 'Shree Sai Financial Services',
    hubLocations: 'PUNE - MCRM5011',
    frName: 'Shree Sai Financial Services Pvt. Ltd.',
    frNumber: '9822041124',
    frAddressWithPin: 'Kothrud, Paud Road, Pune, Maharashtra 411038',
    state: 'MAHARASHTRA',
    pinCode: '411038',
  },
  {
    atmId: 'DX-GJ-02187',
    siteId: 'ST-GJ-AMD-00218',
    franchiseeName: 'Patel Cash Solutions',
    hubLocations: 'AHMEDABAD - MCRM6012',
    frName: 'Patel Cash & Payment Services',
    frNumber: '9825021867',
    frAddressWithPin: 'Navrangpura, CG Road, Ahmedabad, Gujarat 380009',
    state: 'GUJARAT',
    pinCode: '380009',
  },
  {
    atmId: 'DX-KA-00761',
    siteId: 'ST-KA-BLR-00076',
    franchiseeName: 'Namma ATM Network',
    hubLocations: 'BENGALURU - MCRM7015',
    frName: 'Namma ATM Network Pvt. Ltd.',
    frNumber: '9845007612',
    frAddressWithPin: 'Jayanagar 4th Block, Bengaluru, Karnataka 560011',
    state: 'KARNATAKA',
    pinCode: '560011',
  },
]

export const STATES_LIST = [
  'All States',
  'UTTAR PRADESH',
  'MAHARASHTRA',
  'GUJARAT',
  'KARNATAKA',
  'DELHI',
  'WEST BENGAL',
  'RAJASTHAN',
  'MADHYA PRADESH',
  'BIHAR',
  'TAMIL NADU',
  'HARYANA',
  'PUNJAB',
]

export const COURIER_LIST = [
  'DTDC',
  'Blue Dart',
  'Delhivery',
  'Professional Couriers',
  'Speed Post',
  'Trackon',
  'Tirupati Courier',
  'Ecom Express',
]

export const HUB_LOCATIONS_LIST = [
  'MAINPURI - MCRM1943',
  'AGRA - MCRM1012',
  'LUCKNOW - MCRM2045',
  'KANPUR - MCRM3011',
  'PUNE - MCRM5011',
  'AHMEDABAD - MCRM6012',
  'BENGALURU - MCRM7015',
  'NOIDA - MCRM4022',
  'VARANASI - MCRM3044',
  'JAIPUR - MCRM5020',
]

export const DELIVERY_STATUSES = [
  'All Status',
  'Delivered',
  'In Transit',
  'Dispatched',
  'Out for Delivery',
  'Pending',
  'Delayed',
  'RTO',
]

export const INITIAL_RP_ROLLS: RpRollRecord[] = [
  {
    id: 'rp-1',
    sn: 1,
    atmId: 'MCRM0389',
    siteId: 'MCRM1943',
    franchiseeName: 'Siddhant Shakya',
    hubLocations: 'MAINPURI - MCRM1943',
    frName: 'Dexter India Management & Services Pvt. Ltd.',
    frAddressWithPin: 'Anil Automobiles, Chaudhary Petrol Pump, Kachehari Road Mainpuri, U.P. 205001',
    frNumber: '8755555003',
    state: 'UTTAR PRADESH',
    pinCode: '205001',
    despatchChallanNo: 'KVP-H-610',
    dispatchedViaCourierName: 'DTDC',
    docketNo: 'Z49557733',
    dispatchDate: '19-Nov-2026',
    deliveryStatusDate: '24-Nov-2026',
    remarks: 'Delivered',
    status: 'Delivered',
  },
  {
    id: 'rp-2',
    sn: 2,
    atmId: 'MBP13124',
    siteId: 'ST-UP-LKO-00305',
    franchiseeName: 'Awadh Banking Point',
    hubLocations: 'LUCKNOW - MCRM2045',
    frName: 'Dexter India Management & Services Pvt. Ltd.',
    frAddressWithPin: 'Hazratganj, Ashok Marg, Lucknow, Uttar Pradesh 226001',
    frNumber: '9415030518',
    state: 'UTTAR PRADESH',
    pinCode: '226001',
    despatchChallanNo: 'KVP-H-611',
    dispatchedViaCourierName: 'DTDC',
    docketNo: 'Z49558912',
    dispatchDate: '20-Nov-2026',
    deliveryStatusDate: '25-Nov-2026',
    remarks: 'In Transit',
    status: 'In Transit',
  },
  {
    id: 'rp-3',
    sn: 3,
    atmId: 'DX-MH-01482',
    siteId: 'ST-MH-PUN-00124',
    franchiseeName: 'Shree Sai Financial Services',
    hubLocations: 'PUNE - MCRM5011',
    frName: 'Shree Sai Financial Services Pvt. Ltd.',
    frAddressWithPin: 'Kothrud, Paud Road, Pune, Maharashtra 411038',
    frNumber: '9822041124',
    state: 'MAHARASHTRA',
    pinCode: '411038',
    despatchChallanNo: 'KVP-H-612',
    dispatchedViaCourierName: 'Blue Dart',
    docketNo: 'BL98341201',
    dispatchDate: '21-Nov-2026',
    deliveryStatusDate: '26-Nov-2026',
    remarks: 'Dispatched',
    status: 'Dispatched',
  },
  {
    id: 'rp-4',
    sn: 4,
    atmId: 'DX-GJ-02187',
    siteId: 'ST-GJ-AMD-00218',
    franchiseeName: 'Patel Cash Solutions',
    hubLocations: 'AHMEDABAD - MCRM6012',
    frName: 'Patel Cash & Payment Services',
    frAddressWithPin: 'Navrangpura, CG Road, Ahmedabad, Gujarat 380009',
    frNumber: '9825021867',
    state: 'GUJARAT',
    pinCode: '380009',
    despatchChallanNo: 'KVP-H-613',
    dispatchedViaCourierName: 'Delhivery',
    docketNo: 'DL44921045',
    dispatchDate: '18-Nov-2026',
    deliveryStatusDate: '23-Nov-2026',
    remarks: 'Delivered',
    status: 'Delivered',
  },
  {
    id: 'rp-5',
    sn: 5,
    atmId: 'DX-KA-00761',
    siteId: 'ST-KA-BLR-00076',
    franchiseeName: 'Namma ATM Network',
    hubLocations: 'BENGALURU - MCRM7015',
    frName: 'Namma ATM Network Pvt. Ltd.',
    frAddressWithPin: 'Jayanagar 4th Block, Bengaluru, Karnataka 560011',
    frNumber: '9845007612',
    state: 'KARNATAKA',
    pinCode: '560011',
    despatchChallanNo: 'KVP-H-614',
    dispatchedViaCourierName: 'DTDC',
    docketNo: 'Z49561022',
    dispatchDate: '22-Nov-2026',
    deliveryStatusDate: '27-Nov-2026',
    remarks: 'Out for Delivery',
    status: 'Out for Delivery',
  },
  {
    id: 'rp-6',
    sn: 6,
    atmId: 'MCRM0412',
    siteId: 'ST-UP-AGR-00102',
    franchiseeName: 'Kanchan Sharma',
    hubLocations: 'AGRA - MCRM1012',
    frName: 'Sharma Financial Point',
    frAddressWithPin: 'MG Road, Sanjay Place, Agra, U.P. 282002',
    frNumber: '9837012345',
    state: 'UTTAR PRADESH',
    pinCode: '282002',
    despatchChallanNo: 'KVP-H-615',
    dispatchedViaCourierName: 'Speed Post',
    docketNo: 'SP88219034',
    dispatchDate: '17-Nov-2026',
    deliveryStatusDate: '22-Nov-2026',
    remarks: 'Delivered',
    status: 'Delivered',
  },
  {
    id: 'rp-7',
    sn: 7,
    atmId: 'MCRM0501',
    siteId: 'ST-UP-KNP-00211',
    franchiseeName: 'Rajesh Varma',
    hubLocations: 'KANPUR - MCRM3011',
    frName: 'Varma Cash & Retail Solutions',
    frAddressWithPin: 'Mall Road, Civil Lines, Kanpur, U.P. 208001',
    frNumber: '9415123987',
    state: 'UTTAR PRADESH',
    pinCode: '208001',
    despatchChallanNo: 'KVP-H-616',
    dispatchedViaCourierName: 'DTDC',
    docketNo: 'Z49562890',
    dispatchDate: '20-Nov-2026',
    deliveryStatusDate: '26-Nov-2026',
    remarks: 'Delivered',
    status: 'Delivered',
  },
  {
    id: 'rp-8',
    sn: 8,
    atmId: 'DX-MH-01497',
    siteId: 'ST-MH-PUN-00131',
    franchiseeName: 'Shree Sai Financial Services',
    hubLocations: 'PUNE - MCRM5011',
    frName: 'Shree Sai Financial Services Pvt. Ltd.',
    frAddressWithPin: 'Baner, Balewadi Phata, Pune, Maharashtra 411045',
    frNumber: '9822041124',
    state: 'MAHARASHTRA',
    pinCode: '411045',
    despatchChallanNo: 'KVP-H-617',
    dispatchedViaCourierName: 'Blue Dart',
    docketNo: 'BL98345678',
    dispatchDate: '23-Nov-2026',
    deliveryStatusDate: '28-Nov-2026',
    remarks: 'In Transit',
    status: 'In Transit',
  },
  {
    id: 'rp-9',
    sn: 9,
    atmId: 'DX-DL-03102',
    siteId: 'ST-UP-NOI-00422',
    franchiseeName: 'Capital Cash Services',
    hubLocations: 'NOIDA - MCRM4022',
    frName: 'Capital Cash Management Pvt. Ltd.',
    frAddressWithPin: 'Sector 18, Noida, Uttar Pradesh 201301',
    frNumber: '9811098765',
    state: 'UTTAR PRADESH',
    pinCode: '201301',
    despatchChallanNo: 'KVP-H-618',
    dispatchedViaCourierName: 'DTDC',
    docketNo: 'Z49567123',
    dispatchDate: '21-Nov-2026',
    deliveryStatusDate: '26-Nov-2026',
    remarks: 'Delivered',
    status: 'Delivered',
  },
  {
    id: 'rp-10',
    sn: 10,
    atmId: 'DX-RJ-04021',
    siteId: 'ST-RJ-JAI-00520',
    franchiseeName: 'Marwar Payments Hub',
    hubLocations: 'JAIPUR - MCRM5020',
    frName: 'Marwar ATM & Retail Network',
    frAddressWithPin: 'MI Road, Jayanti Market, Jaipur, Rajasthan 302001',
    frNumber: '9829054321',
    state: 'RAJASTHAN',
    pinCode: '302001',
    despatchChallanNo: 'KVP-H-619',
    dispatchedViaCourierName: 'Professional Couriers',
    docketNo: 'PC33901245',
    dispatchDate: '19-Nov-2026',
    deliveryStatusDate: '25-Nov-2026',
    remarks: 'Delivered',
    status: 'Delivered',
  },
  {
    id: 'rp-11',
    sn: 11,
    atmId: 'DX-WB-01831',
    siteId: 'ST-WB-KOL-00811',
    franchiseeName: 'Bengal Rural Payments',
    hubLocations: 'KOLKATA - MCRM8011',
    frName: 'Bengal Rural Payments Services',
    frAddressWithPin: 'Park Street, Kolkata, West Bengal 700016',
    frNumber: '9433018307',
    state: 'WEST BENGAL',
    pinCode: '700016',
    despatchChallanNo: 'KVP-H-620',
    dispatchedViaCourierName: 'Speed Post',
    docketNo: 'SP90123456',
    dispatchDate: '22-Nov-2026',
    deliveryStatusDate: '28-Nov-2026',
    remarks: 'Dispatched',
    status: 'Dispatched',
  },
  {
    id: 'rp-12',
    sn: 12,
    atmId: 'MCRM0618',
    siteId: 'ST-UP-VAR-00344',
    franchiseeName: 'Manoj Dubey',
    hubLocations: 'VARANASI - MCRM3044',
    frName: 'Kashi Cash Point',
    frAddressWithPin: 'Sigra, Cantt Road, Varanasi, U.P. 221002',
    frNumber: '9450012398',
    state: 'UTTAR PRADESH',
    pinCode: '221002',
    despatchChallanNo: 'KVP-H-621',
    dispatchedViaCourierName: 'DTDC',
    docketNo: 'Z49570189',
    dispatchDate: '24-Nov-2026',
    deliveryStatusDate: '29-Nov-2026',
    remarks: 'In Transit',
    status: 'In Transit',
  },
]

const STORAGE_KEY = 'dexter_rp_rolls_data'
const DRAFT_STORAGE_KEY = 'dexter_rp_rolls_draft'

export function getStoredRpRolls(): RpRollRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (e) {
    console.error('Failed to load RP Rolls from storage', e)
  }
  return INITIAL_RP_ROLLS
}

export function saveStoredRpRolls(records: RpRollRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch (e) {
    console.error('Failed to save RP Rolls to storage', e)
  }
}

export function addRpRollRecord(newEntry: Omit<RpRollRecord, 'id' | 'sn'>): RpRollRecord {
  const current = getStoredRpRolls()
  
  // Find first empty row or append
  const emptyIndex = current.findIndex(
    (r) => !r.atmId && !r.franchiseeName && !r.despatchChallanNo
  )

  const newRecord: RpRollRecord = {
    ...newEntry,
    id: `rp-${Date.now()}`,
    sn: emptyIndex !== -1 ? current[emptyIndex].sn : current.length + 1,
  }

  let updated: RpRollRecord[]
  if (emptyIndex !== -1) {
    updated = [...current]
    updated[emptyIndex] = newRecord
  } else {
    updated = [...current, newRecord]
  }

  saveStoredRpRolls(updated)
  return newRecord
}

export function getStoredDraft(): Partial<RpRollRecord> | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error('Failed to load RP Rolls draft', e)
  }
  return null
}

export function saveStoredDraft(draft: Partial<RpRollRecord>): void {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
  } catch (e) {
    console.error('Failed to save RP Rolls draft', e)
  }
}

export function clearStoredDraft(): void {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY)
  } catch (e) {
    console.error('Failed to clear RP Rolls draft', e)
  }
}

export function resetStoredRpRolls(): RpRollRecord[] {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (e) {
    console.error('Failed to reset RP Rolls', e)
  }
  return INITIAL_RP_ROLLS
}

