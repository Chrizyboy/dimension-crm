import { fireEvent, render, screen } from '@testing-library/react'
import { MehrfachFilter } from './MehrfachFilter'

const optionen = [
  { wert: 'fil', text: 'Filipe' },
  { wert: 'lor', text: 'Loris' },
  { wert: 'dav', text: 'Davis' },
]

function oeffne() {
  fireEvent.pointerDown(screen.getByRole('button', { name: /Person/ }), { button: 0, ctrlKey: false })
  fireEvent.click(screen.getByRole('button', { name: /Person/ }))
}

describe('MehrfachFilter', () => {
  it('nimmt bei «alle» ein Häkchen weg', () => {
    const onChange = vi.fn()
    render(
      <MehrfachFilter
        beschriftung="Person"
        alleText="Alle Personen"
        optionen={optionen}
        gewaehlt={[]}
        onChange={onChange}
      />,
    )
    expect(screen.getByRole('button', { name: /Alle Personen/ })).toBeInTheDocument()
    oeffne()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Davis' }))
    expect(onChange).toHaveBeenLastCalledWith(['fil', 'lor'])
  })

  it('wählt mit «nur» genau einen Wert', () => {
    const onChange = vi.fn()
    render(
      <MehrfachFilter
        beschriftung="Person"
        alleText="Alle Personen"
        optionen={optionen}
        gewaehlt={['fil', 'lor']}
        onChange={onChange}
      />,
    )
    expect(screen.getByRole('button', { name: /Filipe, Loris/ })).toBeInTheDocument()
    oeffne()
    const nur = screen.getAllByRole('button', { name: 'nur' })
    fireEvent.click(nur[2] as HTMLElement)
    expect(onChange).toHaveBeenLastCalledWith(['dav'])
  })
})
