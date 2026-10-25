export interface EducationRecord {
  id: string
  course: string
  specialization: string
  state: string
  university: string
  courseType: string
  passingYear: string
  percentage: string
  attachment?: string
}

export interface ExperienceRecord {
  id: string
  companyName: string
  jobTitle: string
  fromDate: string
  toDate: string
  jobDescription: string
  attachment?: string
  skills: string
  totalExperience: string
  lastTakeHome: string
  leavingReason: string
}

export interface TrainingRecord {
  id: string
  training: string
  dateOfCompletion: string
  certification: string
  institute: string
  grade: string
  attachment?: string
}

export type JobType = 'Permanent' | 'Contractual'
export type EmployeeStatus = 'Pending' | 'Active' | 'Probation' | 'Inactive'

export interface Employee {
  id: string
  onboardAs: JobType
  employeeCode: string
  tpCode: string
  photoUrl: string
  fullName: string
  mobile: string
  email: string
  sendNotification: boolean
  dateOfJoining: string
  status: EmployeeStatus

  // 2. Personal Information
  dob: string
  gender: string
  fatherHusbandName: string
  motherName: string
  spouseName: string
  maritalStatus: string
  nationality: string
  bloodGroup: string
  relationName: string
  panNo: string
  personalEmail: string
  personalMobile: string
  emergencyContactPerson: string
  emergencyContactNo: string

  // 3. Address Details
  residentialAddress: string
  sameAsPermanent: boolean
  permanentAddress: string
  po: string
  tehsil: string
  policeStation: string
  district: string
  state: string
  pinCode: string
  residenceContactNo: string
  officialEmail: string

  // 3. Employment & Organization Details
  designation: string
  department: string
  functionalRole: string
  orgUnitName: string
  project: string
  reportingManager: string
  jobType: JobType
  vendorName: string
  contractEndDate: string
  salaryBookedUnderProject: string
  currentOrgExperience: string
  geoFencingName: string
  liveTracking: boolean
  skills: string[]

  // 4. Education, Experience & Training
  education: EducationRecord[]
  workExperience: ExperienceRecord[]
  training: TrainingRecord[]

  // 5. Bank & Salary Payout Details
  nameAsPerBank: string
  bankName: string
  bankBranch: string
  ifscCode: string
  accountNumber: string
  accountStatus: string
  chequeFacility: 'Available' | 'Not Available'
  salaryPayoutMode: string

  createdAt: string
  updatedAt: string
}

export const DEPARTMENTS = [
  'WLA',
  'Operations',
  'Field Service',
  'IT & Networks',
  'Finance',
  'HR',
  'Legal & Governance',
]

export const DESIGNATIONS = [
  'Support Executive',
  'Senior Support Executive',
  'Field Engineer',
  'ATM Maintenance Engineer',
  'Operations Lead',
  'Area Manager',
  'Network Specialist',
  'Finance Executive',
  'HR Onboarding Specialist',
]

export const ORG_UNITS = [
  '1, ETAWAH ROAD BY PASS, BEWAR, Mainpuri',
  'Mainpuri Regional Hub - 01',
  'Agra Central Hub',
  'Lucknow Operations Hub',
  'Noida Sector 62 Branch Office',
  'Mumbai Central Support Office',
  'Kanpur Cluster Center',
  'Varanasi Field Unit',
]

export const PROJECTS = [
  'Project Bharat ATM',
  'Tata WLA Deployment',
  'Hitachi Money Spot Co-branded',
  'State Bank Co-branded WLA',
  'Dexter Rural Expansion Phase 2',
]

export const REPORTING_MANAGERS = [
  'Rajesh Sharma (DIT0042) - VP Operations',
  'Anand Verma (DIT0018) - Regional Operations Head',
  'Pooja Saxena (DIT0102) - Support Director',
  'Suresh Nair (DIT0009) - Chief Operating Officer',
  'Meenakshi Sundaram (DIT0088) - Lead Network Architect',
]

export const VENDORS = [
  'Direct Payroll',
  'CMS Info Systems',
  'SIS Security Ltd',
  'Writer Safeguard India',
  'Brinks Arya Pvt Ltd',
]

