Feature: Domicilios — quien despacha frente a quien reparte

Background:
  * url baseUrl
  * def asesor = call read('login.feature') users.asesor
  * def domic = call read('login.feature') users.domiciliario
  * def bodega = call read('login.feature') users.bodega

Scenario: el bodeguero no tiene acceso a domicilios
  Given path 'deliveries'
  And header Authorization = 'Bearer ' + bodega.authToken
  When method get
  Then status 403

Scenario: quien despacha ve todas y el domiciliario solo las suyas
  Given path 'deliveries'
  And header Authorization = 'Bearer ' + asesor.authToken
  When method get
  Then status 200
  * def todas = response.length

  Given path 'deliveries'
  And header Authorization = 'Bearer ' + domic.authToken
  When method get
  Then status 200
  * def mias = response.length
  # El domiciliario nunca debe ver más de lo que hay en total
  * assert mias <= todas
  # Y todas las que ve deben tener courier asignado
  * match each response contains { courier_id: '#notnull' }

Scenario: el domiciliario no puede autoasignarse un domicilio
  Given path 'deliveries', 3, 'assign'
  And header Authorization = 'Bearer ' + domic.authToken
  And request { courierId: 1 }
  When method patch
  Then status 403

Scenario: ciclo completo de una entrega
  # Quien despacha asigna
  Given path 'deliveries', 3, 'assign'
  And header Authorization = 'Bearer ' + asesor.authToken
  And request { courierId: 1 }
  When method patch
  Then status 200
  And match response.status == 'Asignada'

  # El domiciliario sale
  Given path 'deliveries', 3, 'pickup'
  And header Authorization = 'Bearer ' + domic.authToken
  When method patch
  Then status 200
  And match response.status == 'En camino'

  # Y entrega
  Given path 'deliveries', 3, 'deliver'
  And header Authorization = 'Bearer ' + domic.authToken
  When method patch
  Then status 200
  And match response.status == 'Entregada'

Scenario: marcar fallida exige un motivo
  Given path 'deliveries', 1, 'fail'
  And header Authorization = 'Bearer ' + asesor.authToken
  And request { reason: '' }
  When method patch
  Then status 400
