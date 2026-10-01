// Seeded demo accounts (backend/scripts/seed.js). Only rendered in dev or when VITE_DEMO_LOGINS=1.
export const DEMO_ENABLED = import.meta.env.DEV || import.meta.env.VITE_DEMO_LOGINS === "1";

export const DEMO_LOGINS = DEMO_ENABLED
  ? [
      ["Office", "#4f46e5", [
        ["Admin (company A)", "admin@demo.local", "Admin@123"],
        ["Director", "director@demo.local", "Director@123"],
        ["Sub Admin", "subadmin@demo.local", "SubAdmin@123"],
        ["Verifier", "verifier@demo.local", "Verify@123"],
        ["Executive", "executive@demo.local", "Exec@1234"],
        ["Service / Project Ops", "ops@demo.local", "Ops@12345"],
        ["Finance", "finance@demo.local", "Fin@123"],
      ]],
      ["Field", "#d97706", [
        ["Sales Officer", "so@demo.local", "Sales@123"],
        ["Inspector", "inspector@demo.local", "Insp@123"],
      ]],
      ["Franchise", "#059669", [
        ["Super Master", "supermaster@demo.local", "Super@123"],
        ["Master", "master@demo.local", "Master@123"],
        ["Franchisee", "franchisee@demo.local", "Fran@123"],
        ["Franchisee Two", "franchisee2@demo.local", "Fran2@123"],
      ]],
      ["Dexter India / Company B", "#e11d48", [
        ["Dexter (A + B)", "dexter@demo.local", "Dexter@123"],
        ["Dexter (A only)", "dexter-a@demo.local", "DexterA@123"],
        ["Admin (company B)", "admin-b@demo.local", "AdminB@123"],
        ["Franchisee (company B)", "franchisee-b@demo.local", "FranB@123"],
      ]],
    ]
  : [];
