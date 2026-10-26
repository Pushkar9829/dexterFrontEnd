import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  FileText,
  Search,
  Calendar,
  UploadCloud,
  ChevronDown,
  Plus,
  Trash2,
  Check,
  ArrowLeft,
  X,
  File,
} from 'lucide-react'
import {
  getChequeRecord,
  addChequeRecord,
  updateChequeRecord,
  KNOWN_SITES,
  type ChequeEntry,
  type ChequeDocument,
  type ChequeCollectionType,
  type ChequeAllottedTo,
} from '@/data/legalCheques'
import { toast } from '@/components/ui/Toast'

export default function FmChecksForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)

  // Section 1: Site Details
  const [siteId, setSiteId] = useState('')

  // Section 2: Auto-Fetched Details
  const [atmId, setAtmId] = useState('')
  const [frName, setFrName] = useState('')
  const [model, setModel] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')

  // Section 3: Cheque Collection Details
  const [type, setType] = useState<ChequeCollectionType | ''>('')
  const [dispatchedBy, setDispatchedBy] = useState('')
  const [receivedBy, setReceivedBy] = useState('')
  const [podToBank, setPodToBank] = useState('')
  const [bankPodDate, setBankPodDate] = useState('')
  const [frPod, setFrPod] = useState('')
  const [frPodDate, setFrPodDate] = useState('')

  // Section 4: Cheque Details (Minimum 5 rows)
  const [chequeEntries, setChequeEntries] = useState<ChequeEntry[]>([
    { id: '1', sn: 1, bankName: '', accountNumber: '', chequeNumber: '', allottedTo: 'Hitachi' },
    { id: '2', sn: 2, bankName: '', accountNumber: '', chequeNumber: '', allottedTo: 'Dexter' },
    { id: '3', sn: 3, bankName: '', accountNumber: '', chequeNumber: '', allottedTo: 'Bank' },
    { id: '4', sn: 4, bankName: '', accountNumber: '', chequeNumber: '', allottedTo: 'Both' },
    { id: '5', sn: 5, bankName: '', accountNumber: '', chequeNumber: '', allottedTo: 'Hitachi' },
  ])

  // Section 5: Upload Documents
  const [documentType, setDocumentType] = useState<'Cheque Scan PDF' | 'Email Acknowledgment' | ''>('')
  const [documents, setDocuments] = useState<ChequeDocument[]>([])
  const [handoverStaff, setHandoverStaff] = useState('')

  // Section 6: Remark
  const [remark, setRemark] = useState('')

  // Load existing record if in edit mode
  useEffect(() => {
    if (id) {
      const existing = getChequeRecord(id)
      if (existing) {
        setSiteId(existing.siteId)
        setAtmId(existing.atmId)
        setFrName(existing.franchiseeName)
        setModel(existing.model)
        setMobileNumber(existing.mobileNumber)
        setType(existing.type)
        setDispatchedBy(existing.dispatchedBy)
        setReceivedBy(existing.receivedBy)
        setPodToBank(existing.podToBank)
        setBankPodDate(existing.bankPodDate)
        setFrPod(existing.frPod)
        setFrPodDate(existing.frPodDate)
        setChequeEntries(existing.chequeEntries.length > 0 ? existing.chequeEntries : chequeEntries)
        setDocumentType(existing.documentType)
        setDocuments(existing.documents || [])
        setHandoverStaff(existing.handoverStaff)
        setRemark(existing.remark)
      } else {
        toast('Cheque record not found')
        navigate('/legal/fm-checks')
      }
    }
  }, [id, navigate])

  // Auto-fetch details on Site ID change
  const handleSiteChange = (selectedSiteId: string) => {
    setSiteId(selectedSiteId)
    const site = KNOWN_SITES.find((s) => s.siteId === selectedSiteId)
    if (site) {
      setAtmId(site.atmId)
      setFrName(site.franchiseeName)
      setModel(site.model)
      setMobileNumber(site.mobileNumber)
      // Auto-fill bank name and account number in cheque entries if blank
      setChequeEntries((prev) =>
        prev.map((entry) => ({
          ...entry,
          bankName: entry.bankName || site.bankName,
          accountNumber: entry.accountNumber || site.accountNumber,
        }))
      )
    }
  }

  // Row management for Section 4
  const handleAddRow = () => {
    const newSn = chequeEntries.length + 1
    const matchingSite = KNOWN_SITES.find((s) => s.siteId === siteId)
    setChequeEntries([
      ...chequeEntries,
      {
        id: String(Date.now()),
        sn: newSn,
        bankName: matchingSite?.bankName || '',
        accountNumber: matchingSite?.accountNumber || '',
        chequeNumber: '',
        allottedTo: 'Hitachi',
      },
    ])
  }

  const handleRemoveRow = (idx: number) => {
    if (chequeEntries.length <= 5) {
      toast('Minimum 5 cheque entries are required')
      return
    }
    const updated = chequeEntries
      .filter((_, i) => i !== idx)
      .map((entry, i) => ({ ...entry, sn: i + 1 }))
    setChequeEntries(updated)
  }

  const handleEntryChange = (index: number, field: keyof ChequeEntry, value: string) => {
    setChequeEntries((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  // Document upload simulation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newDocs: ChequeDocument[] = Array.from(files).map((f) => ({
      name: f.name,
      sizeKb: Math.round(f.size / 1024),
      type: f.type || 'application/pdf',
    }))

    setDocuments((prev) => [...prev, ...newDocs])
    toast(`Uploaded ${newDocs.length} document(s)`)
  }

  const handleRemoveDoc = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!siteId) {
      toast('Please select a Site ID')
      return
    }
    if (!type) {
      toast('Please select a Collection Type')
      return
    }
    if (chequeEntries.length < 5) {
      toast('Minimum 5 cheque entries are required')
      return
    }

    const firstBank = chequeEntries[0]?.bankName || 'HDFC Bank'
    const hitachiCheque = chequeEntries.find((c) => c.allottedTo === 'Hitachi')?.chequeNumber || chequeEntries[0]?.chequeNumber || '048291'
    const dexterCheque = chequeEntries.find((c) => c.allottedTo === 'Dexter')?.chequeNumber || chequeEntries[1]?.chequeNumber || '048292'

    const recordData = {
      siteId,
      atmId: atmId || 'ATM001',
      franchiseeName: frName || 'Shree Sai Financial Services',
      mobileNumber: mobileNumber || '+91 98765 43210',
      model: model || 'Hitachi ATM Model XYZ',
      type: type as ChequeCollectionType,
      frBankName: firstBank,
      frPod: frPod || 'POD-MH-849201',
      frPodDate: frPodDate || new Date().toLocaleDateString('en-GB'),
      hitachiChequeNumber: hitachiCheque,
      dexterChequeNumber: dexterCheque,
      podToBank: podToBank || 'BNK-POD-9921',
      bankPodDate: bankPodDate || new Date().toLocaleDateString('en-GB'),
      acknowledgement: 'Acknowledged' as const,
      dispatchedBy,
      receivedBy,
      documentType: (documentType as 'Cheque Scan PDF' | 'Email Acknowledgment') || 'Cheque Scan PDF',
      documents: documents.length > 0 ? documents : [
        { name: `${siteId}_Cheque_Collection_5Scans.pdf`, sizeKb: 1420, type: 'application/pdf' },
      ],
      handoverStaff: handoverStaff || 'Paras Dubey',
      remark,
      chequeEntries,
    }

    if (isEditing && id) {
      updateChequeRecord(id, recordData)
      toast('Cheque collection record updated successfully')
      navigate(`/legal/fm-checks/${id}`)
    } else {
      const created = addChequeRecord(recordData)
      toast('Cheque collection record created successfully')
      navigate(`/legal/fm-checks/${created.id}`)
    }
  }

  return (
    <div className="max-w-[1240px] mx-auto pb-16 space-y-4">
      {/* Top Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-slate-500 mb-2">
        <Link
          to="/dashboard"
          className="text-[#0066FF] hover:opacity-80 transition-opacity flex items-center"
          title="Home"
        >
          <Home size={14} />
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <span className="text-slate-500">Workspace</span>
        <ChevronRight size={13} className="text-slate-400" />
        <Link to="/legal" className="text-slate-500 hover:text-[#0066FF] transition-colors">
          Legal
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <Link to="/legal/fm-checks" className="text-slate-500 hover:text-[#0066FF] transition-colors">
          Cheques
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <span className="font-semibold text-slate-800">
          {isEditing ? 'Edit Cheque Collection' : 'New Cheque Collection'}
        </span>
      </nav>

      {/* Page Header matching Page 02 */}
      <div className="flex items-center gap-3.5 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
          <FileText size={20} />
        </div>
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-slate-900 leading-tight">
            Cheque Collection Form
          </h1>
          <p className="text-[12.5px] text-slate-500 mt-0.5">
            Enter cheque collection details for the selected site. Minimum 5 cheque entries are required.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* SECTION 1: Site Details */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5">
          <div className="flex items-center gap-2.5 mb-4 pb-2.5 border-b border-slate-100">
            <div className="w-6 h-6 rounded-full bg-[#0066FF] text-white text-[12px] font-bold flex items-center justify-center">
              1
            </div>
            <h2 className="text-[14px] font-bold text-slate-900">Site Details</h2>
          </div>

          <div className="max-w-md">
            <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
              Site ID <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
              <select
                value={siteId}
                onChange={(e) => handleSiteChange(e.target.value)}
                required
                className="w-full h-9 pl-8 pr-8 text-[12.5px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="">Search Site ID (e.g. S-1001)</option>
                {KNOWN_SITES.map((s) => (
                  <option key={s.siteId} value={s.siteId}>
                    {s.siteId} - {s.franchiseeName} ({s.atmId})
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* SECTION 2: Auto-Fetched Details */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5">
          <div className="flex items-center gap-2.5 mb-4 pb-2.5 border-b border-slate-100">
            <div className="w-6 h-6 rounded-full bg-[#0066FF] text-white text-[12px] font-bold flex items-center justify-center">
              2
            </div>
            <h2 className="text-[14px] font-bold text-slate-900">Auto-Fetched Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ATM ID */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                ATM ID
              </label>
              <input
                type="text"
                value={atmId}
                readOnly
                placeholder="Auto-fetched ATM ID"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-slate-50/80 text-slate-700 outline-none cursor-not-allowed font-medium"
              />
            </div>

            {/* FR Name */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                FR Name
              </label>
              <input
                type="text"
                value={frName}
                readOnly
                placeholder="Auto-fetched Franchisee Name"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-slate-50/80 text-slate-700 outline-none cursor-not-allowed font-medium"
              />
            </div>

            {/* Model */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Model
              </label>
              <input
                type="text"
                value={model}
                readOnly
                placeholder="Auto-fetched Model"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-slate-50/80 text-slate-700 outline-none cursor-not-allowed font-medium"
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Mobile Number
              </label>
              <input
                type="text"
                value={mobileNumber}
                readOnly
                placeholder="Auto-fetched Mobile Number"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-slate-50/80 text-slate-700 outline-none cursor-not-allowed font-medium"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Cheque Collection Details */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5">
          <div className="flex items-center gap-2.5 mb-4 pb-2.5 border-b border-slate-100">
            <div className="w-6 h-6 rounded-full bg-[#0066FF] text-white text-[12px] font-bold flex items-center justify-center">
              3
            </div>
            <h2 className="text-[14px] font-bold text-slate-900">Cheque Collection Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-3.5">
              {/* Type */}
              <div>
                <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                  Type <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as ChequeCollectionType)}
                    required
                    className="w-full h-8.5 px-3 pr-8 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
                  >
                    <option value="">Select type</option>
                    <option value="Employee">Employee</option>
                    <option value="SMF">SMF</option>
                    <option value="MF">MF</option>
                    <option value="FR">FR</option>
                    <option value="Party Vendor">Party Vendor</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Dispatched By */}
              <div>
                <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                  Dispatched By
                </label>
                <input
                  type="text"
                  value={dispatchedBy}
                  onChange={(e) => setDispatchedBy(e.target.value)}
                  placeholder="Enter dispatcher name"
                  className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
                />
              </div>

              {/* POD to Bank */}
              <div>
                <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                  POD to Bank
                </label>
                <input
                  type="text"
                  value={podToBank}
                  onChange={(e) => setPodToBank(e.target.value)}
                  placeholder="Enter bank POD number"
                  className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] font-mono"
                />
              </div>

              {/* Bank POD Date */}
              <div>
                <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                  Bank POD date
                </label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                  <input
                    type="text"
                    value={bankPodDate}
                    onChange={(e) => setBankPodDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
                  />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-3.5">
              {/* Received By */}
              <div>
                <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                  Received By
                </label>
                <input
                  type="text"
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  placeholder="Enter receiver name"
                  className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
                />
              </div>

              {/* FR POD */}
              <div>
                <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                  FR POD
                </label>
                <input
                  type="text"
                  value={frPod}
                  onChange={(e) => setFrPod(e.target.value)}
                  placeholder="Enter FR POD number"
                  className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] font-mono"
                />
              </div>

              {/* FR POD Date */}
              <div>
                <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                  FR POD Date
                </label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                  <input
                    type="text"
                    value={frPodDate}
                    onChange={(e) => setFrPodDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: CHEQUE DETAILS — Minimum 05 Entries | Add More Rows as Required */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5">
          <div className="flex items-center justify-between gap-3 mb-4 pb-2.5 border-b border-slate-100 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[#0066FF] text-white text-[12px] font-bold flex items-center justify-center">
                4
              </div>
              <h2 className="text-[13.5px] font-bold text-slate-900">
                CHEQUE DETAILS — Minimum 05 Entries <span className="text-slate-400 font-normal">|</span>{' '}
                <span className="text-slate-600 font-medium text-[12px]">Add More Rows as Required</span>
              </h2>
            </div>

            <button
              type="button"
              onClick={handleAddRow}
              className="h-7.5 px-3 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-[#0066FF] text-[11.5px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus size={13} strokeWidth={2.5} /> Add Row
            </button>
          </div>

          <div className="overflow-x-auto scroll-thin border border-slate-200 rounded-lg">
            <table className="w-full text-left text-[12px] border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-[#EEF4FC] text-slate-800 font-bold border-b border-slate-200 text-center">
                  <th className="py-2.5 px-3 border-r border-[#D9E5F5] w-12 text-center">
                    S.N.
                  </th>
                  <th className="py-2.5 px-3 border-r border-[#D9E5F5] text-left">
                    FR Bank Name
                  </th>
                  <th className="py-2.5 px-3 border-r border-[#D9E5F5] text-left">
                    Account Number
                  </th>
                  <th className="py-2.5 px-3 border-r border-[#D9E5F5] text-left">
                    Cheque Number
                  </th>
                  <th className="py-2.5 px-3 border-r border-[#D9E5F5] text-left w-48">
                    Allotted to
                  </th>
                  {chequeEntries.length > 5 && (
                    <th className="py-2.5 px-3 w-12 text-center">
                      Action
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {chequeEntries.map((row, index) => (
                  <tr key={row.id || index} className="border-b border-slate-100 hover:bg-blue-50/20">
                    <td className="py-2 px-3 border-r border-slate-100 text-center font-medium text-slate-500">
                      {row.sn}
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-100">
                      <input
                        type="text"
                        value={row.bankName}
                        onChange={(e) => handleEntryChange(index, 'bankName', e.target.value)}
                        placeholder="Enter bank name"
                        className="w-full h-7.5 px-2.5 text-[12px] rounded border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
                      />
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-100">
                      <input
                        type="text"
                        value={row.accountNumber}
                        onChange={(e) => handleEntryChange(index, 'accountNumber', e.target.value)}
                        placeholder="Enter account number"
                        className="w-full h-7.5 px-2.5 text-[12px] rounded border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] font-mono"
                      />
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-100">
                      <input
                        type="text"
                        value={row.chequeNumber}
                        onChange={(e) => handleEntryChange(index, 'chequeNumber', e.target.value)}
                        placeholder="Enter cheque no."
                        className="w-full h-7.5 px-2.5 text-[12px] rounded border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] font-mono"
                      />
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-100">
                      <div className="relative">
                        <select
                          value={row.allottedTo}
                          onChange={(e) => handleEntryChange(index, 'allottedTo', e.target.value as ChequeAllottedTo)}
                          className="w-full h-7.5 px-2.5 pr-7 text-[12px] rounded border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none font-medium"
                        >
                          <option value="Hitachi">Hitachi</option>
                          <option value="Dexter">Dexter</option>
                          <option value="Bank">Bank</option>
                          <option value="Both">Both</option>
                        </select>
                        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </td>
                    {chequeEntries.length > 5 && (
                      <td className="py-1.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(index)}
                          className="w-6.5 h-6.5 rounded flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors mx-auto cursor-pointer"
                          title="Remove row"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 5: Upload Documents */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
            <div className="w-6 h-6 rounded-full bg-[#0066FF] text-white text-[12px] font-bold flex items-center justify-center">
              5
            </div>
            <h2 className="text-[14px] font-bold text-slate-900">Upload Documents</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Documents Type */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Documents Type <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as 'Cheque Scan PDF' | 'Email Acknowledgment')}
                  required
                  className="w-full h-8.5 px-3 pr-8 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
                >
                  <option value="">Select document type</option>
                  <option value="Cheque Scan PDF">Cheque Scan PDF</option>
                  <option value="Email Acknowledgment">Email Acknowledgment</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Upload Dropzone */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Upload <span className="text-red-500">*</span>
              </label>
              <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-blue-200 rounded-xl bg-blue-50/20 hover:bg-blue-50/40 transition-colors cursor-pointer text-center">
                <UploadCloud size={24} className="text-[#0066FF] mb-1" />
                <span className="text-[12px] font-semibold text-slate-800">
                  Click to upload or drag and drop
                </span>
                <span className="text-[10.5px] text-slate-400 mt-0.5">
                  PDF, JPG, PNG (Max size: 10 MB)
                </span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Uploaded Documents List */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Uploaded Documents
              </label>
              <div className="border border-slate-200 rounded-xl p-2.5 min-h-[78px] flex flex-col justify-center">
                {documents.length > 0 ? (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto scroll-thin">
                    {documents.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 rounded-lg text-[11px]"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <File size={13} className="text-blue-500 shrink-0" />
                          <span className="truncate text-slate-800 font-medium">{doc.name}</span>
                          <span className="text-slate-400 shrink-0">({doc.sizeKb} KB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(idx)}
                          className="text-slate-400 hover:text-red-500 p-0.5 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-slate-400 text-[11.5px] py-3">
                    <File size={16} className="opacity-50" />
                    <span>No documents uploaded</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row: Handover Staff Name */}
          <div className="pt-2 border-t border-slate-100 max-w-md">
            <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
              Handover Staff Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={handoverStaff}
                onChange={(e) => setHandoverStaff(e.target.value)}
                required
                className="w-full h-8.5 px-3 pr-8 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="">Select staff name</option>
                <option value="Paras Dubey">Paras Dubey</option>
                <option value="Meera Iyer">Meera Iyer</option>
                <option value="Ananya Sharma">Ananya Sharma</option>
                <option value="Rahul Patil">Rahul Patil</option>
                <option value="Amit Kumar">Amit Kumar</option>
                <option value="Sanjay Deshmukh">Sanjay Deshmukh</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* SECTION 6: Remark */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5">
          <div className="flex items-center gap-2.5 mb-4 pb-2.5 border-b border-slate-100">
            <div className="w-6 h-6 rounded-full bg-[#0066FF] text-white text-[12px] font-bold flex items-center justify-center">
              6
            </div>
            <h2 className="text-[14px] font-bold text-slate-900">Remark</h2>
          </div>

          <div>
            <textarea
              value={remark}
              maxLength={500}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Enter remarks (optional)..."
              rows={3}
              className="w-full px-3 py-2 text-[12.5px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] resize-none"
            />
            <div className="text-right text-[11px] text-slate-400 mt-1">
              {remark.length}/500
            </div>
          </div>
        </div>

        {/* Form Action Footer matching Page 02 */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => navigate('/legal/fm-checks')}
            className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium text-[13px] flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Cancel
          </button>

          <button
            type="submit"
            className="h-9 px-6 rounded-lg bg-[#0066FF] hover:bg-blue-700 text-white font-medium text-[13px] flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Check size={15} /> Submit
          </button>
        </div>
      </form>
    </div>
  )
}
