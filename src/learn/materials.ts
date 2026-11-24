import type { Lang } from '../i18n/types.ts';

/** A learning material: a page under /learn/ listed on the section's index. */
export interface Material {
  id: string;
  /** Page address with a leading and a trailing slash. */
  path: string;
  /** Languages the material itself is available in (some or all of the site's). */
  langs: readonly Lang[];
  text: Record<Lang, { title: string; summary: string }>;
}

export const MATERIALS: readonly Material[] = [
  {
    id: 'zone-tactics',
    path: '/learn/zone-tactics/',
    langs: ['en', 'it'],
    text: {
      en: {
        title: 'Zone defence and attack board',
        summary:
          'Interactive half-court board: the 2-1-2, 2-3, 3-2 and 1-3-1 zones, defensive rotations for every ball position, attacking schemes against each zone, and a step-by-step demo of the passes.',
      },
      it: {
        title: 'Lavagna tattica: difesa a zona e attacco',
        summary:
          'Lavagna interattiva a metà campo: le zone 2-1-2, 2-3, 3-2 e 1-3-1, le rotazioni difensive per ogni posizione della palla, gli schemi d’attacco contro ogni zona e una dimostrazione passo passo dei passaggi.',
      },
    },
  },
];

/** Link to a material in the given language. */
export const materialHref = (m: Material, lang: Lang): string => `${m.path}?lang=${lang}`;
