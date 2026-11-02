import { describe, expect, it } from 'vitest'
import { gleicheIban, leseCamt } from './camt'

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.08">
 <BkToCstmrStmt><Stmt>
  <Acct><Id><IBAN>CH9300762011623852957</IBAN></Id></Acct>
  <Bal><Tp><CdOrPrtry><Cd>OPBD</Cd></CdOrPrtry></Tp><Amt Ccy="CHF">1000.00</Amt><CdtDbtInd>CRDT</CdtDbtInd><Dt><Dt>2026-10-31</Dt></Dt></Bal>
  <Bal><Tp><CdOrPrtry><Cd>CLBD</Cd></CdOrPrtry></Tp><Amt Ccy="CHF">184320.55</Amt><CdtDbtInd>CRDT</CdtDbtInd><Dt><Dt>2026-11-02</Dt></Dt></Bal>
  <Ntry>
   <Amt Ccy="CHF">18933.60</Amt><CdtDbtInd>DBIT</CdtDbtInd><BookgDt><Dt>2026-11-02</Dt></BookgDt>
   <AcctSvcrRef>UBS-4711</AcctSvcrRef>
   <NtryDtls><TxDtls><RltdPties><Cdtr><Pty><Nm>Krannich Solar AG</Nm></Pty></Cdtr></RltdPties>
    <RmtInf><Strd><CdtrRefInf><Ref>21 00000 00003 13947 14300 09017</Ref></CdtrRefInf></Strd></RmtInf></TxDtls></NtryDtls>
   <AddtlNtryInf>Zahlung RE-2026-88412</AddtlNtryInf>
  </Ntry>
  <Ntry>
   <Amt Ccy="CHF">28400.00</Amt><CdtDbtInd>CRDT</CdtDbtInd><BookgDt><Dt>2026-11-01</Dt></BookgDt>
   <NtryDtls><TxDtls><RltdPties><Dbtr><Nm>Beat Gerber</Nm></Dbtr></RltdPties></TxDtls></NtryDtls>
  </Ntry>
 </Stmt></BkToCstmrStmt>
</Document>`

describe('Kontoauszug camt.053', () => {
  it('liest IBAN, Schlusssaldo und Buchungen mit Vorzeichen', () => {
    const [a] = leseCamt(XML)
    expect(a).toMatchObject({ iban: 'CH9300762011623852957', stand_rappen: 18_432_055, stand_am: '2026-11-02' })
    expect(a?.buchungen).toHaveLength(2)
    expect(a?.buchungen[0]).toMatchObject({
      datum: '2026-11-02',
      betrag_rappen: -1_893_360,
      gegenpartei: 'Krannich Solar AG',
      referenz: '210000000003139471430009017',
      bank_referenz: 'UBS-4711',
    })
    expect(a?.buchungen[1]).toMatchObject({ betrag_rappen: 2_840_000, gegenpartei: 'Beat Gerber' })
    expect(a?.buchungen[1]?.bank_referenz).toContain('2026-11-01')
  })

  it('meldet Dateien, die kein Kontoauszug sind', () => {
    expect(() => leseCamt('<html></html>')).toThrow('camt.keine_datei')
    expect(() => leseCamt('kein xml <')).toThrow('camt.keine_datei')
  })

  it('vergleicht IBAN ohne Leerschläge', () => {
    expect(gleicheIban('CH93 0076 2011 6238 5295 7', 'ch9300762011623852957')).toBe(true)
    expect(gleicheIban(null, 'CH93')).toBe(false)
  })
})
