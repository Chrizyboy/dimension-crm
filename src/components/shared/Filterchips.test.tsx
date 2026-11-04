import { fireEvent, render, screen } from '@testing-library/react'
import { Filterchips } from './Filterchips'

const optionen = [
  { wert: 'lead', text: 'Lead', anzahl: 13 },
  { wert: 'bau', text: 'Bau', anzahl: 2 },
]

describe('Filterchips', () => {
  it('schaltet bei Mehrfachauswahl einzelne Werte ein und aus', () => {
    const onChange = vi.fn()
    render(<Filterchips beschriftung="Stand" optionen={optionen} gewaehlt={['lead']} onChange={onChange} />)
    expect(screen.getByRole('button', { name: /Lead/ })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: /Bau/ }))
    expect(onChange).toHaveBeenLastCalledWith(['lead', 'bau'])
    fireEvent.click(screen.getByRole('button', { name: /Lead/ }))
    expect(onChange).toHaveBeenLastCalledWith([])
  })

  it('wählt bei «einzeln» immer genau einen Wert', () => {
    const onChange = vi.fn()
    render(<Filterchips einzeln beschriftung="Zeitachse" optionen={optionen} gewaehlt={['lead']} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Bau/ }))
    expect(onChange).toHaveBeenLastCalledWith(['bau'])
    expect(screen.getByText('13')).toBeInTheDocument()
  })

  it('blendet Filter ohne Treffer aus, ausser sie sind gewählt', () => {
    const mitNull = [
      ...optionen,
      { wert: 'service', text: 'Service', anzahl: 0 },
      { wert: 'alt', text: 'Alt', anzahl: 0 },
    ]
    render(<Filterchips beschriftung="Stand" optionen={mitNull} gewaehlt={['alt']} onChange={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /Service/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Alt/ })).toHaveAttribute('aria-pressed', 'true')
  })
})
