import { Image, type ImageProps } from 'expo-image';
import { useState } from 'react';
import { darkTeamLogo } from '@/lib/team-logo';

type Props = Omit<ImageProps, 'source'> & { logo?: string | null };

export function TeamLogo({ logo, onError, ...props }: Props) {
  const preferred = logo ? darkTeamLogo(logo) : undefined;
  const [failedVariant, setFailedVariant] = useState<string>();
  if (!logo) return null;
  const uri = failedVariant === preferred ? logo : preferred;
  return <Image {...props} source={{ uri }} accessibilityIgnoresInvertColors
    onError={event => {
      // Missing variants and network failures fall back once. A different team
      // gets its own dark-logo attempt, even when React reuses this component.
      if (uri !== logo) setFailedVariant(preferred);
      else onError?.(event);
    }} />;
}
