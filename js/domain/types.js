// types.js — shared JSDoc typedefs for the record shape and its analysis output.
// No runtime code: this is the type layer for `tsc --checkJs` (zero build step) and for
// editor tooling. The incident object is ~40 fields across 8 sub-objects flowing through
// capture → model → rules → integrity → export; naming that shape once is what turns a
// mistyped field id (the class of bug the audit found) into a caught error.

/**
 * @typedef {Object} Meal
 * @property {string} start  'HH:MM'
 * @property {string} end    'HH:MM'
 * @property {boolean} [interrupted]
 * @property {string} [interruptedBy]
 * @property {string} [detail]
 * @property {boolean} [onCall]
 * @property {boolean|null} [relievedOfDuty]
 * @property {boolean|null} [taken]
 * @property {boolean} [waived]
 * @property {''|'yes'|'no'} [writtenAgreement]
 */

/**
 * @typedef {Object} SecondMeal
 * @property {string} start
 * @property {string} end
 * @property {boolean|null} [taken]
 * @property {boolean} [waived]
 */

/**
 * @typedef {Object} Rest
 * @property {number|null} [taken]
 * @property {boolean} [interrupted]
 * @property {boolean} [onCall]
 */

/**
 * @typedef {Object} OffClock
 * @property {string} start
 * @property {string} end
 * @property {string} [task]
 * @property {string} [directedBy]
 * @property {string} [knownBy]
 * @property {string} [payPeriod]
 * @property {string} [expectedPay]
 * @property {boolean|null} [employerEdited]
 */

/**
 * @typedef {Object} Notice
 * @property {string} to
 * @property {string} channel
 * @property {string} response
 * @property {string} adverseAction
 */

/**
 * @typedef {Object} Classification
 * @property {''|'hourly'|'commission'|'salary_exempt'} [payType]
 * @property {''|'yes'|'no'} [awsElection]
 * @property {''|'yes'|'no'} [cbaCovered]
 */

/**
 * @typedef {Object} FinalPay
 * @property {''|'fired'|'quit_notice'|'quit_no_notice'} [separation]
 * @property {string} [lastDay]   'YYYY-MM-DD'
 * @property {string} [datePaid]  'YYYY-MM-DD'
 * @property {boolean|null} [fullyPaid]
 */

/**
 * The shift as scheduled, for the reporting-time comparison (IWC Wage Orders §5).
 * @typedef {Object} Schedule
 * @property {string} [scheduledStart]  'HH:MM'
 * @property {string} [scheduledEnd]    'HH:MM'
 * @property {string} [sentHomeBy]
 * @property {string} [reason]          in the words it was given
 */

/**
 * A necessary work expense the worker paid for (Lab. Code §2802). `amount` stays a string:
 * it is the worker's own number, and the app never computes what is owed from it.
 * @typedef {Object} Expense
 * @property {string} [item]
 * @property {string} [amount]
 * @property {string} [paidOn]    'YYYY-MM-DD'
 * @property {string} [askedOn]   'YYYY-MM-DD'
 * @property {boolean|null} [reimbursed]
 * @property {string} [response]
 */

/**
 * @typedef {Object} GeoLoc
 * @property {number} lat
 * @property {number} lng
 * @property {number} accuracy
 * @property {string} at
 */

/**
 * @typedef {Object} Attachment
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {number} size
 * @property {string} [addedAt]
 * @property {string} [sha256]
 * @property {Blob} [blob]
 * @property {string} [dataUrl]
 */

/**
 * A factual flag produced by a jurisdiction's `analyze()`. Never a dollar amount or a verdict.
 * @typedef {Object} Flag
 * @property {string} key
 * @property {*} value
 * @property {string} [note]
 */

/**
 * @typedef {Object} EditChange
 * @property {string} field
 * @property {*} from
 * @property {*} to
 */

/**
 * @typedef {Object} EditEntry
 * @property {string} at
 * @property {string} note
 * @property {EditChange[]} changes
 */

/**
 * The full incident record.
 * @typedef {Object} Incident
 * @property {string} id
 * @property {number} schemaVersion
 * @property {string} createdAt
 * @property {string} capturedTz
 * @property {string} jurisdiction   'CA' | 'NY' | …
 * @property {string} incidentDate   'YYYY-MM-DD' — the date the shift STARTED
 * @property {string} workplace
 * @property {GeoLoc|null} location
 * @property {string} clockIn
 * @property {string} clockOut
 * @property {string[]} types
 * @property {Classification} classification
 * @property {Meal} meal
 * @property {SecondMeal} meal2
 * @property {Rest} rest
 * @property {OffClock} offClock
 * @property {Notice} notice
 * @property {FinalPay} finalPay
 * @property {Schedule} schedule
 * @property {Expense} expense
 * @property {string} witnesses
 * @property {string} narrative
 * @property {Attachment[]} attachments
 * @property {boolean} deleted
 * @property {string} deletedAt
 * @property {string} deleteReason
 * @property {EditEntry[]} editLog
 * @property {string} contentHash
 * @property {string} recordHash
 * @property {string} sealedAt
 * @property {number} [sealVersion]
 * @property {Flag[]} [flags]
 */

export {};
