# AI-Ready Knowledge Export

Hartwell Machine & Tool (FIXTURE - not a real company) · prepared from the words of Ray Hartwell (fictional)

Version 1 · generated 7/11/2026

*This package documents operating knowledge only. It is not financial, tax, legal, or estate planning advice. Work with your CPA, attorney, and exit planner for those matters.*

---

The complete knowledge model in structured JSON, for future AI enablement. This is the same lossless format the app exports and imports.

```json
{
  "schemaVersion": "1.0.0",
  "projectId": "fixture-hartwell",
  "subjectRole": "owner",
  "profile": {
    "businessName": "Hartwell Machine & Tool (FIXTURE - not a real company)",
    "ownerName": "Ray Hartwell (fictional)",
    "industry": "Precision machining",
    "employeeCount": "22",
    "plannedExitWindow": "3-5 years"
  },
  "createdAt": "2026-07-10T12:00:00.000Z",
  "updatedAt": "2026-07-11T01:11:47.541Z",
  "entities": {
    "facts": [
      {
        "id": "fact_0001",
        "type": "fact",
        "confidence": "high",
        "sources": [
          {
            "kind": "interview",
            "sessionId": "fixture-session-1",
            "detail": "Track 1, answer 2",
            "capturedAt": "2026-07-10T12:00:00.000Z"
          }
        ],
        "createdAt": "2026-07-10T12:00:00.000Z",
        "updatedAt": "2026-07-10T12:00:00.000Z",
        "verified": true,
        "statement": "Ray personally opens the shop at 6:30am and does the first machine walk-through.",
        "topic": "daily routine"
      },
      {
        "id": "fact_0002",
        "type": "fact",
        "confidence": "medium",
        "sources": [
          {
            "kind": "interview",
            "sessionId": "fixture-session-1",
            "detail": "Track 2, answer 5",
            "capturedAt": "2026-07-10T12:00:00.000Z"
          }
        ],
        "createdAt": "2026-07-10T12:00:00.000Z",
        "updatedAt": "2026-07-10T12:00:00.000Z",
        "verified": false,
        "statement": "Roughly 40% of revenue comes from three aerospace customers.",
        "topic": "revenue concentration"
      },
      {
        "id": "fact_e5fae5c7",
        "type": "fact",
        "confidence": "high",
        "sources": [
          {
            "kind": "interview",
            "sessionId": "sess_fix",
            "detail": "Track 1 (daily), answer 1",
            "capturedAt": "2026-07-11T01:11:47.539Z"
          }
        ],
        "createdAt": "2026-07-11T01:11:47.539Z",
        "updatedAt": "2026-07-11T01:11:47.539Z",
        "verified": false,
        "statement": "I get in at 6:30, walk the floor, and check every machine that ran overnight before the crew arrives.",
        "topic": "track-1:daily"
      },
      {
        "id": "fact_abe728a5",
        "type": "fact",
        "confidence": "high",
        "sources": [
          {
            "kind": "interview",
            "sessionId": "sess_fix",
            "detail": "Track 1 (weekly), answer 2",
            "capturedAt": "2026-07-11T01:11:47.541Z"
          }
        ],
        "createdAt": "2026-07-11T01:11:47.541Z",
        "updatedAt": "2026-07-11T01:11:47.541Z",
        "verified": false,
        "statement": "Insurance renews every March and the big customer audits land in the fall.",
        "topic": "track-1:weekly"
      },
      {
        "id": "fact_29edfc80",
        "type": "fact",
        "confidence": "high",
        "sources": [
          {
            "kind": "interview",
            "sessionId": "sess_fix",
            "detail": "Track 8 (advice), answer 3",
            "capturedAt": "2026-07-11T01:11:47.541Z"
          }
        ],
        "createdAt": "2026-07-11T01:11:47.541Z",
        "updatedAt": "2026-07-11T01:11:47.541Z",
        "verified": false,
        "statement": "Call the bank first, then the two biggest customers, in that order, in the first week.",
        "topic": "track-8:advice"
      }
    ],
    "processes": [
      {
        "id": "proc_0001",
        "type": "process",
        "confidence": "high",
        "sources": [
          {
            "kind": "interview",
            "sessionId": "fixture-session-1",
            "detail": "Track 1, answer 6",
            "capturedAt": "2026-07-10T12:00:00.000Z"
          }
        ],
        "createdAt": "2026-07-10T12:00:00.000Z",
        "updatedAt": "2026-07-10T12:00:00.000Z",
        "verified": false,
        "name": "Monthly quote review",
        "purpose": "Catch underpriced jobs before they ship",
        "frequency": "monthly",
        "steps": [
          {
            "order": 1,
            "description": "Pull all quotes over $5,000 from the last month"
          },
          {
            "order": 2,
            "description": "Compare quoted hours to actual machine hours"
          },
          {
            "order": 3,
            "description": "Flag any job that ran 15% over quote for repricing"
          }
        ],
        "dependencies": [
          "JobBoss reports",
          "machine hour logs"
        ],
        "failurePoints": [
          "Machine hour logs are only reliable if operators clock jobs correctly"
        ],
        "whoElseKnows": [
          "Denise (office manager) can pull the reports but does not do the comparison"
        ]
      }
    ],
    "relationships": [
      {
        "id": "rel_0001",
        "type": "relationship",
        "confidence": "high",
        "sources": [
          {
            "kind": "interview",
            "sessionId": "fixture-session-1",
            "detail": "Track 3, answer 1",
            "capturedAt": "2026-07-10T12:00:00.000Z"
          }
        ],
        "createdAt": "2026-07-10T12:00:00.000Z",
        "updatedAt": "2026-07-10T12:00:00.000Z",
        "verified": true,
        "who": "Tom Vasquez, Apex Aerospace purchasing",
        "category": "customer",
        "whyTheyMatter": "Largest single customer, about 18% of revenue",
        "history": "Relationship began 2009 when Ray fixed a failed part run over a weekend",
        "whatTheyExpect": "Direct call from Ray on any delivery slip, no surprises",
        "transferRisk": "high",
        "transferPlanStatus": "not-started"
      },
      {
        "id": "rel_0002",
        "type": "relationship",
        "confidence": "medium",
        "sources": [
          {
            "kind": "document",
            "documentId": "doc-vendor-list",
            "detail": "row 4",
            "capturedAt": "2026-07-10T12:00:00.000Z"
          }
        ],
        "createdAt": "2026-07-10T12:00:00.000Z",
        "updatedAt": "2026-07-10T12:00:00.000Z",
        "verified": false,
        "who": "First Community Bank, Lisa Chen",
        "category": "banker",
        "whyTheyMatter": "Holds the line of credit; extended terms during 2020 on a phone call",
        "history": "Bank relationship since 1998, Lisa since 2018",
        "whatTheyExpect": "Quarterly coffee, honest numbers early when a quarter looks soft",
        "transferRisk": "medium",
        "transferPlanStatus": "planned"
      }
    ],
    "decisions": [
      {
        "id": "dec_0001",
        "type": "decision",
        "confidence": "medium",
        "sources": [
          {
            "kind": "interview",
            "sessionId": "fixture-session-1",
            "detail": "Track 5, answer 3",
            "capturedAt": "2026-07-10T12:00:00.000Z"
          }
        ],
        "createdAt": "2026-07-10T12:00:00.000Z",
        "updatedAt": "2026-07-10T12:00:00.000Z",
        "verified": false,
        "name": "Taking on a new customer",
        "howDecided": "Ray gut-checks whether they will pay in 45 days and whether their engineers answer the phone",
        "realCriteria": [
          "Payment history via industry contacts",
          "Engineering accessibility",
          "No reverse-auction buyers"
        ],
        "thresholds": [
          "Any first order over $25k requires 50% deposit"
        ],
        "examples": [
          {
            "situation": "A 2019 prospect with a big first order and a reverse-auction portal",
            "whatWasDecided": "Declined the work",
            "outcome": "Competitor took it and reportedly lost money on the account"
          }
        ]
      }
    ],
    "judgments": [
      {
        "id": "jud_0001",
        "type": "judgment",
        "confidence": "low",
        "sources": [
          {
            "kind": "interview",
            "sessionId": "fixture-session-1",
            "detail": "Track 5, answer 7",
            "capturedAt": "2026-07-10T12:00:00.000Z"
          }
        ],
        "createdAt": "2026-07-10T12:00:00.000Z",
        "updatedAt": "2026-07-10T12:00:00.000Z",
        "verified": false,
        "heuristic": "When a customer starts asking for cost breakdowns, they are shopping the work.",
        "context": "Signals it is time to call the relationship contact directly"
      }
    ],
    "history": [
      {
        "id": "his_0001",
        "type": "history",
        "confidence": "high",
        "sources": [
          {
            "kind": "interview",
            "sessionId": "fixture-session-1",
            "detail": "Track 6, answer 2",
            "capturedAt": "2026-07-10T12:00:00.000Z"
          }
        ],
        "createdAt": "2026-07-10T12:00:00.000Z",
        "updatedAt": "2026-07-10T12:00:00.000Z",
        "verified": true,
        "whatHappened": "Tried a second shift in 2011; quality problems erased the margin within six months",
        "when": "2011",
        "whatWasLearned": "Do not add a shift without a dedicated quality lead on that shift"
      }
    ],
    "systems": [
      {
        "id": "sys_0001",
        "type": "system",
        "confidence": "high",
        "sources": [
          {
            "kind": "interview",
            "sessionId": "fixture-session-1",
            "detail": "Track 1, answer 9",
            "capturedAt": "2026-07-10T12:00:00.000Z"
          }
        ],
        "createdAt": "2026-07-10T12:00:00.000Z",
        "updatedAt": "2026-07-10T12:00:00.000Z",
        "verified": false,
        "name": "JobBoss",
        "kind": "software",
        "whatItDoes": "Job costing, scheduling, and quoting",
        "accessHeldBy": "Admin login held by Ray and Denise; vendor support contract renews in March",
        "quirks": [
          "Custom report templates live only on the front-office PC"
        ]
      }
    ],
    "commitments": [
      {
        "id": "com_0001",
        "type": "commitment",
        "confidence": "medium",
        "sources": [
          {
            "kind": "interview",
            "sessionId": "fixture-session-1",
            "detail": "Track 3, answer 8",
            "capturedAt": "2026-07-10T12:00:00.000Z"
          }
        ],
        "createdAt": "2026-07-10T12:00:00.000Z",
        "updatedAt": "2026-07-10T12:00:00.000Z",
        "verified": false,
        "withWhom": "Gary (retired employee)",
        "whatWasPromised": "Gary can use the shop on Saturdays for personal projects, indefinitely",
        "direction": "owed-by-business",
        "writtenDown": false
      }
    ],
    "risks": [
      {
        "id": "risk_0001",
        "type": "risk",
        "confidence": "high",
        "sources": [
          {
            "kind": "interview",
            "sessionId": "fixture-session-1",
            "detail": "Track 7, answer 1",
            "capturedAt": "2026-07-10T12:00:00.000Z"
          }
        ],
        "createdAt": "2026-07-10T12:00:00.000Z",
        "updatedAt": "2026-07-10T12:00:00.000Z",
        "verified": false,
        "description": "Only Ray knows the full Apex Aerospace relationship and pricing history",
        "impact": "Losing Apex after transition would remove roughly 18% of revenue",
        "riskKind": "single point of failure",
        "mitigation": "Introduce successor to Tom Vasquez at least a year before exit"
      }
    ],
    "gaps": [
      {
        "id": "gap_0001",
        "type": "gap",
        "confidence": "high",
        "sources": [
          {
            "kind": "inferred",
            "detail": "Owner referenced \"the Meridian situation\" without explanation (Track 2, answer 5)",
            "capturedAt": "2026-07-10T12:00:00.000Z"
          }
        ],
        "createdAt": "2026-07-10T12:00:00.000Z",
        "updatedAt": "2026-07-10T12:00:00.000Z",
        "verified": false,
        "question": "What is \"the Meridian situation\" mentioned when discussing customer concentration?",
        "raisedBecause": "Referenced but never explained in interview",
        "status": "open",
        "relatedIds": [
          "fact_0002"
        ]
      }
    ]
  }
}
```