Feature: Catálogo, carrito y seguridad del checkout

Background:
  * url baseUrl

Scenario: el catálogo es público
  Given path 'products'
  When method get
  Then status 200
  And assert response.length > 0
  # Cada producto trae variantes e imágenes para la galería
  * def primero = response[0]
  * assert primero.variants.length > 0
  * assert primero.images.length > 0

Scenario: filtrar por categoría
  Given path 'products'
  And param category = 'calzado'
  When method get
  Then status 200
  And assert response.length > 0

Scenario: buscar por texto
  Given path 'products'
  And param q = 'hoodie'
  When method get
  Then status 200

Scenario: un producto que no existe da 404
  Given path 'products', 'no-existe-este-slug'
  When method get
  Then status 404

# SEGURIDAD: el precio se lee de la base, nunca del navegador
Scenario: enviar un precio manipulado no cambia el cobro
  Given path 'products'
  And param category = 'calzado'
  When method get
  Then status 200
  * def prod = response[0]
  * def variante = prod.variants[0]
  * def precioReal = prod.base_price

  Given path 'orders'
  And request
  """
  {
    customer_name: 'Prueba Karate',
    customer_phone: '3000000000',
    city: 'Cali',
    shipping_address: 'Calle Falsa 123',
    items: [{ variantId: '#(variante.id)', quantity: 1, unitPrice: 1 }]
  }
  """
  When method post
  Then status 201
  # El servidor ignoró unitPrice: 1 y cobró el precio real
  And match response.subtotal == precioReal

Scenario: no se puede pedir más de lo que hay en existencia
  Given path 'products'
  When method get
  * def prod = response[0]
  * def variante = prod.variants[0]

  Given path 'orders'
  And request
  """
  {
    customer_name: 'Prueba Stock',
    customer_phone: '3000000000',
    items: [{ variantId: '#(variante.id)', quantity: 999 }]
  }
  """
  When method post
  Then status 400

Scenario: el carrito no puede ir vacío
  Given path 'orders'
  And request { customer_name: 'X', customer_phone: '3000000000', items: [] }
  When method post
  Then status 400

Scenario: nombre y teléfono son obligatorios
  Given path 'products'
  When method get
  * def variante = response[0].variants[0]

  Given path 'orders'
  And request { items: [{ variantId: '#(variante.id)', quantity: 1 }] }
  When method post
  Then status 400

Scenario: el cliente solo ve sus propios pedidos
  * def cliente = call read('login.feature') users.cliente
  Given path 'orders', 'mine'
  And header Authorization = 'Bearer ' + cliente.authToken
  When method get
  Then status 200
  * def ids = $response[*].account_id
  # Todos los pedidos devueltos son de esa misma cuenta
  * match each ids == cliente.sesion.id
