/** Persisted status. Admins may override; the effective status is derived. */
export type SessionStatus = "OPEN" | "FULL" | "COMPLETED" | "CANCELLED";

/** Status shown to users, derived from stored data + current time. */
export type EffectiveSessionStatus = "OPEN" | "UPCOMING" | "FULL" | "COMPLETED" | "CANCELLED";

export type SessionMode = "ONLINE" | "IN_PERSON" | "HYBRID";

export interface TrainingSession {
  id: string;
  sessionName: string;
  topic: string;
  description: string;
  /** Calendar date in the session's own timezone, "yyyy-MM-dd". */
  date: string;
  /** Wall-clock start/end in the session's timezone, "HH:mm". */
  startTime: string;
  endTime: string;
  timezone: string;
  /** Absolute instants derived from date/time/timezone. ISO 8601 UTC. */
  startAt: string;
  endAt: string;
  location: string;
  mode: SessionMode;
  maximumSeats: number;
  registeredCount: number;
  /** Free sessions skip the payment step entirely. */
  isFree: boolean;
  /** Whole rupees. Ignored when isFree is true. */
  price: number;
  status: SessionStatus;
  /** Optional ISO instant after which registration closes. */
  registrationDeadline: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RegistrationStatus = "CONFIRMED" | "CANCELLED";

/**
 * NOT_REQUIRED for free sessions; PENDING once a paid registrant has submitted
 * their payment reference; CONFIRMED once an administrator has reconciled it
 * against the bank statement.
 */
export type PaymentStatus = "NOT_REQUIRED" | "PENDING" | "CONFIRMED";
export type AttendanceStatus = "PENDING" | "ATTENDED" | "NO_SHOW";

export interface Registration {
  id: string;
  sessionId: string;
  registrationReference: string;
  fullName: string;
  companyName: string;
  designation: string;
  /** Normalised E.164, e.g. "+919876543210". */
  phoneNumber: string;
  whatsappAvailable: boolean;
  whatsappNumber: string;
  /** Lower-cased, trimmed. Used for duplicate detection. */
  email: string;
  registrationStatus: RegistrationStatus;
  attendanceStatus: AttendanceStatus;
  paymentStatus: PaymentStatus;
  /** UPI / UTR reference supplied by the registrant. Empty when free. */
  paymentReference: string;
  /** Amount owed in whole rupees at the time of registering. */
  amountDue: number;
  notes: string;
  registeredAt: string;
  updatedAt: string;
}

export interface CreateSessionInput {
  sessionName: string;
  topic: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  location: string;
  mode: SessionMode;
  maximumSeats: number;
  isFree: boolean;
  price: number;
  registrationDeadline: string | null;
  isActive: boolean;
  status?: SessionStatus;
  /**
   * Attendance for an imported historical session. Deliberately absent from the
   * admin validation schema, so it can only be set by a data import and never
   * by an administrator typing a number that contradicts the actual records.
   */
  registeredCount?: number;
}

/**
 * A historical registration being imported from an external source (for example
 * a Google Form export), rather than created through the public flow. Carries
 * its own original timestamp.
 */
export interface ImportRegistrationRow {
  fullName: string;
  companyName: string;
  designation: string;
  phoneNumber: string;
  whatsappAvailable: boolean;
  whatsappNumber: string;
  email: string;
  registeredAt: string;
  notes?: string;
}

export interface RegistrationInput {
  sessionId: string;
  fullName: string;
  companyName: string;
  designation: string;
  phoneNumber: string;
  whatsappAvailable: boolean;
  whatsappNumber?: string;
  email: string;
  /** UPI / UTR reference. Supplied only for paid sessions. */
  paymentReference?: string;
}

export type InHouseRequestStatus = "PENDING" | "PLANNING" | "ACCEPTED" | "REJECTED";

/**
 * A request to run a programme at the client's own premises, rather than
 * booking a seat at a scheduled session. Consumes no seats.
 */
export interface InHouseRequest {
  id: string;
  requestReference: string;
  fullName: string;
  companyName: string;
  designation: string;
  phoneNumber: string;
  whatsappAvailable: boolean;
  whatsappNumber: string;
  email: string;
  programmes: string[];
  /** OPEN_HOUSE joins a scheduled session; ON_SITE is delivered at the client. */
  trainingMode: "OPEN_HOUSE" | "ON_SITE";
  participants: number;
  preferredTimeframe: string;
  /** Company / site name. Collected only for ON_SITE. */
  venueName: string;
  /** Full address. Collected only for ON_SITE. */
  venueAddress: string;
  venueCity: string;
  notes: string;
  status: InHouseRequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InHouseRequestInput {
  fullName: string;
  companyName: string;
  designation: string;
  phoneNumber: string;
  whatsappAvailable: boolean;
  whatsappNumber?: string;
  email: string;
  programmes: string[];
  trainingMode: "OPEN_HOUSE" | "ON_SITE";
  participants: number;
  preferredTimeframe: string;
  venueName?: string;
  venueAddress?: string;
  venueCity: string;
  notes?: string;
}

/**
 * The persistence port. Both the Firestore adapter and the local development
 * adapter implement this identically, so business logic never branches on
 * which database is in use.
 */
export interface SessionStore {
  readonly name: "firestore" | "local";
  listSessions(): Promise<TrainingSession[]>;
  getSession(id: string): Promise<TrainingSession | null>;
  createSession(input: CreateSessionInput): Promise<TrainingSession>;
  updateSession(id: string, patch: Partial<CreateSessionInput>): Promise<TrainingSession>;
  deleteSession(id: string): Promise<void>;
  listRegistrations(filter?: { sessionId?: string }): Promise<Registration[]>;
  /**
   * Atomically: re-validate the session, reject duplicates, claim one seat,
   * allocate a reference and create the registration. Must be safe against
   * concurrent callers competing for the final seat.
   */
  registerAtomically(input: RegistrationInput, now: Date): Promise<Registration>;
  /**
   * Bulk-import historical registrations against an existing session, bypassing
   * the public registration flow (which would rightly refuse a completed
   * session). Allocates references, records uniqueness keys, and sets the
   * session's registered count. Intended for data migration only.
   */
  importRegistrations(sessionId: string, rows: ImportRegistrationRow[]): Promise<Registration[]>;
  /**
   * Remove a registration and return its seat to the session.
   *
   * Must be atomic: the seat count decrement, the uniqueness-key release (so
   * the person can register again) and the record removal have to succeed or
   * fail together, and a session that was FULL becomes OPEN again.
   */
  deleteRegistration(registrationId: string, now: Date): Promise<Registration>;
  /**
   * Mark a paid registration's payment as verified (or back to pending).
   * Returns the updated record so a confirmation can be emailed.
   */
  setPaymentStatus(
    registrationId: string,
    status: PaymentStatus,
    now: Date,
  ): Promise<Registration>;
  /** Record an on-site training request. Allocates its own reference series. */
  createInHouseRequest(input: InHouseRequestInput, now: Date): Promise<InHouseRequest>;
  listInHouseRequests(): Promise<InHouseRequest[]>;
  updateInHouseRequestStatus(
    requestId: string,
    status: InHouseRequestStatus,
    now: Date,
  ): Promise<InHouseRequest>;
  /** Every distinct address we hold, for announcement mailings. */
  listContactEmails(): Promise<{ email: string; fullName: string }[]>;
  /** Test/seed support. */
  reset(sessions: CreateSessionInput[], counts?: Record<string, number>): Promise<void>;
}
