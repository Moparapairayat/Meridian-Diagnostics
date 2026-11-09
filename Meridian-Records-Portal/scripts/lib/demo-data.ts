// Static synthetic demo data (SPEC 15). Fictional only: no real people.

export const BRANCHES = [
  { name: 'Central', code: 'CEN' },
  { name: 'North', code: 'NOR' },
  { name: 'South', code: 'SOU' },
  { name: 'East', code: 'EAS' },
  { name: 'West', code: 'WES' },
] as const;

export type BranchCode = (typeof BRANCHES)[number]['code'];

interface AnalyteDef {
  analyte: string;
  unit: string;
  low: number;
  high: number;
  decimals: number;
}

interface TestDef {
  code: string;
  name: string;
  specimen: string;
  price: number;
  prepEn: string;
  prepBn: string;
  analytes: AnalyteDef[];
}

const NO_PREP_EN = 'No special preparation is needed.';
const NO_PREP_BN = 'বিশেষ কোনো প্রস্তুতির প্রয়োজন নেই।';

export const TESTS: TestDef[] = [
  {
    code: 'CBC', name: 'Complete Blood Count', specimen: 'Whole blood (EDTA)', price: 400,
    prepEn: NO_PREP_EN, prepBn: NO_PREP_BN,
    analytes: [
      { analyte: 'Haemoglobin', unit: 'g/dL', low: 12, high: 16, decimals: 1 },
      { analyte: 'WBC count', unit: 'x10^9/L', low: 4, high: 11, decimals: 1 },
      { analyte: 'Platelet count', unit: 'x10^9/L', low: 150, high: 450, decimals: 0 },
    ],
  },
  {
    code: 'FBS', name: 'Fasting Blood Sugar', specimen: 'Plasma (fluoride)', price: 150,
    prepEn: 'Fast for 8 to 10 hours before the test. Plain water is allowed.',
    prepBn: 'পরীক্ষার আগে ৮ থেকে ১০ ঘণ্টা না খেয়ে থাকুন। শুধু পানি পান করা যাবে।',
    analytes: [{ analyte: 'Glucose (fasting)', unit: 'mmol/L', low: 3.9, high: 5.5, decimals: 1 }],
  },
  {
    code: 'RBS', name: 'Random Blood Sugar', specimen: 'Plasma (fluoride)', price: 150,
    prepEn: NO_PREP_EN, prepBn: NO_PREP_BN,
    analytes: [{ analyte: 'Glucose (random)', unit: 'mmol/L', low: 3.9, high: 7.8, decimals: 1 }],
  },
  {
    code: 'HBA1C', name: 'HbA1c', specimen: 'Whole blood (EDTA)', price: 900,
    prepEn: 'No fasting is needed.', prepBn: 'না খেয়ে থাকার প্রয়োজন নেই।',
    analytes: [{ analyte: 'HbA1c', unit: '%', low: 4, high: 5.6, decimals: 1 }],
  },
  {
    code: 'LIPID', name: 'Lipid Profile', specimen: 'Serum', price: 1200,
    prepEn: 'Fast for 10 to 12 hours before the test. Plain water is allowed. Avoid fatty food the night before.',
    prepBn: 'পরীক্ষার আগে ১০ থেকে ১২ ঘণ্টা না খেয়ে থাকুন। শুধু পানি পান করা যাবে। আগের রাতে তৈলাক্ত খাবার এড়িয়ে চলুন।',
    analytes: [
      { analyte: 'Total cholesterol', unit: 'mmol/L', low: 3, high: 5.2, decimals: 1 },
      { analyte: 'Triglycerides', unit: 'mmol/L', low: 0.5, high: 1.7, decimals: 1 },
      { analyte: 'HDL cholesterol', unit: 'mmol/L', low: 1, high: 2, decimals: 1 },
      { analyte: 'LDL cholesterol', unit: 'mmol/L', low: 1.5, high: 3.4, decimals: 1 },
    ],
  },
  {
    code: 'LFT', name: 'Liver Function Test', specimen: 'Serum', price: 1000,
    prepEn: 'Fast for 8 hours if possible. Tell staff about any medicines you take.',
    prepBn: 'সম্ভব হলে ৮ ঘণ্টা না খেয়ে থাকুন। আপনি কোনো ওষুধ খেলে স্টাফকে জানান।',
    analytes: [
      { analyte: 'ALT', unit: 'U/L', low: 7, high: 56, decimals: 0 },
      { analyte: 'AST', unit: 'U/L', low: 10, high: 40, decimals: 0 },
      { analyte: 'Total bilirubin', unit: 'mg/dL', low: 0.1, high: 1.2, decimals: 1 },
    ],
  },
  {
    code: 'CREAT', name: 'Serum Creatinine', specimen: 'Serum', price: 350,
    prepEn: 'Avoid heavy exercise and large meat meals for 24 hours before the test.',
    prepBn: 'পরীক্ষার আগের ২৪ ঘণ্টা ভারী ব্যায়াম এবং বেশি মাংস খাওয়া এড়িয়ে চলুন।',
    analytes: [{ analyte: 'Creatinine', unit: 'mg/dL', low: 0.6, high: 1.2, decimals: 2 }],
  },
  {
    code: 'ELEC', name: 'Serum Electrolytes', specimen: 'Serum', price: 800,
    prepEn: NO_PREP_EN, prepBn: NO_PREP_BN,
    analytes: [
      { analyte: 'Sodium', unit: 'mmol/L', low: 135, high: 145, decimals: 0 },
      { analyte: 'Potassium', unit: 'mmol/L', low: 3.5, high: 5.1, decimals: 1 },
      { analyte: 'Chloride', unit: 'mmol/L', low: 98, high: 107, decimals: 0 },
    ],
  },
  {
    code: 'TSH', name: 'Thyroid Stimulating Hormone', specimen: 'Serum', price: 800,
    prepEn: 'Come in the morning. If you take thyroid medicine, take it after the sample is collected.',
    prepBn: 'সকালে আসুন। থাইরয়েডের ওষুধ খেলে নমুনা দেওয়ার পরে খাবেন।',
    analytes: [{ analyte: 'TSH', unit: 'mIU/L', low: 0.4, high: 4, decimals: 2 }],
  },
  {
    code: 'CRP', name: 'C-Reactive Protein', specimen: 'Serum', price: 600,
    prepEn: NO_PREP_EN, prepBn: NO_PREP_BN,
    analytes: [{ analyte: 'CRP', unit: 'mg/L', low: 0, high: 5, decimals: 1 }],
  },
  {
    code: 'VITD', name: 'Vitamin D (25-OH)', specimen: 'Serum', price: 2500,
    prepEn: 'No fasting is needed. Tell staff if you take vitamin D supplements.',
    prepBn: 'না খেয়ে থাকার প্রয়োজন নেই। ভিটামিন ডি সাপ্লিমেন্ট খেলে স্টাফকে জানান।',
    analytes: [{ analyte: '25-OH Vitamin D', unit: 'ng/mL', low: 30, high: 100, decimals: 0 }],
  },
  {
    code: 'URIC', name: 'Serum Uric Acid', specimen: 'Serum', price: 400,
    prepEn: 'Fast for 4 hours before the test. Avoid alcohol and red meat the day before.',
    prepBn: 'পরীক্ষার আগে ৪ ঘণ্টা না খেয়ে থাকুন। আগের দিন লাল মাংস এড়িয়ে চলুন।',
    analytes: [{ analyte: 'Uric acid', unit: 'mg/dL', low: 3.4, high: 7, decimals: 1 }],
  },
];

