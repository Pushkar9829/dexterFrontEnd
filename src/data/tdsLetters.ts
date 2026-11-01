import { createStore } from '@/lib/store'
import { downloadCsv } from '@/lib/export'

export interface UploadedDocItem {
  id: string
  fileName: string
  uploadedOn: string
  uploadedBy: string
  size: string
  fileUrl?: string
}

export interface TdsLetterRecord {
  id: string
  month: string
  hitachiCode: string
  atmId: string
  siteId: string
  locationName: string
  franchiseName: string
  contactNo: string
  email: string
  model: string
  state: string
  clDate: string
  acStatus: string
  uploadStatus: 'Uploaded' | 'Pending'
  remark: string
  actionToBeTaken: 'Verified' | 'Send Reminder' | 'Review' | 'Follow Up'
  uploadedDocuments: UploadedDocItem[]
}

export interface AtmProfile {
  atmId: string
  hitachiCode: string
  siteId: string
  franchiseName: string
  contactNo: string
  email: string
  model: string
  locationName: string
  state: string
  acStatus: string
}

export const KNOWN_TDS_ATMS: Record<string, AtmProfile> = {
  ATM001: {
    atmId: 'ATM001',
    hitachiCode: 'HTH-1001',
    siteId: 'S-1001',
    franchiseName: 'Shree Sai Financial Services',
    contactNo: '+91 98765 43210',
    email: 'sai.financial@gmail.com',
    model: 'Hitachi ATM Model XYZ',
    locationName: 'Lucknow',
    state: 'UP',
    acStatus: 'Current Account',
  },
  MCRM7303: {
    atmId: 'MCRM7303',
    hitachiCode: 'HTH-1021',
    siteId: 'S-1001',
    franchiseName: 'ABC Services',
    contactNo: '98765 *****',
    email: 'abc.services@financial.in',
    model: 'Hitachi ATM Model XYZ',
    locationName: 'Lucknow',
    state: 'UP',
    acStatus: 'Current Account',
  },
  MBP12121: {
    atmId: 'MBP12121',
    hitachiCode: 'HTH-2045',
    siteId: 'S-1002',
    franchiseName: 'XYZ Enterprises',
    contactNo: '91234 *****',
    email: 'xyz.enterprises@partner.in',
    model: 'Hitachi ATM Model 200',
    locationName: 'Kanpur',
    state: 'UP',
    acStatus: 'Axis Indent',
  },
  NODR5566: {
    atmId: 'NODR5566',
    hitachiCode: 'HTH-3090',
    siteId: 'S-1003',
    franchiseName: 'KLM Services',
    contactNo: '98701 *****',
    email: 'klm.services@domain.com',
    model: 'Hitachi Cash Recycler 300',
    locationName: 'Noida',
    state: 'UP',
    acStatus: 'ICICI SR',
  },
  DLHY8890: {
    atmId: 'DLHY8890',
    hitachiCode: 'HTH-4156',
    siteId: 'S-1004',
    franchiseName: 'PQR Solutions',
    contactNo: '98987 *****',
    email: 'pqr.solutions@delhiops.com',
    model: 'Hitachi ATM Model 150',
    locationName: 'Delhi',
    state: 'DL',
    acStatus: 'Current Account',
  },
  GZBD2211: {
    atmId: 'GZBD2211',
    hitachiCode: 'HTH-5011',
    siteId: 'S-1005',
    franchiseName: 'LMN Enterprises',
    contactNo: '99112 *****',
    email: 'lmn.enterprises@gmail.com',
    model: 'Hitachi Model XYZ',
    locationName: 'Ghaziabad',
    state: 'UP',
    acStatus: 'Axis Indent',
  },
  PRYR3344: {
    atmId: 'PRYR3344',
    hitachiCode: 'HTH-6099',
    siteId: 'S-1006',
    franchiseName: 'RST Services',
    contactNo: '99345 *****',
    email: 'rst.prayagraj@outlook.com',
    model: 'Hitachi CRM 400',
    locationName: 'Prayagraj',
    state: 'UP',
    acStatus: 'ICICI SR',
  },
  VRNS9102: {
    atmId: 'VRNS9102',
    hitachiCode: 'HTH-7120',
    siteId: 'S-1007',
    franchiseName: 'Kashi Tech Services',
    contactNo: '97812 *****',
    email: 'kashi.tech@gmail.com',
    model: 'Hitachi Model XYZ',
    locationName: 'Varanasi',
    state: 'UP',
    acStatus: 'Current Account',
  },
  AGRA4412: {
    atmId: 'AGRA4412',
    hitachiCode: 'HTH-8234',
    siteId: 'S-1008',
    franchiseName: 'Taj Financial Net',
    contactNo: '96541 *****',
    email: 'taj.fin@agra.co',
    model: 'Hitachi ATM 250',
    locationName: 'Agra',
    state: 'UP',
    acStatus: 'Axis Indent',
  },
  MRUT1188: {
    atmId: 'MRUT1188',
    hitachiCode: 'HTH-9345',
    siteId: 'S-1009',
    franchiseName: 'Shree Balaji Fin',
    contactNo: '95432 *****',
    email: 'balaji.meerut@yahoo.com',
    model: 'Hitachi ATM Model XYZ',
    locationName: 'Meerut',
    state: 'UP',
    acStatus: 'ICICI SR',
  },
  GKP7766: {
    atmId: 'GKP7766',
    hitachiCode: 'HTH-1056',
    siteId: 'S-1010',
    franchiseName: 'Purvanchal ATM Hub',
    contactNo: '94321 *****',
    email: 'purvanchal.atm@gmail.com',
    model: 'Hitachi ATM Model XYZ',
    locationName: 'Gorakhpur',
    state: 'UP',
    acStatus: 'Current Account',
  },
  ALGH3322: {
    atmId: 'ALGH3322',
    hitachiCode: 'HTH-2167',
    siteId: 'S-1011',
    franchiseName: 'Aligarh Banking Point',
    contactNo: '93210 *****',
    email: 'aligarh.bp@gmail.com',
    model: 'Hitachi CRM 400',
    locationName: 'Aligarh',
    state: 'UP',
    acStatus: 'Axis Indent',
  },
  MRDB8899: {
    atmId: 'MRDB8899',
    hitachiCode: 'HTH-3278',
    siteId: 'S-1012',
    franchiseName: 'Brass City Fin',
    contactNo: '92109 *****',
    email: 'brasscity.fin@gmail.com',
    model: 'Hitachi ATM Model XYZ',
    locationName: 'Moradabad',
    state: 'UP',
    acStatus: 'ICICI SR',
  },
  BRLY5544: {
    atmId: 'BRLY5544',
    hitachiCode: 'HTH-4389',
    siteId: 'S-1013',
    franchiseName: 'Rohilkhand Services',
    contactNo: '91098 *****',
    email: 'rohilkhand.srv@gmail.com',
    model: 'Hitachi ATM 250',
    locationName: 'Bareilly',
    state: 'UP',
    acStatus: 'Current Account',
  },
  JHNS2211: {
    atmId: 'JHNS2211',
    hitachiCode: 'HTH-5490',
    siteId: 'S-1014',
    franchiseName: 'Bundelkhand Fin Point',
    contactNo: '90987 *****',
    email: 'bundelkhand.fp@gmail.com',
    model: 'Hitachi Model XYZ',
    locationName: 'Jhansi',
    state: 'UP',
    acStatus: 'Axis Indent',
  },
}

