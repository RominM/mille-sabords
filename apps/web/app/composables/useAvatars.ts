/**
 * Portraits proposés aux joueurs. Source unique : la mise en place solo et la
 * composition de l'équipage au lobby doivent offrir exactement le même choix.
 *
 * `chara_bot` en est absent volontairement — c'est le visage du Corsaire, et
 * deux portraits identiques à table prêteraient à confusion.
 */
import botAvatar from '~/assets/images/character/chara_bot.webp'
import darkPirate from '~/assets/images/character/chara_dark-pirate.webp'
import oldPirate from '~/assets/images/character/chara_old-pirate.webp'
import pirate from '~/assets/images/character/chara_pirate.webp'
import youngMan from '~/assets/images/character/chara_men-young.webp'
import youngWoman from '~/assets/images/character/chara_women-young.webp'

export interface AvatarChoice {
  src: string
  label: string
}

const AVATARS: AvatarChoice[] = [
  { src: pirate, label: 'Pirate' },
  { src: darkPirate, label: 'Pirate sombre' },
  { src: oldPirate, label: 'Vieux loup de mer' },
  { src: youngMan, label: 'Jeune moussaillon' },
  { src: youngWoman, label: 'Jeune moussaillonne' }
]

export const useAvatars = () => ({
  avatars: AVATARS,
  defaultAvatar: AVATARS[0]!.src,
  /** Visage du Corsaire : hors du choix, mais affiché sur ses sièges. */
  botAvatar
})
