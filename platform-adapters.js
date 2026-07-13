(() => {
  const adapters = [
    {
      id: "greeting",
      name: "Greeting 지원서",
      hosts: ["futureschole.com", "greetinghr.com"],
      containerSelectors: [
        "[data-scope='field'][data-part='root']",
        "[data-scope='file-upload'][data-part='root']",
        "[role='group']"
      ],
      aliases: [
        { key: "fullName", patterns: [/basicInformation\.name/i, /^이름\s*\*/] },
        { key: "email", patterns: [/basicInformation\.email/i, /이메일주소/] },
        { key: "phone", patterns: [/basicInformation\.phoneNumber/i, /^연락처\s*\*/] }
      ]
    },
    {
      id: "saramin",
      name: "사람인",
      hosts: ["saramin.co.kr"],
      containerSelectors: [".form_item", ".item_recruit", "tr", "fieldset"],
      aliases: [
        { key: "summary", patterns: [/경력기술/, /자기소개서/] },
        { key: "currentCompany", patterns: [/직장명/, /회사명/] }
      ]
    },
    {
      id: "wanted",
      name: "원티드",
      hosts: ["wanted.co.kr"],
      containerSelectors: ["[class*='Form']", "[class*='Input']", "fieldset"],
      aliases: [
        { key: "summary", patterns: [/간단한 자기소개/, /경력 사항/] },
        { key: "portfolio", patterns: [/첨부 링크/, /관련 링크/] }
      ]
    },
    {
      id: "remember",
      name: "리멤버",
      hosts: ["rememberapp.co.kr", "rememberapp.com"],
      containerSelectors: ["[class*='Form']", "[class*='Input']", "fieldset"],
      aliases: [
        { key: "currentTitle", patterns: [/직무명/, /포지션/] },
        { key: "summary", patterns: [/핵심 역량/, /경력 상세/] }
      ]
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      hosts: ["linkedin.com"],
      containerSelectors: [".fb-dash-form-element", ".jobs-easy-apply-form-section__grouping", "fieldset"],
      aliases: [
        { key: "phone", patterns: [/phone number/i] },
        { key: "yearsExperience", patterns: [/how many years/i] }
      ]
    }
  ];

  function forHost(hostname) {
    return adapters.find((adapter) => adapter.hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))) || {
      id: "generic",
      name: hostname,
      containerSelectors: ["fieldset", ".form-group", "[class*='field']"],
      aliases: []
    };
  }

  function forPage(hostname, markers = {}) {
    const byHost = forHost(hostname);
    if (byHost.id !== "generic") return byHost;
    return markers.greeting
      ? adapters.find((adapter) => adapter.id === "greeting")
      : byHost;
  }

  globalThis.JobAssistantAdapters = { adapters, forHost, forPage };
})();
