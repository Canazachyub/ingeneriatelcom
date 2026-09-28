// ============================================================
// ANALÍTICA WEB (Google Analytics 4) para el panel /admin/analitica
//
// Lee la propiedad GA4 "ingeneriatelcom" con el servicio avanzado
// "Google Analytics Data API" (identificador AnalyticsData) de Apps Script.
// Requisitos (una sola vez, ver docs/ANALYTICS_SEO.md §6):
//   1. Editor de Apps Script → Servicios (+) → Google Analytics Data API → Agregar.
//   2. Ejecutar probarAnalytics() en el editor y aceptar el permiso de lectura
//      de Analytics ANTES de publicar la nueva versión.
// Si el servicio no está habilitado, getAnalytics responde un error claro y
// el resto del sistema sigue funcionando igual.
// ============================================================

var GA4_PROPIEDAD_ = 'properties/409187886';
var TTL_ANALYTICS_ = 600; // 10 min de caché: la API tiene cuota diaria

// Eventos propios de la web (src/utils/analytics.ts)
var EVENTOS_CLAVE_ = ['postulacion_enviada', 'generate_lead', 'clic_contacto', 'libro_reclamaciones'];

function analyticsDisponible_() {
  return typeof AnalyticsData !== 'undefined' && AnalyticsData && AnalyticsData.Properties;
}

function reporteGA_(peticion) {
  var r = AnalyticsData.Properties.runReport(peticion, GA4_PROPIEDAD_);
  return (r && r.rows) || [];
}

function filasGA_(filas, nDim) {
  return filas.map(function (f) {
    var d = (f.dimensionValues || []).map(function (x) { return x.value; });
    var m = (f.metricValues || []).map(function (x) { return Number(x.value) || 0; });
    return { dims: d.slice(0, nDim), mets: m };
  });
}

function topGA_(dimension, metrica, rango, limite) {
  return filasGA_(reporteGA_({
    dateRanges: [rango],
    dimensions: [{ name: dimension }],
    metrics: [{ name: metrica }],
    orderBys: [{ metric: { metricName: metrica }, desc: true }],
    limit: limite || 8
  }), 1).map(function (x) { return { nombre: x.dims[0] || '(sin dato)', valor: x.mets[0] }; });
}

// data.dias: 7 | 28 | 90 (por defecto 28)
function getAnalytics(data) {
  if (!analyticsDisponible_()) {
    return {
      success: false,
      error: 'El servicio "Google Analytics Data API" no está habilitado en Apps Script. Ver docs/ANALYTICS_SEO.md §6.'
    };
  }
  var dias = [7, 28, 90].indexOf(Number(data && data.dias)) >= 0 ? Number(data.dias) : 28;

  var cache = null;
  try { cache = CacheService.getScriptCache(); } catch (e) {}
  var clave = 'ga4:' + dias;
  if (cache) {
    var guardado = cache.get(clave);
    if (guardado) {
      try {
        var r0 = JSON.parse(guardado);
        r0.data.enTiempoReal = tiempoRealGA_(); // el tiempo real nunca se cachea
        return r0;
      } catch (e) {}
    }
  }

  try {
    var actual = { startDate: dias + 'daysAgo', endDate: 'today' };
    var previo = { startDate: (dias * 2) + 'daysAgo', endDate: (dias + 1) + 'daysAgo' };

    // Totales del período y del período anterior (para la variación %)
    var tot = reporteGA_({
      dateRanges: [actual, previo],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }, { name: 'averageSessionDuration' }]
    });
    var totales = { actual: [0, 0, 0, 0], previo: [0, 0, 0, 0] };
    tot.forEach(function (f) {
      var rango = f.dimensionValues && f.dimensionValues[0] ? f.dimensionValues[0].value : 'date_range_0';
      var vals = f.metricValues.map(function (x) { return Number(x.value) || 0; });
      if (rango === 'date_range_1') totales.previo = vals; else totales.actual = vals;
    });

    // Serie diaria
    var serie = filasGA_(reporteGA_({
      dateRanges: [actual],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
      limit: 400
    }), 1).map(function (x) {
      var d = x.dims[0]; // AAAAMMDD
      return { fecha: d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6, 8), usuarios: x.mets[0], sesiones: x.mets[1] };
    });

    // Eventos clave
    var eventos = {};
    EVENTOS_CLAVE_.forEach(function (e) { eventos[e] = 0; });
    filasGA_(reporteGA_({
      dateRanges: [actual],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: EVENTOS_CLAVE_ } } }
    }), 1).forEach(function (x) { eventos[x.dims[0]] = x.mets[0]; });

    var resultado = {
      success: true,
      data: {
        dias: dias,
        generado: new Date().toISOString(),
        totales: {
          usuarios: totales.actual[0], sesiones: totales.actual[1], vistas: totales.actual[2], duracionMedia: totales.actual[3],
          usuariosPrevio: totales.previo[0], sesionesPrevio: totales.previo[1], vistasPrevio: totales.previo[2], duracionMediaPrevio: totales.previo[3]
        },
        serie: serie,
        canales: topGA_('sessionDefaultChannelGroup', 'sessions', actual, 8),
        fuentes: topGA_('sessionSource', 'sessions', actual, 8),
        ciudades: topGA_('city', 'activeUsers', actual, 8),
        paginas: topGA_('pagePath', 'screenPageViews', actual, 10),
        dispositivos: topGA_('deviceCategory', 'activeUsers', actual, 4),
        eventos: eventos
      }
    };
    if (cache) {
      try { cache.put(clave, JSON.stringify(resultado), TTL_ANALYTICS_); } catch (e) {}
    }
    resultado.data.enTiempoReal = tiempoRealGA_();
    return resultado;
  } catch (err) {
    console.error('getAnalytics:', err);
    return { success: false, error: 'No se pudo leer Google Analytics: ' + (err && err.message ? err.message : err) };
  }
}

function tiempoRealGA_() {
  try {
    var r = AnalyticsData.Properties.runRealtimeReport({ metrics: [{ name: 'activeUsers' }] }, GA4_PROPIEDAD_);
    return r && r.rows && r.rows[0] ? Number(r.rows[0].metricValues[0].value) || 0 : 0;
  } catch (e) {
    return null;
  }
}

// Ejecutar UNA VEZ en el editor (después de agregar el servicio) para
// autorizar el permiso de lectura de Analytics. Solo lee; no modifica nada.
function probarAnalytics() {
  if (!analyticsDisponible_()) {
    Logger.log('FALTA: agregar el servicio "Google Analytics Data API" (Servicios +).');
    return;
  }
  var r = getAnalytics({ dias: 7 });
  Logger.log(r.success
    ? 'OK: ' + r.data.totales.usuarios + ' usuarios y ' + r.data.totales.vistas + ' vistas en 7 días; en tiempo real: ' + r.data.enTiempoReal
    : 'ERROR: ' + r.error);
}
