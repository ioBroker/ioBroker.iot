# How to use IFTTT with ioBroker

Here you learn how to use IFTTT with ioBroker using the Webhooks service of IFTTT. We begin by exploring the 
flow to ioBroker to IFTTT by building a applet sending data from ioBroker via IFTTT to Telegram. Certainly it
is possible using a adapter and thus more direct, but it does give a good example how it works.

+ [Sending data to IFTTT](#sending-data-to-ifttt)
+ [Getting data from IFTTT](#getting-data-from-ifttt)

---

## Sending data to IFTTT ##

We will build an applet doing the following chain: ioBroker => Webhook (IFTTT) => Telegram

**1. To do so, we start by generating a new applet:**

![Image showing the IFTTT applet creation starting page](ifttt_send_01.png)

**2. Now start as usual by clicking on "+this", and then select as service Webhooks.**

![Image showing the IFTTT service selection with the service Webhooks selected](ifttt_send_02.png)

**3. Select here the only available option "Receive a web request" as trigger for the chain.**

![Image showing the IFTTT trigger selection page](ifttt_send_03.png)

**4. Now we name our event, choose here the same name as you will later in Blocky. ioBroker.iot sends only events with name "state" and this you should enter as "Event name".**

![Image showing the trigger field page of the webhook service with a red arrow showing where to put in the name of the event](ifttt_send_04.png)

**5. Since we're done with the trigger part of the applet, now we go for the action. To do so click "+then".**

 ![Image showing the applet overview with Webhooks selected and +then part highlighted](ifttt_send_05.png)

**6. Now search for Telegram and click on it (if not your Telegram is not yet linked you need to run through the
 process to do so, this guide assumes that is done).**
 
 ![Image showing the IFTTT service selection for the target service with search field having Telegram entered](ifttt_send_06.png)
 
 **7. As action choose "Send message".**
 
 ![Image showing the choose action page with a red arrow pointing towards the send message action](ifttt_send_07.png)
 
 **8. Now we setup where the message should go and how it looks. Please fill the fields as shown in the picture.
 In this sample Value1 will be the ObjectID, Value2 the value of the object and Value3 the ACK state (false/true).**
 
 ![Image showing the complete action page with the message field filled for our sample using Value1/Value2/Value3 as ingredients](ifttt_send_08.png)
 
 **9. We're done with the applet creation, so rename it if you like and hit finish to end the applet creation process.**
 
 ![Image showing the final page of the applet creation process](ifttt_send_09.png)
 
 **10. Now we are in need of the key the IFTTT Webhooks service requires us to use for putting in events. To do so
 visit <https://ifttt.com/maker_webhooks> and click on the button "documentation". Then the following page as shown
 below tell you your key, please copy it as we need it for ioBroker in the next step**
 
 ![Image showing the IFTTT Webhooks documentation where you get the Maker Webhooks key](ifttt_send_10.png)
 
 **11. Now go to ioBroker and there to your iot adapter instance settings page, select the "IFTTT and services"
  tab and paste the key in the field labeled "IFTTT key". (dont even try, the key here is random and just for show)**
  
  ![Image showing the iot adapter configuration page with the "Services and IFTTT" tab selected](ifttt_send_11.png)
  
  **12. Now we are good to send data to IFTTT using blocky. Here is how the fields of the "send text to IFTTT"
  element (under "Sendto" in Blocky) correspond to the ones we configured as the action in IFTTT.**
  
  ![Image showing the applet on IFTTT and the IFTTT element from blocky](ifttt_send_12.png)
  
  **If you prefer to write javascript directly instead using blocky, the function to use looks like this:**
  
  ```javascript
  sendTo("iot.0", "ifttt", {
      event: 'state',
      value1: 'value1',
      value2: 'value2',
      value3: 'value3'
  });
  ```
  **Also its possible to set the variable ```iot.0.service.ifttt``` with some value and it will be send, too.**
  
  **13. As a simple example here a Blocky script which grabs the state of a HomeMatic door contact and sends it to
  IFTTT on a change and the resulting Telegram message.**
  
  ![Image showing the Blocky script mentioned above and a message from Telegram that shows the result of the Blocky script](ifttt_send_13.png)  
  
  ---
  
  ## Getting data from IFTTT ##
  
  Now that we know how we can send data to IFTTT and thus to other services, lets see how we can get data back from 
  other services. In this example we go the way the other way round and receive data from Telegram through IFTTT.
  We will build an applet doing the following chain: Telegram => Webhook (IFTTT) => ioBroker
  
  **1. Start by creating a new applet in IFTTT and then click on "+this" to start the trigger selection**
  
  ![Image showing the IFTTT applet creation starting page](ifttt_send_01.png)
  
  **2. Now select "Telegram" as your service for the applet.**
  
  ![Image showing the service selection and the search field has "Telegram" entered](ifttt_get_02.png)
  
  **3. Choose as a trigger here "New message with key phase to @IFTTT".**
  
  ![Image showing the trigger selection and red arrow pointing to "New message with key phase to @IFTTT"](ifttt_get_03.png)
  
  **4. Now put in as key phase "state" and as a reply we take "OK" for this example.**
  
  ![Image showing the trigger field setup page with the key phase and reply fields filled](ifttt_get_04.png)
  
  **5. Since we're done with the trigger part of the applet, now we go for the action. To do so click "+then".**

  ![Image showing the applet overview with webhooks selected and +then part highlighted](ifttt_get_05.png)
 
 **6. Select "Webhooks" as the action service.**
  
  ![Image showing the action selection and the search field have "Webhooks" written in it](ifttt_get_06.png)
  
 **7. Select the only option "Make a web request" here.**
 
  ![Image showing the choose action page of the Webhooks service](ifttt_get_07.png)
  
  **8. Now we need the API url (requires you having a ioBroker cloud account, either free or pro) from the 
  iot adapter page, its under the "IFTTT and Services" tab. (oh and don't try, the key in the picture is fake)**
  
  In the case you use custom services, you need set "White list for services" either to "*" to allow
  all services or add "ifttt" to the list of allowed services. If you don't use custom services, ignore this.
  
  ![Image showing the iot adapter page with the tab "IFTTT and Services" open and a red arrow pointing the the IFTTT url](ifttt_get_08.png)
  
  **9. Insert the API url you copied from the iot adapter configuration into the URL field here. then
  select action "post" and content type "text/plain" and for the body "Text" as the ingredient.**
  
  ![Image showing the complete action fields with all options filled/selected as explained.](ifttt_get_09.png)
  
   **10. Finish the applet creation process**
   
  ![Image showing the final page of the applet creation on IFTTT](ifttt_get_10.png)
   
   **11. Now if we send a private message to @IFTTT at Telegram like for example "state roflcopter" the variable
    ```iot.0.service.ifttt``` will contain "roflcopter". This can be captured by any Blocky- or Javascript
    which then can act accordingly.**
    
  ![Image showing a Telegram window with the message send to the @IFTTT bot and the state in ioBroker](ifttt_get_11.png)
  
  