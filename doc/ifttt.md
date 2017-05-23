# How to use IFTTT

You can use IFTTT service with ioBroker. Below you can find how to configure data flow from ioBroker to IFTTT and back.

For that the IFTTT "Maker Webhook" service will be used. 

## Example 1

We will create following rule: 
ioBroker => IFTTT => Maker Webhook => Telegram

### Create new applet
![Step1](step20.png)

### Click +this
![Step2](step21.png)

### Find Maker webhooks
![Step3](step22.png)

### Choose trigger
![Step4](step23.png)

### Define event name
![Step5](step24.png)
Use the same event name as you will use in blockly.

### Find action Telegram
![Step6](step25.png)

### Choose action
![Step7](step26.png)

### Format message text
![Step8](step27.png)

- Value1 is Object ID
- Value2 is value of the state
- Value3 is ack (true/false)

### Finish
![Step9](step28.png)

### Get the key
![Step10](step29.png)

### Copy key
![Step11](step30.png)

![Step12](step31.png)

and paste it into config

![Step13](step32.png)

now you can use even blockly to send the text to IFTTT.
![Step14](step35.png)

you can send via script with

```
sendTo("cloud.0", "ifttt", {
    event: 'state', 
    value1: 'value1', 
    value2: 'value2', 
    value3: 'value3'
});
```

If no "id" is defined, it will be used: "cloud.0.service.ifttt". Ack is optional.

You can set the variable "cloud.0.service.ifttt" with some value and the text will be sent too.

## Example 2

Telegram => IFTTT => Maker Webhook => ioBroker

Example how to send some text via telegram to ioBroker.

![Step1](step1.png)

![Step2](step2.png)

![Step3](step3.png)

![Step4](step4.png)

![Step5](step5.png)

![Step6](step6.png)

![Step7](step7.png)

![Step8](step8.png)

### Get the generated link
![Step9](step9.png)

### And paste it into dialog
![Step10](step10.png)

![Step11](step11.png)

![Step12](step11.png)