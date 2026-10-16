/* Clause library – Jennifer Heath's 2026 engagement-letter wording.
   The shared clauses are taken word for word from her 2026 samples (SFR DOD, Parent-Child, Trust).
   Each assignment type keeps its own title, intended use, effective date, type of value and assumptions.
   {placeholders} are filled from the form; blank values print as a line to fill by hand. */

const APPRAISER = {
  name: 'Jennifer L. Heath, SRA, AI-RRS', sigName: 'Jennifer L Heath, SRA, AI-RRS', company: 'Jennifer Heath, LLC',
  addr1: '5662 Calle Real PNB #103', addr2: 'Goleta, CA  93117', phone: '(805) 689-9809', email: 'jennifer@sbappraiser.com',
};

const TREAS_FMV_FULL = 'The fair market value is the price at which the property would change hands between a willing buyer and a willing seller, neither being under any compulsion to buy or to sell and both having reasonable knowledge of relevant facts. The fair market value of a particular item of property includible in the decedent’s gross estate is not to be determined by a forced sale price. Nor is the fair market value of an item of property the sale price in a market other than that in which such item is most commonly sold to the public, taking into account the location of the item wherever appropriate.';
const EA_RETRO = 'The appraisal is developed under the extraordinary assumption that the property’s condition as observed at inspection is substantially similar to its condition as of the effective date, unless otherwise stated. If this assumption is found to be false, the assignment results may be affected.';
const DOD_DATE = ['Date of Death: {dod}, which is the date of death of {decedent}.', 'The opinion of value reflects market conditions and property characteristics known or knowable as of this date.'];

