Feature: Caja — turno, cobro con IVA y arqueo

Background:
  * url baseUrl
  * def asesor = call read('login.feature') users.asesor
  * def bodega = call read('login.feature') users.bodega
  * def tok = 'Bearer ' + asesor.authToken

Scenario: el bodeguero no puede abrir caja
  Given path 'cash', 'session', 'open'
  And header Authorization = 'Bearer ' + bodega.authToken
  And request { openingAmount: 100000 }
  When method post
  Then status 403

Scenario: abrir caja, cobrar con IVA 19% y cerrar cuadrado
  # Abrir turno
  Given path 'cash', 'session', 'open'
  And header Authorization = tok
  And request { openingAmount: 200000 }
  When method post
  Then status 201
  And match response.sesion.opening_amount == 200000

  # No se puede abrir dos veces
  Given path 'cash', 'session', 'open'
  And header Authorization = tok
  And request { openingAmount: 50000 }
  When method post
  Then status 409

  # Tomar un pedido por cobrar
  Given path 'cash', 'pending'
  And header Authorization = tok
  When method get
  Then status 200
  And assert response.length > 0
  * def pedido = response[0]
  * def total = pedido.total

  # Cobrar en efectivo entregando de más
  * def entrega = total + 50000
  Given path 'cash', 'pay', pedido.id
  And header Authorization = tok
  And request { payments: [{ method: 'efectivo', amount: '#(total)', received: '#(entrega)' }] }
  When method post
  Then status 201
  # El IVA sale del total, no se suma encima
  And match response.desglose.taxRate == 19
  And match response.desglose.total == total
  * assert response.desglose.taxBase + response.desglose.taxAmount == total
  # El vuelto sale de lo entregado
  And match response.vuelto == 50000
  * def doc = response.documento

  # El documento nace pendiente de transmitir a la DIAN
  * match doc.status == 'pendiente'
  * match doc.cufe_cude == null

  # No se puede cobrar dos veces el mismo pedido
  Given path 'cash', 'pay', pedido.id
  And header Authorization = tok
  And request { payments: [{ method: 'tarjeta', amount: '#(total)' }] }
  When method post
  Then status 409

  # Cerrar contando exactamente lo que debería haber
  * def esperado = 200000 + total
  Given path 'cash', 'session', 'close'
  And header Authorization = tok
  And request { countedCash: '#(esperado)' }
  When method post
  Then status 200
  And match response.diferencia == 0

Scenario: pagar menos del total es rechazado
  # Este escenario crea su propio pedido en vez de depender de los sembrados:
  # el escenario anterior ya cobra el único que viene pendiente.
  Given path 'products'
  When method get
  * def variante = response[0].variants[0]

  Given path 'orders'
  And request
  """
  {
    customer_name: 'Prueba Pago Corto',
    customer_phone: '3000000000',
    city: 'Cali',
    shipping_address: 'Calle 1 #2-3',
    items: [{ variantId: '#(variante.id)', quantity: 1 }]
  }
  """
  When method post
  Then status 201
  * def nuevoPedido = response.id

  Given path 'cash', 'session', 'open'
  And header Authorization = tok
  And request { openingAmount: 0 }
  When method post

  Given path 'cash', 'pay', nuevoPedido
  And header Authorization = tok
  And request { payments: [{ method: 'tarjeta', amount: 1000 }] }
  When method post
  Then status 400
