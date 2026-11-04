import { fireEvent, render, screen } from '@testing-library/react'
import { Knopfleiste } from './Knopfleiste'

/** Am PC versteckt = Klasse «sm:hidden» am umgebenden Element (jsdom kennt keine Bildschirmbreite). */
function amPcVersteckt(name: string): boolean {
  return screen.getByRole('button', { name }).parentElement?.className.split(' ').includes('sm:hidden') ?? false
}

describe('Knopfleiste', () => {
  const knoepfe = ['Eins', 'Zwei', 'Drei', 'Vier', 'Fünf', 'Haupt'].map((n) => (
    <button key={n} type="button">
      {n}
    </button>
  ))

  it('zeigt am PC die Hauptaktion und zwei weitere, den Rest unter «Mehr»', () => {
    render(<Knopfleiste>{knoepfe}</Knopfleiste>)
    expect(amPcVersteckt('Haupt')).toBe(false)
    expect(amPcVersteckt('Eins')).toBe(false)
    expect(amPcVersteckt('Zwei')).toBe(false)
    expect(amPcVersteckt('Drei')).toBe(true)
    expect(amPcVersteckt('Fünf')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: /knopfleiste.mehr|Mehr/ }))
    expect(amPcVersteckt('Drei')).toBe(false)
  })

  it('braucht bei wenigen Knöpfen am PC kein «Mehr»', () => {
    render(<Knopfleiste>{knoepfe.slice(0, 4)}</Knopfleiste>)
    const mehr = screen.getByRole('button', { name: /knopfleiste.mehr|Mehr/ })
    expect(mehr.className.split(' ')).toContain('sm:hidden')
  })
})