const TYPES = {
  dod: {
    label: 'Date of death – estate tax / stepped-up basis', retro: true, valueWord: 'Fair Market Value',
    title: 'RETROSPECTIVE APPRAISAL ENGAGEMENT LETTER', subtitle: 'Date of Death / Estate & Tax Reporting',
    intendedUse: ['The appraisal is intended to develop a retrospective opinion of Fair Market Value as of the specified effective date (date of death) for federal estate tax, stepped-up basis, and related federal and California income-tax reporting purposes under Internal Revenue Code §1014. No other use is intended. The assignment results are developed solely for the stated intended use and intended user.'],
    effective: DOD_DATE,
    typeOfValue: ['Fair Market Value, as defined in Treasury Regulation §20.2031-1(b):', TREAS_FMV_FULL],
    ea: EA_RETRO, hc: 'None at the time of engagement.',
    deliveryDefault: '2 weeks',
  },
  parentChild: {
    label: 'Date of death – parent-child reassessment (property tax)', retro: true, valueWord: 'Fair Market Value',
    title: 'RETROSPECTIVE APPRAISAL ENGAGEMENT LETTER', subtitle: 'Date of Death / Parent-Child Reassessment',
    intendedUse: ['The appraisal is intended to develop a retrospective opinion of Fair Market Value as of the specified effective date for county assessor review in connection with a parent-child reassessment matter and related California property tax purposes. No other use is intended.',
      'The Client may retain this report as part of their records. Questions regarding future tax basis, gain recognition, estate administration, or other tax consequences should be directed to qualified legal or tax advisors. Such matters are outside the scope of this appraisal.'],
    effective: DOD_DATE,
    typeOfValue: ['Fair Market Value: For purposes of this assignment, Fair Market Value is intended to be consistent with the California property tax concept of market value / full cash value, generally interpreted as the amount in cash, or terms equivalent to cash, for which the subject property would have sold on the open market as of the effective date after reasonable exposure, with both buyer and seller acting prudently and knowledgeably, and neither being under undue duress.',
      'This appraisal develops a retrospective opinion of value as of the stated effective date based upon market conditions, market participant behavior, and information that was known or reasonably knowable as of that date. Determination of reassessment status, exclusions, taxable value calculations, filing eligibility, or legal entitlement under applicable law is outside the scope of this appraisal and reserved to the appropriate governmental authority.'],
    ea: EA_RETRO, hc: 'None at the time of engagement.',
    deliveryDefault: '2 weeks',
  },
  trust: {
    label: 'Trust administration / distribution – current value', retro: false, valueWord: 'Fair Market Value',
    title: 'CURRENT MARKET VALUE APPRAISAL ENGAGEMENT LETTER', subtitle: 'Trust Administration / Distribution (Dispersal)',
    intendedUse: ['The appraisal is intended to develop a current opinion of Fair Market Value for purposes of trust administration and equitable distribution (dispersal) of assets. The appraisal may also be used by the Client and their advisors for related financial or tax planning purposes, if applicable. No other use is intended. The assignment results are developed solely for the stated intended use and intended user.'],
    effective: ['The effective date of value will be the date of inspection unless otherwise agreed in writing. The opinion of value reflects market conditions and property characteristics as of the effective date only.'],
    typeOfValue: ['Fair Market Value, as defined in Treasury Regulation §20.2031-1(b):', 'The fair market value is the price at which the property would change hands between a willing buyer and a willing seller, neither being under any compulsion to buy or to sell and both having reasonable knowledge of relevant facts. The fair market value is not determined by a forced sale price and assumes exposure in the appropriate market.'],
    ea: 'None at the time of engagement, unless otherwise stated in the report.', hc: 'None at the time of engagement.',
    standardsExtra: 'If this appraisal is used in connection with federal tax reporting, including but not limited to trust or estate-related filings, it is intended to meet the requirements of a “qualified appraisal” prepared by a “qualified appraiser,” as defined under applicable Internal Revenue Service regulations, including Treasury Regulation §1.170A-17 and related provisions. This statement is included solely for compliance purposes where applicable and does not expand the intended use or intended user identified herein.',
    extraSection: ['INTEREST VALUATION CLARIFICATION (TRUST DISTRIBUTION)', 'This appraisal develops an opinion of the market value of the fee simple interest in the subject property as a whole. The assignment does not include valuation of fractional, partial, or undivided interests unless specifically agreed to in writing. Any allocation of value among multiple beneficiaries, ownership interests, or trust shares is outside the scope of this appraisal and should be determined by the Client and their legal or financial advisors.'],
    deliveryDefault: '2 weeks',
  },
  purchase: {
    label: 'Purchase decision – current market value', retro: false, valueWord: 'Market Value',
    title: 'CURRENT MARKET VALUE APPRAISAL ENGAGEMENT LETTER', subtitle: 'Purchase Decision',
    intendedUse: ['This appraisal is prepared solely for the Client’s internal decision-making purposes in connection with a potential purchase of the subject property. The appraisal is not intended to advocate for any transaction outcome, establish an offering price, predict a final contract price, or guarantee that any party will agree with or rely upon the appraiser’s opinion of value. Market value opinions reflect a point-in-time analysis and may differ from negotiated prices due to motivation, risk tolerance, financing terms, or other transaction-specific factors.'],
    effective: ['The effective date of value will be the date of the personal inspection (site visit). The opinion of value reflects market conditions and property characteristics as of the effective date only.'],
    typeOfValue: ['Market Value, as defined by the Appraisal Institute:', 'Market Value is defined as the most probable price which a property should bring in a competitive and open market under all conditions requisite to a fair sale, with the buyer and seller each acting prudently, knowledgeably, and without compulsion, and assuming the price is not affected by undue stimulus.', 'Implicit in this definition is the assumption that:',
      { list: ['Buyer and seller are typically motivated;', 'Both parties are well informed or well advised and acting in what they consider their own best interests;', 'A reasonable time is allowed for exposure in the open market;', 'Payment is made in cash, in U.S. dollars, or in terms of financial arrangements comparable thereto; and', 'The price represents the normal consideration for the property sold, unaffected by special or creative financing, concessions, or sales terms granted by anyone associated with the sale.'] }],
    ea: 'None known at this time. If any hypothetical conditions or extraordinary assumptions are subsequently required based on information discovered during the inspection or research process, they will be disclosed and discussed in the appraisal report.',
    hc: 'None at the time of engagement.',
    inspectionExtra: 'The Client is strongly encouraged to obtain appropriate expert evaluations prior to entering into any purchase agreement.',
    relianceExtra: 'The Client may, at their discretion, share this appraisal report with other parties for informational purposes only, including but not limited to the property owner, brokers, or advisors. However, no third party is an intended user of this appraisal, and no third party may rely upon this report or any opinions, analyses, or conclusions contained herein for any purpose. Any such reliance by an unintended user is expressly prohibited and shall be at the sole risk of that party.',
    listingDefault: true, deliveryDefault: '10 days',
  },
};


const MV_AI = ['Market Value, as defined by the Appraisal Institute:', 'Market Value is defined as the most probable price which a property should bring in a competitive and open market under all conditions requisite to a fair sale, with the buyer and seller each acting prudently, knowledgeably, and without compulsion, and assuming the price is not affected by undue stimulus.', 'Implicit in this definition is the assumption that:',
  { list: ['Buyer and seller are typically motivated;', 'Both parties are well informed or well advised and acting in what they consider their own best interests;', 'A reasonable time is allowed for exposure in the open market;', 'Payment is made in cash, in U.S. dollars, or in terms of financial arrangements comparable thereto; and', 'The price represents the normal consideration for the property sold, unaffected by special or creative financing, concessions, or sales terms granted by anyone associated with the sale.'] }];
const DIVORCE_USE = [
  'This appraisal is prepared solely for the Client’s internal decision-making and advisory purposes in connection with marital dissolution and related property-division considerations. The intended use is to assist the Client(s) in understanding the subject property’s opinion of market value as of the stated effective date for settlement planning and negotiation purposes only.{jointUse}',
  'This appraisal is not intended to advocate for either party, to determine or compel a specific settlement outcome, or to predict the value that may ultimately be agreed upon by the parties, counsel, mediator, or court. The appraiser does not provide legal advice, and this report is not intended to replace independent legal, tax, or financial counsel.',
  'The opinion of value reflects a point-in-time analysis based on market conditions and assumptions as of the effective date{effParen} and may differ from values used in negotiations or court proceedings due to factors such as motivation, timing, allocation of risk, or other case-specific considerations.'];
