// Pipedrive Calculate field on deal update - webhook setup on pipedrive, deal update setup on Zapier
Logger = BetterLog.useSpreadsheet('ACTIVE_SPREADSHEET_ID'); 
var PIPEDRIVE_API = 'PIPEDRIVE_API_KEY';
var cache = CacheService.getDocumentCache();

function doPost(e) {
  if(typeof e == 'undefined') e = { parameter: { yo: 'hi' } };
  try {
    var dataContents = e.postData.contents;
    var jsonObj = JSON.parse(dataContents);
    var dealID = jsonObj.meta.id;
    // we now check how many updates we have recorded in the cache. If we hit 8, each with less than 12s in between, we stop.
    // these are arbitrary numbers but prevent potential bug loops.
    var cachedUpdates = cache.get(dealID);
    if (cachedUpdates == null) {
      cachedUpdates = 0;
    } else if(cachedUpdates >= 8) {
      return;
    }
    // webhook sends previous data and new/current data (with latest change)
    var previousData = jsonObj.previous;
    var newData = jsonObj.current;
    
     // if not BizDev or SD, stop!
    if (previousData.pipeline_id != 4 && previousData.pipeline_id != 3) return;
    
    // create the deal object which we eventually send to Pipedrive through API
    var pipedriveDeal = {
      id: dealID
    }
     
    // check if we need to update the pipedrive title
    if(newData.title != normaliseTitle(newData)) {
      pipedriveDeal.title = normaliseTitle(newData);
      Logger.log("Pipedrive deal with ID " + dealID + " to be updated with title: " + pipedriveDeal.title);
    }

    // if Vehicles and VAS in product do not check value!      
    var productIDs = newData["PIPEDRIVE_FIELD_ID"];
    if (productIDs.indexOf('FIELD_OPTION_ID1') == -1 && productIDs.indexOf('FIELD_OPTION_ID2') == -1 && productIDs.indexOf('FIELD_OPTION_ID3') == -1) {
      
      // CALCULATE VALUE AND UPDATE IF NECCESSARY
      
      try {
        // First lets filter the deal data, and get the data with custom field names and not API IDs
        var valueData = filterData(newData, valueFieldsJson);
        
        // Get approximation of when deal will be closed
        var timeToAdd = helperObj[newData.stage_id].timeToAdd;
        var timeToClose = new Date(newData.add_time).addDays(timeToAdd);
        // Get the date in which this deal could start paying and call it cohortStart
        if(timeToClose < new Date('2020-01-01')) {
          var startDate = new Date('2020-01-'+ new Date(newData.add_time).getDate());
        } else {
          startDate = new Date(newData.add_time);
        }
        var cohortStart = startDate.addDays(helperObj[newData.stage_id].timeToAdd + 45);

        // simply get the amount of months the client would be paying for
        var monthsOfPayment = 12 - cohortStart.getMonth();     
        
        // Replace any null values with 0, or we'll get an error
        Object.values(valueData).forEach(function(key) {
          if(valueData[key] == null) valueData[key] = 0;
        });
        
        var MRR = (( SOME_CALCULATION ) / 12);
        
        var productMultiplier = 0.9;
        // if we have a MRR value, multiply by CM1 multiplier
        var CM1monthly = MRR * productMultiplier;
        var CM1twelveMonth = CM1monthly * 12;
      } catch(e) {
        //Logger.log(e);
      }
      
      // check if we have a CM1twelveMonth value AND if it's different to the value saved in pipedrive
      if(CM1twelveMonth >= 1 && CM1twelveMonth.toFixed() != newData["value"].toFixed()) {
        // add it to our pipedrive deal object, which we'll send to Pipedrive to update
        pipedriveDeal.value = CM1twelveMonth;
        Logger.log("Pipedrive deal with ID " + dealID + " to be updated with value: " + pipedriveDeal.value);
      }
    }

    if(typeof pipedriveDeal.value != 'undefined' || typeof pipedriveDeal.title != 'undefined') {
      var options = {
        'method' : 'put',
        'contentType': 'application/json',
        'muteHttpExceptions': false,
        'payload' : JSON.stringify(pipedriveDeal)
      };
      // send the put request to pipedrive to update the deal with the deal object payload 
      var response = UrlFetchApp.fetch('https://wundermobility.pipedrive.com/v1/deals/'+dealID+'?api_token='+PIPEDRIVE_API, options);
      // update the cache to make sure we're not sending crazy amounts of updates
      updateCache(dealID, cachedUpdates);
    }
    
  } catch(err) {
    Logger.log(err);
  }
}


var helperObj = {
  21: {
    "timeToAdd": 75,
    "prob": 0.05,
    "handicap": 1
  },
  30: {
    "timeToAdd": 90,
    "prob": 0.1,
    "handicap": 1
  },
  22: {
    "timeToAdd": 90,
    "prob": 0.3,
    "handicap": 1
  },
  23: {
    "timeToAdd": 90,
    "prob": 0.5,
    "handicap": 1
  },
  52: {
    "timeToAdd": 90,
    "prob": 0.7,
    "handicap": 1
  }
};



