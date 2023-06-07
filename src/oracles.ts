import assert from "assert";

import type { StableMatcher, StableMatcherWithTrace } from "../include/stableMatching.js";

export function generateInput(n: number): number[][] {
  const generatedInput: number[][] = [];
  for (let i = 0; i < n; i++) {
    // Create an array of candidate preferences, initially ordered by company index
    const candidatePreferences: number[] = Array.from({ length: n }, (_, i) => i);

    // Shuffle the candidate preferences array using Fisher-Yates algorithm
    for (let j = n - 1; j >= 0; j--) {
      const k = randomInt(0, j + 1);
      const temp = candidatePreferences[j];
      candidatePreferences[j] = candidatePreferences[k];
      candidatePreferences[k] = temp;
    }

    generatedInput.push(candidatePreferences);
  }
  return generatedInput;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min)) + min;
}

const NUM_TESTS = 100; // Change this to some reasonably large value
const N = 20; // Change this to some reasonable size

/**
 * Tests whether or not the supplied function is a solution to the stable matching problem.
 * @param makeStableMatching A possible solution to the stable matching problem
 * @throws An `AssertionError` if `makeStableMatching` in not a solution to the stable matching problem
 */

export function stableMatchingOracle(makeStableMatching: StableMatcher): void {
  for (let i = 0; i < NUM_TESTS; ++i) {
    const companies = generateInput(N);
    const candidates = generateInput(N);
    const hires = makeStableMatching(companies, candidates);

    assert(companies.length === hires.length, "Hires length is correct.");

    // Check that no company or candidate is matched to more than one partner
    const companyMatches = new Map();
    const candidateMatches = new Map();
    for (const hire of hires) {
      const company = hire.company;
      const candidate = hire.candidate;
      assert(!companyMatches.has(company), `Company ${company} is matched to multiple candidates`);
      assert(!candidateMatches.has(candidate), `Candidate ${candidate} is matched to multiple companies`);
      companyMatches.set(company, candidate);
      candidateMatches.set(candidate, company);
    }

    // Check that every company has a preference for each candidate
    for (let company = 0; company < N; company++) {
      const companyPreferences = companies[company];
      for (let candidate = 0; candidate < N; candidate++) {
        assert(
          companyPreferences.includes(candidate),
          `Company ${company} has no preference for candidate ${candidate}`
        );
      }
    }

    // Check that every candidate has a preference for each company
    for (let candidate = 0; candidate < N; candidate++) {
      const candidatePreferences = candidates[candidate];
      for (let company = 0; company < N; company++) {
        assert(
          candidatePreferences.includes(company),
          `Candidate ${candidate} has no preference for company ${company}`
        );
      }
    }

    // Check that all companies and candidates are matched
    const matchedCompanies = new Set();
    const matchedCandidates = new Set();
    for (const hire of hires) {
      matchedCompanies.add(hire.company);
      matchedCandidates.add(hire.candidate);
    }
    assert(matchedCompanies.size === N, `Not all companies are matched`);
    assert(matchedCandidates.size === N, `Not all candidates are matched`);

    // Check that all hires are valid
    for (const hire of hires) {
      assert(hire.company >= 0 && hire.company < N, `Invalid company index ${hire.company}`);
      assert(hire.candidate >= 0 && hire.candidate < N, `Invalid candidate index ${hire.candidate}`);
    }

    // Check that the function returns an array of objects with the correct properties
    for (const hire of hires) {
      assert(typeof hire.company === "number", `Expected a number for hire.company, got ${typeof hire.company}`);
      assert(typeof hire.candidate === "number", `Expected a number for hire.candidate, got ${typeof hire.candidate}`);
      assert(
        Object.keys(hire).length === 2,
        `Expected only two properties in a hire object, got ${Object.keys(hire).length}`
      );
    }

    // Check that the function returns an array with the correct length
    assert(hires.length === N, `Expected ${N} hires, got ${hires.length}`);

    // Check that all companies and candidates are matched to a valid partner
    for (let i = 0; i < N; i++) {
      assert(
        hires.some(h => h.company === i),
        `No partner found for company ${i}`
      );
      assert(
        hires.some(h => h.candidate === i),
        `No partner found for candidate ${i}`
      );
    }

    // Check that matchings are stable
    for (let i = 0; i < N; ++i) {
      const matched_company = hires[i].company;
      const matched_candidate = hires[i].candidate;
      const ind = candidates[matched_candidate].indexOf(matched_company);
      if (ind !== 0) {
        const prefList = companies[candidates[matched_candidate][ind - 1]];
        const matched = hires.filter(hire => hire.company === candidates[matched_candidate][ind - 1])[0].candidate;
        if (prefList.indexOf(matched_candidate) < prefList.indexOf(matched)) {
          assert(false, "Matchings are not stable");
        }
      }
    }
  }
}

// Part B

/**
 * Tests whether or not the supplied function follows the supplied algorithm.
 * @param makeStableMatchingTrace A possible solution to the stable matching problem and its possible steps
 * @throws An `AssertionError` if `makeStableMatchingTrace` does not follow the specified algorithm, or its steps (trace)
 * do not match with the result (out).
 */

export function stableMatchingRunOracle(makeStableMatchingTrace: StableMatcherWithTrace): void {
  for (let i = 0; i < NUM_TESTS; ++i) {
    const companies = generateInput(N);
    const candidates = generateInput(N);
    const { trace, out } = makeStableMatchingTrace(companies, candidates);

    // Check that the output stable matching is stable
    const companyToCandidate = new Map<number, number>();
    const candidateToCompany = new Map<number, number>();
    for (const element of out) {
      if (!companyToCandidate.has(element.company)) {
        companyToCandidate.set(element.company, element.candidate);
      } else {
        const currentCandidate = companyToCandidate.get(element.company) as number;
        if (
          companies[element.company].indexOf(currentCandidate) > companies[element.company].indexOf(element.candidate)
        ) {
          assert(false, "Matching is not stable");
        }
      }
      if (!candidateToCompany.has(element.candidate)) {
        candidateToCompany.set(element.candidate, element.company);
      } else {
        const currentCompany = candidateToCompany.get(element.candidate) as number;
        if (
          candidates[element.candidate].indexOf(currentCompany) > candidates[element.candidate].indexOf(element.company)
        ) {
          assert(false, "Matching is not stable");
        }
      }
    }
    //TODO

    // Check that the trace matches the output stable matching
    let hireIndex = 0;
    let numOffers = 0;
    for (const { from, to, fromCo } of trace) {
      if (fromCo) {
        // Company makes offer
        assert(from === hireIndex, "Unexpected offer from company");
        const candidate = candidates[to].indexOf(from);
        assert(candidate !== -1, "Invalid offer to candidate");
        numOffers += 1;
      } else {
        // Candidate accepts offer
        assert(to === hireIndex, "Unexpected acceptance from candidate");
        const company = companies[from].indexOf(to);
        assert(company !== -1, "Invalid acceptance from company");
        assert(candidates[to][company] === from, "Invalid match");
        hireIndex += 1;
      }
    }

    assert(numOffers === N * N, "Incorrect number of offers made");
    assert(hireIndex === N, "Incorrect number of hires made");
  }
}