const DIVORCE_COMMON = {
  valueWord: 'Market Value', typeOfValue: MV_AI, hc: 'None at the time of engagement.', deliveryDefault: '2 weeks', divorce: true,
  jointUserText: 'Both spouses jointly, as the Clients identified in this Agreement, and no other parties.',
  confidentialityExtra: 'Disclosure of this report by one spouse to the other does not expand intended user status or create reliance rights beyond those expressly stated herein.',
  relianceExtra: 'The Client may, at their discretion, share this appraisal report with other parties for informational purposes only, including but not limited to counsel, mediators, brokers, or advisors. However, no third party is an intended user of this appraisal, and no third party may rely upon this report or any opinions, analyses, or conclusions contained herein for any purpose. Any such reliance by an unintended user is expressly prohibited and shall be at the sole risk of that party.',
  authorization: ['AUTHORIZATION TO ENGAGE APPRAISER ON BEHALF OF BOTH SPOUSES', 'The undersigned spouse represents that they are authorized to engage the Appraiser on behalf of both spouses for purposes of this assignment.'],
};
Object.assign(TYPES, {
  divorce: { ...DIVORCE_COMMON, label: 'Divorce / marital dissolution – current value', retro: false,
    title: 'CURRENT MARKET VALUE APPRAISAL ENGAGEMENT LETTER', subtitle: 'Marital Dissolution / Property Division',
    intendedUse: DIVORCE_USE, effParen: ' (date of site visit)',
    effective: ['The effective date of value will be the date of the personal inspection (site visit). The opinion of value reflects market conditions and property characteristics as of the effective date only.'],
    ea: 'None known at this time. If any hypothetical conditions or extraordinary assumptions are subsequently required based on information discovered during the inspection or research process, they will be disclosed and discussed in the appraisal report.' },
  divorceRetro: { ...DIVORCE_COMMON, label: 'Divorce / marital dissolution – retrospective (e.g., date of separation)', retro: true,
    title: 'RETROSPECTIVE APPRAISAL ENGAGEMENT LETTER', subtitle: 'Marital Dissolution / Property Division',
    intendedUse: DIVORCE_USE, effParen: '',
    dateLabels: ['What the date is', 'Effective date', 'Date of separation'],
    effective: ['{retroWhoCap}: {dod}.', 'The opinion of value reflects market conditions and property characteristics known or knowable as of this date.'],
    ea: EA_RETRO },
  gift: { label: 'Gift – federal gift tax (Form 709)', retro: true, valueWord: 'Fair Market Value',
    title: 'APPRAISAL ENGAGEMENT LETTER', subtitle: 'Gift / Federal Gift Tax Reporting', draft: true,
    dateLabels: ['Donor', 'Date of gift', 'Name of donor'],
    intendedUse: ['The appraisal is intended to develop an opinion of Fair Market Value of the subject property as of the date of the gift, for federal gift tax reporting (IRS Form 709) and related federal and California tax purposes, including the donee’s tax basis. No other use is intended. The assignment results are developed solely for the stated intended use and intended user.'],
    effective: ['Date of Gift: {dod}, the date of the gift of the subject property by {decedent}.', 'The opinion of value reflects market conditions and property characteristics known or knowable as of this date.'],
    typeOfValue: ['Fair Market Value, as defined in Treasury Regulation §25.2512-1:', 'The fair market value is the price at which the property would change hands between a willing buyer and a willing seller, neither being under any compulsion to buy or to sell, and both having reasonable knowledge of relevant facts.'],
    ea: EA_RETRO + ' If the date of gift is the date of inspection or later, this assumption does not apply.', hc: 'None at the time of engagement.',
    standardsExtra: 'The appraisal is intended to meet the requirements for an appraisal by a qualified appraiser for adequate disclosure of a gift under Treasury Regulation §301.6501(c)-1(f)(3), including a description of the property, the valuation method, and the appraiser’s qualifications. This statement does not expand the intended use or intended user identified herein.',
    deliveryDefault: '2 weeks' },
});
TYPES.dod.dateLabels = ['Name of decedent', 'Date of death', 'Name of decedent'];
TYPES.parentChild.dateLabels = ['Name of decedent', 'Date of death', 'Name of decedent'];

