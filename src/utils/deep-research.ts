import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

// Helper to convert Zod schema to formatted JSON string
function schemaToJsonString(schema: z.ZodType): string {
  return JSON.stringify(zodToJsonSchema(schema), null, 4);
}

interface PromptConfig {
  systemContext: string;
  userInstructions: string;
  outputSchema?: z.ZodType;
  includeLanguage?: boolean;
}

function buildPrompt(config: PromptConfig, language?: string): string {
  const parts: string[] = [config.systemContext, config.userInstructions];
  
  if (config.outputSchema) {
    parts.push(`\n\n<output_format>\nRespond in JSON:\n${schemaToJsonString(config.outputSchema)}\n</output_format>`);
  }
  
  if (config.includeLanguage && language) {
    parts.push(`\n\nIMPORTANT: Respond in ${language}.`);
  }
  
  return parts.join('\n\n');
}

export function getSystemPrompt() {
  const now = new Date().toISOString();
  return `You are an expert journalist with deep research skills. Today is ${now}. Follow these instructions when responding:
- You may be asked to research subjects that is after your knowledge cutoff, assume the user is right when presented with news.
- You adhere strictly to the Society of Professional Journalists (SPJ) code of ethics:
  1. Seek Truth and Report It: Be accurate, thorough, and provide proper context.
  2. Minimize Harm: Consider the consequences of your reporting and respect privacy.
  3. Act Independently: Avoid conflicts of interest and disclose unavoidable conflicts.
  4. Be Accountable and Transparent: Explain your methodologies and correct errors promptly.
- Create balanced, fair reporting that presents multiple perspectives.
- Verify information from multiple sources, with special attention to primary sources.
- Distinguish between facts, analysis, and opinion.
- Be highly organized.
- Be proactive and anticipatory about information needs.
- Value good arguments over authorities.
- Consider contrarian ideas and challenge conventional narratives when warranted.
- Clearly attribute all claims to sources.
- Flag any speculation or prediction as such.`;
}

export function getOutputGuidelinesPrompt() {
  return `<OutputGuidelines>
Please strictly adhere to the following formatting guidelines when outputting text to ensure clarity, accuracy, and readability:

## 1. Structured Content

-   **Clear Paragraphs**: Organize different ideas or topics using clear paragraphs.
-   **Titles and Subtitles**: Use different levels of headings (e.g., H1, H2, H3) to divide the content's hierarchical structure, ensuring logical clarity.

## 2. Use of Markdown Syntax (if the platform supports it)

-   **Bold and Italics**: Use to emphasize keywords or concepts.
    -   For example: **Important Information** or *Emphasized Section*.
-   **Bulleted and Numbered Lists**: Use to list key points or steps.
    -   Unordered list:
        -   Item One
        -   Item Two
    -   Ordered list:
        1.  Step One
        2.  Step Two
-   **Code Blocks**: Use only for displaying code or content that needs to maintain its original format. Avoid placing mathematical formulas in code blocks.
    \`\`\`python
    def hello_world():
        print("Hello, World!")
    \`\`\`
-   **Quotes**: Use quote formatting when citing others' opinions or important information.
    > This is an example of a quote.
-   **Mathematical Formulas and Tables**:
    -   **Mathematical Formulas**:
        -   **Display Formulas**: Use double dollar signs \`$$\` or backslash \`$$\` and \`$$\` to wrap formulas, making them display independently on a new line.
            For example:
            $$
            A = \\begin{pmatrix}
            3 & 2 & 1 \\\\
            3 & 1 & 5 \\\\
            3 & 2 & 3 \\\\
            \\end{pmatrix}
            $$
        -   **Inline Formulas**: Use single dollar signs \`$\` to wrap formulas, making them display within the text line.
            For example: The matrix $A = \\begin{pmatrix} 3 & 2 & 1 \\\\ 3 & 1 & 5 \\\\ 3 & 2 & 3 \\end{pmatrix}$ is a $3 \\times 3$ matrix.
    -   **Tables**: Use Markdown tables to display structured data, ensuring information is aligned and easy to compare.
        For example:

        | Name | Age | Occupation |
        |------|-----|------------|
        | John Doe | 28 | Engineer   |
        | Jane Smith | 34 | Designer   |

## 3. Fractions and Mathematical Representation

-   **Consistency**: Maintain consistency in the representation of fractions, prioritizing simplified forms.
    -   For example: Use \`-8/11\` instead of \`-16/22\`.
-   **Uniform Format**: Use either fraction or decimal forms consistently throughout the text, avoiding mixing them.

## 4. Detailed Explanations

-   **Step-by-Step Instructions**: Add brief explanations to each key step, explaining why the operation is being performed to help readers understand the reasoning behind it.
    -   For example: "Eliminate the first element of the second row by R2 = R2 - R1 to simplify the matrix."
-   **Mathematical Accuracy**: Ensure the accuracy of all mathematical calculations and results. Carefully check each step of the operation to avoid errors.

## 5. Consistency and Uniform Formatting

-   **Symbols and Abbreviations**: Use symbols and abbreviations consistently, avoiding different representations in the same document.
-   **Font and Style**: Maintain consistency in the font and style used throughout the text, such as using bold for headings and italics for emphasis.

## 6. Visual Aids

-   **Color and Emphasis**: Use color or other Markdown features appropriately to highlight key steps or results, enhancing visual impact (if the platform supports it).
-   **Spacing and Alignment**: Ensure reasonable spacing between text and elements, and align them neatly to improve overall aesthetics.

## 7. Adaptive Adjustments

-   Adjust formatting based on the content type. For example, technical documents may require more code examples and tables, while storytelling focuses on paragraphs and descriptions.
-   **Examples and Analogies**: Use examples, analogies, or diagrams as needed to explain complex concepts and enhance understanding.

**Important Notes**:

-   **Avoid placing mathematical formulas in code blocks**. Mathematical formulas should be displayed correctly in Markdown using LaTeX syntax.
-   **Ensure the correctness and formatting of mathematical formulas**, using appropriate symbols and environments to display complex mathematical expressions.

By strictly following the above formatting requirements, you can generate text that is clearly structured, accurate in content, uniformly formatted, and easy to read and understand, helping users more effectively obtain and understand the information they need.
</OutputGuidelines>`;
}