// Fictional names (Latin script only; the English PDF font cannot encode Bengali).
export const FIRST_NAMES_FEMALE = [
  'Ayesha', 'Fatema', 'Sadia', 'Nasrin', 'Rumana', 'Tahmina', 'Sharmin', 'Laila', 'Mitu', 'Rokeya',
  'Jannatul', 'Sumaiya', 'Nadia', 'Farzana', 'Shathi',
];
export const FIRST_NAMES_MALE = [
  'Rahim', 'Karim', 'Habib', 'Sajid', 'Imran', 'Rafiq', 'Mahfuz', 'Shahin', 'Jamal', 'Nayeem',
  'Rakib', 'Sohel', 'Mizan', 'Faruk', 'Biplob',
];
export const LAST_NAMES = [
  'Ahmed', 'Hossain', 'Rahman', 'Islam', 'Chowdhury', 'Sarkar', 'Mia', 'Begum', 'Talukder', 'Khan',
  'Uddin', 'Akter', 'Biswas', 'Mollah', 'Sheikh',
];

export const RETEST_REASONS = [
  'Haemolysed sample, re-run requested',
  'Clotted sample',
  'Result does not match clinical history',
  'Insufficient sample volume',
];

export const AMEND_REASONS = [
  'Unit of measurement corrected on the report',
  'Reference range updated after analyser recalibration',
];

