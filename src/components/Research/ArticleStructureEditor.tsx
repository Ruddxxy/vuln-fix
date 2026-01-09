"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  FileText,
  Layout,
  List,
  Info,
  AlertCircle,
  HelpCircle,
  Copy,
  CheckCircle,
  ExternalLink
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/Button";
import { useToast } from "@/components/ui/use-toast";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { articleTemplates } from "@/data/articleTemplates";

interface ArticleStructureEditorProps {
  onApplyTemplate: (template: string) => void;
}

export default function ArticleStructureEditor({ onApplyTemplate }: ArticleStructureEditorProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("news");
  const [customTemplate, setCustomTemplate] = useState<string>("");
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [opinionBias, setOpinionBias] = useState<string>("");
  const [showOpinionInput, setShowOpinionInput] = useState(false);

  // Use imported templates from data file
  const templates = articleTemplates;

  // Find currently selected template
  const selectedTemplate = templates.find(template => template.id === selectedTemplateId) || templates[0];

  useEffect(() => {
    // Show opinion input field for opinion-based templates
    setShowOpinionInput(selectedTemplateId === "oped");
  }, [selectedTemplateId]);

  // Handle applying a template to the main editor
  const handleApplyTemplate = () => {
    let template = selectedTemplate.fullTemplate;

    // If it's an opinion piece and has bias input, inject the bias/stance
    if (showOpinionInput && opinionBias) {
      template = template.replace('[INTRODUCTION - State your position clearly and why it matters]',
        `[INTRODUCTION - State your position clearly and why it matters]\n\nStance/Opinion: ${opinionBias}`);
    }

    if (onApplyTemplate) {
      onApplyTemplate(template);
      toast({
        title: "Template Applied",
        description: "Article structure template has been applied to the editor."
      });
    }
  };

  // Copy section example to clipboard
  const handleCopySection = (text: string, sectionName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionName);

    toast({
      title: "Copied to clipboard",
      description: `${sectionName} example copied to clipboard.`
    });

    setTimeout(() => {
      setCopiedSection(null);
    }, 2000);
  };

  // Handle copying the full template
  const handleCopyFullTemplate = () => {
    navigator.clipboard.writeText(selectedTemplate.fullTemplate);

    toast({
      title: "Full template copied",
      description: `The ${selectedTemplate.name} template has been copied to clipboard.`
    });
  };

  return (
    <Card className="w-full mt-4">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Layout className="h-5 w-5 text-muted-foreground" />
          Article Structure Editor
        </CardTitle>
        <CardDescription>
          Templates and guidelines for different journalistic formats.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="templates">Article Templates</TabsTrigger>
            <TabsTrigger value="custom">Custom Template</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <div className="flex items-center gap-2 mt-4">
              <Label htmlFor="template-select" className="min-w-[120px]">
                Select Format:
              </Label>
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger id="template-select" className="w-full">
                  <SelectValue placeholder="Select a format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Article Types</SelectLabel>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({template.wordCountRange})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Show opinion bias input for opinion articles */}
            {showOpinionInput && (
              <div className="flex flex-col space-y-2 mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <Label htmlFor="opinion-bias" className="font-medium">
                  Your Opinion/Stance:
                </Label>
                <div className="flex gap-2">
                  <Textarea
                    id="opinion-bias"
                    placeholder="Enter your specific opinion or stance on this topic. For example: 'I believe renewable energy should be prioritized over fossil fuels'"
                    value={opinionBias}
                    onChange={(e) => setOpinionBias(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Info className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p>For opinion pieces, clearly state your position or stance on the issue.
                        This will help the AI generate content that reflects your viewpoint.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            )}

            <div className="border rounded-md p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedTemplate.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedTemplate.description}
                  </p>
                  <p className="text-xs mt-1">
                    Recommended length: <strong>{selectedTemplate.wordCountRange}</strong>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={handleCopyFullTemplate}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy Template
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1"
                    onClick={handleApplyTemplate}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Apply Template
                  </Button>
                </div>
              </div>

              <Accordion type="single" collapsible className="w-full mt-4">
                <AccordionItem value="sections">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      <List className="h-4 w-4" />
                      Article Sections
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 mt-2">
                      {selectedTemplate.sections.map((section, index) => (
                        <div key={index} className="border rounded-md p-3">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium text-sm">{section.name}</h4>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleCopySection(section.example, section.name)}
                                  >
                                    {copiedSection === section.name ? (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <Copy className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Copy example to clipboard
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>

                          <p className="text-sm text-muted-foreground mt-1">
                            {section.description}
                          </p>

                          <div className="mt-2 bg-muted p-2 rounded-md text-sm">
                            <strong>Example:</strong> {section.example}
                          </div>

                          <div className="mt-2">
                            <h5 className="text-xs font-medium flex items-center gap-1">
                              <HelpCircle className="h-3 w-3" />
                              Tips:
                            </h5>
                            <ul className="mt-1 text-xs space-y-1">
                              {section.tips.map((tip, tipIndex) => (
                                <li key={tipIndex} className="flex items-start gap-1">
                                  <span className="text-muted-foreground pt-0.5">*</span>
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="best-practices">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Best Practices
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2 mt-2">
                      {selectedTemplate.bestPractices.map((practice, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-muted-foreground pt-1">*</span>
                          <span>{practice}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="examples">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Example Articles
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2 mt-2">
                      {selectedTemplate.examples.map((example, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <ExternalLink className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div>
                            <a
                              href={example.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {example.title}
                            </a>
                            {example.publication && (
                              <span className="text-sm text-muted-foreground ml-1">
                                ({example.publication})
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="full-template">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Full Template
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="border rounded-md p-3 mt-2">
                      <pre className="whitespace-pre-wrap text-sm font-mono overflow-auto max-h-[400px]">
                        {selectedTemplate.fullTemplate}
                      </pre>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div className="border rounded-md p-4">
              <h3 className="text-md font-semibold mb-2">Create Custom Template</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Design your own article structure using Markdown formatting.
              </p>

              <Textarea
                value={customTemplate}
                onChange={(e) => setCustomTemplate(e.target.value)}
                placeholder="# [HEADLINE]

[Introduction paragraph]

## Key Points

- [Point 1]
- [Point 2]
- [Point 3]

## Section 1

[Content for section 1]

## Section 2

[Content for section 2]

---
**Sources:** [List sources]"
                className="min-h-[300px] font-mono text-sm"
              />

              <div className="flex justify-end mt-4">
                <Button
                  onClick={handleApplyTemplate}
                  disabled={!customTemplate.trim()}
                  className="gap-1"
                >
                  <FileText className="h-4 w-4" />
                  Apply Custom Template
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="border-t pt-4 flex justify-between">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
          <p className="text-xs text-muted-foreground">
            These templates are starting points. Adapt them to fit your specific story and publication's style.
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}