function normaliseTitle(deal) {
  try {
    var normalisedTitle = '';
    var partner = '', productLabel = 'PRODUCT ERROR', personName = '', orgName = '', countryName = '';
    // check lead credit for Partnership
    if(deal['c819ddc1090148632bf03a66b45bf25d8c988cdb'] != null && deal['c819ddc1090148632bf03a66b45bf25d8c988cdb'].toLowerCase().indexOf('partnership') != -1) {
      // Split lead source
      if(deal['a6fb996757fb86bdc412d1b7f823a5d32505f23e'] != null && deal['a6fb996757fb86bdc412d1b7f823a5d32505f23e'] != "") partner = deal.a6fb996757fb86bdc412d1b7f823a5d32505f23e.split('- ')[1]; 
    }
    // check product field
    if(deal['654794ff3f2b68027d5309f46de9aebfd7562b0d'] != null) {
      productLabel = translateProduct(deal['654794ff3f2b68027d5309f46de9aebfd7562b0d']);
    }
    if(deal.person_id != null) {
      personName = deal.person_name;
    } else {
      personName = 'NO PERSON';
    }
    if(deal.org_id != null) {
      orgName = deal.org_name;
    } else {
      orgName = 'NO ORG';
    }
    // check mkt location field and extract country
    if(deal['7c95eb9c29b01990245949b5f595440081b58d7d_country'] != null && deal['7c95eb9c29b01990245949b5f595440081b58d7d_country'] != "") {
      countryName = deal['7c95eb9c29b01990245949b5f595440081b58d7d_country'];
    } else {
      countryName = 'NO COUNTRY';
    }
    
    if(partner.length >= 1) {
      normalisedTitle += '[' + partner + ']';
    }
    
    // ADD CORPORATE TO TITLE IF TAG IS PRESENT    
    
    if(deal['800c48039550599f47a758223a6122b8040f61f3'] != null && deal['800c48039550599f47a758223a6122b8040f61f3'].indexOf('426') != -1) {
      normalisedTitle += '[CORPORATE]';
    }
    
    normalisedTitle += '[' + productLabel.toUpperCase() + '] ' + personName + ' / ' + orgName + ' / ' + countryName;
    return normalisedTitle;
  } catch(e) {
    Logger.log('Error in normaliseTitle: ' + e);
  }
}
   


function translateProduct(productID) {
  try {
    if(productID.indexOf(',') != -1) {
      return 'PRODUCT ERROR';
    }
    const productObj = productOptions.find(product => product.id == parseInt(productID));
    return productObj.label;
  } catch(e) {
    Logger.log('Error in translateProduct: ' + e);
  }
}

var productOptions = [
  {
    "label": "Product1",
    "id": 100
  },
  {
    "label": "Product2",
    "id": 101
  },
  {
    "label": "Product3",
    "id": 102
  }
];


function updateCache(dealID, cachedUpdates) {
  // Add this deal ID to the cache with # of recent updates. key: deal id, val: number of updates until expiration of 12s
  cachedUpdates++;
  Logger.log("cachedUpdates for "+ dealID +": " + cachedUpdates);
  cache.put(dealID, cachedUpdates, 12);
}



function filterData(newData, jsonObj) {
  var filteredData = {};
  // First loop through our deal data with .map
  Object.keys(newData).map(function(key, index) {
    var answerID = newData[key];
    // Then loop through jsonobj (which is a list of our value fields)
    for(var j=0; j<jsonObj.length; j++) {
      // If the deal field we're on is a value field, extract the field object (incl. names)
      if(jsonObj[j].key == key) {
        var fieldData = jsonObj[j];
        break;
      }
    }
    // if the deal field we're on isn't a value field, skip it.
    if(typeof fieldData == 'undefined') return false;
    // now check the field_type, in the case of value calculation, there are no 'enums' (which are select fields).
    if(fieldData.field_type == 'enum') {
      //in the case of select fields, we need to translate ID to label
      for(var k=0; k<fieldData.options.length; k++) {
        if(answerID == fieldData.options[k].id) {
          var value = fieldData.options[k].label;
        }
      }
      filteredData[fieldData.name] = value;
    } else { 
      //assume field is monetary or text and we just need the answerID which will be the field value
      filteredData[fieldData.name] = answerID;
    }
  });
  return filteredData;
}


Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

var valueFieldsJson = [
  {
      "id": 1216,
      "key": "PIPEDRIVE_FIELD_KEY_01",
      "name": "Revenue 1",
  },
  {
      "id": 1217,
      "key": "PIPEDRIVE_FIELD_KEY_01",
      "name": "Revenue 2"
  }
];

  

function doGet(e){
}