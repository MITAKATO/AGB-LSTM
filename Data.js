var s2Tools = require("users/leikuny101/TOOLBOX:s2Tools");
var roi = ee.FeatureCollection('users/2401221040/IOWA_Adair');// Input GEE Asset path for the county-level boundary shp here
function HS2SR_CS(image) {
function HS2SR_CS(image) {
  var cloudProb = image.select('MSK_CLDPRB');
  var snowProb = image.select('MSK_SNWPRB');
  var cloud = cloudProb.gte(5);
  var snow = snowProb.gte(5);
  var scl = image.select('SCL');
  var shadow = scl.eq(3);
  var cirrus = scl.eq(10);
  var cloudsBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;
  var qa = image.select('QA60');
  var cloud1 = qa.bitwiseAnd(cloudsBitMask);
  var cirrus1 = qa.bitwiseAnd(cirrusBitMask);
  var mask = cloud.neq(1).and(snow.neq(1)).and(cirrus.neq(1)).and(shadow.neq(1))
    .and(cloud1.neq(1)).and(cirrus1.neq(1))
    .focal_min(3);
  return image.updateMask(mask);
}

function getAdditionalVariables(date, roi) {
  date = ee.Date(date);
  var endDate = date.advance(5, 'days');
  var modisLAI = ee.ImageCollection("MODIS/061/MCD15A3H")
                  .filterDate(date, endDate)
                  .select('Lai')
                  .first();
  var gldasTemp = ee.ImageCollection("NASA/GLDAS/V021/NOAH/G025/T3H")
                    .filterDate(date, endDate)
                    .select(['Tair_f_inst']);
  var dailyMaxTemp = gldasTemp.max();
  var dailyMinTemp = gldasTemp.min();
  var dailyAvgTemp = gldasTemp.mean();
  dailyMaxTemp = dailyMaxTemp.subtract(273.15);
  dailyMinTemp = dailyMinTemp.subtract(273.15);
  dailyAvgTemp = dailyAvgTemp.subtract(273.15);
  var soilMoisture = ee.ImageCollection("NASA/GLDAS/V021/NOAH/G025/T3H")
                        .filterDate(date, endDate)
                        .select(['SoilMoi0_10cm_inst', 'SoilMoi10_40cm_inst']).mean();
  var chirps = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
                  .filterDate(date, endDate)
                  .select('precipitation').sum();
  var stats = ee.Image.cat([modisLAI, dailyMaxTemp, dailyMinTemp, dailyAvgTemp, soilMoisture, chirps])
    .reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: roi,
      scale: 500,
      maxPixels: 1e9
    });
  return stats;
}
function processYear(year) {
  var startDate = ee.Date(year + '-05-01');
  var endDate = ee.Date(year + '-08-31');
  var maskImage = ee.Image('users/2401221040/IOWA' + year).eq(5); // Remember to change the tif filename (State name)
  var timePoints = ee.List.sequence(0, endDate.difference(startDate, 'days'), 5).map(function(day) {
    return startDate.advance(day, 'days');
  });
  var S2Collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                        .filterBounds(roi)
                        .filterDate(startDate, endDate)
                        .map(HS2SR_CS)
                        .map(s2Tools.sentinel2sr)
                        .map(s2Tools.addVariables);
  var aggregatedData = timePoints.map(function(date) {
    var currentDate = ee.Date(date);
    var filteredImages = S2Collection.filterDate(currentDate, currentDate.advance(5, 'days'));
    var compositeImage = filteredImages.mean().updateMask(maskImage);
    var ndviMin = -1.0, ndviMax = 1.0;
    var eviMin = -1.0, eviMax = 1.0;
    var ndviImage = compositeImage.select('NDVI').updateMask(compositeImage.select('NDVI').gte(ndviMin).and(compositeImage.select('NDVI').lte(ndviMax)));
    var eviImage = compositeImage.select('EVI').updateMask(compositeImage.select('EVI').gte(eviMin).and(compositeImage.select('EVI').lte(eviMax)));
    var nirImage = compositeImage.select('nir');
    var nirvImage = ndviImage.multiply(nirImage).rename('NIRv');
    var additionalVariables = getAdditionalVariables(currentDate, roi);
    var statistics = ee.Dictionary({
        'NDVI': ndviImage.reduceRegion({reducer: ee.Reducer.mean(), geometry: roi, scale: 30, maxPixels: 1e9}).get('NDVI'),
        'EVI': eviImage.reduceRegion({reducer: ee.Reducer.mean(), geometry: roi, scale: 30, maxPixels: 1e9}).get('EVI'),
        'NIRv': nirvImage.reduceRegion({reducer: ee.Reducer.mean(), geometry: roi, scale: 30, maxPixels: 1e9}).get('NIRv')
      }).combine(additionalVariables);
    statistics = ee.Dictionary(statistics)
      .rename(['Tair_f_inst', 'Tair_f_inst_1', 'Tair_f_inst_2'], ['temperature_max', 'temperature_min', 'temperature_mean']);
    return ee.Feature(null, statistics.set('date', currentDate.format('YYYY-MM-dd')));
  });
  var resultsCollection = ee.FeatureCollection(aggregatedData);
  Export.table.toDrive({
    collection: resultsCollection,
    description: 'IOWA_Adair' + year,// Changed to State_County_Year
    fileFormat: 'CSV'
  });
}
for (var year = 2019; year <= 2023; year++) {
  processYear(year);

}
