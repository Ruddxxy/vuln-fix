/**
 * Article Templates Data
 *
 * This file contains the template definitions for different journalistic article formats.
 * Each template includes sections, best practices, examples, and a full template string.
 */

export interface TemplateSection {
  name: string;
  description: string;
  example: string;
  tips: string[];
}

export interface ArticleTemplate {
  id: string;
  name: string;
  description: string;
  wordCountRange: string;
  sections: TemplateSection[];
  bestPractices: string[];
  examples: {
    title: string;
    url: string;
    publication?: string;
  }[];
  fullTemplate: string;
}

export const articleTemplates: ArticleTemplate[] = [
  {
    id: "news",
    name: "News Article",
    description: "A straightforward, factual account of current events. Focus on answering who, what, when, where, why, and how.",
    wordCountRange: "500-800 words",
    sections: [
      {
        name: "Headline",
        description: "Clear, concise summary of the main point using active voice.",
        example: "Senate Passes Historic Climate Bill with Bipartisan Support",
        tips: [
          "Keep it under 10 words when possible",
          "Use present tense for immediate events",
          "Avoid clickbait or sensationalism"
        ]
      },
      {
        name: "Lead/Intro",
        description: "First paragraph that captures the most important information.",
        example: "The U.S. Senate passed the most significant climate legislation in the nation's history on Tuesday, with surprising support from both Democrats and Republicans.",
        tips: [
          "Answer the key questions (who, what, when, where, why, how)",
          "Make it compelling but factual",
          "Keep it under 35 words"
        ]
      },
      {
        name: "Context/Background",
        description: "Provide essential information that readers need to understand the story.",
        example: "The bill, which allocates $500 billion toward renewable energy infrastructure, comes after months of negotiation and represents a major shift in climate policy.",
        tips: [
          "Explain why this story matters now",
          "Give relevant history briefly",
          "Avoid unnecessary details"
        ]
      },
      {
        name: "Key Points",
        description: "Present the main facts in order of importance (inverted pyramid).",
        example: "The legislation includes tax incentives for solar panel installation, funding for electric vehicle charging stations, and new emissions standards for factories.",
        tips: [
          "Use short paragraphs (1-3 sentences each)",
          "Include compelling quotes from relevant sources",
          "Present conflicting viewpoints fairly"
        ]
      },
      {
        name: "Quotes",
        description: "Include direct statements from relevant parties.",
        example: "\"This represents a turning point in how America addresses climate change,\" said Senator James Wilson, who co-sponsored the bill.",
        tips: [
          "Use quotes that add insight, not just repeat facts",
          "Balance quotes from different perspectives",
          "Verify the accuracy of all quotes"
        ]
      },
      {
        name: "Additional Context",
        description: "Include supporting details, reactions, or analysis.",
        example: "Environmental groups have praised the bill, while some industry leaders have expressed concerns about implementation costs.",
        tips: [
          "Include diverse perspectives",
          "Keep it balanced and neutral",
          "Add depth without overwhelming readers"
        ]
      },
      {
        name: "Conclusion",
        description: "Wrap up with forward-looking information or next steps.",
        example: "The bill now moves to the House, where it is expected to face a vote next week.",
        tips: [
          "Don't introduce new critical information",
          "Consider what happens next",
          "End with impact or significance"
        ]
      }
    ],
    bestPractices: [
      "Use clear, concise language and short paragraphs",
      "Follow the inverted pyramid structure (most important info first)",
      "Maintain neutrality and present facts without opinion",
      "Include multiple sources with diverse perspectives",
      "Prioritize accuracy over speed",
      "Use active voice when possible"
    ],
    examples: [
      {
        title: "How to Write a News Article: 12 Steps",
        url: "https://www.wikihow.com/Write-a-News-Article",
      },
      {
        title: "Sample News Articles",
        url: "https://www.examples.com/business/news-article.html",
      }
    ],
    fullTemplate: `# [HEADLINE]

[LEAD PARAGRAPH - Who, what, when, where, why, how]

## Key Facts

- [Key fact 1]
- [Key fact 2]
- [Key fact 3]

[CONTEXT/BACKGROUND PARAGRAPH]

"[QUOTE from relevant source]," said [Name, title/role].

[ADDITIONAL DETAILS PARAGRAPH]

[OPPOSING OR ALTERNATIVE VIEWPOINT PARAGRAPH]

"[QUOTE from different perspective]," said [Name, title/role].

[CONCLUSION - What happens next or why it matters]

---
**Sources:** [List sources]`
  },
  {
    id: "feature",
    name: "Feature Article",
    description: "An in-depth exploration of a topic, person, or trend with more narrative elements than a news story.",
    wordCountRange: "800-1,500 words",
    sections: [
      {
        name: "Headline",
        description: "Creative and compelling, can be more evocative than news headlines.",
        example: "The Hidden Heroes: Inside the Lives of Emergency Dispatchers",
        tips: [
          "Can be more creative than news headlines",
          "Consider using a colon for a two-part headline",
          "Capture the essence of the story's appeal"
        ]
      },
      {
        name: "Hook/Lede",
        description: "Creative opening that draws readers in, often using scene-setting, anecdote, or surprising fact.",
        example: "At 3:17 a.m., while most of the city sleeps, Maria Sanchez's voice is the first thing people hear on the worst day of their lives.",
        tips: [
          "Start with a compelling scene, anecdote, or character",
          "Create an emotional connection quickly",
          "Make readers curious to learn more"
        ]
      },
      {
        name: "Nut Graph",
        description: "Paragraph that explains what the story is about and why it matters.",
        example: "Emergency dispatchers like Sanchez are the unseen first responders who handle over 240 million 911 calls annually in the U.S., yet they remain among the most overlooked components of emergency services.",
        tips: [
          "Should appear within the first few paragraphs",
          "Explain the significance of the story",
          "Transition from the hook to the body"
        ]
      },
      {
        name: "Background/Context",
        description: "History, trends, or relevant information that readers need to understand the topic.",
        example: "The profession began in the 1960s with the introduction of the 911 system but has evolved dramatically with technology and increasing emergency complexity.",
        tips: [
          "Provide enough context without overwhelming readers",
          "Include surprising or little-known facts",
          "Explain relevant terminology"
        ]
      },
      {
        name: "Main Narrative",
        description: "The body of the article that develops the story through scenes, characters, and information.",
        example: "\"Time slows down when you're taking a call about a child who's not breathing,\" Sanchez says, recalling a particularly difficult call from last December...",
        tips: [
          "Use compelling quotes and detailed scenes",
          "Alternate between narrative and information",
          "Maintain a clear theme throughout"
        ]
      },
      {
        name: "Supporting Evidence",
        description: "Facts, statistics, expert opinions, and research that support your narrative.",
        example: "A 2022 study from the University of Washington found that 24% of emergency dispatchers develop symptoms of PTSD within their first year on the job.",
        tips: [
          "Include diverse sources and perspectives",
          "Present data in accessible ways",
          "Connect evidence back to your main narrative"
        ]
      },
      {
        name: "Conclusion",
        description: "Brings closure to the story, often circling back to the opening or looking toward the future.",
        example: "As the sun rises, Sanchez's shift ends. She'll go home to sleep while the city wakes, invisible to the thousands whose emergencies she managed throughout the night.",
        tips: [
          "Circle back to the beginning for a satisfying structure",
          "End with a powerful quote or image",
          "Leave readers with something to think about"
        ]
      }
    ],
    bestPractices: [
      "Use narrative techniques (character, scene, dialogue) to tell the story",
      "Balance storytelling with factual information",
      "Develop a clear theme or central question",
      "Use descriptive language that engages the senses",
      "Include diverse perspectives and voices",
      "Edit ruthlessly - cut anything that doesn't serve the story"
    ],
    examples: [
      {
        title: "Snow Fall: The Avalanche at Tunnel Creek",
        url: "https://www.nytimes.com/projects/2012/snow-fall/",
        publication: "The New York Times"
      },
      {
        title: "The Really Big One",
        url: "https://www.newyorker.com/magazine/2015/07/20/the-really-big-one",
        publication: "The New Yorker"
      }
    ],
    fullTemplate: `# [CREATIVE HEADLINE]

[HOOK - Compelling anecdote, scene, or surprising fact]

[NUT GRAPH - What this story is about and why it matters]

[BACKGROUND/CONTEXT PARAGRAPH]

## [Subheading for first main section]

[NARRATIVE PARAGRAPH with detail, scene-setting]

"[COMPELLING QUOTE]," said [Name, title/role].

[SUPPORTING FACTS, STATISTICS, EXPERT INFORMATION]

## [Subheading for second main section]

[CONTINUE NARRATIVE with new angle or aspect of story]

[INCLUDE DIFFERENT PERSPECTIVE OR VIEWPOINT]

"[QUOTE from different source]," [Name, title/role] explained.

[ADDITIONAL CONTEXT OR DEVELOPMENT]

## [Subheading for final section]

[BEGIN WRAPPING UP NARRATIVE]

[CIRCLE BACK TO OPENING ANECDOTE OR CHARACTER]

[CLOSING PARAGRAPH with lasting image or forward-looking thought]

---
**Sources:** [List sources]`
  },
  {
    id: "investigative",
    name: "Investigative Report",
    description: "In-depth reporting that uncovers information not readily apparent, often involving systematic research and multiple sources.",
    wordCountRange: "1,500-2,500+ words",
    sections: [
      {
        name: "Headline",
        description: "Clear statement of the investigation's findings or focus.",
        example: "Toxic Emissions from Local Factory Linked to Rising Cancer Rates",
        tips: [
          "Be direct about the main finding",
          "Avoid sensationalizing but don't bury the lede",
          "Consider a two-part headline for complex topics"
        ]
      },
      {
        name: "Executive Summary/Key Findings",
        description: "Brief overview of the main discoveries and why they matter.",
        example: "A six-month investigation by our newspaper has found that emissions from the Westside Chemical Plant contain levels of benzene five times higher than reported to regulators, coinciding with a 40% increase in leukemia cases in surrounding neighborhoods.",
        tips: [
          "Summarize the most important findings upfront",
          "Establish the significance and scope of the investigation",
          "Preview the evidence to come"
        ]
      },
      {
        name: "Introduction/Narrative Hook",
        description: "Human element that illustrates the impact of the issue being investigated.",
        example: "Maria Gonzalez watched three neighbors on her street receive cancer diagnoses within six months. \"Something's wrong in this neighborhood,\" she said. \"And nobody's listening.\"",
        tips: [
          "Use a compelling human story to illustrate the stakes",
          "Connect the individual case to the broader investigation",
          "Build emotional investment before diving into complex details"
        ]
      },
      {
        name: "Methodology",
        description: "Explanation of how the investigation was conducted.",
        example: "To test air quality near the plant, we installed EPA-approved monitors at 12 locations over a four-month period. We also reviewed five years of hospital admission data and interviewed 27 residents, 5 former plant employees, and 8 medical experts.",
        tips: [
          "Be transparent about methods and limitations",
          "Establish credibility through rigorous processes",
          "Explain technical aspects in accessible language"
        ]
      },
      {
        name: "Findings/Evidence",
        description: "Detailed presentation of the investigation's discoveries, organized logically.",
        example: "Our testing revealed benzene levels averaging 5.2 ppm at residential locations within one mile of the plant, compared to the 1.1 ppm reported in the company's mandatory disclosures to the EPA.",
        tips: [
          "Present evidence in a logical progression",
          "Use data visualization for complex information",
          "Connect dots clearly for readers"
        ]
      },
      {
        name: "Human Impact",
        description: "Stories and examples that illustrate the real-world effects.",
        example: "The Jensen family moved into their home just 800 yards from the plant in 2015. Since then, both children have developed respiratory conditions requiring hospitalization, and their medical bills now exceed $40,000 annually.",
        tips: [
          "Include diverse perspectives from affected people",
          "Use specific details rather than generalizations",
          "Balance emotional impact with factual reporting"
        ]
      },
      {
        name: "Institutional Response",
        description: "How authorities, companies, or organizations have responded to the issues.",
        example: "When presented with our findings, Westside Chemical spokesperson James Smith denied any connection to health issues, stating that the company \"meets or exceeds all regulatory requirements.\" Internal emails obtained through FOIA requests, however, show executives discussing the need to \"manage the emissions data carefully.\"",
        tips: [
          "Always seek comment from all parties implicated",
          "Present responses fairly even if contradicted by evidence",
          "Document any refusals to comment or participate"
        ]
      },
      {
        name: "Conclusion/Implications",
        description: "Synthesis of findings and what they mean for the future.",
        example: "With regulatory oversight failing and community health risks mounting, the situation at Westside Chemical represents a systemic failure that extends beyond one company or neighborhood.",
        tips: [
          "Avoid opinion while still drawing clear conclusions",
          "Identify broader patterns or systemic issues",
          "Consider what needs to happen next"
        ]
      }
    ],
    bestPractices: [
      "Verify every fact with multiple sources when possible",
      "Document your methodology thoroughly",
      "Provide context for complex issues",
      "Balance statistical evidence with human stories",
      "Present contrary evidence fairly",
      "Be transparent about limitations in your investigation",
      "Protect vulnerable sources appropriately"
    ],
    examples: [
      {
        title: "Dollars for Docs",
        url: "https://projects.propublica.org/docdollars/",
        publication: "ProPublica"
      },
      {
        title: "Poisoned Ground",
        url: "https://www.usatoday.com/pages/interactives/poisoned-ground/",
        publication: "USA Today"
      }
    ],
    fullTemplate: `# [HEADLINE STATING KEY FINDING]

## Executive Summary

[BRIEF OVERVIEW OF INVESTIGATION AND KEY FINDINGS]

[NARRATIVE HOOK - HUMAN STORY ILLUSTRATING THE ISSUE]

### Investigation Methodology

[EXPLANATION OF HOW INVESTIGATION WAS CONDUCTED AND SOURCES USED]

## Key Findings

1. [FIRST MAJOR FINDING WITH SUPPORTING EVIDENCE]

2. [SECOND MAJOR FINDING WITH SUPPORTING EVIDENCE]

3. [THIRD MAJOR FINDING WITH SUPPORTING EVIDENCE]

## The Human Cost

[STORIES OF THOSE AFFECTED BY THE ISSUE]

"[QUOTE FROM AFFECTED PERSON]," said [Name].

## Institutional Response

[HOW RELEVANT AUTHORITIES OR ORGANIZATIONS HAVE RESPONDED]

"[QUOTE FROM OFFICIAL OR REPRESENTATIVE]," said [Name, title].

[EVIDENCE THAT CONTRADICTS OR SUPPORTS OFFICIAL RESPONSE]

## Systemic Issues

[BROADER CONTEXT AND PATTERNS REVEALED BY INVESTIGATION]

## Conclusion

[SYNTHESIS OF FINDINGS AND IMPLICATIONS]

---
**Investigation Team:** [Names]
**Sources:** [List key sources]
**Documents:** [Reference key documents]`
  },
  {
    id: "explainer",
    name: "Explainer",
    description: "A piece that breaks down complex topics into understandable components, answering key questions for readers.",
    wordCountRange: "800-1,200 words",
    sections: [
      {
        name: "Headline",
        description: "Clear statement of what's being explained, often in question format.",
        example: "What Is Quantum Computing and Why Does It Matter?",
        tips: [
          "Be direct about the topic being explained",
          "Consider using a question format",
          "Avoid jargon in the headline"
        ]
      },
      {
        name: "Introduction",
        description: "Brief overview of the topic and why readers should care.",
        example: "Quantum computing might sound like science fiction, but this emerging technology could revolutionize everything from medicine to cybersecurity within the next decade.",
        tips: [
          "Establish relevance quickly",
          "Address reader's likely knowledge level",
          "Preview key points to come"
        ]
      },
      {
        name: "Core Concept Definition",
        description: "Clear explanation of the fundamental idea being explained.",
        example: "Unlike traditional computers that use bits (0s and 1s), quantum computers use quantum bits or 'qubits' that can exist in multiple states simultaneously, allowing them to process complex problems differently.",
        tips: [
          "Use plain language for complex concepts",
          "Define all technical terms",
          "Use analogies for abstract concepts"
        ]
      },
      {
        name: "Historical Context",
        description: "Brief background on how the topic developed.",
        example: "The concept of quantum computing was first proposed by physicist Richard Feynman in 1982, but practical development only began in earnest in the late 1990s.",
        tips: [
          "Keep historical context brief and relevant",
          "Focus on pivotal developments",
          "Connect past to present understanding"
        ]
      },
      {
        name: "Key Components",
        description: "Breakdown of the main elements that readers need to understand.",
        example: "Three principles make quantum computing possible: superposition (existing in multiple states), entanglement (particles linked across distance), and interference (manipulating probabilities).",
        tips: [
          "Break complex topics into digestible parts",
          "Use numbered lists or subheadings",
          "Explain each component clearly before moving on"
        ]
      },
      {
        name: "Real-World Applications",
        description: "Examples of how the concept applies in practical terms.",
        example: "In pharmaceuticals, quantum computers could simulate molecular structures to develop new medicines in days rather than years. In finance, they could optimize trading strategies across countless variables simultaneously.",
        tips: [
          "Use concrete examples relevant to readers",
          "Connect abstract concepts to daily life",
          "Include diverse applications across fields"
        ]
      },
      {
        name: "Common Misconceptions",
        description: "Clarification of frequently misunderstood aspects.",
        example: "Contrary to popular belief, quantum computers won't replace regular computers for most tasks. They excel at specific problems like factoring large numbers, but are inefficient for everyday computing needs.",
        tips: [
          "Address widespread misunderstandings directly",
          "Explain the origin of misconceptions when relevant",
          "Provide the correct information clearly"
        ]
      },
      {
        name: "Future Implications",
        description: "How the topic might develop or impact society going forward.",
        example: "As quantum computers grow more powerful, they could break current encryption methods, necessitating new cybersecurity approaches. This has prompted governments worldwide to invest in 'quantum-safe' encryption standards.",
        tips: [
          "Distinguish between near-term and long-term implications",
          "Acknowledge uncertainty where appropriate",
          "Include diverse expert perspectives"
        ]
      }
    ],
    bestPractices: [
      "Start with what readers already know and build from there",
      "Use plain language whenever possible",
      "Define all technical terms when first used",
      "Use helpful metaphors and analogies",
      "Include visualizations for complex concepts",
      "Break information into digestible chunks",
      "Answer the questions readers are most likely to have"
    ],
    examples: [
      {
        title: "The Coronavirus, Explained",
        url: "https://www.vox.com/coronavirus-covid19",
        publication: "Vox"
      },
      {
        title: "What is climate change? A really simple guide",
        url: "https://www.bbc.com/news/science-environment-24021772",
        publication: "BBC"
      }
    ],
    fullTemplate: `# [CLEAR QUESTION OR STATEMENT HEADLINE]

[INTRODUCTION - Why this topic matters and brief overview]

## What is [Topic]?

[CORE DEFINITION in plain language]

[ANALOGY or COMPARISON to something familiar]

## Brief History

[RELEVANT HISTORICAL CONTEXT in 1-2 paragraphs]

## Key Components of [Topic]

### 1. [First Key Component]
[EXPLANATION with examples]

### 2. [Second Key Component]
[EXPLANATION with examples]

### 3. [Third Key Component]
[EXPLANATION with examples]

## How [Topic] Works in Real Life

[PRACTICAL APPLICATIONS and examples]

[VISUAL REPRESENTATION or diagram would appear here]

## Common Misconceptions

1. **Myth:** [Common misconception]
   **Reality:** [Accurate explanation]

2. **Myth:** [Common misconception]
   **Reality:** [Accurate explanation]

## Why [Topic] Matters

[RELEVANCE to readers' lives]

[FUTURE IMPLICATIONS and developments]

## Further Reading

[RESOURCES for more information]

---
**Expert Contributors:** [Names and credentials]`
  },
  {
    id: "oped",
    name: "Op-Ed",
    description: "An opinion piece expressing a specific viewpoint or stance on an issue, often persuasive in nature.",
    wordCountRange: "600-800 words",
    sections: [
      {
        name: "Headline",
        description: "Clear statement of the opinion or argument being made.",
        example: "Why We Must Address Climate Change Today",
        tips: [
          "Make your stance clear from the headline",
          "Use strong, decisive language",
          "Consider using 'I' or 'We' to establish personal perspective"
        ]
      },
      {
        name: "Introduction",
        description: "Opening that presents the issue and clearly states your position.",
        example: "As wildfires rage across three continents and cities face unprecedented flooding, I believe we can no longer afford to debate whether climate action is necessary--only how quickly we can implement it.",
        tips: [
          "Establish your credibility on the topic",
          "State your thesis/position clearly",
          "Use a compelling hook to draw readers in"
        ]
      },
      {
        name: "Personal Connection",
        description: "Explain your personal stake or interest in the issue.",
        example: "Having grown up in coastal Florida, I've witnessed firsthand how rising sea levels are transforming communities from stable neighborhoods into flood zones.",
        tips: [
          "Share relevant personal experiences",
          "Explain what motivated your interest in this topic",
          "Establish why readers should care about your perspective"
        ]
      },
      {
        name: "Supporting Arguments",
        description: "Present evidence and reasoning that supports your position.",
        example: "The economic argument alone is compelling: A recent study from Stanford University found that for every dollar spent on climate mitigation today, we save approximately seven dollars in disaster response costs within the next decade.",
        tips: [
          "Use facts, statistics, and expert opinions",
          "Address potential counterarguments preemptively",
          "Connect arguments to real-world implications"
        ]
      },
      {
        name: "Opposing Viewpoints",
        description: "Acknowledge and address counterarguments fairly.",
        example: "Critics argue that immediate climate action would harm economic growth and cost jobs. While transition costs are real, studies consistently show that green technology sectors create more jobs than traditional fossil fuel industries.",
        tips: [
          "Present opposing views accurately and fairly",
          "Respond with reasoned arguments, not dismissal",
          "Show you've considered multiple perspectives"
        ]
      },
      {
        name: "Call to Action",
        description: "Specific steps or changes you advocate for.",
        example: "We need three immediate policy changes: First, a carbon fee and dividend program that incentivizes clean energy while protecting low-income households. Second, infrastructure investment focused on resilience and renewable energy. Third, international climate financing to support developing nations.",
        tips: [
          "Be specific about what should happen",
          "Make suggestions that are actionable",
          "Consider multiple levels of action (individual, community, policy)"
        ]
      },
      {
        name: "Conclusion",
        description: "Reinforces your main argument and leaves a lasting impression.",
        example: "The climate crisis presents not just challenges, but opportunities to create a more equitable and sustainable world. The question is not whether we can afford to act, but whether we can afford not to.",
        tips: [
          "Reinforce your main argument",
          "End with something memorable",
          "Avoid introducing new arguments"
        ]
      }
    ],
    bestPractices: [
      "Clearly identify your opinion as such, not as objective fact",
      "Use first-person perspective where appropriate",
      "Support opinions with evidence and reasoned arguments",
      "Consider and address opposing viewpoints fairly",
      "Focus on one main argument rather than multiple issues",
      "Avoid overly academic or technical language",
      "Include a specific call to action when possible"
    ],
    examples: [
      {
        title: "The Future Is Being Built in America",
        url: "https://www.nytimes.com/2023/08/14/opinion/biden-economy-semiconductors-climate-change-infrastructure.html",
        publication: "The New York Times"
      },
      {
        title: "I'm a Conservative Christian Environmentalist. We Need to Talk",
        url: "https://www.washingtonpost.com/opinions/2022/05/03/conservative-christian-environmentalist-climate-change/",
        publication: "The Washington Post"
      }
    ],
    fullTemplate: `# [STRONG OPINION STATEMENT HEADLINE]

[INTRODUCTION - State your position clearly and why it matters]

## Personal Perspective

[Share your personal connection or interest in the issue]

## Why This Matters

[Explain the broader significance of the issue]

## The Case For [Your Position]

[SUPPORTING EVIDENCE POINT 1]

[SUPPORTING EVIDENCE POINT 2]

[SUPPORTING EVIDENCE POINT 3]

## Addressing Concerns

[Acknowledge and respond to opposing viewpoints]

## What Should Be Done

[Specific recommendations or call to action]

## Conclusion

[Reinforce main argument and end with something memorable]

---
*[Author name] is [brief credentials relevant to the topic].*`
  },
  {
    id: "hitpiece",
    name: "Critical Analysis",
    description: "A detailed examination of a subject that highlights significant failures, controversies, or concerning aspects.",
    wordCountRange: "1,000-1,500 words",
    sections: [
      {
        name: "Headline",
        description: "Direct statement that signals the critical nature of the piece.",
        example: "Inside TechCorp's Toxic Culture: How Leadership Failed Its Employees",
        tips: [
          "Be direct without being sensationalist",
          "Use strong but factual language",
          "Focus on the substantive issue, not personal attacks"
        ]
      },
      {
        name: "Introduction",
        description: "Set up the subject and the key problems to be examined.",
        example: "TechCorp, once hailed as a model employer, has seen an exodus of talent and multiple discrimination lawsuits in the past year. Interviews with 24 current and former employees reveal a pattern of problematic leadership decisions that created a hostile work environment.",
        tips: [
          "Establish what's at stake",
          "Provide context for why this critique matters",
          "Preview the main findings"
        ]
      },
      {
        name: "Background",
        description: "Necessary context about the subject and prior reputation.",
        example: "Founded in 2010, TechCorp grew rapidly under CEO James Miller, reaching a valuation of $2 billion by 2018. The company frequently topped 'Best Places to Work' lists and was praised for its innovative management style--an image now at odds with internal reality.",
        tips: [
          "Provide relevant history",
          "Establish the gap between perception and reality",
          "Include neutral information about the subject"
        ]
      },
      {
        name: "Evidence of Problems",
        description: "Well-documented examples of the issues being critiqued.",
        example: "Internal documents obtained by this publication show that between 2020-2022, reports of harassment to HR increased by 300%, while the company's response time to these complaints doubled.",
        tips: [
          "Rely on primary sources and documents when possible",
          "Use multiple examples to establish patterns",
          "Be specific rather than making general accusations",
          "Include direct quotes from affected parties"
        ]
      },
      {
        name: "Impact Assessment",
        description: "Analysis of how these problems affect stakeholders.",
        example: "The company's failure to address these issues has resulted in measurable harm: a 40% staff turnover rate, legal costs exceeding $5 million, and a product development cycle that has fallen significantly behind competitors.",
        tips: [
          "Quantify impact when possible",
          "Consider multiple stakeholder perspectives",
          "Connect specific problems to specific outcomes"
        ]
      },
      {
        name: "Response from Subject",
        description: "The subject's perspective or defense.",
        example: "When presented with these findings, TechCorp spokesperson Maria Chen stated that the company is \"taking these concerns seriously\" and has \"implemented new training programs.\" However, former HR director Thomas Wang, who left in March, described these measures as \"cosmetic changes that don't address structural problems.\"",
        tips: [
          "Always seek comment from the subject of criticism",
          "Present their response fairly",
          "Provide context or fact-checking for responses"
        ]
      },
      {
        name: "Systemic Analysis",
        description: "Broader context or pattern that this case represents.",
        example: "TechCorp's issues reflect a pattern seen across the tech industry, where rapid growth often outpaces the development of proper governance structures and accountability mechanisms.",
        tips: [
          "Connect specific case to larger trends or issues",
          "Avoid making the piece solely about one individual",
          "Consider industry standards or best practices as reference points"
        ]
      },
      {
        name: "Conclusion",
        description: "Summary of findings and implications.",
        example: "While TechCorp publicly champions innovation and employee wellbeing, the evidence shows a significant gap between rhetoric and reality. Until leadership addresses these systemic issues, the company risks continued talent loss, legal exposure, and erosion of its market position.",
        tips: [
          "Restate the key issues identified",
          "Avoid unnecessary personal attacks",
          "Focus on accountability and necessary changes"
        ]
      }
    ],
    bestPractices: [
      "Focus criticism on actions, policies, and patterns rather than personal attacks",
      "Verify all facts rigorously and from multiple sources",
      "Give the subject ample opportunity to respond to criticisms",
      "Distinguish between facts and opinions in your writing",
      "Consider potential legal issues (defamation, libel) and ensure claims are defensible",
      "Maintain professional tone even when delivering harsh criticism",
      "Include context about why these criticisms matter to the public interest"
    ],
    examples: [
      {
        title: "The Black Box Economy",
        url: "https://www.propublica.org/article/the-secret-irs-files-trove-of-never-before-seen-records-reveal-how-the-wealthiest-avoid-income-tax",
        publication: "ProPublica"
      },
      {
        title: "Amazon's System to Rate Workers",
        url: "https://www.nytimes.com/interactive/2021/06/15/us/amazon-workers.html",
        publication: "The New York Times"
      }
    ],
    fullTemplate: `# [CRITICAL HEADLINE FOCUSED ON THE ISSUE]

[INTRODUCTION - Establish the subject and key problems]

## Background

[Context about the subject and their prior reputation]

## The Problems

### Issue One: [Specific Problem]
[Detailed evidence and examples]

### Issue Two: [Specific Problem]
[Detailed evidence and examples]

### Issue Three: [Specific Problem]
[Detailed evidence and examples]

## Impact and Consequences

[How these issues affect stakeholders]

## The Response

[Subject's perspective or defense and analysis]

## Broader Implications

[Systemic issues this case represents]

## Conclusion

[Summary of findings and why they matter]

---
*This reporting is based on [describe sources: documents, interviews, etc.]*`
  }
];
