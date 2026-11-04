import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Reiter, ReiterKnopf, ReiterListe, teileReiter } from './reiter'

const ACHT = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

describe('teileReiter', () => {
  it('lässt bis sechs Reiter alle stehen', () => {
    expect(teileReiter(ACHT.slice(0, 6), 'f')).toEqual({ sichtbar: ACHT.slice(0, 6), mehr: [] })
  })

  it('zeigt bei mehr die vorderen fünf und legt den Rest unter «Mehr»', () => {
    expect(teileReiter(ACHT, 'a')).toEqual({ sichtbar: ['a', 'b', 'c', 'd', 'e'], mehr: ['f', 'g', 'h'] })
  })

  it('hält den gewählten Reiter sichtbar, auch wenn er hinten steht', () => {
    expect(teileReiter(ACHT, 'h')).toEqual({ sichtbar: ['a', 'b', 'c', 'd', 'h'], mehr: ['e', 'f', 'g'] })
  })
})

describe('ReiterListe', () => {
  it('zeigt höchstens fünf Reiter und «Mehr», den gewählten immer', () => {
    render(
      <Reiter value="g">
        <ReiterListe>
          {ACHT.map((w) => (
            <ReiterKnopf key={w} value={w}>
              {w.toUpperCase()}
            </ReiterKnopf>
          ))}
        </ReiterListe>
      </Reiter>,
    )
    expect(screen.getAllByRole('tab').map((r) => r.textContent)).toEqual(['A', 'B', 'C', 'D', 'G'])
    expect(screen.getByRole('button', { name: /Mehr/ })).toBeTruthy()
  })
})
