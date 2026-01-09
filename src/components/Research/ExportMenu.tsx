"use client";

import { useTranslation } from "react-i18next";
import { Download, FileText, Signature, FileJson, FileCode, FileType } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { downloadFile, exportAsJSON, exportAsHTML, exportAsPlainText, ExportData } from "@/utils/file";
import { Claim } from "./ClaimsVerificationPanel";
import { Source } from "@/types.d";

interface ExportMenuProps {
  title: string;
  finalReport: string;
  sources: Source[];
  claims: Claim[];
  articleType: string;
  getFinalReportContent: () => string;
  getSocialMediaContent: (platform: 'facebook' | 'twitter' | 'linkedin' | 'whatsapp') => string;
}

function ExportMenu({
  title,
  finalReport,
  sources,
  claims,
  articleType,
  getFinalReportContent,
  getSocialMediaContent,
}: ExportMenuProps) {
  const { t } = useTranslation();

  function handleDownloadPDF() {
    const originalTitle = document.title;
    document.title = title;
    window.print();
    document.title = originalTitle;
  }

  function createExportData(): ExportData {
    return {
      title,
      finalReport,
      sources,
      claims: claims.map(c => ({ id: c.id, text: c.text, status: c.status, details: c.details })),
      metadata: {
        articleType: articleType || 'news',
        createdAt: new Date().toISOString(),
        wordCount: finalReport.split(/\s+/).length
      }
    };
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          {t("editor.export")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Document Formats</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() =>
            downloadFile(
              getFinalReportContent(),
              `${title}.md`,
              "text/markdown;charset=utf-8"
            )
          }
        >
          <FileText className="mr-2 h-4 w-4" />
          <span>Markdown (.md)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadPDF}>
          <Signature className="mr-2 h-4 w-4" />
          <span>Print / Save as PDF</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            downloadFile(
              exportAsJSON(createExportData()),
              `${title}.json`,
              "application/json;charset=utf-8"
            );
          }}
        >
          <FileJson className="mr-2 h-4 w-4" />
          <span>JSON (.json)</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            downloadFile(
              exportAsHTML(createExportData()),
              `${title}.html`,
              "text/html;charset=utf-8"
            );
          }}
        >
          <FileCode className="mr-2 h-4 w-4" />
          <span>HTML (.html)</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            downloadFile(
              exportAsPlainText(createExportData()),
              `${title}.txt`,
              "text/plain;charset=utf-8"
            );
          }}
        >
          <FileType className="mr-2 h-4 w-4" />
          <span>Plain Text (.txt)</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Export Options</DropdownMenuLabel>

        <DropdownMenuItem
          onClick={() => {
            const allFormats = {
              twitter: getSocialMediaContent('twitter'),
              facebook: getSocialMediaContent('facebook'),
              linkedin: getSocialMediaContent('linkedin'),
              whatsapp: getSocialMediaContent('whatsapp'),
              full: finalReport
            };

            const formattedContent = `# Social Media Export for "${title}"\n\n## Twitter/X Post\n\`\`\`\n${allFormats.twitter}\n\`\`\`\n\n## Facebook Post\n\`\`\`\n${allFormats.facebook}\n\`\`\`\n\n## LinkedIn Post\n\`\`\`\n${allFormats.linkedin}\n\`\`\`\n\n## WhatsApp Message\n\`\`\`\n${allFormats.whatsapp}\n\`\`\`\n\n## Full Article\n\`\`\`\n${allFormats.full}\n\`\`\`\n`;

            downloadFile(
              formattedContent,
              `${title}_social_media_kit.md`,
              "text/markdown;charset=utf-8"
            );

            toast.success("Social Media Kit downloaded");
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          <span>Download Social Media Kit</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ExportMenu;
