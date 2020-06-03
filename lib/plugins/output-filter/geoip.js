process.env.MAXMIND_LICENSE_KEY = '' // this needs to be set...
var fs = require('fs')
var consoleLogger = require('../../util/logger.js')
var maxmindUpdate = require('../../parser/maxmind-update')
var MaxMindReader = require('maxmind').Reader
var cityLookup = null
var geoIpStatus = {
  maxmindDbDir: process.env.MAXMIND_DB_DIR || '/tmp/',
  debug: !!process.env.DEBUG
}

function initMaxmind () {
  maxmindUpdate(true, geoIpStatus.maxmindDbDir, function (err, fileName) {
    if (geoIpStatus.debug) {
      consoleLogger.debug('GeoIP: init GeoIP DB ' + fileName)
    }
    if (err) {
      consoleLogger.error('GeoIP: error ' + err)
      geoIpStatus.geoIpFailed = true
      return
    }
    try {
      fs.statSync(fileName)
      cityLookup = new MaxMindReader(fs.readFileSync(fileName), {
        watchForUpdates: true
      })
      if (cityLookup) {
        consoleLogger.debug('GeoIP: open ' + fileName)
      } else {
        consoleLogger.log('GeoIP: error ' + err)
      }
      if (geoIpStatus.fields) {
        consoleLogger.log(
          'GeoIP: lookup enabled for fields ' + geoIpStatus.fields
        )
      } else {
        consoleLogger.log('GeoIP: lookup enabled ')
      }
    } catch (fsStatError) {
      geoIpStatus.geoIpFailed = true
      consoleLogger.error('GeoIP: error ' + fsStatError)
    }
  })
}

// mutate the data object by adding geoip field that gets populated by analyzing the client_ip
function geoipLookup (data, fieldName, outputFieldName) {
  if (cityLookup != null && data[fieldName]) {
    var location = cityLookup.get(data[fieldName])
    if (
      location &&
      location.country &&
      location.city &&
      location.city.names &&
      location.city.names.en
    ) {
      data[outputFieldName || 'geoip'] = {
        location: [location.location.longitude, location.location.latitude],
        info: {
          country: location.country.iso_code,
          continent: location.continent.code,
          city: location.city.names.en
        }
      }
    }
  } else {
    return null
  }
}

function geoipOutputFilter (context, config, eventEmitter, data, callback) {
  // get config values from output-filter config
  if (!geoIpStatus.fields) {
    if (process.env.GEOIP_FIELDS) {
      geoIpStatus.fields = process.env.GEOIP_FIELDS.replace(/\s/g, '').split(
        ','
      )
    }
    geoIpStatus.fields = geoIpStatus.fields || config.fields || ['client_ip']
    geoIpStatus.debug = config.debug
    consoleLogger.log('GeoIP: lookup enabled for fields ' + geoIpStatus.fields)
  }
  if (geoIpStatus.geoIpFailed === true) {
    return callback(null, data)
  }
  for (var i = 0; i < geoIpStatus.fields.length; i++) {
    if (data[geoIpStatus.fields[i]] !== undefined) {
      geoipLookup(data, geoIpStatus.fields[i], 'geoip')
    }
  }
  return callback(null, data)
}

consoleLogger.log('GeoIP: Loading Maxmind DB ')
initMaxmind()

module.exports = geoipOutputFilter
