/**
 * Successor Knowledge Model - Schema Contract (v1.0.0)
 *
 * This is the data contract frozen at Stage 1. Changes after the Stage 1
 * gate require a logged entry in 00-control/DECISIONS.md.
 *
 * Design notes:
 * - Every entity is first-class and carries source attribution, a
 *   confidence level, and created/updated timestamps.
 * - The schema is subject-neutral where possible (KnowledgeModel.subjectRole)
 *   so Role DNA and Successor can share this package. An owner is one role.
 * - Credentials are never stored. SystemEntity captures only where access
 *   exists and who holds it.
 */

export const SCHEMA_VERSION = '1.0.0';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type SourceKind = 'interview' | 'document' | 'inferred';

/** Where a piece of knowledge came from. An entity may have several. */
export interface SourceRef {
  kind: SourceKind;
  /** Interview session id, when kind = 'interview'. */
  sessionId?: string;
  /** Document id, when kind = 'document'. */
  documentId?: string;
  /** Human-readable pointer, e.g. "Track 1, answer 4" or "vendor-list.xlsx row 12". */
  detail?: string;
  /** ISO 8601 timestamp of capture. */
  capturedAt: string;
}

export type EntityType =
  | 'fact'
  | 'process'
  | 'relationship'
  | 'decision'
  | 'judgment'
  | 'history'
  | 'system'
  | 'commitment'
  | 'risk'
  | 'gap';

/** Fields shared by every entity in the model. */
export interface EntityBase {
  id: string;
  type: EntityType;
  confidence: ConfidenceLevel;
  sources: SourceRef[];
  /** ISO 8601. */
  createdAt: string;
  /** ISO 8601. */
  updatedAt: string;
  /** True when the owner has confirmed this item as accurate. */
  verified: boolean;
}

/** Discrete knowledge statement. */
export interface FactEntity extends EntityBase {
  type: 'fact';
  statement: string;
  topic?: string;
}

export interface ProcessStep {
  order: number;
  description: string;
}

export interface ProcessEntity extends EntityBase {
  type: 'process';
  name: string;
  purpose: string;
  /** e.g. "daily", "weekly", "monthly", "annually", "as needed". */
  frequency: string;
  steps: ProcessStep[];
  dependencies: string[];
  failurePoints: string[];
  /** Names or relationship/person references of others who know this process. */
  whoElseKnows: string[];
}

export type RelationshipCategory =
  | 'customer'
  | 'vendor'
  | 'banker'
  | 'landlord'
  | 'employee'
  | 'advisor'
  | 'other';

export type TransferPlanStatus =
  | 'not-started'
  | 'planned'
  | 'in-progress'
  | 'transferred'
  | 'will-not-transfer';

export interface RelationshipEntity extends EntityBase {
  type: 'relationship';
  who: string;
  category: RelationshipCategory;
  whyTheyMatter: string;
  history: string;
  whatTheyExpect: string;
  transferRisk: 'high' | 'medium' | 'low';
  transferPlanStatus: TransferPlanStatus;
}

export interface DecisionExample {
  situation: string;
  whatWasDecided: string;
  outcome?: string;
}

/** A recurring decision type and how the owner really makes it. */
export interface DecisionEntity extends EntityBase {
  type: 'decision';
  name: string;
  howDecided: string;
  realCriteria: string[];
  /** e.g. "Any purchase over $10k gets slept on for a week." */
  thresholds: string[];
  examples: DecisionExample[];
}

/** Heuristics and instincts - the tacit layer. */
export interface JudgmentEntity extends EntityBase {
  type: 'judgment';
  /** "When a customer does X, it means Y." */
  heuristic: string;
  context?: string;
}

export interface HistoryEntity extends EntityBase {
  type: 'history';
  whatHappened: string;
  /** Approximate period, free text: "2011", "around 2015-2016". */
  when: string;
  whatWasLearned: string;
}

export interface SystemEntity extends EntityBase {
  type: 'system';
  name: string;
  /** 'software' | 'account' | 'physical' - free text allowed for edge cases. */
  kind: string;
  whatItDoes: string;
  /** Where credentials/access live and who holds them. NEVER the credentials themselves. */
  accessHeldBy: string;
  quirks: string[];
}

export interface CommitmentEntity extends EntityBase {
  type: 'commitment';
  withWhom: string;
  whatWasPromised: string;
  /** 'owed-by-business' | 'owed-to-business' - free text allowed. */
  direction: string;
  writtenDown: boolean;
}

export interface RiskEntity extends EntityBase {
  type: 'risk';
  description: string;
  /** What breaks if this risk lands. */
  impact: string;
  /** e.g. "single point of failure", "relationship", "knowledge". */
  riskKind: string;
  mitigation?: string;
}

export type GapStatus = 'open' | 'queued' | 'resolved';

/** An open question the system has detected and not yet resolved. */
export interface GapEntity extends EntityBase {
  type: 'gap';
  question: string;
  /** Why the system is asking - what triggered the gap. */
  raisedBecause: string;
  status: GapStatus;
  /** Entity ids this gap relates to. */
  relatedIds: string[];
}

export type AnyEntity =
  | FactEntity
  | ProcessEntity
  | RelationshipEntity
  | DecisionEntity
  | JudgmentEntity
  | HistoryEntity
  | SystemEntity
  | CommitmentEntity
  | RiskEntity
  | GapEntity;

/** Business/owner profile - identification only, no captured knowledge. */
export interface ProjectProfile {
  businessName: string;
  ownerName: string;
  industry?: string;
  employeeCount?: string;
  plannedExitWindow?: string;
}

export interface KnowledgeModel {
  schemaVersion: string;
  projectId: string;
  /** Which role this model documents. 'owner' for Successor; other roles for Role DNA. */
  subjectRole: string;
  profile: ProjectProfile;
  createdAt: string;
  updatedAt: string;
  entities: {
    facts: FactEntity[];
    processes: ProcessEntity[];
    relationships: RelationshipEntity[];
    decisions: DecisionEntity[];
    judgments: JudgmentEntity[];
    history: HistoryEntity[];
    systems: SystemEntity[];
    commitments: CommitmentEntity[];
    risks: RiskEntity[];
    gaps: GapEntity[];
  };
}

export const COLLECTION_KEYS = [
  'facts',
  'processes',
  'relationships',
  'decisions',
  'judgments',
  'history',
  'systems',
  'commitments',
  'risks',
  'gaps',
] as const;

export type CollectionKey = (typeof COLLECTION_KEYS)[number];
