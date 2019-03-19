# Google App Script Helper
This will become a collection of wonderful Google App Scripts that can make life hella easier. 

## Mailchimp Email Activity (MC-emailActivity.js)
Provides 2 simple formulas:

1. =gotEmail(emailAddress, title)
2. =openedEmail(emailAddress, title)

Give the formula an email address and part of the title of a mailchimp campaign and they will return how many times they were sent or opened said emails.

### Setup

We need 3 things, your Mailchimp API key, the ID of the Mailchimp list that you sent the campaigns from and finally the Mailchimp server used for your account. The final one you can find at the beginning of the URL when you are logged into Mailchimp e.g. https://{XXX}.admin.mailchimp.com 