export function getSERPQuerySchema() {
  return z
    .array(
      z
        .object({
          query: z.string().describe("The SERP query."),
          researchGoal: z
            .string()
            .describe(
              "First talk about the goal of the research that this query is meant to accomplish, then go deeper into how to advance the research once the results are found, mention additional research directions. Be as specific as possible, especially for additional research directions. JSON reserved words should be escaped."
            ),
        })
        .required({ query: true, researchGoal: true })
    )
    .describe(`List of SERP queries.`);
}

export function getSourceSchema() {
  return z
    .array(
      z
        .object({
          url: z.string().describe("The source URL."),
          title: z.string().optional().describe("The source title, if available."),
          sourceType: z.enum(["primary", "secondary", "official", "analysis", "commentary"])
            .describe("The type of source (primary/direct accounts, secondary/indirect reports, official/government sources, analysis/expert interpretation, commentary/opinion)."),
          credibilityScore: z.number().min(1).max(10).optional()
            .describe("Credibility score on a scale of 1-10, with 10 being most credible."),
          publicationDate: z.string().optional()
            .describe("Publication date in YYYY-MM-DD format if available."),
          biasAssessment: z.string().optional()
            .describe("Assessment of any potential bias in the source."),
          authorName: z.string().optional()
            .describe("The name of the author, if available."),
          publisherName: z.string().optional()
            .describe("The name of the publisher or organization, if available."),
        })
        .required({ url: true, sourceType: true })
    )
    .describe(`List of sources with metadata.`);
}

export function generateQuestionsPrompt(query: string) {
  return [
    `Given the following journalistic inquiry, ask at least 5 follow-up questions to clarify the research direction: <query>${query}</query>`,
    `Questions should focus on:
1. Identifying key stakeholders and affected parties
2. Establishing a timeline of events
3. Uncovering potential conflicts of interest
4. Determining relevant historical context
5. Identifying primary sources and official documentation`,
    `Questions need to be brief and concise. No need to output content that is irrelevant to the question.`,
  ].join("\n\n");
}

export function generateJournalisticQueriesPrompt(query: string, inputType: string) {
  const SERPQuerySchema = getSERPQuerySchema();
  const outputSchema = schemaToJsonString(SERPQuerySchema);

  const isUrl = inputType === 'url';
  
  return [
    `Given the following ${isUrl ? 'article URL' : 'event summary'} from the user:\n<query>${query}</query>`,
    `Based on this input, generate a list of SERP queries to conduct thorough journalistic research. Focus on finding:
1. Primary sources and official statements
2. Conflicting accounts or perspectives 
3. Historical context and precedents
4. Expert analysis and factual verification
5. Follow-up developments and latest updates`,
    `Make sure each query is unique and designed to uncover different aspects of the story.`,
    `You MUST respond in \`JSON\` matching this \`JSON schema\`:\n\`\`\`json\n${outputSchema}\n\`\`\``,
    `Expected output:\n\`\`\`json\n[{query: "This is a sample query. ", researchGoal: "This is the reason for the query. "}]\n\`\`\``,
  ].join("\n\n");
}