export const INITIAL_TDS_RECORDS: TdsLetterRecord[] = [
  {
    id: 'TDS-01',
    month: 'November 2026',
    hitachiCode: 'HTH-1021',
    atmId: 'MCRM7303',
    siteId: 'S-1001',
    locationName: 'Lucknow',
    franchiseName: 'ABC Services',
    contactNo: '98765 *****',
    email: 'abc.services@financial.in',
    model: 'Hitachi ATM Model XYZ',
    state: 'UP',
    clDate: '05-11-2026',
    acStatus: 'Current Account',
    uploadStatus: 'Uploaded',
    remark: 'TDS letter received',
    actionToBeTaken: 'Verified',
    uploadedDocuments: [
      {
        id: 'DOC-101',
        fileName: 'TDS_Letter_MCRM7303_Nov2026.pdf',
        uploadedOn: '05-11-2026 11:30 AM',
        uploadedBy: 'Paras Dubey (Operations)',
        size: '2.4 MB',
      },
    ],
  },
  {
    id: 'TDS-02',
    month: 'November 2026',
    hitachiCode: 'HTH-2045',
    atmId: 'MBP12121',
    siteId: 'S-1002',
    locationName: 'Kanpur',
    franchiseName: 'XYZ Enterprises',
    contactNo: '91234 *****',
    email: 'xyz.enterprises@partner.in',
    model: 'Hitachi ATM Model 200',
    state: 'UP',
    clDate: '04-11-2026',
    acStatus: 'Axis Indent',
    uploadStatus: 'Pending',
    remark: 'Awaiting upload',
    actionToBeTaken: 'Send Reminder',
    uploadedDocuments: [],
  },
  {
    id: 'TDS-03',
    month: 'November 2026',
    hitachiCode: 'HTH-3090',
    atmId: 'NODR5566',
    siteId: 'S-1003',
    locationName: 'Noida',
    franchiseName: 'KLM Services',
    contactNo: '98701 *****',
    email: 'klm.services@domain.com',
    model: 'Hitachi Cash Recycler 300',
    state: 'UP',
    clDate: '03-11-2026',
    acStatus: 'ICICI SR',
    uploadStatus: 'Uploaded',
    remark: 'Document under review',
    actionToBeTaken: 'Review',
    uploadedDocuments: [
      {
        id: 'DOC-102',
        fileName: 'TDS_NODR5566_November.pdf',
        uploadedOn: '03-11-2026 04:15 PM',
        uploadedBy: 'Amit Jadhav',
        size: '1.8 MB',
      },
    ],
  },
  {
    id: 'TDS-04',
    month: 'November 2026',
    hitachiCode: 'HTH-4156',
    atmId: 'DLHY8890',
    siteId: 'S-1004',
    locationName: 'Delhi',
    franchiseName: 'PQR Solutions',
    contactNo: '98987 *****',
    email: 'pqr.solutions@delhiops.com',
    model: 'Hitachi ATM Model 150',
    state: 'DL',
    clDate: '02-11-2026',
    acStatus: 'Current Account',
    uploadStatus: 'Pending',
    remark: 'Not uploaded',
    actionToBeTaken: 'Follow Up',
    uploadedDocuments: [],
  },
  {
    id: 'TDS-05',
    month: 'November 2026',
    hitachiCode: 'HTH-5011',
    atmId: 'GZBD2211',
    siteId: 'S-1005',
    locationName: 'Ghaziabad',
    franchiseName: 'LMN Enterprises',
    contactNo: '99112 *****',
    email: 'lmn.enterprises@gmail.com',
    model: 'Hitachi Model XYZ',
    state: 'UP',
    clDate: '01-11-2026',
    acStatus: 'Axis Indent',
    uploadStatus: 'Uploaded',
    remark: 'TDS letter received',
    actionToBeTaken: 'Verified',
    uploadedDocuments: [
      {
        id: 'DOC-103',
        fileName: 'TDS_Letter_GZBD2211.pdf',
        uploadedOn: '01-11-2026 10:20 AM',
        uploadedBy: 'Suresh Nair',
        size: '3.1 MB',
      },
    ],
  },
  {
    id: 'TDS-06',
    month: 'November 2026',
    hitachiCode: 'HTH-6099',
    atmId: 'PRYR3344',
    siteId: 'S-1006',
    locationName: 'Prayagraj',
    franchiseName: 'RST Services',
    contactNo: '99345 *****',
    email: 'rst.prayagraj@outlook.com',
    model: 'Hitachi CRM 400',
    state: 'UP',
    clDate: '01-11-2026',
    acStatus: 'ICICI SR',
    uploadStatus: 'Pending',
    remark: 'Awaiting upload',
    actionToBeTaken: 'Send Reminder',
    uploadedDocuments: [],
  },
  {
    id: 'TDS-07',
    month: 'November 2026',
    hitachiCode: 'HTH-7120',
    atmId: 'VRNS9102',
    siteId: 'S-1007',
    locationName: 'Varanasi',
    franchiseName: 'Kashi Tech Services',
    contactNo: '97812 *****',
    email: 'kashi.tech@gmail.com',
    model: 'Hitachi Model XYZ',
    state: 'UP',
    clDate: '31-10-2026',
    acStatus: 'Current Account',
    uploadStatus: 'Uploaded',
    remark: 'TDS letter received',
    actionToBeTaken: 'Verified',
    uploadedDocuments: [
      {
        id: 'DOC-104',
        fileName: 'TDS_VRNS9102_Nov.pdf',
        uploadedOn: '31-10-2026 02:40 PM',
        uploadedBy: 'Paras Dubey (Operations)',
        size: '1.2 MB',
      },
    ],
  },
  {
    id: 'TDS-08',
    month: 'November 2026',
    hitachiCode: 'HTH-8234',
    atmId: 'AGRA4412',
    siteId: 'S-1008',
    locationName: 'Agra',
    franchiseName: 'Taj Financial Net',
    contactNo: '96541 *****',
    email: 'taj.fin@agra.co',
    model: 'Hitachi ATM 250',
    state: 'UP',
    clDate: '30-10-2026',
    acStatus: 'Axis Indent',
    uploadStatus: 'Pending',
    remark: 'Awaiting upload',
    actionToBeTaken: 'Send Reminder',
    uploadedDocuments: [],
  },
  {
    id: 'TDS-09',
    month: 'November 2026',
    hitachiCode: 'HTH-9345',
    atmId: 'MRUT1188',
    siteId: 'S-1009',
    locationName: 'Meerut',
    franchiseName: 'Shree Balaji Fin',
    contactNo: '95432 *****',
    email: 'balaji.meerut@yahoo.com',
    model: 'Hitachi ATM Model XYZ',
    state: 'UP',
    clDate: '29-10-2026',
    acStatus: 'ICICI SR',
    uploadStatus: 'Uploaded',
    remark: 'Document under review',
    actionToBeTaken: 'Review',
    uploadedDocuments: [
      {
        id: 'DOC-105',
        fileName: 'TDS_MRUT1188_Nov.pdf',
        uploadedOn: '29-10-2026 05:00 PM',
        uploadedBy: 'Rajesh Sharma',
        size: '2.0 MB',
      },
    ],
  },
  {
    id: 'TDS-10',
    month: 'November 2026',
    hitachiCode: 'HTH-1056',
    atmId: 'GKP7766',
    siteId: 'S-1010',
    locationName: 'Gorakhpur',
    franchiseName: 'Purvanchal ATM Hub',
    contactNo: '94321 *****',
    email: 'purvanchal.atm@gmail.com',
    model: 'Hitachi ATM Model XYZ',
    state: 'UP',
    clDate: '28-10-2026',
    acStatus: 'Current Account',
    uploadStatus: 'Pending',
    remark: 'Not uploaded',
    actionToBeTaken: 'Follow Up',
    uploadedDocuments: [],
  },
  {
    id: 'TDS-11',
    month: 'November 2026',
    hitachiCode: 'HTH-2167',
    atmId: 'ALGH3322',
    siteId: 'S-1011',
    locationName: 'Aligarh',
    franchiseName: 'Aligarh Banking Point',
    contactNo: '93210 *****',
    email: 'aligarh.bp@gmail.com',
    model: 'Hitachi CRM 400',
    state: 'UP',
    clDate: '27-10-2026',
    acStatus: 'Axis Indent',
    uploadStatus: 'Uploaded',
    remark: 'TDS letter received',
    actionToBeTaken: 'Verified',
    uploadedDocuments: [
      {
        id: 'DOC-106',
        fileName: 'TDS_ALGH3322.pdf',
        uploadedOn: '27-10-2026 01:10 PM',
        uploadedBy: 'Paras Dubey (Operations)',
        size: '2.8 MB',
      },
    ],
  },
  {
    id: 'TDS-12',
    month: 'November 2026',
    hitachiCode: 'HTH-3278',
    atmId: 'MRDB8899',
    siteId: 'S-1012',
    locationName: 'Moradabad',
    franchiseName: 'Brass City Fin',
    contactNo: '92109 *****',
    email: 'brasscity.fin@gmail.com',
    model: 'Hitachi ATM Model XYZ',
    state: 'UP',
    clDate: '26-10-2026',
    acStatus: 'ICICI SR',
    uploadStatus: 'Pending',
    remark: 'Awaiting upload',
    actionToBeTaken: 'Send Reminder',
    uploadedDocuments: [],
  },
  {
    id: 'TDS-13',
    month: 'November 2026',
    hitachiCode: 'HTH-4389',
    atmId: 'BRLY5544',
    siteId: 'S-1013',
    locationName: 'Bareilly',
    franchiseName: 'Rohilkhand Services',
    contactNo: '91098 *****',
    email: 'rohilkhand.srv@gmail.com',
    model: 'Hitachi ATM 250',
    state: 'UP',
    clDate: '25-10-2026',
    acStatus: 'Current Account',
    uploadStatus: 'Uploaded',
    remark: 'TDS letter received',
    actionToBeTaken: 'Verified',
    uploadedDocuments: [
      {
        id: 'DOC-107',
        fileName: 'TDS_BRLY5544.pdf',
        uploadedOn: '25-10-2026 12:15 PM',
        uploadedBy: 'Amit Jadhav',
        size: '1.5 MB',
      },
    ],
  },
  {
    id: 'TDS-14',
    month: 'November 2026',
    hitachiCode: 'HTH-5490',
    atmId: 'JHNS2211',
    siteId: 'S-1014',
    locationName: 'Jhansi',
    franchiseName: 'Bundelkhand Fin Point',
    contactNo: '90987 *****',
    email: 'bundelkhand.fp@gmail.com',
    model: 'Hitachi Model XYZ',
    state: 'UP',
    clDate: '24-10-2026',
    acStatus: 'Axis Indent',
    uploadStatus: 'Pending',
    remark: 'Awaiting upload',
    actionToBeTaken: 'Send Reminder',
    uploadedDocuments: [],
  },
]

