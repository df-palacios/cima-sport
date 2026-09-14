Feature: Los permisos, no el cargo, deciden el acceso

Background:
  * url baseUrl
  * def admin = call read('login.feature') users.admin
  * def asesor = call read('login.feature') users.asesor
  * def bodega = call read('login.feature') users.bodega
  * def domic = call read('login.feature') users.domiciliario
  * def cliente = call read('login.feature') users.cliente

Scenario: solo quien tiene reportes.ver entra a reportes
  Given path 'reports', 'summary'
  And header Authorization = 'Bearer ' + admin.authToken
  When method get
  Then status 200

  Given path 'reports', 'summary'
  And header Authorization = 'Bearer ' + bodega.authToken
  When method get
  Then status 403

Scenario: solo quien tiene equipo.ver entra a la gestión del equipo
  Given path 'team', 'employees'
  And header Authorization = 'Bearer ' + admin.authToken
  When method get
  Then status 200

  Given path 'team', 'employees'
  And header Authorization = 'Bearer ' + asesor.authToken
  When method get
  Then status 403

Scenario: el cliente no entra a ninguna sección interna
  Given path 'orders'
  And header Authorization = 'Bearer ' + cliente.authToken
  When method get
  Then status 403

  Given path 'deliveries'
  And header Authorization = 'Bearer ' + cliente.authToken
  When method get
  Then status 403

Scenario: sin token no se entra
  Given path 'orders'
  When method get
  Then status 401

Scenario: con un token inventado tampoco
  Given path 'orders'
  And header Authorization = 'Bearer esto.no.es.un.token'
  When method get
  Then status 401

Scenario: no se puede dejar la tienda sin administrador
  # El empleado 1 es la única administradora: quitarle el cargo debe fallar.
  Given path 'team', 'employees', 1, 'roles'
  And header Authorization = 'Bearer ' + admin.authToken
  And request { roleIds: [2] }
  When method put
  Then status 409
  And match response.message contains 'administrador'

Scenario: tampoco se puede dar de baja al último administrador
  Given path 'team', 'employees', 1, 'active'
  And header Authorization = 'Bearer ' + admin.authToken
  And request { isActive: false }
  When method patch
  Then status 409