/* Court testimony / expert witness terms (from her testimony letter), used instead of the short TESTIMONY clause when switched on. */
const TESTIMONY_FULL = [
  'If the Appraiser is asked to give testimony, be deposed, or prepare or sign a declaration regarding this appraisal, those services are outside the appraisal fee and require payment of the retainer below. They are billed as follows:',
  { list: ['Deposition, court, arbitration or mediation testimony, including preparation, pre- and post-testimony conferences or meetings, and standby time waiting to testify: {tRate} per hour.',
    'Declarations: a minimum review and signing fee of {tDecl} per report. Research required by the Appraiser is billed at {tRate} per hour.',
    'Document preparation and document review at the hourly rate; copies, postage and similar costs at cost.',
    'Travel and, outside Santa Barbara County, lodging, at cost.'] },
  'A retainer of {tRetainer} is required before any expert witness services begin. The retainer is applied to the final invoice for the matter, and any unused portion will be returned within 30 days. Amounts spent from the retainer are non-refundable. Any remaining estimated fees are payable before the first day of hearing, trial, or deposition.',
  'A cancellation fee of {tCancel} applies when a deposition or testimony appointment is cancelled less than 72 hours in advance, in addition to preparation time already spent.',
  'All fees are payable in advance and are not contingent on the outcome, settlement, or withdrawal of the matter. Invoices are due upon receipt. Prompt payment is a condition of this engagement: the Appraiser may stop work if invoices are not paid when due, and to ensure objectivity, testimony will be given only after all outstanding invoices have been paid.',
  'All communications with the Client by phone, email, or in writing before this Agreement is signed and the retainer is paid are preliminary discussions only and do not constitute acceptance of an assignment.'];

TYPES.preListing = { label: 'Pre-listing / possible sale – current market value', retro: false, valueWord: 'Market Value',
  title: 'CURRENT MARKET VALUE APPRAISAL ENGAGEMENT LETTER', subtitle: 'Pre-Listing / Possible Sale',
  intendedUse: ['This appraisal is prepared solely to assist the Client in understanding the current market value of the subject property in connection with a possible listing and sale. The appraisal is not a listing price recommendation, broker price opinion, or marketing analysis. It is not intended to establish a list price, predict a final sale price or marketing time, or guarantee that any buyer will agree with or rely upon the appraiser’s opinion of value. Market value opinions reflect a point-in-time analysis and may differ from negotiated prices due to motivation, marketing strategy, timing, financing terms, or other transaction-specific factors.',
    'This appraisal is not intended for use by any lender, buyer, or other party in connection with a purchase or financing of the subject property.'],
  effective: ['The effective date of value will be the date of the personal inspection (site visit). The opinion of value reflects market conditions and property characteristics as of the effective date only.'],
  typeOfValue: MV_AI,
  ea: 'None known at this time. If any hypothetical conditions or extraordinary assumptions are subsequently required based on information discovered during the inspection or research process, they will be disclosed and discussed in the appraisal report.',
  hc: 'None at the time of engagement.',
  relianceExtra: 'The Client may, at their discretion, share this appraisal report with other parties for informational purposes only, including but not limited to the property owner, listing broker, or advisors. Providing the report to prospective buyers or their agents does not make them intended users. No third party is an intended user of this appraisal, and no third party may rely upon this report or any opinions, analyses, or conclusions contained herein for any purpose. Any such reliance by an unintended user is expressly prohibited and shall be at the sole risk of that party.',
  listingDefault: true, deliveryDefault: '10 days' };

/* ---------- more assignment types (added for lending, construction, tax, donation and other purposes) ---------- */
const MV_FED = ['Market Value, as defined in the federal financial institution appraisal regulations (12 CFR 34.42(h)):', 'Market value means the most probable price which a property should bring in a competitive and open market under all conditions requisite to a fair sale, the buyer and seller each acting prudently and knowledgeably, and assuming the price is not affected by undue stimulus. Implicit in this definition is the consummation of a sale as of a specified date and the passing of title from seller to buyer under conditions whereby:',
  { list: ['Buyer and seller are typically motivated;', 'Both parties are well informed or well advised, and acting in what they consider their own best interests;', 'A reasonable time is allowed for exposure in the open market;', 'Payment is made in terms of cash in U.S. dollars or in terms of financial arrangements comparable thereto; and', 'The price represents the normal consideration for the property sold unaffected by special or creative financing or sales concessions granted by anyone associated with the sale.'] }];
const CA_FCV = ['Fair Market Value (full cash value): For purposes of this assignment, value is intended to be consistent with the California property tax concept of full cash value under Revenue and Taxation Code §110, generally interpreted as the amount in cash, or terms equivalent to cash, for which the subject property would have sold on the open market as of the effective date after reasonable exposure, with both buyer and seller acting prudently and knowledgeably, and neither being under undue duress.',
  'Determination of the assessed value, eligibility for relief, or any other matter reserved to the Assessor or the Assessment Appeals Board is outside the scope of this appraisal.'];
