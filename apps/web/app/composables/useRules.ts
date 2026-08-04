/**
 * Texte des règles montré au joueur — source unique, partagée par le panneau de
 * l'accueil et par la modale du plateau. Ce n'est qu'un résumé de lecture : le
 * barème qui fait foi reste celui de `packages/engine`.
 */
import { WINNING_SCORE } from '@rf/engine'

export const useRules = () => {
  const rules: string[] = [
    `Le premier à ${WINNING_SCORE} points déclenche le dernier tour — le meilleur score l'emporte.`,
    'Trois têtes de mort et le tour est perdu : les têtes sont maudites, impossible de les relancer.',
    'Une relance se fait avec au moins deux dés ; garde ceux qui rapportent.',
    'Trois symboles identiques ou plus rapportent des points (100 pour 3, jusqu’à 4000 pour 8).',
    'Chaque pièce d’or et chaque diamant valent 100 points de plus.',
    'Les 8 dés sur la même valeur : coffre au trésor plein, +500 points.',
    'Quatre têtes de mort au premier lancer, et te voilà sur l’Île de la Tête-de-Mort : tes adversaires trinquent.'
  ]

  return { rules }
}
