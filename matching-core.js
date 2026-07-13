(() => {
  const FIELD_RULES = [
    { key: "fullName", patterns: [/full.?name/i, /applicant.?name/i, /^name$/i, /성명/, /이름/] },
    { key: "email", patterns: [/e-?mail/i, /이메일/] },
    { key: "phone", patterns: [/phone/i, /mobile/i, /telephone/i, /휴대폰/, /연락처/, /전화번호/] },
    { key: "location", patterns: [/location/i, /address/i, /거주지/, /주소/] },
    { key: "linkedin", patterns: [/linkedin/i] },
    { key: "github", patterns: [/github/i] },
    { key: "portfolio", patterns: [/portfolio/i, /website/i, /포트폴리오/] },
    { key: "currentCompany", patterns: [/current.?company/i, /현.*회사/, /재직.*회사/] },
    { key: "currentTitle", patterns: [/current.?title/i, /job.?title/i, /직책/, /직급/] },
    { key: "yearsExperience", patterns: [/years?.*experience/i, /경력.*년/, /총.*경력/] },
    { key: "expectedSalary", patterns: [/expected.?salary/i, /희망.*연봉/] },
    { key: "availableDate", patterns: [/start.?date/i, /available/i, /입사.*가능/] },
    { key: "skills", patterns: [/skills?/i, /기술.*스택/, /보유.*기술/] },
    { key: "summary", patterns: [/career.?summary/i, /professional.?summary/i, /경력.*요약/, /자기소개/] }
  ];

  const ANSWER_CATEGORIES = [
    { category: "motivation", patterns: [/why.*(join|apply|role)/i, /motivation/i, /지원.*동기/, /이직.*사유/] },
    { category: "culture", patterns: [/culture/i, /environment/i, /조직.*문화/, /선호.*문화/, /업무.*환경/] },
    { category: "strengths", patterns: [/strength/i, /장점/, /강점/] },
    { category: "collaboration", patterns: [/collaboration/i, /teamwork/i, /협업/, /갈등.*해결/] }
  ];

  function normalize(value) {
    return String(value || "").toLowerCase().replace(/[^0-9a-z가-힣+#.]+/g, " ").trim();
  }

  function tokens(value) {
    return new Set(normalize(value).split(/\s+/).filter((token) => token.length > 1));
  }

  function similarity(left, right) {
    const a = tokens(left);
    const b = tokens(right);
    if (!a.size || !b.size) return 0;
    let intersection = 0;
    for (const token of a) if (b.has(token)) intersection += 1;
    return intersection / new Set([...a, ...b]).size;
  }

  function currentExperience(profile) {
    const experiences = Array.isArray(profile.experiences) ? profile.experiences : [];
    return experiences.find((item) => item.current) || experiences[0] || {};
  }

  function yearsOfExperience(profile) {
    if (profile.yearsExperience) return profile.yearsExperience;
    const experiences = Array.isArray(profile.experiences) ? profile.experiences : [];
    const milliseconds = experiences.reduce((total, item) => {
      const start = Date.parse(item.startDate);
      const end = item.current ? Date.now() : Date.parse(item.endDate);
      return Number.isFinite(start) && Number.isFinite(end) && end > start
        ? total + (end - start)
        : total;
    }, 0);
    return milliseconds ? (milliseconds / 31557600000).toFixed(1) : "";
  }

  function experienceSummary(profile) {
    const experiences = Array.isArray(profile.experiences) ? profile.experiences : [];
    return experiences.map((item) => {
      const period = [item.startDate, item.current ? "현재" : item.endDate].filter(Boolean).join(" - ");
      return [
        [item.company, item.title].filter(Boolean).join(" / "),
        period,
        item.description,
        item.achievements
      ].filter(Boolean).join("\n");
    }).join("\n\n");
  }

  function profileValue(profile, key) {
    const current = currentExperience(profile);
    const derived = {
      currentCompany: current.company || "",
      currentTitle: current.title || "",
      yearsExperience: yearsOfExperience(profile),
      summary: profile.summary || experienceSummary(profile)
    };
    const prefersStructured = ["currentCompany", "currentTitle", "yearsExperience"].includes(key);
    return String((prefersStructured ? derived[key] || profile[key] : profile[key] || derived[key]) || "").trim();
  }

  function categoryFor(question) {
    return ANSWER_CATEGORIES.find((item) => item.patterns.some((pattern) => pattern.test(question)))?.category || "";
  }

  function recommendAnswer(question, profile) {
    const answers = Array.isArray(profile.answers) ? profile.answers : [];
    const category = categoryFor(question);
    let best = null;
    for (const answer of answers) {
      if (!answer.answer?.trim()) continue;
      const source = [answer.question, answer.tags, answer.category].filter(Boolean).join(" ");
      const lexical = similarity(question, source);
      const categoryBonus = category && answer.category === category ? 0.65 : 0;
      const score = Math.min(0.96, lexical + categoryBonus);
      if (!best || score > best.score) best = { value: answer.answer.trim(), score, source: "answerBank" };
    }
    const legacy = profile[category];
    if ((!best || best.score < 0.5) && legacy) {
      best = { value: String(legacy).trim(), score: 0.68, source: "legacyAnswer" };
    }
    return best?.score >= 0.35 ? best : null;
  }

  function matchField(label, profile, aliases = []) {
    const alias = aliases.find((item) => item.patterns.some((pattern) => pattern.test(label)));
    const rule = alias || FIELD_RULES.find((item) => item.patterns.some((pattern) => pattern.test(label)));
    if (rule) {
      const value = profileValue(profile, rule.key);
      if (value) return { key: rule.key, value, score: alias ? 0.94 : 0.84, source: alias ? "platform" : "generic" };
    }
    const answer = recommendAnswer(label, profile);
    return answer ? { key: "answer", ...answer } : null;
  }

  function confidence(score) {
    if (score >= 0.85) return "high";
    if (score >= 0.6) return "medium";
    return "low";
  }

  globalThis.JobAssistantCore = {
    confidence,
    experienceSummary,
    matchField,
    profileValue,
    recommendAnswer,
    similarity
  };
})();
