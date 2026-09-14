@ignore
Feature: fragmento reutilizable de login

Scenario: obtener token
  Given url baseUrl
  And path 'auth', 'login'
  And request { email: '#(email)', password: '#(password)' }
  When method post
  Then status 200
  * def authToken = response.token
  * def sesion = response.user
