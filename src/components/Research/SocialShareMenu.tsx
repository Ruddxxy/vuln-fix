"use client";

import { toast } from "sonner";
import { Twitter, Facebook, Linkedin, MessageSquare, Share2 } from "lucide-react";
import { Button } from "@/components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface SocialShareMenuProps {
  title: string;
  finalReport: string;
}

function SocialShareMenu({ title, finalReport }: SocialShareMenuProps) {
  function getSocialMediaContent(platform: 'facebook' | 'twitter' | 'linkedin' | 'whatsapp'): string {
    const content = finalReport;

    // Extract first paragraph for summary
    const paragraphs = content.split('\n\n');
    let firstPara = "";
    for (const para of paragraphs) {
      if (!para.startsWith('#') && para.trim().length > 20) {
        firstPara = para;
        break;
      }
    }

    // Extract title without markdown
    const cleanTitle = title.replace(/^#\s+/, '').replace(/\*\*/g, '');

    switch (platform) {
      case 'twitter':
        // Twitter has 280 char limit
        return `${cleanTitle}\n\n${firstPara.substring(0, Math.min(firstPara.length, 200))}${firstPara.length > 200 ? '...' : ''}\n\n#journalism #research`;

      case 'facebook':
        // Facebook allows longer posts but still needs conciseness
        // Extract first 3 paragraphs that aren't headers
        const fbParagraphs = paragraphs.filter(p => !p.startsWith('#') && p.trim().length > 0).slice(0, 3);
        return `${cleanTitle}\n\n${fbParagraphs.join('\n\n')}${paragraphs.length > 3 ? '\n\n(See full article for more...)' : ''}`;

      case 'linkedin':
        // LinkedIn allows professional longer-form content
        // Include title, intro paragraph, and bullet points if available
        const bulletPoints = content.match(/[*-]\s.+/g) || [];
        const bulletSection = bulletPoints.length > 0
          ? `\n\nKey points:\n${bulletPoints.slice(0, 5).join('\n')}${bulletPoints.length > 5 ? '\n...' : ''}`
          : '';

        return `${cleanTitle}\n\n${firstPara}${bulletSection}\n\n#journalism #research #professional`;

      case 'whatsapp':
        // WhatsApp needs more compact content
        return `*${cleanTitle}*\n\n${firstPara.substring(0, Math.min(firstPara.length, 300))}${firstPara.length > 300 ? '...' : ''}\n\n_Generated with Deep Journalist_`;

      default:
        return content;
    }
  }

  const handleCopyForPlatform = (platform: 'facebook' | 'twitter' | 'linkedin' | 'whatsapp') => {
    const content = getSocialMediaContent(platform);
    navigator.clipboard.writeText(content);

    const platformNames = {
      twitter: 'Twitter',
      facebook: 'Facebook',
      linkedin: 'LinkedIn',
      whatsapp: 'WhatsApp'
    };

    toast.success(`${platformNames[platform]} post copied to clipboard`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Share to Social Media</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => handleCopyForPlatform('twitter')}>
          <Twitter className="mr-2 h-4 w-4" />
          <span>X/Twitter</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleCopyForPlatform('facebook')}>
          <Facebook className="mr-2 h-4 w-4" />
          <span>Facebook</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleCopyForPlatform('linkedin')}>
          <Linkedin className="mr-2 h-4 w-4" />
          <span>LinkedIn</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleCopyForPlatform('whatsapp')}>
          <MessageSquare className="mr-2 h-4 w-4" />
          <span>WhatsApp</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default SocialShareMenu;
export { SocialShareMenu };
export type { SocialShareMenuProps };