const NONE_KNOWN = 'None known at this time. If any hypothetical conditions or extraordinary assumptions are subsequently required based on information discovered during the inspection or research process, they will be disclosed and discussed in the appraisal report.';
const CURRENT_EFF = ['The effective date of value will be the date of the personal inspection (site visit). The opinion of value reflects market conditions and property characteristics as of the effective date only.'];
const LENDER_RELIANCE = 'The borrower may receive a copy of the appraisal report from the Client as required by law (including the Equal Credit Opportunity Act and Regulation B); receipt of a copy does not make the borrower an intended user, and the borrower may not rely on the report.';
// Lender and AMC orders delivered as UAD 3.6 (URAR). Most come with the client's own engagement letter; this letter is only for when she writes one.
const UAD36 = (kind, what) => ({ retro: false, valueWord: 'Market Value', premise: true, lending: true, uad: true,
  title: 'APPRAISAL ENGAGEMENT LETTER', subtitle: 'Mortgage Finance Transaction – ' + kind.replace(/^./, c => c.toUpperCase()), formatDefault: 'Uniform Residential Appraisal Report (URAR)',
  intendedUse: [`The intended use of the appraisal is for the lender/Client to evaluate the property that is the subject of this appraisal for ${what}, subject to the stated scope of work, purpose of the appraisal, reporting requirements of the appraisal report form, and the definition of market value. No other use is intended.`,
    'The Client represents that this engagement was made in compliance with the appraiser independence requirements of the Truth in Lending Act and Regulation Z (12 CFR 1026.42), and that no party has communicated a target value or the amount of a loan in a way intended to influence the appraisal.'],
  effective: CURRENT_EFF, typeOfValue: MV_FED, ea: NONE_KNOWN, hc: 'None at the time of engagement.', relianceExtra: LENDER_RELIANCE, deliveryDefault: '2 weeks' });
