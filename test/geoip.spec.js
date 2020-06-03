// function test () {
//   var cfg = { fields: ['client_ip'], maxmindDbDir: '/tmp/', debug: true }
//   setInterval(() => {
//     geoipOutputFilter(null, cfg, null, { client_ip: '94.216.99.1'}, console.log)
//   }, 200)
// }

/* global describe, it */
const Logagent = require('../lib/parser/parser.js')
const geoipOutputFilter = require('../lib/plugins/output-filter/geoip')
const config = { maxmindDbDir: '/tmp/', debug: true, geoipEnabled: true }
const logLine = '91.67.80.14 - - [03/Apr/2016:06:25:38 +0000] "GET /about/ HTTP/1.1" 200 14243 "https://sematext.com/consulting/elasticsearch/" "Mozilla/5.0 (iPhone; CPU iPhone OS 8_1_1 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Mobile/12B436 Twitter for iPhone"'

describe('Logagent parse web server Log with GEOIP', function () {
  it('should return client_ip, status_code, and geoip data', function (done) {
    this.timeout(150000)

    this.la = new Logagent(null, null, function ready (laReady) {
      laReady.parseLine(
        logLine,
        'nginx',
        function (err, data) {
          if (err) {
            return done(err)
          } else {
            if (data.ts) {
              return done(new Error('parserd obj includes temp. ts field'))
            }

            geoipOutputFilter(null, config, null, data, (err, data) => {
              if (err) {
                return done(new Error('Error: ' + JSON.stringify(data)))
              }

              if (!data.geoip) {
                return done(new Error('No "geoip" field present: ' + JSON.stringify(data)))
              }

              console.log(data)
              done()
            })
          }
        }
      )
    })
  })
})