export interface KbArticleDef {
  slug: string;
  category: 'test_preparation' | 'sop' | 'faq' | 'policy';
  titleEn: string;
  titleBn: string;
  bodyEn: string;
  bodyBn: string;
  version: number;
  /** Days from today; negative = review overdue. */
  reviewInDays: number;
}

export const KB_ARTICLES: KbArticleDef[] = [
  {
    slug: 'fasting-before-blood-sugar-and-lipid-tests',
    category: 'test_preparation',
    titleEn: 'Fasting before blood sugar and lipid tests',
    titleBn: 'ব্লাড সুগার ও লিপিড পরীক্ষার আগে না খেয়ে থাকা',
    bodyEn: [
      '## Who needs to fast',
      '- **Fasting blood sugar (FBS):** 8 to 10 hours without food.',
      '- **Lipid profile:** 10 to 12 hours without food.',
      '',
      '## What the patient may do',
      '- Drink plain water.',
      '- Take regular medicines unless the doctor said otherwise.',
      '',
      '## What to check at reception',
      'Ask when the patient last ate. If the fasting time is too short, offer a new appointment and note it on the order.',
    ].join('\n'),
    bodyBn: [
      '## কাদের না খেয়ে আসতে হবে',
      '- **ফাস্টিং ব্লাড সুগার (FBS):** ৮ থেকে ১০ ঘণ্টা না খেয়ে।',
      '- **লিপিড প্রোফাইল:** ১০ থেকে ১২ ঘণ্টা না খেয়ে।',
      '',
      '## রোগী যা করতে পারবেন',
      '- শুধু পানি পান করতে পারবেন।',
      '- ডাক্তার নিষেধ না করলে নিয়মিত ওষুধ খেতে পারবেন।',
      '',
      '## রিসেপশনে যা দেখবেন',
      'রোগী শেষ কখন খেয়েছেন জিজ্ঞেস করুন। না খেয়ে থাকার সময় কম হলে নতুন সময় দিন এবং অর্ডারে লিখে রাখুন।',
    ].join('\n'),
    version: 3,
    reviewInDays: 120,
  },
  {
    slug: 'sample-labelling-sop',
    category: 'sop',
    titleEn: 'Sample labelling SOP',
    titleBn: 'নমুনা লেবেল করার নিয়ম (SOP)',
    bodyEn: [
      '1. Print the barcode labels from the order screen. Never hand-write a label.',
      '2. Confirm the patient with **two identifiers**: full name and Patient ID.',
      '3. Stick the label on the tube **in front of the patient**, straight and along the tube.',
      '4. Scan the label once to check it reads correctly.',
      '5. Mark the order as collected in the system.',
    ].join('\n'),
    bodyBn: [
      '১. অর্ডার স্ক্রিন থেকে বারকোড লেবেল প্রিন্ট করুন। কখনো হাতে লিখে লেবেল দেবেন না।',
      '২. **দুটি পরিচয়** দিয়ে রোগী নিশ্চিত করুন: পুরো নাম এবং পেশেন্ট আইডি।',
      '৩. **রোগীর সামনেই** টিউবে লেবেল লাগান, সোজা করে টিউবের লম্বালম্বি।',
      '৪. লেবেলটি একবার স্ক্যান করে দেখুন ঠিকমতো পড়া যাচ্ছে কি না।',
      '৫. সিস্টেমে অর্ডারটি "collected" হিসেবে চিহ্নিত করুন।',
    ].join('\n'),
    version: 2,
    reviewInDays: -12,
  },
  {
    slug: 'downtime-internet-or-power-failure',
    category: 'sop',
    titleEn: 'What to do when the internet or power fails',
    titleBn: 'ইন্টারনেট বা বিদ্যুৎ চলে গেলে কী করবেন',
    bodyEn: [
      '## During the outage',
      '- Use the **paper downtime form** kept at every reception desk.',
      '- Write the patient name, phone, tests and time. Use pre-printed downtime numbers for the tubes.',
      '- Keep the forms together in the downtime folder.',
      '',
      '## When the system is back',
      '- Enter every downtime form into the system **once**, then write the new Patient ID on the form.',
      '- Re-label the tubes with system barcodes.',
      '',
      '## Who to call',
      '- Branch manager first, then the central IT support number on the notice board.',
    ].join('\n'),
    bodyBn: [
      '## সমস্যা চলাকালীন',
      '- প্রতিটি রিসেপশন ডেস্কে রাখা **কাগজের ডাউনটাইম ফর্ম** ব্যবহার করুন।',
      '- রোগীর নাম, ফোন, পরীক্ষা ও সময় লিখুন। টিউবের জন্য আগে থেকে ছাপানো ডাউনটাইম নম্বর ব্যবহার করুন।',
      '- ফর্মগুলো ডাউনটাইম ফোল্ডারে একসাথে রাখুন।',
      '',
      '## সিস্টেম চালু হলে',
      '- প্রতিটি ডাউনটাইম ফর্ম সিস্টেমে **একবারই** এন্ট্রি দিন, তারপর ফর্মে নতুন পেশেন্ট আইডি লিখুন।',
      '- টিউবগুলোতে সিস্টেমের বারকোড দিয়ে নতুন লেবেল লাগান।',
      '',
      '## কাকে ফোন করবেন',
      '- প্রথমে শাখা ম্যানেজার, তারপর নোটিশ বোর্ডে দেওয়া কেন্দ্রীয় আইটি সাপোর্ট নম্বর।',
    ].join('\n'),
    version: 1,
    reviewInDays: 60,
  },
  {
    slug: 'patient-id-lookup',
    category: 'faq',
    titleEn: 'How to look up a patient ID',
    titleBn: 'কীভাবে পেশেন্ট আইডি খুঁজবেন',
    bodyEn: [
      'Open **Search** and type one of these:',
      '- the Patient ID, for example `MD-2026-00012`',
      '- the 11-digit mobile number',
      '- part of the name (at least 2 letters)',
      '',
      'Results come from **all five branches**. The branch badge shows where the patient registered.',
      'Never register a returning patient again. Use **New order** on their record instead.',
    ].join('\n'),
    bodyBn: [
      '**Search** খুলে নিচের যেকোনো একটি লিখুন:',
      '- পেশেন্ট আইডি, যেমন `MD-2026-00012`',
      '- ১১ সংখ্যার মোবাইল নম্বর',
      '- নামের অংশ (অন্তত ২টি অক্ষর)',
      '',
      'ফলাফল **পাঁচটি শাখা** থেকেই আসে। শাখার ব্যাজ দেখে বুঝবেন রোগী কোথায় রেজিস্টার করেছেন।',
      'পুরনো রোগীকে কখনো আবার রেজিস্টার করবেন না। তার রেকর্ডে **New order** ব্যবহার করুন।',
    ].join('\n'),
    version: 1,
    reviewInDays: 150,
  },
  {
    slug: 're-test-policy',
    category: 'policy',
    titleEn: 'Re-test policy',
    titleBn: 'পুনরায় পরীক্ষার (রি-টেস্ট) নীতি',
    bodyEn: [
      '- Only a **pathologist** can request a re-test, and a reason is always required.',
      '- Common reasons: haemolysed or clotted sample, too little sample, or a result that does not fit the clinical picture.',
      '- The order goes back to the lab and the re-test count increases. Lab technicians get an email with the order number only.',
      '- If a new sample is needed, reception calls the patient. There is no extra charge.',
    ].join('\n'),
    bodyBn: [
      '- শুধু **প্যাথলজিস্ট** রি-টেস্টের অনুরোধ করতে পারেন, আর সবসময় কারণ লিখতে হয়।',
      '- সাধারণ কারণ: নমুনা হিমোলাইজড বা জমাট বাঁধা, নমুনা কম, অথবা ফলাফল রোগীর অবস্থার সাথে মেলে না।',
      '- অর্ডারটি আবার ল্যাবে যায় এবং রি-টেস্টের সংখ্যা বাড়ে। ল্যাব টেকনিশিয়ানরা শুধু অর্ডার নম্বরসহ একটি ইমেইল পান।',
      '- নতুন নমুনা লাগলে রিসেপশন রোগীকে ফোন করে। এর জন্য কোনো বাড়তি খরচ নেই।',
    ].join('\n'),
    version: 2,
    reviewInDays: 90,
  },
  {
    slug: 'never-send-reports-on-whatsapp',
    category: 'policy',
    titleEn: 'Privacy: never send reports on WhatsApp',
    titleBn: 'গোপনীয়তা: কখনো হোয়াটসঅ্যাপে রিপোর্ট পাঠাবেন না',
    bodyEn: [
      'Reports contain health data. Sending them on WhatsApp or personal email puts patients at risk and leaves no record of who saw them.',
      '',
      '- Patients download reports from the **secure portal** with a one-time code.',
      '- If a patient asks for a report by WhatsApp, explain the portal and help them log in.',
      '- Never take photos of reports or screens on a personal phone.',
      '- Report any breach to the branch manager the same day.',
    ].join('\n'),
    bodyBn: [
      'রিপোর্টে স্বাস্থ্য তথ্য থাকে। হোয়াটসঅ্যাপ বা ব্যক্তিগত ইমেইলে পাঠালে রোগীর ঝুঁকি তৈরি হয় এবং কে দেখেছে তার কোনো রেকর্ড থাকে না।',
      '',
      '- রোগীরা এককালীন কোড দিয়ে **নিরাপদ পোর্টাল** থেকে রিপোর্ট ডাউনলোড করেন।',
      '- কেউ হোয়াটসঅ্যাপে রিপোর্ট চাইলে পোর্টালের কথা বুঝিয়ে বলুন এবং লগইন করতে সাহায্য করুন।',
      '- ব্যক্তিগত ফোনে কখনো রিপোর্ট বা স্ক্রিনের ছবি তুলবেন না।',
      '- কোনো তথ্য ফাঁস হলে সেদিনই শাখা ম্যানেজারকে জানান।',
    ].join('\n'),
    version: 1,
    reviewInDays: 170,
  },
  {
    slug: 'wrong-patient-alert',
    category: 'sop',
    titleEn: 'Handling a wrong-patient alert',
    titleBn: 'ভুল রোগীর সতর্কতা হলে করণীয়',
    bodyEn: [
      '1. **Stop.** Do not process or release anything for that order.',
      '2. Check the two identifiers (name and Patient ID) against the tube label and the order.',
      '3. If they do not match, tell the pathologist and the branch manager at once.',
      '4. Collect a new sample with a new label. Never re-label an old tube.',
      '5. The manager records the incident and checks the audit log.',
    ].join('\n'),
    bodyBn: [
      '১. **থামুন।** ওই অর্ডারের কোনো কাজ বা রিপোর্ট রিলিজ করবেন না।',
      '২. টিউবের লেবেল ও অর্ডারের সাথে দুটি পরিচয় (নাম ও পেশেন্ট আইডি) মিলিয়ে দেখুন।',
      '৩. না মিললে সাথে সাথে প্যাথলজিস্ট ও শাখা ম্যানেজারকে জানান।',
      '৪. নতুন লেবেলসহ নতুন নমুনা নিন। পুরনো টিউবে কখনো নতুন লেবেল লাগাবেন না।',
      '৫. ম্যানেজার ঘটনাটি নথিভুক্ত করেন এবং অডিট লগ পরীক্ষা করেন।',
    ].join('\n'),
    version: 1,
    reviewInDays: 45,
  },
  {
    slug: 'otp-help-for-patients',
    category: 'faq',
    titleEn: 'OTP help for patients',
    titleBn: 'রোগীদের জন্য ওটিপি সহায়তা',
    bodyEn: [
      '- The code has **6 digits** and works for **5 minutes**, one time only.',
      '- A new code can be requested after 60 seconds, up to 3 codes in 15 minutes.',
      '- After 5 wrong codes the account is locked for 15 minutes. This protects the patient.',
      '- Check that the Patient ID and mobile number match the registration slip.',
      '- Staff never ask a patient to read out their code.',
    ].join('\n'),
    bodyBn: [
      '- কোডে **৬টি সংখ্যা** থাকে এবং এটি **৫ মিনিট** কাজ করে, শুধু একবার।',
      '- ৬০ সেকেন্ড পরে নতুন কোড চাওয়া যায়, ১৫ মিনিটে সর্বোচ্চ ৩টি।',
      '- পরপর ৫ বার ভুল কোড দিলে ১৫ মিনিটের জন্য লক হয়ে যায়। এটি রোগীর সুরক্ষার জন্য।',
      '- পেশেন্ট আইডি ও মোবাইল নম্বর রেজিস্ট্রেশন স্লিপের সাথে মিলছে কি না দেখুন।',
      '- স্টাফ কখনো রোগীকে কোড পড়ে শোনাতে বলেন না।',
    ].join('\n'),
    version: 2,
    reviewInDays: -3,
  },
  {
    slug: 'x-ray-preparation',
    category: 'test_preparation',
    titleEn: 'X-ray preparation',
    titleBn: 'এক্স-রের প্রস্তুতি',
    bodyEn: [
      '- Remove jewellery, hair clips and anything metal from the area being imaged.',
      '- Wear loose clothing. A gown may be provided.',
      '- **Pregnancy:** always ask female patients aged 12 to 50 if they could be pregnant, and tell the radiographer.',
      '- No fasting is needed for a plain X-ray.',
    ].join('\n'),
    bodyBn: [
      '- যে অংশের ছবি নেওয়া হবে সেখান থেকে গয়না, হেয়ার ক্লিপ ও সব ধাতব জিনিস খুলে ফেলুন।',
      '- ঢিলেঢালা পোশাক পরুন। প্রয়োজনে গাউন দেওয়া হবে।',
      '- **গর্ভাবস্থা:** ১২ থেকে ৫০ বছর বয়সী নারী রোগীকে সবসময় জিজ্ঞেস করুন তিনি অন্তঃসত্ত্বা হতে পারেন কি না, এবং রেডিওগ্রাফারকে জানান।',
      '- সাধারণ এক্স-রের জন্য না খেয়ে থাকার প্রয়োজন নেই।',
    ].join('\n'),
    version: 1,
    reviewInDays: 100,
  },
  {
    slug: 'complaint-handling',
    category: 'policy',
    titleEn: 'Complaint handling',
    titleBn: 'অভিযোগ ব্যবস্থাপনা',
    bodyEn: [
      '1. Listen calmly and thank the patient for telling us.',
      '2. Write the complaint in the complaint register: date, branch, what happened. No test results.',
      '3. Fix what you can at once, for example a delayed report or a wrong phone number.',
      '4. Pass anything else to the branch manager within one working day.',
      '5. The manager replies to the patient within **3 working days**.',
    ].join('\n'),
    bodyBn: [
      '১. শান্তভাবে শুনুন এবং জানানোর জন্য রোগীকে ধন্যবাদ দিন।',
      '২. অভিযোগ রেজিস্টারে লিখুন: তারিখ, শাখা, কী ঘটেছে। কোনো পরীক্ষার ফলাফল লিখবেন না।',
      '৩. যা সঙ্গে সঙ্গে ঠিক করা যায় তা করুন, যেমন দেরিতে রিপোর্ট বা ভুল ফোন নম্বর।',
      '৪. বাকি বিষয় এক কর্মদিবসের মধ্যে শাখা ম্যানেজারকে জানান।',
      '৫. ম্যানেজার **৩ কর্মদিবসের** মধ্যে রোগীকে উত্তর দেন।',
    ].join('\n'),
    version: 1,
    reviewInDays: 75,
  },
];
