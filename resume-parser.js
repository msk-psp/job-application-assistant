const SKILLS = [
  "Airflow", "AWS", "Azure", "C++", "ClickHouse", "Dagster", "DataHub",
  "Docker", "FastAPI", "GCP", "Git", "Go", "Grafana", "Java", "JavaScript",
  "Kafka", "Kubernetes", "Linux", "MLflow", "MongoDB", "MySQL", "Next.js",
  "PostgreSQL", "Prometheus", "Python", "PyTorch", "Ray", "React", "Redis",
  "Scala", "Spark", "Spring", "SQL", "TensorFlow", "Terraform", "TypeScript"
];

function firstMatch(text, pattern) {
  return text.match(pattern)?.[1]?.trim() || "";
}

function normalizePhone(value) {
  return value.replace(/\s+/g, "").replace(/\.(?=\d)/g, "-");
}

function findName(lines) {
  const labelled = lines.join("\n").match(/(?:이름|성명|name)\s*[:：]\s*([^\n|]{2,40})/i);
  if (labelled) return labelled[1].trim();
  return lines.find((line) => {
    const value = line.trim();
    return value.length >= 2 && value.length <= 30
      && /^[가-힣a-zA-Z][가-힣a-zA-Z .'-]+$/.test(value)
      && !/(resume|이력서|curriculum|vitae|profile)/i.test(value);
  })?.trim() || "";
}

function findUrl(urls, host) {
  return urls.find((url) => url.toLowerCase().includes(host)) || "";
}

const SECTION_HEADINGS = {
  experience: /^(경력|경력\s*사항|주요\s*경력|업무\s*경력|work\s*experience|professional\s*experience|experience|employment)$/i,
  projects: /^(프로젝트|주요\s*프로젝트|projects?|project\s*experience|selected\s*projects)$/i,
  education: /^(학력|학력\s*사항|교육|education|academic\s*background)$/i,
  skills: /^(기술|기술\s*스택|보유\s*기술|핵심\s*역량|skills?|tech(?:nical)?\s*stack|technologies|competencies)$/i,
  other: /^(자격증|수상|어학|외부\s*활동|certifications?|awards?|languages?|activities|summary|profile|자기소개)$/i
};

const DATE_RANGE = /(20\d{2})[.\-/년\s]+(0?[1-9]|1[0-2])?\s*(?:~|–|—|-)\s*(?:(20\d{2})[.\-/년\s]+(0?[1-9]|1[0-2])?|현재|재직중|present)/i;

function sectionsFrom(lines) {
  const sections = { experience: [], projects: [], education: [], skills: [], other: [] };
  let current = "";
  for (const line of lines) {
    const heading = Object.entries(SECTION_HEADINGS).find(([, pattern]) => pattern.test(line));
    if (heading) {
      current = heading[0];
      continue;
    }
    if (current) sections[current].push(line);
  }
  return sections;
}

function sectionSkills(lines) {
  const candidates = [];
  for (const line of lines) {
    const cleaned = line.replace(/^(기술|skills?|tech(?:nical)? stack)\s*[:：]\s*/i, "");
    const hasDelimiter = /[,|·•]/.test(cleaned);
    const parts = hasDelimiter
      ? cleaned.split(/[,|·•]/)
      : /^[A-Za-z0-9+#.\-/ ]+$/.test(cleaned) && cleaned.split(/\s+/).length <= 12
        ? cleaned.split(/\s+/)
        : [cleaned];
    for (const part of parts) {
      const value = part.trim().replace(/^[-–—]\s*/, "");
      if (value && value.length <= 40 && value.split(/\s+/).length <= 4 && !DATE_RANGE.test(value)) {
        candidates.push(value);
      }
    }
  }
  return candidates;
}

function uniqueValues(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function monthValue(year, month) {
  return year ? `${year}-${String(month || "01").padStart(2, "0")}` : "";
}

function datedEntries(lines, kind) {
  const entries = [];
  for (let index = 0; index < lines.length; index += 1) {
    const range = lines[index].match(DATE_RANGE);
    if (!range) continue;
    const period = range[0];
    const beforeDate = lines[index].replace(period, "").replace(/[|·•]/g, " ").trim();
    const previous = lines[index - 1] || "";
    const next = lines[index + 1] || "";
    const identity = beforeDate || previous;
    const parts = identity.split(/\s{2,}|\s+[|/]\s+/).filter(Boolean);
    const description = lines.slice(index + 1, index + 5).filter((line) => !DATE_RANGE.test(line)).join("\n");
    const current = /현재|재직중|present/i.test(period);
    if (kind === "experience") {
      entries.push({
        company: parts[0] || identity,
        title: parts[1] || (next !== description ? next : ""),
        startDate: monthValue(range[1], range[2]),
        endDate: current ? "" : monthValue(range[3], range[4]),
        current,
        period,
        description,
        achievements: ""
      });
    } else if (kind === "projects") {
      entries.push({
        name: parts[0] || identity || `프로젝트 ${entries.length + 1}`,
        role: parts[1] || "",
        period,
        technologies: "",
        description,
        outcomes: ""
      });
    } else {
      entries.push({
        school: parts[0] || identity,
        degree: parts[1] || "",
        major: "",
        startDate: monthValue(range[1], range[2]),
        endDate: current ? "" : monthValue(range[3], range[4]),
        period,
        description
      });
    }
  }
  return entries;
}

export function extractResumeFields(rawText) {
  const text = rawText.replace(/\u0000/g, "").replace(/\r\n?/g, "\n");
  const lines = text.split("\n").map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const compactText = lines.join("\n");
  const urls = compactText.match(/https?:\/\/[^\s<>()]+/gi)?.map((url) => url.replace(/[.,;]+$/, "")) || [];
  const email = firstMatch(compactText, /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i);
  const phone = firstMatch(compactText, /(?:^|\D)((?:\+?82[- .]?)?0?1[016789][- .]?\d{3,4}[- .]?\d{4})(?:\D|$)/);
  const location = firstMatch(
    compactText,
    /(?:거주지|주소|location|address)\s*[:：]\s*([^\n|]{2,80})/i
  );
  const matchedSkills = SKILLS.filter((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^A-Za-z0-9+#.])${escaped}([^A-Za-z0-9+#.]|$)`, "i").test(compactText);
  });
  const sections = sectionsFrom(lines);
  const extractedSkills = uniqueValues([...matchedSkills, ...sectionSkills(sections.skills)]);
  const experiences = datedEntries(sections.experience, "experience");
  const projects = datedEntries(sections.projects, "projects");
  const education = datedEntries(sections.education, "education");
  const fields = {
    fullName: findName(lines),
    email,
    phone: phone ? normalizePhone(phone) : "",
    location,
    linkedin: findUrl(urls, "linkedin.com"),
    github: findUrl(urls, "github.com"),
    portfolio: urls.find((url) => !/linkedin\.com|github\.com/i.test(url)) || "",
    currentCompany: experiences[0]?.company || "",
    currentTitle: experiences[0]?.title || "",
    skills: extractedSkills.join(", "),
    summary: lines.slice(0, 40).join("\n").slice(0, 3000)
  };
  return {
    fields: Object.fromEntries(Object.entries(fields).filter(([, value]) => value)),
    experiences,
    projects,
    education,
    rawText: lines.join("\n"),
    metadata: {
      characterCount: compactText.length,
      lineCount: lines.length,
      skillCount: extractedSkills.length
    }
  };
}
