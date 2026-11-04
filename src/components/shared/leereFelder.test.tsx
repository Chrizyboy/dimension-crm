import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AkteAbschnitt, Angabe } from './AkteAbschnitt'
import { istLeer } from './leereZeile'

describe('istLeer', () => {
  it('erkennt leere Werte, Platzhalter und leere Eingabefelder', () => {
    expect(istLeer(null)).toBe(true)
    expect(istLeer('–')).toBe(true)
    expect(istLeer('Muri')).toBe(false)
    expect(istLeer(<input value="" readOnly />)).toBe(true)
    expect(istLeer(<input value="x" readOnly />)).toBe(false)
    expect(istLeer(<span>Text</span>)).toBe(false)
  })
})

describe('LeereFelderBereich in einer Akte', () => {
  it('zeigt leere Angaben erst nach «+ weitere Angaben»', () => {
    render(
      <AkteAbschnitt titel="Kontakt">
        <dl>
          <Angabe label="Telefon">+41 76 123 45 67</Angabe>
          <Angabe label="E-Mail">–</Angabe>
          <Angabe label="Region" leer>
            <select aria-label="Region" />
          </Angabe>
        </dl>
      </AkteAbschnitt>,
    )
    expect(screen.getByText('Telefon')).toBeVisible()
    expect(screen.queryByText('E-Mail')).not.toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: /2 weitere Angaben/ }))
    expect(screen.getByText('E-Mail')).toBeVisible()
    expect(screen.getByLabelText('Region')).toBeVisible()
  })
})
