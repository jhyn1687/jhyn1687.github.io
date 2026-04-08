import {
  FaEnvelope,
  FaFileAlt,
  FaExternalLinkAlt,
  FaGithub,
  FaLinkedin,
  FaYoutube,
} from "react-icons/fa";
import type { IconType } from "react-icons";

const icons: Record<string, IconType> = {
  mail: FaEnvelope,
  "file-text": FaFileAlt,
  "external-link": FaExternalLinkAlt,
  github: FaGithub,
  linkedin: FaLinkedin,
  youtube: FaYoutube,
};

export function Icon({
  name,
  size = 16,
}: {
  name: string | null;
  size?: number;
}) {
  if (!name) return null;
  const IconComponent = icons[name];
  if (!IconComponent) return null;
  return <IconComponent size={size} />;
}
