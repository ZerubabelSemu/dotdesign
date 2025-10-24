import {
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  Github,
  Globe,
  MessageCircle,
  Send,
  Phone as PhoneIcon,
  MessageSquare,
  Radio,
  Pin as PinIcon,
  Music2,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export type SocialPlatform = {
  platform: string;
  url: string;
};

const mapping: Array<{ match: RegExp; icon: LucideIcon; label: string }> = [
  { match: /instagram|ig/i, icon: Instagram, label: "Instagram" },
  { match: /facebook|fb/i, icon: Facebook, label: "Facebook" },
  { match: /twitter|x\.com|x\b/i, icon: Twitter, label: "Twitter" },
  { match: /linkedin|lnkd/i, icon: Linkedin, label: "LinkedIn" },
  { match: /youtube|yt/i, icon: Youtube, label: "YouTube" },
  { match: /github/i, icon: Github, label: "GitHub" },
  { match: /whatsapp|wa\.me/i, icon: MessageCircle, label: "WhatsApp" },
  { match: /telegram|t\.me/i, icon: Send, label: "Telegram" },
  { match: /pinterest|pin/i, icon: PinIcon, label: "Pinterest" },
  { match: /tiktok|douyin/i, icon: Music2, label: "TikTok" },
  { match: /viber|imo|wechat|line/i, icon: MessageSquare, label: "Chat" },
  { match: /call|phone|tel:/i, icon: PhoneIcon, label: "Phone" },
  { match: /radio|clubhouse/i, icon: Radio, label: "Radio" },
];

export const resolveSocialIcon = (platformOrUrl: string): { icon: LucideIcon; label: string } => {
  for (const m of mapping) {
    if (m.match.test(platformOrUrl)) return { icon: m.icon, label: m.label };
  }
  return { icon: Globe, label: "Website" };
};
