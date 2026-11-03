import { describe, expect, it } from 'vitest'
import { uidAnfrage, uidAntwortLesen, uidFormat } from './uid_register.ts'

// Antwort im Aufbau des UID-Registers (eCH-0097/0098), mit erfundenen Firmen.
const ANTWORT = `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>
<SearchResponse xmlns="http://www.uid.admin.ch/xmlns/uid-wse"><SearchResult xmlns:a="http://www.uid.admin.ch/xmlns/uid-wse-shared/2">
<a:uidEntitySearchResultItem><a:organisation><a:organisation>
  <organisationType xmlns="http://www.ech.ch/xmlns/eCH-0108/5"><organisationIdentification>
    <uid xmlns="http://www.ech.ch/xmlns/eCH-0097/5"><uidOrganisationIdCategorie>CHE</uidOrganisationIdCategorie><uidOrganisationId>123456789</uidOrganisationId></uid>
    <organisationName xmlns="http://www.ech.ch/xmlns/eCH-0097/5">Muster Gerüstbau AG</organisationName>
    <legalForm xmlns="http://www.ech.ch/xmlns/eCH-0097/5">0106</legalForm></organisationIdentification>
    <address><street>Industriestrasse</street><houseNumber>12</houseNumber><swissZipCode>1630</swissZipCode><town>Bulle</town></address>
    <uidregInformation><uidregStatusEnterpriseDetail>3</uidregStatusEnterpriseDetail></uidregInformation>
  </organisationType>
  <organisationType xmlns="http://www.ech.ch/xmlns/eCH-0108/5"><organisationIdentification>
    <uid><uidOrganisationIdCategorie>CHE</uidOrganisationIdCategorie><uidOrganisationId>987654321</uidOrganisationId></uid>
    <organisationName>Muster &amp; Söhne Gerüste GmbH</organisationName><legalForm>0107</legalForm></organisationIdentification>
    <address><street>Hauptgasse 1</street><swissZipCode>5630</swissZipCode><town>Muri AG</town></address>
    <uidregInformation><uidregStatusEnterpriseDetail>2</uidregStatusEnterpriseDetail></uidregInformation>
  </organisationType>
</a:organisation></a:organisation></a:uidEntitySearchResultItem></SearchResult></SearchResponse></s:Body></s:Envelope>`

describe('UID-Register', () => {
  it('baut die Anfrage und maskiert den Namen', () => {
    const a = uidAnfrage('Bur & <Söhne>')
    expect(a).toContain('<ns:organisationName>Bur &#38; &#60;Söhne&#62;</ns:organisationName>')
    expect(a).toContain('<ns:maxNumberOfRecords>8</ns:maxNumberOfRecords>')
  })

  it('formatiert die UID', () => {
    expect(uidFormat('CHE', '123456789')).toBe('CHE-123.456.789')
    expect(uidFormat(null, '12345')).toBeNull()
  })

  it('liest Firmen mit Rechtsform, Adresse und Status', () => {
    expect(uidAntwortLesen(ANTWORT)).toEqual([
      {
        uid: 'CHE-123.456.789',
        name: 'Muster Gerüstbau AG',
        rechtsform: 'AG',
        strasse: 'Industriestrasse 12',
        plz: '1630',
        ort: 'Bulle',
        aktiv: false,
      },
      {
        uid: 'CHE-987.654.321',
        name: 'Muster & Söhne Gerüste GmbH',
        rechtsform: 'GmbH',
        strasse: 'Hauptgasse 1',
        plz: '5630',
        ort: 'Muri AG',
        aktiv: true,
      },
    ])
  })

  it('meldet einen SOAP-Fehler als kurzen Code', () => {
    expect(() =>
      uidAntwortLesen(
        '<s:Envelope><s:Body><s:Fault><faultstring>Request limit exceeded</faultstring></s:Fault></s:Body></s:Envelope>',
      ),
    ).toThrow('Request limit exceeded')
  })

  it('gibt bei leerer Antwort nichts zurück', () => {
    expect(uidAntwortLesen('<s:Envelope><s:Body><SearchResponse/></s:Body></s:Envelope>')).toEqual([])
  })
})
