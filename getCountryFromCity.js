function getCountry(cellValue) {
  if(!cellValue) return "!empty cell!";
  // https://www.geonames.org/manual.html - get a user account here and wait for your username to become active (can take a day or 2)
  var response = UrlFetchApp.fetch('http://api.geonames.org/searchJSON?username=GEONAMES_USERNAME&name='+cellValue);
  // api.geonames.org returns a list of matching countries we need to return the top match
  var json = JSON.parse(response.getContentText());
  Logger.log(json.geonames);
  return json.geonames[0].countryName;
}
