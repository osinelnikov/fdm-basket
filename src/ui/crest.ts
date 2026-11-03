import { TEAMS } from '../data/fixtures.ts';
import type { TeamId } from '../data/types.ts';
import { teamName } from '../i18n';
import type { ViewContext } from './context.ts';
import { esc } from './format.ts';

export function crest(team: TeamId, { lang, t }: ViewContext): string {
  const info = TEAMS[team];
  const name = teamName(team, lang);
  const alt = info.isClubLogo ? t.crestAltLogo(name) : t.crestAltArms(name, info.town);
  return `<span class="crest"><img src="${info.crest}" alt="${esc(alt)}" title="${esc(info.official)}" width="32" height="32" loading="lazy"></span>`;
}
