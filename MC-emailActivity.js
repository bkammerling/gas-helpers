var API_KEY = 'YOUR-MAILCHIMP-API-KEY', // find in MC Account -> Extras -> API Keys,
    LIST_ID = 'YOUR-MAILCHIMP-LIST-ID' // find in MC List -> Settings -> List name and defaults,
    ROOT = 'https://us3.api.mailchimp.com/3.0/'; // the 'us3' part is dependant on your MC server, check the URL when you login


// Arguments:
//   - emailAddress: the email address of the subscriber you want to check
//   - title: the title (or part of the title) of the campaign you want to check
function gotEmail(emailAddress, title) {
  var md5email = makeMD5(emailAddress);
  var endpoint = 'lists/'+ LIST_ID +'/members/'+ md5email + '/activity';
  var options = {
    "headers":{
      "Authorization":"apikey " + API_KEY
    },
    "method":"GET",
    "Content-Type":"application/json",
    "muteHttpExceptions" : true
  };
  // call the Mailchimp API
  var response = UrlFetchApp.fetch(ROOT+endpoint, options);
  var data = response.getContentText();
  var json = JSON.parse(data);
  if(response.getResponseCode() !== 200 && json.detail == 'The requested resource could not be found.') {
    return "Email not found in list";
  }
  var activity = json.activity;
  var sentCount = 0;
  for(var i = 0; i < activity.length; i++) {
    var singleActivityObject = activity[i];
    if(!singleActivityObject.title) continue;
    if(singleActivityObject.title.indexOf(title) !== -1 && singleActivityObject.action == 'sent') sentCount++;
  }
  return sentCount;
}


// Arguments:
//   - emailAddress: the email address of the subscriber you want to check
//   - title: the title (or part of the title) of the campaign you want to check
function openedEmail(emailAddress, title) {
  var md5email = makeMD5(emailAddress);
  var endpoint = 'lists/'+ LIST_ID +'/members/'+ md5email + '/activity';
  var options = {
    "headers":{
      "Authorization":"apikey " + API_KEY
    },
    "method":"GET",
    "Content-Type":"application/json",
    "muteHttpExceptions" : true
  };
  // call the Mailchimp API
  var response = UrlFetchApp.fetch(ROOT+endpoint, options);
  var data = response.getContentText();
  var json = JSON.parse(data);
  if(response.getResponseCode() !== 200 && json.detail == 'The requested resource could not be found.') {
    return "Email not found in list";
  }
  var activity = json.activity;
  Logger.log(JSON.stringify(activity));
  var sentCount = 0;
  for(var i = 0; i < activity.length; i++) {
    var singleActivityObject = activity[i];
    if(!singleActivityObject.title) continue;
    if(singleActivityObject.title.indexOf(title) !== -1 && singleActivityObject.action == 'sent') sentCount++;
  }
  return sentCount;
}




// Mailchimp takes the MD5 hash of an email address
// so this returns the hash.
// Arguments:
//   - input: text string to be returned as a MD5 hash
function makeMD5(input) {
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, input);
  var txtHash = '';
  for (i = 0; i < rawHash.length; i++) {
    var hashVal = rawHash[i];
    if (hashVal < 0) {
      hashVal += 256;
    }
    if (hashVal.toString(16).length == 1) {
      txtHash += '0';
    }
    txtHash += hashVal.toString(16);
  }
  return txtHash;
}
