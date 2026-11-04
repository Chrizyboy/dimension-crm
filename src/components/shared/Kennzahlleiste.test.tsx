import { render, screen } from '@testing-library/react'
import { Kennzahlleiste } from './Kennzahlleiste'

describe('Kennzahlleiste', () => {
  it('zeigt die Gesamtzahl immer, andere Zahlen nur, wenn sie nicht null oder gewählt sind', () => {
    render(
      <Kennzahlleiste
        beschriftung="Zahlen"
        zahlen={[
          { id: 'alle', wert: 0, text: 'Offen' },
          { id: 'spaet', wert: 0, text: 'Zu spät', ton: 'kritisch' },
          { id: 'teile', wert: 3, text: 'Warten auf Teile', ton: 'warnung' },
          { id: 'gewaehlt', wert: 0, text: 'Gewählt', aktiv: true, onKlick: vi.fn() },
        ]}
      />,
    )
    expect(screen.getByText('Offen')).toBeInTheDocument()
    expect(screen.queryByText('Zu spät')).toBeNull()
    expect(screen.getByText('Warten auf Teile')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Gewählt/ })).toHaveAttribute('aria-pressed', 'true')
  })
})
