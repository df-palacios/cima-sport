function fn() {
  var env = karate.env || 'local';
  return {
    baseUrl: 'http://localhost:4001/api',
    users: {
      admin:        { email: 'admin@cimasport.com',      password: 'admin123' },
      asesor:       { email: 'asesor@cimasport.com',     password: 'asesor123' },
      bodega:       { email: 'bodega@cimasport.com',     password: 'bodega123' },
      domiciliario: { email: 'domicilios@cimasport.com', password: 'domicilio123' },
      cliente:      { email: 'camila@correo.com',        password: 'cliente123' },
    },
  };
}
