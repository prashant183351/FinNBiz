'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

type Language = 'en' | 'hi'

type Translations = {
  [key in Language]: {
    [key: string]: string
  }
}

const translations: Translations = {
  en: {
    'brand.name': 'FinNbiz',
    'brand.tagline': 'GST-compliant accounting and business management for Indian SMBs',
    'auth.login.title': 'Welcome Back',
    'auth.login.subtitle': 'Access your business accounting dashboard',
    'auth.login.btn': 'Sign In',
    'auth.login.no_account': "Don't have an account?",
    'auth.login.register_link': 'Create one here',
    'auth.register.title': 'Create Your Account',
    'auth.register.subtitle': 'Get started with India\'s smartest accounting tool',
    'auth.register.btn': 'Register',
    'auth.register.have_account': 'Already have an account?',
    'auth.register.login_link': 'Sign in here',
    
    'field.name': 'Full Name',
    'field.name.placeholder': 'Enter your full name',
    'field.email': 'Email Address',
    'field.email.placeholder': 'you@example.com',
    'field.password': 'Password',
    'field.password.placeholder': '••••••••',
    'field.company_name': 'Company Name',
    'field.company_name.placeholder': 'e.g. Acme Enterprises',
    'field.gstin': 'GSTIN (Optional)',
    'field.gstin.placeholder': 'e.g. 27AAAAA1111A1Z1',
    'field.pan': 'PAN (Optional)',
    'field.pan.placeholder': 'e.g. ABCDE1234F',
    'field.address': 'Registered Address',
    'field.address.placeholder': 'Enter company address',
    
    'error.required': 'This field is required',
    'error.invalid_email': 'Please enter a valid email address',
    'error.invalid_gstin': 'Please enter a valid 15-character Indian GSTIN',
    'error.invalid_pan': 'Please enter a valid 10-character Indian PAN',
    'error.password_length': 'Password must be at least 6 characters',
    'error.login_failed': 'Invalid email or password. Please try again.',
    'error.user_not_found': 'Account not found. Please create a new account.',
    'error.register_failed': 'Failed to register. User may already exist.',
    'error.company_failed': 'Failed to save company setup.',
    
    'setup.title': 'Setup Your Company',
    'setup.subtitle': 'Add your business details to configure GST and billing',
    'setup.btn': 'Create & Onboard',
    'setup.gst_info': 'First 2 digits represent your State Code.',
    
    'dash.title': 'Dashboard',
    'dash.welcome': 'Welcome back,',
    'dash.company': 'Active Company',
    'dash.logout': 'Sign Out',
    'dash.no_company': 'No active company found. Please set one up.',
    'dash.setup_btn': 'Go to Company Setup',
    'dash.quick_actions': 'Quick Actions',
    'dash.view_invoices': 'Invoices',
    'dash.view_expenses': 'Expenses',
    'dash.view_inventory': 'Inventory Management',
    'dash.view_upi': 'UPI Payments',

    'inventory.title': 'Inventory Management',
    'inventory.subtitle': 'Track stock levels, record movement, and manage purchase orders',
    'inventory.total_val': 'Total Stock Valuation',
    'inventory.active_alerts': 'Active Stock Alerts',
    'inventory.tracked_skus': 'Tracked Products',
    'inventory.tab.products': 'Products & Levels',
    'inventory.tab.movements': 'Stock Ledger',
    'inventory.tab.vendors': 'Suppliers Directory',
    'inventory.tab.orders': 'Purchase Orders',
    'inventory.btn.add_product': 'Add Product',
    'inventory.btn.record_move': 'Record Stock Movement',
    'inventory.btn.add_vendor': 'Register Supplier',
    'inventory.btn.create_po': 'Create PO',
    'inventory.btn.auto_po': 'Auto-Generate POs',
    'inventory.alert.low_stock': 'Low Stock Alert',
    'inventory.alert.out_of_stock': 'Out of Stock',
    'inventory.alert.over_stock': 'Over Stock',
    'inventory.status.received': 'Received',
    'inventory.status.pending': 'Pending',
    'inventory.action.receive': 'Receive Order',

    'upi.title': 'UPI Payments & Notifications',
    'upi.subtitle': 'Manage UPI settings, render payment QRs, and simulate incoming transactions',
    'upi.config.title': 'UPI Merchant Configuration',
    'upi.config.vpa': 'Virtual Payment Address (VPA / UPI ID)',
    'upi.config.name': 'Payee Display Name',
    'upi.config.note': 'Default Payment Note',
    'upi.config.save': 'Save Configuration',
    'upi.qr.title': 'Dynamic Payment QR',
    'upi.qr.amount': 'Billing Amount (₹)',
    'upi.sim.title': 'Incoming Webhook Simulator',
    'upi.sim.payer': 'Payer UPI VPA',
    'upi.sim.amount': 'Transaction Amount (₹)',
    'upi.sim.ref': 'Reference Txn ID',
    'upi.sim.desc': 'Payment Note / Remark',
    'upi.sim.btn': 'Simulate Incoming Payment',
    'upi.ledger.title': 'Settled UPI Payments Ledger',
    'upi.ledger.empty': 'No UPI payments processed yet.',

    'dash.view_journal': 'Journal Vouchers',
    'dash.view_hr': 'HR & Payroll',
    'journal.title': 'Journal Vouchers (JV)',
    'journal.subtitle': 'Log manual double-entry adjustments for business ledgers',
    'journal.voucher_no': 'Voucher No',
    'journal.date': 'Voucher Date',
    'journal.desc': 'Description / Narration',
    'journal.add_row': 'Add Entry Row',
    'journal.dr': 'Debit Amount (₹)',
    'journal.cr': 'Credit Amount (₹)',
    'journal.total': 'Total Balanced',
    'journal.mismatch': 'Unbalanced Warning: Total Debits must equal Total Credits!',
    'journal.post': 'Post Journal Voucher',
    'journal.account': 'Account Name',
    'journal.type': 'Type',

    'eway.title': 'NIC E-Way Bill & E-Invoice',
    'eway.gen_invoice': 'Generate E-Invoice',
    'eway.gen_waybill': 'Generate E-Way Bill',
    'eway.transporter': 'Transporter ID',
    'eway.vehicle': 'Vehicle Number',
    'eway.distance': 'Distance (km)',
    'eway.bill_no': 'E-Way Bill No',
    'eway.irn': 'IRN Hash',

    'barcode.title': 'Barcode & QR Sticker Printer',
    'barcode.print': 'Print Sticker Labels',
    'barcode.customize': 'Customize Label stickers',
    'barcode.qty': 'Print Quantity',
    'barcode.size': 'Sticker Dimension',
    'barcode.mrp': 'MRP Price (₹)',
    'barcode.sku': 'SKU',

    'hr.employees.title': 'Employee Roster',
    'hr.employees.subtitle': 'Onboard staff and manage details',
    'hr.employees.add': '+ Add Employee',
    'hr.employees.cancel': 'Cancel',
    'hr.employees.onboard': 'Onboard New Employee',
    'hr.employees.name': 'Full Name',
    'hr.employees.email': 'Email',
    'hr.employees.phone': 'Phone',
    'hr.employees.role': 'Designation',
    'hr.employees.dept': 'Department',
    'hr.employees.salary': 'Basic Salary (₹)',
    'hr.employees.join': 'Join Date',
    'hr.employees.save': 'Save Employee Data',
    'hr.employees.empty': 'No employees found. Click "Add Employee" to begin.',
    'hr.attendance.mark': 'Mark Present',
    'hr.attendance.absent': 'Mark Absent',
    'hr.dashboard.title': 'HR & Payroll Overview',
    'hr.dashboard.desc': 'Manage your team, track attendance, and process monthly payroll.',
    'hr.dashboard.active': 'Total Active Staff',
    'hr.dashboard.cycle': 'Next Payroll Cycle',
    'hr.dashboard.dir': 'Employee Directory',
    'hr.dashboard.dir_desc': 'Onboard new staff, manage salaries, track designations, and maintain compliance records securely.',
    'hr.dashboard.run': 'Run Payroll & Compliance',
    'hr.dashboard.run_desc': 'Process monthly salaries, calculate auto-TDS, manage PF/ESI deductions, and generate payslips instantly.',
    'hr.attendance.title': 'Daily Attendance',
    'hr.attendance.desc': 'Mark daily presence, track half-days and monitor staff availability.',
    'hr.payroll.title': 'Payroll Processing',
    'hr.payroll.desc': 'Generate salaries and view net pay for selected month.'
  },
  hi: {
    'brand.name': 'फ़िनएन्बिज़ (FinNbiz)',
    'brand.tagline': 'भारतीय लघु उद्योगों (SMBs) के लिए GST-सक्षम अकाउंटिंग और बिज़नेस मैनेजमेंट',
    'auth.login.title': 'आपका स्वागत है',
    'auth.login.subtitle': 'अपने बिज़नेस अकाउंटिंग डैशबोर्ड में प्रवेश करें',
    'auth.login.btn': 'साइन इन करें',
    'auth.login.no_account': 'क्या आपका खाता नहीं है?',
    'auth.login.register_link': 'यहाँ नया बनाएँ',
    'auth.register.title': 'नया खाता बनाएँ',
    'auth.register.subtitle': 'भारत के सबसे स्मार्ट अकाउंटिंग टूल के साथ शुरुआत करें',
    'auth.register.btn': 'पंजीकरण (Register) करें',
    'auth.register.have_account': 'पहले से खाता है?',
    'auth.register.login_link': 'यहाँ साइन इन करें',
    
    'field.name': 'पूरा नाम',
    'field.name.placeholder': 'अपना पूरा नाम दर्ज करें',
    'field.email': 'ईमेल पता',
    'field.email.placeholder': 'you@example.com',
    'field.password': 'पासवर्ड',
    'field.password.placeholder': '••••••••',
    'field.company_name': 'कंपनी का नाम',
    'field.company_name.placeholder': 'जैसे: एक्मे एंटरप्राइजेज',
    'field.gstin': 'जीएसटीआईएन (GSTIN) (वैकल्पिक)',
    'field.gstin.placeholder': 'जैसे: 27AAAAA1111A1Z1',
    'field.pan': 'पैन कार्ड (PAN) (वैकल्पिक)',
    'field.pan.placeholder': 'जैसे: ABCDE1234F',
    'field.address': 'पंजीकृत पता',
    'field.address.placeholder': 'कंपनी का पता दर्ज करें',
    
    'error.required': 'यह फ़ील्ड अनिवार्य है',
    'error.invalid_email': 'कृपया एक वैध ईमेल पता दर्ज करें',
    'error.invalid_gstin': 'कृपया एक वैध 15-वर्णों का भारतीय GSTIN दर्ज करें',
    'error.invalid_pan': 'कृपया एक वैध 10-वर्णों का भारतीय PAN दर्ज करें',
    'error.password_length': 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए',
    'error.login_failed': 'अमान्य ईमेल या पासवर्ड। कृपया पुनः प्रयास करें।',
    'error.user_not_found': 'खाता नहीं मिला। कृपया पहले नया खाता बनाएँ।',
    'error.register_failed': 'पंजीकरण विफल। शायद यह उपयोगकर्ता पहले से मौजूद है।',
    'error.company_failed': 'कंपनी सेटअप सहेजने में विफल।',
    
    'setup.title': 'अपनी कंपनी सेटअप करें',
    'setup.subtitle': 'GST और बिलिंग कॉन्फ़िगर करने के लिए अपने बिज़नेस का विवरण दर्ज करें',
    'setup.btn': 'कंपनी बनाएँ और आगे बढ़ें',
    'setup.gst_info': 'पहले 2 अंक आपके राज्य कोड (State Code) को दर्शाते हैं।',
    
    'dash.title': 'डैशबोर्ड',
    'dash.welcome': 'वापसी पर स्वागत है,',
    'dash.company': 'सक्रिय कंपनी (Active Company)',
    'dash.logout': 'लॉग आउट',
    'dash.no_company': 'कोई सक्रिय कंपनी नहीं मिली। कृपया एक सेटअप करें।',
    'dash.setup_btn': 'कंपनी सेटअप पर जाएँ',
    'dash.quick_actions': 'त्वरित कार्रवाई',
    'dash.view_invoices': 'इनवॉइस (Invoices)',
    'dash.view_expenses': 'खर्चे (Expenses)',
    'dash.view_inventory': 'इन्वेंट्री (Inventory)',
    'dash.view_upi': 'यूपीआई भुगतान',

    'inventory.title': 'इन्वेंट्री प्रबंधन',
    'inventory.subtitle': 'स्टॉक स्तर को ट्रैक करें, स्टॉक इन/आउट रिकॉर्ड करें और खरीद आदेश प्रबंधित करें',
    'inventory.total_val': 'कुल स्टॉक वैल्यूएशन',
    'inventory.active_alerts': 'सक्रिय स्टॉक अलार्म',
    'inventory.tracked_skus': 'ट्रैक किए गए उत्पाद',
    'inventory.tab.products': 'उत्पाद और स्तर',
    'inventory.tab.movements': 'स्टॉक बहीखाता (Ledger)',
    'inventory.tab.vendors': 'आपूर्तिकर्ता डायरेक्टरी',
    'inventory.tab.orders': 'खरीद आदेश (Purchase Orders)',
    'inventory.btn.add_product': 'नया उत्पाद जोड़ें',
    'inventory.btn.record_move': 'स्टॉक दर्ज करें',
    'inventory.btn.add_vendor': 'नया सप्लायर जोड़ें',
    'inventory.btn.create_po': 'नया PO बनाएँ',
    'inventory.btn.auto_po': 'ऑटो-PO जनरेट करें',
    'inventory.alert.low_stock': 'कम स्टॉक अलर्ट',
    'inventory.alert.out_of_stock': 'स्टॉक समाप्त',
    'inventory.alert.over_stock': 'अतिरिक्त स्टॉक',
    'inventory.status.received': 'प्राप्त (Received)',
    'inventory.status.pending': 'लंबित (Pending)',
    'inventory.action.receive': 'स्टॉक प्राप्त करें',

    'upi.title': 'UPI भुगतान और सूचनाएं',
    'upi.subtitle': 'UPI सेटिंग्स प्रबंधित करें, भुगतान QR कोड बनाएं, और इनकमिंग लेनदेन का अनुकरण करें',
    'upi.config.title': 'UPI मर्चेंट कॉन्फ़िगरेशन',
    'upi.config.vpa': 'वर्चुअल पेमेंट एड्रेस (VPA / UPI ID)',
    'upi.config.name': 'भुगतानकर्ता का नाम (Payee Name)',
    'upi.config.note': 'डिफ़ॉल्ट भुगतान नोट',
    'upi.config.save': 'कॉन्फ़िगरेशन सहेजें',
    'upi.qr.title': 'डायनामिक भुगतान QR कोड',
    'upi.qr.amount': 'बिलिंग राशि (₹)',
    'upi.sim.title': 'इनकमिंग वेबहुक सिम्युलेटर',
    'upi.sim.payer': 'भुगतानकर्ता की UPI ID',
    'upi.sim.amount': 'लेनदेन राशि (₹)',
    'upi.sim.ref': 'संदर्भ ट्रांजेक्शन ID',
    'upi.sim.desc': 'भुगतान नोट / टिप्पणी',
    'upi.sim.btn': 'भुगतान नोटिफिकेशन सिम्युलेट करें',
    'upi.ledger.title': 'सफल UPI भुगतान बहीखाता',
    'upi.ledger.empty': 'अभी तक कोई UPI भुगतान संसाधित नहीं हुआ है।',

    'dash.view_journal': 'जर्नल वाउचर (JV)',
    'dash.view_hr': 'HR और पेरोल',
    'journal.title': 'जर्नल वाउचर (Journal Voucher)',
    'journal.subtitle': 'व्यावसायिक लेजर के लिए मैन्युअल डबल-एंट्री समायोजन दर्ज करें',
    'journal.voucher_no': 'वाउचर संख्या',
    'journal.date': 'वाउचर तिथि',
    'journal.desc': 'विवरण / स्पष्टीकरण',
    'journal.add_row': 'नई एंट्री रो जोड़ें',
    'journal.dr': 'डेबिट राशि (Dr ₹)',
    'journal.cr': 'क्रेडिट राशि (Cr ₹)',
    'journal.total': 'कुल संतुलित योग',
    'journal.mismatch': 'असंतुलन चेतावनी: कुल डेबिट राशि और क्रेडिट राशि समान होनी चाहिए!',
    'journal.post': 'जर्नल वाउचर पोस्ट करें',
    'journal.account': 'खाता नाम',
    'journal.type': 'प्रकार',

    'eway.title': 'ई-इनवॉइस और ई-वे बिल',
    'eway.gen_invoice': 'ई-इनवॉइस बनाएं',
    'eway.gen_waybill': 'ई-वे बिल बनाएं',
    'eway.transporter': 'ट्रांसपोर्टर ID',
    'eway.vehicle': 'वाहन संख्या',
    'eway.distance': 'दूरी (किमी)',
    'eway.bill_no': 'ई-वे बिल नं',
    'eway.irn': 'IRN हैश कुंजी',

    'barcode.title': 'बारकोड और QR स्टीकर प्रिंटर',
    'barcode.print': 'स्टिकर लेबल प्रिंट करें',
    'barcode.customize': 'स्टिकर लेबल कस्टमाइज़ करें',
    'barcode.qty': 'प्रिंट मात्रा',
    'barcode.size': 'स्टिकर का आकार',
    'barcode.mrp': 'अधिकतम खुदरा मूल्य (₹)',
    'barcode.sku': 'उत्पाद SKU',

    'hr.employees.title': 'कर्मचारी सूची',
    'hr.employees.subtitle': 'स्टाफ जोड़ें और विवरण प्रबंधित करें',
    'hr.employees.add': '+ नया कर्मचारी जोड़ें',
    'hr.employees.cancel': 'रद्द करें',
    'hr.employees.onboard': 'नया कर्मचारी ऑनबोर्ड करें',
    'hr.employees.name': 'पूरा नाम',
    'hr.employees.email': 'ईमेल पता',
    'hr.employees.phone': 'फ़ोन नंबर',
    'hr.employees.role': 'पद (Designation)',
    'hr.employees.dept': 'विभाग (Department)',
    'hr.employees.salary': 'मूल वेतन (₹)',
    'hr.employees.join': 'शामिल होने की तिथि',
    'hr.employees.save': 'कर्मचारी डेटा सहेजें',
    'hr.employees.empty': 'कोई कर्मचारी नहीं मिला। शुरू करने के लिए "नया कर्मचारी जोड़ें" पर क्लिक करें।',
    'hr.attendance.mark': 'उपस्थित (Present)',
    'hr.attendance.absent': 'अनुपस्थित (Absent)',
    'hr.dashboard.title': 'HR और पेरोल',
    'hr.dashboard.desc': 'अपनी टीम प्रबंधित करें, उपस्थिति ट्रैक करें, और मासिक पेरोल प्रोसेस करें।',
    'hr.dashboard.active': 'कुल सक्रिय स्टाफ',
    'hr.dashboard.cycle': 'अगला पेरोल चक्र',
    'hr.dashboard.dir': 'कर्मचारी डायरेक्टरी',
    'hr.dashboard.dir_desc': 'नए कर्मचारियों को जोड़ें, वेतन प्रबंधित करें, पदनाम ट्रैक करें और कंप्लायंस सुरक्षित रखें।',
    'hr.dashboard.run': 'पेरोल और कंप्लायंस रन करें',
    'hr.dashboard.run_desc': 'मासिक वेतन प्रोसेस करें, ऑटो-TDS की गणना करें, PF/ESI कटौती प्रबंधित करें, और तुरंत पे-स्लिप जनरेट करें।',
    'hr.attendance.title': 'दैनिक उपस्थिति (Attendance)',
    'hr.attendance.desc': 'दैनिक उपस्थिति दर्ज करें, हाफ-डे ट्रैक करें और स्टाफ की उपलब्धता देखें।',
    'hr.payroll.title': 'पेरोल प्रोसेसिंग',
    'hr.payroll.desc': 'वेतन जनरेट करें और चयनित महीने के लिए शुद्ध वेतन (Net Pay) देखें।'
  }
}

interface I18nContextProps {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextProps | undefined>(undefined)

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en')

  useEffect(() => {
    const savedLang = localStorage.getItem('finnbiz_lang') as Language
    if (savedLang === 'en' || savedLang === 'hi') {
      setLanguageState(savedLang)
    } else {
      localStorage.setItem('finnbiz_lang', 'en')
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('finnbiz_lang', lang)
  }

  const t = (key: string): string => {
    const dict = translations[language] || translations['en']
    return dict[key] || translations['en'][key] || key
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useI18n = () => {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}
