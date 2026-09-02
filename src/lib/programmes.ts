/**
 * The ENN Consultancy catalogue of consulting and training services.
 *
 * Held as data so the same list drives the public programmes section, the
 * request form's selection, and anything added later. Adding a service is a
 * one-line change here.
 */
export interface ProgrammeGroup {
  title: string;
  /** Shown under the group heading on the public page. */
  blurb?: string;
  items: string[];
}

export const TRAINING_PROGRAMMES: ProgrammeGroup[] = [
  {
    title: "How we work with you",
    blurb: "Every standard below can be delivered through any of these engagements.",
    items: ["Consulting", "Training", "Auditing", "Implementation Support"],
  },
  {
    title: "Management system standards",
    blurb: "Certification-track standards, singly or as an integrated system.",
    items: [
      "Integrated Management System (IMS)",
      "ISO 9001 Quality Management",
      "ISO 14001 Environmental Management",
      "ISO 45001 Occupational Health & Safety Management",
      "IATF 16949 Automotive Quality Management",
      "AS9100 Aerospace Quality Management",
      "ISO 13485 Medical Devices Quality Management",
    ],
  },
  {
    title: "Aerospace standards (AS / RM series)",
    blurb: "Sector-specific requirements for the aerospace supply chain.",
    items: [
      "QMS Implementation & GAP Assessment (AS 13100)",
      "QMS Alignment (AS 9100 / 9110 / 9120)",
      "APQP & PPAP (AS 9145)",
      "First Article Inspection (AS 9102)",
      "Key Characteristics & Variation Management (AS 9103)",
      "FOD Prevention (AS 9146)",
      "Operator Self-Verification (AS 9162)",
      "Counterfeit Part Prevention (AS 5553 / AS 6174)",
      "Problem Solving (RM 13000)",
      "Measurement System Analysis (RM 13003)",
      "Process FMEA & Control Plan (RM 13004)",
      "Process Control Methods (RM 13006)",
      "Product Safety, Risk & Configuration Management",
      "NADCAP Readiness & Special Process Pre-Audit",
      "ITAR / EAR Awareness & Export Compliance",
    ],
  },
  {
    title: "Audit programmes",
    blurb: "Independent and second-party audits, and building your own audit capability.",
    items: [
      "Layered Process Audit (LPA) Implementation (CQI-8)",
      "Audit on behalf of the Organization",
      "VDA 6.3 Process Audit",
      "Reverse FMEA",
      "Supplier Evaluation & Performance Monitoring Audits",
      "Supplier QMS Development Audits",
      "Internal Auditor Qualification Program",
    ],
  },
  {
    title: "Quality tools & techniques",
    blurb: "The core methods behind a working quality system.",
    items: [
      "Core Tools Training (APQP, FMEA, MSA, SPC, PPAP, Control Plan)",
      "QFD (Quality Function Deployment)",
      "Design Control & Project Management for Product Development",
      "Special Process Validation Approach",
      "Preparation of Standard Operating Procedures (SOPs)",
      "Six Sigma Green Belt",
    ],
  },
  {
    title: "Regulated sectors",
    blurb: "Medical device and cleanroom requirements.",
    items: [
      "GMP Awareness for Medical Devices (FDA 21 CFR 820)",
      "ISO 14644 Awareness on Cleanrooms",
    ],
  },
  {
    title: "Operational excellence",
    blurb: "Shop-floor practice that makes the system work day to day.",
    items: [
      "Kaizen",
      "QC Circle Activity",
      "Process Built-in Quality",
      "Event Type Problem Solving",
      "Daily Work Management",
      "Abnormality Management",
      "Jishuken",
      "KPI Monitoring & Control",
      "Standardized Work",
      "5S Shop Floor Management",
    ],
  },
  {
    title: "People development",
    blurb: "Building capability and leadership in your teams.",
    items: ["Multi Skill Development", "Servant Leadership Team Building Program"],
  },
];

/** Flat list of every service name, for selection controls and validation. */
export const PROGRAMME_OPTIONS: string[] = [
  ...TRAINING_PROGRAMMES.flatMap((group) => group.items),
  "Other / not listed",
];

export const PROGRAMME_HEADLINE = "Our 90+ consulting & training programmes";

/**
 * Delivery mode for a requested programme.
 *  - OPEN_HOUSE: attendees join a scheduled session at an ENN venue.
 *  - ON_SITE:    ENN delivers the programme at the client's own premises.
 */
export type TrainingMode = "OPEN_HOUSE" | "ON_SITE";

export const TRAINING_MODE_LABEL: Record<TrainingMode, string> = {
  OPEN_HOUSE: "Open House",
  ON_SITE: "On-site (at our premises)",
};

export const TRAINING_MODE_DESCRIPTION: Record<TrainingMode, string> = {
  OPEN_HOUSE:
    "Your team joins a scheduled session at an ENN Consultancy venue, alongside delegates from other organisations.",
  ON_SITE: "We come to you and deliver the programme at your own site, for your team only.",
};

/**
 * ENN delivers training in person only. Stated wherever someone is about to
 * choose or request a session.
 */
export const DELIVERY_NOTICE =
  "All ENN Consultancy sessions are delivered in person. We do not run online sessions.";