export function processJournalisticSearchResultPrompt(query: string, researchGoal: string) {
  const SourceSchema = getSourceSchema();
  const outputSchema = schemaToJsonString(SourceSchema);

  return [
    `Please use the following query to get the latest information via google search tool:\n<query>${query}</query>`,
    `You need to organize the searched information according to the following requirements:\n<researchGoal>\n${researchGoal}\n</researchGoal>`,
    `You need to think like a professional journalist conducting research. Generate a list of key findings from the search results that adhere to journalistic standards. 

For each finding, provide:
1. Factual information with relevant details, dates, names, and statistics
2. Direct quotes with proper attribution when applicable
3. Conflicting viewpoints when they exist
4. Context necessary for understanding the information

Also evaluate each source you reference and provide metadata using this schema:`,
    `\`\`\`json\n${outputSchema}\n\`\`\``,
    `The findings and source evaluations will be used to craft a balanced journalistic article.`,
  ].join("\n\n");
}

export function reviewSerpQueriesPrompt(
  query: string,
  learnings: string[],
  suggestion: string
) {
  const SERPQuerySchema = getSERPQuerySchema();
  const outputSchema = schemaToJsonString(SERPQuerySchema);
  const learningsString = learnings
    .map((learning) => `<learning>\n${learning}\n</learning>`)
    .join("\n");
  return [
    `Given the following query from the user:\n<query>${query}</query>`,
    `Here are all the learnings from previous research:\n<learnings>\n${learningsString}\n</learnings>`,
    `This is the user's suggestion for research direction:\n<suggestion>\n${suggestion}\n</suggestion>`,
    `Based on previous research and user research suggestions, determine whether further research is needed for complete journalistic coverage. If further research is needed, list follow-up SERP queries focusing on:

1. Any information gaps or unanswered questions
2. Perspectives or stakeholders not yet represented
3. Verification of contested claims or facts
4. Historical context or precedents needed
5. Latest developments in the story

Make sure each query is unique and not similar to each other. If you believe no further research is needed for comprehensive coverage, you can output an empty queries array.`,
    `You MUST respond in \`JSON\` matching this \`JSON schema\`: \n\`\`\`json\n${outputSchema}\n\`\`\``,
    `Expected output:\n\`\`\`json\n[{query: "This is a sample query. ", researchGoal: "This is the reason for the query. "}]\n\`\`\``,
  ].join("\n\n");
}

export function writeJournalisticArticlePrompt(query: string, learnings: string[], articleType: string = "news") {
  const learningsString = learnings
    .map((learning) => `<learning>\n${learning}\n</learning>`)
    .join("\n");
  
  const getLengthGuideline = () => {
    switch(articleType) {
      case "news":
        return "500-800 words (focused, concise reporting)";
      case "feature":
        return "800-1,500 words (more depth, human interest)";
      case "investigative":
        return "1,500-2,500 words (comprehensive analysis)";
      case "explainer":
        return "800-1,200 words (contextual information)";
      default:
        return "800-1,200 words";
    }
  };
  
  const getStructureGuideline = () => {
    switch(articleType) {
      case "news":
        return "Follow the inverted pyramid structure, with the most important information first, followed by supporting details, and background/context last.";
      case "feature":
        return "Use a narrative structure with a compelling lead, engaging middle with human elements, and a satisfying conclusion.";
      case "investigative":
        return "Begin with key findings, then methodically present evidence, examine multiple perspectives, and conclude with implications.";
      case "explainer":
        return "Start with a clear definition of the topic, break down complex elements, address common questions, and provide context throughout.";
      default:
        return "Use a clear, logical structure appropriate for journalistic writing.";
    }
  };
  
  return [
    `Based on the following topic and research, write a journalistic ${articleType} article:\n<query>${query}</query>`,
    `Here are all the findings from research:\n<learnings>\n${learningsString}\n</learnings>`,
    `The article should be approximately ${getLengthGuideline()}.`,
    `${getStructureGuideline()}`,
    `Follow AP Style guidelines and these journalistic principles:
1. **Seek Truth and Report It**: Present facts accurately and in context. Distinguish between personal bias and professional judgment.
2. **Minimize Harm**: Show compassion and sensitivity toward those affected. Consider the consequences of reporting.
3. **Act Independently**: Avoid conflicts of interest and disclose unavoidable conflicts. Resist internal and external pressure.
4. **Be Accountable and Transparent**: Include a methodology section explaining how information was gathered and verified.`,
    `FORMAT GUIDELINES:
- Write a compelling headline
- Include a concise subheadline/deck
- Attribute all claims and quotes properly
- Use neutral language that avoids bias
- Present multiple perspectives when they exist
- End with a "Methodology" section explaining research methods, source evaluation, and any limitations`,
    `**DO NOT** output anything other than the journalistic article itself.`,
  ].join("\n\n");
}

// Export the helper functions for potential use in other modules
export { schemaToJsonString, buildPrompt, type PromptConfig };
