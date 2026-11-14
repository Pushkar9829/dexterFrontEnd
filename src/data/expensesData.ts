export interface ExpenseClaimItem {
  id: string
  date: string
  category: string
  route?: string
  purpose: string
  vendorRef: string
  travelMode?: string
  km?: number | string
  amount: number
  paymentMode: 'UPI' | 'Cash' | 'Card' | 'Net Banking'
  receiptName: string
  remarks?: string
}

export interface EmployeeInfo {
  name: string
  code: string
  department: string
  designation: string
  location: string
  reportingMonth: string
}

export const DEFAULT_EMPLOYEE: EmployeeInfo = {
  name: 'Harsh Pratap Singh',
  code: 'DITMP252615',
  department: 'WLA-Support',
  designation: 'Executive',
  location: 'Bewar (Mainpuri)',
  reportingMonth: 'Aug-26',
}

export const TOP_EXPENSE_HEADS = [
  { sn: 1, name: 'Fuel & Vehicle Running Expenses', claims: 38, amount: 142560, percent: 16.3 },
  { sn: 2, name: 'Accommodation Expenses', claims: 24, amount: 118400, percent: 13.6 },
  { sn: 3, name: 'Travel Allowance (TA)', claims: 20, amount: 98000, percent: 11.2 },
  { sn: 4, name: 'Client Meeting Expenses', claims: 16, amount: 76500, percent: 8.8 },
  { sn: 5, name: 'Office Utilities', claims: 12, amount: 65200, percent: 7.5 },
  { sn: 6, name: 'Office Stationery', claims: 18, amount: 52780, percent: 6.0 },
  { sn: 7, name: 'Local Transportation (Auto/Taxi/Bus)', claims: 21, amount: 49320, percent: 5.7 },
  { sn: 8, name: 'Courier & Postage Expenses', claims: 25, amount: 46880, percent: 5.4 },
]

export const ALL_EXPENSE_HEADS = [
  'Accommodation Expenses',
  'Client Meeting Expenses',
  'Courier & Postage Expenses',
  'Field Miscellaneous Expenses',
  'Field Refreshments',
  'Field Visit Conveyance',
  'Fuel & Vehicle Running Expenses',
  'Hospitality Expenses',
  'Incentive',
  'Local Transportation (Auto/Taxi/Bus)',
  'Office Utilities',
  'Office Stationery',
  'Speed Post',
  'Recharge (Mobile/Internet)',
  'Office Supplies',
  'ATM Hardware Maintenance',
  'Toll & Parking Charges',
  'Vehicle Repair & Service',
  'Staff Welfare & Tea',
  'Printing & Photocopying',
  'Bank & Demand Draft Charges',
  'Legal Notarization & Stamp Fees',
  'Emergency Site Consumables',
  'Other Operational Expenses',
]

export interface ExpenseReportRow {
  sn: number
  head: string
  office: number
  field: number
  other: number
  total: number
  claims: number
}

export const EXPENSE_SUMMARY_REPORT_DATA: ExpenseReportRow[] = [
  { sn: 1, head: 'Accommodation Expenses', office: 42000, field: 58400, other: 18000, total: 118400, claims: 24 },
  { sn: 2, head: 'Client Meeting Expenses', office: 28750, field: 41500, other: 6250, total: 76500, claims: 16 },
  { sn: 3, head: 'Courier & Postage Expenses', office: 18940, field: 21860, other: 6080, total: 46880, claims: 25 },
  { sn: 4, head: 'Field Miscellaneous Expenses', office: 0, field: 24600, other: 3200, total: 27800, claims: 9 },
  { sn: 5, head: 'Field Refreshments', office: 0, field: 17850, other: 5300, total: 23150, claims: 11 },
  { sn: 6, head: 'Field Visit Conveyance', office: 0, field: 36420, other: 8100, total: 44520, claims: 14 },
  { sn: 7, head: 'Fuel & Vehicle Running Expenses', office: 18460, field: 110300, other: 13800, total: 142560, claims: 38 },
  { sn: 8, head: 'Hospitality Expenses', office: 22000, field: 35000, other: 8500, total: 65500, claims: 12 },
  { sn: 9, head: 'Incentive', office: 0, field: 48000, other: 7500, total: 55500, claims: 7 },
  { sn: 10, head: 'Local Transportation (Auto/Taxi/Bus)', office: 14320, field: 28600, other: 6400, total: 49320, claims: 21 },
]

