/**
 * NexHire — AI Resume Matcher
 * Zero-dependency NLP: stop-word filtering + multi-word tech-phrase boosting.
 * Match score 0-100 using weighted TF-IDF-style counting.
 */

const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with","by",
  "from","is","was","are","were","be","been","have","has","had","do","does",
  "did","will","would","could","should","may","might","must","can","this","that",
  "these","those","we","our","us","you","your","they","their","it","its","he",
  "she","not","no","nor","so","yet","both","as","than","then","when","where",
  "who","which","what","how","if","also","well","just","about","more","other",
  "up","out","into","over","some","any","all","each","very","just","still",
]);

// Multiword phrases get 2× weight
const TECH_PHRASES = [
  "machine learning","deep learning","natural language processing","computer vision",
  "rest api","graphql api","ci/cd","test driven development","agile methodology",
  "scrum","cloud computing","microservices","full stack","front end","back end",
  "data structures","algorithms","object oriented","functional programming",
  "system design","distributed systems","kubernetes","docker compose",
  "continuous integration","continuous deployment","devops","mlops",
  "large language model","prompt engineering","neural network",
];

/** Tokenise and extract meaningful keywords from raw text */
export function extractKeywords(text = "") {
  if (!text) return [];
  const lower = text.toLowerCase();

  // Multi-word phrases first (normalised with _)
  const phrases = TECH_PHRASES
    .filter((p) => lower.includes(p))
    .map((p) => p.replace(/\s+/g, "_"));

  // Single tokens
  const tokens = lower
    .replace(/[^a-z0-9#+.\-\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));

  return [...new Set([...tokens, ...phrases])];
}

/** Build keyword vector from structured resume object */
export function extractFromResumeData(resume) {
  const parts = [];
  if (resume.personalInfo?.summary) parts.push(resume.personalInfo.summary);

  const sk = resume.skills || {};
  parts.push(...(sk.technical || []), ...(sk.soft || []), ...(sk.certifications || []));

  for (const exp of resume.experience || []) {
    if (exp.description) parts.push(exp.description);
    if (exp.role)        parts.push(exp.role);
    parts.push(...(exp.achievements || []));
  }
  for (const proj of resume.projects || []) {
    if (proj.description) parts.push(proj.description);
    parts.push(...(proj.techStack || []));
  }
  for (const edu of resume.education || []) {
    if (edu.field)  parts.push(edu.field);
    if (edu.degree) parts.push(edu.degree);
  }

  return extractKeywords(parts.join(" "));
}

/** Build keyword vector for a job posting */
export function buildJobKeywordVector(job) {
  const parts = [
    job.title || "",
    job.description || "",
    ...(job.skills || []),
    ...(job.requirements || []),
    ...(job.tags || []),
    job.experienceLevel || "",
    job.jobType || "",
  ];
  return extractKeywords(parts.join(" "));
}

/** Score resume vs job keywords (0-100) */
export function calculateMatchScore(resumeKws = [], jobKws = []) {
  if (!jobKws.length) return { score: 0, matchedKeywords: [], missingKeywords: [], totalJobKeywords: 0 };

  const resumeSet    = new Set(resumeKws);
  const uniqueJobKws = [...new Set(jobKws)];

  let weightedMatched = 0, weightedTotal = 0;
  const matchedKeywords  = [];
  const missingKeywords  = [];

  for (const kw of uniqueJobKws) {
    const weight = kw.includes("_") ? 2 : 1; // boost phrases
    weightedTotal += weight;
    if (resumeSet.has(kw)) {
      weightedMatched += weight;
      matchedKeywords.push(kw.replace(/_/g, " "));
    } else {
      missingKeywords.push(kw.replace(/_/g, " "));
    }
  }

  const score = Math.min(Math.round((weightedMatched / weightedTotal) * 100), 100);

  return {
    score,
    matchedKeywords,
    missingKeywords,
    totalJobKeywords: uniqueJobKws.length,
    verdict:
      score >= 75 ? "Strong Match" :
      score >= 50 ? "Good Match"   :
      score >= 30 ? "Partial Match": "Low Match",
  };
}