export const tdsStore = createStore<TdsLetterRecord[]>('dexter_tds_letters_v1', () => INITIAL_TDS_RECORDS)

export function useTdsLetters() {
  const records = tdsStore.use()
  return {
    records,
    getRecordByAtmId: (atmId: string) => records.find((r) => r.atmId.toLowerCase() === atmId.toLowerCase()),
    getRecordById: (id: string) => records.find((r) => r.id === id),
    addOrUpdateRecord: (newRec: Partial<TdsLetterRecord> & { atmId: string; month: string }) => {
      tdsStore.set((prev) => {
        const existingIdx = prev.findIndex(
          (r) => r.atmId.toLowerCase() === newRec.atmId.toLowerCase() && r.month === newRec.month,
        )
        const profile = KNOWN_TDS_ATMS[newRec.atmId] || {
          atmId: newRec.atmId,
          hitachiCode: newRec.hitachiCode || `HTH-${Math.floor(1000 + Math.random() * 9000)}`,
          siteId: newRec.siteId || 'S-1001',
          franchiseName: newRec.franchiseName || 'Shree Sai Financial Services',
          contactNo: newRec.contactNo || '+91 98765 43210',
          email: newRec.email || 'sai.financial@gmail.com',
          model: newRec.model || 'Hitachi ATM Model XYZ',
          locationName: newRec.locationName || 'Lucknow',
          state: newRec.state || 'UP',
          acStatus: newRec.acStatus || 'Current Account',
        }

        if (existingIdx >= 0) {
          const current = prev[existingIdx]
          const updated: TdsLetterRecord = {
            ...current,
            ...newRec,
            uploadStatus: 'Uploaded',
            remark: newRec.remark || 'TDS letter received',
            actionToBeTaken: 'Verified',
            uploadedDocuments: [
              ...(current.uploadedDocuments || []),
              ...(newRec.uploadedDocuments || []),
            ],
          }
          const next = [...prev]
          next[existingIdx] = updated
          return next
        } else {
          const newEntry: TdsLetterRecord = {
            id: `TDS-${String(prev.length + 1).padStart(2, '0')}`,
            month: newRec.month,
            hitachiCode: profile.hitachiCode,
            atmId: newRec.atmId,
            siteId: profile.siteId,
            locationName: profile.locationName,
            franchiseName: profile.franchiseName,
            contactNo: profile.contactNo,
            email: profile.email,
            model: profile.model,
            state: profile.state,
            clDate: newRec.clDate || '01-11-2026',
            acStatus: profile.acStatus,
            uploadStatus: 'Uploaded',
            remark: newRec.remark || 'TDS letter received',
            actionToBeTaken: 'Verified',
            uploadedDocuments: newRec.uploadedDocuments || [],
          }
          return [newEntry, ...prev]
        }
      })
    },
    resetDummyData: () => {
      tdsStore.reset()
    },
  }
}

export function exportTdsCsv(records: TdsLetterRecord[], filename = 'tds-monthly-upload-status') {
  const headers = [
    'S.N.',
    'Month',
    'Hitachi Code',
    'ATM ID',
    'Location Name',
    'Franchise Name',
    'Contact No.',
    'State',
    'CL Date',
    'A/C Status',
    'Upload Status',
    'Remark',
    'Action to be Taken',
  ]
  const rows = records.map((r, i) => [
    String(i + 1),
    r.month,
    r.hitachiCode,
    r.atmId,
    r.locationName,
    r.franchiseName,
    r.contactNo,
    r.state,
    r.clDate,
    r.acStatus,
    r.uploadStatus,
    r.remark,
    r.actionToBeTaken,
  ])
  downloadCsv(filename, headers, rows)
}

