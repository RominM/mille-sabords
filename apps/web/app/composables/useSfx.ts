/**
 * Bruitages ponctuels déclenchés depuis le code, quand les directives
 * `v-click-sound` / `v-hover-sound` ne suffisent pas — un bouton qui a son
 * propre son, par exemple.
 *
 * Même réglage « Ambiance » que les directives : famille coupée, rien ne joue.
 */

/**
 * Gabarits décodés une seule fois par fichier. Chaque lecture en joue un CLONE :
 * un `Audio` unique et partagé se rembobinerait à chaque appel, donc deux
 * déclenchements rapprochés se couperaient l'un l'autre.
 */
const templates = new Map<string, HTMLAudioElement>()

export const useSfx = () => {
  const { sfxGain } = useSoundSettings()

  /** `gain` pondère ce son par rapport aux autres (1 = volume de référence). */
  const play = (src: string, gain = 1): void => {
    if (!import.meta.client) return

    const volume = Math.min(1, sfxGain.value * gain)
    // Coupé dans les réglages : on ne décode même pas le fichier.
    if (volume <= 0) return

    let template = templates.get(src)
    if (!template) {
      template = new Audio(src)
      template.preload = 'auto'
      templates.set(src, template)
    }
    const sound = template.cloneNode() as HTMLAudioElement
    sound.volume = volume
    // Un refus du navigateur (politique d'autoplay) ne doit jamais casser l'UI.
    void sound.play().catch(() => {})
  }

  return { play }
}