export const INITIAL_OFFICE_EXPENSES: ExpenseClaimItem[] = [
  {
    id: 'off-1',
    date: '03.08.2026',
    category: 'Speed Post',
    purpose: 'Mr. Parag Natwarlal Vadagma',
    vendorRef: 'UTR-250330478227',
    amount: 84,
    paymentMode: 'UPI',
    receiptName: 'POD_EU887279954IN.pdf',
    remarks: '-',
  },
  {
    id: 'off-2',
    date: '17.08.2026',
    category: 'Speed Post',
    purpose: 'Mr. Unmesh Patil',
    vendorRef: 'UTR-436004897203',
    amount: 141,
    paymentMode: 'UPI',
    receiptName: 'POD_EU887283335IN.pdf',
    remarks: '-',
  },
  {
    id: 'off-3',
    date: '18.08.2026',
    category: 'Recharge',
    purpose: 'Harsh Office (Mobile)',
    vendorRef: 'UTR-589110003236',
    amount: 302,
    paymentMode: 'UPI',
    receiptName: 'Recharge_Bill.pdf',
    remarks: '-',
  },
  {
    id: 'off-4',
    date: '27.08.2026',
    category: 'Office Supplies',
    purpose: 'Stationery for Office',
    vendorRef: 'INV-OS-00328',
    amount: 450,
    paymentMode: 'Card',
    receiptName: 'Invoice_00328.pdf',
    remarks: '-',
  },
  {
    id: 'off-5',
    date: '29.08.2026',
    category: 'Courier',
    purpose: 'Document to HO',
    vendorRef: 'AWB-7894512360',
    amount: 120,
    paymentMode: 'Cash',
    receiptName: 'Courier_Slip.pdf',
    remarks: '-',
  },
]

export const INITIAL_FIELD_EXPENSES: ExpenseClaimItem[] = [
  {
    id: 'fld-1',
    date: '05.08.2026',
    category: 'Petrol / Fuel',
    route: 'Bewar to Mainpuri',
    purpose: 'Site Visit & Coordination',
    vendorRef: 'UTR-589110003236',
    travelMode: 'Petrol / Fuel',
    km: 32,
    amount: 350,
    paymentMode: 'UPI',
    receiptName: 'Fuel_Bill_0508.pdf',
    remarks: '-',
  },
  {
    id: 'fld-2',
    date: '08.08.2026',
    category: 'Local Travel',
    route: 'Mainpuri (Local)',
    purpose: 'Vendor Meeting',
    vendorRef: 'CASH-REC-112',
    travelMode: 'Local Travel',
    km: 12,
    amount: 150,
    paymentMode: 'Cash',
    receiptName: 'Auto_Slip.pdf',
    remarks: '-',
  },
  {
    id: 'fld-3',
    date: '14.08.2026',
    category: 'Intercity Travel',
    route: 'Bewar to Kanpur',
    purpose: 'Project Review Meeting',
    vendorRef: 'TKT-KNP-8821',
    travelMode: 'Intercity Travel',
    km: 345,
    amount: 1250,
    paymentMode: 'Card',
    receiptName: 'Travel_Ticket.pdf',
    remarks: '-',
  },
  {
    id: 'fld-4',
    date: '16.08.2026',
    category: 'Accommodation',
    route: 'Kanpur',
    purpose: 'Stay for Project Work',
    vendorRef: 'HTL-INV-4419',
    travelMode: 'Accommodation',
    km: '-',
    amount: 2800,
    paymentMode: 'Card',
    receiptName: 'Hotel_Bill.pdf',
    remarks: '1 Night Stay',
  },
]

export interface ApprovalClaim {
  id: string
  claimNo: string
  empName: string
  empCode: string
  department: string
  claimType: 'Office' | 'Field' | 'Other'
  date: string
  itemsCount: number
  amount: number
  submittedDate: string
  stage: 'Senior' | 'HR' | 'Admin' | 'Finance'
  receiptName: string
  status: 'Pending' | 'Approved' | 'Rejected'
}

