Feature: Autenticación y validación de contraseñas

Background:
  * url baseUrl

Scenario: la API responde
  Given path 'health'
  When method get
  Then status 200
  And match response.service == 'cima-sport-api'

Scenario Outline: cada cuenta sembrada puede entrar
  Given path 'auth', 'login'
  And request { email: '<email>', password: '<pass>' }
  When method post
  Then status 200
  And match response.token == '#string'
  And match response.user.name == '#string'

  Examples:
    | email                      | pass         |
    | admin@cimasport.com        | admin123     |
    | asesor@cimasport.com       | asesor123    |
    | bodega@cimasport.com       | bodega123    |
    | domicilios@cimasport.com   | domicilio123 |
    | camila@correo.com          | cliente123   |

Scenario: contraseña incorrecta
  Given path 'auth', 'login'
  And request { email: 'admin@cimasport.com', password: 'noesesta' }
  When method post
  Then status 401

Scenario: correo que no existe
  Given path 'auth', 'login'
  And request { email: 'nadie@cimasport.com', password: 'admin123' }
  When method post
  Then status 401

Scenario: falta la contraseña
  Given path 'auth', 'login'
  And request { email: 'admin@cimasport.com' }
  When method post
  Then status 400

# Una persona puede ser empleada y cliente a la vez
Scenario: el asesor tiene dos cargos y además perfil de cliente
  * def auth = call read('login.feature') users.asesor
  * def u = auth.sesion
  * match u.isEmployee == true
  * match u.isCustomer == true
  * assert u.roles.length == 2
  * assert u.permissions.length > 0

Scenario: el cliente no es empleado y no tiene permisos
  * def auth = call read('login.feature') users.cliente
  * match auth.sesion.isEmployee == false
  * match auth.sesion.roles == []
  * match auth.sesion.permissions == []

Scenario Outline: el registro rechaza contraseñas débiles
  Given path 'auth', 'register'
  And request { name: 'Prueba Karate', email: '<email>', password: '<pass>', passwordConfirm: '<confirm>' }
  When method post
  Then status 400

  Examples:
    | email          | pass           | confirm        |
    | k1@prueba.com  | corta          | corta          |
    | k2@prueba.com  | todominuscula1 | todominuscula1 |
    | k3@prueba.com  | SinNumeros     | SinNumeros     |
    | k4@prueba.com  | SinMayus123    | Distinta123    |
    | k5@prueba.com  | 12345678       | 12345678       |

Scenario: el registro acepta una contraseña que cumple todo
  * def correo = 'karate' + java.lang.System.currentTimeMillis() + '@prueba.com'
  Given path 'auth', 'register'
  And request { name: 'Prueba Karate', email: '#(correo)', password: 'ClaveValida9', passwordConfirm: 'ClaveValida9' }
  When method post
  Then status 201
  And match response.user.isCustomer == true
  And match response.user.isEmployee == false

Scenario: no se puede registrar un correo repetido
  Given path 'auth', 'register'
  And request { name: 'Otra', email: 'camila@correo.com', password: 'ClaveValida9', passwordConfirm: 'ClaveValida9' }
  When method post
  Then status 409