export const BANKS = [
  'State Bank of India',
  'HDFC Bank',
  'ICICI Bank',
  'Punjab National Bank',
  'Bank of Baroda',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'Canara Bank',
]

export const GEO_FENCING_ZONES = [
  'Mainpuri District Geo',
  'Bewar Center Zone',
  'Agra Metropolitan Zone',
  'Lucknow City Perimeter',
  'Noida Tech Park Zone',
  'Kanpur Industrial Geo',
]

export const ALL_SKILLS = [
  'ATM Operations',
  'Hardware Maintenance',
  'Network Support',
  'Cash Handling',
  'Field Audit',
  'Linux Admin',
  'Incident Troubleshooting',
  'Customer Support',
  'Terminal Diagnostics',
]

export function createEmptyEmployee(): Employee {
  return {
    id: '',
    onboardAs: 'Permanent',
    employeeCode: '',
    tpCode: '',
    photoUrl: '',
    fullName: '',
    mobile: '',
    email: '',
    sendNotification: true,
    dateOfJoining: new Date().toISOString().slice(0, 10),
    status: 'Pending',

    dob: '',
    gender: 'Male',
    fatherHusbandName: '',
    motherName: '',
    spouseName: '',
    maritalStatus: 'Unmarried',
    nationality: 'Indian',
    bloodGroup: '',
    relationName: 'Father',
    panNo: '',
    personalEmail: '',
    personalMobile: '',
    emergencyContactPerson: '',
    emergencyContactNo: '',

    residentialAddress: '',
    sameAsPermanent: true,
    permanentAddress: '',
    po: '',
    tehsil: '',
    policeStation: '',
    district: '',
    state: 'Uttar Pradesh',
    pinCode: '',
    residenceContactNo: '',
    officialEmail: '',

    designation: 'Support Executive',
    department: 'WLA',
    functionalRole: 'L1 Support',
    orgUnitName: ORG_UNITS[0],
    project: PROJECTS[0],
    reportingManager: REPORTING_MANAGERS[0],
    jobType: 'Permanent',
    vendorName: VENDORS[0],
    contractEndDate: '',
    salaryBookedUnderProject: PROJECTS[0],
    currentOrgExperience: '0 years 0 months 0 days',
    geoFencingName: GEO_FENCING_ZONES[0],
    liveTracking: true,
    skills: ['ATM Operations', 'Hardware Maintenance'],

    education: [],
    workExperience: [],
    training: [],

    nameAsPerBank: '',
    bankName: 'State Bank of India',
    bankBranch: '',
    ifscCode: '',
    accountNumber: '',
    accountStatus: 'Savings',
    chequeFacility: 'Available',
    salaryPayoutMode: 'Bank Transfer (NEFT/RTGS)',

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export const SEED_EMPLOYEES: Employee[] = [
  {
    id: 'EMP-2025-001',
    onboardAs: 'Permanent',
    employeeCode: 'DITMP252615',
    tpCode: 'TP33694',
    photoUrl: '/employees/harsh_pratap_singh.jpg',
    fullName: 'Harsh Pratap Singh',
    mobile: '7895945800',
    email: 'harshbhadauria7800@gmail.com',
    sendNotification: true,
    dateOfJoining: '2025-10-01',
    status: 'Pending',

    dob: '2001-03-09',
    gender: 'Male',
    fatherHusbandName: 'Shri Rajeev Kumar',
    motherName: 'Smt. Shanti Devi',
    spouseName: '',
    maritalStatus: 'Unmarried',
    nationality: 'Indian',
    bloodGroup: 'B+',
    relationName: 'Father',
    panNo: 'ABCPS8812K',
    personalEmail: 'harshbhadauria7800@gmail.com',
    personalMobile: '7895945800',
    emergencyContactPerson: 'Shri Rajeev Kumar',
    emergencyContactNo: '7451008232',

    residentialAddress: 'S/O Rajeev Kumar, Jagatpur Dikhatmai, Mainpuri, Uttar Pradesh, 205267',
    sameAsPermanent: true,
    permanentAddress: 'S/O Rajeev Kumar, Jagatpur Dikhatmai, Mainpuri, Uttar Pradesh, 205267',
    po: 'Jagatpur',
    tehsil: 'Dikhatmai',
    policeStation: 'Mainpuri',
    district: 'Mainpuri',
    state: 'Uttar Pradesh',
    pinCode: '205267',
    residenceContactNo: '05672-245100',
    officialEmail: 'wlasupport@dexterindia.com',

    designation: 'Support Executive',
    department: 'WLA',
    functionalRole: 'L1 Support',
    orgUnitName: '1, ETAWAH ROAD BY PASS, BEWAR, Mainpuri',
    project: 'Project Bharat ATM',
    reportingManager: 'Rajesh Sharma (DIT0042) - VP Operations',
    jobType: 'Permanent',
    vendorName: 'Direct Payroll',
    contractEndDate: '',
    salaryBookedUnderProject: 'Project Bharat ATM',
    currentOrgExperience: '1 years 0 months 23 days',
    geoFencingName: 'Mainpuri District Geo',
    liveTracking: true,
    skills: ['ATM Operations', 'Hardware Maintenance', 'Network Support'],

    education: [
      {
        id: 'EDU-1',
        course: 'B.Tech',
        specialization: 'Computer Science',
        state: 'Uttar Pradesh',
        university: 'AKTU',
        courseType: 'Full Time',
        passingYear: '2022',
        percentage: '78.50',
        attachment: 'Degree.pdf',
      },
      {
        id: 'EDU-2',
        course: 'Intermediate (10+2)',
        specialization: 'PCM',
        state: 'Uttar Pradesh',
        university: 'UP State Board',
        courseType: 'Full Time',
        passingYear: '2018',
        percentage: '82.40',
        attachment: 'HSC_Marksheet.pdf',
      },
    ],
    workExperience: [
      {
        id: 'EXP-1',
        companyName: 'ABC Technologies',
        jobTitle: 'Support Engineer',
        fromDate: '2023-06-01',
        toDate: '2025-09-30',
        jobDescription: 'Technical support for field devices and ATM terminals across regional cluster.',
        attachment: 'Exp_Certificate.pdf',
        skills: 'Support, Hardware',
        totalExperience: '2 Years 4 Months',
        lastTakeHome: '₹ 28,000',
        leavingReason: 'Better Opportunity',
      },
    ],
    training: [
      {
        id: 'TRN-1',
        training: 'ATM Operations Training',
        dateOfCompletion: '2023-08-15',
        certification: 'Completed',
        institute: 'Dexter India Training Center',
        grade: 'A',
        attachment: 'Training_Certificate.pdf',
      },
    ],

    nameAsPerBank: 'Harsh Pratap Singh',
    bankName: 'State Bank of India',
    bankBranch: 'Mainpuri',
    ifscCode: 'SBIN0001234',
    accountNumber: '6241098525678',
    accountStatus: 'Savings',
    chequeFacility: 'Available',
    salaryPayoutMode: 'Bank Transfer (NEFT/RTGS)',

    createdAt: '2025-10-01T08:30:00.000Z',
    updatedAt: '2025-10-24T14:22:00.000Z',
  },
  {
    id: 'EMP-2025-002',
    onboardAs: 'Permanent',
    employeeCode: 'DITMP241108',
    tpCode: 'TP32981',
    photoUrl: '',
    fullName: 'Priya Sharma',
    mobile: '9871234560',
    email: 'priya.sharma@dexterindia.in',
    sendNotification: true,
    dateOfJoining: '2024-04-15',
    status: 'Active',

    dob: '1998-11-22',
    gender: 'Female',
    fatherHusbandName: 'Dr. Ramesh Sharma',
    motherName: 'Sunita Sharma',
    spouseName: '',
    maritalStatus: 'Unmarried',
    nationality: 'Indian',
    bloodGroup: 'O+',
    relationName: 'Father',
    panNo: 'BHYPS9921M',
    personalEmail: 'priya.sharma98@gmail.com',
    personalMobile: '9871234560',
    emergencyContactPerson: 'Dr. Ramesh Sharma',
    emergencyContactNo: '9871234561',

    residentialAddress: 'Flat 402, Gomti Nagar Heights, Lucknow, Uttar Pradesh, 226010',
    sameAsPermanent: true,
    permanentAddress: 'Flat 402, Gomti Nagar Heights, Lucknow, Uttar Pradesh, 226010',
    po: 'Gomti Nagar',
    tehsil: 'Lucknow',
    policeStation: 'Vibhuti Khand',
    district: 'Lucknow',
    state: 'Uttar Pradesh',
    pinCode: '226010',
    residenceContactNo: '0522-298712',
    officialEmail: 'priya.sharma@dexterindia.in',

    designation: 'Operations Lead',
    department: 'Operations',
    functionalRole: 'Field Operations',
    orgUnitName: 'Lucknow Operations Hub',
    project: 'Tata WLA Deployment',
    reportingManager: 'Suresh Nair (DIT0009) - Chief Operating Officer',
    jobType: 'Permanent',
    vendorName: 'Direct Payroll',
    contractEndDate: '',
    salaryBookedUnderProject: 'Tata WLA Deployment',
    currentOrgExperience: '2 years 6 months 10 days',
    geoFencingName: 'Lucknow City Perimeter',
    liveTracking: true,
    skills: ['ATM Operations', 'Field Audit', 'Incident Troubleshooting'],

    education: [
      {
        id: 'EDU-P1',
        course: 'MBA',
        specialization: 'Operations & Logistics',
        state: 'Uttar Pradesh',
        university: 'Lucknow University',
        courseType: 'Full Time',
        passingYear: '2021',
        percentage: '81.20',
        attachment: 'MBA_Degree.pdf',
      },
    ],
    workExperience: [
      {
        id: 'EXP-P1',
        companyName: 'FinServe Logistics',
        jobTitle: 'Assistant Operations Manager',
        fromDate: '2021-08-01',
        toDate: '2024-03-31',
        jobDescription: 'Supervised cash transit routes and ATM uptime across UP Central zone.',
        attachment: 'Experience_Letter.pdf',
        skills: 'Operations, Logistics',
        totalExperience: '2 Years 8 Months',
        lastTakeHome: '₹ 45,000',
        leavingReason: 'Growth opportunity',
      },
    ],
    training: [
      {
        id: 'TRN-P1',
        training: 'Advanced Fleet & Cash Route Optimization',
        dateOfCompletion: '2024-06-10',
        certification: 'Completed',
        institute: 'Dexter Training Academy',
        grade: 'A+',
        attachment: 'Cert_Fleet.pdf',
      },
    ],

    nameAsPerBank: 'Priya Sharma',
    bankName: 'HDFC Bank',
    bankBranch: 'Gomti Nagar, Lucknow',
    ifscCode: 'HDFC0001824',
    accountNumber: '50100492817293',
    accountStatus: 'Salary',
    chequeFacility: 'Available',
    salaryPayoutMode: 'Bank Transfer (NEFT/RTGS)',

    createdAt: '2024-04-15T09:00:00.000Z',
    updatedAt: '2026-01-12T11:20:00.000Z',
  },
  {
    id: 'EMP-2025-003',
    onboardAs: 'Permanent',
    employeeCode: 'DITMP230914',
    tpCode: 'TP31045',
    photoUrl: '',
    fullName: 'Amit Vikram Verma',
    mobile: '9456781230',
    email: 'amit.verma@dexterindia.in',
    sendNotification: false,
    dateOfJoining: '2023-09-14',
    status: 'Active',

    dob: '1995-07-14',
    gender: 'Male',
    fatherHusbandName: 'Shri B. K. Verma',
    motherName: 'Smt. Anita Verma',
    spouseName: 'Ritu Verma',
    maritalStatus: 'Married',
    nationality: 'Indian',
    bloodGroup: 'A+',
    relationName: 'Father',
    panNo: 'CVBPA4410R',
    personalEmail: 'amit.verma.agra@gmail.com',
    personalMobile: '9456781230',
    emergencyContactPerson: 'Ritu Verma',
    emergencyContactNo: '9456781235',

    residentialAddress: '14/2B, Sanjay Place, Agra, Uttar Pradesh, 282002',
    sameAsPermanent: true,
    permanentAddress: '14/2B, Sanjay Place, Agra, Uttar Pradesh, 282002',
    po: 'Sanjay Place',
    tehsil: 'Agra',
    policeStation: 'Hari Parwat',
    district: 'Agra',
    state: 'Uttar Pradesh',
    pinCode: '282002',
    residenceContactNo: '0562-281920',
    officialEmail: 'amit.verma@dexterindia.in',

    designation: 'Senior Support Executive',
    department: 'WLA',
    functionalRole: 'L2 Support',
    orgUnitName: 'Agra Central Hub',
    project: 'Hitachi Money Spot Co-branded',
    reportingManager: 'Anand Verma (DIT0018) - Regional Operations Head',
    jobType: 'Permanent',
    vendorName: 'Direct Payroll',
    contractEndDate: '',
    salaryBookedUnderProject: 'Hitachi Money Spot Co-branded',
    currentOrgExperience: '3 years 1 months 11 days',
    geoFencingName: 'Agra Metropolitan Zone',
    liveTracking: true,
    skills: ['ATM Operations', 'Terminal Diagnostics', 'Hardware Maintenance'],

    education: [
      {
        id: 'EDU-A1',
        course: 'Diploma in Electronics & Comm.',
        specialization: 'Electronics',
        state: 'Uttar Pradesh',
        university: 'Board of Technical Education UP',
        courseType: 'Full Time',
        passingYear: '2016',
        percentage: '74.80',
        attachment: 'Diploma_Cert.pdf',
      },
    ],
    workExperience: [
      {
        id: 'EXP-A1',
        companyName: 'NCR Corporation Partner',
        jobTitle: 'Field Service Technician',
        fromDate: '2017-01-10',
        toDate: '2023-08-31',
        jobDescription: 'Maintained 180+ automated teller machines across West UP.',
        attachment: 'NCR_Exp.pdf',
        skills: 'ATM Repair, Dispenser Overhaul',
        totalExperience: '6 Years 7 Months',
        lastTakeHome: '₹ 38,000',
        leavingReason: 'Relocation to Agra',
      },
    ],
    training: [],

    nameAsPerBank: 'Amit Vikram Verma',
    bankName: 'Punjab National Bank',
    bankBranch: 'Sanjay Place, Agra',
    ifscCode: 'PUNB0028100',
    accountNumber: '0281000100293847',
    accountStatus: 'Salary',
    chequeFacility: 'Available',
    salaryPayoutMode: 'Bank Transfer (NEFT/RTGS)',

    createdAt: '2023-09-14T10:15:00.000Z',
    updatedAt: '2026-02-18T16:00:00.000Z',
  },
  {
    id: 'EMP-2025-004',
    onboardAs: 'Contractual',
    employeeCode: 'DITMP250320',
    tpCode: 'TP34120',
    photoUrl: '',
    fullName: 'Kavita Deshmukh',
    mobile: '9820541299',
    email: 'kavita.deshmukh@dexterindia.in',
    sendNotification: true,
    dateOfJoining: '2025-03-20',
    status: 'Active',

    dob: '1999-04-12',
    gender: 'Female',
    fatherHusbandName: 'Sanjay Deshmukh',
    motherName: 'Pratibha Deshmukh',
    spouseName: '',
    maritalStatus: 'Unmarried',
    nationality: 'Indian',
    bloodGroup: 'AB+',
    relationName: 'Father',
    panNo: 'MNBPD3301L',
    personalEmail: 'kavita.dsh@gmail.com',
    personalMobile: '9820541299',
    emergencyContactPerson: 'Sanjay Deshmukh',
    emergencyContactNo: '9820541290',

    residentialAddress: 'Room 12, Shiv Smruti CHS, Dadar West, Mumbai, Maharashtra, 400028',
    sameAsPermanent: true,
    permanentAddress: 'Room 12, Shiv Smruti CHS, Dadar West, Mumbai, Maharashtra, 400028',
    po: 'Dadar West',
    tehsil: 'Mumbai',
    policeStation: 'Shivaji Park',
    district: 'Mumbai City',
    state: 'Maharashtra',
    pinCode: '400028',
    residenceContactNo: '022-2438192',
    officialEmail: 'kavita.deshmukh@dexterindia.in',

    designation: 'Finance Executive',
    department: 'Finance',
    functionalRole: 'Branch Head',
    orgUnitName: 'Mumbai Central Support Office',
    project: 'State Bank Co-branded WLA',
    reportingManager: 'Pooja Saxena (DIT0102) - Support Director',
    jobType: 'Contractual',
    vendorName: 'CMS Info Systems',
    contractEndDate: '2026-03-19',
    salaryBookedUnderProject: 'State Bank Co-branded WLA',
    currentOrgExperience: '1 years 7 months 5 days',
    geoFencingName: 'Bewar Center Zone',
    liveTracking: false,
    skills: ['Cash Handling', 'Field Audit'],

    education: [
      {
        id: 'EDU-K1',
        course: 'B.Com',
        specialization: 'Accounting & Finance',
        state: 'Maharashtra',
        university: 'University of Mumbai',
        courseType: 'Full Time',
        passingYear: '2020',
        percentage: '76.10',
        attachment: 'BCom_MumbaiUniv.pdf',
      },
    ],
    workExperience: [],
    training: [],

    nameAsPerBank: 'Kavita Sanjay Deshmukh',
    bankName: 'ICICI Bank',
    bankBranch: 'Dadar Branch',
    ifscCode: 'ICIC0000047',
    accountNumber: '004701582910',
    accountStatus: 'Savings',
    chequeFacility: 'Not Available',
    salaryPayoutMode: 'Bank Transfer (NEFT/RTGS)',

    createdAt: '2025-03-20T08:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
  },
  {
    id: 'EMP-2025-005',
    onboardAs: 'Permanent',
    employeeCode: 'DITMP248812',
    tpCode: 'TP32711',
    photoUrl: '',
    fullName: 'Rajeshwar Rao',
    mobile: '9176543210',
    email: 'rajeshwar.rao@dexterindia.in',
    sendNotification: true,
    dateOfJoining: '2024-08-01',
    status: 'Active',

    dob: '1992-02-18',
    gender: 'Male',
    fatherHusbandName: 'K. S. Rao',
    motherName: 'Laxmi Rao',
    spouseName: 'Vandana Rao',
    maritalStatus: 'Married',
    nationality: 'Indian',
    bloodGroup: 'B-',
    relationName: 'Father',
    panNo: 'PLKPR7719P',
    personalEmail: 'rajeshwar.rao.net@gmail.com',
    personalMobile: '9176543210',
    emergencyContactPerson: 'Vandana Rao',
    emergencyContactNo: '9176543219',

    residentialAddress: 'Tower 4, Flat 1102, Stellar Park, Sector 62, Noida, Uttar Pradesh, 201309',
    sameAsPermanent: true,
    permanentAddress: 'Tower 4, Flat 1102, Stellar Park, Sector 62, Noida, Uttar Pradesh, 201309',
    po: 'Sector 62',
    tehsil: 'Dadri',
    policeStation: 'Sector 58',
    district: 'Gautam Buddha Nagar',
    state: 'Uttar Pradesh',
    pinCode: '201309',
    residenceContactNo: '0120-498210',
    officialEmail: 'rajeshwar.rao@dexterindia.in',

    designation: 'Network Specialist',
    department: 'IT & Networks',
    functionalRole: 'L2 Support',
    orgUnitName: 'Noida Sector 62 Branch Office',
    project: 'Project Bharat ATM',
    reportingManager: 'Meenakshi Sundaram (DIT0088) - Lead Network Architect',
    jobType: 'Permanent',
    vendorName: 'Direct Payroll',
    contractEndDate: '',
    salaryBookedUnderProject: 'Project Bharat ATM',
    currentOrgExperience: '2 years 2 months 24 days',
    geoFencingName: 'Noida Tech Park Zone',
    liveTracking: true,
    skills: ['Network Support', 'Linux Admin', 'Incident Troubleshooting'],

    education: [
      {
        id: 'EDU-R1',
        course: 'B.Tech',
        specialization: 'Information Technology',
        state: 'Uttar Pradesh',
        university: 'AKTU',
        courseType: 'Full Time',
        passingYear: '2014',
        percentage: '71.50',
        attachment: 'Degree_Rao.pdf',
      },
    ],
    workExperience: [
      {
        id: 'EXP-R1',
        companyName: 'Airtel Enterprise',
        jobTitle: 'Network Operations Engineer',
        fromDate: '2015-02-01',
        toDate: '2024-07-15',
        jobDescription: 'Managed MPLS and CDMA connectivity for 4,000+ remote point-of-sale and ATM nodes.',
        attachment: 'Airtel_Relieving.pdf',
        skills: 'MPLS, Cisco, Routing',
        totalExperience: '9 Years 5 Months',
        lastTakeHome: '₹ 62,000',
        leavingReason: 'New domain in ATM tech',
      },
    ],
    training: [
      {
        id: 'TRN-R1',
        training: 'Cisco Certified Network Associate (CCNA)',
        dateOfCompletion: '2019-11-20',
        certification: 'Completed',
        institute: 'Cisco Networking Academy',
        grade: 'Pass',
        attachment: 'CCNA_Cert.pdf',
      },
    ],

    nameAsPerBank: 'Rajeshwar K Rao',
    bankName: 'Axis Bank',
    bankBranch: 'Sector 62, Noida',
    ifscCode: 'UTIB0000842',
    accountNumber: '91802004819284',
    accountStatus: 'Salary',
    chequeFacility: 'Available',
    salaryPayoutMode: 'Bank Transfer (NEFT/RTGS)',

    createdAt: '2024-08-01T09:30:00.000Z',
    updatedAt: '2026-03-10T14:00:00.000Z',
  },
  {
    id: 'EMP-2025-006',
    onboardAs: 'Contractual',
    employeeCode: 'DITMP253901',
    tpCode: 'TP34890',
    photoUrl: '',
    fullName: 'Mohd. Farhan Ali',
    mobile: '9335128940',
    email: 'farhan.ali@dexterindia.in',
    sendNotification: true,
    dateOfJoining: '2025-08-15',
    status: 'Pending',

    dob: '2000-08-19',
    gender: 'Male',
    fatherHusbandName: 'Mohd. Rafiq Ali',
    motherName: 'Nasreen Begum',
    spouseName: '',
    maritalStatus: 'Unmarried',
    nationality: 'Indian',
    bloodGroup: 'O-',
    relationName: 'Father',
    panNo: 'TYUPA1198Q',
    personalEmail: 'farhan.kanpur99@gmail.com',
    personalMobile: '9335128940',
    emergencyContactPerson: 'Mohd. Rafiq Ali',
    emergencyContactNo: '9335128944',

    residentialAddress: 'House 88/12, Chamanganj, Kanpur Nagar, Uttar Pradesh, 208001',
    sameAsPermanent: true,
    permanentAddress: 'House 88/12, Chamanganj, Kanpur Nagar, Uttar Pradesh, 208001',
    po: 'Kanpur GPO',
    tehsil: 'Kanpur Sadar',
    policeStation: 'Chamanganj',
    district: 'Kanpur Nagar',
    state: 'Uttar Pradesh',
    pinCode: '208001',
    residenceContactNo: '',
    officialEmail: 'farhan.ali@dexterindia.in',

    designation: 'ATM Maintenance Engineer',
    department: 'WLA',
    functionalRole: 'Field Support',
    orgUnitName: 'Kanpur Cluster Center',
    project: 'Dexter Rural Expansion Phase 2',
    reportingManager: 'Anand Verma (DIT0018) - Regional Operations Head',
    jobType: 'Contractual',
    vendorName: 'SIS Security Ltd',
    contractEndDate: '2026-08-14',
    salaryBookedUnderProject: 'Dexter Rural Expansion Phase 2',
    currentOrgExperience: '1 years 2 months 10 days',
    geoFencingName: 'Kanpur Industrial Geo',
    liveTracking: true,
    skills: ['ATM Operations', 'Hardware Maintenance', 'Terminal Diagnostics'],

    education: [
      {
        id: 'EDU-F1',
        course: 'ITI - Electrical',
        specialization: 'Electrical Maintenance',
        state: 'Uttar Pradesh',
        university: 'NCVT Govt ITI Kanpur',
        courseType: 'Full Time',
        passingYear: '2021',
        percentage: '79.20',
        attachment: 'ITI_Certificate.pdf',
      },
    ],
    workExperience: [
      {
        id: 'EXP-F1',
        companyName: 'SecureTrans Solutions',
        jobTitle: 'Field Trainee',
        fromDate: '2022-01-01',
        toDate: '2025-07-31',
        jobDescription: 'Cassette swapping and physical lock maintenance for bank kiosks.',
        attachment: 'Trainee_Cert.pdf',
        skills: 'Locking, Swapping',
        totalExperience: '3 Years 6 Months',
        lastTakeHome: '₹ 19,500',
        leavingReason: 'Contract concluded',
      },
    ],
    training: [],

    nameAsPerBank: 'Mohd Farhan Ali',
    bankName: 'Bank of Baroda',
    bankBranch: 'Mall Road, Kanpur',
    ifscCode: 'BARB0MALLRO',
    accountNumber: '28100100918234',
    accountStatus: 'Savings',
    chequeFacility: 'Not Available',
    salaryPayoutMode: 'Bank Transfer (NEFT/RTGS)',

    createdAt: '2025-08-15T09:00:00.000Z',
    updatedAt: '2026-02-10T11:00:00.000Z',
  },
  {
    id: 'EMP-2025-007',
    onboardAs: 'Permanent',
    employeeCode: 'DITMP251240',
    tpCode: 'TP33009',
    photoUrl: '',
    fullName: 'Vikramaditya Rathore',
    mobile: '9654123890',
    email: 'vikram.rathore@dexterindia.in',
    sendNotification: true,
    dateOfJoining: '2026-01-10',
    status: 'Probation',

    dob: '1997-09-05',
    gender: 'Male',
    fatherHusbandName: 'Ranveer Singh Rathore',
    motherName: 'Gayatri Rathore',
    spouseName: '',
    maritalStatus: 'Unmarried',
    nationality: 'Indian',
    bloodGroup: 'B+',
    relationName: 'Father',
    panNo: 'WERPR5512B',
    personalEmail: 'rathore.vikram97@outlook.com',
    personalMobile: '9654123890',
    emergencyContactPerson: 'Ranveer Singh Rathore',
    emergencyContactNo: '9654123899',

    residentialAddress: 'C-22, Sigra Crossing, Varanasi, Uttar Pradesh, 221002',
    sameAsPermanent: true,
    permanentAddress: 'C-22, Sigra Crossing, Varanasi, Uttar Pradesh, 221002',
    po: 'Sigra',
    tehsil: 'Varanasi',
    policeStation: 'Sigra PS',
    district: 'Varanasi',
    state: 'Uttar Pradesh',
    pinCode: '221002',
    residenceContactNo: '0542-239102',
    officialEmail: 'vikram.rathore@dexterindia.in',

    designation: 'Field Engineer',
    department: 'Legal & Governance',
    functionalRole: 'Field Audit',
    orgUnitName: 'Varanasi Field Unit',
    project: 'Project Bharat ATM',
    reportingManager: 'Rajesh Sharma (DIT0042) - VP Operations',
    jobType: 'Permanent',
    vendorName: 'Direct Payroll',
    contractEndDate: '',
    salaryBookedUnderProject: 'Project Bharat ATM',
    currentOrgExperience: '0 years 9 months 15 days',
    geoFencingName: 'Mainpuri District Geo',
    liveTracking: true,
    skills: ['Field Audit', 'Hardware Maintenance'],

    education: [
      {
        id: 'EDU-V1',
        course: 'B.Sc Computer Science',
        specialization: 'Computer Systems',
        state: 'Uttar Pradesh',
        university: 'BHU Varanasi',
        courseType: 'Full Time',
        passingYear: '2019',
        percentage: '75.30',
        attachment: 'BSc_Degree.pdf',
      },
    ],
    workExperience: [],
    training: [],

    nameAsPerBank: 'Vikramaditya Rathore',
    bankName: 'State Bank of India',
    bankBranch: 'BHU Branch, Varanasi',
    ifscCode: 'SBIN0000211',
    accountNumber: '392182049182',
    accountStatus: 'Savings',
    chequeFacility: 'Available',
    salaryPayoutMode: 'Bank Transfer (NEFT/RTGS)',

    createdAt: '2026-01-10T08:30:00.000Z',
    updatedAt: '2026-03-20T10:15:00.000Z',
  },
]
