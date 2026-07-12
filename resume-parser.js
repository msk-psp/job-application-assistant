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
  const fields = {
    fullName: findName(lines),
    email,
    phone: phone ? normalizePhone(phone) : "",
    location,
    linkedin: findUrl(urls, "linkedin.com"),
    github: findUrl(urls, "github.com"),
    portfolio: urls.find((url) => !/linkedin\.com|github\.com/i.test(url)) || "",
    skills: matchedSkills.join(", "),
    summary: lines.slice(0, 40).join("\n").slice(0, 3000)
  };
  return {
    fields: Object.fromEntries(Object.entries(fields).filter(([, value]) => value)),
    rawText: lines.join("\n")
  };
}