Object.assign(TYPES, {
  lending: { label: 'Lending – private or portfolio mortgage loan', retro: false, valueWord: 'Market Value', premise: true, lending: true,
    title: 'APPRAISAL ENGAGEMENT LETTER', subtitle: 'Mortgage Lending Decision', formatDefault: 'Uniform Residential Appraisal Report (URAR)',
    intendedUse: ['The intended use of the appraisal is to assist the Client, as lender, in evaluating the subject property as collateral for a mortgage lending decision. No other use is intended. This appraisal is not prepared for delivery to Fannie Mae, Freddie Mac, FHA, VA, or USDA unless that is stated in writing in this Agreement.',
      'The Client represents that this engagement was made in compliance with the valuation independence requirements of the Truth in Lending Act and Regulation Z (12 CFR 1026.42), and that no party has communicated a target value or the amount of a loan in a way intended to influence the appraisal.'],
    effective: CURRENT_EFF, typeOfValue: MV_FED, ea: NONE_KNOWN, hc: 'None at the time of engagement.', relianceExtra: LENDER_RELIANCE, deliveryDefault: '2 weeks' },
  construction: { label: 'Construction loan – proposed construction or renovation', retro: false, valueWord: 'Market Value', premise: true, premiseDefault: 'both', lending: true,
    title: 'APPRAISAL ENGAGEMENT LETTER', subtitle: 'Construction Loan / Proposed Improvements', formatDefault: 'Uniform Residential Appraisal Report (URAR)',
    intendedUse: ['The intended use of the appraisal is to assist the Client, as lender, in evaluating the subject property as collateral for a construction loan decision for the proposed improvements described below. No other use is intended. This appraisal is not prepared for delivery to Fannie Mae, Freddie Mac, FHA, VA, or USDA unless that is stated in writing in this Agreement.',
      'The Client represents that this engagement was made in compliance with the valuation independence requirements of the Truth in Lending Act and Regulation Z (12 CFR 1026.42).'],
    effective: CURRENT_EFF, typeOfValue: MV_FED, ea: NONE_KNOWN, hc: 'None at the time of engagement.', relianceExtra: LENDER_RELIANCE, deliveryDefault: '2 weeks' },
  uadPurchase: { ...UAD36('purchase', 'a purchase money mortgage'), label: 'Lender / AMC – Purchase' },
  uadRefi: { ...UAD36('refinance', 'a refinance mortgage'), label: 'Lender / AMC – Refinance' },
  uadHeloc: { ...UAD36('home equity', 'a home equity loan or home equity line of credit (HELOC)'), label: 'Lender / AMC – HELOC / home equity' },
  uadConstruction: { ...UAD36('construction', 'a construction or construction-to-permanent loan for the proposed improvements described below'), label: 'Lender / AMC – Construction loan', premiseDefault: 'complHC' },
  uadOther: { ...UAD36('lending', 'a mortgage lending decision'), label: 'Lender / AMC – Other mortgage lending decision' },
  altValuation: { label: 'Estate – alternate valuation date (IRC §2032)', retro: true, valueWord: 'Fair Market Value',
    title: 'RETROSPECTIVE APPRAISAL ENGAGEMENT LETTER', subtitle: 'Estate Tax / Alternate Valuation Date',
    dateLabels: ['Name of decedent', 'Alternate valuation date', 'Name of decedent'],
    intendedUse: ['The appraisal is intended to develop a retrospective opinion of Fair Market Value as of the alternate valuation date under Internal Revenue Code §2032, generally six months after the date of death, for federal estate tax and related income-tax basis reporting. No other use is intended. The assignment results are developed solely for the stated intended use and intended user. The election and the correct alternate valuation date are matters for the estate’s legal or tax advisors.'],
    effective: ['Alternate valuation date: {dod}, for the estate of {decedent}.', 'The opinion of value reflects market conditions and property characteristics known or knowable as of this date.'],
    typeOfValue: ['Fair Market Value, as defined in Treasury Regulation §20.2031-1(b):', TREAS_FMV_FULL], ea: EA_RETRO, hc: 'None at the time of engagement.', deliveryDefault: '2 weeks' },
  donation: { label: 'Charitable donation – federal income tax (Form 8283)', retro: true, valueWord: 'Fair Market Value', draft: true,
    title: 'APPRAISAL ENGAGEMENT LETTER', subtitle: 'Charitable Contribution / Qualified Appraisal',
    dateLabels: ['Donee organization', 'Date of contribution', 'Name of the charitable organization'],
    intendedUse: ['The appraisal is intended to develop an opinion of Fair Market Value of the subject property as of the date of contribution to {decedent}, for the Client’s federal income tax charitable contribution deduction (IRS Form 8283) and related tax reporting. No other use is intended. Whether a deduction is allowed, and its amount, are matters for the Client’s tax advisors.'],
    effective: ['Date of contribution: {dod}.', 'The opinion of value reflects market conditions and property characteristics known or knowable as of this date.'],
    typeOfValue: ['Fair Market Value, as defined in Treasury Regulation §1.170A-1(c)(2):', 'The fair market value is the price at which the property would change hands between a willing buyer and a willing seller, neither being under any compulsion to buy or sell and both having reasonable knowledge of relevant facts.'],
    ea: EA_RETRO + ' If the date of contribution is the date of inspection or later, this assumption does not apply.', hc: 'None at the time of engagement.',
    standardsExtra: 'The appraisal is intended to be a “qualified appraisal” prepared by a “qualified appraiser” as defined in Treasury Regulation §1.170A-17. A qualified appraisal must be conducted no earlier than 60 days before the date of contribution and signed and dated no later than the due date, including extensions, of the return on which the deduction is first claimed; the Client is responsible for scheduling the assignment within that window. This statement does not expand the intended use or intended user identified herein.',
    deliveryDefault: '2 weeks' },
  taxAppeal: { label: 'Property tax appeal – decline in value (Prop 8)', retro: true, valueWord: 'Fair Market Value',
    title: 'RETROSPECTIVE APPRAISAL ENGAGEMENT LETTER', subtitle: 'Property Tax Assessment Appeal',
    dateLabels: ['County', 'Lien date', 'Santa Barbara County'],
    intendedUse: ['The appraisal is intended to develop a retrospective opinion of Fair Market Value as of the lien date, to assist the Client in an informal review with the {decedent} Assessor or an appeal before the Assessment Appeals Board, including a decline-in-value review under Proposition 8. No other use is intended.'],
    effective: ['Lien date: {dod}.', 'The opinion of value reflects market conditions and property characteristics known or knowable as of this date.'],
    typeOfValue: CA_FCV, ea: EA_RETRO, hc: 'None at the time of engagement.', deliveryDefault: '2 weeks' },
  buyout: { label: 'Co-owner buyout / partnership dissolution – current value', retro: false, valueWord: 'Market Value',
    title: 'CURRENT MARKET VALUE APPRAISAL ENGAGEMENT LETTER', subtitle: 'Co-Owner Buyout / Dissolution of Ownership',
    intendedUse: ['This appraisal is prepared solely to assist the Client in negotiations among the owners of the subject property regarding a buyout of an ownership interest or the dissolution of co-ownership. The appraisal is not intended to advocate for any owner, to determine or compel a specific outcome, or to replace independent legal, tax, or financial advice.'],
    effective: CURRENT_EFF, typeOfValue: MV_AI, ea: NONE_KNOWN, hc: 'None at the time of engagement.',
    extraSection: ['INTEREST VALUATION CLARIFICATION', 'This appraisal develops an opinion of the market value of the fee simple interest in the subject property as a whole. The assignment does not include valuation of fractional, partial, or undivided interests, or any discount for lack of control or marketability, unless specifically agreed to in writing. Any allocation of value among owners is outside the scope of this appraisal and should be determined by the owners and their legal or financial advisors.'],
    deliveryDefault: '2 weeks' },
  otherCurrent: { label: 'Other purpose – current value (type the purpose)', retro: false, valueWord: 'Market Value', purpose: true, premise: true,
    title: 'CURRENT MARKET VALUE APPRAISAL ENGAGEMENT LETTER', subtitle: '{purposeTitle}',
    intendedUse: ['The appraisal is intended to develop a current opinion of Market Value to assist the Client in {purpose}. No other use is intended. The assignment results are developed solely for the stated intended use and intended user.'],
    effective: CURRENT_EFF, typeOfValue: MV_AI, ea: NONE_KNOWN, hc: 'None at the time of engagement.', deliveryDefault: '2 weeks' },
  otherRetro: { label: 'Other purpose – past date (e.g., cost basis on purchase date)', retro: true, valueWord: 'Market Value', purpose: true,
    title: 'RETROSPECTIVE APPRAISAL ENGAGEMENT LETTER', subtitle: '{purposeTitle}',
    dateLabels: ['What the date is', 'Effective date', 'Date of acquisition'],
    intendedUse: ['The appraisal is intended to develop a retrospective opinion of Market Value as of the effective date to assist the Client in {purpose}. No other use is intended. The assignment results are developed solely for the stated intended use and intended user.'],
    effective: ['{retroWhoCap}: {dod}.', 'The opinion of value reflects market conditions and property characteristics known or knowable as of this date.'],
    typeOfValue: MV_AI, ea: EA_RETRO, hc: 'None at the time of engagement.', deliveryDefault: '2 weeks' },
});
TYPES.purchase.premise = true; TYPES.preListing.premise = true;