export const INITIAL_APPROVALS: ApprovalClaim[] = [
  {
    id: 'app-1',
    claimNo: 'CLM-AUG-0198',
    empName: 'Harsh Pratap Singh',
    empCode: 'DITMP252615',
    department: 'WLA-Support',
    claimType: 'Office',
    date: '29.08.2026',
    itemsCount: 5,
    amount: 1097,
    submittedDate: '29 Aug 2026, 05:20 PM',
    stage: 'Senior',
    receiptName: 'POD_EU887279954IN.pdf',
    status: 'Pending',
  },
  {
    id: 'app-2',
    claimNo: 'CLM-AUG-0205',
    empName: 'Harsh Pratap Singh',
    empCode: 'DITMP252615',
    department: 'WLA-Support',
    claimType: 'Field',
    date: '16.08.2026',
    itemsCount: 4,
    amount: 4550,
    submittedDate: '16 Aug 2026, 06:05 PM',
    stage: 'Senior',
    receiptName: 'Hotel_Bill.pdf',
    status: 'Pending',
  },
  {
    id: 'app-3',
    claimNo: 'CLM-AUG-0182',
    empName: 'Rajesh Nair',
    empCode: 'DITMP252601',
    department: 'Operations',
    claimType: 'Field',
    date: '24.08.2026',
    itemsCount: 6,
    amount: 3820,
    submittedDate: '24 Aug 2026, 07:15 PM',
    stage: 'HR',
    receiptName: 'Fuel_Toll_Receipts.pdf',
    status: 'Pending',
  },
  {
    id: 'app-4',
    claimNo: 'CLM-AUG-0174',
    empName: 'Pooja Deshmukh',
    empCode: 'DITMP252608',
    department: 'Legal & Compliance',
    claimType: 'Office',
    date: '22.08.2026',
    itemsCount: 3,
    amount: 2200,
    submittedDate: '22 Aug 2026, 03:40 PM',
    stage: 'Admin',
    receiptName: 'Notary_Stamp_Receipt.pdf',
    status: 'Pending',
  },
  {
    id: 'app-5',
    claimNo: 'CLM-AUG-0165',
    empName: 'Vikram Joshi',
    empCode: 'DITMP252622',
    department: 'Franchise Support',
    claimType: 'Field',
    date: '20.08.2026',
    itemsCount: 4,
    amount: 5400,
    submittedDate: '20 Aug 2026, 08:00 PM',
    stage: 'Finance',
    receiptName: 'Hotel_Invoice_882.pdf',
    status: 'Pending',
  },
  {
    id: 'app-6',
    claimNo: 'CLM-AUG-0158',
    empName: 'Amitabh Sharma',
    empCode: 'DITMP252619',
    department: 'Finance',
    claimType: 'Office',
    date: '18.08.2026',
    itemsCount: 2,
    amount: 980,
    submittedDate: '18 Aug 2026, 04:10 PM',
    stage: 'Senior',
    receiptName: 'Swiggy_Food_Bill.pdf',
    status: 'Pending',
  },
  {
    id: 'app-7',
    claimNo: 'CLM-AUG-0149',
    empName: 'Kavita Pillai',
    empCode: 'DITMP252631',
    department: 'Technology',
    claimType: 'Office',
    date: '15.08.2026',
    itemsCount: 3,
    amount: 1850,
    submittedDate: '15 Aug 2026, 01:25 PM',
    stage: 'HR',
    receiptName: 'Hardware_Store_Bill.pdf',
    status: 'Pending',
  },
  {
    id: 'app-8',
    claimNo: 'CLM-AUG-0141',
    empName: 'Sanjay Rawat',
    empCode: 'DITMP252640',
    department: 'Operations',
    claimType: 'Field',
    date: '14.08.2026',
    itemsCount: 5,
    amount: 4120,
    submittedDate: '14 Aug 2026, 06:50 PM',
    stage: 'Senior',
    receiptName: 'Petrol_Voucher.pdf',
    status: 'Pending',
  },
  {
    id: 'app-9',
    claimNo: 'CLM-AUG-0135',
    empName: 'Deepak Verma',
    empCode: 'DITMP252655',
    department: 'WLA-Support',
    claimType: 'Field',
    date: '12.08.2026',
    itemsCount: 3,
    amount: 2750,
    submittedDate: '12 Aug 2026, 09:10 PM',
    stage: 'Admin',
    receiptName: 'Train_Tickets_0812.pdf',
    status: 'Pending',
  },
  {
    id: 'app-10',
    claimNo: 'CLM-AUG-0128',
    empName: 'Meenakshi Iyer',
    empCode: 'DITMP252662',
    department: 'HR & Admin',
    claimType: 'Office',
    date: '10.08.2026',
    itemsCount: 4,
    amount: 3450,
    submittedDate: '10 Aug 2026, 02:30 PM',
    stage: 'Senior',
    receiptName: 'Stationery_Vendor_Invoice.pdf',
    status: 'Pending',
  },
  {
    id: 'app-11',
    claimNo: 'CLM-AUG-0119',
    empName: 'Rohit Kulkarni',
    empCode: 'DITMP252670',
    department: 'Operations',
    claimType: 'Field',
    date: '08.08.2026',
    itemsCount: 2,
    amount: 1950,
    submittedDate: '08 Aug 2026, 05:45 PM',
    stage: 'Finance',
    receiptName: 'Auto_Fuel_Slips.pdf',
    status: 'Pending',
  },
  {
    id: 'app-12',
    claimNo: 'CLM-AUG-0112',
    empName: 'Anil Chauhan',
    empCode: 'DITMP252684',
    department: 'Operations',
    claimType: 'Other',
    date: '06.08.2026',
    itemsCount: 1,
    amount: 850,
    submittedDate: '06 Aug 2026, 11:20 AM',
    stage: 'Senior',
    receiptName: 'Cash_Voucher_06.pdf',
    status: 'Pending',
  },
]