/* Value premise for proposed construction or renovation */
const PREMISE = {
  asis: null,
  complHC: { engage: 'an “as completed” Market Value appraisal (current date)', effective: ['The effective date of value will be the date of the personal inspection (site visit). Value will be reported “as completed,” as if the proposed improvements were complete on that date.'],
    hc: 'The appraisal will be based on the hypothetical condition that the proposed improvements have been completed as of the effective date in accordance with the {plans} provided to the appraiser. The use of this hypothetical condition may affect the assignment results.' },
  prospective: { engage: 'a prospective “as completed” Market Value appraisal', effective: ['Prospective “as completed” value as of {completion}, the estimated date of completion.', 'The opinion of value reflects market conditions anticipated as of that date, based on information known or knowable as of the date of the report.'],
    ea: 'The prospective value is developed under the extraordinary assumption that the proposed improvements will be completed by {completion} in a good and workmanlike manner, in accordance with the {plans} provided to the appraiser. If this assumption is found to be false, the assignment results may be affected.' },
  both: { engage: 'an “as is” and prospective “as completed” Market Value appraisal', effective: ['“As is” value: the date of the personal inspection (site visit).', 'Prospective “as completed” value: {completion}, the estimated date of completion.'],
    ea: 'The prospective “as completed” value is developed under the extraordinary assumption that the proposed improvements will be completed by {completion} in a good and workmanlike manner, in accordance with the {plans} provided to the appraiser. If this assumption is found to be false, the assignment results may be affected.' },
};
const DOCS_TO_PROVIDE = 'The Client will provide the complete {plans} before the appraisal can be completed. The appraisal will rely on these documents. Material changes to the plans, specifications, or budget after delivery of the report require a new agreement.';

const PROPERTY_TYPES = [ // [key, letter text, default report format, default interest]
  ['sfr', 'Existing, detached single-family residence', 'GPAR form report'],
  ['sfrAdu', 'Existing, detached single-family residence with accessory dwelling unit', 'GPAR form report'],
  ['estate', 'Existing, detached single-family estate with accessory buildings', 'GPAR form report'],
  ['pudDet', 'Existing, detached single-family residence in a planned unit development (PUD)', 'GPAR form report'],
  ['pud', 'Existing, attached townhouse in a planned unit development (PUD)', 'GPAR form report'],
  ['condo', 'Existing, attached condominium', 'GPAR Condominium form report'],
  ['coop', 'Existing cooperative (co-op) unit', 'Cooperative interest form report', 'Cooperative interest (shares of stock and the appurtenant proprietary lease)'],
  ['multi', 'Existing, two- to four-unit residential property', 'GPAR Small Residential Income form report'],
  ['proposed', 'Proposed single-family residence, to be built according to the plans and specifications provided', 'GPAR form report'],
  ['renovation', 'Existing single-family residence with proposed renovation and/or additions, according to the plans and specifications provided', 'GPAR form report'],
  ['land', 'Vacant residential land', 'GPAR Land form report'],
  ['other', 'Other (type it in)', 'GPAR form report'],
];

const LISTING_TEXT = {
  notListed: 'The subject property is not listed in MLS and does not appear to be listed for sale in a Google Search. The appraiser has not verified any private listings, pocket listings, or unadvertised marketing efforts and makes no representation regarding the subject’s exposure to the market.',
  listed: 'The subject property is currently listed for sale{listingDetail}. The appraiser will analyze the current listing as of the effective date.',
  contract: 'The subject property is under contract for sale{listingDetail}. The Client will provide a complete copy of the purchase agreement, including all addenda and counteroffers, which the appraiser will analyze.',
};

const STD = {
  intendedUserSole: 'The Client is the sole intended user. No other intended users are identified.',
  intendedUserMore: 'The intended users are the Client and {otherUsers}. No other intended users are identified.',
  standards: 'The appraisal will be developed and reported in accordance with the Uniform Standards of Professional Appraisal Practice (USPAP) in effect as of the date of report completion and, where applicable, the Appraisal Institute Code of Professional Ethics and Standards of Professional Appraisal Practice.',
  scope: { interior: 'The Appraiser will perform an interior and exterior observation of the subject property', exterior: 'The Appraiser will perform an exterior observation of the subject property from the street', none: 'The Appraiser will not inspect the subject property and will rely on public records and other reliable sources for its characteristics' },
  scopeTail: ' and will research, analyze, and report relevant market data necessary to develop a credible {retroWord} opinion of value for the stated intended use.',
  inspection: 'The inspection is limited to readily observable and accessible areas of the property. No testing, probing, dismantling, or specialized inspections will be performed. The Appraiser is not a home inspector, structural engineer, contractor, environmental specialist, or code inspector and makes no warranties regarding structural integrity, systems, environmental conditions, or code compliance. The Client is responsible for disclosing any known defects or adverse conditions. Unless otherwise stated, the appraisal assumes no hidden or unapparent conditions exist that would affect value or marketability. Personal property is excluded from this appraisal. This appraisal does not replace or eliminate the need for independent due diligence. The Client is strongly encouraged to obtain appropriate professional inspections and expert evaluations.',
  delivery: 'Delivery Timeline: Approximately {delivery} after receipt of payment or date of inspection (whichever is more recent) unless otherwise agreed.',
  copies: 'Electronic PDF',
  confidentiality: 'The Appraiser shall maintain the confidentiality of all information and assignment results in accordance with the Confidentiality section of the ETHICS RULE of USPAP, applicable federal and state privacy laws, and generally accepted professional standards. The appraisal report and assignment results will not be disclosed to anyone other than the Client and identified intended users without the Client’s authorization, except as required by law, regulation, subpoena, court order, professional obligation, regulatory compliance, peer review, or defense of the Appraiser in connection with the assignment. Any required disclosure shall not be deemed a waiver of confidentiality or create liability to unauthorized users.',
  reliance: 'No party other than the Client and identified intended users may rely on the appraisal report or assignment results without the Appraiser’s prior written consent, except as required by law or regulation. Nothing in this Agreement creates rights in any third party.',
  changes: 'Changes to the Client, Intended User, Intended Use, effective date, property appraised, or type of value require a new written agreement.',
  cancel1: 'The Client may cancel this Agreement at any time prior to delivery of the appraisal report by providing written notice. The Appraiser reserves the right to withdraw from the assignment at any time with written notice if: (i) credible assignment results cannot be developed in accordance with USPAP; (ii) the scope of work changes materially; (iii) necessary access, information, or cooperation is not provided; (iv) the Appraiser is subjected to undue influence or pressure to reach a predetermined result; or (v) other conditions arise that, in the Appraiser’s professional judgment, impair independence, objectivity, competency, or the ability to perform the assignment ethically and in compliance with USPAP.',
  cancel2: 'In the event of cancellation or withdrawal, the Client agrees to compensate the Appraiser for work completed and expenses incurred through the date of cancellation or withdrawal. Any prepaid fees will be applied to services performed, and any unused portion may be refunded based on the stage of completion of the assignment. If the appraisal report has been substantially completed, no refund will be due. Withdrawal under this provision shall not constitute breach of this Agreement.',
  testimony: 'This assignment does not include testimony, consultation, or litigation support unless separately agreed to in writing.',
  independence: 'The Appraiser’s compensation is not contingent upon the reporting of a predetermined value or result. The appraisal will be developed with independence, impartiality, and objectivity.',
  liability: 'To the fullest extent permitted by law, the Appraiser’s total liability to the Client for any and all claims arising out of this assignment shall be limited to the total fees actually paid for this appraisal. In no event shall either party be liable for consequential, special, incidental, or punitive damages. This limitation applies to all claims of any kind and survives completion of the assignment.',
  timeLimit: 'Unless a shorter period is required by law, any legal action arising from this appraisal must be filed within two (2) years from the date of report delivery, or from the date of the alleged act if occurring after delivery. Claims are not transferable to third parties.',
  law: 'This Agreement shall be governed by the laws of the state in which the Appraiser’s principal place of business is located.',
  completion: 'The Appraiser’s obligations are complete upon delivery of the appraisal report. The Appraiser will respond to reasonable Client questions regarding report content after delivery.',
  expiration: 'This Agreement is valid only if signed within three (3) days of the date below.',
};

/* Draft AI-use paragraph (goes in CONFIDENTIALITY). Her own words can replace it on the Standard wording tab. */
const AI_DEFAULT = 'Use of Technology and Artificial Intelligence: The Appraiser may use software tools, including artificial-intelligence (AI) tools, to assist with clerical and support tasks such as organizing data, summarizing documents, checking calculations, and drafting text. All analyses, opinions, and conclusions in the appraisal are developed by the Appraiser, who reviews and verifies any tool output before relying on it. The Appraiser takes reasonable steps to protect confidential information, including removing client names and other personal identifying information before documents are processed by such tools and using services whose terms do not permit the use of submitted data for training. Because these services are operated by third parties, the Appraiser cannot guarantee their security and shall not be liable for any unauthorized access to, or disclosure of, information held by a third-party service provider, except to the extent caused by the Appraiser’s own negligence. By signing this Agreement, the Client consents to this use. If the Client does not consent, the Client may so state in writing before signing, and no AI tools will be used for this assignment.';
